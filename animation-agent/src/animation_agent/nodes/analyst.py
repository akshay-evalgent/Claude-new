"""Analyst: write a Technique Card for one candidate, or revise it from the Critic's feedback.

Since Milestone 3 this node runs inside the per-card subgraph (`card_pipeline.py`), once per
draft. The first time it writes from the source material; after a "revise" verdict it gets its
previous draft plus the Critic's issues and returns a corrected card.

After the model answers, `finalize()` overwrites every *fact* on the card (id, URL, title,
metrics, dates) with what the tools measured. The model judges; code copies facts.
"""
from __future__ import annotations

from pathlib import Path
from typing import Callable

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable

from ..llm import get_model
from ..progress import emit
from ..m0_card_from_text import enrich
from ..schemas import Candidate, Comment, Critique, TechniqueCard, Virality
from ..state import CardState

PROMPTS = Path(__file__).resolve().parents[1] / "prompts"
COMMENTS_PER_VIDEO = 15
NO_FRAMES_LINE = "Not available: video frames, audio and transcript. Judge visuals only from the text above."
WITH_FRAMES_LINE = ("Not available: audio and transcript. The visual notes below describe still frames sampled from "
                    "the first minute; motion and timing cannot be seen in stills.")
CODE_OWNED_FIELDS = {"id", "title", "source_urls", "virality", "first_seen", "last_updated"}


def source_material(c: Candidate, comments: list[Comment]) -> str:
    """Everything the Analyst may cite, as plain text. If it is not in here, it is a guess."""
    def n(value: int | None) -> str:
        return "unknown" if value is None else f"{value:,}"

    lines = [f'Video: "{c.title}"', f"URL: {c.url}"]
    if c.duration_s is not None:
        lines.append(f"Length: {c.duration_s} seconds")
    lines.append(f"Posted on {c.posted_on or 'an unknown date'} on YouTube by {c.channel or 'unknown'} "
                 f"({n(c.channel_followers)} followers).")
    lines.append(f"Metrics: {n(c.views)} views, {n(c.likes)} likes, {n(c.comments)} comments.")
    computed = {"views per day": c.views_per_day, "like rate": c.like_rate, "views per follower": c.views_per_follower}
    lines.append("Computed: " + ", ".join(f"{k} {v}" for k, v in computed.items() if v is not None))
    if c.tags:
        lines.append("Tags: " + ", ".join(c.tags))
    if c.description.strip():
        lines.append(f'Description by creator:\n"""\n{c.description.strip()}\n"""')
    if comments:
        lines.append("Top viewer comments, most liked first:")
        lines += [f'- "{cm.text}" ({cm.likes:,} likes{", by the creator" if cm.by_creator else ""})' for cm in comments]
    else:
        lines.append("No viewer comments were available.")
    lines.append(NO_FRAMES_LINE)
    return "\n".join(lines)


def finalize(card: TechniqueCard, c: Candidate) -> TechniqueCard:
    """Return a copy of the card with every fact replaced by what the tools measured.

    It copies rather than edits in place: parallel branches must never mutate an object another
    branch might hold. A test caught exactly that when two pipelines shared one fake card.
    """
    card = card.model_copy(deep=True)
    card.id = f"{c.platform}:{c.video_id}"
    card.title = c.title
    card.source_urls = [c.url]
    card.virality = Virality(
        views=c.views, likes=c.likes, comments=c.comments, posted_on=c.posted_on,
        creator_followers=c.channel_followers, spread=card.virality.spread, creator=c.channel,
    )
    for evidence in card.why_it_works.evidence:
        evidence.source_url = evidence.source_url or c.url   # all source material came from this page
    return enrich(card)                                       # computes views_per_day, like_rate, dates


def revision_note(draft: TechniqueCard, critique: Critique) -> str:
    """What the Analyst sees on a revision: its own draft and the issues to fix."""
    issues = "\n".join(f"{i}. [{x.field}] {x.problem} Fix: {x.fix}" for i, x in enumerate(critique.issues, 1))
    return (
        "\n\nA reviewer checked your previous draft against the source material and asked for changes."
        f"\n\nYOUR PREVIOUS DRAFT:\n{draft.model_dump_json(indent=1, exclude=CODE_OWNED_FIELDS)}"
        f"\n\nREVIEWER ISSUES (fix every one):\n{issues or '(none listed)'}"
        "\n\nChange only what the issues ask for and keep every other field as it was, so that fixing one "
        "thing does not break another. Return the complete corrected Technique Card, not only the changes."
    )


def build_analyst_chain() -> Runnable:
    prompt = ChatPromptTemplate.from_messages([
        ("system", (PROMPTS / "analyst.md").read_text()),
        ("human", "Analyse this animation and return a Technique Card.\n\nSOURCE MATERIAL:\n{source}{revision}"),
    ])
    return (prompt | get_model("analyst").with_structured_output(TechniqueCard)).with_config(run_name="analyst")


def make_analyst_node(chain: Runnable | None = None) -> Callable[[CardState], dict]:
    built: list[Runnable] = []                          # build the real chain once, on first use

    def analyst(state: CardState) -> dict:
        c = state["candidate"]
        attempt = state.get("attempts", 0) + 1
        draft, critique = state.get("draft"), state.get("critique")
        revision = revision_note(draft, critique) if draft is not None and critique is not None else ""
        if chain is None and not built:
            built.append(build_analyst_chain())
        try:
            card = (chain or built[0]).invoke({"source": state["source"], "revision": revision})
        except Exception as exc:                        # one bad draft must not sink the run
            return {"attempts": attempt, "failed": True,
                    "errors": [f"analyst: draft {attempt} for {c.video_id} failed: {type(exc).__name__}: {str(exc)[:300]}"]}
        # Progress for whoever streams with stream_mode="custom" (the CLI does). The draft itself is
        # private subgraph state, so it never appears in the main graph's "updates" stream.
        emit("analyst", c.title, f"draft {attempt}")
        return {"draft": finalize(card, c), "attempts": attempt}

    return analyst
