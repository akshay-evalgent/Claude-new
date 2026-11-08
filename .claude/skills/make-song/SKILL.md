---
name: make-song
description: Make full songs with vocals, as mastered MP3s, from a description, a mood or the user's own lyrics, by running ACE-Step 1.5 on the user's free Kaggle T4 GPU and downloading the result. Use this whenever the user wants a song, track, jingle, theme tune, birthday song, lullaby, anthem or instrumental made as actual audio ("make me a song about…", "turn these lyrics into a song", "AI music like Suno", "generate a track on Kaggle"), even if they never mention Kaggle or ACE-Step. Not for writing lyrics only with no audio, or for editing an existing recording.
---

# Make a song on Kaggle

This skill turns a request into a `song.json`, runs ACE-Step 1.5 headlessly on the user's
Kaggle account (free T4 GPU), waits, checks the MP3s and hands them over.

What to tell the user up front:
- **Time:** about 15–20 min from request to MP3s (≈13 min on Kaggle for 2 takes of a ~3 min song).
- **Cost:** about 13 min of their ~30 h/week free Kaggle GPU quota per song.
- **Output:** 2 takes by default, mastered to −14 LUFS, 320 kbps MP3.

Paths below use `SKILL_DIR`, the base directory this skill was loaded from (it holds
`scripts/`, `references/`, `assets/`). Set it once in each shell command that needs it.

## 1. Preflight

```bash
pip install -q "kaggle>=2.2,<3" 2>&1 | grep -v "Running pip as the 'root' user" ; kaggle config view | grep -i username
```

- **No username, or a 401/403 error:** there's no valid Kaggle token. The user creates one at
  kaggle.com/settings/api ("Generate New Token") and sets it as the environment variable
  `KAGGLE_API_TOKEN`. In a cloud session, that's an environment secret or variable; if you
  have a `read_documentation` tool, read its `environment.secrets` page and point the user to it.
  If they paste a token in chat you can `export` it for this session, but suggest storing it
  as a secret so it doesn't sit in the transcript. Their Kaggle account must be
  phone-verified, or GPU and internet are unavailable.
- **pip or the Kaggle API is blocked:** the environment's network policy must allow
  `pypi.org`, `kaggle.com`, `www.kaggle.com` and `storage.googleapis.com` (output downloads).
  If you have `read_documentation`, the `environment.network` page explains how.
- `ffmpeg` is optional. With it, `check_songs.py` can verify length, loudness and silence.

## 2. Write song.json

Read `references/songwriting.md` before writing the caption or lyrics. It covers what makes
ACE-Step output good: specific multi-dimensional captions, section tags, singable lines.

| Field | Default | Notes |
|---|---|---|
| `caption` | required | Genre, mood, instruments, vocal, mix. **No artist names, no BPM/key in prose.** |
| `lyrics` | required | Section tags (`[Verse 1]`, `[Chorus]`, …). `[Instrumental]` for no vocals. |
| `language` | `"en"` | ACE-Step code (`es`, `fr`, `hi`, `ja`, `zh`, …) matching the lyrics. |
| `bpm` | `null` | 30–300; set it when the user names a tempo or the genre demands one. |
| `key` | `""` | e.g. `"C major"`, `"F# minor"`. |
| `duration` | `-1` | 10–600 s; `-1` lets the planner size it to the lyrics. |
| `takes` | `2` | 1–4 variations of the same song. More takes = longer run. |
| `model` | `"acestep-v15-turbo"` | The 2B model, the only one verified on Kaggle's T4. See "Options" for XL. |
| `mastering` | `"loudness"` | `"loudness"` (−14 LUFS), `"none"`, or `"reference"` + `reference_dataset`. |

- **User gave lyrics:** use their words verbatim. Only add missing section tags, and say so.
- **User gave a description only:** write original lyrics. Don't reproduce existing song
  lyrics; if they ask for a well-known song or artist, write something original in that
  spirit and describe the style without naming the artist.
- Start from `assets/song.example.json` if useful. Save the file as `<out>/song.json`.

`<out>` is a working folder outside any git repo, e.g. `<scratchpad>/songs/<short-slug>` if
the session has a scratchpad, otherwise `./songs/<short-slug>`. Never commit audio to git.

Don't stop to ask for approval unless the user asked to review the lyrics first. Start the
run, and put the caption and lyrics in your message so they can redirect you while it runs.

## 3. Run it

Build first, so mistakes in `song.json` cost nothing:

```bash
SKILL_DIR=...; OUT=...
python3 "$SKILL_DIR/scripts/run_on_kaggle.py" --song "$OUT/song.json" --out "$OUT" --dry-run
```

Then run for real **in the background** (it takes 10–20 min). If your Bash tool supports it,
use `run_in_background` with a 2 h timeout:

```bash
SKILL_DIR=...; OUT=...
set -o pipefail; python3 -u "$SKILL_DIR/scripts/run_on_kaggle.py" --song "$OUT/song.json" --out "$OUT" --timeout-min 115 2>&1 | tee "$OUT/runner.log"
```

The runner pushes a private notebook `<user>/ace-step-song-runner`, prints its kaggle.com
link (share it), polls every minute, then downloads into `$OUT/<timestamp>/`. It exits
non-zero on any failure. **Run one song at a time:** every run reuses the same notebook slug.

To get notified of state changes, rather than every per-minute poll, use a Monitor-style
watcher with a bash read loop. `awk` or `grep` filters can buffer the stream and stay silent.

```bash
LOG="$OUT/runner.log"; until [ -f "$LOG" ]; do sleep 1; done; prev=""; tail -n +1 -f "$LOG" | while IFS= read -r line; do if [[ $line =~ ^\ +[0-9]+\ min\ +([A-Z_]+) ]]; then s=${BASH_REMATCH[1]}; [[ $s != "$prev" ]] && echo "$line" && prev=$s; elif [[ $line =~ pushed|Traceback|Done\ in|ended\ with|Still ]]; then echo "$line"; fi; done
```

## 4. Check and deliver

When the runner prints `✅ Done … Files in <run-dir>`:

```bash
SKILL_DIR=...
python3 "$SKILL_DIR/scripts/check_songs.py" <run-dir> --copy-to "$OUT/deliver" --name <short-slug>
python3 "$SKILL_DIR/scripts/read_kaggle_log.py" <run-dir>/ace-step-song-runner.log | grep -E "^Take [0-9]"
```

The first command flags duplicate, very short or mostly silent takes, and copies the songs
to readable names. The second shows each take's BPM, key, length and seed.

- If the check passes, send the files from `$OUT/deliver/` (e.g. `SendUserFile` with
  `display: "attach"`), or give their absolute paths. Report the length, BPM/key per take and
  loudness. You can't listen to them, so say the checks show valid audio, not that it sounds good.
- If the check fails, treat it as a failed run (step 5).

The lossless takes (FLAC) and WAV masters stay in the Kaggle notebook's output. Re-running
the runner with `--all-files` downloads them as well.

## 5. If it fails

Read `references/troubleshooting.md`. It maps the error lines from real failed runs to their
causes and fixes, and shows how to decode the log with `scripts/read_kaggle_log.py`.
Each retry costs quota. Only retry when you know what you're changing and why. If the cause
is unclear, or the fix would mean editing ACE-Step itself, explain and ask first.

## Options

- **Changes after listening** ("faster", "darker", "different chorus"): edit `song.json` and
  run again. Every change is a full new run; the batch runner can't repaint one section.
- **Several songs:** run them one after another, never in parallel.
- **XL model** (`"acestep-v15-xl-turbo"`, 4B, better quality): untested on Kaggle's T4 with
  the float32 fix, and it may run out of memory. Offer it as an experiment and suggest
  `takes: 1` and a set `duration` (≤180 s) for the first try.
- **Reference mastering:** the user uploads a reference track to Kaggle as a dataset, then set
  `"mastering": "reference"` and `"reference_dataset": "<user>/<dataset-slug>"`.

## What's in this skill

- `scripts/run_on_kaggle.py`: builds the batch notebook, pushes it, polls, downloads.
- `scripts/ACE_Step_XL_Free_Kaggle.ipynb`: the source notebook, with T4 fixes (subprocesses get
  `MPLBACKEND=Agg`, the planner uses the PyTorch backend, ACE-Step is patched to float32).
  The runner depends on its cell order, so edit it with care.
- `scripts/check_songs.py`: verifies the downloaded MP3s and copies them out.
- `scripts/read_kaggle_log.py`: makes Kaggle's JSON logs readable (`--stages` for timings).
- `references/songwriting.md`, `references/troubleshooting.md`, `assets/song.example.json`.
