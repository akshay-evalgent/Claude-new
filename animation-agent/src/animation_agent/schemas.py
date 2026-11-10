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
    quote: str = Field(description="Short verbatim quote copied exactly from the source material that supports the claim. "
                                   "No paraphrase: the Critic checks it word for word.")
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
    id: str | None = Field(default=None, description="Stable key such as 'youtube:<video id>'. Set by code.")
    first_seen: date | None = None
    last_updated: date | None = None


class Candidate(BaseModel):
    """A video a tool found. Metadata only: we never store the media itself.

    Milestone 1 tools return these. In Milestone 2 the Scout node outputs a list of them
    and Triage ranks them, so the shape is fixed now even though only YouTube fills it.
    """

    platform: str = "youtube"
    video_id: str
    url: str
    title: str
    channel: str | None = None
    channel_followers: int | None = None
    posted_on: date | None = None
    duration_s: int | None = None
    views: int | None = None
    likes: int | None = None
    comments: int | None = None
    tags: list[str] = Field(default_factory=list)
    description: str = ""
    found_by: list[str] = Field(default_factory=list, description="Search queries that surfaced this video.")

    # Computed by code in `with_metrics()`, never asked of the model.
    views_per_day: float | None = None
    like_rate: float | None = None
    comment_rate: float | None = None
    views_per_follower: float | None = Field(
        default=None, description="views / channel followers. Above 1 means the video outgrew its channel: a strong viral signal."
    )

    def with_metrics(self, today: date | None = None) -> "Candidate":
        """Fill the ratio fields from the raw counts. Same rule as M0's `enrich()`: compute, don't ask."""
        today = today or date.today()
        if self.views is not None and self.posted_on:
            self.views_per_day = round(self.views / max((today - self.posted_on).days, 1), 1)
        if self.views:
            if self.likes is not None:
                self.like_rate = round(self.likes / self.views, 4)
            if self.comments is not None:
                self.comment_rate = round(self.comments / self.views, 5)
            if self.channel_followers:
                self.views_per_follower = round(self.views / self.channel_followers, 2)
        return self


class Comment(BaseModel):
    """A viewer comment. The best evidence for 'why it works' is what viewers say they love."""

    text: str
    likes: int = 0
    by_creator: bool = False


# ---- Milestone 3: Triage and Critic ---------------------------------------------------------

class TriageJudgement(BaseModel):
    """The model's call on one video. Popularity is scored separately, in code."""

    video_id: str
    is_animation: bool = Field(description="True if the video itself is mainly animation, including tutorials and breakdowns that show animation being made.")
    interest: int = Field(ge=0, le=5, description="How much a motion designer could learn from it. 5 = a clear, nameable technique with visible craft; 1 = generic or mass-produced.")
    reason: str = Field(description="One sentence naming what is, or is not, worth studying.")


class TriageVerdicts(BaseModel):
    decisions: list[TriageJudgement]


class TriageDecision(TriageJudgement):
    """A judgement plus the numbers code adds to it."""

    title: str = ""
    viral_score: float = Field(default=0.0, description="0-5, from views per day and views per follower ranked within the batch.")
    priority: float = Field(default=0.0, description="0.7 x interest + 0.3 x viral_score.")
    selected: bool = False


class Issue(BaseModel):
    field: str = Field(description="Where the problem is, e.g. 'why_it_works.hook', 'how_it_is_made[2]', 'tools', 'evidence[1]'.")
    problem: str
    fix: str = Field(description="What the analyst should change.")


class Critique(BaseModel):
    """The Critic's verdict on one draft card."""

    verdict: Literal["approve", "revise"] = Field(description="approve when nothing on the card would mislead a reader; revise otherwise.")
    issues: list[Issue] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1, description="How far a reader can trust this card, given what the source material can support.")
    summary: str = Field(description="One sentence.")


class Review(BaseModel):
    """What the Critic loop concluded about one card. Stored next to the card."""

    card_id: str
    rounds: int = Field(description="How many drafts the Analyst wrote.")
    approved: bool
    confidence: float | None = None
    issues: list[Issue] = Field(default_factory=list, description="Unresolved issues; empty when approved.")
    history: list[str] = Field(default_factory=list, description="One line per Critic round.")
