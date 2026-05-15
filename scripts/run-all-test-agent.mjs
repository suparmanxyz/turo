// Run test agent untuk SEMUA persona realistic via production turo.mainmaku.id.
// Mint admin token dari email allowlist, panggil /api/admin/test-agent/run sequential,
// simpan summary ke scripts/test-agent-results.json.
//
// Usage:
//   node scripts/run-all-test-agent.mjs                # run semua realistic
//   node scripts/run-all-test-agent.mjs --baseUrl http://localhost:3000  # local dev
//   node scripts/run-all-test-agent.mjs --include-stress  # include 3 stress test

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
if (!FIREBASE_API_KEY) { console.error("NEXT_PUBLIC_FIREBASE_API_KEY missing"); process.exit(1); }
if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) { console.error("FIREBASE_SERVICE_ACCOUNT_JSON missing"); process.exit(1); }

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});

const args = process.argv.slice(2);
const argVal = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
const BASE_URL = argVal("--baseUrl") ?? "https://turo.mainmaku.id";
const INCLUDE_STRESS = args.includes("--include-stress");
const ADMIN_EMAIL = "suparmanpirates@gmail.com";

// === 16 Realistic personas (+ 3 stress optional) ===
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
const STRESS_PERSONAS = ["always_correct", "always_wrong", "random_50"];
const PERSONAS_TO_RUN = INCLUDE_STRESS
  ? [...REALISTIC_PERSONAS, ...STRESS_PERSONAS]
  : REALISTIC_PERSONAS;

// === Mint admin ID token ===
async function mintAdminIdToken() {
  console.log(`→ Looking up admin user: ${ADMIN_EMAIL}`);
  const userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL);
  console.log(`  Admin UID: ${userRecord.uid}`);
  const customToken = await admin.auth().createCustomToken(userRecord.uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  if (!res.ok) throw new Error(`signInWithCustomToken failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  console.log(`  ID token minted (expires in ${data.expiresIn}s)`);
  return data.idToken;
}

// === Run test for one persona ===
async function runPersona(personaKey, idToken) {
  const url = `${BASE_URL}/api/admin/test-agent/run`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ personaKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data.runId;
}

// === Fetch run result for inspection ===
async function fetchRun(runId, idToken) {
  const url = `${BASE_URL}/api/admin/test-agent/runs/${runId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

// === Summarize one run ===
function summarizeRun(run) {
  if (!run) return { error: "fetch failed" };
  const events = Array.isArray(run.events) ? run.events : [];
  const finalState = run.finalState ?? {};
  const assertions = Array.isArray(run.assertions) ? run.assertions : [];
  const passedAssertions = assertions.filter((a) => a.passed).length;
  const failedAssertions = assertions.filter((a) => !a.passed);

  return {
    status: run.status,
    persona: run.personaKey,
    durationSec: run.durationSec ?? null,
    itemsAnswered: run.itemsAnswered ?? events.filter((e) => e.type === "answer").length,
    correctCount: events.filter((e) => e.type === "answer" && e.correct).length,
    wrongCount: events.filter((e) => e.type === "answer" && !e.correct).length,
    finalKelasEstimasi: finalState.kelasEstimasi ?? null,
    finalPath: finalState.path ?? finalState.tier ?? null,
    finalLabel: finalState.label ?? null,
    spektrumScore: finalState.maturityProfile?.overallScore ?? null,
    assertionsTotal: assertions.length,
    assertionsPassed: passedAssertions,
    assertionsFailed: failedAssertions.length,
    failedAssertionLabels: failedAssertions.map((a) => a.name),
    error: run.error ?? null,
  };
}

// === MAIN ===
console.log(`\n=== TEST AGENT BATCH RUNNER ===`);
console.log(`Base URL: ${BASE_URL}`);
console.log(`Personas: ${PERSONAS_TO_RUN.length}\n`);

const idToken = await mintAdminIdToken();

const results = [];
let success = 0;
let failed = 0;

for (let i = 0; i < PERSONAS_TO_RUN.length; i++) {
  const personaKey = PERSONAS_TO_RUN[i];
  const idx = i + 1;
  const t0 = Date.now();
  console.log(`\n[${idx}/${PERSONAS_TO_RUN.length}] → ${personaKey}`);
  try {
    const runId = await runPersona(personaKey, idToken);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  ✓ Completed in ${elapsed}s · runId: ${runId}`);

    const run = await fetchRun(runId, idToken);
    const summary = { runId, ...summarizeRun(run) };
    results.push(summary);

    console.log(
      `  Stats: ${summary.itemsAnswered} items, ${summary.correctCount}✓/${summary.wrongCount}✗ · ` +
        `kelas est: ${summary.finalKelasEstimasi} · path: ${summary.finalPath ?? "-"} · ` +
        `label: ${summary.finalLabel ?? "-"}`,
    );
    if (summary.assertionsFailed > 0) {
      console.log(`  ⚠ Failed assertions: ${summary.failedAssertionLabels.join(", ")}`);
    }
    success++;
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`  ✗ FAILED in ${elapsed}s: ${err.message}`);
    results.push({ personaKey, error: err.message });
    failed++;
  }
}

const summaryFile = resolve(ROOT, "scripts", "test-agent-results.json");
writeFileSync(summaryFile, JSON.stringify({ baseUrl: BASE_URL, ranAt: new Date().toISOString(), results }, null, 2));

console.log(`\n=== DONE ===`);
console.log(`Success: ${success} · Failed: ${failed}`);
console.log(`Detail: ${summaryFile}`);
console.log(`\nLihat di production: ${BASE_URL}/admin/test-agent`);
