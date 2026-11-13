---
title: "LLM Fundamentals and Model Behavior"
part: VIII
level: intermediate
reading_time: 20 min
reviewed: 2026-11
---

# 24. LLM Fundamentals and Model Behavior

You can build good AI features without knowing how a model is trained. But you cannot predict its failures without knowing what it is doing when it answers. This chapter gives you enough of the mechanics to make good decisions about tokens, context, sampling, model choice, and reliability. It does not require any research background.

## What an LLM does

A large language model predicts the next token, given all the tokens before it. An answer is produced by repeating that prediction many times, each time appending the chosen token to the context.

Three consequences follow, and they explain most of what you will observe:

1. **Fluency is not truth.** The model is optimized to produce likely text. A likely sentence can be false.
2. **The output depends on the whole context.** Changing one word in the instructions or the documents can change the answer.
3. **Each token costs computation.** Longer inputs and longer outputs cost more time and money.

## Tokens

A **token** is a unit of text chosen by the model's tokenizer. A token can be a whole word, part of a word, a space, or a punctuation mark. Tokenizers differ between model families, so the same text can produce different token counts on different models.

Practical rules:

- Measure token counts with the provider's counting tools, not with word counts or character estimates, when a budget is tight.
- Non-English text often produces more tokens for the same meaning. Measure this for your language before you set budgets.
- Code, JSON, and tables are often more token-heavy than prose.

```python
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # check the models page before shipping

for sample in ["Refund request", "Solicitud de reembolso", '{"status": "shipped"}']:
    count = client.messages.count_tokens(
        model=MODEL,
        messages=[{"role": "user", "content": sample}],
    )
    print(f"{count.input_tokens:>4}  {sample}")
```

Run this once for each language and format your product uses. The numbers will guide your budgets, your cost estimates, and your choice of context size.

## How a model is built

Most production models go through two broad stages. The details differ between providers and are not public in full, so treat this as a conceptual model.

**Pretraining** exposes a model to very large amounts of text and trains it to predict the next token. The result is a model that has absorbed patterns of language, facts, and code, but that does not yet follow instructions well.

**Post-training** adjusts the model to behave as an assistant. Common steps include:

- **Supervised fine-tuning (SFT):** training on examples of good responses to instructions.
- **Preference optimization:** training the model to prefer responses that human or automated reviewers rated higher. Methods include reinforcement learning from human feedback (RLHF) and related techniques.
- **Safety training:** teaching the model to refuse certain requests and to handle sensitive topics.

Post-training is why a model follows instructions and why its behavior can change between versions. It also means that the model's behavior reflects choices made by its developer, and those choices can change without notice in a new version.

### Reasoning models

Some models are trained to produce intermediate reasoning before the final answer. In the Claude API, this appears as thinking, which can be enabled and controlled with an effort setting. Thinking tokens are billed and add latency. Use them where the measured quality gain justifies the cost (see Chapter 5).

## The context window

The **context window** is the maximum number of tokens a model can process in one request, including the system prompt, the messages, any tool definitions and results, and the output. Current models offer large windows, but size is not the same as usefulness.

Long context has three costs:

- **Money:** input tokens are billed on every call unless cached (Chapter 14).
- **Latency:** more input means slower first responses.
- **Quality:** important details can be overlooked when they sit in the middle of a very long input. Test this on your own documents.

Context is also the model's only working memory during a request. Anything you do not send does not exist for the model. This is why conversation state and retrieval are application responsibilities (Chapters 2 and 16).

## Sampling and determinism

At each step, the model produces a probability distribution over the next token. **Sampling** chooses one token from that distribution. Sampling parameters control how the choice is made.

- **Temperature** scales the distribution. Lower values make likely tokens more likely. Higher values increase variety.
- **Top-p** limits the choice to the smallest set of tokens whose probabilities add up to a threshold.

Lower temperature reduces variety. It does not guarantee correctness, and it does not make the output fully deterministic, because the provider's infrastructure and model updates can still change results.

Some model configurations restrict which sampling parameters you may set, especially when thinking is enabled. Check the current documentation for the model you use before you write code that depends on them. *(Verify.)*

Practical guidance:

- Use the default settings for most product features, then change one setting at a time and measure.
- For extraction and classification, use structured outputs (Chapter 4) rather than tuning temperature to get the right format.
- Do not interpret a low-variance sample as proof that the answer is correct.

Some current models use adaptive thinking that is always on. On Claude Sonnet 5.5, turn off up-front thinking with `thinking: {"type": "between_tools"}`, not `"disabled"`. Check the model page before you write code that sets sampling or thinking parameters.

## Why models hallucinate

A **hallucination** is a claim that is false or not supported by the available evidence. Models produce them because they generate plausible continuations, and a plausible continuation is not always a true one. Hallucinations are more likely when:

- The question asks for a specific detail the context does not contain (a date, a price, an ID).
- The question presupposes something false, and the model goes along with it.
- The model is asked to recall information from training rather than read it from a provided source.
- The request is long and the model must keep many details consistent.

Mitigations are application-level, not prompt-level alone:

- Provide the evidence and require citations (Chapter 16).
- Give the model an explicit "not found" path, and test it.
- Validate outputs against the source (Chapter 25).
- Route high-impact answers to a human.

## Known limitations

Models can be unreliable at tasks that need exact computation, precise counting, or strict consistency across long outputs. A model can get an arithmetic result wrong while sounding confident. Use code for arithmetic, counting, and date logic, and let the model handle the language around the result.

Models also have a knowledge cutoff. They do not know events after their training data ends, unless you supply current information through a tool or retrieval (Chapters 8 and 16).

## Choosing a model

Choose by measurement on your own task:

| Factor | What to measure |
|---|---|
| Quality | Accuracy and groundedness on your evaluation set (Chapter 6) |
| Format reliability | Invalid-output rate with your schema |
| Latency | Time to first token and total time, p50 and p95 |
| Cost | Cost per successful task, not price per token |
| Context needs | Whether your longest realistic input fits with margin |
| Tool use | Tool-call accuracy and error handling, if you use tools |
| Data and compliance | Where data is processed and retained, under your contract |

Published benchmarks rarely predict performance on your product. Use them to shortlist, not to decide.

A common pattern is to route simple requests to a smaller, cheaper model and complex requests to a larger one. Route only after you have an evaluation showing that the smaller model meets the bar for the simple class. The router is a classifier that needs its own tests.

```python
def pick_model(task_class: str) -> str:
    # Each route needs an evaluation for its task class.
    # Switching model families mid-conversation drops thinking blocks (see Chapter 12).
    routes = {
        "classify_ticket": "claude-haiku-5-5",   # verify the ID on the models page
        "draft_reply": "claude-sonnet-5-5",      # verify the ID on the models page
    }
    return routes.get(task_class, "claude-sonnet-5-5")  # safe default, not the cheapest
```

*(Model IDs are placeholders. Check the models page before shipping.)*

## Use it when

- You need to explain a failure, choose a model, or set a budget.
- You are deciding between prompting, retrieval, and fine-tuning (Chapter 28).

## Avoid it when

- You try to make the model reliable by describing it in more detail in the prompt, without measuring failures.

## Trade-offs

Larger models are usually more capable and more expensive. Longer context gives more information and costs more. Lower temperature gives more consistency and less variety. Thinking improves hard tasks and adds cost. None of these is free, and none removes the need to validate outputs.

## Common mistakes

1. **Estimating tokens from word counts.** Measure with the provider's counting tools.
2. **Treating fluency as evidence.** A confident answer needs a source.
3. **Asking the model to compute.** Use code.
4. **Choosing a model from a leaderboard.** Choose from your own evaluation.
5. **Ignoring model updates.** A version change is a release, and it needs the eval gate.

## Key takeaway

Treat an LLM as a probabilistic component inside software. Its fluency is useful, its confidence is not evidence, and its behavior depends on everything in its context.

## Exercises

1. Count the tokens for the same question in three languages and in JSON. Compute the cost difference for 10,000 requests per month at a price you look up. Show your arithmetic and the source of the price.
2. Ask a model the same question with 10 different prompts that vary in wording only. Count how many answers differ in a way that matters for your product. Decide whether that variation is acceptable.
3. Build a small evaluation with 20 questions that the provided context cannot answer. Measure how often the model answers anyway, and change the prompt until the "not found" rate is acceptable.
