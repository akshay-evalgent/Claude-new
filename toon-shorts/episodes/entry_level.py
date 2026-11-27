"""Entry Level: a 30-40 s vertical comedy sketch.

Each beat is one shot. Keys:
  shot     "wide" | "two" | ("cu"|"mcu"|"ecu", who)
  say      (who, line)  -> TTS, lip-sync and caption; beat length follows the line
  dur      length in seconds for beats without a line (or a minimum)
  expr / pose / facing / x / visible   {who: value}, persists into later beats
  move     {who: (x_from, x_to, {t0, t1, ease, cadence, bob})} walk across the beat
  sfx      [(name, offset_s, gain)]  names in toon/audio.py SFX
  punch / shake / flash / push / pan   camera accents
  caption  override the on-screen text ("" hides it)
  card     full-screen title card text
"""

EPISODE = {
    "slug": "entry_level",
    "title": "When the job is 'entry level'",
    "thumb_at": 10.2,
    "brand": "Side Quest",
    "set": "office",
    "draw_order": ["boss", "applicant", "old"],
    "cast": {
        "applicant": {
            "look": dict(skin="#f3d2bd", hair="#e8843f", hair_style="spiky", eyes="#2f7d6d",
                         outfit="hoodie", outfit_color="#5b6ee1", inner_color="#f4f1ea"),
            "voice": dict(model="en_US-ryan-medium", speed=1.0),
            "start": dict(x=-420, facing=1, expr="happy", pose="rest"),
        },
        "boss": {
            "look": dict(skin="#c98e6a", hair="#2c2236", hair_style="bob", eyes="#7a3b2e",
                         outfit="blazer", outfit_color="#c0473f", inner_color="#fbf6ee", glasses=True),
            "voice": dict(model="en_US-amy-medium", speed=1.05),
            "start": dict(x=420, facing=-1, expr="smile", pose="mug"),
        },
        "old": {
            "look": dict(skin="#efc9b3", hair="#e8843f", hair_style="old", eyes="#2f7d6d",
                         outfit="hoodie", outfit_color="#7d83a8", inner_color="#e6e2da", old=True),
            "voice": dict(model="en_US-ryan-medium", speed=0.82, pitch=0.84, tempo_fix=1.06),
            "start": dict(x=-1600, facing=1, expr="tired", pose="cane", visible=False),
        },
    },
    "beats": [
        dict(shot="wide", say=("boss", "Congrats! This is an entry-level position."),
             push=1.05, sfx=[("pop", 0.05, 0.25)]),
        dict(shot=("cu", "applicant"), say=("applicant", "Perfect! I just graduated!"),
             expr={"applicant": "happy"}),
        dict(shot=("cu", "boss"), say=("boss", "Great. We just need five years of experience."),
             expr={"boss": "smug"}, push=1.08),
        dict(shot=("mcu", "applicant"), say=("applicant", "Five years?! In what?!"),
             expr={"applicant": "shocked"}, pose={"applicant": "shrug"},
             punch=0.16, shake=26, flash=True, pad=(0.05, 0.3),
             sfx=[("impact", 0.0, 0.7), ("whoosh", 0.0, 0.35)]),
        dict(shot=("cu", "boss"), say=("boss", "In this exact role."),
             expr={"boss": "unbothered"}),
        dict(shot="two", say=("applicant", "But you created this role yesterday."),
             expr={"applicant": "confused"}, pose={"applicant": "rest"}),
        dict(shot=("cu", "boss"), caption="*sips*", dur=1.3,
             expr={"boss": "sip"}, pose={"boss": "sip"}, sfx=[("sip", 0.2, 0.5)]),
        dict(shot=("cu", "boss"), say=("boss", "Exactly. So you're already behind."),
             expr={"boss": "unbothered"}, pose={"boss": "mug"}, push=1.06),
        dict(shot=("cu", "applicant"), say=("applicant", "Fine. I'll go get the experience."),
             expr={"applicant": "determined"}, pose={"applicant": "fist"},
             sfx=[("ding", 0.0, 0.25)]),
        dict(shot="wide", dur=1.6, caption="",
             facing={"applicant": -1}, pose={"applicant": "rest"},
             move={"applicant": (-420, -1500, dict(t0=0.1, t1=1.25, ease="in"))},
             sfx=[("steps", 0.05, 0.5), ("door", 1.35, 0.8)]),
        dict(shot="wide", dur=1.2, caption="*sips*",
             expr={"boss": "sip"}, pose={"boss": "sip"}, sfx=[("sip", 0.15, 0.45)]),
        dict(card="40 years later", dur=1.9, sfx=[("tick", 0.1, 0.5)]),
        dict(shot="wide", dur=2.4, caption="",
             expr={"boss": "unbothered", "old": "tired"}, pose={"boss": "mug"},
             visible={"applicant": False, "old": True},
             move={"old": (-1600, -420, dict(t0=0.25, t1=2.3, ease="out", cadence=5.0, bob=8))},
             sfx=[("creak", 0.0, 0.7), ("steps", 0.6, 0.35)]),
        dict(shot=("mcu", "old"), say=("old", "I'm back. I have forty years of experience now."),
             expr={"old": "proud"}, pose={"old": "wave"}),
        dict(shot=("cu", "boss"), say=("boss", "Wow. That's amazing."),
             expr={"boss": "smile"}),
        dict(shot=("cu", "boss"), say=("boss", "Unfortunately, we went with someone younger."),
             expr={"boss": "smug"}, push=1.1),
        dict(shot=("ecu", "old"), dur=2.9, caption="...",
             expr={"old": "dead"}, pose={"old": "cane"}, push=1.14,
             sfx=[("sad_trombone", 0.25, 0.55)]),
    ],
}
