# She Fell From the Sky (AI cut)

A 58-second vertical short (1080×1920, 24 fps) about Juliane Koepcke. On Christmas Eve 1971 she was the only survivor of
LANSA Flight 508. She fell about 3 km into the Peruvian rainforest still strapped to her row of seats, then walked out
alone over 11 days.

It is built with the same pipeline as `../sahara-ai/`; that README covers the models, the Kaggle setup and the lessons learned.
Kaggle names come from this folder's name: notebooks `koepcke-ai-keyframes` and `koepcke-ai-clips`, and stills dataset
`koepcke-ai-stills`. To make the next short, copy the folder.

If a notebook stays QUEUED for hours while quota is left, it may be stuck rather than waiting. Push an identical
copy under another name (`python kaggle/build.py keyframes --slug koepcke-ai-kf2`). Then delete whichever of the two
starts second, or it will run the whole job again. Here the first stills run sat queued for 7 hours; the copy
started within a minute, so these stills came from `koepcke-ai-kf2`.

## Build

```bash
python kaggle/build.py keyframes && kaggle kernels push -p kaggle/push/koepcke-ai-keyframes
kaggle kernels output akkikmr/koepcke-ai-keyframes -p out/kaggle_kf && python sheet_keyframes.py kaggle_kf
python pick_keyframes.py picks.json && kaggle datasets create -p out/kf_dataset      # later rounds: datasets version
python kaggle/build.py clips && kaggle kernels push -p kaggle/push/koepcke-ai-clips
./fetch_clips.sh                                     # -> out/clips/<id>/f%04d.jpg + out/clips.json
python vo/make.py <kokoro-v1.0.onnx> <voices-v1.0.bin> && python prep_vo.py && cp out/vo.wav vo/vo.wav
python audio.py                                      # out/mix.wav
node render.js frames 0 58.3 out/frames
ffmpeg -framerate 24 -i out/frames/f%05d.jpg -i out/mix.wav -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest she-fell-from-the-sky.mp4
```

Some words are respelled for the voice: `SAY` in `vo/make.py` holds the spoken forms ("Koepcke" → "Kupka",
"1971" → "nineteen seventy-one"), and the captions keep the real spelling. `prep_vo.py` matches each punctuation break
in a line to the nearest real pause in the audio. Phrases with no pause between them share one span.

## What is true, and what is not certain

Sources: Wikipedia ([Juliane Koepcke](https://en.wikipedia.org/wiki/Juliane_Koepcke),
[LANSA Flight 508](https://en.wikipedia.org/wiki/LANSA_Flight_508)), her own account in
[Vice (2010)](https://www.vice.com/en_ca/read/the-woman-who-fell-to-earth-508-v17n9), and
[The Irish Times / NYT (2021)](https://www.irishtimes.com/life-and-style/people/she-fell-3km-out-of-the-sky-and-walked-away-1.4600329).

- **Not disputed:** 24 December 1971; lightning struck the plane in a storm and it broke apart; she fell about 3 km
  still strapped to her seat row; she was 17 and flying with her mother; 92 people were on board and she was the only
  survivor; a broken collarbone and a deep cut on her arm; a bag of candy; following a stream to a river; botfly
  larvae (maggots) in the arm wound; lumberjacks took her out by canoe.
- **Her father's advice** ("if you find water, follow it") and the lumberjacks first taking her for a **water spirit**
  both come from her own account (Vice).
- **The fuel:** she says she found a boat and a barrel of diesel on the tenth day and poured it into the wound herself.
  Other reports say gasoline, and Wikipedia has the lumberjacks pouring it. The narration says "fuel" and follows
  her account.
- **The day:** she says the boat was on day 10. Wikipedia counts 11 days alone, so the end card says 11 days.
- As many as 14 others survived the fall but died before help came. The film leaves this out.
- **Today:** she is a mammalogist and has directed the Panguana research station since her father died. The station in
  the last shot is an illustration, not Panguana.
- The map is schematic, and all pictures are AI-generated illustrations, not footage.

## Credits

Same models and tools as `../sahara-ai/` (Qwen-Image, Wan 2.2, Lightning LoRAs, ComfyUI, RIFE, Real-ESRGAN), plus the
Kokoro-82M voice (Apache 2.0). Fonts: Anton, Barlow Condensed and JetBrains Mono (OFL).
