// End-to-end test agent: 3 persona × (Diagnostik Awal → Tes Kesiapan Bab → Tes Kesiapan Sub)
// Capture state evolution di setiap step untuk analisa hubungan.

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
const TEST_AGENT_UID = process.env.TEST_AGENT_UID;
const BASE_URL = "http://localhost:3000";

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});
const db = admin.firestore();

async function mintToken(email = null, uid = null) {
  let userUid;
  if (email) userUid = (await admin.auth().getUserByEmail(email)).uid;
  else if (uid) userUid = uid;
  const customToken = await admin.auth().createCustomToken(userUid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) },
  );
  return (await res.json()).idToken;
}

async function resetUserState(uid) {
  // Clear: mastery, diagnostic_session, user_profile, maturity_history
  let cleared = { mastery: 0, sessions: 0, profile: 0, maturity: 0 };

  const masSnap = await db.collection("sub_materi_mastery").where("uid", "==", uid).get();
  if (!masSnap.empty) {
    const b = db.batch();
    for (const d of masSnap.docs) b.delete(d.ref);
    await b.commit();
    cleared.mastery = masSnap.size;
  }
  const sesSnap = await db.collection("diagnostic_session").where("uid", "==", uid).get();
  if (!sesSnap.empty) {
    const b = db.batch();
    for (const d of sesSnap.docs) b.delete(d.ref);
    await b.commit();
    cleared.sessions = sesSnap.size;
  }
  const profDoc = await db.collection("user_profile").doc(uid).get();
  if (profDoc.exists) {
    await profDoc.ref.delete();
    cleared.profile = 1;
  }
  const matSnap = await db.collection("maturity_history").where("uid", "==", uid).get();
  if (!matSnap.empty) {
    const b = db.batch();
    for (const d of matSnap.docs) b.delete(d.ref);
    await b.commit();
    cleared.maturity = matSnap.size;
  }
  return cleared;
}

// Persona simple model untuk Kesiapan answers
function personaAnswerKesiapan(persona, item) {
  const itemKelas = parseInt(item.subMateriKode.match(/\.(\d+)\./)?.[1] ?? "0", 10);
  const gap = itemKelas - persona.kelas;
  let base;
  if (persona.strength === "strong") base = gap <= 0 ? 0.92 : gap <= 1 ? 0.78 : 0.55;
  else if (persona.strength === "average") base = gap <= -1 ? 0.85 : gap === 0 ? 0.65 : gap === 1 ? 0.45 : 0.25;
  else base = gap <= -2 ? 0.75 : gap === -1 ? 0.55 : gap === 0 ? 0.35 : 0.18;
  return Math.random() < base;
}

async function runDiagnostikAwal(personaKey, adminToken) {
  console.log(`\n[STEP 1] Diagnostik Awal — persona ${personaKey}`);
  const res = await fetch(`${BASE_URL}/api/admin/test-agent/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ personaKey }),
  });
  const data = await res.json();
  if (!res.ok) { console.error(`  ✗ ${JSON.stringify(data)}`); return null; }
  console.log(`  ✓ runId: ${data.runId}`);

  // Fetch run detail
  const runRes = await fetch(`${BASE_URL}/api/admin/test-agent/runs/${data.runId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const { run } = await runRes.json();
  console.log(
    `  Items: ${run.itemsAnswered} (${run.locatorItems}L + ${run.coverageItems}C + ${run.deepItems}D)` +
    ` · Correct: ${run.itemsCorrect}/${run.itemsAnswered} (${Math.round(run.itemsCorrect / run.itemsAnswered * 100)}%)`,
  );
  console.log(
    `  Kelas est: ${run.kelasEstimasi?.toFixed(2) ?? "?"} · Path: ${run.pathRoute ?? "?"}` +
    ` · Maturity: ${run.maturityLevel ?? "?"} (${run.maturityOverall?.toFixed(0) ?? "?"})`,
  );
  return run;
}

async function runKesiapanBab(persona, materiSlug, agentToken) {
  console.log(`\n[STEP 2] Tes Kesiapan Bab — ${materiSlug}`);
  const startRes = await fetch(`${BASE_URL}/api/cek-kesiapan-bab/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ materiSlug }),
  });
  const start = await startRes.json();
  if (!startRes.ok) { console.error(`  ✗ ${JSON.stringify(start)}`); return null; }
  console.log(`  ✓ Bab: ${start.materiNama}, ${start.jumlahSubMateri} sub-materi`);
  console.log(`  Blind spots: ${start.blindSpots.length}`);
  for (const bs of start.blindSpots.slice(0, 5)) {
    console.log(`    - ${bs.kode} (${bs.jenjang} K${bs.kelas}) ${bs.nama} · ${bs.weight}`);
  }
  if (start.blindSpots.length > 5) console.log(`    ... ${start.blindSpots.length - 5} lagi`);

  if (start.shortCircuit) {
    console.log(`  ⚡ Short-circuit: ${start.shortCircuit.action} — ${start.shortCircuit.alasan}`);
    return { blindSpotCount: 0, decision: start.shortCircuit, warmupCount: 0 };
  }

  // Persona answer
  const answers = [];
  for (const w of start.warmupQueue) {
    const correct = personaAnswerKesiapan(persona, w.item);
    const itemSnap = await db.collection("item_bank").doc(w.item.id).get();
    const item = itemSnap.data();
    const pilihIdx = correct ? item.konten.kunci : (item.konten.kunci + 1) % item.konten.opsi.length;
    answers.push({ itemId: w.item.id, blindSpotKode: w.blindSpotKode, pilihIdx, _correct: correct });
  }
  const correctCount = answers.filter((a) => a._correct).length;
  console.log(`  Persona jawab: ${correctCount}/${answers.length} benar`);

  const finishRes = await fetch(`${BASE_URL}/api/cek-kesiapan-bab/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ materiSlug, answers: answers.map((a) => ({ itemId: a.itemId, blindSpotKode: a.blindSpotKode, pilihIdx: a.pilihIdx, responseTimeMs: 15000 })) }),
  });
  const finish = await finishRes.json();
  console.log(`  Decision: ${finish.decision.action.toUpperCase()} — ${finish.decision.alasan ?? ""}`);
  if (finish.decision.remediasiKodes) console.log(`    Remediasi: ${finish.decision.remediasiKodes.join(", ")}`);

  return { blindSpotCount: start.blindSpots.length, decision: finish.decision, warmupCount: answers.length, blindSpots: start.blindSpots };
}

async function runKesiapanSub(persona, kode, agentToken) {
  console.log(`\n[STEP 3] Tes Kesiapan Sub — ${kode}`);
  const startRes = await fetch(`${BASE_URL}/api/cek-kesiapan/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ kode }),
  });
  const start = await startRes.json();
  if (!startRes.ok) { console.error(`  ✗ ${JSON.stringify(start)}`); return null; }
  console.log(`  ✓ Sub: ${start.targetNama} (${start.targetJenjang} K${start.targetKelas})`);
  console.log(`  Blind spots: ${start.blindSpots.length}`);
  for (const bs of start.blindSpots) {
    console.log(`    - ${bs.kode} (${bs.jenjang} K${bs.kelas}) ${bs.nama}`);
  }

  if (start.shortCircuit) {
    console.log(`  ⚡ Short-circuit: ${start.shortCircuit.action} — ${start.shortCircuit.alasan}`);
    return { blindSpotCount: 0, decision: start.shortCircuit, warmupCount: 0 };
  }

  const answers = [];
  for (const w of start.warmupQueue) {
    const correct = personaAnswerKesiapan(persona, w.item);
    const itemSnap = await db.collection("item_bank").doc(w.item.id).get();
    const item = itemSnap.data();
    const pilihIdx = correct ? item.konten.kunci : (item.konten.kunci + 1) % item.konten.opsi.length;
    answers.push({ itemId: w.item.id, blindSpotKode: w.blindSpotKode, pilihIdx, _correct: correct });
  }
  const correctCount = answers.filter((a) => a._correct).length;
  console.log(`  Persona jawab: ${correctCount}/${answers.length} benar`);

  const finishRes = await fetch(`${BASE_URL}/api/cek-kesiapan/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ targetKode: kode, answers: answers.map((a) => ({ itemId: a.itemId, blindSpotKode: a.blindSpotKode, pilihIdx: a.pilihIdx, responseTimeMs: 15000 })) }),
  });
  const finish = await finishRes.json();
  console.log(`  Decision: ${finish.decision.action.toUpperCase()} — ${finish.decision.alasan ?? ""}`);

  return { blindSpotCount: start.blindSpots.length, decision: finish.decision, warmupCount: answers.length, blindSpots: start.blindSpots };
}

async function getMasteryCount(uid) {
  const snap = await db.collection("sub_materi_mastery").where("uid", "==", uid).get();
  let siap = 0, remediasi = 0, lainnya = 0;
  for (const d of snap.docs) {
    const m = d.data();
    if (m.status === "siap") siap++;
    else if (m.status === "remediasi") remediasi++;
    else lainnya++;
  }
  return { total: snap.size, siap, remediasi, lainnya };
}

// === SCENARIOS ===
const SCENARIOS = [
  {
    label: "A: STRONG — high_performer_smp_8",
    personaKey: "high_performer_smp_8",
    persona: { jenjang: "SMP", kelas: 8, strength: "strong" },
    babSlug: "mat-smp-k8-b4",
    subKode: "SMP.8.B4.02",
  },
  {
    label: "B: AVERAGE — average_sma_10",
    personaKey: "average_sma_10",
    persona: { jenjang: "SMA", kelas: 10, strength: "average" },
    babSlug: "mat-sma-k11-b4",
    subKode: "SMA.11.B4.01",
  },
  {
    label: "C: WEAK — weak_foundation_smp_7",
    personaKey: "weak_foundation_smp_7",
    persona: { jenjang: "SMP", kelas: 7, strength: "weak" },
    babSlug: "mat-smp-k7-b4",
    subKode: "SMP.7.B4.05",
  },
];

// === MAIN ===
console.log("\n" + "═".repeat(76));
console.log("END-TO-END TEST AGENT: Diagnostik Awal → Kesiapan Bab → Kesiapan Sub");
console.log("═".repeat(76));

const adminToken = await mintToken(ADMIN_EMAIL);
const agentToken = await mintToken(null, TEST_AGENT_UID);

const results = [];
for (const sc of SCENARIOS) {
  console.log(`\n\n${"█".repeat(76)}`);
  console.log(`SKENARIO ${sc.label}`);
  console.log(`Bab target: ${sc.babSlug} · Sub target: ${sc.subKode}`);
  console.log("█".repeat(76));

  // Reset state
  const cleared = await resetUserState(TEST_AGENT_UID);
  console.log(`\n[Reset] mastery=${cleared.mastery}, sessions=${cleared.sessions}, profile=${cleared.profile}, maturity=${cleared.maturity}`);

  // STEP 1: Diagnostik Awal
  const diag = await runDiagnostikAwal(sc.personaKey, adminToken);
  const masteryAfterDiag = await getMasteryCount(TEST_AGENT_UID);
  console.log(`  → Mastery after diagnostic: ${masteryAfterDiag.total} entries (${masteryAfterDiag.siap} siap, ${masteryAfterDiag.remediasi} remediasi)`);

  // STEP 2: Tes Kesiapan Bab
  const bab = await runKesiapanBab(sc.persona, sc.babSlug, agentToken);
  const masteryAfterBab = await getMasteryCount(TEST_AGENT_UID);
  console.log(`  → Mastery after kesiapan bab: ${masteryAfterBab.total} entries (${masteryAfterBab.siap} siap, ${masteryAfterBab.remediasi} remediasi)`);

  // STEP 3: Tes Kesiapan Sub
  const sub = await runKesiapanSub(sc.persona, sc.subKode, agentToken);
  const masteryAfterSub = await getMasteryCount(TEST_AGENT_UID);
  console.log(`  → Mastery after kesiapan sub: ${masteryAfterSub.total} entries (${masteryAfterSub.siap} siap, ${masteryAfterSub.remediasi} remediasi)`);

  results.push({
    label: sc.label,
    personaKey: sc.personaKey,
    babSlug: sc.babSlug,
    subKode: sc.subKode,
    diagnostic: diag ? {
      itemsAnswered: diag.itemsAnswered,
      accuracyPct: Math.round(diag.itemsCorrect / diag.itemsAnswered * 100),
      kelasEstimasi: diag.kelasEstimasi,
      pathRoute: diag.pathRoute,
      maturityLevel: diag.maturityLevel,
      maturityOverall: diag.maturityOverall,
    } : null,
    masteryAfterDiagnostic: masteryAfterDiag,
    kesiapanBab: bab,
    masteryAfterBab,
    kesiapanSub: sub,
    masteryAfterSub,
  });
}

writeFileSync(resolve(ROOT, "scripts", "test-end-to-end-results.json"), JSON.stringify(results, null, 2));
console.log("\n\n✓ Detail di scripts/test-end-to-end-results.json");
