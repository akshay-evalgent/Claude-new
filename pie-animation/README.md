# Pie → π

A ~70 second animation of why a pie's area is **πr²**.

A pumpkin pie is cut into slices, and the slices are laid out in a row, alternating tip-up
and tip-down. Half the crust (the circumference, 2πr) ends up along the top and half along
the bottom. The pie is recut into 8, then 16, then 48 slices, and the row turns into a
rectangle **πr** wide and **r** tall, so the area is **πr × r = πr²**.

The same scene is written for two engines:

| File | Engine | Render |
| --- | --- | --- |
| `pie_to_pi_gx.py` | [ManimGX](https://github.com/academa-labs/manimgx) (Manim CE API, Rust + wgpu) | `renders/pie_to_pi_manimgx.mp4` |
| `pie_to_pi.py` | [3b1b/manim](https://github.com/3b1b/manim) (`manimgl`) | `renders/pie_to_pi_manimgl.mp4` |

Both renders are 1920×1080 at 60 fps.

## Render with ManimGX

Needs Python 3.13+. Fonts, math typesetting and video encoding come with the package, so
there's no LaTeX or ffmpeg to install.

```bash
pip install manimgx
```

```bash
manimgx render pie_to_pi_gx.py PieToPi
```

For a quick draft, add `-r 1280x720 --fps 30`. `manimgx inspect pie_to_pi_gx.py PieToPi`
writes a storyboard and checks the layout without rendering a video.

## Render with 3b1b/manim (manimgl)

Needs ffmpeg and a LaTeX install with `latex` and `dvisvgm`. The `custom_config.yml` here
switches manim to its small `basic` TeX template, so on Debian/Ubuntu these are enough:

```bash
sudo apt-get install ffmpeg libpango1.0-dev texlive-latex-base texlive-latex-recommended texlive-latex-extra texlive-fonts-recommended dvisvgm
```

```bash
git clone https://github.com/3b1b/manim.git && pip install -e manim && pip install -r manim/requirements.txt
```

The second `pip install` matters: the current `setup.cfg` leaves out `av`, which manimgl
imports at startup.

Run it from this folder so `custom_config.yml` is picked up:

```bash
manimgl pie_to_pi.py PieToPi -w --fps 60
```

The video lands in `videos/PieToPi.mp4`. Leave out `-w` to watch it in a preview window.

## How it works

- Every slice is a group of a filling `Sector`, a crust `AnnularSector`, crimp marks and
  spice flecks, so the pieces look like pie no matter how finely it's cut.
- Slices move as rigid bodies: each one turns about its tip while the tip slides to its
  slot, so nothing warps in flight (`move_slice`).
- `row_slots` places tips `r·sin(π/n)` apart, alternating between the bottom and top of a
  band `r·cos(π/n)` tall, so neighbouring slices share a cut edge exactly. The row is
  `(n+1)·r·sin(π/n)` wide, which approaches πr as n grows.
- `row_order` sends the top half of the pie to the crust-up slots and the bottom half to the
  crust-down slots, so the crust unrolls onto the top and bottom edges.
