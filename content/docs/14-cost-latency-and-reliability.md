---
title: "Cost, Latency, and Reliability"
part: IV
level: advanced
reading_time: 18 min
reviewed: 2026-11
---

# 14. Cost, Latency, and Reliability

Every model call adds cost, latency, and a new way to fail. Chaining, critique, parallelism, and agent loops can improve quality, and they multiply all three. The right question is never "what does one call cost?" It is "what does one **successful task** cost, and how long does it take?"

## Measure the right unit

Track these per task type, not per API call:

- **Cost per successful task (CPST):** total attributable cost ÷ number of tasks completed correctly.
- **End-to-end latency:** p50 and p95, measured from the user's request to a usable result.
- **Time to first useful output:** for streaming features, the moment the user sees something meaningful.
- **Success rate:** tasks completed correctly, as defined by your acceptance rules.

A cheap model that fails often can cost more per successful task than an expensive model that succeeds. Measure both.

## Reading cost from the API

Every response includes a `usage` object. Use it to compute cost and to measure caching.

```python
from dataclasses import dataclass


@dataclass
class TaskCost:
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int
    cache_write_tokens: int


def read_usage(response) -> TaskCost:
    u = response.usage
    return TaskCost(
        input_tokens=u.input_tokens,
        output_tokens=u.output_tokens,
        cache_read_tokens=u.cache_read_input_tokens or 0,
        cache_write_tokens=u.cache_creation_input_tokens or 0,
    )


def cache_hit_ratio(costs: list[TaskCost]) -> float:
    reads = sum(c.cache_read_tokens for c in costs)
    total_cacheable = reads + sum(c.cache_write_tokens for c in costs)
    return reads / total_cacheable if total_cacheable else 0.0


def cost_per_successful_task(
    costs: list[TaskCost],
    successes: list[bool],
    price_per_mtok: dict[str, float],  # load from configuration; check current pricing
) -> float:
    total = 0.0
    for c in costs:
        total += (
            c.input_tokens * price_per_mtok["input"]
            + c.output_tokens * price_per_mtok["output"]
            + c.cache_read_tokens * price_per_mtok["cache_read"]
            + c.cache_write_tokens * price_per_mtok["cache_write"]
        ) / 1_000_000
    wins = sum(successes)
    return total / wins if wins else float("inf")
```

Price values belong in configuration, with the date you read them. Do not hard-code them.

## Prompt caching: where the savings come from

Prompt caching reuses a processed prefix of a request. Stable content goes first: tool definitions, system instructions, and reference documents. Volatile content goes last: session data and the user's question. The cache is matched on the exact prefix, so a timestamp near the top of the prompt breaks every hit.

Cache writes cost 1.25× the base input price with the 5-minute TTL, and 2× with the 1-hour TTL. Cache reads cost a model-specific fraction of the base input price: 0.1× on most models, 0.05× on Claude Opus 5.5 and Claude Sonnet 5.5, and 0.025× on Claude Fable 5.1 and Claude Mythos 5.1. You can place up to four breakpoints. The cache is invalidated in order: tools, then system, then messages. A change to a tool definition invalidates everything after it. Each model has a minimum cacheable length. Shorter prompts are processed without caching, and no error is raised.

Measure the result. A cache that never hits is only extra complexity.

```python
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # check the models page before shipping

STABLE_INSTRUCTIONS = "...long, stable policy text..."  # must exceed the model's minimum


def ask(question: str, session_context: str):
    return client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=[
            {
                "type": "text",
                "text": STABLE_INSTRUCTIONS,
                "cache_control": {"type": "ephemeral"},  # breakpoint after stable content
            }
        ],
        messages=[{
            "role": "user",
            # Volatile content last: it does not break the cached prefix.
            "content": f"Session: {session_context}\n\nQuestion: {question}",
        }],
    )
```

| Model | Minimum cacheable prompt |
|---|---|
| Claude Opus 5.5, Claude Sonnet 5.5, Claude Fable 5.1, Claude Opus 5 | 512 tokens |
| Claude Sonnet 5 | 1,024 tokens |
| Claude Opus 4.8 | 1,024 tokens |
| Claude Opus 4.7 | 4,096 tokens |
| Claude Haiku 5.5 | Verify. Sources conflict (512 or 1,024). |

> Check the live table before you size a prefix. You can also set one top-level `cache_control` field. The system then moves the breakpoint to the last cacheable block. Block-level breakpoints give you finer control.

## Batch processing

For work that does not need an immediate answer, a batch interface can process many independent requests asynchronously at a lower price. Typical examples are overnight classification, backfills, and offline evaluations. Check the current batch documentation for pricing, size limits, and the completion window.

Every batch item needs a stable custom ID, so you can match results to inputs even when they arrive out of order. Plan for items that fail or expire: retry them under your own policy.

Do not put interactive, user-facing requests in a batch. The user is waiting.

## Latency budgets

Divide the acceptable end-to-end time across the stages of the request. Stages on the critical path add up. Independent stages can run in parallel, and only the slowest branch counts.

Illustrative budget for a 4-second interactive target (planning values, not measurements):

| Stage | Budget |
|---|---|
| Authentication and authorization | 100 ms |
| Retrieval | 350 ms |
| Model time to first token | 700 ms |
| Generation | 1,700 ms |
| Validation | 200 ms |
| Network and rendering | 300 ms |

*(Planning values. Measure your own traces. Percentiles do not add up: measure the full path end to end.)*

## Timeouts and retries

Every network call needs a timeout. Retry only errors that may succeed later: rate limits, server errors, and timeouts. Do not retry authentication or validation errors. The Anthropic SDK has built-in retries and timeouts that you can configure on the client.

```python
client = anthropic.Anthropic(
    timeout=30.0,     # seconds per request
    max_retries=2,    # SDK-level retries for transient errors
)
```

Check the SDK documentation for the current default retry behavior before you rely on it. Add your own policy on top only when you need one.

For side effects, retries are dangerous. A timed-out request may have completed on the server. Use your own idempotency keys, stored before the action, so a retry returns the original result instead of repeating the action.

## Backoff with jitter

When you write your own retry loop, use exponential backoff with random jitter. Without jitter, many clients retry at the same moment and overload the service again.

```python
import random
import time


def backoff_delay(attempt: int, base: float = 0.5, cap: float = 20.0) -> float:
    """Full jitter: a random delay between 0 and the exponential ceiling."""
    ceiling = min(cap, base * (2 ** attempt))
    return random.uniform(0, ceiling)


def with_retries(fn, retryable: tuple[type[Exception], ...], max_attempts: int = 4):
    for attempt in range(max_attempts):
        try:
            return fn()
        except retryable:
            if attempt == max_attempts - 1:
                raise
            time.sleep(backoff_delay(attempt))
```

Use the `retryable` tuple to list only transient error types. If the API returns a `retry-after` hint, respect it instead of using your own delay.

## Circuit breakers and fallbacks

A circuit breaker stops calls to a failing dependency for a cooldown period. This prevents a slow dependency from filling your queues and threads.

```python
import time
from dataclasses import dataclass, field


@dataclass
class CircuitBreaker:
    failure_threshold: int = 5
    cooldown_seconds: float = 30.0
    failures: int = 0
    opened_at: float | None = None
    _log: list[str] = field(default_factory=list)

    def allow(self) -> bool:
        if self.opened_at is None:
            return True
        if time.monotonic() - self.opened_at >= self.cooldown_seconds:
            return True  # half-open: let one call through
        return False

    def record_success(self) -> None:
        self.failures = 0
        self.opened_at = None

    def record_failure(self) -> None:
        self.failures += 1
        if self.failures >= self.failure_threshold:
            self.opened_at = time.monotonic()
```

A fallback model can keep the feature available, but only if it passes the **same** output contract and the same evals. A different model can have different tool behavior, context limits, and quality. Test the fallback before you need it. Sometimes the right fallback is a clear error message, a queued job, or a human handoff.

```python
def answer_with_fallback(breaker: CircuitBreaker, primary, fallback, question: str):
    if breaker.allow():
        try:
            result = primary(question)
            breaker.record_success()
            return result
        except Exception:
            breaker.record_failure()
    # Fallback must be evaluated for the same contract; do not assume it is equivalent.
    if fallback is not None:
        return fallback(question)
    return {"status": "unavailable", "message": "Please try again later."}
```

## Rate limits and backpressure

Rate limits apply to requests and to tokens. Bound the number of concurrent calls, put work in a queue when the queue is full, and reject new work with a clear status when it cannot be accepted. Set per-tenant quotas so one customer cannot consume the whole capacity.

## Use it when

- The feature runs in production or will soon.
- Cost or latency is part of the product requirement.

## Avoid it when

- You optimize before you measure. Instrument first, then decide.

## Trade-offs

Caching lowers cost and adds invalidation risk. Batch lowers cost and adds delay. Smaller models lower cost and can lower quality. Retries improve availability and can amplify load or duplicate side effects. Fallbacks improve availability and add a second behavior to test.

## Common mistakes

1. **Optimizing the cost of one call.** The unit is the successful task.
2. **Retrying a non-idempotent action.** Use stored idempotency keys.
3. **Hidden cache misses.** Check the hit ratio. Check the minimum length.
4. **Retry storms.** Without jitter and a cap, a brief outage becomes a long one.

## Key takeaway

A reliable AI feature balances answer quality, safety, latency, and cost, and it measures all four on the same task definition.

## Exercises

1. Instrument a feature with `read_usage`. Compute cost per successful task for a week of traffic (or a replayed set). Identify the most expensive successful task type.
2. Move stable instructions into a cached prefix. Measure the cache hit ratio over 50 requests. Then deliberately insert a timestamp at the top of the prompt and measure again.
3. Test the circuit breaker with a fake dependency that fails five times. Confirm that calls are blocked during cooldown and that one call is allowed afterward.
