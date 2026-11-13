---
title: "Streaming and Output Contracts"
part: I
level: intermediate
reading_time: 14 min
reviewed: 2026-11
---

# 4. Streaming and Output Contracts

Two decisions shape how a model response reaches your users and your code: **streaming** (how the text arrives) and the **output contract** (what shape the result must have). They solve different problems. Streaming improves perceived speed. Output contracts make responses safe to parse and use.

## Streaming

Without streaming, the client waits until the full response is ready. With streaming, the API sends events as the model generates text. A web interface can show the first sentences immediately, which improves perceived responsiveness for long answers.

The Python SDK exposes a helper that yields text as it arrives:

```python
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # check the models page before shipping

with client.messages.stream(
    model=MODEL,
    max_tokens=512,
    messages=[{"role": "user", "content": "Explain streaming in two sentences."}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

    final = stream.get_final_message()

print("\nstop_reason:", final.stop_reason)
```

Streaming changes how you handle failure:

- A connection can drop after half the text has arrived. Decide what the UI shows and whether to retry.
- The user may cancel. Close the stream and release resources.
- The final message contains `stop_reason`. Check it before you treat the text as complete.

Streaming improves the time to first visible text. It does **not** reduce total generation time or cost.

## Output contracts

When another program consumes the response, free-form prose is the wrong format. An **output contract** defines the exact shape the result must have.

Example: a support triage step must return a category, a short summary, and a flag for human review.

Structured outputs are generally available in the Claude API for current models. You pass a JSON Schema through the `output_config` parameter:

```python
schema = {
    "type": "object",
    "properties": {
        "category": {
            "type": "string",
            "enum": ["billing", "authentication", "bug", "other"],
        },
        "summary": {"type": "string"},
        "requires_human": {"type": "boolean"},
    },
    "required": ["category", "summary", "requires_human"],
    "additionalProperties": False,
}

response = client.messages.create(
    model=MODEL,
    max_tokens=512,
    messages=[{"role": "user", "content": "I was charged twice for my plan."}],
    output_config={"format": {"type": "json_schema", "schema": schema}},
)
```

Validate the result in your application anyway. Schema compliance guarantees the **shape** of the output, not its **truth**:

```python
from typing import Literal

from pydantic import BaseModel, ValidationError


class TicketTriage(BaseModel):
    category: Literal["billing", "authentication", "bug", "other"]
    summary: str
    requires_human: bool


def parse_triage(response) -> TicketTriage:
    if response.stop_reason == "max_tokens":
        raise RuntimeError("Output was truncated; the JSON may be incomplete.")
    text = response.content[0].text
    try:
        return TicketTriage.model_validate_json(text)
    except ValidationError as error:
        raise RuntimeError("Model output failed validation") from error
```

Notes:

- A schema can require a field whose value is still wrong. Business checks, such as "the category must match a known product," stay in your code.
- JSON Schema support has limits. Check the current structured-outputs documentation for supported keywords before you design a complex schema.
- The older beta header and the `output_format` parameter still work during a transition period. Use the current `output_config` shape in new code.
- If your model's only job is to call a function, use **strict tool use** instead (see Chapter 8).

## Use it when

- Users read the text: stream it.
- Software reads the text: use a schema and validate it.

## Avoid it when

- Streaming adds complexity without a visible benefit, such as for a short batch job.
- You ask for JSON in plain text and parse it with string operations. Use the structured output feature.

## Trade-offs

Streaming improves perceived latency and adds partial-state handling. Structured outputs improve reliability and add some input overhead, since the API adds a formatting instruction. Both are cheap compared with a failed downstream action.

## Common mistake

Marking a streamed answer as final before checking `stop_reason`, or saving a truncated JSON object to the database.

## Key takeaway

Design outputs for the system that receives them. Friendly prose is for humans. Validated schemas are for software.

## Exercises

1. Write a streaming endpoint that cancels the model call after 10 seconds and returns the partial text with a clear status.
2. Define a schema for a task in your domain. Write tests with three responses: valid, missing a required field, and truncated. Confirm your parser rejects the last two.
