---
title: "AI Application Architecture"
part: VIII
level: advanced
reading_time: 26 min
reviewed: 2026-11
---

# 26. AI Application Architecture

An AI feature is a normal application with one probabilistic component. It has a frontend, an authenticated backend, data stores, background jobs, integrations, and monitoring. The model adds non-determinism, cost that varies with input size, and a new class of failures. The architecture must place each responsibility where it can be enforced.

This chapter brings together the earlier parts into one design. It shows where each control belongs, how requests and background work flow, and how to decide between code, workflows, and agents at each point.

## The main principle

**Each responsibility belongs to the component that can enforce it.**

| Responsibility | Owned by | Why |
|---|---|---|
| Identity and tenant | Backend, from the verified session | The model cannot verify identity |
| Authorization of data | Backend and retrieval layer | Must run before data reaches the prompt |
| Provider keys and quotas | Backend, never the browser | Keys must not leave the server |
| Business rules and money | Deterministic code | Testable, auditable, not probabilistic |
| Language understanding and drafting | Model | Where language flexibility adds value |
| Validation of output | Backend, against the data contract | Model output is untrusted |
| Side effects | Backend, behind approval and idempotency | Irreversible actions need controls |
| Evidence and tracing | Platform, with privacy rules | Needed to diagnose and to audit |

When a design puts a control inside the prompt, move it out. A prompt can request a behavior. Only code can prevent an action.

## Components

A typical architecture has these parts:

- **Frontend:** renders the interface, streams partial output, and shows errors and progress. It holds no provider credentials and makes no authorization decisions.
- **Backend for frontend (BFF) or API:** authenticates the user, applies rate limits, and exposes application endpoints. It is the only component that talks to the model provider.
- **AI orchestration service:** assembles context, calls the model, runs validation, and decides the next step. It can be a module inside the backend in a small product.
- **Retrieval and tools:** search over authorized data and calls to internal systems, each enforcing its own permissions (Chapters 16, 17, and 22).
- **Data stores:** relational database for application state, object storage for documents, and indexes for search.
- **Queue and workers:** process long or bulk work outside the user's request.
- **Observability:** traces, metrics, and logs with privacy rules.

Keep these as logical components. A product with a small team can implement several of them in one deployable service. Split them when a measured need appears, not in advance.

## The request lifecycle

Consider a user asking an assistant to summarize a customer account.

```text
UI -> BFF: POST /accounts/{id}/summary (session cookie)
BFF: authenticate session -> principal (user, tenant, scopes)
BFF: authorize: principal may read account {id}?          (deny -> 403, stop)
BFF: retrieve only the records this principal may read   (retrieval enforces tenant)
BFF: assemble prompt (instructions + data labeled as untrusted)
BFF -> model gateway: call with policy (model, limits, timeout)
gateway -> model API -> response (text, stop reason, usage)
BFF: validate output against the contract (shape, rules, evidence)
BFF -> UI: stream or return the validated answer, with citations and status
BFF: record trace (IDs, versions, latency, tokens, outcome)
```

Three rules define this flow:

1. **Authorization happens before retrieval.** A record the user may not read must never enter the prompt, even if it would improve the answer.
2. **The gateway is the only path to the model.** Every call goes through one place that applies timeouts, limits, and logging.
3. **Output is validated before anyone sees it or acts on it.** A failed validation becomes a clear status, not a partial answer.

## The model gateway

A gateway wraps the provider SDK behind an interface your domain code depends on. Domain code receives a plain result object. It never receives SDK types, and it never sets timeouts or limits itself. Those belong in one place, so they can be reviewed and changed together.

```python
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class CallPolicy:
    model: str
    max_output_tokens: int
    timeout_seconds: float
    max_retries: int
    prompt_name: str
    prompt_version: str


@dataclass(frozen=True)
class Completion:
    text: str
    stop_reason: str
    input_tokens: int
    output_tokens: int


class OutputTruncated(Exception):
    pass


class ModelPort(Protocol):
    def complete(self, system: str, user_text: str, policy: CallPolicy) -> Completion: ...
```

The production adapter implements this port with the SDK:

```python
import anthropic


class AnthropicGateway:
    def __init__(self, client: anthropic.Anthropic) -> None:
        self._client = client

    def complete(self, system: str, user_text: str, policy: CallPolicy) -> Completion:
        client = self._client.with_options(
            timeout=policy.timeout_seconds,
            max_retries=policy.max_retries,
        )
        response = client.messages.create(
            model=policy.model,
            max_tokens=policy.max_output_tokens,
            system=system,
            messages=[{"role": "user", "content": user_text}],
        )
        if response.stop_reason == "max_tokens":
            raise OutputTruncated("output was cut off; do not treat it as complete")

        text = "".join(block.text for block in response.content if block.type == "text")
        return Completion(
            text=text,
            stop_reason=response.stop_reason,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )
```

*(Verify `with_options` and the exception names in the SDK documentation for the version you pin.)*

For tests, a fake implements the same port and returns scripted replies. Domain code can then be tested without the network:

```python
class FakeModel:
    def __init__(self, replies: list[str]) -> None:
        self._replies = list(replies)

    def complete(self, system: str, user_text: str, policy: CallPolicy) -> Completion:
        return Completion(self._replies.pop(0), "end_turn", 0, 0)
```

A gateway can also be a separate product or service. Gateways help when several products share one provider account, quotas, and logging. Before you adopt one, check what it does to provider-specific features such as caching, structured outputs, and thinking. A generic interface that hides those features may cost you capability.

## Context assembly and data ownership

The model sees only what the request contains. A context builder assembles it from four kinds of input, each with a clear label:

- **Trusted instructions:** the system prompt, owned by your team and versioned.
- **Verified business data:** values from your systems of record, such as balances and statuses.
- **Retrieved passages:** text from authorized documents, labeled as data (Chapter 13).
- **The user's current input:** labeled as the user's request, never as instructions to the system.

Keep these separate. Do not place retrieved text in the system prompt, where it gains instruction-level trust.

Store source IDs and document versions for everything you put in the context. A citation is useful only if it can be traced back to the exact version the model saw.

RAG is not a replacement for authoritative data. If the answer depends on an exact balance, an order status, or a permission, query the system of record. Retrieval finds text. A database returns facts.

## Conversation state

Most model APIs do not keep your application's state. Store messages, summaries, references, and task status in your own data layer, with retention rules. On each turn, select the history the user needs, not the full history.

Distinguish three lifetimes:

| Lifetime | Example | Where it lives |
|---|---|---|
| One request | The retrieved passages for this question | In memory, discarded after the response |
| One session | The last product comparison the user made | Session store, with expiry |
| Durable | A support ticket and its approval status | Database, with audit history |

Never treat the model's text as the only record of a completed transaction. "The refund was issued" must come from the payment system's response, stored by your code.

## Synchronous, queued, and background work

Choose the execution model by the user's expectations:

| Work | Model | Why |
|---|---|---|
| Short interactive answer | Synchronous request with streaming | The user is waiting |
| Document ingestion, bulk extraction | Queue and workers, with job status | Long, retryable, must not block users |
| Nightly classification | Batch processing | Latency is not important; cost is |
| Long research task | Job with progress and approval points | Must survive restarts and waits |

A background job needs an identifier, an owner, a persisted state, a retry limit, and a terminal status:

```python
from dataclasses import dataclass, field
from enum import Enum


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


ALLOWED = {
    JobStatus.QUEUED: {JobStatus.RUNNING},
    JobStatus.RUNNING: {JobStatus.SUCCEEDED, JobStatus.FAILED, JobStatus.QUEUED},
    JobStatus.SUCCEEDED: set(),
    JobStatus.FAILED: set(),
}


@dataclass
class Job:
    job_id: str
    tenant_id: str
    kind: str
    idempotency_key: str
    status: JobStatus = JobStatus.QUEUED
    attempts: int = 0
    max_attempts: int = 3
    result_ref: str | None = None
    error_code: str | None = None
    history: list[str] = field(default_factory=list)


def transition(job: Job, new: JobStatus) -> None:
    if new not in ALLOWED[job.status]:
        raise ValueError(f"illegal transition {job.status.value} -> {new.value}")
    job.history.append(f"{job.status.value}->{new.value}")
    job.status = new


def fail_or_requeue(job: Job, error_code: str, transient: bool) -> None:
    job.error_code = error_code
    if transient and job.attempts < job.max_attempts:
        transition(job, JobStatus.QUEUED)     # retry later, with backoff
    else:
        transition(job, JobStatus.FAILED)     # terminal: visible to the user and operators
```

Three properties make this safe:

- **Explicit transitions.** An illegal move, such as going from succeeded back to running, raises an error.
- **Bounded retries.** A transient failure is retried a limited number of times, then becomes a visible failure.
- **An idempotency key.** A duplicate submission returns the existing job instead of creating a second one. Derive the key from the business action, as in Chapter 21.

Store the result in a location the job can point to, and let the user fetch it. Do not return large results through the job status.

## Streaming

Streaming improves perceived speed for long answers. It also creates partial states that the UI must handle honestly:

- Show partial text as provisional.
- Show a final state only when the response completes and passes validation.
- Show an error state, with what the user can do next, when the stream fails.
- Let the user cancel, and release the connection.

A streamed answer that fails validation after it was displayed must be marked as failed. The user must see that the displayed text was not verified.

## Choosing code, a workflow, or an agent

Make the decision for each step of a feature, not once for the whole product:

| Question | If yes | If no |
|---|---|---|
| Are the rules known and testable? | Deterministic code | Consider a model for interpretation |
| Is the sequence of steps fixed? | Workflow | Consider an agent, with limits |
| Does one step need language understanding? | Model call inside the workflow | Plain code |
| Can the next action be chosen only at runtime? | Agent, with budgets and approvals | Workflow |
| Is the action irreversible? | Approval gate before execution | Normal execution |

The sequence for a refund might be: a model extracts the reason (language), code checks eligibility (rules), a person approves above a threshold (approval), and code issues the refund (side effect). Only the first step uses a model.

Use an agent only when the next step genuinely depends on what the agent discovers. Chapter 9 covers this decision in detail.

## Observability

Trace each stage of a request: authentication, authorization, retrieval, prompt assembly, the provider call, validation, and any tool execution. Record:

- Request ID, tenant, and user, as IDs or hashes, not raw personal data.
- Model and prompt versions, and the index version used for retrieval.
- Latency for each stage, and token usage.
- Stop reason, validation result, and error category.
- Cost, and the outcome for each task.

Avoid logging raw prompts and responses by default. When content capture is needed for debugging, make it opt-in, time-limited, and access-controlled, under a written data policy.

Measure quality as well as operations. Infrastructure dashboards can be green while answers degrade. Keep a fixed evaluation suite and run it against the active configuration on a schedule (Chapter 27).

## Failure modes

| Failure | Cause | Design response |
|---|---|---|
| Browser calls the model directly | Credentials exposed | All calls through the backend |
| Cross-tenant data in a prompt | Authorization applied after retrieval | Filter before retrieval, test it |
| Unvalidated output written to a record | No contract check | Validate before any write |
| Duplicate side effects | Retries without idempotency | Idempotency keys, job state |
| Context overflow | Whole documents sent to the model | Retrieval, packing, budgets |
| Retry storm during an outage | No backoff, no breaker | Backoff with jitter, circuit breaker (Chapter 14) |
| Silent quality drop after an upgrade | No regression gate | Release manifest and eval gate (Chapter 15) |
| Slow ingestion blocks answers | Ingestion in the request path | Separate ingestion path and queue |

## Reference architecture

Interactive path:

```text
Web or mobile UI
  -> API / BFF (auth, rate limits, tenant)
  -> authorization check
  -> context builder (retrieval, verified data)
  -> model gateway (policy, timeouts, logging)
  -> model provider
  -> validation (contract, rules, evidence)
  -> streamed or complete response with status
```

Ingestion path:

```text
Upload API
  -> object storage (original file, checksum)
  -> queue
  -> worker (parse, clean, chunk, index)
  -> document metadata and version status
```

Keep the two paths separate. A slow PDF import must not block a user's question. A failed import must not leave partial content in the live index.

## A concrete slice

A product documentation app accepts PDF uploads and answers questions with citations. Its API could expose:

- `POST /documents`: store the file, create an ingestion job, return the job ID.
- `GET /documents/{id}/status`: return the job state and index version.
- `POST /questions`: authenticate, authorize by tenant, retrieve, call the gateway, validate, return the answer and its citations.

When a PDF cannot be parsed, mark the job failed with a useful error. Do not index incomplete content quietly. When retrieval finds no authorized passage, the assistant says it cannot answer from the available documents. When the provider times out, return a controlled failure, and retry only when the operation is safe to repeat.

## Decision guide

| Need | Start with |
|---|---|
| Short classification or rewrite | Synchronous endpoint with validation |
| Bulk document extraction | Queue and worker with job state |
| Repeatable mix of AI and non-AI steps | Workflow with checkpoints |
| Open-ended task where tool choice varies | Agent with narrow permissions and limits |
| Several products sharing one provider account | Shared gateway |

Start with the simplest architecture that meets the quality, latency, security, and scale requirements. A modular monolith is often easier to deploy, test, and operate than several services. Add a separate service, a gateway product, a vector database, or an event system when a measured need justifies it.

## Use it when

- You are designing a product feature, not a single model call.
- Several teams or products will share the same components.

## Avoid it when

- You are building a prototype with one endpoint. Keep the design simple, but keep the boundaries: the gateway, the validation, and the authorization order.

## Trade-offs

Synchronous calls are simple and can hit request timeouts. Asynchronous jobs are resilient and need state tracking. Streaming feels faster and adds partial-state handling. More context may improve coverage and raises cost. A gateway centralizes control and can hide provider features. Measure real workloads before you optimize any of these.

## Common mistakes

1. **Putting authorization in the prompt.** The model can be persuaded. The backend must refuse.
2. **Calling the model from the browser.** Keys and quotas leave your control.
3. **Passing SDK types into domain code.** Changing providers then means rewriting the domain.
4. **Ingestion in the request path.** One large file slows every user.
5. **Treating the model's text as the record.** The system of record must confirm each action.

## Key takeaway

An AI feature needs the same architectural boundaries as any conventional application, plus evaluation of behavior that varies from one call to the next. Place each control where it can be enforced, and keep the model's output on the untrusted side of every boundary.

## Exercises

1. Draw the interactive and ingestion paths for a feature in your product. Mark which component owns authentication, tenant isolation, validation, retries, and approvals.
2. Implement the `FakeModel` and a domain function that uses `ModelPort`. Write tests for a successful answer, a truncated answer, and a timeout. Confirm that domain code never imports the SDK.
3. Write tests for the job state machine: an illegal transition raises, a transient failure requeues until `max_attempts`, and a terminal failure is visible.
4. Design a cross-tenant negative test for your retrieval path. Write it before implementing the path, then make it pass.

---

## Further reading

- Anthropic, "Building effective agents" (engineering blog). *(Verify before citing.)*
- OWASP Top 10 for LLM Applications 2026. *(Verify the current list.)*
- Your identity provider's documentation for session and token handling.
