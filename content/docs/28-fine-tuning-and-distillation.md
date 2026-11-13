---
title: "Fine-Tuning, Distillation, and Model Adaptation"
part: IX
level: advanced
reading_time: 26 min
reviewed: 2026-11
---

# 28. Fine-Tuning, Distillation, and Model Adaptation

Fine-tuning changes a model's weights with additional training. It is powerful and expensive to do well. It also creates artifacts you must maintain, and it has legal constraints that depend on where your training data comes from. Most teams should exhaust prompting, retrieval, and validation before they consider it.

This chapter explains when fine-tuning helps, how the main methods differ, how to build a training dataset that does not lie to you, how to evaluate the result honestly, and which contractual rules apply before you use any model output as training data.

## Before you use Claude outputs as training data

Read the terms that apply to your contract before you generate any training data from Claude. Three sources bear on this question:

- **Commercial Terms.** The customer may not use the Services to build a competing product or to train competing AI models without Anthropic's express approval. Anthropic states that it does not train models on Customer Content from paid Services.
- **Anthropic's support guidance.** It states that customers may use outputs to train models that do not compete with Anthropic's own models, such as classifiers, categorization tools, and summarization tools. The same article also says that training or developing AI models without written permission is prohibited. The two statements pull in different directions. Resolve that before you build.
- **Enterprise and cloud agreements.** Cloud platforms and enterprise contracts can change these defaults. Check the agreement that actually governs your account.

This section summarizes the sources. It is not legal advice. Before you generate training data, get a written approval from your legal counsel and keep it with the dataset's lineage record.

## Prompting, RAG, or fine-tuning?

Each approach changes a different thing:

| Approach | What it changes | Best for |
|---|---|---|
| Prompting | Instructions for one request | Format, tone, scope, and task definition |
| RAG | Evidence available at answer time | Private or changing knowledge (Chapters 16 and 17) |
| Fine-tuning | The model's weights | Persistent behavior that prompting cannot make consistent |

Fine-tuning is a poor tool for facts that change. A price, a policy, or a stock level belongs in a database or a retrieval index. Training a model on them makes them stale on the day training finishes.

A decision sequence:

1. Is the baseline measurable? If not, write the evaluation first.
2. Does the model lack knowledge? Add retrieval or a tool.
3. Does it lack the right context? Fix the context assembly.
4. Does it misunderstand the output contract? Fix the schema and the examples.
5. Does it make a repeatable, task-specific mistake despite good prompts and examples? Consider fine-tuning.

Fine-tuning fits step five. It rarely fixes steps one through four.

## What fine-tuning changes

Fine-tuning continues training an existing model on your examples. Each example pairs an input with a desired output, and training adjusts weights to make desired outputs more likely. The result is a new model version that you must evaluate, version, and monitor like any other release.

Fine-tuning teaches patterns present in the data, including the errors. If your examples contain wrong labels, inconsistent formats, or leaked personal data, the model learns them.

## Methods

**Supervised fine-tuning (SFT)** trains on input-output pairs. It suits classification, extraction, and consistent style. Its quality depends almost entirely on the labels.

**Parameter-efficient fine-tuning (PEFT)** trains a small number of added parameters while the base weights stay frozen. **LoRA** (low-rank adaptation) adds small trainable matrices to selected layers. It reduces training memory and storage, and it lets you keep one base model with several small adapters. **QLoRA** combines LoRA with a quantized base model, which reduces memory further. Quantization lowers numerical precision, so measure quality after training rather than assuming it is unchanged.

**Preference optimization** trains on pairs of responses, one preferred and one rejected. **Direct preference optimization (DPO)** is a common method. It can improve tone or helpfulness when the best answer is hard to write as a single target. It can also learn reviewer bias, and it can optimize fluent wording while hiding factual errors. Evaluate groundedness separately.

**Continued pretraining** trains on domain text with a language-model objective. It is expensive and can cause the model to lose general capabilities. Retrieval is usually the better way to add current company knowledge.

Which methods you can use depends on your provider and on whether the model is open-weight. Open-weight models allow LoRA and QLoRA with open-source training frameworks. Hosted providers expose their own tuning options, with their own input formats, model support, pricing, and data policies. Check the current documentation for the specific model and platform before you design a project around a method.

## Building a training dataset

Dataset quality matters more than size. Thousands of inconsistent examples can be worse than a few hundred carefully reviewed ones.

For each example, store:

- The input, exactly as the model will see it in production.
- The expected output, and the rule or reviewer that decided it.
- The task category.
- The source and its permission to use.
- A group ID, such as the customer, document, or conversation the example came from.

The group ID is essential for the split.

```python
import hashlib
from dataclasses import dataclass


@dataclass(frozen=True)
class Example:
    example_id: str
    group_id: str        # customer, document, or conversation
    input_text: str
    target: str
    category: str
    source: str          # where the example came from, and its approved use


def assign_split(group_id: str, test_fraction: float = 0.15, val_fraction: float = 0.15) -> str:
    """Hash the group, not the example, so related examples never cross splits."""
    digest = hashlib.sha256(group_id.encode("utf-8")).digest()
    position = int.from_bytes(digest[:8], "big") / 2**64
    if position < test_fraction:
        return "test"
    if position < test_fraction + val_fraction:
        return "validation"
    return "train"
```

Splitting by group prevents leakage. If three support tickets from one customer land in train and test, the test score measures memorization of that customer's style, not the ability to generalize.

Check for duplicates before you split. Near-duplicates across splits inflate every score.

## Cleaning and auditing

Before training, run these checks:

- **Label consistency:** the same input should not have two different labels. Sample disagreements and resolve them with a written rule.
- **Scope:** remove examples outside the task definition. An out-of-scope example teaches the model to answer things it should refuse.
- **Personal data:** remove or redact personal information that the model does not need. Remember that the model may reproduce what it sees.
- **Unknown values:** include examples where the correct output is "unknown" or null. Otherwise the model learns to always guess.
- **Injection:** check whether any example contains instructions aimed at a model. Such examples teach the model to follow them.

Keep the audit results with the dataset version.

## Evaluation

Compare the tuned model against the untuned baseline on the same held-out test set, with the same inference settings. A comparison that uses different prompts or settings measures the difference in setup, not in training.

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class ComparisonResult:
    baseline_accuracy: float
    candidate_accuracy: float
    baseline_n: int
    candidate_n: int

    @property
    def delta(self) -> float:
        return self.candidate_accuracy - self.baseline_accuracy


def worth_deploying(result: ComparisonResult, min_delta: float, min_n: int) -> bool:
    """Require a practical gain on enough cases. Otherwise the result is noise."""
    if min(result.baseline_n, result.candidate_n) < min_n:
        return False
    return result.delta >= min_delta
```

Report more than one number:

- Per-category results. A tuned model can improve common cases and worsen rare, important ones.
- Confusion matrices for classification.
- Field-level and missing-value results for extraction.
- Groundedness, unknown-handling, and refusal results for generation.
- Results on out-of-distribution inputs: other languages, longer inputs, adversarial text.
- Cost and latency of the tuned model at production volume.

Do not tune repeatedly on the test set. Each look at the test set spends some of its value. Use validation for choices, and open the test set once for the final decision.

*(Use a statistical test or a confidence interval appropriate to your sample size. Report it with the result.)*

## Overfitting and forgetting

Two failures are common. **Overfitting** means the model memorizes training examples and performs worse on new ones. Watch the gap between training and validation scores, and stop training when validation stops improving. **Catastrophic forgetting** means the model loses general abilities it had before tuning. Test a few general tasks alongside your own.

Both failures are visible only if you measure them. A training loss that keeps falling says nothing about either.

## Distillation

Distillation trains a smaller model to imitate a larger one on a task. It can reduce cost and latency for a narrow, stable task.

Distillation carries the strictest legal caution in this chapter. If the teacher is a Claude model, the outputs you would train on are subject to the terms described above. Clear the use before you generate the data, not after.

Technical requirements:

- Use representative inputs, not only the ones the teacher handles well.
- Keep the teacher's errors in mind. A student learns them too.
- Evaluate the student on the same held-out set and the same gates as any other candidate.
- Measure the cost-quality trade-off at your real volume.

## Serving a tuned model

Treat the tuned model as a versioned deployment artifact. Record:

- The base model and its version.
- The dataset version and its audit results.
- The method, its settings, and the training run ID.
- The evaluation report and its comparison with the baseline.
- The intended task and known limitations.

Keep the backend controls that already protect your system: authorization, schema validation, rate limits, monitoring, and approvals for side effects. Fine-tuning changes the model's behavior. It does not make the model a trusted component.

Release gradually, compare real outcomes against the previous model, and keep a rollback path (Chapter 27). If terminology or user behavior changes, decide whether the fix is better prompts, refreshed retrieval, relabeled data, or another training run. A retraining pipeline without evaluation and data governance repeats old mistakes.

## An example: product category labels

An e-commerce platform maps supplier product titles to an internal taxonomy. The team's sequence:

1. Start with deterministic rules and a prompted model with validated output. Record errors by cause: similar category names, ambiguous abbreviations, missing product details.
2. Add retrieval for product specifications when titles are not enough.
3. If errors persist and enough labeled examples exist, try supervised fine-tuning on a dataset split by supplier.
4. Compare the candidate with the baseline on per-category F1, invalid output rate, manual correction time, latency, and cost.
5. Keep unknown categories as unknown. A confident wrong match is worse than a review queue.

New supplier specifications still arrive through the catalog or retrieval layer. They do not require retraining.

## Risks and trade-offs

Fine-tuning can overfit, forget general abilities, memorize sensitive examples, amplify labeling bias, and go stale as the task changes. It adds training jobs, storage, versioning, evaluation work, and a data governance process. Adapter methods reduce cost in many settings, but they are not automatically as capable as full fine-tuning.

Compare the total cost of ownership with a stronger general model, better retrieval, or better application logic. Often one of those is cheaper and easier to maintain.

## Use it when

- Prompting, examples, and validation have been tried and measured.
- The failure is persistent, task-specific, and has enough labeled examples to fix it.
- You have legal approval for the training data and a plan for maintenance.

## Avoid it when

- The problem is missing knowledge, weak retrieval, or an undefined task.
- You have only a handful of inconsistent examples.
- You cannot evaluate the result on data the training never saw.

## Common mistakes

1. **Starting with training.** Measure the baseline first.
2. **Splitting by example instead of by group.** Scores then measure memorization.
3. **Tuning on the test set.** The reported result is optimistic.
4. **Ignoring the terms of the teacher model.** A legal problem can outlast the project.
5. **Teaching the model to guess.** Include unknown cases.

## Key takeaway

Choose a model adaptation strategy by the actual failure, the data you can lawfully use, and the measured return. Fine-tuning earns its cost only when the evaluation shows a practical gain on data the model never saw in training.

## Exercises

1. Write a decision record for a feature in your product: the baseline, the failure, the options considered, and the decision. Include the data-use check.
2. Implement `assign_split` and verify with 1,000 synthetic groups that the split proportions are close to the targets and that no group appears in two splits.
3. Build a comparison on 200 held-out cases. Report the delta, its confidence interval, and the per-category results. Decide, in writing, whether the candidate meets your threshold.
4. Write a data audit checklist for your domain with at least six checks, each with an owner and a pass criterion.
