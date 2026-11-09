# Lesson 0 — Foundation: schema, provider adapter, one traced call

What shipped: `uv run anim card` turns a text description of an animation into a validated
`TechniqueCard` using the Claude account already logged in to the `claude` CLI. Two tests pass.

## The three ideas in this milestone

### 1. Schema before prompt (`schemas.py`)

The first file we wrote was not a prompt. It was the Pydantic model of what we want back.
That order matters for three reasons:

- **The schema is the contract between nodes.** Later, Scout will output `Candidate`s, Analyst
  will output `TechniqueCard`s, Critic will output `Critique`s. Each node can be built and tested
  alone because the shapes are fixed.
- **Validation catches model mistakes for free.** `hook: int = Field(ge=0, le=5)` means a score
  of 7 raises an error instead of silently polluting the knowledge base. `evidence: min_length=1`
  means an analysis with no citation is rejected before it is stored.
- **Code does arithmetic, the model does judgement.** `views_per_day` and `like_rate` are computed
  in `enrich()`, not asked of the model. Rule: if a value can be computed, compute it. Models are
  bad at numbers and great at reading.

Look at the output you got. Every `how_it_is_made` step the model was unsure about is prefixed
`likely:`, because the prompt asked for it and the Critic node will later check for it.

### 2. The provider adapter (`llm.py`)

LangChain's power is that everything speaks one interface: `Runnable`. A chat model is a
Runnable that takes messages and returns a message. If you implement `BaseChatModel._generate`,
you get for free: `|` composition, `with_structured_output`, batching, retries, and LangSmith
tracing.

`ClaudeCodeChatModel` is about 60 lines. It does three things:

1. Folds LangChain messages into the one system prompt and one user prompt the Agent SDK accepts.
2. Calls `claude_agent_sdk.query(...)` with `tools=[]` and `max_turns=1`, so it behaves as a pure
   model call rather than a coding agent. With `output_format={"type": "json_schema", ...}` the
   SDK enforces our schema server-side and hands back `structured_output`.
3. Wraps the result as an `AIMessage`, with cost and duration in `response_metadata`.

`get_model(role)` is the only function nodes call. Switch `LLM_PROVIDER` in `.env` and the same
code runs on an API key, Gemini, or Ollama. The `role` argument does nothing yet; in Milestone 3
it will route Triage to a cheaper model than Analyst.

Why this adapter and not a plain `anthropic` client? Because this environment has no API key, only
a logged-in CLI. Adapting whatever you have into the standard interface is the general skill.

### 3. The smallest chain (`m0_card_from_text.py`)

```python
prompt | model.with_structured_output(TechniqueCard)
```

That line is LangChain Expression Language (LCEL). `prompt` fills the template, `model` calls
Claude, the structured-output wrapper parses and validates. Each stage becomes a span in LangSmith
when tracing is on. `.with_config(run_name=...)` names the trace so you can find it.

## Run it yourself

```bash
cd animation-agent
cp .env.example .env            # defaults to the claude-code provider, no key needed
uv sync --extra dev
uv run pytest -q
ANIM_DEBUG=1 uv run anim card   # prints cost and duration to stderr
```

Then write your own description into a text file and run `uv run anim card my.txt`. Try a bad
description (two sentences, no metrics) and watch `confidence` drop and `open_questions` grow.

## Turn tracing on (free)

1. Sign up at smith.langchain.com, Developer plan, create an API key.
2. In `.env`: `LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY=...`.
3. Run `anim card` again and open the project `animation-agent`. You will see one parent run
   `m0_card_from_text` with children: prompt, `claude-code-agent-sdk`, `parse_TechniqueCard`.

Reading that trace is the habit this whole course is built on. Prompt debugging by `print` is
guesswork; prompt debugging by trace is engineering.

## What to notice about cost

The Agent SDK runs the Claude Code harness, so each call carries Claude Code's own context on
top of ours. Our call cost roughly what a few thousand input tokens plus a long structured output
cost on Opus. That is fine for an agent that analyses tens of items a week. In Milestone 3 we cap
how many items get deep analysis, and route cheap steps to a cheap model.

## Concepts you now own

| Concept | Where | Reusable for |
|---|---|---|
| Typed outputs with Pydantic | `schemas.py` | every agent you will ever build |
| Custom `BaseChatModel` | `llm.py` | plugging any model or internal API into LangChain |
| LCEL composition `prompt | model` | `m0_card_from_text.py` | all node internals |
| Config object instead of `os.environ` | `config.py` | provider and key switching |
| Compute in code, judge in model | `enrich()` | metrics, dates, IDs, dedupe keys |

Next: **Milestone 1** adds the first tool (`yt-dlp` search) and a small ReAct agent, so you see
the tool-calling loop before we replace it with an explicit graph in Milestone 2.
