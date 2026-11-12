#!/usr/bin/env python3
"""Download the free sounds, music and 3D emoji that chatvid uses.

Sounds and music: Mixkit (mixkit.co), free licence that covers commercial use
in videos, YouTube included; the files themselves may not be redistributed, so
they are downloaded here and kept out of git.
Emoji: Microsoft Fluent Emoji 3D (github.com/microsoft/fluentui-emoji), MIT.

Usage:
  python3 chatvid/tools/fetch_assets.py                 # sounds + emoji used by all episodes
  python3 chatvid/tools/fetch_assets.py --emoji "😎🤯"    # extra emoji
"""
import argparse, glob, json, os, sys, unicodedata, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")

# name -> Mixkit sound effect id (title on mixkit.co in the comment)
SFX = {
    "key1": 2541,      # Single key press in a laptop
    "key2": 2542,      # Hard single key press in a laptop
    "key3": 2533,      # Single key type
    "send": 2354,      # Message pop alert
    "reply": 2357,     # Bubble pop up alert notification
    "pop": 3005,       # Explainer video pops whoosh light pop
    "zoom": 772,       # Quick zoom impact
    "whip": 3115,      # Fast transitions swoosh
    "whoosh": 1490,    # Fast whoosh transition
    "boing": 2894,     # Boing hit sound
    "trombone": 744,   # Trombone disappoint
    "nonono": 2257,    # Cartoon girl saying no no no
    "laugh": 343,      # Cartoon voice laugh
    "fail": 2876,      # Funny fail low tone
    "dazzle": 746,     # Cartoon dazzle hit and birds
    "clown": 2886,     # Funny clown horn sounds
    "rewind": 1093,    # Glitch sci fi rewind transition
    "glitch": 2595,    # Small electric glitch
    "punch": 2151,     # Soft quick punch
}
# name -> Mixkit stock music id
MUSIC = {
    "comical": 2,      # Comical
    "keep-smiling": 15,
    "okay": 780,
}

# Fluent folder names follow CLDR short names; these differ from Python's
# unicodedata names and need spelling out.
EMOJI_NAME_OVERRIDES = {
    "😤": "Face with steam from nose",
    "🤨": "Face with raised eyebrow",
    "😡": "Enraged face",
    "🤬": "Face with symbols on mouth",
    "😮‍💨": "Face exhaling",
    "🙂": "Slightly smiling face",
    "🙃": "Upside-down face",
    "😶": "Face without mouth",
    "🤯": "Exploding head",
    "😵‍💫": "Face with spiral eyes",
    "🫠": "Melting face",
    "🤡": "Clown face",
    "👀": "Eyes",
    "🧠": "Brain",
    "🔥": "Fire",
    "🗿": "Moai",
    "😐": "Neutral face",
    "😑": "Expressionless face",
    "🥲": "Smiling face with tear",
    "😈": "Smiling face with horns",
    "🤓": "Nerd face",
    "🥺": "Pleading face",
    "👋": "Waving hand",
    "😅": "Grinning face with sweat",
    "😰": "Anxious face with sweat",
    "🤖": "Robot",
    "⚡": "High voltage",
    "🤦": "Person facepalming",
    "😮": "Face with open mouth",
    "🥳": "Partying face",
    "🍕": "Pizza",
    "🎉": "Party popper",
    "🎂": "Birthday cake",
    "✖": "Multiply",
    "❓": "Red question mark",
    "❤": "Red heart",
    "➕": "Plus",
    "➖": "Minus",
    "➗": "Divide",
    "➡": "Right arrow",
    "⭐": "Star",
    "🅿": "P button",
    "🆘": "Sos button",
    "🐑": "Ewe",
    "🐻‍❄": "Polar bear",
    "👈": "Backhand index pointing left",
    "👉": "Backhand index pointing right",
    "👍": "Thumbs up",
    "👎": "Thumbs down",
    "💤": "Zzz",
    "💥": "Collision",
    "😺": "Grinning cat",
    "🟦": "Blue square",
    "🤷": "Person shrugging",
    "🦁": "Lion",
    "🧊": "Ice",
    "✅": "Check mark button",
    "📉": "Chart decreasing",
    "📈": "Chart increasing",
    "🙏": "Folded hands",
    "🎤": "Microphone",
    "♾️": "Infinity",
    "♾": "Infinity",
    "🤫": "Shushing face",
    "🤐": "Zipper-mouth face",
    "🫣": "Face with peeking eye",
}

UA = {"User-Agent": "chatvid-asset-fetch/1.0"}


def get(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return True
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
            data = r.read()
    except Exception as e:  # noqa: BLE001
        print(f"  ! {url} -> {e}")
        return False
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(data)
    return True


def emoji_key(g):
    return "-".join(f"{ord(c):x}" for c in g if ord(c) != 0xFE0F)


def emoji_names(g):
    bare = g.replace("\ufe0f", "")
    for k in (g, bare):
        if k in EMOJI_NAME_OVERRIDES:
            yield EMOJI_NAME_OVERRIDES[k]
            break
    base = "".join(c for c in g if ord(c) != 0xFE0F)
    try:
        n = unicodedata.name(base).lower()
        yield n[0].upper() + n[1:]
    except (ValueError, TypeError):
        pass


def fetch_emoji(g):
    dest = os.path.join(ASSETS, "emoji", emoji_key(g) + ".png")
    if os.path.exists(dest):
        return True
    for name in emoji_names(g):
        stems = {name.lower().replace(" ", "_").replace("-", "_"), name.lower().replace(" ", "_")}
        for stem in stems:
            for sub, suffix in (("3D", "_3d.png"), ("Default/3D", "_3d_default.png")):
                url = ("https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/"
                       + urllib.parse.quote(name) + "/" + sub + "/" + urllib.parse.quote(stem + suffix))
                try:
                    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                        data = r.read()
                except Exception:  # noqa: BLE001
                    continue
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                open(dest, "wb").write(data)
                return True
    print(f"  ! no Fluent emoji found for {g!r} ({emoji_key(g)}); add it to EMOJI_NAME_OVERRIDES")
    return False


def graphemes(text):
    """Rough emoji grapheme splitter: keeps ZWJ sequences and variation selectors together."""
    out, cur = [], ""
    for ch in text:
        cp = ord(ch)
        if cur and (cp in (0x200D, 0xFE0F) or cur.endswith("‍") or 0x1F3FB <= cp <= 0x1F3FF):
            cur += ch
        else:
            if cur:
                out.append(cur)
            cur = ch
    if cur:
        out.append(cur)
    return out


def is_emoji(g):
    cp = ord(g[0])
    return cp >= 0x1F000 or 0x2600 <= cp <= 0x27BF or 0x2B00 <= cp <= 0x2BFF


def episode_emoji():
    """Every emoji in any string anywhere in the episode files (messages, walls,
    meter faces, end card), plus the default patience-meter faces."""
    found = set("😊😐😤🤬")

    def walk(v):
        if isinstance(v, str):
            found.update(g for g in graphemes(v) if is_emoji(g))
        elif isinstance(v, list):
            for x in v:
                walk(x)
        elif isinstance(v, dict):
            for x in v.values():
                walk(x)

    for p in glob.glob(os.path.join(ROOT, "episodes", "*.json")):
        walk(json.load(open(p, encoding="utf-8")))
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--emoji", default="", help="extra emoji to fetch")
    a = ap.parse_args()
    print("sounds:")
    for name, i in SFX.items():
        base = f"https://assets.mixkit.co/active_storage/sfx/{i}/{i}"
        have = glob.glob(os.path.join(ASSETS, "sfx", name + ".*"))
        ok = bool(have) or get(base + ".wav", os.path.join(ASSETS, "sfx", name + ".wav")) \
            or get(base + "-preview.mp3", os.path.join(ASSETS, "sfx", name + ".mp3"))
        print(f"  {'ok' if ok else 'FAIL'} {name}")
    print("music:")
    for name, i in MUSIC.items():
        ok = get(f"https://assets.mixkit.co/music/{i}/{i}.mp3", os.path.join(ASSETS, "music", name + ".mp3"))
        print(f"  {'ok' if ok else 'FAIL'} {name}")
    print("emoji:")
    want = episode_emoji() | {g for g in graphemes(a.emoji) if is_emoji(g)}
    bad = [g for g in sorted(want) if not fetch_emoji(g)]
    print(f"  {len(want) - len(bad)}/{len(want)} ok")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
