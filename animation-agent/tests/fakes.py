"""Shared fakes for graph tests: YouTube data, scripted model chains, card builders."""
from datetime import date, timedelta
from typing import Any, Callable

from langchain_core.runnables import RunnableLambda

from animation_agent.schemas import (Candidate, Comment, Critique, Evidence, Issue, TechniqueCard, TriageJudgement,
                                     TriageVerdicts, Virality, WhyItWorks)

TODAY = date.today()


def cand(vid, views, days_old, title=None, followers=1_000):
    return Candidate(video_id=vid, url=f"https://www.youtube.com/watch?v={vid}", title=title or f"video {vid}",
                     channel="ch", views=views, likes=views // 20, comments=10, channel_followers=followers,
                     posted_on=TODAY - timedelta(days=days_old))


def card(quote="can't find the loop", **over) -> TechniqueCard:
    """What a model might return: plausible judgement, plus facts that are wrong on purpose."""
    base = dict(
        title="a paraphrased title", source_urls=["https://made-up.example"], style_family="stop_motion",
        sub_style="clay loop", summary="s", how_it_is_made=["likely: shot on twos"], difficulty=3,
        time_to_reproduce="1 day", confidence=0.7, virality=Virality(views=1, likes=999_999),
        why_it_works=WhyItWorks(hook=3, timing_easing=3, principles=3, loop_quality=4, sound_sync=0,
                                mobile_readability=3, novelty_vs_familiarity=3, emotional_driver=3,
                                process_reveal=0, production_signal=3,
                                evidence=[Evidence(claim="viewers love the loop", quote=quote)]),
    )
    base.update(over)
    return TechniqueCard(**base)


def approve(confidence=0.55) -> Critique:
    return Critique(verdict="approve", confidence=confidence, summary="fine")


def revise(problem="score too high", confidence=0.4) -> Critique:
    return Critique(verdict="revise", confidence=confidence, summary="needs work",
                    issues=[Issue(field="why_it_works.hook", problem=problem, fix="lower it")])


def scripted(*replies: Any, calls: list | None = None):
    """A chain that returns replies in order (the last repeats) and records every input."""
    queue = list(replies)
    seen = calls if calls is not None else []

    def run(inp):
        seen.append(inp)
        reply = queue.pop(0) if len(queue) > 1 else queue[0]
        if isinstance(reply, Exception):
            raise reply
        return reply(inp) if callable(reply) else reply

    chain = RunnableLambda(run)
    chain.calls = seen  # type: ignore[attr-defined]
    return chain


def judge(decisions: dict[str, tuple[bool, int]]):
    """Fake Triage model: {video_id: (is_animation, interest)}."""
    return RunnableLambda(lambda inp: TriageVerdicts(decisions=[
        TriageJudgement(video_id=v, is_animation=a, interest=i, reason=f"reason for {v}") for v, (a, i) in decisions.items()
    ]))


def comments_ok(vid, n):
    return [Comment(text="can't find the loop", likes=120)]
