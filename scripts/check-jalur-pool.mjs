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

const jalur = process.argv[2] ?? "sma-reguler";
const snap = await db.collection("item_bank").where("jalur", "array-contains", jalur).get();
console.log(`Pool ${jalur}: ${snap.size} items\n`);

const byKelas = {};
const byJenjang = {};
const wrongJenjang = [];
for (const doc of snap.docs) {
  const d = doc.data();
  byKelas[d.kelas] = (byKelas[d.kelas] ?? 0) + 1;
  byJenjang[d.jenjang] = (byJenjang[d.jenjang] ?? 0) + 1;
  // sma-reguler should ONLY contain SMA items
  if (jalur === "sma-reguler" && d.jenjang !== "SMA") wrongJenjang.push({ id: doc.id.slice(0,12), sub: d.subMateriKode, jenjang: d.jenjang, kelas: d.kelas, jalur: d.jalur });
  if (jalur === "smp" && d.jenjang !== "SMP") wrongJenjang.push({ id: doc.id.slice(0,12), sub: d.subMateriKode, jenjang: d.jenjang, kelas: d.kelas, jalur: d.jalur });
}

console.log("Per kelas:");
for (const k of Object.keys(byKelas).sort((a,b) => Number(a) - Number(b))) console.log(`  K${k}: ${byKelas[k]}`);
console.log("\nPer jenjang:");
for (const [j, c] of Object.entries(byJenjang)) console.log(`  ${j}: ${c}`);

if (wrongJenjang.length > 0) {
  console.log(`\n⚠ MISMATCH (jenjang tidak match jalur ${jalur}): ${wrongJenjang.length}`);
  for (const w of wrongJenjang.slice(0, 10)) console.log(`  ${w.id} | ${w.sub} | ${w.jenjang} K${w.kelas} | jalur=${JSON.stringify(w.jalur)}`);
}

process.exit(0);
