---
title: "AI Security Beyond Agents"
part: X
level: advanced
reading_time: 24 min
reviewed: 2026-11
---

# 30. AI Security Beyond Agents

Chapter 13 covered prompt injection and least privilege for tool-using systems. This chapter covers the rest of the security surface of an AI feature: personal data, secrets, model and data supply chains, output handling, leakage of hidden instructions, cost attacks, and the trust boundary around every input that enters the system.

The trust boundary is not limited to autonomous agents. It surrounds user input, retrieved content, uploaded files, third-party models, generated output, and the logs that record all of them. Each boundary needs a control in code.

## The OWASP reference

The OWASP Top 10 for LLM Applications is the community reference for these risks. The 2026 edition was published in August 2026 and replaces the 2025 edition. Confirmed positions in the 2026 ranking are:

1. Prompt injection
2. Sensitive information disclosure
3. Excessive agency
4. Supply chain
5. Data and model poisoning

Use the official OWASP page for the full list and the mapping to controls before you cite entries in a threat model. Use this chapter as a set of controls you can implement, grouped by the boundary they protect.

## Threat model for an AI feature

Write down, for each feature:

| Question | Example answer |
|---|---|
| What data can the model see? | Customer name, order history, support notes |
| What untrusted content can enter? | Ticket text, uploaded PDFs, web pages |
| What can the output do? | Be shown to the agent, stored, sent to the customer |
| What can be exhausted? | Tokens, money, concurrency, storage |
| What must never leave the system? | Credentials, other tenants' data, hidden instructions |

The features that carry the highest risk combine private data, untrusted input, and an outbound channel. Remove one of the three, or add a control at each boundary.

## Personal data

Personal data can enter a model request, an embedding, a log, a cache, an evaluation dataset, or a trace. Each of those is a store with its own retention and access rules.

Minimize before you send. Include only the fields the task needs. Replace identifiers with pseudonyms when the model does not need the real value.

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class CustomerView:
    """The only customer fields that may enter a prompt for a support summary."""
    pseudonym: str          # for example "customer-7f3a", not the name
    plan: str
    open_tickets: int
    last_contact_days: int


def build_summary_input(view: CustomerView) -> str:
    return (
        f"customer: {view.pseudonym}\n"
        f"plan: {view.plan}\n"
        f"open tickets: {view.open_tickets}\n"
        f"days since last contact: {view.last_contact_days}"
    )
```

A type that exposes only the allowed fields is stronger than a filter applied later. A function that receives a `CustomerView` cannot accidentally read the email address.

Redaction is a second line of defense, not the first. Simple patterns catch some personal data and miss a lot:

```python
import re

EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE = re.compile(r"\+?\d[\d\s-]{7,}\d")


def redact_basic(text: str) -> str:
    """Illustrative only. Regular expressions miss names, addresses, and many ID formats."""
    text = EMAIL.sub("[EMAIL]", text)
    return PHONE.sub("[PHONE]", text)
```

For production, use a dedicated detection tool, test it on fixtures from your own data, and measure what it misses. Redacted text is still personal data if the remaining context identifies the person.

Set rules for each store:

- Prompts and responses: stored only when debugging requires it, for a short period, with restricted access.
- Traces: IDs and hashes by default. Content only under an explicit, time-limited policy.
- Evaluation datasets: anonymized, with the source documented.
- Caches: partitioned by tenant, with expiry that matches the source's retention.

## Secrets

Provider keys, database credentials, and tokens for downstream services belong in a secrets manager or in protected runtime configuration. They must not appear in prompts, in browser code, in logs, in evaluation fixtures, or in the release manifest (Chapter 15).

```python
import os


def require_secret(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        # Fail at startup, not on the first user request.
        raise RuntimeError(f"missing required secret: {name}")
    return value
```

Practical rules:

- Rotate keys on a schedule and after any suspected exposure.
- Give each service its own key, with the smallest scope that works.
- Check logs and traces for key patterns before you export them.
- Never ask the model to handle a credential. If the model must trigger an action that needs one, the backend uses the credential and the model receives only the result.

## Sensitive information disclosure

Models can reveal information that was in their context, including information the current user should not see. The defense is to keep such information out of the context in the first place.

Three controls:

1. **Authorization before retrieval.** Data the user may not read never enters the prompt (Chapters 16, 17, and 26).
2. **Scoped context.** Each request contains only the records for the authenticated principal.
3. **Output checks.** Scan the response for patterns that should never appear, such as credential formats or other customers' identifiers, and block or redact them.

```python
import re

BLOCKED_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9]{20,}"),       # example key format; adapt to your providers
    re.compile(r"\b\d{16}\b"),                 # card-number-like sequences
]


def output_leaks_secret(text: str) -> bool:
    return any(p.search(text) for p in BLOCKED_PATTERNS)
```

Output filtering is a backstop. It can miss a leak in a new format, and it can block a legitimate answer. Treat it as detection and log every block for review.

## System prompt leakage

Do not rely on the system prompt staying secret. Users can ask for it, and clever phrasing can reveal parts of it. The OWASP 2025 edition added system prompt leakage as a separate risk for this reason, and the 2026 edition broadens the scope to hidden context in general. *(Verify the current wording.)*

The rule is simple: **nothing sensitive goes into the system prompt.** Business logic, thresholds, and permissions belong in code. Credentials never appear in any prompt.

Canary tokens let you detect leakage. Place a random marker in the hidden context and check outputs for it. A canary is not a secret, and it does not prevent leakage. It tells you that leakage happened, so you can investigate.

```python
import secrets


def make_canary() -> str:
    return f"canary-{secrets.token_hex(8)}"


def leaked(output: str, canary: str) -> bool:
    return canary in output
```

Store the canary value with the request record, not in the prompt template, so it is not reused across requests.

## Supply chain

Every component you load is part of your trust boundary: model weights, adapters, tokenizers, embedding models, SDK versions, MCP servers, skills, and prompt templates from outside your team.

Controls:

- **Pin versions** of SDKs and libraries with a lockfile, and review upgrades.
- **Verify checksums** of any artifact you download before you load it.
- **Record provenance:** where each artifact came from, who approved it, and which release uses it.
- **Use trusted distributions** for MCP servers, and review their tool descriptions as code (Chapter 23).
- **Keep a bill of materials** for model artifacts and datasets. The OWASP guidance and the emerging ML-BOM practices describe the content. *(Verify the current formats before adopting one.)*

```python
import hashlib
from pathlib import Path


def verify_artifact(path: Path, expected_sha256: str) -> None:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            digest.update(block)
    if digest.hexdigest() != expected_sha256:
        raise ValueError(f"checksum mismatch for {path.name}; do not load")
```

A checksum proves that the file is the one you approved. It does not prove that the approved file is safe. Review what you approve.

## Data and model poisoning

Poisoning happens when attacker-controlled content enters the data that shapes the model's behavior: a document in the retrieval index, an example in a training set, a record in a memory store, or a result that later becomes a training label.

A retrieval index is an attack surface even when the model is untouched. A document planted in the index can rank highly for common questions and carry instructions or false facts.

Admission control for documents:

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class IngestionRecord:
    doc_id: str
    source: str
    approved_by: str | None
    sha256: str


def admit(record: IngestionRecord, allowed_sources: frozenset[str]) -> str:
    if record.source not in allowed_sources:
        return "quarantine"    # unknown source: hold it, do not index it
    if record.approved_by is None:
        return "review"        # known source, not yet reviewed
    return "index"
```

Apply the same discipline to training data (Chapter 28): provenance for each example, approval for each source, and a split by group. Monitor the index and the dataset for sudden changes, such as many new documents from one source or a spike in one term.

## Output handling

Model output is untrusted input to the next system. Treat it according to its destination:

| Destination | Control |
|---|---|
| HTML in a browser | Escape, or sanitize with a vetted library |
| Links | Allowlist schemes and hosts (Chapter 13) |
| SQL | Fixed, parameterized queries; the model chooses among them |
| Shell commands | No shell string built from output; fixed commands only |
| Code that will run | Sandbox, review, and approval before execution |
| Another model's prompt | Labeled as untrusted data |

The most common error is rendering model output as HTML because it "looks like" formatted text. Use a Markdown renderer with HTML disabled, or escape the output.

## Unbounded consumption

Attackers and bugs can both exhaust an AI feature: very long inputs, loops that call the model repeatedly, and many concurrent requests from one tenant. The result is slow responses for everyone and a large bill.

Controls:

- Limit input size before any model call.
- Set a maximum output length on every request.
- Give each tenant a budget for tokens or cost per period, enforced by the backend.
- Limit concurrency per tenant.
- Cap the number of steps in any loop (Chapter 11).

```python
from dataclasses import dataclass, field
from datetime import datetime, timezone

MAX_INPUT_CHARS = 20_000


@dataclass
class TenantBudget:
    tenant_id: str
    tokens_per_day: int
    used_today: int = 0
    day: str = field(default_factory=lambda: datetime.now(timezone.utc).date().isoformat())

    def reserve(self, estimated_tokens: int) -> bool:
        today = datetime.now(timezone.utc).date().isoformat()
        if today != self.day:
            self.day, self.used_today = today, 0
        if self.used_today + estimated_tokens > self.tokens_per_day:
            return False
        self.used_today += estimated_tokens
        return True


def admit_request(text: str, budget: TenantBudget) -> str:
    if len(text) > MAX_INPUT_CHARS:
        return "rejected: input too large"
    # Conservative estimate for planning only; use the provider's counter for billing.
    estimate = len(text) // 2
    if not budget.reserve(estimate):
        return "rejected: tenant budget exhausted"
    return "admitted"
```

*(The per-tenant limits are illustrative. Set them from your cost model. The estimate is deliberately conservative.)*

Reserve the budget before the call and reconcile it with the usage the API reports afterward. A request that fails after reservation should release the unused part. Stored budgets must be durable and shared across instances. An in-memory counter resets on every restart and does not protect a multi-instance deployment.

## Misinformation and overreliance

Users trust fluent answers. A security control that depends on a human noticing an error is weak. Design the interface so that:

- Evidence and sources are visible, and a user can open them.
- Uncertain or unsupported answers are labeled as such.
- High-impact decisions show a confirmation step with the facts behind them.
- The system says when it cannot answer, instead of guessing.

This is a security control as much as a product decision. A confident wrong answer that drives an action is an incident.

## Monitoring security events

Log the events that matter, with IDs rather than raw content:

- Admission rejections, by reason and tenant.
- Injection detections and blocked outputs.
- Canary hits.
- Permission denials and scope failures.
- Budget exhaustion and rate limiting.
- Checksum failures and quarantined documents.

Alert on rates and on changes, not only on single events. A sudden increase in one rejection reason is often the first sign of an attack or a broken release.

## Use it when

- Any feature handles personal data, credentials, untrusted content, or money.
- Any part of the system loads artifacts, documents, or code from outside your team.

## Avoid it when

- Never. Scale the controls to the impact. An internal summarizer over public documents needs fewer controls than a feature that moves money.

## Trade-offs

Minimization reduces what the model can use. Output filters can block legitimate answers. Budgets protect cost and can reject real users during peaks. Admission control slows the ingestion of new sources. Each control has a cost in capability or convenience, and you should record the choice.

## Common mistakes

1. **Secrets in the system prompt.** Assume every prompt can be extracted.
2. **Redaction as the only control.** Regular expressions miss most personal data.
3. **Indexing every uploaded file.** One planted document can shape many answers.
4. **Rendering model output as HTML.** It executes whatever the model writes.
5. **In-memory budgets.** They reset on restart and fail across instances.
6. **Trusting checksums as safety.** They prove identity, not safety.

## Key takeaway

Every boundary in an AI feature is a place where untrusted content enters or where sensitive content leaves. Minimize what enters, verify what loads, handle what the model produces as untrusted input, and bound what any one caller can consume.

## Exercises

1. Draw the trust boundaries of a feature in your product. Mark each place where personal data, credentials, or untrusted content crosses a boundary. Name the control at each one.
2. Build a fixture set of 30 texts containing personal data in different formats. Measure what `redact_basic` misses, and decide whether a dedicated tool is needed.
3. Write a test showing that a document from an unknown source is quarantined, and that a document from an approved source without review goes to review.
4. Implement the tenant budget with durable storage (for example, a database row updated in a transaction). Test two concurrent reservations near the limit, and confirm that the total never exceeds the budget.
5. Plant a canary in a test system prompt and try five extraction attempts. Record which attempts leaked the canary, and decide whether the leak is acceptable for your product.

---

## Further reading

- OWASP Top 10 for LLM Applications, 2026 edition. *(Verify the current list.)*
- OWASP Top 10 for Agentic Applications, for risks in autonomous systems.
- Your provider's data-handling and retention documentation.
