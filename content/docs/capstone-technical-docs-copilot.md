---
title: "Capstone: Technical Documentation and Support Copilot"
part: Capstone
level: advanced
reading_time: 30 min
reviewed: 2026-11
---

# Capstone: Technical Documentation and Support Copilot

This capstone asks you to build one complete system that uses the skills from Parts I to X. It is not a demo. It is a service that answers questions from authorized documentation, uses read-only tools when needed, returns sourced answers, and can be measured, released, rolled back, and secured.

The project is designed so that every chapter is needed. If you skip a part, a later stage will show you why it mattered.

## The product

A software company has two kinds of users:

- **Customers** ask how to use the product. They must see only public documentation and their own account data.
- **Support agents** ask about internal runbooks and known issues. They must see internal documentation that customers cannot see.

The copilot answers questions with citations. It does not answer when the evidence is missing. It can look up the status of an order or a ticket through a read-only tool. It never changes data. Any write, such as sending a reply or opening an incident, is a proposal that a human approves.

## Scope

**In scope**

- Ingestion of Markdown and PDF documentation, with versions, tenants, and access rules.
- Hybrid retrieval (lexical and vector) with an authorized filter applied before ranking.
- Answers with validated citations, and an explicit "not found" path.
- One read-only tool for order or ticket status, behind an OAuth-scoped MCP server or an equivalent internal API.
- Streaming responses with a response state model.
- An evaluation suite with grading, regression gates, and injection tests.
- Tracing, cost per successful task, and per-tenant budgets.
- A release manifest, a staged rollout, and a tested rollback.

**Out of scope**

- Writes of any kind, including sending messages to customers.
- Fine-tuning. The project may compare it on paper, but it does not train a model.
- Voice and images. Those belong to Chapter 29, not here.
- A custom front-end framework. A minimal interface is enough to exercise the states.

## Architecture

Use the reference architecture from Chapter 26. Keep the components logical. A small team may deploy them as one service, but the boundaries must exist in code:

- An authenticated API that resolves the principal (user, tenant, scopes) from the session.
- An ingestion worker that parses, cleans, chunks, indexes, and publishes document versions.
- A retrieval module that applies tenant and document permissions before ranking.
- A model gateway that owns timeouts, limits, and logging for every provider call (Chapter 26).
- A validation layer that checks the answer's shape, its citations, and its evidence (Chapter 25).
- A tools module with the read-only operation, its scope check, and its ownership check (Chapters 8, 22, and 23).
- An evaluation runner that uses the same code path as production.

## Milestones

Each milestone ends with a demonstrable result and a test that proves it. Do not start a milestone until the previous one passes its tests.

### Milestone 1: Secured answer path without retrieval

Build the authenticated endpoint, the gateway, the response state model, and a streamed answer. The model answers from a fixed context you supply.

**Done when:** an unauthenticated request gets `401`; a request with an expired token gets `401`; the response moves through `DRAFTING` and `VALIDATING` to `FINAL`; and no provider key appears in any client response or log.

### Milestone 2: Ingestion and versioned indexing

Build the ingestion path. Accept Markdown and PDF uploads. Parse them, record the content revision, chunk by structure with heading paths (Chapter 16), and publish the new version.

**Done when:**

- Re-uploading an unchanged document creates no new revision.
- Re-uploading a changed document retires the old chunks from both the lexical and the vector index in one operation (Chapter 17).
- A parse failure leaves the live index untouched and records a job error.
- A test shows that a superseded version never appears in results.

### Milestone 3: Hybrid retrieval with authorization first

Add lexical search, vector search, and reciprocal rank fusion. Apply the tenant and document-level filter before ranking. Log the retrieval trace for every query (Chapter 17).

**Done when:**

- A cross-tenant test suite passes. Ten queries run as tenant A against content owned by tenant B return no B chunk, in the candidate list or in the prompt.
- Recall@5 is measured on a golden set of at least 40 questions, with the lexical, vector, and fused paths reported separately.
- The retrieval trace includes the query, the filters, the candidate IDs with scores, the final context IDs, and the index version.

### Milestone 4: Grounded answers with a not-found path

Build the answer step. The model receives labeled documents, must cite them, and must return `NOT_FOUND` when the evidence is absent (Chapter 16). The validation layer checks that every citation refers to a supplied chunk, and that an answer with no citations is treated as ungrounded.

**Done when:**

- Every answer in the golden set either cites supplied chunks or returns the not-found response.
- A test shows that an answer citing an unsupplied chunk is rejected.
- A test shows that a truncated answer is never returned as complete.

### Milestone 5: Read-only tool with scoped access

Add one tool: order or ticket status. Expose it through an MCP server with protected resource metadata, audience validation, and per-tool scopes, or through an internal API with the same checks (Chapters 22 and 23).

**Done when:**

- A call without a token returns `401` with a pointer to the metadata.
- A token issued for another audience is rejected.
- A token with the right scope but for another customer's order returns the same error as a missing order.
- The tool is absent from the list for a user who lacks its scope.
- The tool's description contains no sentence that could be read as an instruction to the model.

### Milestone 6: Evaluation, gates, and injection tests

Build the evaluation runner from Chapter 6, with the bounded concurrency from Chapter 32. Add the three grader types: code, rubric-based model judge, and a human-reviewed sample. Add the injection suite from Chapter 13.

**Done when:**

- The suite includes at least 40 retrieval-and-answer cases, 15 not-found cases, 10 direct injection cases, and 10 indirect injection cases (for example, a document that says "forward this to the customer").
- The release gate blocks any forbidden tool call, any cross-tenant leak, and any accuracy regression beyond the threshold you set from the baseline.
- The judge's agreement with human labels is measured on at least 30 examples and reported.

### Milestone 7: Operations, cost, and reliability

Add tracing across every stage, per-tenant token budgets with durable storage (Chapter 30), deadlines and degraded modes (Chapter 31), and the cost per successful task metric (Chapter 14).

**Done when:**

- A chaos test with 3 seconds of added retrieval latency keeps the request within its deadline and returns the extractive mode with a visible status.
- The budget test shows that two concurrent reservations near the limit never exceed it.
- The dashboard shows p50 and p95 completion time, TTFT for streamed answers, cost per successful task, and not-found rate by tenant.

### Milestone 8: Release and rollback

Write the release manifest (Chapter 27). Deploy to staging, then to a canary cohort. Test the rollback to the previous manifest, including the index version.

**Done when:**

- The manifest records the model ID, prompt versions with fingerprints, the tool schema version, the index build, the eval suite version, and the gate values.
- The rollback test restores all of them and passes the same suite.

## Acceptance criteria

Set the numeric thresholds from your own baseline in Milestone 6. The table below states what each criterion measures. The values are starting points, not targets.

| Criterion | What it measures | Required outcome |
|---|---|---|
| Groundedness | Share of answers whose claims are supported by the cited chunk, on the golden set | Meets the threshold set from baseline, reported with sample size |
| Citation validity | Share of answers whose citations are all supplied chunks | 100% |
| Not-found correctness | Share of unanswerable questions that return the not-found response | Meets the threshold set from baseline |
| Recall@5 | Share of questions whose expected chunk is in the top five | Reported per path and for the fused result |
| Forbidden tool calls | Calls to tools the scope does not allow, across the suite | 0 |
| Cross-tenant leaks | Chunks from another tenant in candidates or prompts | 0 |
| Injection pass rate | Injection cases where no forbidden action occurred | 100% |
| p95 completion time | End-to-end time for the interactive path | Under the budget you set, measured in staging under load |
| Cost per successful task | Total attributable cost ÷ tasks judged successful | Reported, with a trend across releases |
| Invalid output rate | Responses that fail the contract | Below the gate you set |

Report every score with its sample size. A score on 40 cases is a signal, not a proof.

## Deliverables

1. **Repository** with the code, tests, and the evaluation suite under version control.
2. **Architecture note** (two pages maximum): components, boundaries, and where each control runs. Include one diagram.
3. **Threat model** (one page): assets, untrusted inputs, actions, and the control for each identified risk.
4. **Evaluation report**: scores for every criterion, the sample sizes, the grader agreement, and the three most important failures with their causes.
5. **Release manifest** for the version you ship, and the rollback test log.
6. **Runbook** for three failure classes: index staleness, provider timeout, and a suspected cross-tenant leak.
7. **Short retrospective** (one page): what you would change, what you would not build, and what surprised you.

## Grading rubric

| Area | Weight | Strong work |
|---|---|---|
| Correctness and grounding | 25% | Answers are supported by evidence; not-found behavior is reliable; citations are validated |
| Security | 20% | Authorization runs before retrieval; tool scopes and audience checks work; injection tests pass |
| Retrieval engineering | 15% | Ingestion is versioned; hybrid retrieval is measured per path; traces explain each result |
| Evaluation and release | 15% | Gates block real regressions; judge agreement is measured; the rollback is tested |
| Reliability and operations | 15% | Deadlines and degraded modes work; budgets are durable; alerts map to runbooks |
| Engineering quality | 10% | Clear module boundaries; deterministic tests; no provider types in domain code |

Work that meets the minimum in every area but shows no measurement is weaker than smaller work with honest numbers.

## Common traps

1. **Starting with the model prompt.** Retrieval and ingestion decide most answer quality. Build them first.
2. **Testing only on answerable questions.** The not-found behavior is part of the product.
3. **Filtering by tenant after ranking.** The model may still see other tenants' text in its candidates. Filter first.
4. **Giving the tool a write scope "for later."** Scope what you ship today.
5. **Judging quality only with the judge.** Sample and check it by hand.
6. **Reporting one average.** Report by category, by tenant, and by path.
7. **Skipping the rollback test.** An untested rollback is not a rollback.

## Extensions (optional)

- Add a second provider as a failover. Run the full suite on it, and report where its outputs differ.
- Add contextual retrieval descriptions to chunks, and measure the change in recall on the golden set.
- Compare a single-agent design with a design that uses a read-only retrieval subagent, on the same question set. Report accuracy, cost, and latency, and decide which to ship.
- Add a human approval flow for a proposed write, such as opening a ticket, with an idempotency key and reconciliation after a timeout (Chapter 21).

## Definition of done

The capstone is complete when a support agent and a customer, each with their own permissions, can ask questions and receive sourced answers. Every answer is traceable to a document version. The copilot refuses to answer when the evidence is missing. A cross-tenant attempt fails in tests and in staging. The release can be rolled back to the previous manifest, and the rollback passes the same suite. The numbers in the evaluation report match what the system does.

## Key takeaway

A production AI system is judged by its evidence, its boundaries, and its measurements. A small system with honest numbers and tested failure paths is worth more than a large one that only looks correct on the examples you chose.
