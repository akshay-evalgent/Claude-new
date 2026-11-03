// Captures the MiroFish live demo with a virtual clock: smooth sequences regardless of render speed.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const [, , out, initPath] = process.argv;
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.addInitScript({ content: fs.readFileSync(initPath, 'utf8') });
  const pump = async (ms, step = 33) => { for (let t = 0; t < ms; t += step) { await p.evaluate(s => window.__advance(s), step); await p.waitForTimeout(4); } };
  const shot = async (name) => { await p.screenshot({ path: path.join(out, name), type: 'jpeg', quality: 88 }); };
  const seq = async (name, durMs, everyMs = 160) => {
    const dir = path.join(out, name); fs.mkdirSync(dir, { recursive: true });
    const n = Math.round(durMs / everyMs); const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      await shot(path.join(name, `f_${String(i).padStart(4, '0')}.jpg`));
      await pump(everyMs);
      if (i % 25 === 0) console.log(`${name} ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  };
  // landing page
  await p.goto('https://666ghj.github.io/mirofish-demo/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pump(3000); await shot('landing.jpg');
  // console
  await p.goto('https://666ghj.github.io/mirofish-demo/console', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pump(3000); await shot('console.jpg');
  await p.click('text=Try Now');
  await seq('graph', 24000);
  await p.click('button:has-text("Go to Env Setup")'); await seq('env', 12000);
  await p.click('button:has-text("Start Dual-Platform Simulation")'); await seq('sim', 16000);
  await p.click('button:has-text("GENERATE REPORT")'); await seq('report', 12000);
  await p.click('button:has-text("Go to Interaction")'); await pump(2500); await shot('interaction.jpg');
  await p.click('button:has-text("Chat with any agent")').catch(() => {}); await pump(1500); await shot('interaction_agents.jpg');
  // graph-only view with labels for a hero still
  await p.click('button:has-text("Graph")').catch(() => {}); await pump(3000); await shot('graph_full.jpg');
  console.log('DONE');
  await b.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
