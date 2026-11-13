---
title: "Reliability Engineering for AI Systems"
part: X
level: advanced
reading_time: 22 min
reviewed: 2026-11
---

# 31. Reliability Engineering for AI Systems

An AI feature depends on several services that can fail independently: the model provider, the retrieval index, the embedding service, downstream APIs, and the queue. Each failure has a different symptom. Reliability engineering decides, in advance, what the user sees for each one.

This chapter covers service objectives, time budgets, graceful degradation, failure injection, and operations. Retries, backoff, circuit breakers, and idempotency are covered in Chapters 14 and 21. Here they are applied at the system level.

## Reliability has two dimensions

A conventional service is reliable when it responds. An AI feature is reliable when it responds **and the response is acceptable**. A fast, wrong answer is a reliability failure.

That means two kinds of objectives:

| Dimension | Example objective |
|---|---|
| Availability and latency | 99.5% of requests return a result within 6 seconds |
| Quality | At least 98% of answers pass groundedness checks on a weekly sample |

Measure both. Quality objectives are measured by sampling and evaluation, not by HTTP status codes.

## Service level objectives and error budgets

A service level objective (SLO) sets a target for a metric. An error budget is the amount of failure the target allows. When the budget is spent, the team slows changes and fixes reliability.

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class SLO:
    name: str
    target: float          # for example 0.995 for 99.5%

    def error_budget(self, total_events: int) -> float:
        return total_events * (1.0 - self.target)

    def remaining(self, total_events: int, bad_events: int) -> float:
        return self.error_budget(total_events) - bad_events


availability = SLO(name="answer-available", target=0.995)
groundedness = SLO(name="answer-grounded", target=0.98)

# Example month: 200,000 requests, 1,300 unavailable, 2,500 ungrounded in the sample.
print(availability.remaining(200_000, 1_300))   # 1000 - 1300 = -300: budget exhausted
```

The example shows a budget that is already spent. The response is a policy decision, written in advance. For example: freeze feature releases, keep only reliability fixes, and review the top failure causes.

Choose objectives from user needs, not from what you already achieve. A target you can always meet is not a target.

## Time budgets across dependencies

A user-facing request has one total deadline. Each stage gets a share, and no stage may exceed what remains. Pass a deadline object through the pipeline rather than hard-coding a timeout in each call.

```python
import time


class Deadline:
    def __init__(self, seconds: float) -> None:
        self._end = time.monotonic() + seconds

    def remaining(self) -> float:
        return max(0.0, self._end - time.monotonic())

    def expired(self) -> bool:
        return self.remaining() <= 0.0


def stage_timeout(deadline: Deadline, stage_max: float) -> float:
    """A stage may use its own maximum, but never more than the time left."""
    left = deadline.remaining()
    if left <= 0.0:
        raise TimeoutError("request deadline exceeded before this stage")
    return min(stage_max, left)
```

Usage in a pipeline:

```python
def answer_pipeline(question: str, deadline: Deadline) -> str:
    retrieval_timeout = stage_timeout(deadline, stage_max=0.5)
    # ... call retrieval with retrieval_timeout ...
    generation_timeout = stage_timeout(deadline, stage_max=5.0)
    # ... call the model gateway with generation_timeout ...
    return "answer"
```

Two details matter. A deadline that is already expired should stop the pipeline before the next stage starts. And a stage's timeout should reflect what the stage needs, so that a slow optional stage cannot consume the time of a required one.

## Graceful degradation

When a dependency fails, choose the best honest result the system can still produce. Define the modes in advance:

| Mode | When | What the user gets |
|---|---|---|
| Full | All dependencies healthy | Generated answer with citations |
| Extractive | Model unavailable, retrieval healthy | The relevant passages, labeled, without a generated summary |
| Read-only | Writes unavailable | Answers allowed, actions queued for later |
| Unavailable | Required dependency down | A clear status and a retry option, never an unsupported answer |

```python
def select_mode(model_healthy: bool, retrieval_healthy: bool) -> str:
    if model_healthy and retrieval_healthy:
        return "full"
    if retrieval_healthy:
        return "extractive"     # show evidence without generated text
    return "unavailable"
```

The extractive mode is often the most useful fallback. The user still gets the source material, and the system makes no claim it cannot verify. A fallback that generates an answer without retrieval is a quality regression, not a degradation, and it should fail the same gates as the primary path (Chapter 27).

Make the mode visible. A user who sees passages should know that no generated summary was produced. A support agent who sees a stale answer should know that the index is behind.

## Admission control and load shedding

When demand exceeds capacity, decide which work to refuse. Refusing early is better than accepting everything and timing out for everyone.

```python
from enum import IntEnum


class Priority(IntEnum):
    INTERACTIVE = 0    # a person is waiting
    BACKGROUND = 1     # results are needed soon, not now
    BULK = 2           # evaluation runs, backfills


QUEUE_LIMITS = {
    Priority.INTERACTIVE: 200,
    Priority.BACKGROUND: 100,
    Priority.BULK: 20,
}


def admit(priority: Priority, queue_depth: int) -> bool:
    return queue_depth < QUEUE_LIMITS[priority]
```

Bulk work yields to interactive work. A nightly evaluation run that queues behind a customer's question is a choice you make on purpose, not an accident. The limits are illustrative. Set them from measured capacity and from the latency your interactive users need.

Return a clear status when work is refused, with a retry hint, so clients back off instead of hammering the endpoint.

## Failure injection

Test failures before users find them. Replace a dependency with a fake that fails in specific ways, and assert the behavior you designed.

```python
class FlakyModel:
    """Fails in a scripted sequence, then succeeds."""

    def __init__(self, failures: list[type[Exception] | None]) -> None:
        self._script = list(failures)

    def complete(self, system: str, user_text: str, policy) -> str:
        outcome = self._script.pop(0) if self._script else None
        if outcome is not None:
            raise outcome()
        return "grounded answer [cite:doc-1]"


def answer_with_status(model, question: str) -> dict:
    try:
        text = model.complete("system", question, policy=None)
    except TimeoutError:
        return {"status": "unavailable", "answer": None, "retry_after_s": 5}
    return {"status": "ok", "answer": text}


def test_timeout_returns_unavailable_not_a_guess():
    model = FlakyModel([TimeoutError])
    result = answer_with_status(model, "Refund policy?")
    assert result["status"] == "unavailable"
    assert result["answer"] is None


def test_success_after_no_failures():
    model = FlakyModel([None])
    assert answer_with_status(model, "Refund policy?")["status"] == "ok"
```

Cover at least these scenarios:

- Timeout on the first call, success on the second.
- Persistent timeout, so the system returns `unavailable`.
- Rate limit, so the system backs off and does not retry immediately.
- Truncated output, so the system does not return a partial answer as complete.
- Retrieval returns nothing, so the system says "not found" and does not call the model with empty context.
- A downstream write times out after success, so the reconciliation path runs (Chapter 21).

Run the failure tests in CI. A failure path that has never run is a path you do not know works.

## Chaos testing in staging

Beyond unit tests, inject faults into a staging environment: add latency to the index, return errors from the embedding service, drop a fraction of connections, and slow the queue. Watch the dashboards and the user-visible behavior.

The questions to answer:

- Did the circuit breaker open, and did it close again?
- Did the degraded mode activate, and did the user see it?
- Did any request exceed the total deadline?
- Did any side effect happen twice?
- Did the alerts fire, and did they reach someone who could act?

Record the results as a runbook update. A test that finds a gap is a success.

## Multiple providers and failover

A second provider can keep a feature available during an outage. It also introduces differences in output contracts, tool behavior, context limits, caching, and pricing. A failover path is a second product that must pass the same evaluation gates.

Before you enable failover:

- Run the full evaluation suite on the secondary provider's configuration.
- Confirm that the validation layer rejects its outputs when they do not match the contract.
- Check data-handling terms, since data may leave your primary contract's scope.
- Decide when failover ends and who approves switching back.

A failover that has never been exercised is likely to fail the first time it is needed.

## Operations

### Runbooks

Each failure class needs a written runbook with: detection (the alert or metric), diagnosis (the first three checks), mitigation (the switch to flip or the mode to select), and prevention (the change that stops the next occurrence).

### Incidents

Define severity levels, owners, and communication steps. For AI features, add two questions to every postmortem: did a user receive an incorrect answer during the incident, and did any side effect happen that must be reviewed?

### Rollback

Rolling back the code is not always enough (Chapter 27). Confirm that the rollback restores prompts, schemas, indexes, and model settings together. Test the rollback in staging.

### Capacity

Plan capacity from measured traffic, not from averages. Peak load and the tail of the latency distribution determine whether users wait. Review capacity after each significant feature launch.

## Use it when

- The feature is used by people who depend on it, or by other systems.
- A failure has a cost: a lost sale, a wrong action, or a missed deadline.

## Avoid it when

- You are prototyping. Keep the basics: timeouts, a clear error state, and logs. Add SLOs and chaos tests when real users arrive.

## Trade-offs

SLOs make reliability measurable and create pressure to slow changes when the budget is spent. Degraded modes preserve value during outages and add code paths to test. Load shedding protects the majority and refuses some users. Failure injection costs time and finds real problems. Failover improves availability and adds a second system to maintain.

## Common mistakes

1. **Retrying a timeout that already succeeded.** Use idempotency keys and reconciliation (Chapter 21).
2. **Hard-coded timeouts in each call.** Use a deadline that flows through the pipeline.
3. **A fallback that answers without evidence.** Degrade to evidence, not to guesses.
4. **Measuring only availability.** A fast wrong answer is a failure.
5. **Untested failover.** It fails when you need it.
6. **Unbounded queues.** They turn a short outage into a long one.

## Key takeaway

Reliability for AI features means returning a result that is fast enough, available, and honest about its status. Decide each failure's outcome in advance, test it with injected faults, and measure quality alongside uptime.

## Exercises

1. Write SLOs for one feature: one availability target and one quality target. Compute the error budget for a month of your traffic, and write the policy you would follow when the budget is spent.
2. Implement the deadline and the degraded modes. Write tests for: an expired deadline before the model call, retrieval down with the model up, and both down.
3. Write five failure-injection tests from the list in this chapter. Run them in CI.
4. Run a chaos experiment in staging: add 3 seconds of latency to retrieval for 10 minutes. Record what the user sees, whether the deadline held, and what the alerts did. Write the runbook update.
5. Write a failover checklist for a second provider, with the evaluation, contract, data-terms, and rollback steps. Estimate how long each takes.

---

## Further reading

- Google SRE book, chapters on service level objectives and handling overload. *(General reference; check the edition.)*
- Chapter 14 (retries, backoff, circuit breakers) and Chapter 21 (idempotency and reconciliation).
