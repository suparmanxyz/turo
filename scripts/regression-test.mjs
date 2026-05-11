// Regression test: run 16 persona, compare hasil dengan baseline snapshot.
// Flag kalau ada drift signifikan (kelas est ±1.5, path berubah, items count ±8).
//
// Usage:
//   node scripts/regression-test.mjs                # run + compare
//   node scripts/regression-test.mjs --save-baseline   # update baseline dari hasil current
//   node scripts/regression-test.mjs --baseline-file <path>  # custom baseline

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
const BASE_URL = "http://localhost:3000";

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});

const args = process.argv.slice(2);
const saveBaseline = args.includes("--save-baseline");
const baselineFile = args.includes("--baseline-file")
  ? args[args.indexOf("--baseline-file") + 1]
  : resolve(ROOT, "scripts", "regression-baseline.json");

const REALISTIC_PERSONAS = [
  "high_performer_smp_8",
  "high_performer_sma_11",
  "gifted_smp_7",
  "average_sd_5",
  "average_smp_8",
  "average_sma_10",
  "weak_foundation_smp_7",
  "weak_foundation_sma_11",
  "mismatch_kelas_4_acts_8",
  "weak_aljabar_smp_8",
  "visual_learner_sma_10",
  "utbk_target_sma_12",
  "knows_easy_only",
  "smp_8_baru_bab_2",
  "sma_11_belum_mulai",
  "consistent_sd_3",
];

async function mintAdminToken() {
  const u = await admin.auth().getUserByEmail(ADMIN_EMAIL);
  const ct = await admin.auth().createCustomToken(u.uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: ct, returnSecureToken: true }) },
  );
  return (await res.json()).idToken;
}

async function runPersona(personaKey, idToken) {
  const res = await fetch(`${BASE_URL}/api/admin/test-agent/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ personaKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data.runId;
}

async function fetchRun(runId, idToken) {
  const res = await fetch(`${BASE_URL}/api/admin/test-agent/runs/${runId}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

function extractMetrics(run) {
  return {
    itemsAnswered: run.itemsAnswered,
    itemsCorrect: run.itemsCorrect,
    accuracyPct: run.itemsAnswered > 0 ? Math.round((run.itemsCorrect / run.itemsAnswered) * 100) : 0,
    locatorItems: run.locatorItems ?? 0,
    coverageItems: run.coverageItems ?? 0,
    deepItems: run.deepItems ?? 0,
    kelasEstimasi: run.kelasEstimasi !== undefined ? Number(run.kelasEstimasi.toFixed(2)) : null,
    thetaGlobal: run.thetaGlobal !== undefined ? Number(run.thetaGlobal.toFixed(2)) : null,
    pathRoute: run.pathRoute ?? null,
    maturityLevel: run.maturityLevel ?? null,
    maturityOverall: run.maturityOverall !== undefined ? Number(run.maturityOverall.toFixed(0)) : null,
    assertionsTotal: run.assertionsTotal ?? 0,
    assertionsPassed: run.assertionsPassed ?? 0,
  };
}

function diffMetrics(baseline, current) {
  const flags = [];
  const tolerances = {
    kelasEstimasi: 1.5,    // ±1.5 kelas OK
    itemsAnswered: 8,      // ±8 items OK
    accuracyPct: 15,       // ±15% OK
    maturityOverall: 10,   // ±10 OK
  };
  for (const [k, tol] of Object.entries(tolerances)) {
    if (baseline[k] == null || current[k] == null) continue;
    const diff = Math.abs(current[k] - baseline[k]);
    if (diff > tol) flags.push(`${k}: ${baseline[k]} → ${current[k]} (Δ${diff.toFixed(1)} > ${tol})`);
  }
  // Categorical: pathRoute, maturityLevel
  if (baseline.pathRoute !== current.pathRoute) {
    flags.push(`pathRoute: "${baseline.pathRoute}" → "${current.pathRoute}"`);
  }
  if (baseline.maturityLevel !== current.maturityLevel) {
    flags.push(`maturityLevel: "${baseline.maturityLevel}" → "${current.maturityLevel}"`);
  }
  return flags;
}

// === MAIN ===
console.log(`\n=== REGRESSION TEST ===`);
console.log(`Baseline file: ${baselineFile}`);

const baseline = existsSync(baselineFile)
  ? JSON.parse(readFileSync(baselineFile, "utf8"))
  : null;
if (!baseline) {
  console.log(`(no baseline) — will run all personas and save as baseline.`);
} else {
  console.log(`Baseline timestamp: ${baseline.ranAt}, ${baseline.results.length} personas`);
}

const idToken = await mintAdminToken();
console.log(`\nRunning ${REALISTIC_PERSONAS.length} personas...\n`);

const current = [];
let runFailed = 0;
for (let i = 0; i < REALISTIC_PERSONAS.length; i++) {
  const persona = REALISTIC_PERSONAS[i];
  process.stdout.write(`[${i + 1}/${REALISTIC_PERSONAS.length}] ${persona} ... `);
  try {
    const runId = await runPersona(persona, idToken);
    const run = await fetchRun(runId, idToken);
    const metrics = extractMetrics(run);
    current.push({ persona, runId, metrics });
    console.log(`✓ kelas:${metrics.kelasEstimasi} path:${metrics.pathRoute}`);
  } catch (e) {
    console.log(`✗ ${e.message}`);
    current.push({ persona, error: e.message });
    runFailed++;
  }
}

const snapshot = { ranAt: new Date().toISOString(), results: current };

// SAVE BASELINE mode
if (saveBaseline) {
  writeFileSync(baselineFile, JSON.stringify(snapshot, null, 2));
  console.log(`\n✓ Baseline saved: ${baselineFile}`);
  console.log(`(${current.length} personas, ${runFailed} failed)`);
  process.exit(0);
}

// DIFF mode
if (!baseline) {
  writeFileSync(baselineFile, JSON.stringify(snapshot, null, 2));
  console.log(`\n✓ First run — saved as baseline: ${baselineFile}`);
  process.exit(0);
}

console.log(`\n\n=== REGRESSION REPORT ===\n`);
let driftCount = 0;
const baselineByPersona = new Map(baseline.results.map((r) => [r.persona, r]));
for (const c of current) {
  const b = baselineByPersona.get(c.persona);
  if (!b) {
    console.log(`⚠ ${c.persona}: new persona (not in baseline)`);
    continue;
  }
  if (c.error || b.error) {
    if (c.error !== b.error) console.log(`✗ ${c.persona}: error berubah "${b.error}" → "${c.error}"`);
    continue;
  }
  const flags = diffMetrics(b.metrics, c.metrics);
  if (flags.length === 0) {
    console.log(`✓ ${c.persona}: stable`);
  } else {
    console.log(`⚠ ${c.persona}: DRIFT`);
    flags.forEach((f) => console.log(`    - ${f}`));
    driftCount++;
  }
}

const reportFile = resolve(ROOT, "scripts", "regression-report.txt");
const report = [
  `Regression test: ${new Date().toISOString()}`,
  `Baseline: ${baseline.ranAt}`,
  `Personas: ${current.length}, failed run: ${runFailed}, drift detected: ${driftCount}`,
  ``,
  ...current.map((c) => {
    const b = baselineByPersona.get(c.persona);
    if (!b || c.error || b.error) return `${c.persona}: ERROR or NEW`;
    const flags = diffMetrics(b.metrics, c.metrics);
    return flags.length === 0 ? `${c.persona}: ✓ stable` : `${c.persona}: ⚠ DRIFT\n  ${flags.join("\n  ")}`;
  }),
].join("\n");
writeFileSync(reportFile, report);

console.log(`\n=== SUMMARY ===`);
console.log(`Stable:     ${current.length - driftCount - runFailed} / ${current.length}`);
console.log(`Drift:      ${driftCount}`);
console.log(`Failed run: ${runFailed}`);
console.log(`Report:     ${reportFile}`);

if (driftCount > 0) {
  console.log(`\n⚠ Drift terdeteksi — review report dan keputusan:`);
  console.log(`   - Kalau drift acceptable (improvement): \`node scripts/regression-test.mjs --save-baseline\``);
  console.log(`   - Kalau drift unwanted (regression): rollback / investigate engine change`);
}

process.exit(driftCount > 0 ? 1 : 0);
