// Cek anomali: sub-materi yang punya prereq dari kelas LEBIH TINGGI dari dirinya.
// Itu inkonsisten pedagogis — prereq seharusnya kelas <= target.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PETA_PATH = resolve(import.meta.dirname, "..", "src/data/peta-prasyarat.json");
const peta = JSON.parse(readFileSync(PETA_PATH, "utf8"));

const byKode = new Map();
for (const s of peta.submateri) byKode.set(s.kode, s);

const JENJANG_BASE = { SD: 0, SMP: 6, SMA: 9 };
function absKelas(s) { return JENJANG_BASE[s.jenjang] + s.kelas; }

const anomalies = [];
for (const sub of peta.submateri) {
  for (const p of sub.prereq) {
    if (p.relation !== "STRICT") continue;
    const psub = byKode.get(p.kode);
    if (!psub) continue;
    if (absKelas(psub) > absKelas(sub)) {
      anomalies.push({
        target: sub.kode,
        target_kelas: `${sub.jenjang} K${sub.kelas}`,
        prereq: p.kode,
        prereq_kelas: `${psub.jenjang} K${psub.kelas}`,
        weight: p.weight,
        reason: p.reason,
      });
    }
  }
}

console.log(`Total anomali (prereq kelas > target kelas): ${anomalies.length}`);
for (const a of anomalies.slice(0, 50)) {
  console.log(`  ${a.target} (${a.target_kelas}) ← ${a.prereq} (${a.prereq_kelas}) [${a.weight}] — ${a.reason.slice(0, 60)}`);
}
if (anomalies.length > 50) console.log(`  ... +${anomalies.length - 50} more`);

// Stats
const byTarget = {};
for (const a of anomalies) {
  byTarget[a.target_kelas] = (byTarget[a.target_kelas] ?? 0) + 1;
}
console.log("\nStats anomali per kelas target:", byTarget);
