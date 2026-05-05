// Quick check: items untuk satu subMateriKode
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

const kode = process.argv[2];
if (!kode) { console.error("Usage: node scripts/check-sub-items.mjs <kode>"); process.exit(1); }

const snap = await db.collection("item_bank").where("subMateriKode", "==", kode).get();
console.log(`Sub ${kode}: ${snap.size} items`);
for (const doc of snap.docs) {
  const d = doc.data();
  const opsiCount = d.konten?.opsi?.length ?? 0;
  const benarCount = d.konten?.opsi?.filter(o => o.benar).length ?? 0;
  const kunciValid = typeof d.konten?.kunci === "number" && d.konten.kunci >= 0 && d.konten.kunci < opsiCount;
  const flags = [];
  if (opsiCount !== 4 && opsiCount !== 5) flags.push(`opsi=${opsiCount}`);
  if (benarCount !== 1) flags.push(`benar=${benarCount}`);
  if (!kunciValid) flags.push(`kunci=${d.konten?.kunci}`);
  if (!d.konten?.pertanyaan?.trim()) flags.push("no-question");
  const tag = flags.length ? "⚠ " + flags.join(",") : "✓";
  console.log(`  ${tag} ${doc.id.slice(0,12)} | b=${d.b?.toFixed(2)} a=${d.a?.toFixed(2)} c=${d.c} | ${(d.konten?.pertanyaan ?? "").slice(0, 70)}`);
}

// Also check session: sample latest 5 sessions, see if any stuck pada SD.3.B1.02
console.log(`\n--- Sessions probably affected ---`);
const sessSnap = await db.collection("diagnostic_sessions").orderBy("createdAt", "desc").limit(20).get();
for (const doc of sessSnap.docs) {
  const s = doc.data();
  if (!s.responses) continue;
  const lastResp = s.responses[s.responses.length - 1];
  if (lastResp?.subMateriKode === kode || s.currentSub === kode) {
    console.log(`  session=${doc.id.slice(0,8)} stage=${s.stage} status=${s.status} responses=${s.responses.length} lastSub=${lastResp?.subMateriKode}`);
  }
}
process.exit(0);
