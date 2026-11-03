/* Thumbnails for the MiroFish short, drawn with the episode's own engine and assets.
 *   node ../../engine/render.cjs . --page thumbnail.html --query mode=v --stills 0
 *   node ../../engine/render.cjs . --page thumbnail.html --query mode=h --stills 0  */
(function () {
  const S = SHORT, K = KIT, { W, H, TAU, hash } = S;
  const C = { bg: '#05070c', blue: '#3d8bff', gold: '#ffc94d', red: '#ff3b4e', ink: '#0b0d12' };
  const ST = k => S.img(window.STILLS[k]);
  const MODE = window.THUMB_MODE;

  function star(ctx, x, y, r, fill, stroke) {
    ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU - Math.PI / 2, rr = k % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = r * .12; ctx.stroke(); }
  }
  function dots(ctx, n, seed, x0, y0, w, h) {
    const r = S.rng(seed);
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * w, y = y0 + r() * h, s = 2 + r() * 6, gold = r() < .25;
      ctx.fillStyle = gold ? 'rgba(255,201,77,.85)' : 'rgba(90,150,255,.8)'; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
      if (r() < .3) { ctx.strokeStyle = 'rgba(120,170,255,.18)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - .5) * 200, y + (r() - .5) * 200); ctx.stroke(); }
    }
  }
  function strike(ctx, x1, y1, x2, y2, w) {
    ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(255,59,78,.6)'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 - w, x2, y2); ctx.stroke(); ctx.restore();
  }
  function goldText(ctx, str, x, y, size, align = 'center') {
    ctx.save(); ctx.font = `400 ${size}px Anton`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    const g = ctx.createLinearGradient(0, y - size * .8, 0, y); g.addColorStop(0, '#fff3c4'); g.addColorStop(.45, '#ffd25e'); g.addColorStop(1, '#f09a1a');
    ctx.shadowColor = 'rgba(255,190,60,.75)'; ctx.shadowBlur = size * .25; ctx.fillStyle = g; ctx.fillText(str, x, y);
    ctx.shadowBlur = 0; ctx.lineWidth = size * .018; ctx.strokeStyle = 'rgba(120,60,0,.6)'; ctx.strokeText(str, x, y); ctx.restore();
  }
  function logoCard(ctx, cx, cy, w) {
    const img = ST('logo'); if (!img) return;
    const h = w * 2240 / 7616, pad = w * .05;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.fillStyle = '#fff';
    S.roundRect(ctx, cx - w / 2 - pad, cy - h / 2 - pad, w + pad * 2, h + pad * 2, 28); ctx.fill(); ctx.restore();
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  }

  function vertical(ctx, fx) {
    const g0 = ctx.createRadialGradient(540, 820, 50, 540, 960, 1300); g0.addColorStop(0, '#173467'); g0.addColorStop(1, C.bg);
    ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
    const gimg = S.clip('graph', 30); // the real knowledge graph, fully built
    if (gimg) { ctx.save(); ctx.globalAlpha = .16; ctx.filter = 'blur(3px)'; S.cover(ctx, gimg, 0, 0, W, H, { zoom: 1.35, fx: .25, fy: .5 }); ctx.restore(); }
    ctx.fillStyle = 'rgba(5,7,12,.5)'; ctx.fillRect(0, 0, W, H);
    dots(ctx, 160, 3, 0, 0, W, H);
    // he hoped for 1,000
    ctx.save(); ctx.font = '900 78px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('HE HOPED FOR', 540, 330); ctx.restore();
    ctx.save(); ctx.font = '400 230px Anton'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.fillText('1,000', 470, 580); ctx.restore();
    star(ctx, 830, 500, 70, null, 'rgba(255,255,255,.82)');
    strike(ctx, 210, 540, 900, 440, 26);
    // got 83,686
    ctx.save(); ctx.font = '900 78px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('HIS NEXT ONE GOT', 540, 760); ctx.restore();
    goldText(ctx, '83,686', 540, 1100, 330);
    star(ctx, 540, 1205, 62, C.gold, null);
    ctx.save(); ctx.font = '800 34px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText('GITHUB STARS', 540, 1300); ctx.restore();
    logoCard(ctx, 540, 1470, 760);
    K.pill(ctx, 540, 1680, '+ ¥30M FROM A BILLIONAIRE', { font: '900 44px Inter', bg: C.gold, color: C.ink, align: 'center', h: 92 });
    fx.bloom = .55; fx.vig = .6; fx.grain = .035; fx.ca = .0006;
  }

  function horizontal(ctx, fx) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const gimg = S.clip('graph', 30);
    if (gimg) { ctx.save(); S.cover(ctx, gimg, 0, 0, 840, H, { zoom: 1.5, fx: .24, fy: .5 }); ctx.restore(); }
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#4a6bb8'; ctx.fillRect(0, 0, 840, H); ctx.restore();
    ctx.fillStyle = 'rgba(5,10,25,.35)'; ctx.fillRect(0, 0, 840, H);
    const g = ctx.createLinearGradient(420, 0, 840, 0); g.addColorStop(0, 'rgba(5,7,12,0)'); g.addColorStop(1, 'rgba(5,7,12,1)');
    ctx.fillStyle = g; ctx.fillRect(420, 0, 421, H);
    ctx.fillStyle = C.bg; ctx.fillRect(840, 0, W - 840, H);
    const rg = ctx.createRadialGradient(980, 380, 20, 980, 380, 520); rg.addColorStop(0, 'rgba(40,80,170,.55)'); rg.addColorStop(1, 'rgba(5,7,12,0)');
    ctx.fillStyle = rg; ctx.fillRect(500, 0, W - 500, H);
    dots(ctx, 70, 9, 620, 0, 660, H);
    K.pill(ctx, 40, 60, 'A STUDENT BUILT THIS', { font: '900 34px Inter', bg: C.red, color: '#fff', h: 70 });
    ctx.save(); ctx.font = '400 124px Anton'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.fillText('1,000★', 965, 215); ctx.restore();
    strike(ctx, 790, 195, 1150, 130, 16);
    goldText(ctx, '83,686', 965, 462, 205);
    ctx.save(); ctx.font = '800 30px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText('GITHUB STARS', 965, 525); ctx.restore();
    logoCard(ctx, 965, 625, 360);
    fx.bloom = .5; fx.vig = .5; fx.grain = .03; fx.ca = .0005;
  }

  window.EP = { duration: 1, draw(ctx, t, fx) { (MODE === 'h' ? horizontal : vertical)(ctx, fx); } };
  SHORT.boot(window.EP);
})();
