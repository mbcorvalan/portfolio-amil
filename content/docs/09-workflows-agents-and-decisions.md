---
title: "Workflows, Agents, and Decision-Making"
part: III
level: intermediate-advanced
reading_time: 16 min
reviewed: 2026-11
---

# 9. Workflows, Agents, and Decision-Making

Most AI features fall into one of three categories:

| Approach | Who decides the sequence of steps? | Typical use |
|---|---|---|
| **Deterministic code** | Your code | Known rules and transformations |
| **Workflow** | Your code. The model performs some steps. | Fixed process with language interpretation |
| **Agent** | The model, within limits you set | Open-ended tasks where the next step depends on what was found |

A **workflow** follows a path you wrote. The model may classify, extract, or draft, but it does not choose the overall sequence. An **agent** is a loop in which the model chooses the next action, sees the result, and continues until the task is done or a limit is reached.

The question is not "which approach is more advanced?" The question is "which approach is the simplest one that meets the requirements?"

## Example: refund handling

A refund workflow always does the same steps: extract the order and the reason, check eligibility against policy, request approval when the amount is high, and then issue the refund. The sequence is fixed. The model helps only with reading the customer's message. Policy and money movement stay in code.

An IT helpdesk agent handling "I cannot access the shared drive" must decide what to check. It might verify account status, group membership, or VPN state. The order depends on what each check reveals. That is a case where an agent makes sense.

## Decision table

| Question | If yes | If no |
|---|---|---|
| Are the steps and their order known in advance? | Use code or a workflow | Consider an agent |
| Does a step need to understand free text? | Add an LLM call inside the step | Use deterministic code |
| Can the number of tool calls be bounded? | Agent is possible | Redesign before building |
| Is every side effect reversible or approvable? | Agent with approval gates is possible | Keep side effects in a workflow with explicit checks |
| Can you measure success for the task? | Build the eval first | Do not build an agent yet |

## Trade-offs

| | Workflow | Agent |
|---|---|---|
| Cost | Predictable | Variable (more calls, longer runs) |
| Latency | Predictable | Variable |
| Testing | Straightforward | Requires trajectory evaluation |
| Flexibility | Limited to designed paths | Handles unplanned paths |
| Security exposure | Smaller | Larger (more tools, more choices) |

Flexibility is valuable only when the task requires it. An agent that handles cases you did not anticipate also takes actions you did not anticipate.

## A deterministic refund workflow

The model extracts the refund reason. Code decides everything else.

```python
from dataclasses import dataclass
from enum import Enum

import anthropic
from pydantic import BaseModel

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # check the models page before shipping
APPROVAL_THRESHOLD_CENTS = 20_000  # illustrative policy value


class Reason(str, Enum):
    DAMAGED = "damaged"
    NOT_RECEIVED = "not_received"
    WRONG_ITEM = "wrong_item"
    OTHER = "other"


class ExtractedReason(BaseModel):
    reason: Reason


@dataclass(frozen=True)
class RefundRequest:
    order_id: str
    amount_cents: int
    customer_message: str


def extract_reason(message: str) -> Reason:
    """The only LLM step. Its output is constrained to a closed set."""
    response = client.messages.create(
        model=MODEL,
        max_tokens=50,
        system="Classify the refund reason. Choose the closest category.",
        messages=[{"role": "user", "content": message}],
        output_config={"format": {
            "type": "json_schema",
            "schema": {
                "type": "object",
                "properties": {"reason": {"type": "string", "enum": [r.value for r in Reason]}},
                "required": ["reason"],
                "additionalProperties": False,
            },
        }},
    )
    return ExtractedReason.model_validate_json(response.content[0].text).reason


def check_eligibility(req: RefundRequest, days_since_delivery: int) -> bool:
    """Deterministic policy. Never delegated to the model."""
    return days_since_delivery <= 30 and req.amount_cents > 0


def request_approval(req: RefundRequest) -> bool:
    """Placeholder for a human approval queue. Returns True only after a person approves."""
    raise NotImplementedError("Route to the approval queue and return the decision later.")


def issue_refund(req: RefundRequest, idempotency_key: str) -> str:
    """Placeholder for the payment API. The key makes retries safe."""
    return f"refund-{idempotency_key}"


def handle_refund(req: RefundRequest, days_since_delivery: int) -> str:
    reason = extract_reason(req.customer_message)  # step 1: language -> category

    if not check_eligibility(req, days_since_delivery):  # step 2: policy in code
        return f"rejected: not eligible (reason={reason.value})"

    if req.amount_cents > APPROVAL_THRESHOLD_CENTS:  # step 3: approval gate
        if not request_approval(req):
            return "pending: awaiting human approval"

    key = f"{req.order_id}-{req.amount_cents}"  # step 4: idempotent side effect
    return issue_refund(req, idempotency_key=key)
```

Points to notice:

- The model never decides eligibility or approves money movement.
- The idempotency key makes a retried request return the same refund instead of creating a second one.
- Each step can be tested alone. The LLM step can be covered with the evals from Chapter 6.

## Use it when

- The process is known and repeatable.
- Language understanding is needed inside one or more steps.

## Avoid it when

- The steps are plain logic. Use code.
- The steps vary by case in ways you cannot enumerate. Consider an agent, with limits.

## Common mistake

Building an agent for a process that is actually a workflow. You pay for variability you do not need, and you lose predictability you do need.

## Key takeaway

Start with the simplest architecture that meets the requirements. Agentic behavior is a trade-off, not a sign of maturity.

## Exercises

1. Write a decision table for three features in your current product. For each, justify the choice.
2. Take the refund workflow. Add a unit test for each branch: rejected, pending, and issued. Use a fake `request_approval`.
