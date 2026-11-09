"""The data the agent produces. Schemas come before prompts.

Lesson: an LLM that returns free text is a chat bot. An LLM that must fill a typed
schema is a component you can store, query, test, and chain. Every node in the graph
reads and writes these objects, so this file is the contract for the whole system.
"""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl

StyleFamily = Literal[
    "2d_hand_drawn",
    "2d_vector",
    "motion_graphics",
    "3d",
    "stop_motion",
    "mixed_media",
    "pixel_retro",
    "generative_realtime",
    "ui_micro_interaction",
    "ai_generated",
    "abstract_experimental",
    "code_driven",          # Remotion, Manim, p5.js, CSS/SVG, Three.js: animation written as code
]

Difficulty = Literal[1, 2, 3, 4, 5]


class Evidence(BaseModel):
    """A claim is only as good as its citation. Every 'why it works' point carries one."""

    claim: str = Field(description="One specific, checkable statement.")
    quote: str = Field(description="Short verbatim quote or concrete observation from the source that supports the claim.")
    source_url: str | None = Field(default=None, description="Where the quote came from, if known.")


class WhyItWorks(BaseModel):
    """Scores 0-5 on the ten dimensions from PLAN.md, each backed by evidence."""

    hook: int = Field(ge=0, le=5, description="Strength of the first 0.5-2 seconds.")
    timing_easing: int = Field(ge=0, le=5)
    principles: int = Field(ge=0, le=5, description="Use of classical and modern animation principles.")
    loop_quality: int = Field(ge=0, le=5)
    sound_sync: int = Field(ge=0, le=5)
    mobile_readability: int = Field(ge=0, le=5)
    novelty_vs_familiarity: int = Field(ge=0, le=5, description="5 = fresh twist on a known format.")
    emotional_driver: int = Field(ge=0, le=5)
    process_reveal: int = Field(ge=0, le=5, description="Before/after, breakdown, tool reveal.")
    production_signal: int = Field(ge=0, le=5, description="Reproducibility for a solo creator.")
    evidence: list[Evidence] = Field(min_length=1, description="At least one evidence item per non-zero score worth explaining.")


class Virality(BaseModel):
    views: int | None = None
    likes: int | None = None
    comments: int | None = None
    posted_on: date | None = None
    creator_followers: int | None = None
    views_per_day: float | None = Field(default=None, description="views / days since posted. Computed by code, not the model.")
    like_rate: float | None = Field(default=None, description="likes / views. Computed by code.")
    spread: list[str] = Field(default_factory=list, description="Other platforms or sources where this item appeared.")


class TechniqueCard(BaseModel):
    """One analysed animation item. The core unit of the knowledge base."""

    title: str
    source_urls: list[str] = Field(default_factory=list)
    style_family: StyleFamily
    sub_style: str = Field(description="Free text, e.g. 'kinetic typography with grain', 'claymation loop'.")
    tags: list[str] = Field(default_factory=list, max_length=12)
    tools: list[str] = Field(default_factory=list, description="Software or models used, if stated or clearly inferable.")
    summary: str = Field(description="2-4 sentences. What it is and why someone would care.")
    how_it_is_made: list[str] = Field(description="Ordered steps a motion designer could follow. Mark guesses with 'likely:'.")
    why_it_works: WhyItWorks
    virality: Virality = Field(default_factory=Virality)
    difficulty: Difficulty
    time_to_reproduce: str = Field(description="Rough estimate for a competent solo creator, e.g. '2-4 hours'.")
    open_questions: list[str] = Field(default_factory=list, description="What the analyst could not determine from the source.")
    confidence: float = Field(ge=0, le=1, description="Set low when the source is thin. The Critic node adjusts this later.")

    # Bookkeeping, filled by code not by the model.
    first_seen: date | None = None
    last_updated: date | None = None
