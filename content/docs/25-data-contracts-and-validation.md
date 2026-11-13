---
title: "Data Contracts and Validation"
part: VIII
level: intermediate-advanced
reading_time: 22 min
reviewed: 2026-11
---

# 25. Data Contracts and Validation

Chapter 4 showed how to ask a model for a JSON response and validate its shape. This chapter goes further. A **data contract** defines what your system accepts, stores, and sends onward. It covers business rules, evidence, unknown values, versions, and failure categories. The model proposes data. The contract decides whether that data can be used.

The rule from earlier chapters applies again: the model is not a source of truth. Every field it produces is a claim, and every claim needs a check.

## Why a schema is not enough

A schema can confirm that a field is a string, an enum, or an integer. It cannot confirm that:

- The total equals the sum of the line items.
- The extracted value appears in the source document.
- The currency is one your system supports.
- The date falls within the contract's effective period.
- An unknown value was marked as unknown, not guessed.

Compare two outputs that both pass a schema:

```json
{"total": "1200.00", "currency": "USD", "line_items": [{"amount": "500.00"}, {"amount": "500.00"}]}
{"total": "1200.00", "currency": "USD", "line_items": [{"amount": "500.00"}, {"amount": "300.00"}]}
```

The first is consistent. The second is valid JSON that the schema accepts, and it is wrong. A data contract catches it.

## Four layers of checking

Organize validation in layers, from cheapest to most expensive:

| Layer | Question | Example |
|---|---|---|
| Shape | Does the output parse and match the types? | Required fields, enum values |
| Business rules | Does the data make sense for this domain? | Totals add up; dates are in order |
| Evidence | Is each claim supported by the source? | Quoted text appears in the document |
| Policy | Is the data allowed to be used this way? | Currency is supported; tenant matches |

Run the cheap layers first. Stop at the first failure that makes the rest meaningless.

## The contract, as code

This example uses an invoice extraction task. The contract specifies what each field means, how money is represented, how unknown values are handled, and how each claim links to its source.

Money uses integer minor units (for example, cents). Floating-point numbers are not suitable for money: their rounding errors accumulate in sums.

```python
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    ARS = "ARS"


class Evidence(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_id: str
    quote: str = Field(min_length=1, max_length=300)  # the exact text the claim is based on


class LineItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1, max_length=200)
    amount_minor: int = Field(ge=0)                  # integer minor units, never float
    evidence: list[Evidence] = Field(min_length=1)   # every line item needs a source


class Invoice(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["invoice.v2"]
    invoice_number: str | None                       # None means "not stated", never a guess
    currency: Currency | None
    total_minor: int | None = Field(default=None, ge=0)
    line_items: list[LineItem]
```

Points to notice:

- `extra="forbid"` rejects fields the contract does not define. A model that adds a helpful extra field should not silently change your data.
- `invoice_number: str | None` makes unknown values explicit. The prompt must say what to return when the document does not state a value.
- `schema_version` makes contract changes visible in the data and in logs.
- Every line item must carry evidence. A line item without a source is an unsupported claim by definition.

## Business rules

Business rules live in code, not in the prompt. They are deterministic and testable.

```python
class BusinessRuleError(Exception):
    pass


def check_totals(invoice: Invoice) -> None:
    if invoice.total_minor is None:
        return  # nothing to compare; the review layer decides whether that is acceptable
    computed = sum(item.amount_minor for item in invoice.line_items)
    if computed != invoice.total_minor:
        raise BusinessRuleError(
            f"line items sum to {computed}, but total is {invoice.total_minor}"
        )
```

A rule that depends on the source, such as "the currency must match the document header," belongs in the evidence layer. A rule that depends only on your domain, such as "the currency must be supported," belongs here.

## Evidence checks

A quote is useful only if it actually appears in the source. Check that the cited source exists and that the quote is present in it.

```python
class EvidenceError(Exception):
    pass


def check_evidence(invoice: Invoice, sources: dict[str, str]) -> None:
    problems = []
    for index, item in enumerate(invoice.line_items):
        for ev in item.evidence:
            text = sources.get(ev.source_id)
            if text is None:
                problems.append(f"line {index}: unknown source {ev.source_id}")
            elif ev.quote not in text:
                problems.append(f"line {index}: quote not found in {ev.source_id}")
    if problems:
        raise EvidenceError("; ".join(problems))
```

This check proves that the quote exists. It does not prove that the quote supports the claim. A quote can be real and irrelevant. Measure that separately with a rubric or human review (Chapter 6).

Exact matching is strict. OCR errors, whitespace differences, and Unicode normalization can make a correct quote fail. Normalize both sides before comparing, and document what normalization you apply.

## Policy checks

Policy checks answer whether the data may be used in this context. They include tenant matching, supported currencies, and retention rules.

```python
def check_policy(invoice: Invoice, tenant_id: str, document_tenant: str) -> None:
    if tenant_id != document_tenant:
        raise PermissionError("document belongs to another tenant")
    if invoice.currency is None:
        raise BusinessRuleError("currency is required for posting")
```

Policy checks should run before the data is stored or sent to any downstream system. They are part of authorization, not validation of content.

## Failure categories

When a step fails, the category decides what happens next. Treat the categories as part of the contract, and log them.

| Category | Meaning | Action |
|---|---|---|
| Transient | The call failed for a reason that may pass: timeout, rate limit, server error | Retry with backoff (Chapter 14) |
| Malformed | The output does not parse or does not match the shape | One repair attempt with the error message, then route to review |
| Unsupported | The shape is valid, but a claim lacks evidence | Route to review; do not store as verified |
| Rejected | A business or policy rule failed | Stop; report the rule that failed |

```python
from enum import Enum

import anthropic
from pydantic import ValidationError


class FailureKind(str, Enum):
    TRANSIENT = "transient"
    MALFORMED = "malformed"
    UNSUPPORTED = "unsupported"
    REJECTED = "rejected"


def classify(error: Exception) -> FailureKind:
    transient = (
        TimeoutError,
        anthropic.APIConnectionError,   # includes timeouts
        anthropic.RateLimitError,
        anthropic.InternalServerError,
    )
    if isinstance(error, transient):
        return FailureKind.TRANSIENT
    if isinstance(error, ValidationError):
        return FailureKind.MALFORMED
    if isinstance(error, EvidenceError):
        return FailureKind.UNSUPPORTED
    return FailureKind.REJECTED
```

Verify the SDK's exception class names in its current documentation before you rely on them.

Do not retry every failure. A malformed output may succeed on a second attempt, but an unsupported claim will likely repeat. A rejected invoice should not be sent back to the model at all.

## Putting the layers together

```python
import json


def validate_extraction(raw_text: str, sources: dict[str, str], tenant_id: str, document_tenant: str) -> Invoice:
    # Layer 1: shape
    invoice = Invoice.model_validate_json(raw_text)
    # Layer 2: business rules
    check_totals(invoice)
    # Layer 3: evidence
    check_evidence(invoice, sources)
    # Layer 4: policy
    check_policy(invoice, tenant_id, document_tenant)
    return invoice
```

Each layer raises a different exception, so the caller can classify the failure. A result that passes all four layers can be stored as extracted data. It still needs human review if the stakes are high.

## Unknown values

Models tend to fill gaps. An invoice without a stated currency may be assigned USD, because it is the most common value in the training data. That is a guess presented as data.

Make unknown values explicit in three places:

1. **The schema:** allow `null` for fields that may be absent.
2. **The prompt:** state that a missing value must be returned as null, and that inference is not allowed.
3. **The tests:** include a document with missing fields and check that the output is null.

A contract that does not allow null forces the model to invent values. Design for absence.

## Contract versioning

Contracts change. A new field, a renamed enum, or a stricter rule can break every consumer. Handle changes this way:

- Put the version in the data (`schema_version`), so every stored record says which contract produced it.
- Add fields as optional first. Remove fields only after consumers have migrated.
- Keep the parser for the previous version until no records need it.
- Run the contract tests for every version you still accept.

```python
from typing import Union

from pydantic import TypeAdapter

_registry = TypeAdapter(Union[Invoice])  # add InvoiceV3 here when it exists


def parse_any(raw_text: str):
    data = json.loads(raw_text)
    version = data.get("schema_version")
    if version == "invoice.v2":
        return Invoice.model_validate(data)
    raise ValueError(f"unsupported contract version: {version}")
```

## Contract tests

Test the contract with fixtures, not only with live model calls. Fixtures are fast, deterministic, and cover the cases that matter.

```python
import pytest


def valid_payload() -> dict:
    return {
        "schema_version": "invoice.v2",
        "invoice_number": "INV-001",
        "currency": "USD",
        "total_minor": 100000,
        "line_items": [
            {
                "description": "Consulting",
                "amount_minor": 100000,
                "evidence": [{"source_id": "doc-1", "quote": "Consulting: 1000.00"}],
            }
        ],
    }


def test_valid_invoice_passes():
    Invoice.model_validate(valid_payload())


def test_unknown_field_is_rejected():
    payload = valid_payload()
    payload["discount"] = 10
    with pytest.raises(ValidationError):
        Invoice.model_validate(payload)


def test_missing_invoice_number_is_null_not_guessed():
    payload = valid_payload()
    payload["invoice_number"] = None
    Invoice.model_validate(payload)  # allowed: the document did not state it


def test_total_mismatch_is_a_business_error():
    payload = valid_payload()
    payload["total_minor"] = 99999
    invoice = Invoice.model_validate(payload)
    with pytest.raises(BusinessRuleError):
        check_totals(invoice)


def test_quote_missing_from_source_is_unsupported():
    invoice = Invoice.model_validate(valid_payload())
    with pytest.raises(EvidenceError):
        check_evidence(invoice, {"doc-1": "Different text"})


def test_truncated_output_is_malformed():
    truncated = json.dumps(valid_payload())[:-20]
    with pytest.raises(ValidationError):
        Invoice.model_validate_json(truncated)
```

Include at least these fixtures: a complete valid record, a record with missing optional values, an unknown field, a total mismatch, a quote absent from its source, a truncated output, and a record from another tenant.

## Use it when

- Output is stored, billed, sent to another system, or shown to a decision-maker.
- Wrong data has a cost that someone must pay.

## Avoid it when

- The output is a draft that a person reads and edits, and nothing downstream depends on its structure. A lighter check is enough.

## Trade-offs

A full contract adds code, tests, and maintenance. It also converts silent errors into visible failures. Strict rules reject some correct outputs, so you need review queues and a way to measure how often valid data is rejected. A high rejection rate can mean a bad contract, not bad model output.

## Common mistakes

1. **Using floats for money.** Use integer minor units.
2. **Allowing no nulls.** The model will invent values to satisfy the contract.
3. **Accepting unsupported claims.** A quote check is cheap. Skip it and the data is unverified.
4. **Retrying unsupported outputs.** They usually fail the same way. Route them to review.
5. **Changing a contract without a version.** Consumers break silently.

## Key takeaway

A data contract turns a model's output into data your system can trust, or into a clearly labeled failure. The schema checks the shape. The rules check the meaning. The evidence checks the source. The policy checks the permission.

## Exercises

1. Write the contract for a different document type in your domain. Include at least one enum, one nullable field, one money field, and one evidence-linked list.
2. Write five fixture tests, including one truncated output and one record with a quote that differs only by whitespace. Decide how your normalization should treat the second case, and implement it.
3. Measure the rejection rate of your contract on 50 real documents, grouped by failure category. Decide whether each category is a model problem, a contract problem, or a document problem.
