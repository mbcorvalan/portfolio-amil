---
title: "Evaluation and Regression Testing"
part: II
level: intermediate-advanced
reading_time: 16 min
reviewed: 2026-11
---

# 6. Evaluation and Regression Testing

An **evaluation (eval)** is a repeatable test of a model-powered feature. You define a dataset, run the feature on every case, grade the outputs, and compare the results across versions. Without evals, you cannot know whether a change helped, hurt, or did nothing.

## The evaluation loop

1. Define the task and the expected behavior.
2. Build a dataset: normal, ambiguous, and edge-case inputs.
3. Run the same prompt and configuration on every case.
4. Grade each output with explicit criteria.
5. Read the individual failures, not only the average.
6. Change one element and repeat.

## Dataset format

Store cases as JSON Lines, one case per line. The file is easy to review, diff, and version.

```json
{"id": "t-001", "category": "billing", "input": "I was charged twice", "expected": "billing"}
{"id": "t-002", "category": "boundary", "input": "Charged twice and can't log in", "expected": "account_access"}
```

Aim for real, anonymized tickets. Synthetic cases are useful for edge cases, but they rarely show what users actually write.

## Graders

| Grader type | Use for | Example |
|---|---|---|
| Code | Deterministic checks | Label is in the allowed set; JSON is valid |
| Model | Qualities that are hard to encode | "Does the summary cover every key fact?" |
| Human | Subjective or high-impact cases | Tone in customer-facing messages |

Code graders are cheap and exact. Use them first. Model graders need a written rubric and calibration against human labels. Human review is essential for high-stakes outputs.

## A concurrent eval runner

This runner calls the model on every case with bounded concurrency. The limit keeps you under rate limits. Errors are recorded instead of crashing the whole run.

```python
import asyncio
import json
from collections import Counter
from dataclasses import dataclass, asdict
from pathlib import Path

import anthropic

client = anthropic.AsyncAnthropic()
MODEL = "claude-sonnet-5-5"  # pin the exact model ID for each run
CONCURRENCY = 5

CATEGORIES = ["account_access", "billing", "bug", "other"]
SYSTEM = (
    "Classify the support ticket. Reply with exactly one of: "
    + ", ".join(CATEGORIES) + "."
)


@dataclass
class Result:
    case_id: str
    category: str
    expected: str
    predicted: str | None
    passed: bool
    error: str | None = None


def load_cases(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


async def run_case(case: dict, sem: asyncio.Semaphore) -> Result:
    async with sem:
        try:
            response = await client.messages.create(
                model=MODEL,
                max_tokens=20,
                system=SYSTEM,
                messages=[{"role": "user", "content": case["input"]}],
            )
        except anthropic.APIError as error:
            return Result(case["id"], case["category"], case["expected"],
                          None, False, error=type(error).__name__)

    predicted = response.content[0].text.strip()
    # Code grader: exact match on an allowed label.
    valid = predicted in CATEGORIES
    return Result(
        case_id=case["id"],
        category=case["category"],
        expected=case["expected"],
        predicted=predicted if valid else None,
        passed=valid and predicted == case["expected"],
    )


async def run_eval(cases: list[dict]) -> list[Result]:
    sem = asyncio.Semaphore(CONCURRENCY)
    return await asyncio.gather(*(run_case(c, sem) for c in cases))


def report(results: list[Result]) -> dict:
    total = len(results)
    passed = sum(r.passed for r in results)
    invalid = sum(1 for r in results if r.predicted is None and r.error is None)
    errors = sum(1 for r in results if r.error)

    by_category: dict[str, list[bool]] = {}
    for r in results:
        by_category.setdefault(r.category, []).append(r.passed)

    confusions = Counter(
        (r.expected, r.predicted) for r in results
        if r.predicted and not r.passed
    )

    return {
        "accuracy": round(passed / total, 3),
        "invalid_rate": round(invalid / total, 3),
        "error_rate": round(errors / total, 3),
        "by_category": {k: round(sum(v) / len(v), 3) for k, v in by_category.items()},
        "top_confusions": confusions.most_common(5),
    }


if __name__ == "__main__":
    cases = load_cases(Path("evals/tickets.jsonl"))
    results = asyncio.run(run_eval(cases))
    print(json.dumps(report(results), indent=2))
```

Reading the report:

- **Accuracy** is the headline number. It hides a lot.
- **Invalid rate** shows format failures, which are usually fixable in the prompt or the schema.
- **By category** shows where the feature is weak. A high average can hide a failing category.
- **Top confusions** tell you which labels the model mixes up. Those pairs usually point to a prompt or taxonomy problem.

## A regression gate

Compare each run against a stored baseline. Block the change if a metric drops more than a set threshold.

```python
def check_regression(current: dict, baseline: dict, max_drop: float = 0.02) -> list[str]:
    failures = []
    if current["accuracy"] < baseline["accuracy"] - max_drop:
        failures.append(
            f"accuracy {current['accuracy']} < baseline {baseline['accuracy']} - {max_drop}"
        )
    if current["invalid_rate"] > baseline["invalid_rate"] + 0.005:
        failures.append("invalid output rate increased")
    return failures
```

Run it in CI. Fail the build if the list is not empty.

## How much noise is in your number?

Small datasets produce noisy accuracy. As an illustration, with 50 cases and true accuracy near 90%, the standard error is about 4 percentage points, so a 2-point change means little. Use larger datasets for critical features, repeat stochastic runs when the difference is small, and report the sample size next to every score.

*(Figures are illustrative. Compute them for your own dataset.)*

## Judge bias (for model-based graders)

When a model grades another model's output, watch for known biases: preference for longer answers, preference for a particular answer position, and leniency toward outputs from the same model family. Mitigate them with a clear rubric, swapped positions in pairwise comparisons, and periodic calibration against human labels.

## Use it when

- A feature is in production, or about to be.
- You change a prompt, a model, a schema, or a retrieval setting.

## Avoid it when

- You are still exploring and have no stable task definition. Write the task first.

## Trade-offs

Evals take effort to build and maintain. A stale dataset gives false confidence. Model graders are scalable but need calibration. The cost of running evals is real, so keep a fast subset for every pull request and a larger suite before release.

## Common mistake

Reporting a single average score. Two changes with the same accuracy can have very different failure profiles.

## Key takeaway

If you cannot measure a change, you cannot claim that it improved the application.

## Exercises

1. Build a 30-case dataset for a task in your domain. Run the runner and save the baseline JSON.
2. Change the prompt. Rerun the eval. Use `check_regression` and explain the result in writing.
3. Add a second grader (for example, a rubric-based model grader) and measure how often the two graders disagree. Inspect five disagreements by hand.
