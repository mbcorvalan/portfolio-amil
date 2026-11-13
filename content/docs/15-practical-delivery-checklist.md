---
title: "A Practical Delivery Checklist"
part: IV
level: intermediate-advanced
reading_time: 14 min
reviewed: 2026-11
---

# 15. A Practical Delivery Checklist

This chapter ties Part IV together. It gives you a checklist for each phase of an AI feature, a release manifest that records everything a release depends on, and a worked architecture you can adapt.

## Before building

- [ ] The business task is written down, with the user, the data source, and the expected output.
- [ ] You know what a failure looks like, and who notices it.
- [ ] You have chosen code, a single model call, a workflow, or an agent, with a reason (Chapter 9).
- [ ] Access boundaries are defined: which data each actor can read and write.
- [ ] Irreversible actions are listed, with the approval that each one needs.
- [ ] You have a privacy review scheduled, and a retention policy drafted.

## Before releasing

- [ ] An evaluation set exists, with realistic, ambiguous, and adversarial cases (Chapters 6 and 13).
- [ ] Every structured output is validated in code (Chapter 4).
- [ ] Tests cover empty data, malformed tool arguments, API failures, timeouts, and injection attempts.
- [ ] Tool permissions follow least privilege, and handlers check scopes (Chapter 13).
- [ ] Tracing is enabled, with a correlation ID per request (Chapter 7).
- [ ] Rate limits, timeouts, and retry policy are set (Chapter 14).
- [ ] There is a user-facing fallback for each failure state.
- [ ] Cost per successful task has a measured baseline.

## After releasing

- [ ] Quality, latency, cost, and incidents are on a dashboard with owners.
- [ ] Failed cases are reviewed weekly and added to the regression set.
- [ ] Prompts, tool descriptions, and schemas are versioned, with a change history.
- [ ] Provider model changes and deprecations are tracked, and each change goes through the eval gate.
- [ ] A rollback path exists and has been tested.

## The release manifest

A release is more than a code commit. Record every input that changes the behavior.

```yaml
release: support-copilot-1.4.0
date: 2026-11-12
model: claude-sonnet-5-5          # exact ID from the models page
prompts:
  triage: v7
  answer: v4
tool_schemas: v3
retrieval:
  index_build: 2026-11-10T02:00Z
  embedding_model: <provider model ID>
  chunking: structure-based, max 512 tokens
eval_suite: golden-v5          # 240 cases, includes 30 injection cases
gates:
  accuracy_min: 0.92
  invalid_output_max: 0.005
  injection_pass_min: 1.0
rollback_to: support-copilot-1.3.2
owner: team-support-ai
```

Store the manifest in version control next to the code. If a metric changes in production, compare the current manifest with the previous one before you change anything else. Most "the model got worse" incidents are a changed index, prompt, or schema.

Do not put secrets, personal data, or raw production conversations in the manifest.

## Worked architecture: AI support copilot

A copilot helps support agents answer customers. A human reviews every reply before it is sent.

1. The customer opens a ticket through the authenticated support portal.
2. The backend loads the ticket, the customer's account data the agent may see, and approved knowledge articles. Authorization runs before any data reaches the prompt.
3. A model call classifies the issue and drafts a reply inside a fixed schema.
4. Application code validates the schema, checks that every claim cites a retrieved article, and flags missing evidence.
5. The support agent reviews the draft, edits it if needed, and sends it. The send action goes through the approval path.
6. The platform stores a privacy-safe trace and records the agent's edits as feedback for future evaluations.

Why this design works:

- The workflow is predictable. The model does not choose the sequence of steps.
- Sending a message to a customer requires a human decision.
- The model is used where language matters: classification and drafting.
- There is no agent loop, because the steps are known.

If your product later needs the copilot to look up orders or change addresses, add those as tools with scopes, and add approval gates for every write. Revisit the decision table from Chapter 9 before you add autonomy.

## Common failure patterns

| Symptom | Likely cause | Where to look |
|---|---|---|
| Answers cite the wrong policy | Stale index or ranking error | Retrieval logs, index version (Chapters 16–17) |
| Invalid output rate rises | Prompt or schema change, model update | Manifest diff, eval by category |
| Cost per task rises, quality flat | Cache misses, longer context | Cache hit ratio, input tokens by stage |
| Timeouts at peak | No queue, no backpressure | Queue depth, concurrency limit |
| Customer sees another tenant's data | Retrieval filter missing or applied late | Authorization order in the pipeline |
| Duplicate refunds or emails | Retry without idempotency key | Side-effect log, key storage |

## Use it when

- Preparing any release of an LLM feature.
- Running a post-incident review.

## Avoid it when

- Treating the checklist as a substitute for thinking. Each item needs an owner and evidence.

## Trade-offs

A full checklist adds work before each release. Skipping it moves the same work into incidents, which cost more. Scale the checklist to the impact of the feature: an internal summarizer needs fewer gates than a feature that moves money.

## Key takeaway

Treat prompts, models, schemas, indexes, and tool definitions as versioned production assets. A release is the combination of all of them.

## Exercises

1. Write a release manifest for a feature you own. Identify one input that is not versioned today, and version it.
2. Run a tabletop exercise: a model provider deprecates your model in 60 days. List the steps, the owners, and the gates a replacement must pass.
3. Choose one failure pattern from the table. Write a runbook entry: detection, diagnosis, mitigation, and prevention.
