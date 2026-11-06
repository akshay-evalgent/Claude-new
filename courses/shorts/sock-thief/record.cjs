// Record a playthrough of game.html at exactly 30 fps, played by a simple autopilot.
// The game is not modified: the autopilot only presses keys, like a person would.
//
//   node courses/shorts/sock-thief/record.cjs <frames-dir> [seconds]
//
// Writes <frames-dir>/f00001.png ... and <frames-dir>/log.json (state + events per frame).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const out = process.argv[2], seconds = parseFloat(process.argv[3] || '46'), FPS = 30;
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 720, height: 960 } });
  const t0 = new Date('2026-11-06T22:00:00Z');
  await page.clock.install({ time: t0 });
  await page.goto('file://' + path.join(__dirname, 'game.html'));
  await page.clock.pauseAt(new Date(t0.getTime() + 1000));
  const canvas = await page.$('#game');

  const HOME = { x: 120, y: 820 }, HEAD = { x: 360, y: 228 };
  const held = new Set();
  const press = async (k, on) => { if (on && !held.has(k)) { await page.keyboard.down(k); held.add(k); } if (!on && held.has(k)) { await page.keyboard.up(k); held.delete(k); } };
  const releaseAll = async () => { for (const k of [...held]) await press(k, false); };

  // personality per trip: the 2nd sock is grabbed boldly (Dad wakes, we freeze), level 2 gets reckless once (busted)
  let trip = 0, frozen = false, lastHome = 0, lastLevel = 1, started = false, dared = false, lap = { x: 0, y: 0 };
  const log = [];
  const frames = Math.round(seconds * FPS);
  for (let i = 0; i < frames; i++) {
    const s = await page.evaluate(() => ({
      phase: game.phase, level: game.level + 1, lives: game.lives, score: game.score,
      dog: { x: game.dog.x, y: game.dog.y, carrying: !!game.dog.carrying, speed: game.dog.speed },
      socks: game.socks.map((k) => ({ x: k.x, y: k.y, taken: k.taken })), home: game.home.length,
      alert: game.dad.alert, mood: game.dad.mood, events: game.events.splice(0).map((e) => e.type),
    }));
    log.push({ i, t: i / FPS, phase: s.phase, level: s.level, home: s.home, score: s.score, alert: +s.alert.toFixed(3), mood: s.mood, lives: s.lives,
               dog: [Math.round(s.dog.x), Math.round(s.dog.y)], carrying: s.dog.carrying, events: s.events });
    if (s.home !== lastHome) { if (s.home > lastHome) trip++; lastHome = s.home; }
    if (s.level !== lastLevel) { lastLevel = s.level; }

    // drive
    if (s.phase === 'title') { if (i > 20 && !started) { await page.keyboard.press('Space'); started = true; } }
    else if (s.phase !== 'play') await releaseAll();
    else {
      const levelTrip = s.level === 1 ? trip : trip - 4;
      const mode = s.level === 1 && levelTrip === 1 ? 'bold' : s.level === 2 && levelTrip === 1 ? 'reckless' : 'careful';
      const dDad = Math.hypot(s.dog.x - HEAD.x, s.dog.y - HEAD.y);
      if (mode !== 'reckless') {
        if (s.mood === 'awake') frozen = true;
        if (frozen && s.mood === 'asleep' && s.alert < 0.5) frozen = false;
        if (mode === 'careful' && s.mood === 'stirring' && dDad < 330) frozen = true;
      } else frozen = false;
      let target;
      const daring = (mode === 'bold' && !dared) || mode === 'reckless';
      if (daring) {   // run laps right beside Dad's pillow (sock in mouth or not)
        if (lap.x !== 196) lap = { x: 196, y: 236 };
        if (Math.hypot(s.dog.x - lap.x, s.dog.y - lap.y) < 30) lap = { x: 196, y: lap.y === 236 ? 340 : 236 };
        target = lap;
        if (mode === 'bold' && s.mood === 'awake') dared = true;
      } else if (s.dog.carrying) target = HOME;
      else {
        const open = s.socks.filter((k) => !k.taken);
        open.sort((a, b) => Math.hypot(a.x - s.dog.x, a.y - s.dog.y) - Math.hypot(b.x - s.dog.x, b.y - s.dog.y));
        target = open[0] || HOME;
      }
      if (frozen) await releaseAll();
      else {
        const dx = target.x - s.dog.x, dy = target.y - s.dog.y;
        await press('ArrowRight', dx > 14); await press('ArrowLeft', dx < -14);
        await press('ArrowDown', dy > 14); await press('ArrowUp', dy < -14);
        const sneak = (mode === 'careful' || (mode === 'bold' && dared)) && (dDad < 300 || s.alert > 0.4);
        await press('Shift', sneak);
      }
    }
    fs.writeFileSync(path.join(out, `f${String(i + 1).padStart(5, '0')}.png`), await canvas.screenshot({ type: 'png' }));
    await page.clock.runFor(i % 3 === 2 ? 34 : 33);
  }
  fs.writeFileSync(path.join(out, 'log.json'), JSON.stringify(log));
  const ev = log.flatMap((r) => r.events.map((e) => `${r.t.toFixed(2)}s ${e}`));
  console.log(ev.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
