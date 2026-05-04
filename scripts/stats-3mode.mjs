// Stats 3-mode tagging: berapa sub yang masuk Strict / Bridge / Accelerated
// Run: node scripts/stats-3mode.mjs

import peta from "../src/data/peta-prasyarat.json" with { type: "json" };

let strict = 0, bridge = 0, accelerated = 0, total = peta.submateri.length;
const byJenjang = { SD: { strict: 0, bridge: 0, acc: 0, total: 0 }, SMP: { strict: 0, bridge: 0, acc: 0, total: 0 }, SMA: { strict: 0, bridge: 0, acc: 0, total: 0 } };

for (const s of peta.submateri) {
  byJenjang[s.jenjang].total += 1;
  // strict
  if (s.strict) { strict += 1; byJenjang[s.jenjang].strict += 1; }
  // bridge derived: !strict && dependents_count >= 2
  const isBridge = (s.bridge !== undefined) ? s.bridge : (!s.strict && s.dependents_count >= 2);
  if (isBridge) { bridge += 1; byJenjang[s.jenjang].bridge += 1; }
  // accelerated derived: SMP/SMA && is_maku && (depth>=3 || dep>=5)
  const isAccel = (s.accelerated !== undefined) ? s.accelerated : (s.jenjang !== "SD" && s.is_maku && (s.depth >= 3 || s.dependents_count >= 5));
  if (isAccel) { accelerated += 1; byJenjang[s.jenjang].acc += 1; }
}

console.log(`Total sub-materi: ${total}\n`);
console.log(`Mode counts (overlap allowed):`);
console.log(`  Strict (CP 046)  : ${strict} (${(strict / total * 100).toFixed(0)}%)`);
console.log(`  Bridge (derived) : ${bridge} (${(bridge / total * 100).toFixed(0)}%)`);
console.log(`  Accelerated (derived): ${accelerated} (${(accelerated / total * 100).toFixed(0)}%)\n`);
console.log(`Per jenjang:`);
for (const [j, c] of Object.entries(byJenjang)) {
  console.log(`  ${j}: ${c.total} total · strict ${c.strict} · bridge ${c.bridge} · accelerated ${c.acc}`);
}
