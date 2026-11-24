# Trapped Under the Sea (AI cut)

A 58-second vertical short (1080×1920, 24 fps) about Harrison Okene. In May 2013 he was the cook on the tugboat
Jascon-4 when it capsized off the coast of Nigeria and sank upside down about 30 m to the seabed. He lived for about
60 hours in an air pocket inside the hull, until divers who had come to recover the bodies found him.

It is built with the same pipeline as `../koepcke-ai/` and `../sahara-ai/`; those READMEs cover the models, the Kaggle
setup and the lessons learned (stuck queues, server memory, trimming clips). Kaggle names come from this folder's
name: notebooks `okene-ai-<mode>` and stills dataset `okene-ai-stills`. The first stills notebook was replaced while
still queued (a shot was added). Its replacement, `okene-ai-kf`, then sat queued for 30 minutes while an identical
copy, `okene-ai-kf2`, started at once, so the stills came from `okene-ai-kf2`.

Qwen-Image would not draw a capsized boat: "upside down" and "keel and propellers pointing up" gave an upright tug, and
in the cabin shots the phrase "upside-down cabin" turned Harrison himself upside down. The redo prompts describe what
is on top and what is underneath instead, and never say "upside down" for the cabin. For the sinking shot (o07) the
prompt asks for an ordinary tug in open water with no surface or sea floor, and `picks.json` turns it over (a trailing
`^` on the pick rotates the picture 180°). Other redos: a Coca-Cola logo on the bottle (o12), a flame in place of the
dying flashlight (o13), and a T-shirt in the close-ups (o01, o13), when he only had his boxer shorts.

## Build

```bash
python kaggle/build.py keyframes --slug okene-ai-kf2 && kaggle kernels push -p kaggle/push/okene-ai-kf2
kaggle kernels output akkikmr/okene-ai-kf2 -p out/kaggle_kf && python sheet_keyframes.py kaggle_kf
python pick_keyframes.py picks.json && kaggle datasets create -p out/kf_dataset      # later rounds: datasets version
python kaggle/build.py clips && kaggle kernels push -p kaggle/push/okene-ai-clips
./fetch_clips.sh                                     # -> out/clips/<id>/f%04d.jpg + out/clips.json
python vo/make.py <kokoro-v1.0.onnx> <voices-v1.0.bin> && python prep_vo.py && cp out/vo.wav vo/vo.wav
python audio.py                                      # out/mix.wav
node render.js frames 0 58.3 out/frames
ffmpeg -framerate 24 -i out/frames/f%05d.jpg -i out/mix.wav -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest trapped-under-the-sea.mp4
node youtube/make_kit.js                             # captions.en.srt and cover.jpg
```

`SAY` in `vo/make.py` respells words for the voice ("Okene" → "Oh-kenna", close to the Nigerian "oh-KEH-neh";
"2013" → "twenty thirteen"); the captions keep the real spelling.

## The edit

- The cut is `SLOTS` in `film.html` (and the same list in `audio.py`). `MAP1` is the drawn map, `BLACK` is an empty
  frame for "In total darkness".
- While he is trapped, the chip at the top counts the hours: 1 when he reaches the air pocket, 24 when the flashlights
  die ("within a day"), 60 when the divers arrive. It is a pacing device keyed to the narration, not a log of his time.
- `DIM` darkens the screen as the flashlight dies, `SNOW` draws drifting particles over the underwater shots, `RAIN`
  the rain at sea, and `SHAKE` the capsize and the flooding toilet.

## What is true, and what is not certain

Sources: Wikipedia ([Aquanaut: accidental aquanaut](https://en.wikipedia.org/wiki/Aquanaut)); AP, December 2013, his
own account ([Press Herald](https://www.pressherald.com/?p=114509),
[Inquirer](https://www.inquirer.com/philly/news/nation_world/20131212_Nigerian_survivor_almost_missed_rescue_diver.html));
ABC News, December 2013, with the dive team leader Tony Walker
([ABC](https://abcnews.com/blogs/headlines/2013/12/cook-survives-3-days-in-air-pocket-of-sunken-ship-off-nigerian-coast)).

- **Not disputed:** 26 May 2013, before dawn; the tug capsized in rough seas while helping to stabilise an oil tanker
  off Nigeria; it came to rest upside down at about 30 m (100 ft); he was in the toilet, in his boxer shorts; he felt
  his way to an air pocket (the engineer's office, about 1.2 m of air); one bottle of Coke and two flashlights from a
  life vest, which died within a day; he prayed (a psalm his wife had sent him); 12 crew, 11 died; divers sent to
  recover the bodies found him; he became a commercial diver.
- **The time:** reports say 60, 62 or "nearly three days". The narration says "almost three days" and "sixty hours".
- **The capsize:** "rough seas", "a massive swell" or "a huge wave" depending on the report. The film shows a big wave.
- **What he heard:** AP has him hearing fish (he thought sharks or barracudas) "eating and fighting over something big",
  which he took to be his crewmates' bodies. The film shows fish outside the hull and no bodies.
- **The grab:** Walker says the diver reached for what he took to be a body's hand and the hand grabbed him. Okene says
  he pulled on the diver's hand. Both fit "the hand grabbed him back".
- **Decompression:** about 60 hours (AP) or two and a half days (Wikipedia) in a decompression chamber afterwards.
- **Afterwards:** in December 2013 he said he would never go back to sea; later he trained as a commercial diver
  (Wikipedia). The last shot is an illustration of that, not a real moment.
- The map is schematic (the wreck is placed off the western Niger Delta, near Escravos), and all pictures are
  AI-generated illustrations, not footage. The real rescue was filmed by the divers' helmet cameras.

## Credits

Same models and tools as `../sahara-ai/` (Qwen-Image, Wan 2.2, Lightning LoRAs, ComfyUI, RIFE, Real-ESRGAN), plus the
Kokoro-82M voice (Apache 2.0). Fonts: Anton, Barlow Condensed and JetBrains Mono (OFL).
