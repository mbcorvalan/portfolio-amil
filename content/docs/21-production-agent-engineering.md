---
title: "Production Agent Engineering"
part: VI
level: advanced
reading_time: 24 min
reviewed: 2026-11
---

# 21. Production Agent Engineering

An agent in production is not a demo that runs once. It takes actions, retries after failures, waits for people, and runs while nobody is watching. This chapter covers the controls that make that safe: approval gates, durable execution without repeated side effects, sandboxing, trajectory evaluation, observability across parent and child agents, and a release process.

The principle from Chapter 13 applies with more force here. The model proposes. Code enforces. A production agent is trustworthy when its worst possible action is bounded by design.

## Human-in-the-loop approval

A human-in-the-loop (HITL) gate pauses execution until a person approves a specific action. Use gates for actions that send messages to customers, change production systems, delete data, merge code, or move money.

The approval must show the exact action, with its arguments and expected impact. An approval for "send a reply" is not an approval for a different recipient or a different amount.

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Literal


@dataclass
class PendingAction:
    action_id: str
    run_id: str
    tool: str
    arguments: dict
    impact_summary: str           # written for the approver, in plain language
    created_at: datetime
    expires_after: timedelta = timedelta(hours=24)
    status: Literal["pending", "approved", "rejected", "expired", "executed"] = "pending"
    decided_by: str | None = None

    def is_expired(self, now: datetime) -> bool:
        return self.status == "pending" and now > self.created_at + self.expires_after


def approve(action: PendingAction, reviewer_id: str, now: datetime) -> PendingAction:
    if action.is_expired(now):
        action.status = "expired"
        raise ValueError("approval window has passed; propose the action again")
    if action.status != "pending":
        raise ValueError(f"action is {action.status}")
    if reviewer_id == action.run_id:
        raise ValueError("reviewer must differ from the requester")
    action.status = "approved"
    action.decided_by = reviewer_id
    return action


def execute_if_approved(action: PendingAction, perform) -> dict:
    if action.status != "approved":
        raise PermissionError("action has no approval")
    action.status = "executed"
    return perform(action.arguments)
```

Three controls to notice:

- **Expiry.** An approval given to a stale request should not authorize a new situation. The window is part of the decision.
- **Separation of duties.** The model's run cannot approve its own action. In this sketch the check compares IDs. In a real system, the reviewer must be an authenticated human with the right role.
- **Single execution.** The status moves to `executed` before the side effect runs, so a repeated call finds the action already used. Pair this with the idempotency key in the next section, because the status alone does not protect against a crash in the middle of `perform`.

## Durable execution without repeated side effects

Processes crash. A timeout can hide a success. If an agent retries a refund after a timeout, the customer may be refunded twice.

Use a durable action log. Record the intent before the side effect, record the result after it, and pass a stable idempotency key to the external system:

```python
from typing import Callable, Protocol


class ActionLog(Protocol):
    def get(self, key: str) -> dict | None: ...
    def put(self, key: str, record: dict) -> None: ...


def execute_once(
    key: str,
    log: ActionLog,
    perform: Callable[[str], dict],
    reconcile: Callable[[str], dict | None],
) -> dict:
    """Run a side effect at most once, even across crashes.

    perform:   the external call. It receives the idempotency key.
    reconcile: asks the external system whether an action with this key succeeded.
    """
    record = log.get(key)

    if record and record["status"] == "succeeded":
        return record["result"]

    if record and record["status"] == "started":
        # The previous attempt may have succeeded just before a crash.
        # Ask the system of record before doing anything else.
        found = reconcile(key)
        if found is not None:
            log.put(key, {"status": "succeeded", "result": found})
            return found
        raise RuntimeError(f"action {key} has unknown state; escalate to a person")

    log.put(key, {"status": "started"})
    result = perform(key)
    log.put(key, {"status": "succeeded", "result": result})
    return result
```

Important points:

- The key must be derived from the business action, such as `refund:A-10432:1999`, not generated randomly on each attempt. A random key defeats the purpose.
- **A `started` record without a result is the dangerous case.** Do not retry blindly. Reconcile first. If the state is still unknown, stop and escalate.
- Use an external idempotency key where the API supports one. Your log protects you between your own steps. The external key protects you when the request reached the provider but your response was lost.

## Sandboxing

Any tool that reads files, runs commands, or uses the network needs boundaries enforced in code. The prompt cannot be the boundary.

```python
from pathlib import Path


def safe_path(root: Path, requested: str) -> Path:
    """Resolve a path and refuse anything outside the sandbox root."""
    root = root.resolve()
    candidate = (root / requested).resolve()   # resolves ../ and symlinks
    if not candidate.is_relative_to(root):
        raise PermissionError("path escapes the sandbox")
    return candidate
```

Apply the same discipline to the other boundaries:

- **Commands:** use a fixed allowlist of commands and arguments, and run them without a shell. Never build a shell string from model output.
- **Network:** allow only the hosts the task needs. Block the rest at the network layer.
- **Resources:** set CPU, memory, and time limits on the sandbox process.
- **Writes:** write to a scratch copy first. Apply to the real target only after approval.
- **Audit:** log every command, file write, and network call with the run ID.

A subagent does not gain access to a sandbox by being called from a sandboxed agent. The permissions are the intersection, as in Chapter 20.

## Evaluating trajectories

An agent can produce a correct final answer through a path that was unsafe, wasteful, or lucky. Evaluate the **trajectory** (the sequence of decisions and tool calls) as well as the outcome.

```python
from dataclasses import dataclass, field


@dataclass
class Trajectory:
    case_id: str
    calls: list[tuple[str, dict]] = field(default_factory=list)  # (tool, arguments)
    steps: int = 0
    invalid_calls: int = 0      # unknown tool, bad arguments, or refused by policy
    final_outcome: str = ""     # "completed", "needs_approval", "failed", ...


@dataclass(frozen=True)
class CaseExpectation:
    case_id: str
    expected_outcome: str
    must_not_call: frozenset[str]
    max_steps: int


def score(traj: Trajectory, exp: CaseExpectation) -> dict:
    violations = [tool for tool, _ in traj.calls if tool in exp.must_not_call]
    return {
        "case_id": exp.case_id,
        "outcome_ok": traj.final_outcome == exp.expected_outcome,
        "forbidden_calls": violations,
        "within_steps": traj.steps <= exp.max_steps,
        "invalid_calls": traj.invalid_calls,
        "passed": (
            traj.final_outcome == exp.expected_outcome
            and not violations
            and traj.steps <= exp.max_steps
        ),
    }
```

A case passes only when the outcome is right **and** no forbidden tool was called **and** the run stayed within its step budget. A correct refund amount reached through a forbidden tool is a failure.

Useful trajectory metrics:

- Task success rate, by task type.
- Forbidden-call rate, which should be zero for every release gate.
- Invalid-call rate, which points to unclear tool descriptions.
- Steps per completed task, and its trend over releases.
- Recovery rate after tool errors.
- Human intervention rate: how often a person had to correct or finish the task.

### Multi-agent evaluation

For systems with subagents (Chapter 20), compare against a single-agent baseline on the same tasks. Measure whether each task went to the right specialist, whether delegated results were complete and supported, how often workers repeated each other's work, and whether the orchestrator handled disagreements correctly. Adopt the more complex design only when the measured gain justifies the added cost and risk.

## Observability across agents

A single user request can produce an orchestrator span, several subagent spans, many model calls, tool calls, and a wait for human approval. Record them as one trace, so an incident can be reconstructed.

```python
from opentelemetry import trace

tracer = trace.get_tracer("support-agent")


async def run_worker(name: str, contract_id: str):
    # asyncio.gather runs each coroutine in a copy of the current context,
    # so this span is a child of the orchestrator span.
    with tracer.start_as_current_span(f"worker {name}") as span:
        span.set_attribute("app.worker.name", name)
        span.set_attribute("app.contract.id", contract_id)
        ...  # run the subagent loop
        span.set_attribute("app.worker.status", "ok")


async def run_task(task_id: str):
    with tracer.start_as_current_span("agent task") as root:
        root.set_attribute("app.task.id", task_id)
        ...  # orchestrate workers, wait for approvals, verify
```

Record these attributes at each span:

- Run ID, parent span ID, and delegated task ID.
- Model and prompt versions.
- Tool name, duration, and result status.
- Approval decisions and the time spent waiting for them.
- Final outcome and cost.

Separate the latency of model generation, external tool calls, and waiting for a person. A run that took 40 minutes because an approver was on leave is not a performance problem.

The OpenTelemetry GenAI semantic conventions include names for agent and tool operations. They are in the Development stage, so pin the library versions and check the names before you build dashboards on them. Content capture is opt-in. Decide with your privacy and legal teams whether prompts and tool arguments may be stored, and for how long. *(Verify attribute names against the current release.)*

## Cost and coordination overhead

Each subagent duplicates context and makes its own calls. Parallel workers reduce elapsed time and can raise total spend. Measure:

- Cost per **successful** task, including failed attempts and human corrections.
- p50 and p95 completion time, measured end to end.
- Total tool calls per task.
- Failure rate by stage.

Do not optimize tokens alone. A design that spends fewer tokens and completes fewer tasks correctly is worse.

## Release process

### Before release

- Define the permitted tools, data boundaries, step and cost limits, approval gates, and failure behavior. Write them down.
- Build a trajectory evaluation set with normal, ambiguous, and adversarial cases. Include prompt injection in tool results and documents (Chapter 13).
- Test access denial, tool timeouts, partial completion, retries, and a process restart in the middle of a run.
- Confirm that every irreversible action has an approval path and an idempotency key.

### During rollout

- Release to a limited group first. Compare against the baseline on the same traffic.
- Watch the traces for unexpected actions, not only for errors. A run that succeeds by calling a surprising tool is a finding.
- Keep a disable switch that stops new runs without losing the state of runs in progress.
- Assign owners for prompts, tool contracts, workflows, and security policy. Each change has an owner and a history.

### After release

- Review incidents and difficult cases weekly. Add each one to the regression set.
- Rotate or revoke credentials that a run used, when the run ends unexpectedly.
- Track cost and reliability over time. Investigate any trend before you add features.

## Worked project: a software engineering assistant

Build the assistant in four iterations. Each one is a release candidate with its own gates.

1. **One bounded agent.** It reads repository files, proposes a patch, runs tests inside a sandbox, and reports its evidence. No write outside the sandbox.
2. **Durable state and an approval gate.** Checkpoints after each step. Applying a patch to the real repository requires approval, with the diff shown to the approver.
3. **Specialist reviewers.** A read-only security reviewer and a test-gap reviewer, each with a contract, structured output, and a failure status (Chapter 20).
4. **Comparison.** Run the single-agent and multi-agent configurations on the same 80 tasks. Report completion, verified defects found, false positives, cost, and duration. Ship the configuration that wins on your criteria, and keep the other one as a benchmark.

Choose orchestration libraries only when they remove concrete implementation work. Each dependency is a component you must secure, upgrade, and debug.

## Use it when

- The agent acts on systems people depend on, and you can state its limits.
- You can measure outcomes and trajectories before and after each change.

## Avoid it when

- You cannot approve, roll back, or disable the agent quickly.
- The actions are irreversible and no approval path exists.

## Trade-offs

Approvals add latency and human work. Durable execution adds storage and reconciliation logic. Sandboxes restrict what the agent can do, which limits some tasks. Trajectory evaluation costs more than output-only tests, and it catches problems the output tests miss.

## Common mistakes

1. **Random idempotency keys.** Every retry becomes a new action.
2. **Retrying an unknown state.** Reconcile first, and escalate when you cannot.
3. **Approving the summary, not the action.** The approver must see the exact arguments.
4. **Judging only the final answer.** A forbidden call that happened to succeed is still a failure.
5. **Shipping multi-agent designs without a baseline.** You cannot tell whether the complexity pays off.

## Key takeaway

A production agent is trustworthy when its worst action is bounded by code: approvals gate what matters, side effects happen once, the sandbox limits what can be touched, and every run can be traced and evaluated. A well-engineered single agent usually beats a poorly coordinated multi-agent system.

## Exercises

1. Write a test showing that `execute_once` does not call `perform` twice when the first call returned a result, and that it calls `reconcile` (not `perform`) when the log shows `started`.
2. Write a test for `safe_path` that rejects `../secret`, an absolute path outside the root, and a symlink that points outside the root.
3. Build the trajectory scorer for ten cases. Include one case that reaches the right outcome through a forbidden tool, and confirm that it fails.
4. Run an incident drill: a worker times out after the external system accepted its request. Walk through the log records, the reconciliation, and the final state. Write the runbook entry.

---

## Further reading

- Anthropic, "Building effective agents" (engineering blog). *(Verify URL and content before citing.)*
- Anthropic, "Effective context engineering for AI agents" (engineering blog). *(Verify before citing.)*
- Model Context Protocol specification, authorization section (Chapter 23).
- OpenTelemetry GenAI semantic conventions, agent and tool operations. *(Development status; check current release.)*
