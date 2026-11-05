# Character voices

Voices for "Say It For Me": seven characters, one playlist each, talking straight to the viewer.
You act every script yourself and the recording is converted into the character's voice, so the
pauses, breaths and the crack in the voice are real.

| Character | Folder | Playlist | Talks to |
|---|---|---|---|
| Meera | `girlfriend/` | POV: Your Girlfriend | her boyfriend |
| Arjun | `boyfriend/` | POV: Your Boyfriend | his girlfriend |
| Maa | `mother/` | POV: Your Mom | her son or daughter |
| Papa | `father/` | POV: Your Dad | his son or daughter |
| Didi | `sister/` | POV: Your Sister | her younger sibling |
| Bhaiya | `brother/` | POV: Your Brother | his younger sibling |
| Yaar | `best-friend/` | POV: Your Best Friend | their best friend |

Each `character.json` holds the voice description, the theme (setting, object, music, colours)
and, once chosen, the voice clips. `scripts.json` holds the 42 recordable scripts, six per
character, with ids like `mother/first-salary`.

## Start of every session

The cloud container starts empty, so rebuild the tools first (about 2 minutes):

```bash
bash voices/setup.sh
```

Then run any tool with `voices/run <script>.py ...`. It uses the environment that setup made.

To let the converter run on this machine without being blocked, the repository needs these
allow rules in `.claude/settings.json` (add them yourself and commit; Claude can't change its
own permissions):

```json
{ "permissions": { "allow": ["Bash(voices/run *)", "Bash(bash voices/setup.sh)", "Bash(bash voices/setup.sh *)"] } }
```

## Make an episode from a script

1. Pick a script from `scripts.json` (or the Say It For Me page) and record it on your phone:
   quiet room, phone close, three takes, real pauses. Any format works, WhatsApp voice notes too.
2. Convert it:
   ```bash
   voices/run convert_recording.py take.m4a voices/mother --name first-salary
   ```
3. Use `voices/mother/first-salary/mother_first-salary_voice_only.mp3` (same timing as your
   take) or `_mixed.mp3` (with room sound). The checks are in `conversion.json`.

What the converter does:
- Seed-VC in pitch-following mode keeps the rise and fall of your voice and moves it to the
  character's pitch. It runs on this machine when set up (`--engine local`), otherwise through
  the free [Hugging Face demo](https://huggingface.co/spaces/Plachta/Seed-VC) (`--engine demo`),
  which uploads your take and has a daily GPU limit.
- It makes 3 takes and builds the result phrase by phrase from whichever take kept your words
  and sounds most like the character, falling back to the best single take if that scores higher.
  A single take can drop a word (one local test lost the last two "please"s), which is why it
  makes three.
- On this machine (no graphics card) one take of a 20-second recording takes about 5 minutes at
  the default 30 quality steps, so about 15 minutes per Short. 50 steps scored no better in
  tests. The first run also downloads about 1 GB of model files.
- `performance.py` then puts your performance back: the character's voice only where you speak,
  your real breaths and gulps between phrases (hiss-only moments turned down 12 dB), the
  character's loudness following yours within 4 dB, and a vocal polish at -14 LUFS.
- Your original recording is never copied into the repo.

Local vs demo on the same recording (30 steps, one take): sounds like her 0.531 on this machine
against 0.505 through the demo, same pitch shape (0.98) and length.

Measured on the `girlfriend/sorry-call` test (demo): every word kept, pitch movement followed at 0.98
(103 Hz to 202 Hz), same 18.8 s length, loudness following yours at 0.94, sounds like her 0.528
on speech (her own clips score 0.47–0.74 against each other), no male-range pitch anywhere.

Tested and not used, because each made her sound less like herself: raising the pitch a
semitone (0.456), a longer 25 s reference (0.490), an EQ copying her tonal balance (0.47), and
stronger loudness matching (0.479). Seed-VC's timbre-only mode lost the intonation (0.03).

## Create a character's voice

```bash
voices/run make_voice.py voices/mother            # 3 candidates from the description, scored
voices/run make_voice.py voices/mother --pick 2   # keep candidate 2 as her voice
```

Candidates go to `<character>/candidates/` (not committed). Listen and pick by ear; the scores
only flag what's hard to hear in one listen: missing words, a pitch outside the character's
range, and which existing character it sounds closest to. Two different designed voices
score about 0.17 against each other, so a candidate scoring 0.5+ against another character
is too similar. The best friend has a man's and a woman's description; candidates alternate.

## Text-to-speech scenes (no recording)

For quick tests without acting, `make_track.py` builds a scene from a `script.json` of lines,
each with its own emotion:

```json
[
 {"text": "Hey... you're still awake?", "control": "soft, a little worried", "pause_after": 1.0},
 {"text": "I miss you.", "control": "whispering, heartbroken", "pause_after": 0}
]
```

```bash
voices/run make_track.py voices/girlfriend/missing-you --takes 2
```

The emotion in the character's reference clip carries into every line, so point `reference` in
`character.json` at a crying clip for sad scenes and at `voice_normal.mp3` otherwise. Text-to-
speech emotion is noticeably flatter than your own acting.

For Hindi, add a `scene.json` next to `script.json`, e.g.
`{"lang": "hi", "reference": "voice_crying_hindi.mp3", "reference_text": "<exact words>"}`,
and write the script in Devanagari with `control` in English. Use a reference clip in the same
language: Hindi lines copied from an English clip drifted away from her voice.

## Before posting

Tick "AI use: Yes" on YouTube and use Instagram's AI label. Converting your voice into another
person's voice isn't YouTube's own-voice exemption. Keep the characters made up, and never call
a Short a "real voice note".
