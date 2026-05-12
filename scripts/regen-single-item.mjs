// Regenerate SVG plot untuk 1 item spesifik via plotFunction (skip AI chat).
// Usage: node scripts/regen-single-item.mjs <itemId>
// Parameter plot hardcoded di SCENARIOS map per item.

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

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const ADMIN_EMAIL = "suparmanpirates@gmail.com";
const BASE_URL = "http://localhost:3000";

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});

// SCENARIOS: per itemId → plot parameters spesifik (manually crafted)
const SCENARIOS = {
  "097495da252c2238b0e58ed9": {
    label: "SMA.12.B3.04 — Luas daerah di bawah parabola",
    plot: {
      expression: "x^2 - 4*x + 3",
      xMin: -0.5,
      xMax: 5,
      yMin: -2,
      yMax: 6,
      xTickMode: "numerik",
      shadedAreas: [{
        // Area antara kurva (negatif) dan sumbu x → di kuadran BAWAH
        // fromExpression = 0 (sumbu x, batas atas), toExpression = kurva (batas bawah)
        fromExpression: "0",
        toExpression: "x^2 - 4*x + 3",
        xFrom: 1,
        xTo: 3,
        color: "#f59e0b",
        opacity: 0.35,
      }],
      customLabels: [
        { text: "1", x: 1, y: 0.3, color: "#1e3a8a", fontSize: 13 },
        { text: "3", x: 3, y: 0.3, color: "#1e3a8a", fontSize: 13 },
        { text: "Luas?", x: 2, y: -0.5, color: "#b45309", fontSize: 13 },
      ],
    },
  },
};

async function mintAdminToken() {
  const u = await admin.auth().getUserByEmail(ADMIN_EMAIL);
  const ct = await admin.auth().createCustomToken(u.uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: ct, returnSecureToken: true }) },
  );
  return (await res.json()).idToken;
}

const itemId = process.argv[2];
if (!itemId) { console.error("Usage: node scripts/regen-single-item.mjs <itemId>"); process.exit(1); }

const scenario = SCENARIOS[itemId];
if (!scenario) {
  console.error(`No scenario for itemId ${itemId}. Available:`, Object.keys(SCENARIOS).join(", "));
  process.exit(1);
}

console.log(`\n=== REGEN ${itemId} ===`);
console.log(`Scenario: ${scenario.label}`);
console.log(`Plot: y = ${scenario.plot.expression}, x:[${scenario.plot.xMin},${scenario.plot.xMax}]`);

const db = admin.firestore();
const itemDoc = await db.collection("item_bank").doc(itemId).get();
if (!itemDoc.exists) { console.error("Item not found"); process.exit(1); }
const item = itemDoc.data();
const subKode = item.subMateriKode;
console.log(`Sub: ${subKode}`);

const idToken = await mintAdminToken();

// Step 1: Generate plot via endpoint
console.log("\n[1] Generate plot...");
const genRes = await fetch(`${BASE_URL}/api/admin/item-bank/${encodeURIComponent(subKode)}/fix-visual`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
  body: JSON.stringify({
    itemId,
    mode: "plot-fungsi",
    ...scenario.plot,
  }),
});
const genData = await genRes.json();
if (!genRes.ok || !genData.svgAfter) {
  console.error("Generate failed:", genData);
  process.exit(1);
}
console.log(`✓ Generated · ${genData.catatan}`);

// Step 2: Save (PUT)
console.log("\n[2] Save to Firestore...");
const saveRes = await fetch(`${BASE_URL}/api/admin/item-bank/${encodeURIComponent(subKode)}/fix-visual`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
  body: JSON.stringify({ itemId, svg: genData.svgAfter }),
});
const saveData = await saveRes.json();
if (!saveRes.ok) { console.error("Save failed:", saveData); process.exit(1); }
console.log(`✓ Saved to Firestore (cache invalidated)`);

console.log(`\n🔗 Verify: ${BASE_URL}/admin/item-bank/${encodeURIComponent(subKode)}`);
process.exit(0);
