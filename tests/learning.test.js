// Checks that each fly circuit actually learns. Run: node tests/learning.test.js
const assert = require('assert');
const C = require('../src/core.js');
const mean = a => a.reduce((p, q) => p + q, 0) / Math.max(1, a.length);

function dino(seed, learn) { const g = C.makeDino(seed); g.learn = learn; for (let t = 0; t < 1.5e6 && g.lives < 40; t++) g.tick(); return g.history; }
function park(seed, learn) { const g = C.makePark(seed); g.learn = learn; for (let t = 0; t < 3e6 && g.attempts < 60; t++) g.tick(); return g.history; }
function kebab(seed, learn) { const g = C.makeKebab(seed); g.learn = learn; for (let t = 0; t < 3e5; t++) g.tick(); return g.history; }
function saber(seed, learn) { const g = C.makeSaber(seed); g.learn = learn; for (let t = 0; t < 3e5; t++) g.tick(); return g; }

const results = [];
for (const seed of [1, 2, 3]) {
  const d = dino(seed, true);
  results.push(['dino', seed, mean(d.slice(0, 5)).toFixed(1), mean(d.slice(20, 40)).toFixed(1)]);
  assert(mean(d.slice(20, 40)) > 5 * Math.max(1, mean(d.slice(0, 5))), 'dino should improve');

  const p = park(seed, true), ok = a => a.filter(v => v >= 2 && v <= 25).length / a.length;
  results.push(['park', seed, ok(p.slice(0, 15)).toFixed(2), ok(p.slice(40, 60)).toFixed(2)]);
  assert(ok(p.slice(40, 60)) > ok(p.slice(0, 15)), 'parking should improve');

  const kl = kebab(seed, true), k0 = kebab(seed, false);
  results.push(['kebab', seed, mean(k0).toFixed(2) + ' (no learning)', mean(kl.slice(-50)).toFixed(2)]);
  assert(mean(kl.slice(-50)) > mean(k0) + 0.2, 'kebab learning should beat no learning');

  const s = saber(seed, true), s0 = saber(seed, false);
  results.push(['saber', seed, s0.hits + ' hits (no learning)', s.hits + ' hits']);
  assert(s.hits > 3 * Math.max(1, s0.hits), 'saber should learn to hit');
}
console.table(results.map(r => ({ task: r[0], seed: r[1], before: r[2], after: r[3] })));
console.log('All learning tests passed.');
