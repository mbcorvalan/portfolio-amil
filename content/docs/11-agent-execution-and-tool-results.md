---
title: "Agent Execution and Tool Results"
part: III
level: advanced
reading_time: 18 min
reviewed: 2026-11
---

# 11. Agent Execution and Tool Results

An agent is a loop. Every production agent needs a clear execution protocol: explicit state, explicit limits, explicit handling of tool results, and explicit verification of important changes. Without these, an agent is an unbounded loop with a credit card attached.

## The execution loop

A typical loop is: **observe → decide → act → check → update state → repeat or stop**.

The application decides when to stop, not the model alone. Stop conditions include:

- The task is complete.
- A maximum number of steps is reached.
- A cost or time budget is exhausted.
- A human decision is required.
- A tool fails in a way that cannot be recovered.

## State is explicit

Keep a structured state object. Do not rely only on the conversation transcript to know what happened.

```python
from dataclasses import dataclass, field
from typing import Literal


@dataclass
class AgentState:
    goal: str
    status: Literal["running", "done", "needs_approval", "failed"] = "running"
    steps: int = 0
    cost_cents: float = 0.0
    completed_actions: list[str] = field(default_factory=list)
    pending_approvals: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
```

The state records facts the application can check: which actions were completed, what is waiting for approval, and what went wrong. The prompt receives a concise summary of what the model needs for the next decision. The state itself stays in your code and your database.

## Budgets

Set limits before the loop starts. Compute cost from the usage fields the API returns. Prices change, so read them from configuration, not from constants in code.

```python
from dataclasses import dataclass

# Illustrative prices in cents per million tokens. Load real values from
# configuration and check the current pricing page.
PRICE_INPUT_CENTS_PER_MTOK = 300
PRICE_OUTPUT_CENTS_PER_MTOK = 1500


@dataclass(frozen=True)
class Budget:
    max_steps: int = 8
    max_cost_cents: float = 50.0


def call_cost_cents(usage) -> float:
    return (
        usage.input_tokens * PRICE_INPUT_CENTS_PER_MTOK
        + usage.output_tokens * PRICE_OUTPUT_CENTS_PER_MTOK
    ) / 1_000_000


def within_budget(state: AgentState, budget: Budget) -> bool:
    return state.steps < budget.max_steps and state.cost_cents < budget.max_cost_cents
```

*(Prices are placeholders for illustration. Check the current pricing before use.)*

## Routing tool calls through a registry

A registry maps approved tool names to handlers. It is easier to review than scattered `if` statements, and it makes permissions explicit: a tool that is not in the registry cannot be called.

```python
from typing import Callable

ToolHandler = Callable[[dict], dict]

REGISTRY: dict[str, ToolHandler] = {}


def tool(name: str):
    def register(fn: ToolHandler) -> ToolHandler:
        REGISTRY[name] = fn
        return fn
    return register


@tool("get_ticket")
def get_ticket(args: dict) -> dict:
    ...  # read-only lookup


@tool("update_ticket_status")
def update_ticket_status(args: dict) -> dict:
    ...  # write operation; verified by the caller afterward
```

Each handler validates its own input (see Chapter 8) and returns a result in a fixed format, such as `{"ok": true, "data": ...}` or `{"ok": false, "error": "..."}`.

## Read after write

After an important change, verify it. A support assistant that updates a delivery address should read the record back before it tells the customer the change succeeded. This catches silent failures and stale caches.

```python
def update_and_verify(ticket_id: str, status: str, state: AgentState) -> bool:
    write = update_ticket_status({"ticket_id": ticket_id, "status": status})
    if not write.get("ok"):
        state.errors.append(f"write failed: {write.get('error')}")
        return False

    check = get_ticket({"ticket_id": ticket_id})
    if not check.get("ok") or check["data"]["status"] != status:
        state.errors.append(f"verification failed for {ticket_id}")
        return False

    state.completed_actions.append(f"status {ticket_id} -> {status}")
    return True
```

The success message is produced only after the check passes. The model should not claim success on its own.

## Preserve content blocks

A response with tool use can contain text, `tool_use`, and other block types, such as thinking blocks. Store the full `response.content` in the history, as you did in Chapter 8. Thinking blocks and tool use must be passed back exactly for the next request to work. Stripping or rewriting them causes API errors or lost reasoning.

## The loop

```python
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # check the models page before shipping


def run_agent(state: AgentState, messages: list[dict], tools: list[dict], budget: Budget):
    while state.status == "running":
        if not within_budget(state, budget):
            state.status = "failed"
            state.errors.append("budget exhausted")
            break

        response = client.messages.create(
            model=MODEL,
            max_tokens=2048,
            tools=tools,
            messages=messages,
        )
        state.steps += 1
        state.cost_cents += call_cost_cents(response.usage)
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "max_tokens":
            state.status = "failed"
            state.errors.append("response truncated")
            break

        if response.stop_reason != "tool_use":
            state.status = "done"  # the model believes it is finished
            break

        results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            handler = REGISTRY.get(block.name)
            if handler is None:
                output = {"ok": False, "error": f"unknown tool {block.name}"}
            else:
                try:
                    output = handler(block.input)
                except Exception:
                    # Details go to logs, not to the model.
                    output = {"ok": False, "error": "tool unavailable"}
            results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": str(output),
                "is_error": not output.get("ok", False),
            })
        messages.append({"role": "user", "content": results})

    return state
```

Notes:

- `stop_reason` tells you why the model stopped. `end_turn` (or similar completion values) differs from `tool_use` and `max_tokens`. Treat each one explicitly.
- Every `tool_use` block gets exactly one result with the matching ID.
- The model's claim "I am done" sets `done`, but the task-level check should still run before the result is reported to the user.

## An example: developer assistant

A developer asks an assistant to fix a failing test. The agent reads the test and the source, proposes a small change, applies it inside a sandbox, runs the test suite, and reads the output. It reports success only if the suite passes. If the test still fails, it reports what it observed.

Limits matter here: file access is restricted to the project directory, the command list is fixed, and the agent cannot push to a remote branch. Those rules are enforced by the tool handlers, not by the prompt.

## Use it when

- The next step depends on what the previous step found.
- The task can be verified objectively at the end.

## Avoid it when

- The steps are known. Use a workflow (Chapter 9).
- You cannot define a budget, a stop condition, or a verification check. Without these, the agent is not ready for production.

## Trade-offs

Agents handle unplanned paths and multi-step investigation. They also bring variable cost and latency, harder testing, and larger security exposure. Read-after-write adds calls and catches errors that would otherwise reach users.

## Common mistakes

1. **No step limit.** A tool that returns an unexpected result can cause endless retries.
2. **Trusting the model's "done".** Verify the outcome in code.
3. **Hiding tool errors.** Returning an empty result makes the model guess.
4. **Broad permissions.** Every tool should have the minimum access it needs.

## Key takeaway

A robust agent needs an explicit execution protocol, state checks, clear failure handling, and bounded autonomy.

## Exercises

1. Implement a registry with two read tools and one write tool. Write tests showing that an unregistered tool name is rejected.
2. Simulate a write that reports success but leaves the record unchanged. Confirm that `update_and_verify` returns `False` and records the error.
3. Set `max_steps=3` and a tool that always returns new work. Confirm the loop stops and the final state is `failed` with a clear error.
