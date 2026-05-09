// Test agent untuk Tes Kesiapan Bab + Sub.
// 3 skenario: SMA K11 Bab 4, SD K5 Bab 3, SMP K8 Sub spesifik.
// Reset mastery user test-agent sebelum tiap skenario untuk clean state.

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

async function mintAdminIdToken() {
  const userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL);
  const customToken = await admin.auth().createCustomToken(userRecord.uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) },
  );
  const data = await res.json();
  return data.idToken;
}

async function mintAgentIdToken() {
  const customToken = await admin.auth().createCustomToken(TEST_AGENT_UID);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) },
  );
  const data = await res.json();
  return data.idToken;
}

async function resetMastery(uid) {
  // Mastery di top-level collection sub_materi_mastery, doc id = {uid}_{kode}
  const snap = await db.collection("sub_materi_mastery").where("uid", "==", uid).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  for (const d of snap.docs) batch.delete(d.ref);
  await batch.commit();
  return snap.size;
}

// === Persona logic — simple subMastery model ===
function personaAnswer(personaProfile, item) {
  // personaProfile: { jenjang, kelas, strength: "strong"|"average"|"weak" }
  // Item kelas vs user kelas
  const itemKelas = item.subMateriKode.match(/\.(\d+)\./)?.[1];
  const ik = itemKelas ? parseInt(itemKelas, 10) : personaProfile.kelas;
  const gap = ik - personaProfile.kelas;

  // Base correctness probability
  let base;
  if (personaProfile.strength === "strong") {
    base = gap <= 0 ? 0.92 : gap <= 1 ? 0.78 : 0.55;
  } else if (personaProfile.strength === "average") {
    base = gap <= -1 ? 0.85 : gap === 0 ? 0.65 : gap === 1 ? 0.45 : 0.25;
  } else {
    // weak
    base = gap <= -2 ? 0.75 : gap === -1 ? 0.55 : gap === 0 ? 0.35 : 0.18;
  }

  return Math.random() < base;
}

async function runKesiapanBab(scenario, agentToken) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`SKENARIO: ${scenario.name}`);
  console.log(`Persona: ${scenario.persona.label} (${scenario.persona.jenjang} K${scenario.persona.kelas}, ${scenario.persona.strength})`);
  console.log(`Target: ${scenario.target}`);
  console.log("=".repeat(72));

  // 1. Start
  console.log(`\n[1] POST /api/cek-kesiapan-bab/start (materiSlug=${scenario.materiSlug})`);
  const startRes = await fetch(`${BASE_URL}/api/cek-kesiapan-bab/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ materiSlug: scenario.materiSlug }),
  });
  const startData = await startRes.json();
  if (!startRes.ok) { console.error(`  ✗ ERROR: ${JSON.stringify(startData)}`); return null; }

  console.log(`  ✓ ${startData.materiNama} · ${startData.jumlahSubMateri} sub-materi`);
  console.log(`  Blind spots terdeteksi: ${startData.blindSpots.length}`);
  for (const bs of startData.blindSpots.slice(0, 6)) {
    console.log(`    - ${bs.kode} (${bs.jenjang} K${bs.kelas}) ${bs.nama} · weight ${bs.weight} · ${bs.reason}`);
  }
  if (startData.blindSpots.length > 6) console.log(`    ... ${startData.blindSpots.length - 6} lagi`);
  console.log(`  Warmup queue: ${startData.warmupQueue.length} items`);
  if (startData.shortCircuit) {
    console.log(`  ⚡ SHORT-CIRCUIT: ${startData.shortCircuit}`);
    return { scenario: scenario.name, decision: { action: "lanjut", reason: "shortCircuit: " + startData.shortCircuit } };
  }

  // 2. Persona answer warmup items
  console.log(`\n[2] Persona answer warmup queue:`);
  const answers = [];
  for (let i = 0; i < startData.warmupQueue.length; i++) {
    const w = startData.warmupQueue[i];
    const itemKelas = w.blindSpotKelas ?? "?";
    const correct = personaAnswer(scenario.persona, w.item);
    // Find correct option idx — agent doesn't know kunci, simulate by picking
    // first option if correct, last if wrong (server validates)
    const pilihIdx = correct ? 0 : 1; // dummy — server load item.konten.kunci untuk validate
    answers.push({
      itemId: w.item.id,
      blindSpotKode: w.blindSpotKode,
      pilihIdx,  // arbitrary, server compute correct
      _agentIntent: correct ? "benar" : "salah",
    });
    console.log(`    [${i + 1}] ${w.blindSpotKode} (${w.blindSpotJenjang} K${itemKelas}) → agent ${correct ? "✓ benar" : "✗ salah"}`);
  }

  // === IMPORTANT: server validate jawaban server-side via item.konten.kunci ===
  // Untuk simulasi yg akurat, kita perlu tahu kunci-nya. Karena endpoint sembunyikan
  // kunci, kita panggil endpoint admin (atau load item langsung dari Firestore).
  // Strategi simpler: load item langsung via admin SDK.
  for (const a of answers) {
    const itemSnap = await db.collection("item_bank").doc(a.itemId).get();
    if (!itemSnap.exists) continue;
    const item = itemSnap.data();
    a.pilihIdx = a._agentIntent === "benar" ? item.konten.kunci : (item.konten.kunci + 1) % item.konten.opsi.length;
  }

  // 3. Finish
  console.log(`\n[3] POST /api/cek-kesiapan-bab/finish`);
  const finishRes = await fetch(`${BASE_URL}/api/cek-kesiapan-bab/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({
      materiSlug: scenario.materiSlug,
      answers: answers.map((a) => ({ itemId: a.itemId, blindSpotKode: a.blindSpotKode, pilihIdx: a.pilihIdx, responseTimeMs: 15000 })),
    }),
  });
  const finishData = await finishRes.json();
  if (!finishRes.ok) { console.error(`  ✗ ERROR: ${JSON.stringify(finishData)}`); return null; }

  console.log(`  ✓ Mastery updated: ${finishData.masteryUpdated} sub`);
  console.log(`\n[4] DECISION:`);
  console.log(`    Action: ${finishData.decision.action.toUpperCase()}`);
  if (finishData.decision.alasan) console.log(`    Alasan: ${finishData.decision.alasan}`);
  if (finishData.decision.remediasiKodes) {
    console.log(`    Remediasi: ${finishData.decision.remediasiKodes.join(", ")}`);
  }

  return { scenario: scenario.name, blindSpots: startData.blindSpots, warmupCount: startData.warmupQueue.length, answers, decision: finishData.decision };
}

async function runKesiapanSub(scenario, agentToken) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`SKENARIO: ${scenario.name}`);
  console.log(`Persona: ${scenario.persona.label} (${scenario.persona.jenjang} K${scenario.persona.kelas}, ${scenario.persona.strength})`);
  console.log(`Target sub: ${scenario.target}`);
  console.log("=".repeat(72));

  console.log(`\n[1] POST /api/cek-kesiapan/start (kode=${scenario.kode})`);
  const startRes = await fetch(`${BASE_URL}/api/cek-kesiapan/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ kode: scenario.kode }),
  });
  const startData = await startRes.json();
  if (!startRes.ok) { console.error(`  ✗ ERROR: ${JSON.stringify(startData)}`); return null; }

  console.log(`  ✓ Target: ${startData.targetNama} (${startData.targetJenjang} K${startData.targetKelas})`);
  console.log(`  Blind spots: ${startData.blindSpots.length}`);
  for (const bs of startData.blindSpots) {
    console.log(`    - ${bs.kode} (${bs.jenjang} K${bs.kelas}) ${bs.nama} · weight ${bs.weight}`);
  }
  console.log(`  Warmup queue: ${startData.warmupQueue.length} items`);
  if (startData.shortCircuit) {
    console.log(`  ⚡ SHORT-CIRCUIT: ${startData.shortCircuit}`);
    return { scenario: scenario.name, decision: { action: "lanjut", reason: "shortCircuit: " + startData.shortCircuit } };
  }

  console.log(`\n[2] Persona answer:`);
  const answers = [];
  for (let i = 0; i < startData.warmupQueue.length; i++) {
    const w = startData.warmupQueue[i];
    const correct = personaAnswer(scenario.persona, w.item);
    answers.push({ itemId: w.item.id, blindSpotKode: w.blindSpotKode, _agentIntent: correct ? "benar" : "salah", pilihIdx: 0 });
    console.log(`    [${i + 1}] ${w.blindSpotKode} (K${w.blindSpotKelas}) → agent ${correct ? "✓ benar" : "✗ salah"}`);
  }

  for (const a of answers) {
    const itemSnap = await db.collection("item_bank").doc(a.itemId).get();
    if (!itemSnap.exists) continue;
    const item = itemSnap.data();
    a.pilihIdx = a._agentIntent === "benar" ? item.konten.kunci : (item.konten.kunci + 1) % item.konten.opsi.length;
  }

  console.log(`\n[3] POST /api/cek-kesiapan/finish`);
  const finishRes = await fetch(`${BASE_URL}/api/cek-kesiapan/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({
      targetKode: scenario.kode,
      answers: answers.map((a) => ({ itemId: a.itemId, blindSpotKode: a.blindSpotKode, pilihIdx: a.pilihIdx, responseTimeMs: 15000 })),
    }),
  });
  const finishData = await finishRes.json();
  if (!finishRes.ok) { console.error(`  ✗ ERROR: ${JSON.stringify(finishData)}`); return null; }

  console.log(`  ✓ Mastery updated: ${finishData.masteryUpdated} sub`);
  console.log(`\n[4] DECISION:`);
  console.log(`    Action: ${finishData.decision.action.toUpperCase()}`);
  if (finishData.decision.alasan) console.log(`    Alasan: ${finishData.decision.alasan}`);

  return { scenario: scenario.name, blindSpots: startData.blindSpots, warmupCount: startData.warmupQueue.length, answers, decision: finishData.decision };
}

// === SCENARIOS ===
const SCENARIOS = [
  {
    type: "bab",
    name: "SMA K11 mau Bab 4 Aturan Sinus & Kosinus",
    materiSlug: "mat-sma-k11-b4",
    target: "Trigonometri Lanjut SMA K11",
    persona: { label: "Average SMA K11", jenjang: "SMA", kelas: 11, strength: "average" },
  },
  {
    type: "bab",
    name: "SD K5 mau Bab 3 Pecahan & Desimal",
    materiSlug: "mat-sd-k5-b3",
    target: "Pecahan & Desimal SD K5",
    persona: { label: "Weak SD K5", jenjang: "SD", kelas: 5, strength: "weak" },
  },
  {
    type: "sub",
    name: "SMP K8 mau Sub 'Persamaan Garis y=mx+c'",
    kode: "SMP.8.B4.02",
    target: "Persamaan Garis (sub spesifik)",
    persona: { label: "Average SMP K8", jenjang: "SMP", kelas: 8, strength: "average" },
  },
];

// === MAIN ===
console.log("\n=== TEST AGENT — TES KESIAPAN ===");
console.log(`User test-agent UID: ${TEST_AGENT_UID}`);

const agentToken = await mintAgentIdToken();
console.log("Agent ID token minted.");

const results = [];
for (const sc of SCENARIOS) {
  // Reset mastery sebelum tiap skenario
  const cleared = await resetMastery(TEST_AGENT_UID);
  console.log(`\n[reset mastery: ${cleared} entries cleared]`);

  let result;
  if (sc.type === "bab") result = await runKesiapanBab(sc, agentToken);
  else result = await runKesiapanSub(sc, agentToken);

  if (result) results.push(result);
}

writeFileSync(resolve(ROOT, "scripts", "test-kesiapan-results.json"), JSON.stringify(results, null, 2));
console.log(`\n\nDetail: scripts/test-kesiapan-results.json`);
