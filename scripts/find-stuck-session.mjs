// Cari sesi diagnostik yang punya response di sub tertentu, dan cek state-nya.
import { readFileSync, existsSync } from "node:fs";
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

const subKode = process.argv[2] ?? "SD.3.B1.02";

// Get 30 sesi terbaru, cek subcollection responses untuk match subKode
const sessSnap = await db.collection("diagnostic_session").limit(30).get();
console.log(`Scanning ${sessSnap.size} latest sessions for sub ${subKode}...\n`);

for (const doc of sessSnap.docs) {
  const respSnap = await doc.ref.collection("responses").orderBy("createdAt", "desc").limit(20).get();
  const matching = respSnap.docs.filter(r => r.data().subMateriKode === subKode);
  if (matching.length === 0) continue;
  const s = doc.data();
  const lastResp = respSnap.docs[0]?.data();
  console.log(`--- Session ${doc.id} ---`);
  console.log(`  uid=${s.uid?.slice(0,8)} jalur=${s.jalur} kelas=${s.kelas} stage=${s.stage} status=${s.status}`);
  const ts = (v) => v ? new Date(v).toISOString() : "n/a";
  console.log(`  createdAt=${ts(s.createdAt)} updatedAt=${ts(s.updatedAt)}`);
  console.log(`  total responses=${respSnap.size}, on ${subKode}=${matching.length}`);
  console.log(`  last response: stage=${lastResp?.stage} sub=${lastResp?.subMateriKode} correct=${lastResp?.correct} item=${lastResp?.itemId?.slice(0,12)}`);
  console.log(`  responses on ${subKode}:`);
  for (const m of matching.slice(0, 5)) {
    const d = m.data();
    console.log(`    stage=${d.stage} item=${d.itemId?.slice(0,12)} correct=${d.correct} ts=${new Date(d.createdAt).toISOString()}`);
  }
  console.log("");
}
process.exit(0);
