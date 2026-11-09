from datetime import date

import pytest
from pydantic import ValidationError

from animation_agent.m0_card_from_text import enrich
from animation_agent.schemas import Evidence, TechniqueCard, Virality, WhyItWorks


def _card(**over):
    base = dict(
        title="t", style_family="motion_graphics", sub_style="s", summary="x",
        how_it_is_made=["a"], difficulty=2, time_to_reproduce="1h", confidence=0.4,
        why_it_works=WhyItWorks(hook=4, timing_easing=3, principles=2, loop_quality=5, sound_sync=4,
                                mobile_readability=4, novelty_vs_familiarity=3, emotional_driver=4,
                                process_reveal=1, production_signal=3,
                                evidence=[Evidence(claim="c", quote="q")]),
    )
    base.update(over)
    return TechniqueCard(**base)


def test_scores_are_bounded():
    with pytest.raises(ValidationError):
        WhyItWorks(hook=6, timing_easing=0, principles=0, loop_quality=0, sound_sync=0, mobile_readability=0,
                   novelty_vs_familiarity=0, emotional_driver=0, process_reveal=0, production_signal=0,
                   evidence=[Evidence(claim="c", quote="q")])


def test_enrich_computes_metrics_in_code():
    c = _card(virality=Virality(views=1000, likes=100, posted_on=date.today()))
    c = enrich(c)
    assert c.virality.views_per_day == 1000.0
    assert c.virality.like_rate == 0.1
    assert c.last_updated == date.today()
