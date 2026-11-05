# Character voices

AI voices for POV Reels ("your girlfriend", "your mother", "your father"…), made with
[VoxCPM2](https://github.com/OpenBMB/VoxCPM) through its free
[Hugging Face demo](https://huggingface.co/spaces/OpenBMB/VoxCPM-Demo). No GPU needed.

## What's here

| Path | What it is |
|---|---|
| `girlfriend/voice_normal.mp3` | Her everyday voice, designed from the description in `character.json` |
| `girlfriend/voice_crying.mp3` | The same voice, crying. Every line in a sad scene copies from this clip |
| `girlfriend/comeback-crying/` | Test scene: she wants to come back after cheating, crying. 32 s |
| ↳ `girlfriend_comeback-crying_mixed.mp3` | Ready for a Reel: light room echo, faint night ambience, -14 LUFS |
| ↳ `girlfriend_comeback-crying_voice_only.mp3` | Voice alone, for mixing your own music in CapCut |
| `girlfriend/voice_crying_hindi.mp3` | Her voice crying in Hindi, made from `voice_normal.mp3` |
| `girlfriend/comeback-crying-hindi/` | The same scene in Hindi (`scene.json` switches language and reference clip) |
| `girlfriend/sorry-call/` | A real acted recording converted into her voice (see below) |
| `make_track.py` | Turns a scene's `script.json` into those two files |
| `convert_recording.py` | Turns your own acted recording into a character's voice |

## Use your own recording (best emotion)

Text-to-speech emotion sounds flat next to real acting. For the most real result, act the
lines yourself and convert the recording into her voice. Your crying, pauses, emphasis and
timing stay. Only the voice changes, including moving a male voice up to her pitch.

```bash
python voices/convert_recording.py my_take.aac voices/girlfriend --name sorry-call
```

- Any format works (WhatsApp voice notes too). Record close to the phone in a quiet room, one take.
- It uses Seed-VC's free [Hugging Face demo](https://huggingface.co/spaces/Plachta/Seed-VC)
  in pitch-following mode, so your recording is uploaded there. It makes 2 takes (`--takes`),
  keeps the one that keeps all your words and sounds most like her, and turns down any pause
  that came out louder than yours.
- The checks land in `<name>/conversion.json`. In the `sorry-call` test the kept take kept
  every word, followed your pitch movement at 0.98, raised it from 103 Hz to 202 Hz, ran the
  same 18.8 s with the pauses in place, and scored 0.43 for sounding like her and 0.12 for
  sounding like you.
- Seed-VC's other mode (timbre only) was tested too. It sounds slightly more like her
  but makes up its own intonation (pitch-shape match 0.03), so the emotion is lost.
- Your original recording is not copied into the repo.

## Make a new scene

1. Make a folder under the character, e.g. `girlfriend/missing-you/`, with a `script.json`:
   ```json
   [
    {"text": "Hey... you're still awake?", "control": "soft, a little worried", "pause_after": 1.0},
    {"text": "I miss you.", "control": "whispering, heartbroken", "pause_after": 0}
   ]
   ```
   `control` is the emotion for that line. Keep it to a few words. `pause_after` is seconds of silence.
2. Run it:
   ```bash
   pip install -r voices/requirements.txt
   python voices/make_track.py voices/girlfriend/missing-you --takes 2
   ```
   It makes 2 takes of every line, keeps the take whose words are right and whose voice is
   closest to `voice_normal.mp3`, then mixes. Takes stay in `takes/` (not committed). Delete a
   take to have it made again, or raise `--takes` to get more options.

For a happy or neutral scene, point `reference` in `character.json` at `voice_normal.mp3`
(or a happy clip) instead of the crying one, and set `reference_text` to the words spoken in it. The emotion in the reference clip carries into
every line, which keeps the voice and the mood steady.

## Hindi and other languages

Add a `scene.json` next to the scene's `script.json`. Anything in it overrides
`character.json` for that scene:

```json
{"lang": "hi", "reference": "voice_crying_hindi.mp3", "reference_text": "<exact Hindi words in that clip>"}
```

Write the script in Devanagari. Keep `control` in English. Use a reference clip of her
speaking the same language: in testing, Hindi lines copied from the English crying clip
drifted away from her voice. To make one, upload `voice_normal.mp3` in the demo, write a
Hindi sentence, and add the emotion in the control box, e.g. *"speaking Hindi, crying,
voice trembling, same young woman"*. Hindi takes are checked with a larger multilingual
speech-to-text model, so scoring takes a few minutes longer.

## Make a new character (mother, father…)

Choosing a voice needs ears, so do this part in the
[demo website](https://huggingface.co/spaces/OpenBMB/VoxCPM-Demo):

1. Leave the reference audio empty, write a description in the control box (e.g. *"Woman in
   her late 40s, warm soft voice, caring, a little tired, speaks slowly"*) and a normal
   sentence as the text. Generate 3–5 times and download the one you like as `voice_normal.mp3`.
2. Upload that clip as the reference, write an emotional sentence, and add an emotion in the
   control box (e.g. *"sad, crying softly"*). Download the best one as `voice_crying.mp3`.
3. Copy `girlfriend/character.json` into the new folder and update the file names and the
   exact words spoken in each clip.

## Reading the scores

`make_track.py` prints a `same_voice` score per take, comparing it with `voice_normal.mp3`.
In this test, two *different* designed women scored 0.17 against each other. The chosen
crying takes scored 0.46–0.64. Crying lowers the score a little, so treat anything under
about 0.3 as "drifting into another person".

## Before posting

Instagram requires the **AI info** label on Reels with a realistic AI voice. Keep the
characters made up. Don't copy a real person's voice without their permission.
