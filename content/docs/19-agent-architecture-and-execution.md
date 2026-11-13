---
title: "Agent Architecture and Execution"
part: VI
level: advanced
reading_time: 22 min
reviewed: 2026-11
---

# 19. Agent Architecture and Execution

An AI agent is a system in which a model chooses actions, calls approved tools, reads the results, and continues until the task is done or a limit is reached. The model is one part of the agent. Your application owns the execution loop, the state, the permissions, and the operational controls.

Chapter 9 explained when to use an agent. Chapter 11 showed the execution loop and its budgets. This chapter covers the parts around the loop that decide whether an agent survives production: state that outlives a process, memory with clear boundaries, plans that can change, and tool contracts that are reviewed like APIs.

Start with a workflow when the sequence is known. Build an agent only when the next step genuinely depends on what the agent discovers.

## Anatomy of an agent

| Component | Responsibility | Owned by |
|---|---|---|
| Loop | Calls the model, dispatches tools, decides when to stop | Application code |
| State | Facts the run has established: completed actions, pending approvals, errors | Application code, persisted |
| Context | What the model sees on each call: instructions, summary, recent results | Application code, assembled per call |
| Memory | Facts kept across runs, with source and expiry | Application code, with retention rules |
| Tools | Operations the agent may request, each with a contract | Application code, reviewed |
| Policy | What the agent may do, under which conditions | Application code and configuration |

The most common design error is letting one component do the job of another. The conversation transcript is not the state. The prompt is not the policy. The model's memory of a result is not the record of that result.

## Planning is provisional

A plan breaks a goal into steps. It is useful for communication and for dependency checks. It is not a commitment. New evidence can make a step unnecessary, impossible, or harmful.

Store the plan as data, not as prose the model must remember:

```python
from dataclasses import dataclass, field
from typing import Literal


@dataclass
class PlanStep:
    step_id: str
    description: str
    depends_on: list[str] = field(default_factory=list)
    status: Literal["todo", "doing", "done", "skipped", "blocked"] = "todo"
    evidence: str | None = None


def next_runnable(plan: list[PlanStep]) -> list[PlanStep]:
    """A step can run when every dependency is done and it has not started yet."""
    done = {s.step_id for s in plan if s.status == "done"}
    return [
        s for s in plan
        if s.status == "todo" and all(dep in done for dep in s.depends_on)
    ]
```

Example: "Prepare a release checklist" might produce four steps: read the release notes, list open critical bugs, check test status, draft the checklist. Publishing the release is a different step with its own permission and approval. Completing the research does not authorize the publication.

Re-plan when a step's evidence contradicts the plan. Record the change as a state transition, so you can see later why the agent did something unexpected.

## State that survives a restart

An agent run can last minutes or hours. Processes restart, APIs fail, and approvals take days. If the state lives only in memory, a restart means either losing the work or repeating side effects.

Persist a checkpoint after every completed step. Write the file atomically, so a crash never leaves half a checkpoint behind:

```python
import json
from dataclasses import asdict
from pathlib import Path


def to_jsonable(messages: list[dict]) -> list[dict]:
    """SDK content blocks are pydantic models. Convert them before serializing."""
    out = []
    for message in messages:
        content = message["content"]
        if isinstance(content, list):
            content = [
                block.model_dump() if hasattr(block, "model_dump") else block
                for block in content
            ]
        out.append({"role": message["role"], "content": content})
    return out


def save_checkpoint(path: Path, state, messages: list[dict]) -> None:
    payload = {"state": asdict(state), "messages": to_jsonable(messages)}
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)  # atomic rename on the same filesystem


def load_checkpoint(path: Path):
    from agent_state import AgentState  # the dataclass from Chapter 11

    payload = json.loads(path.read_text(encoding="utf-8"))
    return AgentState(**payload["state"]), payload["messages"]
```

When you resume a run, do not trust the checkpoint blindly. Revalidate:

- Permissions: the user may have lost access since the checkpoint.
- Environment: a record the agent read earlier may have changed.
- Pending approvals: they may have expired or been rejected.

A resumed run that skips these checks acts on stale facts. Chapter 21 covers how to avoid repeating side effects after a crash.

### Changing models during a run

A checkpoint should record the model ID with each save. Resuming with a different model family drops thinking blocks from earlier turns (see Chapter 12). Either resume with the same family, or record in the state that the reasoning was dropped, and evaluate the resumed run before you trust it.

## Memory has boundaries

The word "memory" covers three different things. Keep them separate:

| Layer | Lifetime | Source of truth? | Example |
|---|---|---|---|
| Context | One model call | No | The last three tool results in the prompt |
| State | One run | Yes, for the run | "Refund issued for order A-10432" |
| Memory | Across runs | Only when verified | "Customer prefers email contact" |

A memory is a claim with provenance. Store where it came from, when it was recorded, and when it expires:

```python
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class MemoryFact:
    key: str
    value: str
    source: str              # "user:stated", "tool:get_account", "agent:inferred"
    recorded_at: datetime
    expires_at: datetime | None = None

    def is_valid(self, now: datetime) -> bool:
        return self.expires_at is None or now < self.expires_at


def resolve(key: str, facts: list[MemoryFact], verified: dict[str, str]) -> str | None:
    """A verified record from a system of record overrides any remembered claim."""
    if key in verified:
        return verified[key]
    candidates = [f for f in facts if f.key == key and f.source != "agent:inferred"]
    return candidates[-1].value if candidates else None
```

Three rules follow from this design:

1. **A verified record beats a remembered claim.** If the billing system says the address changed yesterday, the memory of the old address loses.
2. **Inferred facts are not authority.** Do not promote "agent:inferred" into a fact the agent treats as true, and never use it to justify an action.
3. **Memory never grants permission.** A user who once said "go ahead and refund me" did not authorize a refund next month. Approvals are recorded in state with the exact action, as in Chapter 13.

Expiry matters. A promotional price or a temporary address should not live forever in memory. Set `expires_at` when you write the fact, not later.

## Context management

Each model call has a context budget. A long run fills it with tool results, and older results matter less than recent ones. Your options are:

- **Summarize** older steps into a short record that your application writes, and keep the full results in state.
- **Clear** tool results that are no longer needed, keeping the step's outcome.
- **Retrieve** a result on demand from state, instead of keeping every result in the prompt.

Anthropic's API offers context management features, including context editing and compaction, that are available in some configurations and may require beta headers. Check the current documentation before you depend on them. The principle does not change: the context is a view that your code assembles, not the source of truth.

When you summarize, keep the identifiers. "Order A-10432 was checked and is shipped" loses the ID that the next step needs. Keep the IDs; drop the prose.

## Tool contracts

A tool is an API that a model may call. Review it the way you would review a public endpoint:

```python
TOOL_CONTRACT = {
    "name": "get_order_status",
    "version": "2",
    "side_effects": "none",            # read-only
    "permission": "order:read",
    "input_schema": {
        "type": "object",
        "properties": {"order_id": {"type": "string", "pattern": "^A-[0-9]{5}$"}},
        "required": ["order_id"],
        "additionalProperties": False,
    },
    "errors": ["not_found", "forbidden", "unavailable"],
    "timeout_seconds": 5,
    "idempotent": True,
}
```

Each contract states:

- What the tool does and what it cannot do.
- Its side effects, and whether a retry is safe.
- The permission it needs.
- Its input schema, with patterns and enums where possible.
- The error values it can return, so the agent can branch on them.
- Its timeout.

A contract change is a breaking change when the model's behavior depends on it. Version the contract and run the eval suite (Chapter 6) before you release a new version.

### MCP and skills

The Model Context Protocol (MCP) is a standard way to connect an application to tools, resources, and prompts exposed by a server (Chapters 22 and 23). MCP standardizes how tools are discovered and called. It does not make a tool safe, and it does not decide which tool the agent should use. Authorization, input validation, and approvals remain your responsibility.

Agent skills are reusable instructions for a class of tasks, such as "how to review a migration." A skill describes how to work. A tool performs an operation. Keep them distinct in your design, and version both.

## Termination and recovery

Every run needs explicit ways to end:

| Outcome | Condition | Result to the user |
|---|---|---|
| Completed | Task-level check passes | The result, with evidence |
| Needs approval | An action is waiting for a person | "Waiting for approval" with the exact action |
| Budget exhausted | Steps, time, or cost limit reached | Partial result, clearly labeled |
| Failed | Unrecoverable error | Error category and next step |
| Escalated | Ambiguous or risky situation | Handoff to a person, with the state attached |

Recovery depends on the failure:

- **Transient tool errors** (timeouts, rate limits): retry with backoff, but only for idempotent operations (Chapter 14).
- **Permission errors:** stop that branch. Do not try a different tool to reach the same data.
- **Invalid tool results:** return a structured error to the model. Do not guess a value.
- **Model truncation** (`stop_reason == "max_tokens"`): treat as failure, not completion.

Verification is the last step before you claim success. A model that says "done" is making a claim. Check the state of the world with a read after write (Chapter 11).

## Example: a developer assistant

A developer asks the assistant to fix a failing test. The run looks like this:

1. The agent reads the test and the module under test (read tools, scoped to the repository).
2. It proposes a patch and writes it to a sandbox copy, not to the working tree.
3. It runs the test suite inside the sandbox.
4. If the suite passes, it presents the diff and waits for approval to apply it.
5. After approval, it applies the patch and runs the suite once more to verify.

Each step has a checkpoint. If the process restarts after step 3, the run resumes from the checkpoint, revalidates the repository state, and repeats only the work that has no recorded result.

## Use it when

- The next step depends on what the agent has found, and the task can be verified at the end.
- The run may outlast a single process, and resuming matters.

## Avoid it when

- The steps are known. Use a workflow (Chapter 9).
- You cannot define a stop condition, a budget, or a verification check. An agent without these is not ready for production.
- The memory you would store is inferred rather than stated or verified.

## Trade-offs

Persistence adds storage, serialization, and a recovery path that must be tested. Explicit memory boundaries add code and rules, but they prevent stale facts from driving decisions. Tool contracts add review work and make changes slower, and they make failures predictable.

## Common mistakes

1. **Using the transcript as state.** You cannot query it, and it grows without bound.
2. **Storing inferred facts as memory.** A guess becomes a fact the next run trusts.
3. **Resuming without revalidation.** Permissions and data may have changed.
4. **Letting memory grant permission.** Approvals must be specific and recorded.
5. **Summarizing away identifiers.** The next step cannot act on "the order I checked earlier."

## Key takeaway

Build an agent as a bounded, observable state machine that the model drives within limits your code enforces. The model chooses the next step. The application decides what that step is allowed to change, and it records what happened.

## Exercises

1. Write the `PlanStep` scheduler test: a step with an unfinished dependency must not be returned by `next_runnable`.
2. Implement checkpoint save and load. Kill the process after the third of five steps, restart, and confirm the run resumes at step four without repeating steps one to three.
3. Write a `resolve` test in which a verified record and a remembered claim disagree. Confirm the verified record wins, and that an `agent:inferred` fact never does.
4. Write a tool contract for a write operation in your domain. Mark it non-idempotent, and explain in writing what your retry policy must be for it.
