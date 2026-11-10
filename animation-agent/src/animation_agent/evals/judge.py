"""LLM-as-judge rubric for cards, and a labelling helper for Triage drafts.

Lesson: a judge is a prompt like any other, so it gets the same discipline: a fixed rubric with
anchored scores, the source material to check against, a short rationale, and structured output.
The judge uses the strong model; the thing being judged may use any model.
"""
from __future__ import annotations

from pathlib import Path

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable
from pydantic import BaseModel, Field

from ..llm import get_model

PROMPTS = Path(__file__).resolve().parents[1] / "prompts"


class JudgeScores(BaseModel):
    groundedness: int = Field(ge=1, le=5, description="5: every claim is supported by the source; 1: invents facts.")
    specificity: int = Field(ge=1, le=5, description="5: concrete, technique-level detail; 1: generic filler.")
    usefulness: int = Field(ge=1, le=5, description="5: a motion designer could act on it; 1: nothing to learn.")
    calibration: int = Field(ge=1, le=5, description="5: confidence and 'likely:' marks match what the source supports; 1: overconfident.")
    rationale: str = Field(description="Two sentences: the biggest strength and the biggest problem.")


class TriageLabel(BaseModel):
    video_id: str
    is_animation: bool
    worth_card: bool = Field(description="True if a motion designer could learn a nameable technique from it.")


class TriageLabels(BaseModel):
    labels: list[TriageLabel]


def build_judge_chain() -> Runnable:
    prompt = ChatPromptTemplate.from_messages([
        ("system", (PROMPTS / "judge.md").read_text()),
        ("human", "SOURCE MATERIAL:\n{source}\n\nTECHNIQUE CARD:\n{card}"),
    ])
    return (prompt | get_model("judge").with_structured_output(JudgeScores)).with_config(run_name="eval_judge")


def build_label_chain() -> Runnable:
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You label YouTube videos for an animation research desk. For each video decide: is it mainly "
                   "animation (tutorials and breakdowns of animation count; live action, gameplay, slideshows and "
                   "commentary do not), and is it worth a full Technique Card, meaning a motion designer could learn "
                   "a nameable technique or style from it. Generic, mass-produced or template content is not worth a "
                   "card. Judge only from the metadata. Return one label per video_id."),
        ("human", "{videos}"),
    ])
    return (prompt | get_model("judge").with_structured_output(TriageLabels)).with_config(run_name="eval_label")
