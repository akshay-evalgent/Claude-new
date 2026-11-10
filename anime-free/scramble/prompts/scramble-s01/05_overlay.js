// Scramble: place card, subtitles, the flash on the kick and the fades. Times are scene seconds.
const KO = 12.5;           // the kick lands on the cut: the kick shot opens on the contact frame
const END = 480 / 24;

Anim.sketch({
  async load() {
    this.f = await Anim.fonts({ sub: "sub.ttf" });
    this.lines = Anim.data("dialogue").filter((l) => l.name !== "akane-kiai");
  },

  draw(t) {
    // A hard white frame on the impact, then a quick decay.
    if (t >= KO && t < KO + 0.05) Anim.flash(0.9);
    else if (t >= KO + 0.05 && t < KO + 0.22) Anim.flash(0.35 * (1 - (t - KO - 0.05) / 0.17));
    Anim.vignette(0.24);
    if (t < 2.4) {
      const a = Anim.envelope(t, 0.35, 2.3, 0.3, 0.35);
      Anim.placeCard(t, "TOKYO  ·  23:42", { font: this.f.sub, size: 44, color: [255, 255, 255], alpha: 0.9 * a, at: 0.35, fade: 0.3, spacing: 14, y: 96 });   // over the dark sky: the crossing stripes below are white
    }
    Anim.subtitles(t, this.lines, { font: this.f.sub, italic: this.f.sub, size: 46, tail: 0.1 });
    Anim.flash(1 - Anim.clamp01(t / 0.3), "0,0,0");
    Anim.flash(Anim.clamp01((t - (END - 0.25)) / 0.2), "0,0,0");
  },
});
