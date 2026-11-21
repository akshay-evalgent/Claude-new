# Free assets for video: humans, motion, environments, props, sound, voice

What's worth using, what each costs you (license, login), and whether it works from a script with no account. "Tested here" means this kit downloaded and used it from this container.

## Humans

| Source | What you get | License | Account | Notes |
|---|---|---|---|---|
| **[MPFB](https://extensions.blender.org/add-ons/mpfb/) + [MakeHuman system assets](https://static.makehumancommunity.org/assets/assetpacks/index.html)** | Realistic, parametric humans in Blender: age, gender, build, ethnicity; skins, eyes, eyebrows, hair, clothes, shoes; rigs incl. CMU, Mixamo, game-engine, Rigify | Code GPLv3, assets **CC0** | No | **Tested here.** `blender/human.py` builds a dressed, rigged person in one call. More clothes, hair and hats in the community asset packs. |
| [Quaternius Universal Base Characters + Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) | Stylized-realistic humans and 120+ animations (walk, run, sit, push, crawl...) on one humanoid rig, glTF/FBX | **CC0** | No (OpenGameArt mirror) | Animation library downloaded here; best for three.js or game-style looks. |
| [Kenney](https://kenney.nl/assets) / [KayKit](https://kaylousberg.itch.io/) | Low-poly animated characters | **CC0** | No | Blocked from this container (403); fine on a desktop. |
| [Mixamo](https://www.mixamo.com) | Rigged characters + thousands of animations, auto-rigging | Royalty-free; can't redistribute raw files | Adobe ID | The biggest free animation library, but needs a login, so it can't be scripted here. |
| [VRoid Studio](https://vroid.com/en/studio) | Anime-style characters | Free | No | Desktop app. |
| ~~Ready Player Me~~ | — | — | — | Shut down January 31, 2026. |

## Motion capture

| Source | What you get | License | Notes |
|---|---|---|---|
| **[CMU Graphics Lab mocap](https://mocap.cs.cmu.edu/) ([BVH mirror](https://github.com/una-dinosauria/cmu-mocap))** | 2,500+ real captured motions: walks, runs, jumps, dances, sports, everyday actions | Free for any use | **Tested here.** Bone names match MPFB's `cmu_mb` rig; `human.retarget_bvh()` bakes a clip onto a character. Clips are 120 fps, mostly 2-5 s. |
| [Quaternius Animation Library](https://opengameart.org/content/universal-animation-library) | 120+ hand-keyed game animations | CC0 | Downloaded here (`downloads/ual.zip`). |
| Mixamo | Thousands of mocap clips | Royalty-free | Login required. |

## Environments, lighting, materials, props

| Source | What you get | License | Notes |
|---|---|---|---|
| **[Poly Haven](https://polyhaven.com)** | HDRIs (real light + background), scanned PBR textures, 500+ scanned models | **CC0** | **Tested here** via its [free API](https://github.com/Poly-Haven/Public-API) (`fetch.py polyhaven-*`). Credit "Powered by Poly Haven" if you build on the API. |
| **[ambientCG](https://ambientcg.com)** | 2,000+ PBR materials, HDRIs, models | **CC0** | `fetch.py ambientcg Asphalt026C 2K`. No key needed. |
| [Smithsonian Open Access 3D](https://3d.si.edu/explore) | ~3,500 scanned artifacts, fossils, spacecraft | **CC0** | glTF/OBJ downloads. |
| [NASA 3D Resources](https://science.nasa.gov/3d-resources/) | Spacecraft, stations, rovers, planets | Free (NASA guidelines) | Used for the ISS in `orbital-sunrise/`. |
| [Solar System Scope](https://www.solarsystemscope.com/textures/) | 2k-8k planet maps | CC BY 4.0 | Used for the Earth in `orbital-sunrise/`. |
| [Blosm](https://prochitecture.gumroad.com/l/blender-osm) (Blender + OpenStreetMap) | Real city buildings and terrain from map data | Free basic tier; OSM data ODbL | Desktop add-on. |
| [Quaternius](https://quaternius.com) / [Kenney](https://kenney.nl) city and nature kits | Modular low-poly environments | CC0 | Game-style looks. |

## Sound, music, voice

| Source | What you get | License | Notes |
|---|---|---|---|
| [Freesound](https://freesound.org) | 600k+ sound effects and ambiences | Per sound: CC0, CC BY or CC BY-NC (filter to CC0) | Downloads and API need a free account and API key. |
| [OpenGameArt CC0 audio](https://opengameart.org/content/cc0-sound-effects) | Curated CC0 sound packs | CC0 | No account. |
| [Pixabay sound effects and music](https://pixabay.com/sound-effects/) | Large library | Pixabay License (no attribution) | Site blocks most scripted downloads. |
| [BBC Sound Effects](https://sound-effects.bbcrewind.co.uk/) | 16,000+ archive recordings | RemArc licence: personal, educational, research only | Not for monetized videos. |
| Synthesized (`audio.py` in each project) | Drones, hits, rumbles, wind, applause, heartbeat | Yours | What the films in this repo use. |
| **[Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)** | Natural text-to-speech, many voices, runs on CPU | Apache 2.0 | Being tested here as a better narrator than Piper. |
| [Piper](https://github.com/rhasspy/piper) | Fast offline text-to-speech | MIT; per-voice licenses | **Tested here** (narration in the three Shorts). |

## Stock footage and fonts

- [Pexels](https://www.pexels.com/api/) and [Pixabay](https://pixabay.com/api/docs/) video: free licenses, free API keys.
- [Google Fonts](https://fonts.google.com): SIL OFL; used for all captions here.

## Realistic people need a GPU for speed, not for quality

Everything above renders on a CPU; it's just slow. A 1080x1920 frame with a skinned, clothed human in Cycles takes 20-60 s on 4 cores; a mid-range NVIDIA GPU does the same in 1-3 s. To change one line, set `scene.cycles.device = 'GPU'`.

## Sources

- [MPFB on Blender Extensions](https://extensions.blender.org/add-ons/mpfb/), [MPFB getting started](https://static.makehumancommunity.org/mpfb/docs/getting_started.html), [CG Channel on MPFB 2](https://www.cgchannel.com/2025/03/check-out-open-source-blender-character-generation-plugin-mpfb-2)
- [Quaternius Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html), [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html), [OpenGameArt mirror](https://opengameart.org/content/universal-animation-library)
- [CMU mocap BVH mirror](https://github.com/una-dinosauria/cmu-mocap), [CMU Graphics Lab Motion Capture Database](https://mocap.cs.cmu.edu/resources.php)
- [Poly Haven API](https://polyhaven.com/our-api), [ambientCG API docs](https://docs.ambientcg.com/api/v1/downloads_csv/)
- [Smithsonian Open Access](https://si.edu/openaccess)
- [Mixamo FAQ (Adobe)](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html), [Ready Player Me shutdown](https://genies.com/blog/ready-player-me-shutdown)
- [Free sound effects roundup](https://app.cinevva.com/guides/free-sound-effects-music), [OpenGameArt CC0 sound effects](https://opengameart.org/content/cc0-sound-effects)
