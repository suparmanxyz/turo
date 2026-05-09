// Re-fetch test runs by runId dari Firestore (via /api/admin/test-agent/runs/[id]),
// summarize dengan field yang benar (kelasEstimasi, pathRoute, maturityLevel, etc).
//
// Reads runIds from scripts/test-agent-results.json.
// Outputs scripts/test-agent-summary.md (human readable) + JSON updated.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
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

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const ADMIN_EMAIL = "suparmanpirates@gmail.com";
const BASE_URL = process.argv.includes("--baseUrl")
  ? process.argv[process.argv.indexOf("--baseUrl") + 1]
  : "http://localhost:3000";

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

const resultsFile = resolve(ROOT, "scripts", "test-agent-results.json");
const results = JSON.parse(readFileSync(resultsFile, "utf8"));

console.log(`Re-fetching ${results.results.length} runs...`);
const idToken = await mintAdminIdToken();

const summaries = [];
for (const r of results.results) {
  if (!r.runId) {
    summaries.push({ ...r, status: "skipped" });
    continue;
  }
  const res = await fetch(`${BASE_URL}/api/admin/test-agent/runs/${r.runId}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    summaries.push({ runId: r.runId, error: `fetch ${res.status}` });
    continue;
  }
  const { run, events } = await res.json();
  const transitions = events.filter((e) => e.type === "stage_transition");
  const stagesVisited = transitions.map((e) => `${e.fromStage}→${e.toStage}`);

  // Collect items per stage
  const byStage = {};
  for (const e of events.filter((e) => e.type === "answer")) {
    byStage[e.stage] = (byStage[e.stage] ?? 0) + 1;
  }

  summaries.push({
    runId: r.runId,
    persona: run.personaKey,
    personaLabel: run.personaLabel,
    jenjang: run.jenjang,
    kelasInput: run.kelas,
    jalur: run.jalur,
    status: run.status,
    itemsAnswered: run.itemsAnswered,
    itemsCorrect: run.itemsCorrect,
    accuracyPct: run.itemsAnswered > 0 ? Math.round((run.itemsCorrect / run.itemsAnswered) * 100) : 0,
    durationSec: run.durationMs ? Math.round(run.durationMs / 1000) : null,
    locatorItems: run.locatorItems ?? 0,
    coverageItems: run.coverageItems ?? 0,
    deepItems: run.deepItems ?? 0,
    drillingItems: run.drillingItems ?? 0,
    itemsByStage: byStage,
    stagesVisited,
    thetaGlobal: run.thetaGlobal !== undefined ? Number(run.thetaGlobal.toFixed(2)) : null,
    kelasEstimasi: run.kelasEstimasi !== undefined ? Number(run.kelasEstimasi.toFixed(2)) : null,
    pathRoute: run.pathRoute ?? null,
    maturityLevel: run.maturityLevel ?? null,
    maturityOverall: run.maturityOverall !== undefined ? Number(run.maturityOverall.toFixed(2)) : null,
    assertionsTotal: run.assertionsTotal ?? 0,
    assertionsPassed: run.assertionsPassed ?? 0,
    failedAssertions: (run.assertions ?? []).filter((a) => !a.passed).map((a) => ({ label: a.label, detail: a.detail })),
    error: run.errorMsg ?? null,
  });
}

writeFileSync(resolve(ROOT, "scripts", "test-agent-summary.json"), JSON.stringify(summaries, null, 2));

// Print human-readable summary
console.log(`\n=== TEST AGENT RESULTS — ${summaries.length} personas ===\n`);
for (const s of summaries) {
  if (s.error || s.status === "failed" || s.status === "skipped") {
    console.log(`✗ ${s.persona ?? s.runId} — ${s.error ?? s.status}\n`);
    continue;
  }
  const realismFlags = [];
  // Realism check rules
  if (s.kelasEstimasi !== null && s.kelasInput) {
    const diff = Math.abs(s.kelasEstimasi - s.kelasInput);
    if (s.persona?.startsWith("high_performer") && diff > 1.5) realismFlags.push(`high_performer kelas est meleset ${diff.toFixed(1)} dari input`);
    if (s.persona?.startsWith("weak_foundation") && s.kelasEstimasi >= s.kelasInput - 1) realismFlags.push(`weak_foundation kelas est terlalu tinggi`);
    if (s.persona === "mismatch_kelas_4_acts_8" && s.kelasEstimasi < 6) realismFlags.push(`mismatch K4-acts-K8 → kelas est seharusnya >=6, dapat ${s.kelasEstimasi}`);
  }
  if (s.itemsAnswered < 17 || s.itemsAnswered > 60) realismFlags.push(`items count ${s.itemsAnswered} di luar range normal 17-60`);
  if (s.failedAssertions.length > 0) realismFlags.push(`${s.failedAssertions.length} asersi gagal`);

  const accLabel =
    s.accuracyPct >= 80 ? "🟢" :
    s.accuracyPct >= 60 ? "🟡" :
    s.accuracyPct >= 40 ? "🟠" : "🔴";

  console.log(`${accLabel} ${s.persona} (${s.jenjang} K${s.kelasInput} · ${s.jalur})`);
  console.log(`  Items: ${s.itemsAnswered} (${s.locatorItems}L+${s.coverageItems}C+${s.deepItems}D+${s.drillingItems}Dr) · ${s.itemsCorrect}✓ (${s.accuracyPct}%) · ${s.durationSec}s`);
  console.log(`  Kelas est: ${s.kelasEstimasi ?? "-"} · Path: ${s.pathRoute ?? "-"} · Maturity: ${s.maturityLevel ?? "-"} (${s.maturityOverall ?? "-"})`);
  console.log(`  Asersi: ${s.assertionsPassed}/${s.assertionsTotal} pass`);
  if (s.failedAssertions.length > 0) {
    s.failedAssertions.forEach((a) => console.log(`    ✗ ${a.label}${a.detail ? ` — ${a.detail}` : ""}`));
  }
  if (realismFlags.length > 0) {
    realismFlags.forEach((f) => console.log(`  ⚠ REALISM: ${f}`));
  }
  console.log();
}

console.log(`\nDetail: scripts/test-agent-summary.json`);
console.log(`Lihat di UI: ${BASE_URL}/admin/test-agent`);
