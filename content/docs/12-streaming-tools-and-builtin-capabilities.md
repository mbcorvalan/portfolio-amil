---
title: "Streaming Tools and Built-in Capabilities"
part: III
level: advanced
reading_time: 14 min
reviewed: 2026-11
---

# 12. Streaming Tools and Built-in Capabilities

Streaming changes how you handle tool calls. Instead of receiving a complete tool request, your application receives a sequence of events. Tool arguments can arrive in fragments. Your code must assemble them, validate them, and only then act.

## The event protocol

A streamed response is a sequence of events, typically including:

- `message_start`: the response begins.
- `content_block_start`: a new block begins. It may be `text`, `tool_use`, or a thinking block.
- `content_block_delta`: a fragment of the block. For text, it contains text. For tool arguments, it contains a fragment of JSON.
- `content_block_stop`: the block is complete.
- `message_delta` and `message_stop`: the response ends, with the stop reason and usage.

Event names and fields are stable parts of the API, but check the streaming reference for the exact shapes you need.

## Rule: display events, act only on the final message

Fragments of tool arguments are often **invalid JSON** until the block is complete. Use them for progress display only. Execute tools only from the final, assembled message.

```python
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # check the models page before shipping


def stream_turn(messages: list[dict], tools: list[dict]):
    with client.messages.stream(
        model=MODEL,
        max_tokens=2048,
        tools=tools,
        messages=messages,
    ) as stream:
        for event in stream:
            if event.type == "content_block_delta":
                if event.delta.type == "text_delta":
                    print(event.delta.text, end="", flush=True)
                elif event.delta.type == "input_json_delta":
                    # Partial tool arguments. Show "working..." only.
                    # Do NOT parse or execute here.
                    pass

        final = stream.get_final_message()

    # Act only on the assembled, complete blocks.
    tool_calls = [b for b in final.content if b.type == "tool_use"]
    return final, tool_calls
```

`get_final_message()` gives you complete, parsed `tool_use` blocks with `input` as a dictionary. Validate that input with your schema before the handler runs (Chapter 8).

## Fine-grained tool streaming

Some providers and API versions can stream partial tool arguments earlier, with less buffering. This lowers time to the first fragment, which helps a UI that wants to show "preparing the refund..." sooner. The cost is that partial JSON may be invalid until the stream finishes, so the application must not act on it.

Feature flags and beta headers change over time. Check the current documentation before you copy a header value from an older example.

## Client tools and server tools

| | Client tool | Server tool |
|---|---|---|
| Where it runs | In your application | On the provider's infrastructure |
| Who executes it | Your code | The provider |
| Who checks permissions | You | The provider's policy, plus your configuration |
| Example | `get_order_status` (your database) | Hosted web search |

The responsibility differs. For a client tool, you own the authorization, the timeout, and the error handling. For a server tool, you use the results the provider returns and follow its contract for citations, limits, and billing. Check the tools reference for the current list of server tools and their configuration options.

## Citations and partial output

When a response includes citations, text can stream before the citation is complete. Do not present a partially streamed citation as a final source. Wait for the block to finish, then render the citation.

## Example: research dashboard

An internal research tool streams a draft answer while a hosted search tool gathers sources. The UI shows three distinct states:

1. **Partial text:** provisional, shown with a "drafting" indicator.
2. **Completed statements:** final once their block closes.
3. **Citations and errors:** rendered only after the block completes, with a clear error state if the search fails.

```python
def render_block_state(block_type: str, complete: bool) -> str:
    if block_type == "text" and not complete:
        return "drafting"
    if block_type == "text" and complete:
        return "final"
    if block_type == "tool_use" and not complete:
        return "preparing tool call"
    return "done"
```

## Thinking blocks and tool use

If you use extended thinking together with tools, keep all returned blocks, including thinking blocks, and send them back unchanged in the next request. Do not summarize or edit them. Changing them can break the conversation or the reasoning continuity.

Thinking blocks belong to a model family. Claude Sonnet 5.5 reads thinking blocks from Claude Sonnet 5, Claude Opus 4.8, Claude Haiku 4.5, and earlier models. It does not read them from Claude Opus 5, Claude Opus 5.5, or the Claude Fable and Mythos models. If a conversation moves to a different family, the reasoning from earlier turns is not carried over. Test that path explicitly. Do not assume the reasoning survives a model switch.

## Use it when

- The user benefits from seeing progress during a long answer or a long tool call.
- Tool calls take long enough that waiting without feedback hurts the experience.

## Avoid it when

- The response is short and the tool calls are fast. Streaming adds complexity without a visible gain.
- Your handler is not idempotent. A dropped connection can make a client retry an action that already happened. Use idempotency keys for side effects (Chapter 9).

## Trade-offs

Streaming improves perceived responsiveness and increases state complexity. Partial states must be handled in the UI and in the backend. Built-in server tools reduce the code you write, and they reduce control over execution details.

## Common mistakes

1. **Executing a tool on the first `input_json_delta`.** The JSON is incomplete and the action may be wrong.
2. **Ignoring a dropped stream.** If the connection fails mid-tool-call, decide whether to retry, and make the action idempotent first.
3. **Showing a partial citation as final.**
4. **Modifying thinking blocks before sending them back.**

## Key takeaway

Streaming is an event protocol. Assemble tool calls, validate them, and track their state before your application acts on them.

## Exercises

1. Implement the stream handler above with a fake stream of events. Confirm that no handler runs until the `tool_use` block is complete.
2. Add a timeout and a cancellation path. Confirm that closing the stream releases the connection and that the UI shows a clear "cancelled" state.
3. Write a test where the JSON arguments arrive in three fragments, one of them invalid. Confirm the final parsed input is correct and that the handler receives it exactly once.
