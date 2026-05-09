// Deep dive 1 test run: fetch all events + items, analisa pattern.
// Bedakan: persona "salah jawab" (tester fault) vs engine "salah serve item" (engine fault).
//
// Usage: node scripts/deep-dive-run.mjs <runId>

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  const p = resolve(ROOT, ".env.local");
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

const runId = process.argv[2];
if (!runId) { console.error("Usage: node scripts/deep-dive-run.mjs <runId>"); process.exit(1); }

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const ADMIN_EMAIL = "suparmanpirates@gmail.com";
const BASE_URL = "http://localhost:3000";

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});

async function mintAdminIdToken() {
  const userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL);
  const customToken = await admin.auth().createCustomToken(userRecord.uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  return data.idToken;
}

const idToken = await mintAdminIdToken();

const res = await fetch(`${BASE_URL}/api/admin/test-agent/runs/${runId}`, {
  headers: { Authorization: `Bearer ${idToken}` },
});
const { run, events, items } = await res.json();

console.log(`\n=== DEEP DIVE: ${run.personaKey} (${run.personaLabel}) ===`);
console.log(`Persona: ${run.jenjang} K${run.kelas} jalur=${run.jalur}`);
console.log(`Items: ${run.itemsAnswered} · Correct: ${run.itemsCorrect} (${Math.round(run.itemsCorrect/run.itemsAnswered*100)}%)`);
console.log(`Kelas est: ${run.kelasEstimasi?.toFixed(2)} · Path: ${run.pathRoute} · Maturity: ${run.maturityLevel} (${run.maturityOverall?.toFixed(0)})`);
console.log(`Theta global: ${run.thetaGlobal?.toFixed(2)}\n`);

// Build per-stage table of items + answers
const answerEvents = events.filter((e) => e.type === "answer");

console.log(`=== ITEMS PER STAGE ===\n`);
const byStage = {};
for (const ev of answerEvents) {
  if (!byStage[ev.stage]) byStage[ev.stage] = [];
  byStage[ev.stage].push(ev);
}

for (const stage of Object.keys(byStage)) {
  const evs = byStage[stage];
  console.log(`--- ${stage.toUpperCase()} (${evs.length} items) ---`);
  console.log(`No  Item kode        Kelas  Diff   MAKU  Area     ✓/✗  Time`);
  for (const ev of evs) {
    const item = items[ev.itemId] ?? {};
    const meta = item.meta ?? {};
    const isMaku = meta.isMaku ? "yes" : "-";
    const area = (meta.area ?? "-").padEnd(8);
    const diff = (ev.itemDifficulty ?? "-").padEnd(6);
    const kelas = String(ev.itemKelas ?? "-").padEnd(2);
    const code = (ev.subKode ?? "-").padEnd(15);
    const mark = ev.correct ? "✓" : "✗";
    const time = ev.responseTimeMs ? `${Math.round(ev.responseTimeMs / 1000)}s` : "-";
    console.log(`    ${code}  ${kelas}     ${diff}  ${isMaku.padEnd(4)} ${area} ${mark}    ${time}`);
  }
  console.log();
}

// === Analyze: kelas distribution
console.log(`=== KELAS DISTRIBUTION (engine sajikan) ===\n`);
const kelasFreq = {};
for (const ev of answerEvents) {
  const k = ev.itemKelas;
  if (k != null) kelasFreq[k] = (kelasFreq[k] ?? 0) + 1;
}
for (const [k, n] of Object.entries(kelasFreq).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`  K${k}: ${n} items ${"█".repeat(n)}`);
}

// === Correct rate per kelas
console.log(`\n=== CORRECT RATE PER KELAS (persona behavior) ===\n`);
const perKelas = {};
for (const ev of answerEvents) {
  const k = ev.itemKelas;
  if (k == null) continue;
  if (!perKelas[k]) perKelas[k] = { total: 0, correct: 0 };
  perKelas[k].total++;
  if (ev.correct) perKelas[k].correct++;
}
for (const [k, s] of Object.entries(perKelas).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  const pct = Math.round((s.correct / s.total) * 100);
  console.log(`  K${k}: ${s.correct}/${s.total} = ${pct}%`);
}

// === MAKU items
const makuItems = answerEvents.filter((ev) => items[ev.itemId]?.meta?.isMaku);
const makuCorrect = makuItems.filter((ev) => ev.correct).length;
console.log(`\n=== MAKU items: ${makuItems.length} disajikan, ${makuCorrect} benar (${makuItems.length > 0 ? Math.round(makuCorrect / makuItems.length * 100) : 0}%) ===`);

// === Difficulty distribution
console.log(`\n=== DIFFICULTY DISTRIBUTION ===\n`);
const diffMap = {};
for (const ev of answerEvents) {
  const d = ev.itemDifficulty ?? "?";
  if (!diffMap[d]) diffMap[d] = { total: 0, correct: 0 };
  diffMap[d].total++;
  if (ev.correct) diffMap[d].correct++;
}
for (const [d, s] of Object.entries(diffMap)) {
  const pct = Math.round((s.correct / s.total) * 100);
  console.log(`  ${d}: ${s.correct}/${s.total} = ${pct}%`);
}

// Save full data for reference
writeFileSync(
  resolve(ROOT, "scripts", `run-${runId}-detail.json`),
  JSON.stringify({ run, events, items }, null, 2),
);
console.log(`\nFull data: scripts/run-${runId}-detail.json`);
