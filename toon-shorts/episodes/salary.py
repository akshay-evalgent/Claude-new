"""Salary: same cast and office as Entry Level. Ends on a pan to the poster."""
import copy
import importlib.util
import os

_spec = importlib.util.spec_from_file_location("entry_level", os.path.join(os.path.dirname(__file__), "entry_level.py"))
_el = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_el)

CAST = copy.deepcopy(_el.EPISODE["cast"])
CAST.pop("old")
CAST["applicant"]["start"].update(expr="neutral")

EPISODE = {
    "slug": "salary",
    "title": "Negotiating your first salary",
    "brand": "Side Quest",
    "set": "office",
    "draw_order": ["boss", "applicant"],
    "thumb_at": 6.0,
    "cast": CAST,
    "beats": [
        dict(shot="wide", say=("boss", "So. What salary are you expecting?"), push=1.05),
        dict(shot=("cu", "applicant"), say=("applicant", "Um... sixty thousand?"),
             expr={"applicant": "confused"}, pose={"applicant": "think"}),
        dict(shot=("cu", "boss"), caption="*sips*", dur=1.3,
             expr={"boss": "sip"}, pose={"boss": "sip"}, sfx=[("sip", 0.2, 0.5)]),
        dict(shot=("cu", "boss"), say=("boss", "We were thinking more like... exposure."),
             expr={"boss": "smug"}, pose={"boss": "mug"}, push=1.08),
        dict(shot=("mcu", "applicant"), say=("applicant", "Exposure?!"),
             expr={"applicant": "shocked"}, pose={"applicant": "shrug"},
             punch=0.16, shake=26, flash=True, pad=(0.05, 0.35),
             sfx=[("impact", 0.0, 0.7), ("whoosh", 0.0, 0.35)]),
        dict(shot=("cu", "boss"), say=("boss", "It's like money. But you can't spend it."),
             expr={"boss": "smile"}),
        dict(shot="two", say=("applicant", "Can I at least pay rent with it?"),
             expr={"applicant": "annoyed"}, pose={"applicant": "rest"}),
        dict(shot=("cu", "boss"), say=("boss", "Can you pay rent with money?"),
             expr={"boss": "unbothered"}, push=1.07),
        dict(shot=("ecu", "applicant"), dur=1.6, caption="...",
             expr={"applicant": "dead"}, push=1.08),
        dict(shot=("cu", "applicant"), say=("applicant", "...Fair point."),
             expr={"applicant": "dead"}),
        dict(shot="wide", say=("boss", "Welcome to the family!"), dur=4.2,
             expr={"boss": "proud", "applicant": "dead"}, pose={"boss": "shrug"},
             pan=(1050, -800), pan_delay=1.7, push=1.6, rack_focus=True,
             sfx=[("whoosh", 1.7, 0.3), ("ding", 3.3, 0.4)]),
    ],
}
