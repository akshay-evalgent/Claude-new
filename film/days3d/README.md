# 30,000 DAYS · 3D anime look

Toon-shaded 3D (three.js) rendered in headless Chromium, plus a manga storyboard page.

```
npm install                      # three@0.160.0
node shoot.js k1_hook:1600x900   # any shot in js/shots.js -> out/<shot>.png (about 2 s each)
python3 manga.py                 # out/manga_page.png from the renders (needs k1_hook k5_eye k6_panic m_card m_door m_roof m_end)
```

- `js/toon.js`: cel material (stepped gradient map, rim light, hair sheen band), inverted-hull ink outlines, canvas textures.
- `js/face.js`: painted anime faces (eight expressions; the jar can sit in the iris).
- `js/char.js`: characters (HERO, NEIGHBOUR, WIFE), hair clumps built on the head surface, a simple pose API.
- `js/props.js`: sky dome, jar of glowing marbles, phone, LATER boxes, room pieces, city, guitar, sparkles.
- `js/ui.js`: overlay text, Japanese SFX, speed lines, tags, cards.
- `js/shots.js`: character sheets, ten key frames (`k1`–`k10`), thumbnail, and close-up variants for the manga page (`m_*`).
- `board/web/`: the images published on the mood board.

Days left everywhere = 30,000 − 365.25 × age (21,236 at the hook is two days before his 24th birthday).
Fonts: Archivo and Playfair Display (OFL, in `fonts/`); Japanese uses the system IPAGothic.
