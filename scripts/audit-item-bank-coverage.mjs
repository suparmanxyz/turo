// Audit item bank coverage — identify priority sub yang perlu di-seed.
// Output: laporan + JSON list priority kodes untuk batch seeding.
//
// Usage: node scripts/audit-item-bank-coverage.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import admin from "firebase-admin";

function loadEnv() {
  const p = resolve(import.meta.dirname, "..", ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error("FIREBASE_SERVICE_ACCOUNT_JSON missing");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});
const db = admin.firestore();

const peta = JSON.parse(readFileSync(resolve(import.meta.dirname, "..", "src/data/peta-prasyarat.json"), "utf8"));
const foundation = JSON.parse(readFileSync(resolve(import.meta.dirname, "..", "src/data/foundation-set.json"), "utf8"));

const TARGET_COUNT = 3;

console.log(`\n=== ITEM BANK COVERAGE AUDIT ===`);
console.log(`Target: ${TARGET_COUNT} items per sub-materi\n`);

// Step 1: Load all items dari Firestore
console.log("Loading items from Firestore...");
const snap = await db.collection("item_bank").get();
const counts = new Map();
for (const doc of snap.docs) {
  const k = doc.data().subMateriKode;
  counts.set(k, (counts.get(k) ?? 0) + 1);
}
console.log(`Total items: ${snap.size}, unique sub-materi covered: ${counts.size}`);

// Step 2: Categorize sub-materi
const allKodes = peta.submateri.map((s) => s.kode);
const empty = [];        // 0 items
const lowCoverage = [];  // 1-2 items
const adequate = [];     // 3+ items

for (const sub of peta.submateri) {
  const c = counts.get(sub.kode) ?? 0;
  const entry = { kode: sub.kode, nama: sub.nama, jenjang: sub.jenjang, kelas: sub.kelas, count: c, is_maku: sub.is_maku, dependents: sub.dependents_count, is_entry: sub.is_entry_point };
  if (c === 0) empty.push(entry);
  else if (c < TARGET_COUNT) lowCoverage.push(entry);
  else adequate.push(entry);
}

console.log(`\n📊 OVERALL COVERAGE`);
console.log(`  Adequate (≥${TARGET_COUNT}): ${adequate.length} (${(adequate.length/allKodes.length*100).toFixed(1)}%)`);
console.log(`  Low coverage (1-2): ${lowCoverage.length} (${(lowCoverage.length/allKodes.length*100).toFixed(1)}%)`);
console.log(`  Empty (0 items): ${empty.length} (${(empty.length/allKodes.length*100).toFixed(1)}%)`);

// Per jenjang
const perJenjang = {};
for (const sub of peta.submateri) {
  if (!perJenjang[sub.jenjang]) perJenjang[sub.jenjang] = { total: 0, adequate: 0, low: 0, empty: 0 };
  const c = counts.get(sub.kode) ?? 0;
  perJenjang[sub.jenjang].total++;
  if (c >= TARGET_COUNT) perJenjang[sub.jenjang].adequate++;
  else if (c > 0) perJenjang[sub.jenjang].low++;
  else perJenjang[sub.jenjang].empty++;
}
console.log(`\n📊 PER JENJANG`);
for (const [j, v] of Object.entries(perJenjang)) {
  console.log(`  ${j}: ${v.total} sub | adequate ${v.adequate} | low ${v.low} | empty ${v.empty}`);
}

// Step 3: Priority subs untuk seeding
const foundationKodes = new Set();
for (const target of ["sd_low_target", "sd_mid_target", "sd_high_target", "smp_target", "sma_target"]) {
  for (const k of foundation[target].kodes) foundationKodes.add(k);
}

const priorityCandidates = [...empty, ...lowCoverage].map((e) => ({
  ...e,
  isFoundation: foundationKodes.has(e.kode),
  needed: Math.max(1, TARGET_COUNT - e.count),
  // Priority score: foundation × 1000 + maku × 100 + dependents × 10 + (TARGET - current)
  priorityScore: (foundationKodes.has(e.kode) ? 1000 : 0) + (e.is_maku ? 100 : 0) + e.dependents * 10 + (TARGET_COUNT - e.count),
}));
priorityCandidates.sort((a, b) => b.priorityScore - a.priorityScore);

console.log(`\n🎯 PRIORITY SUB-MATERI UNTUK SEEDING (top 30):`);
console.log(`(score = foundation×1000 + maku×100 + dependents×10 + needed)`);
for (const p of priorityCandidates.slice(0, 30)) {
  const flags = [
    p.isFoundation ? "🏗️ Foundation" : "",
    p.is_maku ? "⭐ MAKU" : "",
    p.is_entry ? "🚪 Entry" : "",
    p.dependents > 0 ? `🔗 ${p.dependents} dep` : "",
  ].filter(Boolean).join(" · ");
  console.log(`  ${p.priorityScore.toString().padStart(4)} | ${p.kode.padEnd(15)} | ${p.count}/${TARGET_COUNT} | ${flags}`);
  console.log(`         ${p.nama.slice(0, 80)}`);
}

// Save priority list to JSON
const priorityList = priorityCandidates.map((p) => ({
  kode: p.kode,
  count: p.count,
  needed: p.needed,
  priorityScore: p.priorityScore,
  isFoundation: p.isFoundation,
  isMaku: p.is_maku,
  jenjang: p.jenjang,
  kelas: p.kelas,
  nama: p.nama,
}));

const outPath = resolve(import.meta.dirname, "..", "scripts/seed-priority-list.json");
writeFileSync(outPath, JSON.stringify({
  generatedAt: new Date().toISOString().slice(0, 10),
  totalSubs: allKodes.length,
  targetCount: TARGET_COUNT,
  stats: {
    adequate: adequate.length,
    lowCoverage: lowCoverage.length,
    empty: empty.length,
  },
  perJenjang,
  priorityList,
}, null, 2), "utf8");

console.log(`\n✓ Saved priority list: ${outPath}`);
console.log(`  Total need seeding: ${priorityCandidates.length}`);
console.log(`  Total items needed: ${priorityCandidates.reduce((s, p) => s + p.needed, 0)}`);

// Cost estimate (Sonnet 4.6 untuk generate soal MC)
const totalItemsNeeded = priorityCandidates.reduce((s, p) => s + p.needed, 0);
const costPerItem = 0.025; // Estimate ~$0.025 per generated MC item (Sonnet 4.6 dengan caching, lebih mahal dari enrichment karena prompt lebih panjang)
console.log(`  Estimated cost (Sonnet 4.6): ~$${(totalItemsNeeded * costPerItem).toFixed(2)}`);

process.exit(0);
