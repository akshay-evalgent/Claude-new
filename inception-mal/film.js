import './engine.js';
// ?acts=2 loads only that act (for isolated testing); default loads everything present
const want = new URLSearchParams(location.search).get('acts');
for (const n of [1, 2, 3, 4]) { if (want && !want.split(',').includes(String(n))) continue; const r = await fetch(`./act${n}.js`, { method: 'HEAD' }); if (r.ok) await import(`./act${n}.js`); }
window.READY = true;
