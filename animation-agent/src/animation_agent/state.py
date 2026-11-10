"""The graph's shared state: one typed dict that every node reads and writes.

Lesson: in LangGraph a node is a plain function `state -> partial update`. It returns only the
keys it changed, never the whole state. For each key, a *reducer* decides how an update merges
with the value already there:

- no reducer: the update replaces the old value (last write wins);
- `Annotated[list, operator.add]`: the update is appended to the old list.

`errors` uses the append reducer, so Scout and Analyst can both report problems and neither
erases the other's. `cards` uses it too. That does not matter while one Analyst writes all the
cards, but in Milestone 3 several Analysts run in parallel and each returns its own card: with
the append reducer they all land, without it only the last one would survive.
"""
from __future__ import annotations

import operator
from typing import Annotated, NotRequired, TypedDict

from .schemas import Candidate, Critique, Review, TechniqueCard, Trend, TriageDecision


class RunInput(TypedDict, total=False):
    """What a caller may pass in. Every field is optional; Scout fills in defaults."""

    queries: list[str]          # default: the YouTube queries in sources.yaml
    uploaded_within: str        # default: "month"
    max_cards: int              # how many candidates Triage may send for analysis (default 3)
    stats_budget: int           # how many search hits get full stats (default 20)
    include_seen: bool          # ignore long-term memory and reconsider videos seen before
    frames_per_run: int         # how many of the selected candidates get frames sampled (default from .env)
    run_id: str
    started_at: str


class RunState(RunInput, total=False):
    candidates: list[Candidate]                             # Scout writes; replaced, not appended
    already_seen: list[str]                                 # Scout: hits dropped because memory knew them
    triage: list[TriageDecision]                            # Triage: one decision per candidate
    selected: list[Candidate]                               # Triage: the ones sent for analysis
    cards: Annotated[list[TechniqueCard], operator.add]     # each parallel card pipeline appends one
    reviews: Annotated[list[Review], operator.add]          # ...and its Critic review
    sources: Annotated[list[dict], operator.add]            # ...and the source material it was written from
    errors: Annotated[list[str], operator.add]              # any node appends
    saved: list[str]                                        # Librarian: ids of cards written
    trends: list[Trend]                                     # Synthesizer: trends across recent cards
    trend_changes: dict[str, list[str]]                     # Synthesizer: new, growing, fading, dropped
    new_styles: list[str]                                   # Synthesizer: sub-styles added to the taxonomy
    digest: str                                             # Reporter: current draft, as Markdown
    digest_round: int                                       # Reporter: drafts written so far
    digest_feedback: str | None                             # human: last revision request
    digest_status: str                                      # human: approved, edited or rejected
    review_note: str | None                                 # why the last answer was not accepted
    digest_path: str                                        # Publish: where the file went
    deliveries: list[dict]                                  # Publish: per channel, ok or why not


# ---- The per-card subgraph (Milestone 3) ----------------------------------------------------
# Each selected candidate gets its own copy of this state, so parallel pipelines never see each
# other's drafts. Only the output keys flow back to RunState, where the append reducers merge them.

class CardInput(TypedDict):
    candidate: Candidate
    visual: NotRequired[bool]                       # sample frames for this one (top candidates only)


class CardOutput(TypedDict, total=False):
    cards: Annotated[list[TechniqueCard], operator.add]
    reviews: Annotated[list[Review], operator.add]
    sources: Annotated[list[dict], operator.add]            # {"card_id", "source"}: frozen eval inputs
    errors: Annotated[list[str], operator.add]


class CardState(CardInput, CardOutput, total=False):
    source: str                                     # the text every claim must come from
    draft: TechniqueCard | None                     # latest Analyst draft
    critique: Critique | None                       # latest Critic verdict
    attempts: int                                   # drafts written so far
    history: Annotated[list[str], operator.add]     # one line per Critic round
    failed: bool                                    # a revision failed; keep the last good draft
