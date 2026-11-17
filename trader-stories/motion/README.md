# Motion graphics templates

Code templates for the trader-stories films, built with
[Remotion](https://www.remotion.dev) (React rendered to video). Every film
reuses the same templates and supplies its own data file.

## Templates

| Template | Use | Example shots (Xu Xiang) |
|---|---|---|
| `TitleCard` | Film title | 01.11 |
| `NumberCard` | Big type and figures; lines can land, type on, count up or stamp | 01.01, 04.08, 07.06, 09.16 |
| `QuoteCard` | Quote typed word by word with attribution, or attribution alone | 02.07, 10.05, 12.03 |
| `DocCard` | Paper documents reset in house type: notice, headline, register, redacted list, chat bubbles, phones | 01.02, 05.13, 06.03, 06.06, 07.22 |
| `LineChart` | Real price data drawn on progressively; markers, drop brackets, levels, chalkboard style, continuous across shots | 04.04, 07.02–07.10 |
| `CompareBars` | Bars where the big one leaves the frame | 02.08, 06.17 |
| `RankList` | Scroll to a rank, or climb to first | 06.18, 07.15 |
| `MapCard` | Coastline map (no political borders) with pins, drawn routes, zoom | 03.03, 05.15, 08.10 |
| `PinDistance` | Schematic street grid, two pins, a distance | 06.21 |
| `LimitDiagram` | The 10% daily price limit, day by day | 05.01, 05.12, 07.01 |
| `OrderQueue` | Buy orders stacked at the limit, a queue waiting for tomorrow | 05.04, 05.05 |
| `StepFlow` | Steps in a row, a loop, or two rows compared; builds across shots | 05.07–05.11, 06.14, 09.13 |
| `NodeWeb` | A web of companies around one centre, with highlights | 06.15, 06.16 |
| `Scoreboard` | The year-and-money readout; one transparent overlay for the whole film | `xx-scoreboard` |
| `TagOverlay` | RUMOUR / UNPROVEN / ALLEGATION / ILLUSTRATIVE, transparent | 04.09–04.11 |
| `CaptionOverlay` | Lower-right caption over an illustrated shot, transparent | 03.10, 06.08 |
| `SceneMove` | Camera moves (push, pull, pan, tilt, drift) on a generated still | `demo-scene` |

House style lives in `src/theme.ts`: colours, type, safe margins, easing. Red
and green mean money lost and gained and are used for nothing else.

## Commands

```bash
npm install
npm run studio                       # live preview in the browser
npm run render -- gallery            # preview reel of 25 shots
npm run render -- "^xx-05"           # every Xu Xiang shot in section 5
npm run render -- "^xx-" --stills    # one frame per shot, for review
npm run render -- "^xx-" --prores    # ProRes 422 HQ instead of H.264
```

Overlays (`xx-ov-*` and `xx-scoreboard`) always render as ProRes 4444 with
transparency, to lay over the edit. To use an installed Chrome instead of
letting Remotion download one, set `REMOTION_BROWSER` to its path.

## Adding a film

1. Build its shot list (`trader-stories/<film>/build_shotlist.py`), then add the
   film to the loop at the end of `scripts/build-data.mjs` and run `npm run data`.
2. Copy `src/films/xu-xiang/film.ts`: wire each graphics shot id to a template
   and props, and set the scoreboard entries.
3. Register it in `src/Root.tsx` with its own id prefix.
4. Run `npm run fonts` if the film uses new characters (Chinese, Japanese and
   so on). Fonts are subset to the characters in use and bundled, so renders
   never depend on the network.

## Data and sources

- `src/data/shc.json`: Shanghai Composite daily closes, 19 Dec 1990 to 29 Dec
  2017, from Sina Finance (`npm run data` refreshes it). It matches Yahoo
  Finance where the two overlap.
- `src/data/east-asia-land.json`: Natural Earth 1:10m coastline via
  `world-atlas`, clipped to East Asia.
- Lines that are not real data (fund performance shapes, exit timing) carry an
  on-screen ILLUSTRATIVE tag with a note saying what was actually reported.

## Licences

- Remotion is free for individuals, non-profits and companies of up to three
  people; larger companies need a company licence (see remotion.pro). Check
  this before publishing.
- Fonts (Oswald, IBM Plex Mono and Sans, Source Serif 4, Noto Serif SC) are
  under the SIL Open Font License, which allows bundling.
