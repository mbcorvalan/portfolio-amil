---
title: "Practical AI Engineering: A Developer's Handbook"
version: 2026-11
reviewed: 2026-11
language: en
audience: "Experienced software engineers moving into AI engineering (mid to senior)"
---

# Practical AI Engineering: A Developer's Handbook

A reference for software engineers who build production systems with large language models. It covers the API, prompts, evaluation, retrieval, agents, the Model Context Protocol, security, reliability, and operations. Examples use Python and the Anthropic SDK. Model IDs and provider features change, so check the current documentation before you ship.

## How to read this handbook

Start with the parts in order if you are new to AI engineering. Experienced engineers can use the reading paths below.

**Path 1: building a first feature.** Chapters 1–8, then 15 and 25.

**Path 2: building retrieval.** Chapters 2, 5, 6, 16, 17, and 25.

**Path 3: building agents.** Chapters 9–12 and 18–23.

**Path 4: running in production.** Chapters 13–15, 26, 27, and 30–32.

## Contents

### Foundations

1. [LLM Applications and Architecture](01-llm-applications.md)
2. [Conversation State and Context](02-conversation-state.md)
3. [Prompts and Instructions](03-prompts-and-instructions.md)
4. [Streaming and Output Contracts](04-streaming-and-output-contracts.md)

### Building with Models

5. [Prompt Engineering Patterns](05-prompt-engineering-patterns.md)
6. [Evaluation and Regression Testing](06-evaluation-and-regression-testing.md)
7. [Evaluation and Observability Tools](07-evaluation-and-observability-tools.md)
8. [Tool Use and Function Calling](08-tool-use-and-function-calling.md)

### Orchestration

9. [Workflows, Agents, and Decision-Making](09-workflows-agents-and-decisions.md)
10. [Workflow Patterns](10-workflow-patterns.md)
11. [Agent Execution and Tool Results](11-agent-execution-and-tool-results.md)
12. [Streaming Tools and Built-in Capabilities](12-streaming-tools-and-builtin-capabilities.md)

### Production

13. [Safety, Permissions, and Prompt Injection](13-safety-permissions-and-prompt-injection.md)
14. [Cost, Latency, and Reliability](14-cost-latency-and-reliability.md)
15. [A Practical Delivery Checklist](15-practical-delivery-checklist.md)

### Retrieval and Knowledge

16. [Retrieval-Augmented Generation (RAG)](16-retrieval-augmented-generation.md)
17. [Advanced RAG: Retrieval, Evaluation, and Production](17-advanced-rag.md)

### Agent Systems

18. [The Agent Harness](18-agent-harness.md)
19. [Agent Architecture and Execution](19-agent-architecture-and-execution.md)
20. [Subagents and Multi-Agent Systems](20-subagents-and-multi-agent-systems.md)
21. [Production Agent Engineering](21-production-agent-engineering.md)

### Model Context Protocol

22. [MCP Fundamentals](22-mcp-fundamentals.md)
23. [Advanced MCP: Authorization, Client Features, and Production](23-advanced-mcp.md)

### LLM Foundations and Application Design

24. [LLM Fundamentals and Model Behavior](24-llm-fundamentals.md)
25. [Data Contracts and Validation](25-data-contracts-and-validation.md)
26. [AI Application Architecture](26-ai-application-architecture.md)

### Model Engineering and Production

27. [LLMOps and the Model Lifecycle](27-llmops-and-model-lifecycle.md)
28. [Fine-Tuning, Distillation, and Model Adaptation](28-fine-tuning-and-distillation.md)
29. [Multimodal AI and Real-Time Systems](29-multimodal-ai.md)

### Security, Reliability, and Experience

30. [AI Security Beyond Agents](30-ai-security-beyond-agents.md)
31. [Reliability Engineering for AI Systems](31-reliability-engineering.md)
32. [AI UX and Performance Engineering](32-ai-ux-and-performance.md)

<!-- local-only -->

### Capstone

- [Technical Documentation and Support Copilot](capstone-technical-docs-copilot.md)
- HireFlow: AI-Assisted Screening Platform ([Part 1, Steps 0–8](hireflow-part-1.md); [Part 2, Steps 9–17](hireflow-part-2.md))

<!-- /local-only -->

### Appendices

- [Glossary](glossary.md)

## Conventions

- Code is Python 3.12 or later, typed, and written to be run. Snippets that need a provider or a service show the call shape and mark the placeholder.
- Model IDs are placeholders until confirmed on the provider's model page for the date of use.
- Figures that depend on prices, limits, or sample sizes are labeled as illustrative or require measurement.
- Recruitment and personal-data examples use fictional data only.

## Scope and limits

The handbook teaches engineering practices that outlast any one vendor, and it names specific provider features where they matter. It is not legal advice. Items that depend on law, including the EU AI Act, data protection in Argentina, messaging-platform rules, and data-use terms, must be confirmed with qualified counsel and the current official sources.
