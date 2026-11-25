# Apple: a Zack D. Films-style 3D story short

A 59-second vertical short (9:16): the true story of Ronald Wayne, Apple's third co-founder, who owned 10%
of the company in 1976, sold it for $800, and later sold his copy of the founding contract for $500 (it
fetched $1.6 million at auction in 2011). Told as a story with characters: the 1970s office, his house,
a mountain of cash, the auction and his living room today. Script and everything in it are original;
every fact is sourced in `UPLOAD_KIT.md`. Built entirely from code with Blender (`bpy`), free CC0 assets
and a free neural voice.

- `apple_captions.mp4`: the short with burned-in captions (upload this one)
- `apple.mp4`: the same without captions
- `thumbnail.jpg`, `poster.jpg`, `UPLOAD_KIT.md`: thumbnail, stills, title, tags and pinned comment

## Script

> In 1976, this man owned ten percent of Apple. He sold it for eight hundred dollars. Ronald Wayne met
> Steve Jobs and Steve Wozniak at Atari. At forty-one, he was the adult in the room. The two Steves took
> forty-five percent each. Wayne got ten, to break their ties. He wrote the contract, and drew the very
> first Apple logo. Then Jobs took on fifteen thousand dollars in credit for their first big order. In a
> partnership, every partner is on the hook for every debt. The two Steves had almost nothing to lose.
> Wayne did. So twelve days later, he took his name off, for eight hundred dollars. Later, he took
> fifteen hundred more to give up any claim. Today, Apple is worth over five trillion dollars. Ten
> percent is about five hundred billion. He kept just one thing: his copy of the contract, signed by all
> three. He sold that for five hundred dollars. In twenty eleven, it sold at auction for one point six
> million. He says he doesn't regret leaving Apple. Just selling that piece of paper.

## Shots (30, cut to the narration)

Wayne at his 1970s desk holding up the contract, the "10%" circled in red, a fan of eight $100 bills and a
shrug, the office with arcade cabinets, the two young partners waving hello, Wayne frowning while they
goof off at the arcade, a 45/45/10 pie rising from the desk, the partners arguing while Wayne's slice
slides to him, the typewriter typing the agreement, the first logo sketched in ink, circuit boards piling
up for the first order, the $15,000 credit signed, all three partners hooked under an "OWED $15,000"
board, two pairs of empty pockets, debt tags slapping onto his house and car, a calendar flipping to April
12, his name struck out, eight bills landing on the desk, a $1,500 cheque, the withdrawal signed, a block of
$5 trillion in pallets of cash, the tenth that would be his sliding out, the contract kept in a folder, the
three signatures, the $500 sale across a counter, the 2011 auction with the price climbing, the gavel
and "SOLD", Wayne at 92 in his Nevada living room, the newspaper headline, and his face.

## Files

| File | Job |
|---|---|
| `voiceover.py` | Narration with Kokoro (Apache-2.0 TTS) line by line, plus `vo_timing.json` (spoken text and on-screen caption per line) |
| `timeline.py` | The 30-shot list, cut to the narration |
| `cast.py` | Wayne at 41 and 92, the two young partners, the auctioneer and bidders (MakeHuman CC0 data), with modelled 1970s glasses |
| `paper.py` | Every printed thing, drawn with PIL: the typed contract, withdrawal letter, credit agreement, stylised (obviously fake) bills and cash bundles, cheque, calendar pages, the pen sketch, a circuit board, the arcade screen, debt tags and board, auction board and paddles, newspaper |
| `props.py` | Paper with typed and drawn reveals, bills, typewriter, flip calendar, the pie, boards, hooks, tags, gavel, paddles, auction board, newspaper, arcade cabinet, cash pallets instanced by the thousand |
| `rooms.py` | The six sets: 1970s office, his house, the money stage, a collectibles shop, the auction hall, the Nevada living room |
| `shots.py` | The performance (seated, standing and armchair poses with IK onto papers, pens, keys and paddles), prop animation, 30 moving cameras |
| `scene.py` | Builds everything, keys per-shot visibility, world and exposure; renders stills, a preview or the frames |
| `sound.py` | Synthesised sound design and music, mixed under the narration |
| `fetch_assets.py` | Downloads the Poly Haven textures, skies and furniture models |
| `test_sets.py` | Check renders of the six sets |

Shared with `../lightning`: the car (`car.py`) and the tree and keying helpers (`storm.py`). Shared with
`../quicksand`: the character (`human.py`), posing (`posing.py`, `anim.py`), material helpers (`sets.py`),
encoding and captions (`assemble.py`) and `thumbnail.py`.

## Run it

```bash
export QS_SCRATCH=/path/to/work/dir      # with dl/ (MakeHuman data) and tts/ (Kokoro model) as for ../quicksand
python3 fetch_assets.py
ttsenv/bin/python voiceover.py
ttsenv/bin/python sound.py
python3 scene.py preview 216 384 6 2
python3 scene.py render 720 1280 10
python3 ../quicksand/assemble.py apple_captions.mp4 --captions --upscale 1080 1920
```

Thumbnail: frame 124 (0:05), rendered natively at 1080x1920 with `python3 -I scene.py stills 124 --res 1080 1920 --samples 64`
and captioned with `python3 -I ../quicksand/thumbnail.py`.

## Licences

- Poly Haven textures, skies and furniture models: CC0
- MakeHuman character data: CC0
- Kokoro TTS: Apache-2.0
- Sound and music: synthesised in `sound.py`
- Fonts: Open Sans (captions, SIL OFL), Liberation (printed props, SIL OFL)
