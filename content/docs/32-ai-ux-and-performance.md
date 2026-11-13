---
title: "AI UX and Performance Engineering"
part: X
level: intermediate-advanced
reading_time: 22 min
reviewed: 2026-11
---

# 32. AI UX and Performance Engineering

A user does not experience a model. They experience a response that arrives, looks finished or unfinished, can be trusted or not, and can be corrected. Interface decisions and performance decisions are therefore the same decisions seen from two sides. This chapter covers how to show probabilistic output honestly, how to design streaming states, how to measure what the user actually waits for, and how to control concurrency and cost without degrading the experience.

## Show uncertainty without noise

A model response can be complete, partial, unsupported, or wrong. The interface should make those states distinguishable without flooding the user with disclaimers.

Five rules:

1. **Separate suggestions from actions.** A drafted reply is a suggestion. A sent reply is an action. The button that sends must say what will be sent, to whom.
2. **Show evidence when it exists.** A link to the source passage is more useful than a sentence that says "this is accurate."
3. **Label what is not verified.** A generated summary without citations is different from a sourced answer. Say which is which.
4. **Make correction easy.** Editing, rejecting, and asking for a revision should each take one action.
5. **Say when the system cannot answer.** "I could not find this in the approved documents" is a valid and useful response.

Avoid the two common failures: presenting every answer as verified, and burying the answer under warnings. Users stop reading warnings they see on every response.

## Response states

Model the states explicitly. Do not infer them from the presence of text.

```python
from enum import Enum


class ResponseState(str, Enum):
    IDLE = "idle"
    DRAFTING = "drafting"          # streaming; text is provisional
    VALIDATING = "validating"      # stream finished; checks are running
    FINAL = "final"                # validated; safe to show as the answer
    UNVERIFIED = "unverified"      # shown, but failed a check; labeled as such
    FAILED = "failed"              # no usable answer
    CANCELLED = "cancelled"        # the user stopped the stream


ALLOWED = {
    ResponseState.IDLE: {ResponseState.DRAFTING},
    ResponseState.DRAFTING: {ResponseState.VALIDATING, ResponseState.CANCELLED, ResponseState.FAILED},
    ResponseState.VALIDATING: {ResponseState.FINAL, ResponseState.UNVERIFIED, ResponseState.FAILED},
    ResponseState.FINAL: {ResponseState.IDLE},
    ResponseState.UNVERIFIED: {ResponseState.IDLE},
    ResponseState.FAILED: {ResponseState.IDLE},
    ResponseState.CANCELLED: {ResponseState.IDLE},
}


def move(current: ResponseState, new: ResponseState) -> ResponseState:
    if new not in ALLOWED[current]:
        raise ValueError(f"illegal transition {current.value} -> {new.value}")
    return new
```

The most important rule is in the transitions: **there is no direct path from `DRAFTING` to `FINAL`.** Streamed text must pass validation before the interface presents it as the answer. If validation fails after the user has already read the text, the state becomes `UNVERIFIED`, and the interface must say so.

## Streaming without misleading the user

Streaming improves the time to the first visible word. It also shows text that may change or may be rejected. Design for both.

- Show partial text with a clear "drafting" indicator.
- Keep the text stable where possible. Changing earlier words as the model continues is disorienting.
- Offer cancellation at all times during streaming, and release the connection when the user cancels.
- Show progress for the validation step, which can take noticeable time.
- If the stream fails midway, keep the partial text visible only with a label, and offer a retry.

### Accessibility

Streaming text is a challenge for screen readers. Announcing every token is unusable. Announce the state changes instead:

- Use a polite live region for the final answer and for status changes ("answer ready", "could not complete").
- Do not announce each streamed fragment.
- Make the cancel control reachable by keyboard and labeled clearly.
- Ensure that the "unverified" label is text, not only color.
- Provide a text alternative for every audio or image output (Chapter 29).

These rules apply to any framework. The state model above is independent of the UI library.

## Latency: measure what the user waits for

Several latency numbers exist, and they answer different questions:

| Metric | What it measures | Why it matters |
|---|---|---|
| Time to first token (TTFT) | Until the first generated text arrives | Perceived responsiveness for streamed answers |
| Time to first useful output | Until text a user can act on appears | The real experience; a preamble is not useful output |
| Total completion time | Until the validated result is ready | The end of the task |
| Queue wait | Time spent before processing begins | Load and admission problems |

Measure all of them, and report percentiles, not averages. A p95 of 9 seconds means one request in twenty waits at least that long, and averages hide it.

```python
import math
import time
from typing import Iterable, Iterator


def percentile(values: list[float], p: float) -> float:
    """Nearest-rank percentile. Requires at least one value."""
    ordered = sorted(values)
    rank = math.ceil(p / 100.0 * len(ordered))
    return ordered[max(0, rank - 1)]


def timed_stream(chunks: Iterable[str]) -> Iterator[tuple[str, float | None]]:
    """Yield each chunk with the TTFT once, on the first non-empty chunk."""
    start = time.perf_counter()
    first_seen = False
    for chunk in chunks:
        if chunk and not first_seen:
            first_seen = True
            yield chunk, time.perf_counter() - start
        else:
            yield chunk, None
```

Use it with a real stream:

```python
def record_ttft(stream_chunks: Iterable[str], sink: list[float]) -> str:
    parts = []
    for chunk, ttft in timed_stream(stream_chunks):
        if ttft is not None:
            sink.append(ttft)
        parts.append(chunk)
    return "".join(parts)
```

Record TTFT per task type and per model. Compare it against the target for each interface. A voice product needs a much shorter first response than an overnight report.

## Concurrency: bounded, not unlimited

Parallel requests reduce elapsed time for independent work, and they consume rate limits, memory, and budget. Bound the concurrency, and measure the queue wait that the bound creates.

```python
import asyncio
import time


async def run_bounded(tasks, handler, limit: int):
    """Run handler over tasks with at most `limit` in flight. Returns (result, queue_wait_s)."""
    semaphore = asyncio.Semaphore(limit)

    async def one(task):
        enqueued = time.perf_counter()
        async with semaphore:
            waited = time.perf_counter() - enqueued
            result = await handler(task)
            return result, waited

    return await asyncio.gather(*(one(t) for t in tasks))
```

Tune the limit from measurements. Raise it while latency and error rates stay within target. Stop raising it when queue wait or rate-limit errors grow. The correct value depends on request size and on your provider's limits, not only on the number of users.

Keep interactive and bulk work in separate limits (Chapter 31). A single shared limit lets a large batch starve a user who is waiting.

## Prompt layout for caching

Prompt caching reuses a processed prefix (Chapter 14). Whether it helps depends on keeping the prefix identical across requests. A timestamp, a user name, or a random ID placed at the top of the prompt prevents every cache hit.

Build prompts so that stable content comes first and volatile content comes last, and check that rule with a test:

```python
import hashlib


def prefix_fingerprint(stable_parts: list[str]) -> str:
    return hashlib.sha256("\n".join(stable_parts).encode("utf-8")).hexdigest()[:12]


def test_prefix_is_identical_across_users():
    tools = ['{"name": "get_order_status"}']
    system = "You are a support assistant. Use only the supplied articles."

    fp_alice = prefix_fingerprint([system, *tools])
    fp_bob = prefix_fingerprint([system, *tools])

    # The prefix must not contain anything user-specific.
    assert fp_alice == fp_bob
```

The same discipline applies to tool definitions. Sort tools in a fixed order (Chapter 22), and do not regenerate descriptions with per-request content. Measure the cache hit ratio in production, because the test only proves the layout, not that the provider caches it.

## Cost per successful task

Cost per call is easy to measure and does not tell you whether the feature is worth what it costs. Cost per successful task divides total attributable cost by tasks completed correctly (Chapter 14). Use it to compare design choices: a longer prompt with better retrieval may be cheaper per success than a short prompt that needs correction.

```python
def cost_per_success(total_cost: float, successes: int) -> float:
    if successes == 0:
        return float("inf")   # an infinite cost signals the feature delivers nothing
    return total_cost / successes
```

Report it next to the quality metrics. A cost reduction that lowers the success rate is not a cost reduction.

## Designing for the user's time

A few principles that connect the interface and the performance work:

- **Show progress for anything over a second.** Name the stage: uploading, extracting, searching, drafting, checking.
- **Return early when you can.** A sourced snippet shown in 800 ms, followed by a generated summary, may serve better than a complete answer in 6 seconds.
- **Let the user stop.** Cancellation is a performance feature: it frees capacity.
- **Keep errors actionable.** "Try again in a few seconds" is better than "Error 500."
- **Remember the user's correction.** If a user fixes a field, do not ask them to fix it again on the next request.

## Feedback as a product signal

Ask for feedback at the moment of use, with a reason option: wrong, incomplete, unsupported, slow. Store the feedback with the trace ID, not with the raw answer, so you can connect it to the evaluation pipeline without copying sensitive content. Review feedback weekly, and add confirmed failures to the evaluation suite (Chapter 6).

Feedback is biased. Users who respond are not all users. Use it to find failure modes, not to estimate the rate of failure.

## Use it when

- Users read, act on, or depend on model output.
- Latency or cost is part of the product's promise.

## Avoid it when

- The model output is consumed only by another system. The contract (Chapter 25) matters more than presentation.

## Trade-offs

Explicit state models add code and prevent misleading displays. Streaming improves perceived speed and adds states to test. Bounded concurrency protects capacity and adds queue wait. Warnings build trust when they are specific and rare, and erode it when they are generic and constant.

## Common mistakes

1. **Showing streamed text as final.** Validate first, then label.
2. **Announcing every token to screen readers.** Announce state changes.
3. **Averages for latency.** Use percentiles.
4. **Timestamps at the top of the prompt.** They defeat caching.
5. **One concurrency limit for everything.** Interactive work gets starved.
6. **Generic warnings on every answer.** Users stop reading them.

## Key takeaway

The user's experience is the product. Make the state of every response visible, measure the time the user actually waits, and control concurrency and cost so that the interactive path stays fast when the system is busy.

## Exercises

1. Implement the response state machine. Write tests that prove there is no path from `DRAFTING` to `FINAL` without `VALIDATING`, and that a failed validation after streaming produces `UNVERIFIED`.
2. Instrument a streaming endpoint with TTFT and total time. Collect 200 requests and report p50, p95, and p99 for each. Identify the stage that contributes most to the p95.
3. Run `run_bounded` with limits 2, 5, and 10 on the same 100 tasks. Plot queue wait and total time for each limit. Choose a limit and justify it in writing.
4. Write the prompt-prefix test for your product. Find one piece of volatile content in your current prompt, move it to the end, and measure the cache hit ratio before and after.
5. Conduct five user sessions with the feature. Record every moment the user hesitated, reread, or corrected the output. Classify each by cause and decide which one to fix first.

---

## Further reading

- WCAG 2.2, guidance on status messages and live regions. *(Verify the current success criteria.)*
- Chapter 14 (latency budgets, cost per successful task) and Chapter 31 (admission control).
