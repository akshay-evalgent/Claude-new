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
from typing import Annotated, TypedDict

from .schemas import Candidate, TechniqueCard


class RunInput(TypedDict, total=False):
    """What a caller may pass in. Every field is optional; Scout fills in defaults."""

    queries: list[str]          # default: the YouTube queries in sources.yaml
    uploaded_within: str        # default: "month"
    max_cards: int              # how many candidates the Analyst turns into cards (default 3)
    stats_budget: int           # how many search hits get full stats (default 12)
    run_id: str
    started_at: str


class RunState(RunInput, total=False):
    candidates: list[Candidate]                             # Scout writes; replaced, not appended
    cards: Annotated[list[TechniqueCard], operator.add]     # Analyst appends
    errors: Annotated[list[str], operator.add]              # any node appends
    saved: list[str]                                        # Librarian: ids of cards written
