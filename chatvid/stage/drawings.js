/* A kid's crayon drawings, drawn as strokes so they can appear line by line.
   Drawings.svg(name, p) -> markup (viewBox 0 0 500 600); p 0..1 is how much has been drawn. */
(() => {
  const C = { red: '#e5383b', orange: '#ff8c1a', yellow: '#ffc300', green: '#3aa64a', blue: '#2f6fe0', brown: '#8b5a2b', gray: '#6d6d6d', black: '#2a2a2a', pink: '#ff6fa8', skin: '#e8b48a' };
  // each stroke: [path, colour, width]
  const ART = {
    castle: [
      ['M20 528 Q250 506 480 532', C.green, 12],
      ['M120 524 L118 300 L382 304 L380 524', C.gray, 10],
      ['M70 524 L72 222 L150 224 L148 300', C.gray, 10],
      ['M72 222 L72 196 L92 196 L92 222 L112 222 L112 196 L132 196 L132 222 L150 224', C.gray, 9],
      ['M352 302 L350 224 L430 222 L432 524', C.gray, 10],
      ['M350 224 L350 198 L370 198 L370 224 L390 224 L390 198 L410 198 L410 224 L430 222', C.gray, 9],
      ['M170 524 L170 372 Q250 270 330 372 L330 524', C.brown, 11],
      ['M240 322 h22 v22 h-22 z', C.blue, 7],
      ['M410 198 L410 128 M410 128 L460 144 L410 160', C.red, 8],
      ['M80 90 a36 36 0 1 0 72 0 a36 36 0 1 0 -72 0', C.yellow, 10],
      ['M116 34 L116 14 M164 90 L186 90 M150 56 L166 40 M150 124 L166 140', C.yellow, 7],
    ],
    dragon: [
      ['M20 540 Q250 520 480 546', C.green, 12],
      ['M130 392 Q104 268 252 276 Q402 276 392 390 Q384 478 252 478 Q128 478 130 392', C.green, 12],
      ['M190 282 L206 236 L226 280 L244 230 L262 278 L282 232 L298 282', C.green, 9],
      ['M300 300 L360 220 L372 300', C.green, 9],
      ['M170 470 L162 512 M210 476 L206 516 M300 476 L304 516 M350 466 L360 506', C.green, 10],
      ['M180 350 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0', C.black, 8],
      ['M152 410 Q172 428 196 414', C.black, 7],
      ['M130 400 L80 380 L100 400 L52 410 L96 418 L64 446 L120 424', C.orange, 9],
      ['M118 404 L92 396 L104 408 L80 416', C.red, 7],
      ['M380 380 Q450 360 440 300 Q470 330 460 270', C.green, 9],
    ],
    dad: [
      ['M20 560 Q250 540 480 566', C.green, 12],
      // the bike
      ['M262 478 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0', C.black, 8],
      ['M384 478 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0', C.black, 8],
      ['M302 478 L350 424 L424 478 M350 424 L342 400 M324 398 L360 398 M412 430 L424 404 L446 404', C.red, 8],
      // me on the bike
      ['M346 310 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0', C.black, 7],
      ['M360 316 Q368 322 376 316', C.black, 5],
      ['M366 332 L354 398 M362 352 L420 406 M354 398 L384 452', C.black, 7],
      ['M370 424 h20 v12 h-20 z M380 424 v12 M370 430 h20', C.skin, 5],
      // dad, holding the seat
      ['M196 228 a34 34 0 1 0 68 0 a34 34 0 1 0 -68 0', C.black, 8],
      ['M216 222 v4 M244 222 v4 M214 240 Q230 254 246 240', C.black, 6],
      ['M230 262 L230 410 M230 410 L198 520 M230 410 L262 520', C.black, 8],
      ['M230 302 L332 396 M230 302 L188 362', C.black, 8],
      // the heart, the words
      ['M250 156 C232 118 186 146 250 196 C314 146 268 118 250 156', C.red, 8],
      ['M52 84 L52 152 Q110 118 52 84', C.blue, 8],
      ['M116 152 L136 84 L156 152 M124 126 L148 126', C.blue, 8],
      ['M172 84 L172 152 Q230 118 172 84', C.blue, 8],
      ['M122 170 Q160 196 186 222 M174 220 L188 224 L184 208', C.blue, 6],
      ['M404 262 L404 232 L416 250 L428 232 L428 262 M440 232 L440 262 L458 262 M440 247 L454 247 M440 232 L458 232', C.orange, 6],
    ],
  };

  window.Drawings = {
    names: Object.keys(ART),
    svg(name, p = 1) {
      const strokes = ART[name] || [];
      const n = strokes.length, done = p * n;
      const body = strokes.map(([d, col, w], i) => {
        const q = Math.max(0, Math.min(1, done - i));
        if (q <= 0) return '';
        return `<path d="${d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${(1 - q).toFixed(3)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>`;
      }).join('');
      return `<svg viewBox="0 0 500 600" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="crayon" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter></defs>
        <rect width="500" height="600" fill="#fffdf4"/>
        ${Array.from({ length: 13 }, (_, i) => `<line x1="0" x2="500" y1="${46 * i + 30}" y2="${46 * i + 30}" stroke="#cfe0f5" stroke-width="2"/>`).join('')}
        <line x1="46" x2="46" y1="0" y2="600" stroke="#f3b6b6" stroke-width="2"/>
        <g filter="url(#crayon)">${body}</g></svg>`;
    },
  };
})();
