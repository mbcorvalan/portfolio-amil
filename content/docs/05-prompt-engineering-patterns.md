---
title: "Prompt Engineering Patterns"
part: II
level: intermediate
reading_time: 14 min
reviewed: 2026-11
---

# 5. Prompt Engineering Patterns

Prompt engineering is the practice of designing instructions and testing them against a clear task. The goal is **reliable task performance**, not impressive wording. Start with a simple baseline, define what success means, run realistic inputs, find failures, change one variable, and measure again.

## The improvement cycle

1. Write a baseline prompt.
2. Define success criteria (accuracy, format validity, tone, latency, cost).
3. Run the prompt on a representative set of inputs (see Chapter 6).
4. Inspect failures. Group them by cause.
5. Change one thing. Measure again.

Changing several things at once makes it impossible to know what helped.

## Pattern 1: be explicit

Specify audience, scope, format, and what to do when information is missing.

- Weak: "Tell me something about this incident."
- Better: "Summarize this incident for an engineering manager in four bullets: impact, root cause, resolution, follow-up. Use only the supplied report. If the report does not state the root cause, write 'Unknown'."

The last sentence matters. Without it, the model fills gaps with plausible text.

## Pattern 2: few-shot examples

Few-shot prompting shows the model examples of inputs and desired outputs. Include **boundary cases**, not only easy ones. A classifier that sees only obvious examples fails on the ambiguous tickets that matter most.

```python
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # check the models page before shipping

CATEGORIES = ("account_access", "billing", "bug", "other")

FEW_SHOT = """
Examples:
- "I cannot reset my password" -> account_access
- "The invoice shows two charges" -> billing
- "Charged twice, and I also can't log in" -> account_access
  (login problems take priority: the customer cannot use the product)
- "Export button does nothing" -> bug
- "Do you have a mobile app?" -> other
"""

SYSTEM = (
    "Classify the support ticket into exactly one category: "
    + ", ".join(CATEGORIES)
    + ". Reply with the category name only.\n"
    + FEW_SHOT
)


def classify(ticket: str) -> str:
    response = client.messages.create(
        model=MODEL,
        max_tokens=20,
        system=SYSTEM,
        messages=[{"role": "user", "content": ticket}],
    )
    label = response.content[0].text.strip()
    if label not in CATEGORIES:
        # Never pass an unknown label downstream. Route it for review.
        return "other"
    return label
```

The boundary example ("charged twice and can't log in") teaches the priority rule. The fallback to `"other"` keeps invalid labels out of your data. In production, log the invalid case and count it. The invalid-output rate is a metric.

## Pattern 3: structured context with tags

Tags such as `<instructions>`, `<document>`, and `<examples>` separate instructions from data. This helps the model and makes prompts easier to read and diff.

```text
<instructions>
Answer the question using only the document. If the answer is not in the
document, reply exactly: NOT_FOUND.
</instructions>

<document>
{article_text}
</document>

<question>
{user_question}
</question>
```

**Tags are not a security boundary.** Text inside `<document>` is still untrusted. A web page can contain "ignore the instructions above." Enforce security in code (Chapter 13).

## Pattern 4: prompt chaining

Split a complex task into smaller calls, and validate each result before the next step. Example: extract the problem, classify its theme, then draft a product insight.

```python
import json


def extract_problem(feedback: str) -> dict:
    response = client.messages.create(
        model=MODEL,
        max_tokens=300,
        system='Return JSON only: {"problem": string, "quote": string}. '
               "quote must be copied exactly from the feedback.",
        messages=[{"role": "user", "content": feedback}],
    )
    data = json.loads(response.content[0].text)  # raises on invalid JSON
    if data["quote"] not in feedback:
        raise ValueError("Quote is not in the source text: possible hallucination")
    return data
```

The check `quote in feedback` is a **code grader**. It catches a whole class of errors cheaply. Chains are easier to debug and test than one large prompt, but each extra call adds latency and cost. Use a chain when a checkpoint catches real errors.

## Pattern 5: reasoning and self-checks

For tasks that need reasoning, use the **adaptive thinking** feature instead of asking for step-by-step text in the answer. Adaptive thinking lets the model decide how much to think, guided by an effort level. Check the current parameter names in the documentation before you ship.

```python
response = client.messages.create(
    model=MODEL,
    max_tokens=16000,
    thinking={"type": "adaptive"},
    output_config={"effort": "medium"},
    messages=[{"role": "user", "content": "Find the bug in this function: ..."}],
)

for block in response.content:
    if block.type == "text":
        print(block.text)
```

Thinking tokens are billed. Use a higher effort level only where the quality gain is measured.

A self-check (asking the model to review its draft against a checklist) can catch missing sections or wrong formats. It is **not independent verification**: the same model can repeat the same mistake. Prefer tests that use external checks.

> Thinking behavior differs by model. On Claude Opus 5.5 and Claude Fable 5.1, adaptive thinking is always on, so you cannot turn it off. On Claude Sonnet 5.5, turn off up-front thinking with `thinking: {"type": "between_tools"}`. Do not use `"disabled"` on that model.

## Use it when

- The task has a clear, testable output.
- You can measure whether a change improved results.

## Avoid it when

- You add reasoning steps "to be safe" without evidence that they help. Each step adds cost and latency.
- You rely on a prompt to enforce security or business rules.

## Trade-offs

Few-shot examples improve consistency but add input tokens on every call. Chains improve control and add latency. Thinking improves hard tasks and adds cost. Each pattern is a trade-off; measure it.

## Common mistake

Testing a prompt on three examples you wrote yourself and calling it done. Realistic, varied, and adversarial inputs reveal the failures that matter.

## Key takeaway

Make prompts explicit, test them on realistic inputs, and use only the complexity that measurably improves results.

## Exercises

1. Build the classifier above. Add 30 labeled tickets, including 10 boundary cases. Measure accuracy and invalid-output rate.
2. Add one few-shot example at a time. Record which examples change the results.
