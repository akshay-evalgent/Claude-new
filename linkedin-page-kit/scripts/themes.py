"""Six brand directions. Each theme drives logo, banner and carousel rendering."""
from PIL import ImageFont
import os

INTER = "/usr/share/fonts/opentype/inter/"
MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-{w}.ttf"
SERIF = "/usr/share/fonts/truetype/crosextra/Caladea-{w}.ttf"
SYM = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def _inter(w, s, display=False):
    return ImageFont.truetype(f"{INTER}{'InterDisplay' if display else 'Inter'}-{w}.otf", s)
def _mono(w, s):
    return ImageFont.truetype(MONO.format(w=w), s)
def _serif(w, s):
    p = SERIF.format(w=w)
    return ImageFont.truetype(p, s) if os.path.exists(p) else _inter("Bold", s, True)
def _sym(s):
    return ImageFont.truetype(SYM, s)

ACTIVE = "signal"   # the brand every script renders with; change here to re-skin everything

THEMES = {
  "ledger": dict(
    name="Remote Ledger", handle="remoteledger", tagline="Remote work for clients abroad, checked for India.",
    promise="Roles and requests open to India, the real rate behind the advertised one, and how to get paid without losing 6% of it.",
    bg=(250,249,245), bg2=(255,255,255), ink=(18,22,30), muted=(112,114,112), accent=(16,133,84), strike=(200,60,50), rule=(212,208,198),
    display=lambda s,w="SemiBold": _inter(w,s,True), body=lambda s,w="Regular": _inter(w,s), mono=lambda s,w="Medium": _mono(w,s), sym=_sym,
    style="minimal-light"),
  "signal": dict(
    name="Founder Signal", handle="thefoundersignal", tagline="AI news, tool swaps and thought experiments for people building companies.",
    promise="What happened in AI today, the cheaper tool that does the job, and the question every founder should sit with this week.",
    bg=(246,245,240), bg2=(255,255,255), ink=(17,17,17), muted=(120,120,115), accent=(43,76,255), strike=(200,60,50), rule=(214,212,204),
    display=lambda s,w="SemiBold": _inter(w,s,True), body=lambda s,w="Regular": _inter(w,s), mono=lambda s,w="Medium": _mono(w,s), sym=_sym,
    style="minimal-light"),
  "signal_teardown": dict(
    name="Founder Signal", handle="thefoundersignal", tagline="The Swap. One paid tool, one free way to do the job.",
    promise="Weekly editorial comparison of a paid tool and the free or open-source way to do the same job.",
    bg=(246,245,240), bg2=(255,255,255), ink=(17,17,17), muted=(120,120,115), accent=(200,48,40), strike=(200,48,40), rule=(214,212,204),
    display=lambda s,w="Bold": _serif(w,s), body=lambda s,w="Regular": _inter(w,s), mono=lambda s,w="Medium": _mono(w,s), sym=_sym,
    style="editorial-light"),
  "lean": dict(
    name="Lean Stack", handle="leanstack", tagline="Do more with less software.",
    promise="Free and low-cost tools that do the job of the expensive ones.",
    bg=(246,245,240), bg2=(255,255,255), ink=(17,17,17), muted=(120,120,115), accent=(43,76,255), strike=(200,60,50), rule=(214,212,204),
    display=lambda s,w="SemiBold": _inter(w,s,True), body=lambda s,w="Regular": _inter(w,s), mono=lambda s,w="Medium": _mono(w,s), sym=_sym,
    style="minimal-light"),
  "lean_teardown": dict(
    name="Lean Stack", handle="leanstack", tagline="The Teardown. One overpriced bill, taken apart.",
    promise="Weekly editorial teardown of a real software bill, rebuilt for a fraction.",
    bg=(246,245,240), bg2=(255,255,255), ink=(17,17,17), muted=(120,120,115), accent=(200,48,40), strike=(200,48,40), rule=(214,212,204),
    display=lambda s,w="Bold": _serif(w,s), body=lambda s,w="Regular": _inter(w,s), mono=lambda s,w="Medium": _mono(w,s), sym=_sym,
    style="editorial-light"),
  "underpriced": dict(
    name="Underpriced", handle="underpriced", tagline="10x cheaper. Same job done.",
    promise="Editorial teardowns of overpriced software and the cheaper tool that replaces it.",
    bg=(250,243,230), bg2=(255,250,242), ink=(20,20,20), muted=(110,100,90), accent=(230,59,46), strike=(230,59,46), rule=(222,210,190),
    display=lambda s,w="Bold": _serif(w,s), body=lambda s,w="Regular": _inter(w,s), mono=lambda s,w="Medium": _mono(w,s), sym=_sym,
    style="editorial"),
  "swapped": dict(
    name="Swapped", handle="getswapped", tagline="Swap the expensive tool. Keep the result.",
    promise="One swap a day: the pricey tool, the cheap or free alternative, the exact savings.",
    bg=(42,30,92), bg2=(56,42,116), ink=(255,255,255), muted=(190,182,226), accent=(215,255,60), strike=(255,140,140), rule=(80,66,140),
    display=lambda s,w="ExtraBold": _inter(w,s,True), body=lambda s,w="Regular": _inter(w,s), mono=lambda s,w="Medium": _mono(w,s), sym=_sym,
    style="duotone"),
  "zero": dict(
    name="Zero Cost AI", handle="zerocostai", tagline="Free or near-free AI and software for business.",
    promise="The free version, every day. When free is not enough, the cheapest one that works.",
    bg=(11,18,32), bg2=(17,27,46), ink=(245,247,250), muted=(150,163,184), accent=(34,224,122), strike=(255,176,32), rule=(34,46,72),
    display=lambda s,w="ExtraBold": _inter(w,s,True), body=lambda s,w="Regular": _inter(w,s), mono=lambda s,w="Medium": _mono(w,s), sym=_sym,
    style="dark-tech"),
  "frugal": dict(
    name="Frugal Ops", handle="frugalops", tagline="Run a tight ship. Spend on what matters.",
    promise="Operations, automation and AI for businesses that watch every dollar.",
    bg=(239,231,218), bg2=(248,243,235), ink=(43,33,26), muted=(130,115,100), accent=(217,98,43), strike=(217,98,43), rule=(214,200,182),
    display=lambda s,w="SemiBold": _inter(w,s,True), body=lambda s,w="Regular": _inter(w,s), mono=lambda s,w="Medium": _mono(w,s), sym=_sym,
    style="warm-minimal"),
  "tenx": dict(
    name="10x Cheaper", handle="10xcheaper", tagline="Same job. One-tenth the bill.",
    promise="Hard numbers on software that costs a tenth of the market leader.",
    bg=(10,10,10), bg2=(24,24,24), ink=(245,245,245), muted=(140,140,140), accent=(255,90,31), strike=(255,90,31), rule=(50,50,50),
    display=lambda s,w="Bold": _mono(w,s), body=lambda s,w="Regular": _inter(w,s), mono=lambda s,w="Medium": _mono(w,s), sym=_sym,
    style="mono-brutalist"),
}
