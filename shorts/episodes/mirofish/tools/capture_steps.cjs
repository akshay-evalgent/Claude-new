// Captures demo steps 3-5 by deep link with a virtual clock. pumpUntil() keeps app time moving while waiting.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const BASE = 'https://666ghj.github.io/mirofish-demo/console';
(async () => {
  const [, , out, initPath, which = 'sim,report,interaction'] = process.argv;
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })).newPage();
  await p.addInitScript({ content: fs.readFileSync(initPath, 'utf8') });
  const pump = async (ms, step = 33) => { for (let t = 0; t < ms; t += step) { await p.evaluate(s => window.__advance && window.__advance(s), step); await p.waitForTimeout(4); } };
  const pumpUntil = async (fn, maxMs = 120000, label = '') => {
    for (let t = 0; t < maxMs; t += 500) { if (await p.evaluate(fn).catch(() => false)) return true; await pump(500); }
    console.log('pumpUntil timeout', label); return false;
  };
  const shot = n => p.screenshot({ path: path.join(out, n), type: 'jpeg', quality: 88 });
  const seq = async (name, durMs, everyMs = 160) => {
    const dir = path.join(out, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const n = Math.round(durMs / everyMs), t0 = Date.now();
    for (let i = 0; i < n; i++) { await shot(path.join(name, `f_${String(i).padStart(4, '0')}.jpg`)); await pump(everyMs); if (i % 25 === 0) console.log(`${name} ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  };
  const go = async (url) => { const r = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await pump(2500); console.log('goto', url, r && r.status(), await p.evaluate(() => location.pathname)); };
  const enabled = label => `(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes(${JSON.stringify(label)})); return !!b && !b.disabled; })()`;
  const steps = which.split(',');
  if (steps.includes('sim')) {
    await go(BASE + '/simulation/sim_3b1c86fb56b0');
    await pumpUntil(enabled('Start Dual-Platform Simulation'), 180000, 'start sim');
    await shot('env_done.jpg');
    await p.click('button:has-text("Start Dual-Platform Simulation")');
    await seq('sim', 18000);
  }
  if (steps.includes('report')) {
    await go(BASE + '/report/report_888bc26a43a1');
    await seq('report', 12000);
    await pump(20000); await shot('report_done.jpg');
  }
  if (steps.includes('interaction')) {
    await go(BASE + '/interaction/report_888bc26a43a1');
    await pump(3000); await shot('interaction.jpg');
    await p.click('button:has-text("Chat with any agent")').catch(() => {}); await pump(2000); await shot('interaction_agents.jpg');
    await p.click('button:has-text("Graph")').catch(() => {}); await pump(4000); await shot('graph_full.jpg');
  }
  console.log('DONE'); await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
