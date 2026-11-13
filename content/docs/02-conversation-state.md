---
title: "Conversation State and Context"
part: I
level: intermediate
reading_time: 12 min
reviewed: 2026-11
---

# 2. Conversation State and Context

The Claude Messages API is **stateless**. Each request is independent. The API does not remember earlier requests from your application. To build a multi-turn conversation, your backend stores the history and sends the relevant messages again on every call.

This makes state your responsibility. You decide what to store, how long to keep it, which parts to send, and who is allowed to read it.

## Messages and roles

Each message has a `role` (`user` or `assistant`) and `content`. The system prompt is passed separately with the `system` parameter. History must be associated with the correct user, organization, and session, especially in multi-tenant applications.

## Example: a billing follow-up

A customer asks, "Why was I charged twice?" and then says, "What about last month?" The second question is ambiguous without the first exchange. The backend includes the earlier messages and the relevant invoices, after checking the customer's access. The model can then answer in context.

## A minimal turn function

This function takes history as an argument and returns a new history. It does not use a global variable, so each conversation stays separate.

```python
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment
MODEL = "claude-sonnet-5-5"     # check the models page before shipping


def chat_turn(
    history: list[dict],
    user_text: str,
    system: str,
) -> tuple[str, list[dict]]:
    """Send one user turn and return the reply and the updated history."""
    messages = history + [{"role": "user", "content": user_text}]

    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        system=system,
        messages=messages,
    )

    # A truncated answer is not a valid turn. Do not store it as history.
    if response.stop_reason == "max_tokens":
        raise RuntimeError("Reply was truncated. Raise max_tokens or ask for a shorter answer.")

    text = "".join(block.text for block in response.content if block.type == "text")
    updated = messages + [{"role": "assistant", "content": text}]
    return text, updated
```

Notes on this example:

- It handles only text. When you use tools or extended thinking, the response contains other block types. Store the **full** `response.content` in history, not only the text. Dropping blocks can break the next request.
- Persist `updated` in a database, keyed by conversation and tenant. Do not keep it in process memory in production.

## Context windows and tokens

Models process **tokens**, not words. The context window limits how much a single request can contain. Longer histories increase input cost and latency, and can reduce answer quality.

You can measure input size before sending the request:

```python
count = client.messages.count_tokens(
    model=MODEL,
    system=system,
    messages=messages,
)
print(count.input_tokens)
```

Common strategies for long conversations:

- **Truncation:** keep the last N turns. Simple, but loses early facts.
- **Summarization:** replace old turns with a summary stored by your application.
- **Retrieval:** store facts in a database and fetch only what the current question needs.

Choose based on what the user must be able to recall. Facts such as account IDs or decisions should be stored as structured data, not left inside a summary.

## Use it when

- Your product needs multi-turn interaction.
- Earlier turns change the meaning of later ones.

## Avoid it when

- Each request is independent. A single stateless call is simpler and cheaper.

## Trade-offs

Sending full history is simple and gives the model the most context. It is also the most expensive option, and the input grows with every turn. Summaries save tokens but can drop details. Retrieval is precise but adds infrastructure.

## Common mistake

Storing conversation history in a global variable. This leaks data between users and disappears on restart.

## Key takeaway

The model does not own memory. Your application designs, stores, secures, and limits it.

## Exercises

1. Extend `chat_turn` so it stores the conversation in a dictionary keyed by `(tenant_id, conversation_id)`. Write a test showing that two tenants cannot read each other's history.
2. Measure the input tokens of a 20-turn conversation. Then implement truncation to the last 6 turns and compare the token counts.
