# Six page directions to choose from

Every option has a logo (400 px), a LinkedIn banner (1128 x 191) and a full carousel theme already rendered:
- Overview sheet: `assets/options/name-options-sheet.png`
- Carousel look per theme: `assets/options/carousel-themes-sheet.png`
- Files: `assets/options/<key>-logo-400.png`, `assets/options/<key>-banner-1128x191.png`, `assets/carousels/v2-<key>/`

Positioning for all six: **free when possible, far cheaper when not.** Every post names the expensive tool, the free or cheap alternative, the exact monthly saving, and what you give up.

| Key | Name | Tagline | Look | Who it pulls in | Risk |
|---|---|---|---|---|---|
| `lean` | **Lean Stack** | Do more with less software. | Minimal light, off-white, one cobalt accent, Inter Display | Founders, ops leads, finance. Reads premium, so sponsors trust it | Name is generic; secure the handle early |
| `underpriced` | **Underpriced** | 10x cheaper. Same job done. | Editorial, cream paper, serif headlines, red strike | People who like Morning Brew style teardowns. Strong shareability | Serif at small sizes needs care on mobile |
| `swapped` | **Swapped** | Swap the expensive tool. Keep the result. | Duotone violet and lime, bold | Younger operators, agency owners, indie builders. Most distinctive in the feed | Lime on violet can tire; use white slides for long reads |
| `zero` | **Zero Cost AI** | Free or near-free AI and software for business. | Dark tech, money green | AI-curious SMB owners. "AI" in the name helps discovery | Hardest to extend to paid-but-cheap tools; "zero" in the name argues with a $29 pick |
| `frugal` | **Frugal Ops** | Run a tight ship. Spend on what matters. | Warm minimal, sand and terracotta | Operations people, bootstrappers. Friendly and calm | "Frugal" can read as cheap rather than smart |
| `tenx` | **10x Cheaper** | Same job. One-tenth the bill. | Black, mono type, neon orange, brutalist | Developers and technical founders. Very hooky | Monospace headlines cost legibility; the promise is a claim you must prove every post |

## Recommendation
**Lean Stack** for the brand, with the Underpriced-style editorial teardown as a weekly series inside it. Reasons: the name holds both free and paid-but-cheaper picks without contradiction, the minimal light look is rare in a feed full of dark AI pages and gradients, it photographs well as a 300 px thumbnail, and sponsors from the hosting, CRM and automation space will want to sit next to it. Second choice: **Swapped**, if you want the page to feel younger and louder.

## How to switch
Pick a key, then:
```
python3 scripts/carousel2.py content/<post>.json --theme <key>
```
Upload `assets/options/<key>-logo-400.png` and `assets/options/<key>-banner-1128x191.png` to the page. Replace the name and tagline in `content/page-copy.md`.

## Why the design is built for return visits
- One accent colour per theme, a fixed header and footer, the same hairline rules on every slide. People recognise the page before they read the name.
- Numbers are the hero on every slide. The eye lands on the price, then the strike-through, then the alternative.
- Nine slide layouts (cover, versus, bars, checklist, stat, steps, list, quote, cta) so an 11-slide deck never repeats a layout twice in a row.
- No stock art, no icons, no gradients. Nothing on a slide that is not data or a decision.
