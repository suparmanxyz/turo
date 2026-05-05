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

const sessId = process.argv[2];
const sess = await db.collection("diagnostic_session").doc(sessId).get();
console.log(JSON.stringify(sess.data(), null, 2).slice(0, 5000));
console.log("\n--- responses subcollection ---");
const respSnap = await sess.ref.collection("responses").orderBy("createdAt").get();
console.log(`Total: ${respSnap.size}`);
for (const r of respSnap.docs) {
  const d = r.data();
  console.log(`  ${new Date(d.createdAt).toISOString().slice(11,19)} | stage=${d.stage} | sub=${d.subMateriKode} | item=${d.itemId.slice(0,12)} | ${d.correct ? "✓" : "✗"}`);
}
process.exit(0);
