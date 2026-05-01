/**
 * Auto-generate Universal Foundation Set per target jenjang.
 *
 * 5 set foundation:
 *   - sd_low_target  (K1-K2 target)  : pre-numerasi murni (subitasi, korespondensi)
 *   - sd_mid_target  (K3-K4 target)  : + place value, operasi awal
 *   - sd_high_target (K5-K6 target)  : + operasi 4 dasar fluency, pecahan dasar
 *   - smp_target     (K7-K9 target)  : SD K1-K6 mastery essentials
 *   - sma_target     (K10-K12)       : SD + SMP K7-K9 essentials
 *
 * Heuristik (Pendekatan C — skill-based):
 *   - Skill cluster prioritas:
 *     * number-sense : subitasi, korespondensi, magnitude, place value
 *     * operational  : 4 operasi fluency
 *     * part-whole   : decomposition, pecahan dasar
 *     * quantity     : measurement, konversi
 *     * geometry     : bangun datar dasar
 *   - Filter: is_maku, dependents_count, area "bilangan" prioritas tertinggi
 *
 * Output: src/data/foundation-set.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PETA_PATH = resolve(ROOT, "src/data/peta-prasyarat.json");
const OUT_PATH = resolve(ROOT, "src/data/foundation-set.json");

console.log("[1/6] Baca peta-prasyarat.json...");
const peta = JSON.parse(readFileSync(PETA_PATH, "utf8"));
console.log(`     ${peta.submateri.length} sub-materi total`);

// ============================================================
// Skill cluster classifier (heuristik dari nama + area)
// ============================================================

function detectSkillCluster(sub) {
  const nama = sub.nama.toLowerCase();
  if (/subitasi|membilang|korespondensi|nilai tempat|place value|magnitude|pasangan bilangan|number bond|garis bilangan|urutan bilangan/.test(nama)) {
    return "number-sense";
  }
  if (/penjumlahan|pengurangan|perkalian|pembagian|operasi|hitung campuran|fakta|fluency|mental/.test(nama)) {
    return "operational";
  }
  if (/pecahan|desimal|persen|bagian|dekomposisi|number bond|part.whole/.test(nama)) {
    return "part-whole";
  }
  if (/satuan|konversi|panjang|berat|waktu|volume|kapasitas|estimasi|perbandingan/.test(nama)) {
    return "quantity";
  }
  if (/bangun|segitiga|persegi|lingkaran|kubus|balok|geometri|sudut|simetri/.test(nama)) {
    return "geometry";
  }
  if (sub.area === "bilangan") return "operational";
  if (sub.area === "geometri") return "geometry";
  if (sub.area === "statistik") return "quantity";
  return "lain";
}

function foundationScore(sub) {
  let score = 0;
  score += sub.dependents_count * 1.5;
  if (sub.is_maku) score += 8;
  if (sub.is_entry_point) score += 3;
  if (sub.area === "bilangan") score += 3;
  if (sub.area === "geometri") score += 1;
  return score;
}

/** Round-robin pick supaya distribusi merata per kelas + skill cluster. */
function pickBalanced(subs, targetCount) {
  const ranked = [...subs]
    .map((s) => ({ sub: s, score: foundationScore(s), skill: detectSkillCluster(s) }))
    .sort((a, b) => b.score - a.score);

  // Group by (kelas, skill) — pastikan ada representasi
  const buckets = new Map();
  for (const item of ranked) {
    const key = `${item.sub.jenjang}.${item.sub.kelas}.${item.skill}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }

  const picked = [];
  const keys = Array.from(buckets.keys()).sort();
  let idx = 0;
  while (picked.length < targetCount) {
    let added = false;
    for (const key of keys) {
      const bucket = buckets.get(key);
      if (idx < bucket.length) {
        picked.push(bucket[idx]);
        added = true;
        if (picked.length >= targetCount) break;
      }
    }
    if (!added) break;
    idx++;
  }
  return picked;
}

function buildSetFromPicks(picks) {
  return {
    count: picks.length,
    kodes: picks.map((p) => p.sub.kode),
    detail: picks.map((p) => ({
      kode: p.sub.kode,
      nama: p.sub.nama,
      jenjang: p.sub.jenjang,
      kelas: p.sub.kelas,
      area: p.sub.area,
      skill_cluster: p.skill,
      is_maku: p.sub.is_maku,
      dependents_count: p.sub.dependents_count,
      score: p.score,
    })),
  };
}

// ============================================================
// SD foundation (3 sub-set)
// ============================================================

console.log("[2/6] Generate SD-Low (K1-K2 target)...");
// Foundation buat anak K1-K2: pre-numerasi murni dari K1 saja
const sdLowCandidates = peta.submateri.filter(
  (s) => s.jenjang === "SD" && s.kelas <= 1 && (s.is_maku || s.dependents_count >= 1 || s.is_entry_point),
);
const sdLowPicks = pickBalanced(sdLowCandidates, 8);
console.log(`     ${sdLowPicks.length} sub picked`);

console.log("[3/6] Generate SD-Mid (K3-K4 target)...");
// Foundation buat K3-K4: K1-K2 fundamentals
const sdMidCandidates = peta.submateri.filter(
  (s) => s.jenjang === "SD" && s.kelas <= 2 && (s.is_maku || s.dependents_count >= 1 || s.is_entry_point),
);
const sdMidPicks = pickBalanced(sdMidCandidates, 12);
console.log(`     ${sdMidPicks.length} sub picked`);

console.log("[4/6] Generate SD-High (K5-K6 target)...");
// Foundation buat K5-K6: K1-K4 fundamentals + operasi 4 dasar fluency
const sdHighCandidates = peta.submateri.filter(
  (s) => s.jenjang === "SD" && s.kelas <= 4 && (s.is_maku || s.dependents_count >= 2 || s.is_entry_point),
);
const sdHighPicks = pickBalanced(sdHighCandidates, 18);
console.log(`     ${sdHighPicks.length} sub picked`);

// ============================================================
// SMP foundation
// ============================================================

console.log("[5/6] Generate SMP-target...");
const smpCandidates = peta.submateri.filter(
  (s) => s.jenjang === "SD" && (s.is_maku || s.dependents_count >= 2 || s.is_entry_point),
);
const smpPicks = pickBalanced(smpCandidates, 25);
console.log(`     ${smpPicks.length} sub picked`);

// ============================================================
// SMA foundation
// ============================================================

console.log("[6/6] Generate SMA-target...");
const smaCandidates = peta.submateri.filter(
  (s) => (s.jenjang === "SD" || s.jenjang === "SMP") && (s.is_maku || s.dependents_count >= 2 || s.is_entry_point),
);
const smaPicks = pickBalanced(smaCandidates, 40);
console.log(`     ${smaPicks.length} sub picked`);

// ============================================================
// Save
// ============================================================

const output = {
  generated_at: new Date().toISOString(),
  source: "auto-generated dari peta-prasyarat.json (skill-cluster-based heuristic, Pendekatan C)",
  description: "5 set Universal Foundation per target jenjang. Sub-materi yang masuk set dianggap Cluster C (foundation harus mastery) terlepas distance ke bab target. Threshold adaptif per jenjang user.",
  skill_clusters: ["number-sense", "operational", "part-whole", "quantity", "geometry", "lain"],
  thresholds: {
    description: "Threshold cluster C (foundation) adaptive per jenjang user.",
    sd_low: 0.75,   // K1-K2 — masih membangun
    sd_mid: 0.80,   // K3-K4 — mulai mastery
    sd_high: 0.85,  // K5-K6 — sudah harus solid
    smp: 0.90,      // K7-K9 — foundation wajib
    sma: 0.95,      // K10-K12 — near-sempurna
  },
  sd_low_target: {
    description: "Foundation untuk siswa SD K1-K2 (target). Pre-numerasi murni: subitasi, korespondensi, magnitude, place value awal.",
    ...buildSetFromPicks(sdLowPicks),
  },
  sd_mid_target: {
    description: "Foundation untuk siswa SD K3-K4 (target). Number sense + place value + operasi awal.",
    ...buildSetFromPicks(sdMidPicks),
  },
  sd_high_target: {
    description: "Foundation untuk siswa SD K5-K6 (target). Operasi 4 dasar fluency + pecahan dasar + part-whole.",
    ...buildSetFromPicks(sdHighPicks),
  },
  smp_target: {
    description: "Foundation untuk siswa SMP K7-K9 (target). SD K1-K6 essentials.",
    ...buildSetFromPicks(smpPicks),
  },
  sma_target: {
    description: "Foundation untuk siswa SMA K10-K12 (target). SD + SMP K7-K9 essentials.",
    ...buildSetFromPicks(smaPicks),
  },
};

writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log(`\n✓ Saved ${OUT_PATH}`);

// Preview
const previewSet = (label, picks) => {
  console.log(`\n--- ${label} (${picks.length} sub, top 8) ---`);
  for (const p of picks.slice(0, 8)) {
    console.log(`  ${p.sub.kode}  ${p.sub.nama.slice(0, 50)} [${p.skill}]`);
  }
};
previewSet("SD-Low (K1-K2 target)", sdLowPicks);
previewSet("SD-Mid (K3-K4 target)", sdMidPicks);
previewSet("SD-High (K5-K6 target)", sdHighPicks);
previewSet("SMP-target", smpPicks);
previewSet("SMA-target", smaPicks);
