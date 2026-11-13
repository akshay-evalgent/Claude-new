# Batch 4: source clips

Checks on every clip:
- **Not already used:** none is among our 28 edits or Momentum Motivation's 224 Shorts.
- **No big reuploads:** a quick search found no reupload Short of any of them with 50K+ views.
- **Recency:** several are older (2023–2025) uploads from our proven creators. These stories are evergreen and new to Shorts, so age matters less than in batches 1–3.

"Peaks" are YouTube's most-replayed moments, which usually mark the payoff.

| # | Story | Source · views · uploaded | Peaks | Why it fits |
|---|---|---|---|---|
| 1 | [I secretly restored my dad's car](https://youtu.be/E8ifdywkI7U) | **Donut** (new creator) · 5.9M · Jun 2026 | 13:00, 14:21, 24:55 | Son-and-dad reveal from a big car channel. New creator, new audience |
| 2 | [Wife sees her late husband's Corvette cleaned for the first time in 53 years](https://youtu.be/pk3sHcjbY6E) | WD Detailing · 3.6M · Nov 2025 | 6:43, 11:05, 16:28 | "53 years" is our biggest number yet; grief and love |
| 3 | [Son surprises dad with his 1957 Bel Air for his birthday after 30 years](https://youtu.be/lifRrFi4W64) | WD Detailing · 3.5M | (check "Most replayed") | Happy birthday surprise, which balances the grief-heavy stories |
| 4 | [This nurse lost her job, and her house was falling apart](https://youtu.be/TP0qExi2yMc) | RUDAN Brothers · 4.2M · May 2025 | 0:50, 10:28, 26:03 | Hero-in-need angle, short for RUDAN (28 min) |
| 5 | [He pulled up while we helped his mom… what happened next left us speechless](https://youtu.be/QNoIK2ucxXs) | RUDAN Brothers · 5.0M · Jul 2024 | 9:58, 22:12, 35:21 | Suspense hook ("who's this guy?") with a twist |
| 6 | [I found her lost iPhone underwater, then she FaceTimed me](https://youtu.be/mnE3Je4Ltk4) | Man + River · 3.3M · Nov 2024 | 13:55, 15:10 | Short source (15 min); clean lost-and-found payoff |
| 7 | [I found $10,000 of sunken electronics, then found their owners](https://youtu.be/0wG6puLAOTU) | Man + River · 5.4M · Feb 2023 | 2:29, 16:33 | Several owner reactions to cut between |
| 8 | [U.S. Marine reunited with his long-lost daughter in the Philippines after 39 years](https://youtu.be/R3MxpQLhY8c) | The Leah and Blair Slog · 2.9M · Jan 2025 | 4:14, 11:15, 16:03 | In-person reunion (the father flew over), 18 min long |
| 9 | [This family lost contact for 20 years… but I found them in 5 minutes](https://youtu.be/4djButV-IbY) | Kyle Le Dot Net · 3.5M · Mar 2024 | 5:28, 8:36, 10:57 | "20 years / 5 minutes" contrast hook. The reunion may be a video call (an in-person part 2 exists) |
| 10 | [Half-Filipino twins discover their father was high-ranking U.S. military](https://youtu.be/q9LxifZQ_W0) | The Leah and Blair Slog · 1.3M · Jun 2025 | 5:09, 9:21, 30:00 | Twins searching 42 years, plus a reveal about who their father was |

**Alternates:**
- [Son sees his late father's Thunderbird cleaned for the first time in 40 years](https://youtu.be/dDYO-WGWoe0): WD Detailing · 1.3M
- [Someone lost this in the river… now I have to find them](https://youtu.be/dPeFHl3xKrI): Man + River · 5.3M
- [Homeowner battling cancer gets a free roof](https://youtu.be/ytTxA70_orc): RUDAN Brothers · 1.1M
- [I gave a homeless man $1,000 to spend](https://youtu.be/v0yac5-VWeE): Just Knate · 231K (new creator; smaller channel)

**Skipped:**
- RUDAN's "Mom cries seeing her house restored after a storm": a reupload Short already has 9.7M views.
- "Man sees color for the first time at 66": already 49M views on a reupload channel, and the original creator is unclear.

## Download (Windows cmd)

```bash
yt-dlp -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 -o "%(channel)s - %(title).60s [%(id)s].%(ext)s" E8ifdywkI7U pk3sHcjbY6E lifRrFi4W64 TP0qExi2yMc QNoIK2ucxXs mnE3Je4Ltk4 0wG6puLAOTU R3MxpQLhY8c 4djButV-IbY q9LxifZQ_W0
```

Upload them to `Momentum motivation/Batch 4` in the Drive folder.
