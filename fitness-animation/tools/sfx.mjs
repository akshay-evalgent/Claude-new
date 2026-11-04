// Synthesised UI sound design for the animation cues (no samples, no licences).
// Every component in engine.js registers a cue {t, type, gain}; this turns the
// list into a quiet stereo WAV bed: whooshes for figures, marker scratches for
// arrows, ticks for lines and timers, pops for cards, a low hit for chapters.
// Keep it under the voice: the master sits around -20 LUFS before the VO.

const TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
const onePole = (fc, sr) => 1 - Math.exp(-TAU * fc / sr);

/** Each voice returns a mono Float32Array. */
const voices = {
  whoosh(sr, r) {
    const n = Math.floor(sr * 0.75), out = new Float32Array(n);
    let lp = 0, lp2 = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n, env = Math.sin(Math.PI * Math.pow(k, 0.7)) ** 2;
      const fc = 250 + 2600 * Math.sin(Math.PI * k);
      lp += onePole(fc, sr) * ((r() * 2 - 1) - lp);
      lp2 += onePole(180, sr) * (lp - lp2);
      out[i] = (lp - lp2) * env * 0.55;
    }
    return out;
  },
  marker(sr, r) { return scratch(sr, r, 0.42, 3200, 0.3); },
  write(sr, r) { return scratch(sr, r, 0.6, 2600, 0.22); },
  tick(sr) { return click(sr, 2300, 0.028, 0.35); },
  tick2(sr) { return click(sr, 1500, 0.03, 0.25); },
  step(sr, r) {
    const n = Math.floor(sr * 0.09), out = new Float32Array(n); let lp = 0;
    for (let i = 0; i < n; i++) { const env = Math.exp(-i / (sr * 0.018)); lp += onePole(700, sr) * ((r() * 2 - 1) - lp); out[i] = lp * env * 1.6; }
    return out;
  },
  pop(sr, r) {
    const n = Math.floor(sr * 0.14), out = new Float32Array(n); let ph = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n, f = 820 - 440 * k, env = Math.exp(-k * 7) * Math.min(1, i / (sr * 0.002));
      ph += TAU * f / sr; out[i] = (Math.sin(ph) * 0.5 + (r() * 2 - 1) * 0.04 * Math.exp(-k * 30)) * env;
    }
    return out;
  },
  blip(sr) {
    const n = Math.floor(sr * 0.11), out = new Float32Array(n); let ph = 0;
    for (let i = 0; i < n; i++) { const k = i / n, f = 1100 + 500 * k, env = Math.exp(-k * 6) * Math.min(1, i / (sr * 0.003)); ph += TAU * f / sr; out[i] = Math.sin(ph) * env * 0.28; }
    return out;
  },
  roll(sr) {
    const dur = 1.5, n = Math.floor(sr * dur), out = new Float32Array(n), c = click(sr, 2000, 0.02, 0.18);
    for (let j = 0; j < 22; j++) {
      const k = 1 - Math.pow(1 - j / 22, 2.2), at = Math.floor(k * (n - c.length));
      for (let i = 0; i < c.length; i++) out[at + i] += c[i] * (1 - j / 30);
    }
    return out;
  },
  swell(sr, r) {
    const n = Math.floor(sr * 1.6), out = new Float32Array(n); let ph1 = 0, ph2 = 0, lp = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n, env = Math.min(1, k / 0.25) * Math.exp(-Math.max(0, k - 0.25) * 3.2);
      ph1 += TAU * 98 / sr; ph2 += TAU * 147 / sr;
      lp += onePole(1800, sr) * ((r() * 2 - 1) - lp);
      out[i] = (Math.sin(ph1) * 0.32 + Math.sin(ph2) * 0.18 + lp * 0.12) * env;
    }
    return out;
  },
  boom(sr, r) {
    const n = Math.floor(sr * 1.3), out = new Float32Array(n); let ph = 0, lp = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n, f = 62 - 22 * k, env = Math.exp(-k * 4.5) * Math.min(1, i / (sr * 0.004));
      ph += TAU * f / sr; lp += onePole(400, sr) * ((r() * 2 - 1) - lp);
      out[i] = (Math.sin(ph) * 0.9 + lp * 0.5 * Math.exp(-k * 25)) * env;
    }
    return out;
  },
};

function click(sr, f, decay, amp) {
  const n = Math.floor(sr * decay * 5), out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin(TAU * f * i / sr) * Math.exp(-i / (sr * decay)) * amp;
  return out;
}
function scratch(sr, r, dur, fc, amp) {
  const n = Math.floor(sr * dur), out = new Float32Array(n); let a = 0, b = 0, am = 0;
  for (let i = 0; i < n; i++) {
    const k = i / n, env = Math.min(1, k / 0.06) * (1 - k) ** 1.5;
    const x = r() * 2 - 1; a += onePole(fc * 1.6, sr) * (x - a); b += onePole(fc * 0.5, sr) * (a - b);
    am += onePole(28, sr) * ((r() > 0.5 ? 1 : 0.35) - am); // the nib catching the paper
    out[i] = (a - b) * env * am * amp * 2.2;
  }
  return out;
}

/** cues: [{t, type, gain}] -> 16-bit stereo WAV Buffer of `duration` seconds. */
export function renderSfx(cues, duration, { sampleRate = 48000, master = 0.5 } = {}) {
  const sr = sampleRate, n = Math.ceil(duration * sr) + sr, L = new Float32Array(n), R = new Float32Array(n);
  const r = rng(1234);
  for (const [i, c] of cues.entries()) {
    const v = voices[c.type]; if (!v) continue;
    const buf = v(sr, rng(i * 977 + 5)), at = Math.floor(c.t * sr);
    const pan = (r() - 0.5) * 0.5, gl = c.gain * Math.cos((pan + 1) * Math.PI / 4) * 1.41, gr = c.gain * Math.sin((pan + 1) * Math.PI / 4) * 1.41;
    for (let j = 0; j < buf.length && at + j < n; j++) { L[at + j] += buf[j] * gl; R[at + j] += buf[j] * gr; }
  }
  // gentle bus: soft clip, then normalise to master peak
  let peak = 1e-9;
  for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
  const g = master / peak, len = Math.ceil(duration * sr);
  const wav = Buffer.alloc(44 + len * 4);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + len * 4, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(sr, 24);
  wav.writeUInt32LE(sr * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(len * 4, 40);
  for (let i = 0; i < len; i++) {
    const fade = Math.min(1, (len - i) / (sr * 0.3));
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g * fade)) * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g * fade)) * 32767), 46 + i * 4);
  }
  return wav;
}
