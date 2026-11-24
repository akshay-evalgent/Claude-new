# The Billion-Dollar Hard Drive (AI cut)

A 61-second vertical short (1080×1920, 24 fps) about James Howells, a computer engineer in Newport, Wales. He mined
8,000 bitcoin in 2009, kept the keys on a hard drive that went to the town landfill by mistake in 2013, and spent
twelve years trying to get it back.

It is built with the same pipeline as `../okene-ai/` and `../koepcke-ai/`; those READMEs cover the models, the Kaggle
setup and the lessons learned (stuck queues, server memory, trimming clips). Kaggle names come from this folder's
name: notebooks `howells-ai-<mode>` and stills dataset `howells-ai-stills`. The first stills notebook,
`howells-ai-keyframes`, sat queued while an identical copy, `howells-ai-kf2`, started at once, so the stills came from
`howells-ai-kf2`. Shots h22 and h23 were added to the shot list after that run started; they and h06 (whose first
version showed a face that was not James's, so its prompt now asks for the hand alone) came from the redo,
`howells-ai-redo2` (its twin `howells-ai-redo1` sat queued). The clips came from `howells-ai-clips` (20 shots) and
`howells-ai-clips2` (h06, h22, h23): `./fetch_clips.sh howells-ai-clips howells-ai-clips2`.

## Build

```bash
python kaggle/build.py keyframes --slug howells-ai-kf2 && kaggle kernels push -p kaggle/push/howells-ai-kf2
kaggle kernels output akkikmr/howells-ai-kf2 -p out/kaggle_kf && python sheet_keyframes.py kaggle_kf
python pick_keyframes.py picks.json && kaggle datasets create -p out/kf_dataset      # later rounds: datasets version
python kaggle/build.py clips && kaggle kernels push -p kaggle/push/howells-ai-clips
./fetch_clips.sh                                     # -> out/clips/<id>/f%04d.jpg + out/clips.json
python vo/make.py <kokoro-v1.0.onnx> <voices-v1.0.bin> && python prep_vo.py && cp out/vo.wav vo/vo.wav
python audio.py                                      # out/mix.wav
node render.js frames 0 61.5 out/frames
ffmpeg -framerate 24 -i out/frames/f%05d.jpg -i out/mix.wav -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest billion-dollar-hard-drive.mp4
node youtube/make_kit.js                             # captions.en.srt and cover.jpg
```

`SAY` in `vo/make.py` respells the years for the voice; the captions keep the digits. The voice reads "AI" and
"Howells" (HOW-elz) correctly as written.

## The edit

- The cut is `SLOTS` in `film.html` (and the same list in `audio.py`). `CHART0` and `CHART1` are drawn in the page: the
  dollar value of 8,000 bitcoin from 2009 on. The first time it stops at October 2009, the first published price
  (1,309 BTC to the dollar, so 8,000 BTC ≈ $6). The second time it climbs to the October 2025 peak.
- h10's clip turns his shock into a grin after a second, so `CLIPREV` plays its first 26 frames backwards: calm, then
  the gasp, as the narration says "he realized what he'd thrown away".
- The big words (`BIG`) are the hook's rolling "$1,000,000,000", "NO.", "STILL NO." and a red "DISMISSED" stamp; each
  lands with a short shake (`IMPACTS`) and a hit in the sound.
- The chips carry the year and what the coins were worth at that point, so the number keeps growing while he loses.
- `CAPTOP`, `CHIPTOP` and the `top` of a big word move text off faces, shot by shot. The cover's title sits at the top,
  because the drive is in the lower half of the frame.
- The end card asks the question from the last line again ("Would you have kept digging?"), to pull comments.

## What is true, and what is not certain

Sources: Wikipedia ([Bitcoin buried in Newport landfill](https://en.wikipedia.org/wiki/Bitcoin_buried_in_Newport_landfill));
CNN, February 2025 ([he wants to buy the dump](https://www.cnn.com/2025/02/14/uk/james-howells-landfill-bitcoin-gbr-intl-scli));
Fortune, February 2025; reports on the October 2025 bitcoin record (The Block, Bloomberg) and on the November 2026
price (Fortune, CoinDesk).

- **Not disputed:** he mined bitcoin from early 2009 on a laptop; the keys were on a hard drive that went to the
  Docksway landfill in Newport in mid-2013; he realised in late 2013; the council has refused every request to dig,
  citing its environmental permit; in 2021 he offered it 25% of the proceeds; his 2022 plan had investors, AI
  scanning, drones and robot dogs; he sued for £495 million and the High Court struck the claim out in January 2025
  (the appeal failed in March 2025); in 2025 he offered to buy part of the landfill (£25 million, July 2025); in
  August 2025 he said he had given up.
- **How many coins:** reports said 7,500 until 2021 and 8,000 since. The film says 8,000.
- **Who took the bag:** his partner at the time took the rubbish to the tip; she says he asked her to, and he has said
  he "subconsciously" blames her. The film says only that the drive went into a bin bag by mistake and the bag went to
  the dump, and does not show her.
- **The values:** the chips and the chart use rough prices (about $1,000 in late 2013, $35,000 in January 2021,
  $98,000 at the end of 2024, a peak reported between $125,700 and $126,200 in October 2025, rounded here to $125,000).
  "About a billion dollars at its peak" and "about $480 million today" (bitcoin near $60,000 in November 2026) are
  approximate.
- **The closure:** the council planned to close the landfill in its 2025/26 financial year, with a solar farm on part
  of the site. I could not confirm that it has closed, so the narration says it "plans to close it for good".
- All pictures are AI-generated illustrations, not footage, and James is not drawn from photos of him.

## Credits

Same models and tools as `../sahara-ai/` (Qwen-Image, Wan 2.2, Lightning LoRAs, ComfyUI, RIFE, Real-ESRGAN), plus the
Kokoro-82M voice (Apache 2.0). Fonts: Anton, Barlow Condensed and JetBrains Mono (OFL).
