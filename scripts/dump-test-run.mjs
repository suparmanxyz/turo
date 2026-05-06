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

const id = process.argv[2];
const doc = await db.collection("test_runs").doc(id).get();
if (!doc.exists) { console.error("Not found"); process.exit(1); }
const run = doc.data();
console.log("=== RUN HEADER ===");
console.log(JSON.stringify({
  ...run,
  assertions: undefined, // print separately
}, null, 2).slice(0, 3000));

console.log("\n=== ASSERTIONS ===");
for (const a of (run.assertions ?? [])) {
  console.log(`  ${a.passed ? "✓" : "✗"} ${a.name}`);
  console.log(`     expected: ${JSON.stringify(a.expected)}, actual: ${JSON.stringify(a.actual)}`);
  if (a.reason) console.log(`     reason: ${a.reason}`);
}

const evSnap = await doc.ref.collection("events").orderBy("ts").get();
console.log(`\n=== EVENTS DETAIL (${evSnap.size}) ===`);
for (const e of evSnap.docs) {
  const d = e.data();
  if (d.type === "answer") {
    console.log(`  [${d.stage.padEnd(8)}] ${d.subKode.padEnd(15)} K${d.itemKelas} ${d.itemArea.padEnd(12)} b=${d.itemB?.toFixed(2)} pick=${d.picked} kunci=${d.kunci} ${d.correct ? "✓" : "✗"}`);
  }
}
console.log(`\n=== EVENTS (${evSnap.size}) ===`);
const stageCount = {};
const subFreq = {};
const itemFreq = {};
let consecutiveSame = { item: "", count: 0, max: 0 };
for (const e of evSnap.docs) {
  const d = e.data();
  if (d.type === "answer") {
    stageCount[d.stage] = (stageCount[d.stage] ?? 0) + 1;
    subFreq[d.subKode] = (subFreq[d.subKode] ?? 0) + 1;
    itemFreq[d.itemId] = (itemFreq[d.itemId] ?? 0) + 1;
    if (d.itemId === consecutiveSame.item) {
      consecutiveSame.count++;
      consecutiveSame.max = Math.max(consecutiveSame.max, consecutiveSame.count);
    } else {
      consecutiveSame.item = d.itemId;
      consecutiveSame.count = 1;
    }
  } else if (d.type === "stage_transition") {
    console.log(`  → transition: ${d.fromStage ?? "init"} → ${d.toStage}`);
  } else if (d.type === "error") {
    console.log(`  ✗ ERROR: ${d.message}`);
  } else if (d.type === "info") {
    console.log(`  ℹ ${d.message}`);
  }
}
console.log("\nPer stage:");
for (const [s, c] of Object.entries(stageCount)) console.log(`  ${s}: ${c} items`);

const dupItems = Object.entries(itemFreq).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
console.log(`\nDuplicate items (answered >1x): ${dupItems.length}`);
for (const [id, c] of dupItems.slice(0, 10)) {
  console.log(`  ${id.slice(0, 12)} answered ${c}x`);
}
console.log(`\nMax consecutive same item: ${consecutiveSame.max}`);

const dupSubs = Object.entries(subFreq).filter(([, c]) => c > 3).sort((a, b) => b[1] - a[1]);
console.log(`\nSubs with >3 items answered:`);
for (const [s, c] of dupSubs.slice(0, 10)) console.log(`  ${s}: ${c} items`);

process.exit(0);
