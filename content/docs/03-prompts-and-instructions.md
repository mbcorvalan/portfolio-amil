---
title: "Prompts and Instructions"
part: I
level: intermediate
reading_time: 10 min
reviewed: 2026-11
---

# 3. Prompts and Instructions

A prompt is the set of instructions and content you send to a model. In an application, prompts are part of the code. They need an owner, a version, and tests, like any other dependency.

## System prompts and user messages

The **system prompt** holds standing instructions: role, audience, tone, scope, and output rules. The **user message** holds the current request. Keeping them separate makes both easier to maintain and test.

## Make the wrapper reusable

Do not hard-code the system prompt inside the API wrapper. Pass it as an argument. One client can then serve several products.

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class PromptConfig:
    name: str
    version: str
    system: str


SUPPORT_V3 = PromptConfig(
    name="support-answers",
    version="3",
    system=(
        "You answer questions about our billing product. "
        "Use only the supplied help articles. "
        "If the articles do not answer the question, say so."
    ),
)


def build_messages(user_text: str) -> list[dict]:
    """Pure function: easy to unit test without calling the API."""
    return [{"role": "user", "content": user_text}]
```

Because `build_messages` is a pure function, you can test it without network access. Store `name` and `version` in your logs so you know which prompt produced each answer.

## Structure the content

For longer inputs, separate instructions from data with clear labels. XML-style tags work well with Claude:

```text
<instructions>
Summarize the incident for an engineering manager in four bullets:
impact, root cause, resolution, follow-up actions.
Use only the report inside <report>.
</instructions>

<report>
{report_text}
</report>
```

These tags are a **formatting convention**, not a security boundary. Text inside `<report>` is still untrusted. If it contains "ignore your instructions," the model may follow it. Protect against that in the application (see Chapter 13).

## Be specific

Compare two instructions:

- Weak: "Tell me something about this incident."
- Better: "Summarize this incident for an engineering manager in four bullets. Use only the supplied report."

Specific audience, scope, and format reduce ambiguity. Test changes on realistic inputs, not on the one example you wrote while developing.

## What prompts cannot do

A system prompt guides behavior. It cannot enforce:

- Authorization (who may see which record)
- Financial or quota limits
- Data isolation between tenants
- Approval of irreversible actions

Those controls belong in application code and infrastructure. Phrases such as "You are an expert" change tone and focus, but they do not give the model new knowledge or permissions.

## Use it when

- Behavior should be adjusted without changing code.
- The same capability serves several products with different rules.

## Avoid it when

- The rule must always hold. Enforce it in code instead.

## Trade-offs

Prompts are fast to change, which is useful and dangerous. A small edit can change behavior across the whole product. Version prompts and run your evaluation set before every change (see Chapter 6).

## Common mistake

Putting authorization rules in the system prompt, such as "Only show data for the current user." The model may comply most of the time, but a single failure is a data leak.

## Key takeaway

Use prompts to guide language behavior. Use software controls to enforce rules.

## Exercises

1. Write a `PromptConfig` for a task you know. Add a version string and a unit test for `build_messages`.
2. Find one rule in your prompt that must always hold. Move its enforcement into code and explain in one paragraph why the prompt alone is not enough.
