# Opus 5.5 video styles: catalog and selector

Built from the Skillry gallery (https://skillry.dev/ai-videos/opus-5-5) and the
community mirrors of it, because skillry.dev is blocked by this session's network
policy. Sources: Skillry's own indexed entry pages, HiAPIAI/awesome-opus-5-5-video-styles
(the same 425 prompts sorted into 12 looks, with recipes), LeaddeOpenLab and
yihui-dev mirrors, Frontier Now's write-up, and tuzhechen2005/opus-video-skills.
Counts are snapshots from Sep/Oct 2026 and drift between sources.

## 1. How Skillry itself sorts the gallery (format, not look)

| Category | Count (approx) | What it covers | Usual tools |
|---|---|---|---|
| Motion graphics | ~229 | 10-15 s launch films, showreels, type bumpers, logo stings | HyperFrames + GSAP, Remotion, SVG, Canvas |
| Explainers | ~68 | "how X works" pieces, zoom-ins, data-driven stories, no footage | CSS/HTML/JS, Three.js, Canvas |
| 3D scenes | ~56 | single-file planets, camera lenses, reactors, atoms, fly-throughs | Three.js, WebGL, GLSL, WebGPU |
| Games | ~65 | playable browser games: racing, Minecraft-like, soft-body dice, temple-run | Three.js, Canvas, WebGPU, Vite+TS |

Clips run 10 s to 1 min. Nearly every entry is code-rendered (the model writes code
that draws every frame), so the LOOK has to be named in the prompt or it drifts.

Two prompt templates dominate the gallery:
- Showreel: "make a dynamic 15-second motion graphics video that shows what an
  incredible motion designer you are, like it's your showreel for a resume. go all out."
- Product film: "Create a 15s motion-graphics film explaining {{PRODUCT}}.
  HyperFrames + GSAP, no voiceover, no footage." (longer versions add copy-reading,
  brand/logo rules, sound design, export loudness)

## 2. The 12 looks (this is the list to pick from)

| # | Style | Looks like | Best for | Recipe line to append |
|---|---|---|---|---|
| 1 | Hand-drawn, sketch & comic | Wobbly pencil/ink lines on off-white paper, lines redrawn every few frames (boil), limited palette, no 3D, no glossy UI | Personal stories, emotional narrative, education for a warm tone, anything "human" | "Style: hand-drawn. Wobbly pencil or ink lines on off-white paper, redrawn slightly every few frames, limited palette, no 3D or glossy UI." |
| 2 | Collage, cutout & sand | Flat cut-out pieces, torn edges, visible paper texture, stop-motion on twos (12 fps); vintage variant: newspaper cutouts, halftone, film grain, vignette | History, journalism, memory, nostalgia, zines, music | "Style: handmade collage. Flat cut-out pieces with torn edges and visible paper texture, moving in stop-motion steps on twos (12 fps)." |
| 3 | Pixel art | 8/16-bit sprites, retro game screens, limited palette, hard pixels | Games, gaming culture, nostalgia, playful tech, dev tools | "Style: 16-bit pixel art. Hard-edged pixels, limited palette, sprite animation, no anti-aliasing." |
| 4 | Flat cartoon | Flat vector characters, rubber-hose cartoons, storybook scenes | Kids, onboarding, friendly SaaS, HR/culture, light explainers | "Style: flat cartoon. Flat vector shapes, bold outlines or none, rubber-hose motion, storybook composition." |
| 5 | Cinematic 3D | Film-grade Three.js/WebGL: lighting, PBR materials, camera moves, depth of field | Hardware, science, space, luxury product, trailers, "wow" openers | "Style: cinematic 3D. Physically based lighting, shallow depth of field, slow dolly or orbit camera, volumetric fog, film grain." |
| 6 | Low-poly & voxel | Faceted flat-shaded geometry or cubes, isometric or high three-quarter camera, pastel palette with one saturated accent | Maps, cities, logistics, architecture, cozy games, process overviews | "Style: low-poly / voxel. Faceted flat-shaded geometry or cubes, isometric or high three-quarter camera, pastel palette with one saturated accent." |
| 7 | Generative & neon | Particles, shaders, flow fields, glowing trails, liquid marble, morphing point clouds | AI/ML, data, music visualizers, crypto/fintech, abstract intros | "Style: generative neon. GPU particles with glow and trails, continuous morphs, dark background, two neon hues." |
| 8 | Kinetic typography | Big condensed type, animated letterforms, poster bumpers, HUD micro-type; a known palette is black/cream/lime | Quotes, manifestos, stats-led pitches, lyric videos, announcements | "Style: kinetic typography. Bold condensed type as the hero, words arrive on the beat, HUD micro-type, black/cream/lime palette." |
| 9 | Product UI promo | Crisp vector screens, a moving cursor clicking through one flow, spring easing, soft shadows on light background, logo at the end | SaaS launches, feature announcements, app demos, Product Hunt | "Style: product launch film. Crisp vector screens, a moving cursor that clicks through one flow, smooth spring easing, soft shadows on a light background, logo at the end." |
| 10 | Retro, terminal & old film | Monochrome film (grain, flicker, vignette) OR CRT terminal (phosphor color, scanlines, ASCII); no modern gradients | Dev tools/CLI, hacker aesthetic, history, horror, "found footage" | "Style: retro. Either monochrome film (grain, flicker, vignette) or CRT terminal (phosphor green/amber, scanlines, ASCII). No modern gradients." |
| 11 | Explainers & data viz | Diagrams that build themselves, animated charts, labelled cutaways, zoom from macro to micro | Finance, science, "how it works", reports, education | "Style: animated explainer. Diagrams draw themselves on, one idea per frame, labels animate with the thing they label, charts grow from zero." |
| 12 | Photoreal & live action | Real footage or photoreal renders, cut and composed in code into music videos, ads, documentaries | Brand ads, documentaries, music videos, anything with real footage | "Style: photoreal. Real footage or photoreal renders, cut on the beat, graded with a single LUT, minimal graphics." |

Two further looks from the opus-video-skills project fit in as sub-styles:
- Painted animation (p5.js + p5.brush watercolour, beat-cut, karaoke lyrics) = Hand-drawn, painterly variant. Best for music and lyric videos.
- Particle cinema (cinematic GPU particles, glow, trails, continuous morphs) = Generative & neon, cinematic variant.

## 3. How styles combine

A video is FORMAT (section 1) + PRIMARY LOOK (section 2) + optional SECONDARY LOOK
for text or accents + TREATMENT (grain, scanlines, paper texture, DOF).

Pairs that work (seen repeatedly in the gallery):
- Product UI promo + Kinetic typography: the standard 15 s SaaS launch film.
- Cinematic 3D + Kinetic typography: hardware/space/science trailer with hero stats.
- Explainers & data viz + Low-poly: process, logistics, "how a city/warehouse/network works".
- Explainers & data viz + Hand-drawn: warm educational story (this repo's "Map From Memory" is exactly this).
- Generative & neon + Kinetic typography: AI/ML, music, crypto intros.
- Collage + Retro film: history, archive, journalism.
- Pixel art + Retro terminal: dev tools, games, hacker culture.
- Flat cartoon + Explainer: onboarding and kids' education.
- Photoreal + Kinetic typography: brand ad or music video with lyric overlays.

Pairs that clash (avoid unless the clash is the point):
- Hand-drawn or Collage with Product UI (handmade vs crisp vector).
- Cinematic 3D with Flat cartoon (depth vs flatness).
- Pixel art with Cinematic 3D (except as a deliberate "retro game to real" reveal).
- More than two looks in one film under 30 s.

Use ONE look when: the film is under 15 s, it is a single idea, or the brand has one
established visual language. Use TWO when text needs its own treatment (type over a
3D or generative world) or the piece has a narrative turn (then switch look at the turn).

## 4. Topic to style selector

| Topic you give me | Primary | Secondary | Treatment | Format |
|---|---|---|---|---|
| SaaS / app / feature launch | Product UI promo | Kinetic typography | Spring easing, light bg, logo end card | Motion graphics, 15 s |
| Developer tool, CLI, API | Retro terminal | Kinetic typography or Pixel art | Scanlines, phosphor, monospace | Motion graphics |
| AI / ML / data platform | Generative & neon | Kinetic typography | Dark bg, two hues, particle morphs | Motion graphics or Explainer |
| Hardware, device, gadget | Cinematic 3D | Product UI (for the screen) | DOF, studio lighting, slow orbit | 3D scene |
| Science, space, physics | Cinematic 3D | Explainers & data viz | Volumetric, macro-to-micro zoom | Explainer |
| Finance, markets, reports | Explainers & data viz | Kinetic typography | Charts grow from zero, one accent colour | Explainer |
| Personal / emotional story | Hand-drawn | (none) or Collage | Paper texture, one accent colour meaning something | Explainer / narrative |
| History, archive, journalism | Collage | Retro film | Halftone, grain, vignette | Explainer / narrative |
| Music video, lyric video | Painted animation or Generative neon | Kinetic typography | Beat-cut, karaoke subtitles | Motion graphics |
| Kids, education, onboarding | Flat cartoon | Explainers & data viz | Bold flat colour, rubber-hose motion | Explainer |
| City, map, logistics, architecture | Low-poly & voxel | Explainers & data viz | Isometric camera, pastel + one accent | 3D scene / Explainer |
| Game or gaming culture | Pixel art or Low-poly | Retro terminal | Sprite motion, CRT optional | Game |
| Brand ad with real footage | Photoreal | Kinetic typography | Single LUT, beat cut | Motion graphics |
| Horror, mystery, thriller | Retro film | Hand-drawn (ink) | Heavy grain, flicker, vignette | Narrative |
| Nature, travel, environment | Low-poly (stylised) or Cinematic 3D (realistic) | Hand-drawn captions | Soft light, slow camera | 3D scene |
| Quote, manifesto, announcement | Kinetic typography | (none) | Black/cream/lime or brand palette | Motion graphics, 10 s |
| Health, wellness, mindfulness | Hand-drawn or Flat cartoon | (none) | Soft palette, slow dissolves allowed | Explainer |
| Crypto, fintech, web3 | Generative & neon | Product UI | Glow, dark bg, one metallic accent | Motion graphics |

## 5. What I check before picking (when you give me a topic)

1. Audience and tone: warm/human leans 1, 2, 4; precise/technical leans 9, 10, 11; spectacle leans 5, 7.
2. Is there real footage or imagery? Yes leans 12 or 2; no leans code-drawn looks.
3. Duration: under 15 s gets one look; 15-60 s may get a primary and a text look.
4. Is it a story (narrative turn) or a pitch (single claim)? Stories allow a look change at the turn; pitches do not.
5. Platform: vertical social wants burned-in captions and big type; landscape web allows UI detail and 3D depth.
6. Output: primary look, secondary look, treatment, format, the recipe line(s) to paste, and the closest Skillry entry to reference.

Give me a topic and I will return that selection.
