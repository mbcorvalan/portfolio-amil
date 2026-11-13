---
title: "Glossary"
part: Appendix A
reviewed: 2026-11
---

# Glossary

Terms are listed alphabetically. Each definition is short. The chapter in parentheses is where the term is explained in depth.

**Adaptive thinking.** A mode in which the model decides how much to reason before answering, steered by an effort setting. It is the recommended mode on current models. Manual `budget_tokens` mode is deprecated on some models and returns an error on newer ones. (Ch. 5, 24)

**Agent.** A system in which a model chooses actions and tools in a loop, within limits set by application code. (Ch. 9, 19)

**Agentic RAG.** Retrieval in which the model decides which approved search to run and whether to search again. (Ch. 17)

**Batch processing.** Asynchronous processing of many independent requests at a lower price. Each item needs a stable custom ID. (Ch. 14)

**Cache breakpoint.** A marker that ends a cacheable prefix. A request can have up to four. (Ch. 14)

**Canary release.** Sending a small share of real traffic to a new configuration while comparing it with the baseline. (Ch. 27)

**Chunk.** A passage of a document that is indexed and retrieved as one unit. Each chunk keeps its document ID, version, and heading path. (Ch. 16)

**Circuit breaker.** A pattern that stops calls to a failing dependency for a cooldown period. (Ch. 14, 31)

**Citation validation.** Code that checks every citation in an answer refers to a passage the system actually supplied. (Ch. 16)

**Context engineering.** Deciding what enters a model's context, in what order, with what labels, and within what budget. (Ch. 17, 26)

**Context window.** The maximum number of tokens one request can contain, including the output. (Ch. 24)

**Cost per successful task (CPST).** Total attributable cost divided by the number of tasks completed correctly. (Ch. 14, 32)

**Data contract.** The definition of what data a system accepts, stores, and sends, covering shape, business rules, evidence, and policy. (Ch. 25)

**Data poisoning.** Manipulation of data that shapes model behavior: indexed documents, training examples, or stored memory. (Ch. 30)

**Direct prompt injection.** A user typing instructions intended to override the system's rules. (Ch. 13)

**Direct preference optimization (DPO).** A training method that learns from pairs of preferred and rejected responses. (Ch. 28)

**Embedding.** A vector that represents the meaning of a text. Vectors from different models cannot be compared. (Ch. 16)

**Eval.** A repeatable test of a model-powered feature on a fixed dataset, using one or more graders. (Ch. 6)

**Error budget.** The amount of failure an SLO allows over a period. (Ch. 31)

**Excessive agency.** OWASP LLM03. A model or agent has more permissions or autonomy than its task needs. (Ch. 13, 30)

**Few-shot prompting.** Showing the model a small number of input-output examples in the prompt. (Ch. 5)

**Fine-tuning.** Changing a model's weights through additional training on examples. (Ch. 28)

**Groundedness.** The property that each claim in an answer is supported by the evidence it cites. (Ch. 16, 17)

**Guardrail.** A control that checks, limits, or reviews model input or output. (Ch. 13, 25)

**Hallucination.** A claim that is false or unsupported by the available evidence. (Ch. 24)

**Hidden Context Exposure.** OWASP LLM08 (2026). Operational context in a prompt may be discoverable, so it must not contain secrets. Replaces "System Prompt Leakage." (Ch. 30)

**Host, client, server.** The three roles in MCP. The host is the AI application, the client is its connection to one server, and the server publishes capabilities. (Ch. 22)

**Hybrid search.** Combining lexical and vector retrieval, usually with rank fusion. (Ch. 16, 17)

**Idempotency key.** A stable identifier for a business action, passed to an external system so that a retry does not repeat the action. (Ch. 14, 21)

**Indirect prompt injection.** Instructions hidden in content the application retrieves, such as an email, web page, or document. (Ch. 13)

**LoRA.** Low-rank adaptation. A parameter-efficient method that trains small added matrices while the base weights stay frozen. (Ch. 28)

**LLMOps.** Release engineering, monitoring, and governance for LLM-based products. (Ch. 27)

**Lexical search.** Retrieval by matching words or terms, often with BM25. Strong for identifiers and exact terms. (Ch. 16)

**MCP (Model Context Protocol).** An open protocol that connects AI applications to tools, resources, and prompts exposed by servers. (Ch. 22, 23)

**Multi round-trip request (MRTR).** The 2026-07-28 MCP pattern in which a server returns an `input_required` result, and the client retries with the answers. (Ch. 23)

**OAuth resource server.** The role an MCP server plays under OAuth 2.1. It validates tokens issued by an authorization server. (Ch. 23)

**Output contract.** The required shape and rules for a model's output, validated in code. (Ch. 4, 25)

**Prompt caching.** Reuse of a processed prefix of a request, billed at a lower rate for reads. Requires a stable prefix and a length above the model's minimum. (Ch. 14)

**Prompt chaining.** Splitting a task into stages, with a check after each stage. (Ch. 10)

**Prompt injection.** Untrusted input that changes a model's behavior against the developer's intent. OWASP LLM01. (Ch. 13)

**Protected resource metadata.** A document (RFC 9728) that tells clients where to get tokens for a resource server. (Ch. 23)

**RAG (retrieval-augmented generation).** Finding relevant passages from an external source and giving them to the model at answer time. (Ch. 16, 17)

**Recall@k.** The share of questions whose relevant evidence appears in the top k results. (Ch. 16, 17)

**Release manifest.** A versioned record of every input that shapes a release's behavior: model, prompts, schemas, indexes, evals, and gates. (Ch. 15, 27)

**Reciprocal rank fusion (RRF).** A method that combines ranked lists using only the ranks, so scores on different scales can be merged. (Ch. 16)

**Reranker.** A second-stage model that scores candidate passages more carefully than the first retrieval stage. (Ch. 17)

**Resource indicator (RFC 8707).** A parameter that tells the authorization server which resource a token is for. (Ch. 23)

**Schema.** A formal definition of a data structure, such as JSON Schema or a validation model. (Ch. 4, 25)

**Shadow testing.** Running a candidate configuration on copied traffic without exposing its output to users or executing side effects. (Ch. 27)

**SFT (supervised fine-tuning).** Training on input-output pairs. (Ch. 28)

**SLO (service level objective).** A target for a reliability or quality metric over a period. (Ch. 31)

**Stateless API.** An interface that does not keep application conversation state between requests. The Claude Messages API is stateless. (Ch. 2)

**stop_reason.** The field that tells why a response ended, such as completion, tool use, or truncation. Each value needs its own handling. (Ch. 2, 8, 11)

**Streaming.** Delivery of model output as a sequence of events, rather than all at once. (Ch. 4, 12)

**Structured outputs.** A provider feature that constrains a response to a JSON Schema. It guarantees shape, not truth. (Ch. 4)

**Subagent.** An agent that receives a delegated task from another agent and returns a result. (Ch. 20)

**Token.** A unit of text chosen by a model's tokenizer. Counts differ between models and languages. (Ch. 24)

**Tool use (function calling).** A mechanism in which the model requests a named operation with arguments. The application validates and executes it. (Ch. 8)

**Trajectory.** The ordered sequence of decisions and tool calls in an agent run. Evaluated alongside the final outcome. (Ch. 21)

**TTFT (time to first token).** The time until the first generated text arrives. (Ch. 32)

**Workflow.** A process whose sequence of steps is defined by application code. Models may perform individual steps. (Ch. 9)
