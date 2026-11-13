---
title: "Workflow Patterns"
part: III
level: intermediate-advanced
reading_time: 16 min
reviewed: 2026-11
---

# 10. Workflow Patterns

These patterns solve specific problems: sequencing, routing, parallelism, quality control, and uncertainty. Choose a pattern because it addresses a measured problem, not because it looks sophisticated. Every pattern adds calls, cost, and latency.

## Pattern 1: prompt chaining

Split a task into stages, and validate each stage before the next one runs.

Example: a sales assistant extracts requirements, validates product codes against a catalog, retrieves matching items, and drafts a quote. Each stage has a narrow job and a checkpoint. A bad product code stops the chain before a wrong quote is drafted.

```python
def validate_product_codes(codes: list[str], catalog: set[str]) -> list[str]:
    """Code checkpoint between two model steps. Returns unknown codes."""
    return [c for c in codes if c not in catalog]
```

## Pattern 2: routing

Classify a request, then send it to a specialized handler. Include an explicit fallback. Wrong routing can be worse than admitting uncertainty.

```python
from typing import Callable

Handler = Callable[[str], str]


def route(category: str, text: str, handlers: dict[str, Handler]) -> str:
    handler = handlers.get(category)
    if handler is None:
        # Fallback: a person decides. Never guess a route.
        return "escalated: unknown category"
    return handler(text)
```

Classification can be a small model call with the constrained output from Chapter 4. Measure the confusion matrix. A category that is often confused with another may need a clearer definition, not more routing logic.

## Pattern 3: parallelization

Run independent checks at the same time. A pull-request assistant can check accessibility, test coverage, and security concurrently, then merge the findings.

```python
import asyncio


async def check_security(diff: str) -> dict:
    ...  # model call returning structured findings


async def check_accessibility(diff: str) -> dict:
    ...


async def check_tests(diff: str) -> dict:
    ...


async def review(diff: str) -> list[dict]:
    results = await asyncio.gather(
        check_security(diff),
        check_accessibility(diff),
        check_tests(diff),
        return_exceptions=True,
    )
    # Surface failures instead of silently dropping a check.
    findings = []
    for name, result in zip(("security", "accessibility", "tests"), results):
        if isinstance(result, Exception):
            findings.append({"check": name, "status": "failed", "error": str(result)})
        else:
            findings.append(result)
    return findings
```

Parallelism reduces elapsed time, not total cost. It also increases concurrent load on rate limits. Bound the concurrency when the number of tasks grows.

## Pattern 4: voting

Run several independent assessments and compare them. This helps when answers vary and errors are random. It does **not** prove correctness: the same model can make the same mistake several times. Use voting only when you have measured a gain that justifies the cost.

## Pattern 5: evaluator–optimizer

One call produces a draft. A second call checks it against a rubric and returns specific issues. The draft is revised until it passes or the retry limit is reached.

```python
import json

import anthropic

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # check the models page before shipping
MAX_REVISIONS = 2

RUBRIC = (
    "A release note must contain: user impact, migration steps (or 'None'), "
    "and a rollback plan. Return JSON: {\"pass\": bool, \"issues\": [string]}."
)


def _text(response) -> str:
    return "".join(b.text for b in response.content if b.type == "text")


def draft_release_note(changes: str, feedback: list[str] | None = None) -> str:
    prompt = f"Write a release note for these changes:\n{changes}"
    if feedback:
        prompt += "\nRevise the previous draft to fix: " + "; ".join(feedback)
    response = client.messages.create(
        model=MODEL,
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )
    return _text(response)


def critique(draft: str) -> dict:
    response = client.messages.create(
        model=MODEL,
        max_tokens=300,
        system=RUBRIC,
        messages=[{"role": "user", "content": draft}],
    )
    return json.loads(_text(response))  # validate with a schema in production


def release_note(changes: str) -> tuple[str, bool]:
    draft = draft_release_note(changes)
    for _ in range(MAX_REVISIONS + 1):
        verdict = critique(draft)
        if verdict["pass"]:
            return draft, True
        draft = draft_release_note(changes, feedback=verdict["issues"])
    return draft, False  # best effort, flagged for human review
```

The critic is useful only if it is checked. Compare its verdicts with human judgments on a sample. If the critic accepts bad drafts, the rubric is too vague.

## Choosing a pattern

| Problem | Pattern |
|---|---|
| A stage can produce bad data that the next stage amplifies | Chaining with a checkpoint |
| Requests belong to distinct categories with different handling | Routing with a fallback |
| Independent checks where elapsed time matters | Parallelization |
| Answers vary and you have measured a gain from combining them | Voting |
| Output must meet an explicit, checkable standard | Evaluator–optimizer, with a retry limit |

## Use it when

- A specific failure mode is measured and the pattern addresses it.

## Avoid it when

- You add a stage "for quality" without a measurement that shows the quality change.

## Trade-offs

Chaining improves control and adds latency. Routing improves specialization and adds a classification error source. Parallelization reduces time and increases load. Voting adds cost with uncertain gain. Evaluator–optimizer improves quality and adds calls, plus the risk that the critic is wrong.

## Common mistake

Stacking patterns (routing, then chaining, then voting, then critique) without an eval for each stage. When the final result is bad, you cannot tell which stage failed.

## Key takeaway

Choose a pattern to solve a specific reliability or orchestration problem, not to add model calls.

## Exercises

1. Implement routing for four categories with a fallback. Measure how often the fallback is used on 50 realistic inputs. Decide whether the category definitions or the fallback rate needs work.
2. Run the evaluator–optimizer on 20 change lists. Compare the critic's verdicts with your own. Report agreement as a percentage and list three disagreements.
