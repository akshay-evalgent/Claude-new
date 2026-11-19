# Free tools for realistic 3D animation: what to use and why

Research notes behind `orbital-sunrise/`, a photoreal shot rendered entirely with free software and free assets.

## The short answer

For realistic, cinematic renders without paying for anything, use **Blender with the Cycles path tracer**, scripted from Python, fed with **real scanned or measured assets** (Poly Haven, NASA, Solar System Scope) and finished in Blender's compositor. Browser engines like three.js are great for interactive pieces and fast motion graphics, but they do not reach path-traced realism on their own.

## Rendering engines

| Tool | What it is | Good for | Notes |
|---|---|---|---|
| [Blender](https://www.blender.org) + Cycles | Free, open-source (GPL) 3D suite with a physically based path tracer | Photoreal stills and animation | Runs headless: `blender -b -P script.py`. Everything in this repo is scripted. CPU works; NVIDIA/AMD/Apple GPUs are 10-50x faster. |
| Blender EEVEE | Real-time rasterizer inside Blender | Fast previews, stylized looks | Needs a GPU with OpenGL 4.3+. Less physically accurate than Cycles. |
| [LuxCoreRender](https://luxcorerender.org) | Free, physically based renderer | Caustics, very accurate light | Smaller community than Cycles. |
| [three.js](https://threejs.org) | WebGL engine in the browser | Interactive scenes, motion graphics, quick renders | Used for the other films in this repo. |
| [three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer) | Path tracing for three.js on the GPU | Photoreal product shots in the browser | Needs a real GPU; impractically slow on software rendering. |
| [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | Post effects for three.js (bloom, SSAO, depth of field, tone mapping) | Cheap realism boost for three.js | Don't mix with three.js's own EffectComposer. |

## Free, high-quality assets

| Source | What you get | License |
|---|---|---|
| [Poly Haven](https://polyhaven.com) | HDRI skies (real lighting), scanned PBR textures, scanned models | CC0. Has a free [public API](https://github.com/Poly-Haven/Public-API) (`api.polyhaven.com`) for scripted downloads; credit "Powered by Poly Haven" if you build on the API. |
| [NASA 3D Resources](https://science.nasa.gov/3d-resources/) | Spacecraft, stations, rovers, planets as `.glb` | Free; follow NASA's usage guidelines (no implied endorsement). The ISS model used here is "International Space Station (ISS) (B)", NASA/Michael D. Carbajal. |
| [Solar System Scope textures](https://www.solarsystemscope.com/textures/) | 2k-8k maps of Earth (day, night lights, clouds, normal, specular) and other planets | CC BY 4.0: credit "Solar System Scope". |
| NASA Visible Earth / Blue Marble | Measured Earth imagery | NASA image-use policy |

## Repos and skills worth knowing

- **[ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp)**: lets Claude drive a running Blender through MCP. Best on a desktop with Blender open; it was not needed here because Blender runs headless from scripts.
- **Community Blender skill packs for Claude Code**, for example arjun988/blender-skills and pacphi/sindri's `blender-3d`. Review the code before installing: they are community projects, and some install packages at runtime.
- **[DLR-RM/BlenderProc](https://github.com/DLR-RM/BlenderProc)**: procedural, scripted Blender pipelines for photoreal synthetic images.
- **[CGArtPython/bpy-building-blocks](https://github.com/CGArtPython/bpy-building-blocks)**: small, reusable bpy snippets for scene setup and animation.
- **Open-weight AI video models** (Wan 2.x, HunyuanVideo, LTX-Video): realistic generated footage, but they need a GPU with roughly 8-24 GB of VRAM or more. They can't run in this CPU-only environment.

## What makes a render read as real

These are the rules applied in `scene.py`:

1. **Physically based light.** A path tracer, one true light source (the sun), and real-world intensities. Avoid fill lights that real scenes wouldn't have.
2. **Real data instead of hand-drawn stand-ins.** Measured Earth maps, NASA geometry, scanned textures.
3. **Filmic tone mapping.** AgX with a "Medium High Contrast" look keeps highlights from clipping to flat white.
4. **Camera behaviour.** Realistic focal lengths (24-50 mm), slow motivated moves, depth of field, motion blur at a 180° shutter (0.5).
5. **Lens imperfections, lightly.** Bloom, a few streaks from the brightest source only, a hint of chromatic dispersion, a soft vignette.
6. **Atmosphere.** Haze and scattering separate foreground from background. Here the limb glow is computed from each view ray's tangent height with an 8-9 km scale height, so it hugs the planet like the real air.
7. **Denoise rather than brute-force samples.** OpenImageDenoise at 8 samples per pixel gives clean frames at a fraction of the time.
8. **Restraint.** Real photographs are mostly dark and quiet; one bright accent (the sun) carries the shot.

## A prompt template for cinematic shots

Use this structure when asking an AI (or yourself) for a shot. Each line maps to a concrete render setting.

```
Subject: [what, with real-world reference: "NASA ISS model, ~109 m truss"]
Place and time: [where, when, light: "over the Persian Gulf at night, orbital sunrise ahead"]
Camera: [lens and move: "30 mm to 36 mm, slow push and pan right, f/4, 180-degree shutter"]
Composition: [rule of thirds, horizon placement, what's silhouetted]
Light: [single key source and its angle, no fill; colour of the light]
Atmosphere: [haze, glow, scattering, weather]
Grade: [AgX Medium High Contrast; warm highlights, neutral shadows]
Lens: [bloom on the sun only, faint dispersion, vignette]
Length and pacing: [duration; when the key moment happens]
Delivery: [resolution, fps, format]
```

## Sources

- [Blender Cycles overview](https://render-scope.web.app/renderer/blender-cycles/)
- [Poly Haven API](https://polyhaven.com/our-api) and [Public-API repo](https://github.com/Poly-Haven/Public-API)
- [NASA ISS (B) model page](https://science.nasa.gov/3d-resources/international-space-station-iss-b/)
- [Solar System Scope textures, CC BY 4.0 (Qt attribution page)](https://doc.qt.io/qt-6/qt3d-attribution-solar-system-scope.html)
- [three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer)
- [Blender MCP listing](https://claudemarketplaces.com/mcp/ahujasid/blender-mcp)
- [Best Blender skills for Claude Code](https://skillselion.com/guides/best-blender-skills-for-claude-code)
- [CG Cookie: improving Blender renders](https://cgcookie.com/posts/improving-your-blender-3d-renders-tips-and-tricks)
- [Open-source AI video models overview](https://insiderllm.com/guides/local-ai-video-generation/)
