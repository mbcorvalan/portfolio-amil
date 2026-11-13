---
title: "The Agent Harness"
part: VI
level: intermediate-advanced
reading_time: 20 min
reviewed: 2026-11
---

# 18. The Agent Harness: What It Is and Why It Matters

When you use a coding agent such as Claude Code or OpenCode, or when you build an agent with an SDK, the model runs inside a **harness**. The model reads its context and proposes the next action. The harness does everything else: it assembles the context, executes the requested tools, applies permissions, enforces budgets, keeps state, and decides when the run ends.

Many failures that people blame on "the model" are harness failures. A tool ran without approval. A context window filled with logs. A loop kept going after the budget was spent. This chapter defines the harness, lists its components, shows a minimal version in code, and gives you criteria for choosing one.

## What a harness is

An agent harness is the runtime that hosts a model as an agent. It sends the model its context, receives the model's output, executes the actions the model requests, enforces the rules, and records what happened.

Anthropic describes the Claude Agent SDK as "a powerful, general-purpose agent harness" ([Anthropic Engineering](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents)). The same model can behave very differently in two harnesses. The harness decides what the model sees, which tools exist, which actions need approval, and when the run stops.

| Responsibility | The model | The harness |
|---|---|---|
| Choose the next action | Proposes it | Validates it, then executes it |
| Read files, run commands | Requests the operation | Performs it, inside a defined environment |
| Decide whether to continue | Signals with a stop reason | Enforces limits and makes the final decision |
| Remember earlier sessions | Nothing. The Messages API is stateless (Chapter 2) | Persists the transcript and state |
| Approve risky actions | Nothing | Applies permission rules and approval steps |
| Keep the context small | Nothing | Summarizes or drops old content |

The table is the core idea of the chapter. A model can reason well and still cause harm if the harness gives it too many permissions. A harness can be well built and still fail if the model is wrong for the task.

## Harness, framework, workflow, and eval harness

The word "harness" appears in several contexts. Keep the meanings apart.

- **Agent.** A behavior: a model chooses actions and tools in a loop (Chapters 9 and 19).
- **Framework.** A library of building blocks. You assemble the application yourself.
- **Harness.** A runtime that hosts an agent. It is often shipped as a ready application or as an SDK that includes the loop.
- **Workflow.** A process whose steps are defined by application code (Chapter 10). A harness can run workflows too.
- **Eval harness.** A different thing. It runs evaluation cases against a system and records the scores (Chapter 6). Benchmark harnesses (Chapter 7) are a related use.

When someone says "harness" in a design meeting, ask which one they mean.

## The components of a harness

Most harnesses, from a coding agent to a support bot, contain the same components. The table lists them and points to the chapter where each one is covered in depth.

| Component | What it does | Covered in |
|---|---|---|
| Context assembly | Builds the input for each model call from instructions, tool definitions, history, and project files. Keeps the stable prefix stable so it can be cached | Chapter 14 |
| Loop | Calls the model, runs the requested tools, feeds the results back, and stops | Chapters 11 and 19 |
| Tool registry | Holds names, schemas, validation, and execution rules | Chapters 8 and 11 |
| Permissions | Allow and deny rules, approval steps for irreversible actions | Chapter 13 |
| Hooks | Callbacks before and after a tool call, and when the run ends | Chapter 13 |
| Budgets and limits | Maximum turns, spend, time, and output size per call | Chapters 11 and 14 |
| State and sessions | Transcript, checkpoints, resume, and fork | Chapter 19 |
| Compaction and memory | Summaries of old history, and persistent instruction files | Chapter 19 |
| Environment | Where commands run, which files and network hosts are reachable, where secrets live | Chapters 13 and 30 |
| Observability | Logs, traces, and cost per turn | Chapters 7 and 14 |
| Termination and recovery | Stop reasons, error types, retries, and what the user sees when a run fails | Chapters 2 and 19 |

Two details matter in practice:

- **Compaction is lossy.** When context approaches its limit, the harness summarizes older messages. Specific instructions from early in a conversation may disappear. The Agent SDK documentation says that persistent rules belong in project instruction files, which are loaded again on every request ([Agent SDK: how the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop)).
- **Stop reasons are signals, not outcomes.** `end_turn` means the model finished its answer. `max_tokens` means the output was cut off. `refusal` means the model declined. Each one needs its own handling. None of them tells you whether the task succeeded.

## A minimal harness

The sketch below is the loop from Chapter 11 with the other components added: a tool registry, a budget, a deny-by-default approval check, and error results that go back to the model. It is not production code. It leaves out sandboxing, persistence, compaction, logging, and cancellation. Those gaps explain why you should use a maintained harness for real work.

```python
import json
from collections.abc import Callable
from dataclasses import dataclass, field

import anthropic

MODEL = "claude-sonnet-5-5"  # check the models page before shipping
client = anthropic.Anthropic()


@dataclass
class Tool:
    name: str
    description: str
    schema: dict
    run: Callable[[dict], str]
    needs_approval: bool = False


@dataclass
class Budget:
    max_turns: int = 10
    max_output_tokens: int = 1024  # per model call


def deny_by_default(name: str, args: dict) -> bool:
    return False


@dataclass
class Harness:
    tools: dict[str, Tool]
    budget: Budget = field(default_factory=Budget)
    system: str = "You are a support assistant. Use the tools when you need facts."
    approve: Callable[[str, dict], bool] = deny_by_default

    def run(self, user_text: str) -> str:
        messages = [{"role": "user", "content": user_text}]
        specs = [
            {"name": t.name, "description": t.description, "input_schema": t.schema}
            for t in self.tools.values()
        ]
        for _ in range(self.budget.max_turns):
            response = client.messages.create(
                model=MODEL,
                max_tokens=self.budget.max_output_tokens,
                system=self.system,
                tools=specs,
                messages=messages,
            )
            # Keep the assistant's content blocks exactly as returned.
            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "end_turn":
                return "".join(b.text for b in response.content if b.type == "text")
            if response.stop_reason == "max_tokens":
                raise RuntimeError("Output was truncated. Raise the limit or split the task.")
            if response.stop_reason != "tool_use":
                raise RuntimeError(f"Run stopped: {response.stop_reason}")

            # All results for this turn go back in one user message.
            results = [self._execute(b) for b in response.content if b.type == "tool_use"]
            messages.append({"role": "user", "content": results})

        raise RuntimeError(f"Budget exhausted after {self.budget.max_turns} turns")

    def _execute(self, block) -> dict:
        def result(text: str, error: bool = False) -> dict:
            return {"type": "tool_result", "tool_use_id": block.id,
                    "content": text, "is_error": error}

        tool = self.tools.get(block.name)
        if tool is None:
            return result(f"Unknown tool: {block.name}", error=True)
        if tool.needs_approval and not self.approve(block.name, block.input):
            return result("Action denied by policy.", error=True)
        try:
            return result(tool.run(block.input))
        except Exception as exc:  # return the failure to the model; never fail silently
            return result(f"Tool failed: {exc}", error=True)


def lookup_order(args: dict) -> str:
    # Fake data for the example. Replace with a call to your order system.
    return json.dumps({"order_id": args["order_id"], "status": "shipped"})


support = Harness(
    tools={
        "lookup_order": Tool(
            name="lookup_order",
            description="Look up the status of an order by its ID.",
            schema={
                "type": "object",
                "properties": {"order_id": {"type": "string"}},
                "required": ["order_id"],
            },
            run=lookup_order,
        ),
    },
)

print(support.run("Where is order A-1042?"))
```

Read the code with these questions in mind:

- Where is the stop condition, and what happens when the budget runs out?
- What does the model see when a tool is denied or fails? Can it recover?
- Which decision is made in code, and which is left to the model?

## Choosing a harness

Choosing a harness is a decision about cost, control, and dependence. Use these criteria in order.

1. **Access and billing terms.** Confirm that your plan or API account allows the harness and the model you plan to use. Rules for third-party harnesses changed several times in 2026. Reports described extra charges for some harnesses, and the provider's support articles describe how subscription usage applies to third-party apps. Read the current terms for your plan before you build a process on it. Do not assume a harness is covered.
2. **Cost per successful task.** Measure it on your own tasks, using the method from Chapters 14 and 32. Token efficiency depends on the task, the context the harness sends, the model, and how often the run succeeds. Published claims rarely transfer to your workload.
3. **Control.** Check permissions, hooks, logs, the execution environment, and where your data is processed and retained.
4. **Portability.** Can you change the model or the provider without rewriting your integration? Tools exposed through open standards, such as MCP (Chapters 22 and 23), are easier to move than tools tied to one product.
5. **Maintenance.** Open-source harnesses let you read and change the code. Managed products give you updates without operating them. Both require someone to track changes.

Practitioners often report different preferences. One developer reports using Claude Code with Claude models and OpenCode with other providers' models, citing token efficiency. These are experience reports, not benchmarks. Treat them as hypotheses and test them on your own tasks.

## Use it when

- The task needs many steps, file access, or command execution, and a single model call is not enough.
- You need sessions, approval steps, budgets, and logs, and you do not want to build them yourself.
- The same runtime rules should apply to several agents or several users.

## Avoid it when

- A fixed sequence of steps solves the problem. Use a workflow (Chapter 10) and call the model only where judgment is needed.
- You are running a one-off script. A short program with one model call is simpler to maintain.
- You are about to write a harness for a product whose rules you have not defined yet. Define the permissions, the budgets, and the stop conditions first.

## Trade-offs

A ready-made harness saves time and gives you tested defaults. You also inherit those defaults: how context is compacted, which tools are loaded, and which permissions are granted when you do nothing. A custom harness gives you control over each rule, and you carry the cost of building, testing, and updating it. The middle path is common: use an existing harness for the generic parts, and add your own tools, approval rules, and evaluation on top.

## Common mistakes

- **Treating the harness as the model.** When an agent does something wrong, check the permissions and the tool results before you change the prompt.
- **Running without a budget.** A run with no turn limit and no spend limit can cost far more than expected. Set both.
- **Letting tool output fill the context.** A tool that returns 50 KB of logs consumes context on every later turn. Truncate, summarize, or return references.
- **Relying on compaction to keep instructions.** Put persistent rules in instruction files that the harness reloads, and test that they still hold in long runs.
- **Denying by silence.** If a denied action returns nothing, the model may retry or guess. Return a clear error result.
- **Choosing by reputation.** Measure cost per successful task on your own work before you commit.
- **Confusing the eval harness with the agent harness.** They solve different problems and are maintained differently.

## Key takeaway

The harness decides what the model can see, what it can do, what needs approval, and when the run ends. Design those rules on purpose, and treat the harness as part of your system, not as a tool you can ignore.

## Exercises

1. **Inventory.** Choose a harness you use. For each of the eleven components in the table, write what the harness does, what you can configure, and what you cannot.
2. **Limits.** Run the sketch with a tool that always returns the same result and with `max_turns` set to 2. Observe the behavior. Then write a test for the budget-exhausted path.
3. **Permissions.** Mark one tool as `needs_approval=True`, and set `approve` to a function that asks for confirmation in the terminal. Confirm that a denied action returns an error result and that the model reports the failure.
4. **Context.** Add a tool that returns about 50 KB of text. Record the input tokens per turn from the response usage. Propose a rule that keeps the context under a fixed size, and measure its effect.
5. **Comparison.** Run the same 20 tasks through two harnesses. Report the pass rate, the cost per successful task, the median time, and one failure you could not fix. Write the decision, and record the date on which you checked the terms.

## Further reading

- Anthropic Engineering, [Effective harnesses for long-running agents](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents).
- Claude Agent SDK documentation, [How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop).
- Anthropic support, [usage and plan articles](https://support.claude.com/en/articles/15036540). Check the latest version, because the terms have changed in 2026.
