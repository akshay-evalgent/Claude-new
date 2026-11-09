"""Milestone 0: one model call that turns a description into a validated TechniqueCard.

Run:  uv run python -m animation_agent.m0_card_from_text
      uv run python -m animation_agent.m0_card_from_text path/to/description.txt
"""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

from langchain_core.prompts import ChatPromptTemplate

from .llm import get_model
from .schemas import TechniqueCard

PROMPTS = Path(__file__).parent / "prompts"

SAMPLE = """
Video: "I animated my coffee order as a 6-second loop" (vertical, 1080x1920, 6s, loops seamlessly)
Posted 9 days ago on YouTube Shorts. 2.1M views, 184k likes, 3.2k comments. Creator has 41k subscribers.
Description by creator: "Made in After Effects + a bit of Blender for the cup. Every pour is timed to the
beat of the sound (coffee drip foley + lo-fi beat). The liquid is 2D cel with 3 frame smears, cup is 3D
toon-shaded. Loop point is hidden on the splash frame. Took me 14 hours."
Top comments: "the way the drip lands exactly on the beat is so satisfying" (12k likes), "I've watched this
40 times and can't find the loop" (8k likes), "tutorial please" (6k likes), "the paper grain texture is doing a lot".
"""


def build_chain():
    """Prompt -> model -> validated TechniqueCard.

    This is the smallest LangChain pipeline (LCEL). `|` composes runnables. LangSmith
    traces every stage automatically when LANGSMITH_TRACING=true.
    """
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", (PROMPTS / "analyst.md").read_text()),
            ("human", "Analyse this animation and return a Technique Card.\n\nSOURCE MATERIAL:\n{description}"),
        ]
    )
    model = get_model("analyst").with_structured_output(TechniqueCard)
    return (prompt | model).with_config(run_name="m0_card_from_text")


def enrich(card: TechniqueCard) -> TechniqueCard:
    """Numbers the model should not be trusted to compute: do them in code."""
    v = card.virality
    if v.views and v.posted_on:
        days = max((date.today() - v.posted_on).days, 1)
        v.views_per_day = round(v.views / days, 1)
    if v.views and v.likes:
        v.like_rate = round(v.likes / v.views, 4)
    card.first_seen = card.first_seen or date.today()
    card.last_updated = date.today()
    return card


def main() -> None:
    description = Path(sys.argv[1]).read_text() if len(sys.argv) > 1 else SAMPLE
    card = build_chain().invoke({"description": description})
    card = enrich(card)
    print(card.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
