---
title: "LLM Applications and Architecture"
part: I
level: intermediate
reading_time: 10 min
reviewed: 2026-11
---

# 1. LLM Applications and Architecture

A large language model (LLM) generates text from the context it receives. An AI application is much more than a model call. It also includes application code, prompts, data access, permissions, validation, user interfaces, and evaluation.

The model is good at tasks that involve ambiguous or unstructured language: summarizing, classifying, extracting, and drafting. Your application remains responsible for business rules, access control, and any action that changes the system.

## The request path

A typical request follows this path:

```text
User interface
  -> authenticated backend
  -> context assembly (prompt, history, retrieved data)
  -> model API
  -> output validation
  -> application response or action
```

Every step after the model call is ordinary software. Validation, authorization, and side effects belong there, not in the prompt.

## Example: incident summaries

After an outage, a platform team gathers the incident notes, alerts, and timeline. A model drafts a short summary for customer support. The backend checks that required fields exist, and the incident owner approves the message before it is published.

The model speeds up writing. It does not replace the system of record or the approval process.

```python
REQUIRED_FIELDS = ("incident_id", "title", "timeline")


def validate_incident(data: dict) -> None:
    """Deterministic checks run before any model call."""
    missing = [field for field in REQUIRED_FIELDS if not data.get(field)]
    if missing:
        raise ValueError(f"Incident is missing required fields: {missing}")
```

## Choosing the right tool

| Task | Prefer | Why |
|---|---|---|
| Exact arithmetic, totals, taxes | Ordinary code | Deterministic and testable |
| Access checks, permissions | Ordinary code | Must never depend on model behavior |
| Database constraints | Database | Enforced by the system of record |
| Summarizing free text | LLM | Language is ambiguous and varied |
| Extracting fields from messy documents | LLM plus validation | Flexible, but outputs need checks |

Combining both is usually more reliable than asking a model to do everything.

## Use it when

- The input is unstructured or the output needs natural language.
- Rules are hard to express as code, but you can check the result.

## Avoid it when

- A regular expression, a lookup, or a SQL query solves the problem.
- A wrong answer has high impact and you cannot verify it.

## Trade-offs

An LLM call adds cost, latency, and a non-deterministic component. These costs are acceptable when they buy language capability that you could not otherwise build. They are not acceptable when a function would do the same job.

## Common mistake

Treating the model as the whole system. Then business rules end up in prompts, which cannot enforce them.

## Key takeaway

Treat the model as one component in a software system, not as the system itself.

## Exercises

1. List five steps in a feature you know. Mark which ones should be code and which could be an LLM. Justify each choice.
2. Take a prompt you have written. Move one business rule from the prompt into code, and write a test for it.
