#!/usr/bin/env python3
"""Write a YouTube upload kit (markdown) for text-story Shorts from edits_ts/*.json.

    python3 make_ts_kit.py "Batch 1" edits_ts/07_boncuk.json edits_ts/05_two_golds.json ... > upload/UPLOAD_TS_1.md

Files are listed in the order given (= posting order).
"""
import json
import os
import sys

HEADER = """# Upload kit: text-story Shorts, {batch}

Post them **in this order, 1–2 a day, at the same times every day** (they post about 2 a day). Every block below is ready to copy. The rules behind the titles and descriptions are in `TEXTSTORY.md`.

## Settings (same for every video)

| Setting | Value |
|---|---|
| Category | People & Blogs (same as theirs) |
| Audience | No, it's not made for kids |
| Altered or synthetic content | No (real footage, our own text and music) |
| Playlist | "True Stories" (use the same one for every text-story Short) |
| Comments | On. Pin the comment given below right after posting. |
| Remixing | Off |
| Sound | Leave the audio as it is ("Original Sound"). Don't add a song in the app. |

## Title rules (from 410 of their established Shorts)

- **Keep it short:** a title of 30 characters or fewer, not counting emojis, gets a median of 607K views. Over 45 characters gets 331K.
- **End with exactly two emojis.** These do best: 🤝 (1.1M median), ✨, 😂, 💪, 🐕 and ❤️. Avoid 🏆 and ⚽.
- **Don't start with "He" or "She"** (304K median vs 610K). "The ___" works.
- **No quotes, questions, ALL CAPS, dashes or hashtags.** Each one roughly halves the median.
- **Each video has two alternate titles.** If a video stalls after 48 hours while its retention is good, swap in an alternate.

## Covers

Each video has a cover image (`*_cover.jpg`, 1080×1920). It's the frame with the whole story on screen and the moment in the clip. Upload it as the custom thumbnail if your channel has that option. If not, use the **frame picker** at the time listed for each video. The text is on screen the whole time, so any frame reads, but the listed one shows the action best.

## What to check after 48 hours (YouTube Studio)

- **Stayed to watch:** aim for 80% or more. The first frame is the full story plus the moment, so people decide fast.
- **Average viewed:** aim for **over 200%**. That means people loop it 2–3 times while reading.
- **Shares:** the "Send this to…" call to action is there to drive these.

---
"""


def plain(t):
    return t.replace("*", "")


def block(i, name, d):
    vid = f"{name}.mp4"
    alts = "\n".join(f"  - `{a}`" for a in d.get("alt_titles", []))
    credit = d.get("credit", "").replace("Video: ", "")
    src_line = f"🎥 Original video: {credit} ({d['link']})" if credit else f"🎥 Original video: {d['link']}"
    desc = f"{d['title']}\n{plain(d['text'])}\n\n{src_line}"
    tags = ", ".join(d.get("tags", []))
    rights = RIGHTS.get(d["source"], "Ask the uploader for permission and keep the credit line.")
    return f"""## {i}. {d['title']}
**Video:** `{vid}` (7s, loops)
**Cover:** `{name}_cover.jpg`, or use the frame picker at **0:0{int(d.get('cover_t', 1))}**

**Title:**
```
{d['title']}
```
**Alternate titles** (swap one in if it stalls after 48h):
{alts}

**Description:**
```
{desc}
```
**Tags:**
```
{tags}
```
**Pinned comment:**
```
{d.get('pinned', '')}
```
**Rights:** {rights}

---
"""


RIGHTS = {
    "dYQ2IyMuPes": "Official Olympics footage (IOC). **Expect a Content ID claim or block.** The IOC rarely licenses clips to creators. Post it last, or swap the story out.",
    "8pzFZqUVjb4": "Official Olympics footage (IOC). **Expect a Content ID claim or block.** Post it last, or swap the story out.",
    "cvCjyWp3rEk": "The Born Free Foundation owns the footage. Ask them, as they're often happy with credit for conservation stories.",
    "-77wtMxT3-M": "This is a re-upload. The footage is from the documentary *The Urban Elephant* (argofilms) and The Elephant Sanctuary in Tennessee, so ask the Sanctuary.",
    "lexz6cg_W04": "This is a re-upload of Brazilian TV news (TV Globo). Credit the uploader. A claim is possible.",
    "XuAHZyqsvhI": "This is a re-upload of Spanish TV race footage. A claim is possible.",
    "oz8YP3SsE_c": "Guardian News. A claim is possible, so ask for permission.",
    "inH_GkW02bk": "The Milwaukee County Transit System (MCTS) released this to the public. Ask MCTS, as public agencies usually agree.",
    "zvx0N6m1Oo4": "Vietnam Plus (a state news agency). Ask them.",
    "qm0nlcmB3BU": "This is a re-upload of live TV pool footage from 2010. A claim is possible.",
    "nasa_apollo11_descent": "NASA film and mission audio are **public domain**, so you don't need permission and there's no Content ID risk. Credit NASA.",
    "zigzag_demo": "This is the creator's own demo video from the repo (Apache-2.0). Keep the credit, and it's polite to tell the creator (simpsoka) about the Short.",
    "nasa_ingenuity_takes_flight": "NASA/JPL footage is **public domain**, so you don't need permission and there's no Content ID risk. Keep the NASA/JPL-Caltech credit, and don't use the NASA logo in a way that suggests NASA endorses the channel.",
    "y_01Au-TIi8": "Agencia EFE (a news agency). A claim is possible, so ask for permission.",
    "5pv8V4SXfzY": "ABC News. A claim is possible, so ask for permission.",
    "rl382lAYAdI": "This is a re-upload of Spanish TV footage of the race. A claim is possible.",
    "9rGmxlMI_1g": "This is a re-upload of Sky News footage. **Claims are likely.** The Sun clip is the backup.",
    "lrX1EWMuHhY": "AFP. **AFP claims are common.** Ask AFP, or swap the story out if it gets blocked.",
    "B-rCZjI3AFM":"The Telegraph (originally Logan police / bystander footage). A claim is possible.",
    "OrKfFZEfElc": "The Sun. A claim is possible, so ask for permission.",
    "zkwX6jJQCtA": "NBC News. **Claims are likely.** The AFP clip is the backup.",
    "Y1u5VSYeJYM": "CBS (originally traffic camera footage from Chilean TV). A claim is possible.",
    "fuzItapMT4I": "This is the official meet video uploader. Ask them.",
    "xVlKtI7yd_s": "WGN. Check whether it shows the actual carry (archive photos only would be weak). A claim is possible.",
    "IKxqy9SJ-0I": "The BBC clip via CNN. **Claims are likely.**",
    "FvkI8c9eALQ": "Associated Press. **AP claims are common.** The re-upload is the backup.",
    "kU4arZLI_xY": "AP Archive. **AP claims are common.**",
    "XYRUWi8mBsA": "CNN (body camera footage is from Albuquerque Police). A claim is possible.",
}


def main():
    batch, files = sys.argv[1], sys.argv[2:]
    out = [HEADER.format(batch=batch)]
    for i, f in enumerate(files, 1):
        d = json.load(open(f))
        name = os.path.splitext(os.path.basename(f))[0]
        out.append(block(i, name, d))
    print("".join(out))


if __name__ == "__main__":
    main()
