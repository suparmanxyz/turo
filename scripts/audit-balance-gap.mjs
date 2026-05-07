// Audit difficulty gap per sub-materi untuk balance-aware seeding.
// Target: 1 Easy + 2 Medium + 2 Hard = 5 items per sub.
// Output: scripts/seed-balance-priority.json
//
// Usage: node scripts/audit-balance-gap.mjs

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
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) });
const db = admin.firestore();

// Target distribusi per sub
const TARGET = { easy: 1, medium: 2, hard: 2 }; // 5 items/sub

console.log(`\n=== AUDIT BALANCE GAP ===`);
console.log(`Target: ${TARGET.easy} easy + ${TARGET.medium} medium + ${TARGET.hard} hard = ${TARGET.easy + TARGET.medium + TARGET.hard} per sub\n`);

const peta = JSON.parse(readFileSync(resolve(import.meta.dirname, "..", "src/data/peta-prasyarat.json"), "utf8"));

// Load semua items
console.log("Loading items dari Firestore...");
const snap = await db.collection("item_bank").get();
console.log(`Total items: ${snap.size}\n`);

// Hitung per sub × difficulty
const subStats = new Map();
for (const doc of snap.docs) {
  const d = doc.data();
  const kode = d.subMateriKode;
  const diff = d.meta?.difficultyLabel ?? "untagged";
  if (!subStats.has(kode)) subStats.set(kode, { easy: 0, medium: 0, hard: 0, untagged: 0, total: 0 });
  const s = subStats.get(kode);
  s.total++;
  s[diff]++;
}

// Identify gap
const priorityList = [];
let totalNeeded = 0;
let totalNeededByDiff = { easy: 0, medium: 0, hard: 0 };

for (const sub of peta.submateri) {
  const current = subStats.get(sub.kode) ?? { easy: 0, medium: 0, hard: 0, untagged: 0, total: 0 };
  // Treat untagged items as "could be anything" — count toward medium fallback
  const effEasy = current.easy;
  const effMed = current.medium + current.untagged; // untagged dianggap medium
  const effHard = current.hard;

  const needEasy = Math.max(0, TARGET.easy - effEasy);
  const needMed = Math.max(0, TARGET.medium - effMed);
  const needHard = Math.max(0, TARGET.hard - effHard);
  const totalNeed = needEasy + needMed + needHard;

  if (totalNeed === 0) continue;

  priorityList.push({
    kode: sub.kode,
    nama: sub.nama,
    jenjang: sub.jenjang,
    kelas: sub.kelas,
    is_maku: !!sub.is_maku,
    dependents_count: sub.dependents_count ?? 0,
    current: { easy: effEasy, medium: effMed, hard: effHard, total: current.total },
    needed: { easy: needEasy, medium: needMed, hard: needHard },
    totalNeeded: totalNeed,
    // Priority score: maku × 1000 + dependents × 10 + needed
    priorityScore: (sub.is_maku ? 1000 : 0) + (sub.dependents_count ?? 0) * 10 + totalNeed,
  });

  totalNeeded += totalNeed;
  totalNeededByDiff.easy += needEasy;
  totalNeededByDiff.medium += needMed;
  totalNeededByDiff.hard += needHard;
}

priorityList.sort((a, b) => b.priorityScore - a.priorityScore);

console.log(`📊 SUMMARY`);
console.log(`Sub yang perlu balance: ${priorityList.length} dari ${peta.submateri.length}`);
console.log(`Items dibutuhkan total: ${totalNeeded}`);
console.log(`  Easy:   ${totalNeededByDiff.easy}`);
console.log(`  Medium: ${totalNeededByDiff.medium}`);
console.log(`  Hard:   ${totalNeededByDiff.hard}`);
console.log(`Cost estimasi (Sonnet 4.6 @ $0.025/item): ~$${(totalNeeded * 0.025).toFixed(2)}`);

// Per jenjang breakdown
const perJenjang = {};
for (const p of priorityList) {
  if (!perJenjang[p.jenjang]) perJenjang[p.jenjang] = { count: 0, items: 0 };
  perJenjang[p.jenjang].count++;
  perJenjang[p.jenjang].items += p.totalNeeded;
}
console.log(`\n📊 PER JENJANG`);
for (const [j, v] of Object.entries(perJenjang)) {
  console.log(`  ${j}: ${v.count} sub, ${v.items} items`);
}

// Top 20 priority preview
console.log(`\n🎯 TOP 20 PRIORITY:`);
for (const p of priorityList.slice(0, 20)) {
  const flags = [
    p.is_maku ? "⭐MAKU" : "",
    p.dependents_count > 3 ? `🔗${p.dependents_count}dep` : "",
  ].filter(Boolean).join(" ");
  console.log(`  ${p.priorityScore.toString().padStart(4)} | ${p.kode.padEnd(15)} | E${p.current.easy}/M${p.current.medium}/H${p.current.hard} → need E${p.needed.easy}/M${p.needed.medium}/H${p.needed.hard} | ${flags}`);
  console.log(`         ${p.nama.slice(0, 70)}`);
}

const outPath = resolve(import.meta.dirname, "..", "scripts/seed-balance-priority.json");
writeFileSync(outPath, JSON.stringify({
  generatedAt: new Date().toISOString().slice(0, 10),
  target: TARGET,
  totalSubs: peta.submateri.length,
  subsNeedSeeding: priorityList.length,
  totalItemsNeeded: totalNeeded,
  totalItemsNeededByDiff: totalNeededByDiff,
  perJenjang,
  priorityList,
}, null, 2));

console.log(`\n✓ Saved priority: ${outPath}`);
process.exit(0);
