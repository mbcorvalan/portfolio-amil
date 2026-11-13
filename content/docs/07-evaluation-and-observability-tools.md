---
title: "Evaluation and Observability Tools"
part: II
level: intermediate
reading_time: 12 min
reviewed: 2026-11
---

# 7. Evaluation and Observability Tools

Three kinds of tools are often confused. Each answers a different question:

| Kind | Question it answers | Example use |
|---|---|---|
| **Benchmarking** | How does this model compare on standard tasks? | Choosing a model family |
| **Application evaluation** | Does my feature work on my data? | Regression tests for a prompt |
| **Observability** | What happened during this specific request? | Debugging a slow or wrong answer |

Benchmarks rarely predict performance on your product. Application evals tell you whether a change is safe. Observability tells you why a single run behaved as it did.

## Choosing a tool

Before choosing a vendor, define:

- The metrics you need (accuracy, latency, cost per successful task).
- Where data may be stored, and whether it may leave your region.
- Whether you need self-hosting.
- Whether your framework is already committed.

Tool features and licenses change often. Check current documentation before you adopt one. Examples in the ecosystem include benchmarking harnesses (for example, lm-evaluation-harness and HELM), task-based frameworks (for example, Inspect AI), application test tools (for example, Promptfoo and DeepEval), and tracing platforms (for example, Langfuse, Braintrust, and Arize Phoenix). Marking these as current needs a re-check on the day you publish.

## Observability with OpenTelemetry

OpenTelemetry (OTel) provides a standard way to record traces and metrics. Its GenAI semantic conventions define attribute names for model calls. As of November 2026, every `gen_ai.*` attribute is still at Development status. The conventions moved to a separate repository in June 2026, and that repository has no tagged release yet. Pin your library versions, and expect attribute names to change.

The following wrapper records one span per model call. It stores token counts and your application's prompt version. It does **not** store prompt or response content by default, because that content is often sensitive.

```python
import anthropic
from opentelemetry import trace

tracer = trace.get_tracer("support-copilot")
client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # pin the exact model ID


def traced_message(prompt_name: str, prompt_version: str, **kwargs):
    with tracer.start_as_current_span(f"chat {MODEL}") as span:
        span.set_attribute("gen_ai.operation.name", "chat")
        span.set_attribute("gen_ai.provider.name", "anthropic")   # replaces the deprecated gen_ai.system
        span.set_attribute("gen_ai.request.model", MODEL)
        span.set_attribute("app.prompt.name", prompt_name)
        span.set_attribute("app.prompt.version", prompt_version)

        response = client.messages.create(model=MODEL, **kwargs)

        span.set_attribute("gen_ai.usage.input_tokens", response.usage.input_tokens)
        span.set_attribute("gen_ai.usage.output_tokens", response.usage.output_tokens)
        span.set_attribute("gen_ai.response.finish_reasons", [response.stop_reason])
        span.set_attribute(
            "app.usage.cache_read_tokens",
            response.usage.cache_read_input_tokens or 0,
        )
        return response
```

Notes:

- `app.*` attributes are your own. The `gen_ai.*` names follow the Development conventions.
- The OTel API is vendor-neutral. You need an exporter (OTLP) and a backend to see the data.
- Capturing content is an opt-in decision that involves privacy, retention, and access control. Make it explicit in your data policy.

## What to measure

Combine quality with operations:

- **Quality:** task success, invalid-output rate, groundedness (see Chapter 16–17).
- **Reliability:** tool error rate, timeouts, retries.
- **Performance:** p50 and p95 latency, time to first token when streaming.
- **Cost:** input and output tokens, cache reads and writes, cost per completed task.
- **Safety:** refusals, injection detections, permission failures.

Track cost per **successful** task, not cost per call. A cheap model that fails often can cost more overall.

## Use it when

- A feature is in production and users report problems you cannot reproduce.
- You need to attribute cost or latency to a prompt, a model, or a tool.

## Avoid it when

- You have no traffic yet. Start with a small eval set and structured logs.

## Trade-offs

Tracing adds some overhead and data volume. Full content capture is useful for debugging and risky for privacy. Vendor platforms are faster to adopt but create lock-in. Self-hosted stacks give control and cost more to operate.

## Common mistake

Logging full prompts and responses by default, including customer data, into a system with wide access.

## Key takeaway

Evals explain whether the system works. Observability explains why one specific run behaved the way it did.

## Exercises

1. Instrument your classifier from Chapter 5 with `traced_message`. Export spans to the console and find the slowest call.
2. Write a 1-page data policy for your traces: what is stored, for how long, and who can read it.
