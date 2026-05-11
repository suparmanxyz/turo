import { readFileSync, existsSync } from "node:fs";
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

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});
const db = admin.firestore();

const sessionId = process.argv[2] || "OqvlLxzbMRJSVEMPNZzG";

const s = await db.collection("diagnostic_session").doc(sessionId).get();
if (!s.exists) { console.log("NOT FOUND"); process.exit(1); }
const d = s.data();

console.log(`\n=== SESSION ${sessionId} ===`);
console.log(`uid: ${d.uid}`);
console.log(`jenjang: ${d.jenjang} K${d.kelas} · jalur: ${d.jalur} · mode: ${d.modeKurikulum}`);
console.log(`stage: ${d.stage}`);
console.log(`thetaGlobal: ${d.thetaGlobal?.toFixed?.(3)} · kelasEst: ${d.kelasEstimasi?.toFixed?.(2)}`);
console.log(`hasilLocator: theta=${d.hasilLocator?.theta?.toFixed?.(3)} kelas=${d.hasilLocator?.kelasEstimasi?.toFixed?.(2)} items=${d.hasilLocator?.itemsUsed} stop=${d.hasilLocator?.stopReason}`);
if (d.hasilCoverage) {
  console.log(`hasilCoverage: theta=${d.hasilCoverage.theta?.toFixed?.(3)} clusterA=${d.hasilCoverage.clusterAScore?.toFixed?.(2)} B=${d.hasilCoverage.clusterBScore?.toFixed?.(2)} C=${d.hasilCoverage.clusterCScore?.toFixed?.(2)}`);
  console.log(`  pathRoute: ${d.hasilCoverage.pathRoute} · label: ${d.hasilCoverage.label}`);
}
console.log(`maturity: ${d.maturityProfile?.label} (${d.maturityProfile?.overallScore?.toFixed?.(0)})`);
console.log(`startedAt: ${new Date(d.startedAt).toISOString()}`);
console.log(`finishedAt: ${d.finishedAt ? new Date(d.finishedAt).toISOString() : "NULL"}`);
if (d.finishedAt) {
  const durMin = (d.finishedAt - d.startedAt) / 60000;
  console.log(`duration: ${durMin.toFixed(1)} menit`);
}

const resp = await db.collection("diagnostic_session").doc(sessionId).collection("responses").orderBy("createdAt").get();
console.log(`\n=== RESPONSES (${resp.size}) ===`);

const byStage = {};
const subs = new Set();
const wrongs = [];
for (const r of resp.docs) {
  const x = r.data();
  byStage[x.stage] = (byStage[x.stage] || 0) + 1;
  subs.add(x.subMateriKode);
  const mark = x.correct ? "✓" : "✗";
  if (!x.correct) wrongs.push(x.subMateriKode);
  console.log(`  [${x.stage.padEnd(15)}] ${x.subMateriKode.padEnd(15)} ${(x.area || "-").padEnd(20)} ${mark} ${x.responseTimeMs}ms`);
}

console.log(`\n=== PER STAGE ===`);
for (const [s, n] of Object.entries(byStage)) console.log(`  ${s}: ${n}`);
console.log(`\nUnique subs tested: ${subs.size}`);
console.log(`Wrong answers: ${wrongs.length} (${wrongs.slice(0, 10).join(", ")}${wrongs.length > 10 ? ", ..." : ""})`);

if (d.maturityProfile?.fiveDimensi) {
  console.log(`\n=== MATURITY 5 DIMENSI ===`);
  for (const [k, v] of Object.entries(d.maturityProfile.fiveDimensi)) {
    console.log(`  ${k}: ${typeof v === "number" ? v.toFixed(0) : v}`);
  }
}

process.exit(0);
