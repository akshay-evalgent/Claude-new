"""Critic: check a draft card against its source material, then approve it or send it back.

Lesson: verify in code whatever code can verify, and spend a model only on the rest. Whether an
evidence quote really appears in the source is a string search, so `unverified_quotes()` does it
for free and cannot be talked out of it. Whether the quote *supports the claim*, whether scores
are inflated, whether guesses are marked "likely:" needs reading, so the strong model does that.
Code findings are passed to the model and also force a "revise" verdict on their own.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Callable

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable

from ..llm import get_model
from ..progress import emit
from ..schemas import Critique, Issue, TechniqueCard
from ..state import CardState
from .analyst import CODE_OWNED_FIELDS

PROMPTS = Path(__file__).resolve().parents[1] / "prompts"
MAX_REVISIONS = 2          # so at most 1 + 2 = 3 drafts per card

_QUOTE_CHARS = str.maketrans({"’": "'", "‘": "'", "`": "'", "´": "'", "“": '"', "”": '"'})
_FRAGMENT_SPLIT = re.compile(r"\s*(?:\.\.\.|…|\s/\s)\s*")
_LIKES_SUFFIX = re.compile(r"\(\s*[\d.,]+\s*k?\s*likes?[^)]*\)\s*$", re.IGNORECASE)
MIN_FRAGMENT = 6


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.translate(_QUOTE_CHARS).lower()).strip()


def quote_in_source(quote: str, source: str) -> bool:
    """True if every meaningful fragment of the quote appears in the source.

    Quotes may join fragments with "..." or " / " and may end with "(1,234 likes)"; those are
    split off. Case, curly quotes and whitespace are ignored. Nothing else is forgiven.
    """
    haystack = _normalize(source)
    for fragment in _FRAGMENT_SPLIT.split(quote):
        fragment = _normalize(_LIKES_SUFFIX.sub("", fragment).strip(" \"'.,;:-–—"))
        if len(fragment) >= MIN_FRAGMENT and fragment not in haystack:
            return False
    return True


def unverified_quotes(card: TechniqueCard, source: str) -> list[Issue]:
    return [
        Issue(field=f"why_it_works.evidence[{i}]",
              problem=f'Quote not found in the source material: "{e.quote[:150]}"',
              fix="Replace it with a quote copied exactly from the source material, or remove this evidence item.")
        for i, e in enumerate(card.why_it_works.evidence)
        if not quote_in_source(e.quote, source)
    ]


def build_critic_chain() -> Runnable:
    prompt = ChatPromptTemplate.from_messages([
        ("system", (PROMPTS / "critic.md").read_text()),
        ("human", "SOURCE MATERIAL:\n{source}\n\nTECHNIQUE CARD TO REVIEW:\n{card}\n\n"
                  "AUTOMATED CHECKS:\n{findings}\n\nPREVIOUS ROUND:\n{previous}"),
    ])
    return (prompt | get_model("critic").with_structured_output(Critique)).with_config(run_name="critic")


def previous_round(critique: Critique | None) -> str:
    """Give the Critic a memory of its last verdict, so revisions converge instead of oscillating."""
    if critique is None:
        return "This is the first review of this card."
    asked = "\n".join(f"{i}. [{x.field}] {x.problem}" for i, x in enumerate(critique.issues, 1))
    return ("This is a revised draft. Last round you asked for these fixes:\n" + asked +
            "\nCheck each one first. Raise a new issue only if it would mislead a reader, including a "
            "problem the revision itself introduced.")


def make_critic_node(chain: Runnable | None = None) -> Callable[[CardState], dict]:
    built: list[Runnable] = []

    def critic(state: CardState) -> dict:
        card, rnd = state["draft"], state.get("attempts", 1)
        findings = unverified_quotes(card, state["source"])
        findings_text = ("\n".join(f"- {f.field}: {f.problem}" for f in findings)
                         or "All evidence quotes were found in the source material.")
        if chain is None and not built:
            built.append(build_critic_chain())
        try:
            critique: Critique = (chain or built[0]).invoke({
                "source": state["source"],
                "card": card.model_dump_json(indent=1, exclude=CODE_OWNED_FIELDS),
                "findings": findings_text,
                "previous": previous_round(state.get("critique")),
            })
        except Exception as exc:
            return {"critique": None, "history": [f"round {rnd}: critic failed"],
                    "errors": [f"critic: review of {card.id} failed: {type(exc).__name__}: {str(exc)[:300]}"]}
        if findings:                                    # code findings cannot be overruled
            flagged = {f.field for f in findings}
            critique = critique.model_copy(update={
                "verdict": "revise",
                "issues": findings + [i for i in critique.issues if i.field not in flagged],
            })
        line = (f"round {rnd}: {critique.verdict}, {len(critique.issues)} issues, "
                f"confidence {critique.confidence:.2f}. {critique.summary}")
        emit("critic", card.title, line)
        return {"critique": critique, "history": [line]}

    return critic


def route_after_critic(state: CardState) -> str:
    """The bounded loop. Back to the Analyst only while there is a reason and budget for it."""
    critique = state.get("critique")
    if critique is None or critique.verdict == "approve":
        return "accept"
    if state.get("attempts", 0) > MAX_REVISIONS:
        return "accept"                                 # out of revisions: keep it, flagged
    return "analyst"
