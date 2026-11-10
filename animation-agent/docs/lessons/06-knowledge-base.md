# Lesson 6 — The knowledge base: questions answered with citations

What shipped: every card is now indexed in a local Chroma collection, and `anim ask "..."`
answers questions from the cards, citing each one. The Librarian indexes new cards as it saves
them, and `anim index --rebuild` rebuilds the index from `anim.db`. 72 tests pass.

```text
START -> plan -> retrieve --(no cards found)--> END
                    |
                    v
                  answer -> END            (qa_graph.py, a second, separate graph)
```

## The three ideas in this milestone

### 1. Vectors find what sounds similar; filters enforce what must be true (`kb.py`)

Each card is stored once in Chroma, in two forms. The **document** (title, style, summary, steps,
evidence claims) is embedded by Chroma's built-in local model, all-MiniLM-L6-v2, so no embedding
API key is needed. The **metadata** (style family, difficulty, confidence, approval, views per day,
posting date, tools) is stored as plain fields. A query filters on the metadata exactly and only
then ranks the survivors by similarity. "Easy 3D ideas" must never return a hard 2D card just
because the words are close.

Numbers stay out of the embedded text. A vector cannot compare 2 and 4; a filter can.

### 2. Let a cheap model write the filters (`qa_graph.py`, plan node)

The question is free text; the filters must be exact. The `plan` node asks Haiku for a `QueryPlan`:
the text to embed, plus filters set only when the question clearly demands them. This is the
"self-query" pattern. The prompt warns that a filter removes cards, so a passing mention ("like the
3D one") must not become a constraint. `--no-plan` skips the step and searches the raw question.

Retrieval then relaxes filters when they leave fewer than two cards, always in the same order:
tools, difficulty, style, approval. The answer is told which filters were dropped. In the live test
"Easy motion graphics ideas made in After Effects" had to drop the tools and difficulty filters,
because no card lists After Effects, and the answer said exactly that instead of pretending.

Tools are matched in code rather than by Chroma, because a card has several tools and a substring
match on a lowercase list is simpler and more reliable than a metadata filter.

### 3. Citation discipline, enforced in code (`check_citations`)

The answer model gets the cards numbered [1] to [n] and must cite a number for every factual
sentence. It returns a `CitedAnswer`: the Markdown answer plus an `insufficient` flag for when the
cards do not answer the question. Then code checks the citations:

- a number that matches no retrieved card is removed from the text and reported;
- an answer that cites nothing, without saying the cards were insufficient, is flagged as
  unsupported;
- if retrieval finds no cards, the answer model is never called.

The Sources list printed under the answer comes from code, from the cards themselves, so its
titles and links cannot be wrong. The pattern is the same as every milestone since 2: the model
judges, code copies facts.

## Run it yourself

```bash
cd animation-agent
uv sync --extra dev
uv run pytest -q
uv run anim index --rebuild
uv run anim ask "Which stop motion techniques could a solo creator try?"
uv run anim ask "Easy motion graphics ideas made in After Effects"     # watch the filters relax
uv run anim ask "What made the hand-drawn 2D pieces work, and how confident are we?"
uv run anim ask "kinetic typography" --no-plan
```

The first `ask` or `index` downloads the 80 MB embedding model once; after that it runs offline.

## What the live questions showed

Three questions over the 12 cards in the knowledge base cost about $0.07 each: Haiku for the plan,
under a tenth of a cent, and one Opus call for the answer. Every answer cited only retrieved cards,
and each one said how far to trust it. The stop-motion answer, for example, warned that its most
practical lead had confidence 0.30 and might be digital 3D rather than real stop motion. One answer
ended by advising a search that had already failed; the prompt now suggests researching the
missing topic with `anim run -q "<topic>"` instead.

## Concepts you now own

| Concept | Where | Reusable for |
|---|---|---|
| Documents for meaning, metadata for exact filters | `kb.card_document`, `kb.card_metadata` | any RAG system |
| Local embeddings, no API key | `KnowledgeBase` | free, private retrieval |
| Self-query: a model writes the filters | `QueryPlan`, plan node | turning questions into structured searches |
| Ordered filter relaxation, reported to the answer | `retrieve_cards` | graceful "no exact match" behaviour |
| Citations checked in code | `check_citations` | trustworthy answers |
| Keeping an index in sync from the writer | Librarian | search over data that changes |

Next: **Milestone 7** adds a Synthesizer that reads across many cards, finds trends with evidence
counts, keeps the style taxonomy up to date, and feeds the digest.
