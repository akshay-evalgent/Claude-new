# Inception, reimagined in blocks

A 73 s vertical (1080x1920, 30 fps) animated short: the Inception crew as blocky
avatars, with the heist retold as a job inside a game server.

- `out/inception-blocks.mp4` is the finished film.
- `script.json` is the narration, one entry per scene.
- `chars.js` holds the characters and props; `film.js` holds the twelve scenes.

## Rebuild

```bash
npm install
pip install piper-tts
mkdir -p voices && cd voices && curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx && curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx.json && cd ..
python3 make_audio.py        # narration + score + build/timeline.json
node render.mjs film 4       # frames -> out/inception-blocks.mp4
./sheet.sh check 5 20 40     # contact sheet of stills at those seconds
```

`render.mjs` loads Playwright from `/opt/node22/lib/node_modules/playwright`; change
that path if Playwright lives elsewhere.
