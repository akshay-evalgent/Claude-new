# Test 01: "Growth Is Slow, Then Sudden 🌱"

One reel to test the @wealth format on your account before making anything else.

## Why this reel

- **Same shape as @wealth's biggest reel measured so far** ("Words Have Power ❤️💰", 29.1M views): a short story-title hook with an emoji, centred above a full-width clip on black, music under it, and a lesson-essay caption.
- **Footage you're allowed to use:** a seed time-lapse from Wikimedia Commons under a CC BY licence. Commercial use and edits are allowed as long as the creator is credited, and the credit is already in the caption. No copyright strikes, and Instagram counts it as original.
- **The money angle:** the caption turns patience into compounding, which fits a wealth-and-mindset page.

## Files

| File | What it is |
|---|---|
| `test-01.mp4` | The finished reel, 1080 x 1920, silent (you add the music in Instagram) |
| `test-01-cover.jpg` | Cover frame |
| `caption.txt` | Caption, ready to paste. Swap `@YOURHANDLE` for your handle. |

## How to post it (on your phone)

1. **Get the video onto your phone.** Open this folder on github.com, click `test-01.mp4`, then **Download**. Or put it in Google Drive and open it there. Don't send it through WhatsApp: it shrinks the quality.
2. **Instagram > + > Reel**, pick `test-01.mp4`.
3. **Add music:** tap the music icon and search **"slowed"**. Pick a song with the ↗ trending arrow that feels hopeful or emotional. Two of the three @wealth reels used trending songs, and the biggest used a slowed version. Set the music volume to 100% (the clip itself is silent).
4. **Don't add text or stickers.** The hook is already in the video.
5. Tap **Next** and paste the caption. Replace `@YOURHANDLE`.
6. **Cover:** Edit cover > pick the moment the shoot breaks through, or upload `test-01-cover.jpg`.
7. **Advanced settings:** turn on **Upload at highest quality**.
8. Post between **7 and 9 pm** your time.

## After posting

- Reply to every comment in the first hour with something real, not just "thanks".
- **Don't send it to friends and family.** Their views tell Instagram the wrong audience. Let Instagram find strangers who like this kind of content.
- Don't delete it if the numbers are low.

## What to measure

**In the first 12 hours,** write down the total views at about 1 h, 3 h, 6 h and 12 h after posting. Then run:
```
python3 scripts/viral_math.py track 1:<views> 3:<views> 6:<views> 12:<views>
```
It tells you how fast views are growing each hour and where the reel is heading. You can also just send me the numbers. The maths behind it is in `content/09-VIRAL-MATH.md`.

**Then** open the reel > **View insights** and fill this in:

| | 24 h | 48 h | 7 days |
|---|---|---|---|
| Views | | | |
| Accounts reached | | | |
| Skip rate | | | |
| Average watch time | | | |
| Likes | | | |
| Shares | | | |
| Saves | | | |
| Follows | | | |

## How to read the result

| What you see | What it means | Next step |
|---|---|---|
| **Under ~300 views in 48 h** | Normal for a brand-new account's first reel. Instagram is still working out who to show you to. | Don't judge the format on this alone. Make test 02, changing only the hook. |
| **High skip rate** (most people swipe away in the first second or two) | The hook or the first frame didn't stop people | Test 02: same clip, new hook, e.g. "The Perfect Example Of What Patience Looks Like:" |
| **Average watch time ≥ 70% of the length** and **shares ÷ reach ≥ 1%** | The format works on your account | Test 02: same style with a new clip and lesson |
| **Over 10,000 views** | Strong signal | Post a follow-up on the same theme within 24 hours |

One reel on a new account is a noisy test, and numbers swing a lot from reel to reel. A fair verdict on the format takes about 3 reels in a week. This is reel 1. Change **one thing** each time so you know what made the difference.

## How it was made

**Footage:** "Lentil sprouting Haft-sin time lapse (short)" by Always Shooting, licensed CC BY 2.0, from Wikimedia Commons:
https://commons.wikimedia.org/wiki/File:Lentil_sprouting_Haft-sin_time_lapse_(short).webm
The licence allows commercial use and edits with credit. The credit line is in `caption.txt`. Keep it in.

**Render:** the source's first 10 s (a different camera angle) is cut. Seconds 10.5 to 94.5 are cropped to 3:2, sped up 3.23x to 26 s, and the last frame is held for 1.5 s. Total 27.5 s, 1080 x 1920, 30 fps, silent audio track.
```
python3 scripts/make_lesson_reel.py --clip lentil.webm --hook "Growth Is Slow, Then Sudden" \
    --highlight "Slow, Then Sudden" --emoji "🌱" --start 10.5 --end 94.5 --length 26 --hold 1.5 \
    --out test-01/test-01.mp4
```
