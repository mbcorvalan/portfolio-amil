---
title: "Tool Use and Function Calling"
part: II
level: intermediate-advanced
reading_time: 18 min
reviewed: 2026-11
---

# 8. Tool Use and Function Calling

**Tool use** lets a model request an operation that your application defines. The model produces a tool name and arguments. It does **not** run your function. Your application validates the request, checks permissions, executes the operation, and returns the result to the model.

This separation is the most important idea in this chapter. The model proposes. Your code decides.

## Defining a tool

A tool has a name, a description, and an input schema. Good names are explicit. Descriptions say when to use the tool and what it cannot do.

```python
get_order_status = {
    "name": "get_order_status",
    "description": (
        "Return the status of an order that belongs to the current customer. "
        "Use only when the customer asks about a specific order ID. "
        "Cannot change orders or issue refunds."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "order_id": {
                "type": "string",
                "description": "Order ID as written by the customer, e.g. A-10432",
            }
        },
        "required": ["order_id"],
        "additionalProperties": False,
    },
}
```

Use `enum` when the set of valid values is small. For example, `"status_filter": {"enum": ["open", "closed"]}`. Strict tool use can additionally enforce that tool inputs match the schema. Check the current structured-outputs documentation for how to enable it.

## The request–result cycle

1. Send the messages and the tool definitions.
2. If `response.stop_reason == "tool_use"`, the response contains one or more `tool_use` blocks, each with an `id`, a `name`, and `input`.
3. Validate the arguments and the caller's permissions. Execute the operation.
4. Send a `tool_result` block for **every** `tool_use` block, with the matching `tool_use_id`.
5. Repeat until the model returns a final answer.

Store the full `response.content` in the message history. Some features, such as thinking blocks, must be preserved exactly between tool calls. Dropping blocks can break the next request.

## Example: order tracking with authorization

A customer asks, "Where is my order A-10432?" The model requests `get_order_status`. The backend must check that the **authenticated** customer owns the order. The customer ID comes from the session, never from the model's arguments.

```python
import json
from dataclasses import dataclass

from pydantic import BaseModel, ValidationError


@dataclass(frozen=True)
class AuthContext:
    customer_id: str  # set by your authentication layer, never by the model


class OrderArgs(BaseModel):
    order_id: str


def fetch_order(order_id: str) -> dict | None:
    """Replace with a call to your order service."""
    fake_db = {"A-10432": {"customer_id": "c-1", "status": "shipped", "eta": "2026-11-15"}}
    return fake_db.get(order_id)


def get_order_status_handler(args: OrderArgs, ctx: AuthContext) -> dict:
    order = fetch_order(args.order_id)
    # Same error for "not found" and "not yours": do not reveal which IDs exist.
    if order is None or order["customer_id"] != ctx.customer_id:
        raise PermissionError("Order not found")
    return {"order_id": args.order_id, "status": order["status"], "eta": order["eta"]}


REGISTRY = {
    "get_order_status": (OrderArgs, get_order_status_handler),
}


def error_result(tool_use_id: str, message: str) -> dict:
    return {
        "type": "tool_result",
        "tool_use_id": tool_use_id,
        "content": message,
        "is_error": True,
    }


def execute_tool(block, ctx: AuthContext) -> dict:
    if block.name not in REGISTRY:
        return error_result(block.id, f"Unknown tool: {block.name}")

    schema, handler = REGISTRY[block.name]
    try:
        args = schema.model_validate(block.input)
    except ValidationError:
        return error_result(block.id, "Invalid arguments. Ask the customer for a valid order ID.")

    try:
        output = handler(args, ctx)
    except PermissionError:
        return error_result(block.id, "Order not found.")
    except Exception:
        # Log the details server-side. Do not expose internals to the model.
        return error_result(block.id, "Service temporarily unavailable. Try again later.")

    return {
        "type": "tool_result",
        "tool_use_id": block.id,
        "content": json.dumps(output),
    }
```

Notes on this design:

- **Authorization is in the handler**, not in the description. A tool description cannot enforce anything.
- **Errors are returned to the model**, not raised. The model can then ask the customer for a corrected ID or apologize.
- **Internal details stay in logs.** The model sees a safe message.

## The agent loop with a limit

The loop must stop. Set a maximum number of steps and fail clearly when it is reached.

```python
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # check the models page before shipping
MAX_STEPS = 5


def run_turn(messages: list[dict], tools: list[dict], ctx: AuthContext):
    for _ in range(MAX_STEPS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            tools=tools,
            messages=messages,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return response  # final answer or another stop reason

        # One user message holds ALL results for this assistant turn.
        results = [
            execute_tool(block, ctx)
            for block in response.content
            if block.type == "tool_use"
        ]
        messages.append({"role": "user", "content": results})

    raise RuntimeError("Tool loop exceeded MAX_STEPS. Escalate to a human.")
```

Important details:

- Every `tool_use` block needs a result. Missing results cause an API error.
- All results for one assistant turn go in **one** user message.
- Check `stop_reason`. A value of `max_tokens` means the answer was cut off, not that the model finished.

## Multiple tools

Use a registry, as in the example, rather than a long chain of `if` statements. The registry makes the list of permitted operations explicit and easy to review. Give each tool a narrow input schema and a single responsibility.

## Use it when

- The model must look up or change data that is not in its prompt.
- The next action depends on information the model has not seen yet.

## Avoid it when

- The steps are fixed and known in advance. Use a workflow (Chapter 9). A fixed sequence does not need the model to choose tools.
- The tool performs an irreversible action and you cannot require approval.

## Trade-offs

Tools make the model useful and extend its reach. They also add latency (each step is a round trip), cost, and security exposure. Every tool is an attack surface. Give each tool the minimum permissions it needs.

## Common mistakes

1. **Trusting arguments from the model.** Take the customer ID from the session.
2. **Forgetting a `tool_result`.** The API rejects the next request.
3. **No step limit.** A confused model can loop and spend money.
4. **Raising exceptions instead of returning errors.** The conversation breaks instead of recovering.

## Key takeaway

The model may request an action. Your application decides whether the action is allowed and performs it.

## Exercises

1. Add a second tool, `list_recent_orders`, with an optional `limit` parameter capped at 10. Make sure the handler returns only the authenticated customer's orders.
2. Write tests for three cases: an unknown tool name, invalid arguments, and an order that belongs to another customer. Confirm that each returns an error result and that none of them raises an exception to the caller.
3. Simulate a model that always requests a tool. Confirm that the loop stops after `MAX_STEPS`.
