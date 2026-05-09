// Auto-fix grafik fungsi: scan items dengan SVG, identify grafik fungsi via heuristic,
// extract expression, generate plot baru via /fix-visual endpoint, output HTML viewer.
//
// Usage:
//   node scripts/auto-fix-grafik-fungsi.mjs                  # scan + generate HTML
//   node scripts/auto-fix-grafik-fungsi.mjs --jenjang SMA    # filter jenjang
//   node scripts/auto-fix-grafik-fungsi.mjs --apply <ids>    # apply (comma-sep itemIds)

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
const BASE_URL = "http://localhost:3000";

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});
const db = admin.firestore();

const args = process.argv.slice(2);
const argVal = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
const jenjangFilter = argVal("--jenjang");
const applyIds = argVal("--apply"); // comma-separated item IDs

async function mintAdminToken() {
  const u = await admin.auth().getUserByEmail(ADMIN_EMAIL);
  const ct = await admin.auth().createCustomToken(u.uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: ct, returnSecureToken: true }) },
  );
  return (await res.json()).idToken;
}

// === HEURISTIC: identify grafik fungsi ===
function isGrafikFungsiCandidate(pertanyaan) {
  if (!pertanyaan) return false;
  const p = pertanyaan.toLowerCase();
  // STRONG indicators
  if (/grafik\s+fungsi/.test(p)) return true;
  if (/\bf\(x\)\s*=/.test(p)) return true;
  if (/kurva\s+(fungsi|y\s*=)/.test(p)) return true;
  if (/grafik\s+(dari\s+)?(persamaan|y\s*=)/.test(p)) return true;
  // MEDIUM: y = expression with operator (kurang aman)
  if (/y\s*=\s*[a-z0-9].*[\+\-\*\/\^]/.test(p) && /grafik|kurva|gambar/.test(p)) return true;
  return false;
}

// === EXTRACT expression dari pertanyaan ===
function extractExpression(pertanyaan) {
  // Strip LaTeX-style $...$ delimiters dari pertanyaan dulu untuk parsing
  let p = pertanyaan
    .replace(/\\\(|\\\)/g, "$")  // \( \) → $
    .replace(/\\\[|\\\]/g, "$"); // \[ \] → $
  // Try y = ... (capture sampai punctuation atau keyword)
  let m = p.match(/y\s*=\s*([^,\.\?\!\n\$]+?)(?:\s+(?:adalah|untuk|pada|dalam|dengan|jika|maka|di|dan)\b|[,.\?\!\n\$]|$)/i);
  if (!m) m = p.match(/f\(x\)\s*=\s*([^,\.\?\!\n\$]+?)(?:\s+(?:adalah|untuk|pada|dalam|dengan|jika|maka|di|dan)\b|[,.\?\!\n\$]|$)/i);
  if (!m) return null;

  let expr = m[1].trim();

  // Strip LaTeX delimiters & commands
  expr = expr
    .replace(/\$+/g, "")
    .replace(/\\,|\\!|\\;|\\:/g, " ")
    .replace(/\\sin\b/gi, "sin")
    .replace(/\\cos\b/gi, "cos")
    .replace(/\\tan\b/gi, "tan")
    .replace(/\\ln\b/gi, "ln")
    .replace(/\\log\b/gi, "log")
    .replace(/\\sqrt\b/gi, "sqrt")
    .replace(/\\pi\b/gi, "pi")
    .replace(/\\cdot\b/gi, "*")
    .replace(/\\times\b/gi, "*")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/⁵/g, "^5")
    .replace(/×/g, "*")
    .replace(/⋅/g, "*")
    .replace(/÷/g, "/")
    .replace(/√/g, "sqrt")
    .replace(/π/g, "pi")
    .replace(/\s+/g, " ")
    .trim();

  // Reject \frac (kompleks, regex tidak handle)
  if (/\\frac|\\dfrac/i.test(expr)) return null;
  // Reject kalau masih ada backslash (LaTeX command yang tidak kita handle)
  if (/\\/.test(expr)) return null;
  // Reject f(x) self-reference (plotFunction tidak punya f defined)
  if (/\bf\s*\(\s*x\s*\)/i.test(expr)) return null;

  // Inject * antara digit dan letter: "2x" → "2*x", "-3x^2" → "-3*x^2"
  expr = expr.replace(/(\d)\s*([a-z])/gi, "$1*$2");
  // Wrap fungsi tanpa kurung: "sin x" → "sin(x)", "ln x" → "ln(x)"
  expr = expr.replace(/\b(sin|cos|tan|ln|log|sqrt|exp|abs)\s+(x|pi|[+-]?\d+)\b/gi, "$1($2)");

  // Reject kalau ada variable single-letter selain x (a, b, c koefisien generic)
  const stripped = expr.replace(/\b(sin|cos|tan|ln|log|sqrt|exp|abs|pi)\b/gi, "");
  if (/\b[a-eg-wyz]\b/i.test(stripped)) return null;

  // Sanity check
  if (!/[x0-9]/.test(expr)) return null;
  if (expr.length > 60) return null;
  if (/(adalah|merupakan|menunjukkan|berikut|seperti)/i.test(expr)) return null;
  return expr;
}

// === EXTRACT range x dari pertanyaan ===
function extractRange(pertanyaan) {
  // Pattern: "x ∈ [a, b]" atau "−a ≤ x ≤ b" atau "untuk 0 ≤ x ≤ 2π"
  let m = pertanyaan.match(/x\s*∈\s*\[\s*(-?[\d\.\-]+|\-?\dπ?)\s*,\s*(-?[\d\.\-]+|\dπ?)\s*\]/);
  if (m) return { xMin: parseRangeNum(m[1]), xMax: parseRangeNum(m[2]) };

  m = pertanyaan.match(/(-?[\d\.\-]+|\-?\dπ?)\s*[≤<]\s*x\s*[≤<]\s*(-?[\d\.\-]+|\dπ?)/);
  if (m) return { xMin: parseRangeNum(m[1]), xMax: parseRangeNum(m[2]) };

  return null;
}

function parseRangeNum(s) {
  s = s.trim();
  if (s === "π" || s === "1π") return Math.PI;
  if (s === "2π") return 2 * Math.PI;
  if (s === "-π" || s === "−π") return -Math.PI;
  if (s === "-2π" || s === "−2π") return -2 * Math.PI;
  return Number(s);
}

// === Generate plot via endpoint ===
async function generatePlot(itemId, expression, xMin, xMax, idToken) {
  const item = (await db.collection("item_bank").doc(itemId).get()).data();
  if (!item) throw new Error("item not found");
  const subKode = item.subMateriKode;

  const res = await fetch(`${BASE_URL}/api/admin/item-bank/${encodeURIComponent(subKode)}/fix-visual`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      itemId,
      mode: "plot-fungsi",
      expression,
      xMin, xMax,
      yMin: undefined, yMax: undefined,
      label: `y = ${expression}`,
      xTickMode: "auto",
    }),
  });
  return await res.json();
}

// === APPLY (PUT save) ===
async function applyOne(itemId, svg, idToken) {
  const item = (await db.collection("item_bank").doc(itemId).get()).data();
  const res = await fetch(`${BASE_URL}/api/admin/item-bank/${encodeURIComponent(item.subMateriKode)}/fix-visual`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ itemId, svg }),
  });
  return await res.json();
}

// ============================================================
// MAIN
// ============================================================
const idToken = await mintAdminToken();
console.log("Admin token minted.\n");

if (applyIds) {
  // === APPLY MODE ===
  const ids = applyIds.split(",").map((s) => s.trim()).filter(Boolean);
  console.log(`Apply mode: ${ids.length} items.`);

  // Load suggestions JSON untuk get svgAfter
  const sugFile = resolve(ROOT, "scripts", "auto-fix-suggestions.json");
  if (!existsSync(sugFile)) { console.error("suggestions JSON not found, run scan first"); process.exit(1); }
  const suggestions = JSON.parse(readFileSync(sugFile, "utf8"));
  const byId = new Map(suggestions.map((s) => [s.itemId, s]));

  let success = 0, fail = 0;
  for (const id of ids) {
    const sug = byId.get(id);
    if (!sug || !sug.svgAfter) { console.log(`  ✗ ${id}: not in suggestions`); fail++; continue; }
    try {
      await applyOne(id, sug.svgAfter, idToken);
      console.log(`  ✓ ${id}: ${sug.expression}`);
      success++;
    } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); fail++; }
  }
  console.log(`\nDone: ${success} applied, ${fail} failed.`);
  process.exit(0);
}

// === SCAN MODE ===
console.log("Scanning item_bank...");
const snap = await db.collection("item_bank").get();
console.log(`Total items: ${snap.size}`);

const candidates = [];
for (const doc of snap.docs) {
  const item = doc.data();
  if (!item.konten?.svg || item.konten.svg.trim().length === 0) continue;
  if (jenjangFilter && item.jenjang !== jenjangFilter) continue;

  const p = item.konten.pertanyaan ?? "";
  if (!isGrafikFungsiCandidate(p)) continue;

  const expression = extractExpression(p);
  if (!expression) continue;

  const range = extractRange(p) ?? { xMin: -5, xMax: 5 };

  candidates.push({
    itemId: doc.id,
    subMateriKode: item.subMateriKode,
    jenjang: item.jenjang,
    kelas: item.kelas,
    pertanyaan: p,
    expression,
    xMin: range.xMin,
    xMax: range.xMax,
    svgBefore: item.konten.svg,
    confidence: extractRange(p) ? "high" : "medium",
  });
}
console.log(`Candidates grafik fungsi: ${candidates.length}\n`);

// Generate plot baru untuk setiap candidate
console.log("Generating new plots...");
for (let i = 0; i < candidates.length; i++) {
  const c = candidates[i];
  process.stdout.write(`[${i + 1}/${candidates.length}] ${c.itemId.slice(0, 8)} ${c.subMateriKode} y=${c.expression} ... `);
  try {
    const result = await generatePlot(c.itemId, c.expression, c.xMin, c.xMax, idToken);
    if (result.error) {
      c.error = result.error;
      console.log(`✗ ${result.error}`);
    } else {
      c.svgAfter = result.svgAfter;
      c.catatan = result.catatan;
      console.log(`✓`);
    }
  } catch (e) {
    c.error = e.message;
    console.log(`✗ ${e.message}`);
  }
}

// Save JSON
const sugFile = resolve(ROOT, "scripts", "auto-fix-suggestions.json");
writeFileSync(sugFile, JSON.stringify(candidates, null, 2));
console.log(`\nSaved: ${sugFile}`);

// Build HTML viewer
const validCands = candidates.filter((c) => c.svgAfter && !c.error);
const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Auto-fix Grafik Fungsi — Review</title>
<style>
  body { font-family: -apple-system, "Segoe UI", system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f8fafc; }
  .item { background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .header { display: flex; justify-content: space-between; gap: 12px; align-items: start; margin-bottom: 12px; }
  .meta { font-size: 0.85em; color: #64748b; }
  .pertanyaan { font-size: 0.95em; line-height: 1.5; margin: 8px 0; }
  .compare { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
  .col h4 { font-size: 0.85em; color: #475569; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.05em; }
  .svg-box { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; min-height: 200px; display: flex; align-items: center; justify-content: center; }
  .svg-box svg { max-width: 100%; max-height: 280px; }
  .expr-box { font-family: monospace; background: #f0fdfa; padding: 6px 10px; border-radius: 6px; display: inline-block; font-size: 0.9em; }
  .approve-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid; cursor: pointer; font-weight: 600; font-size: 0.9em; }
  .approved { background: #10b981; color: white; border-color: #10b981; }
  .pending { background: white; color: #475569; border-color: #cbd5e1; }
  .summary { position: sticky; top: 0; background: white; padding: 12px 16px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 10; }
  .summary code { background: #1e293b; color: #f1f5f9; padding: 8px 12px; border-radius: 6px; font-size: 0.85em; display: block; word-break: break-all; max-height: 80px; overflow-y: auto; }
</style>
</head><body>
<h1>🎨 Auto-fix Grafik Fungsi</h1>
<p>${validCands.length} candidate dari ${candidates.length} scan. Click "Approve" untuk yang OK, lalu copy command di atas.</p>
<div class="summary">
  <strong>Approved (<span id="count">0</span>):</strong>
  <code id="cmd">node scripts/auto-fix-grafik-fungsi.mjs --apply </code>
  <button onclick="copyCmd()">📋 Copy</button>
</div>
${validCands.map((c, i) => `
  <div class="item" id="item-${i}">
    <div class="header">
      <div>
        <div class="meta">#${i + 1} · ${c.itemId} · ${c.subMateriKode} · ${c.jenjang} K${c.kelas}</div>
        <div class="pertanyaan">${escapeHtml(c.pertanyaan.slice(0, 300))}${c.pertanyaan.length > 300 ? "..." : ""}</div>
        <div>Expression: <span class="expr-box">y = ${escapeHtml(c.expression)}</span> · range x:[${c.xMin}, ${c.xMax}] · confidence: ${c.confidence}</div>
      </div>
      <button class="approve-btn pending" onclick="toggle('${c.itemId}', ${i})" id="btn-${i}">Approve</button>
    </div>
    <div class="compare">
      <div class="col"><h4>Before (existing)</h4><div class="svg-box">${c.svgBefore}</div></div>
      <div class="col"><h4>After (auto-plot)</h4><div class="svg-box">${c.svgAfter}</div></div>
    </div>
  </div>
`).join("")}
<script>
const approved = new Set();
function toggle(id, idx) {
  const btn = document.getElementById('btn-' + idx);
  if (approved.has(id)) { approved.delete(id); btn.classList.replace('approved', 'pending'); btn.textContent = 'Approve'; }
  else { approved.add(id); btn.classList.replace('pending', 'approved'); btn.textContent = '✓ Approved'; }
  document.getElementById('count').textContent = approved.size;
  document.getElementById('cmd').textContent = 'node scripts/auto-fix-grafik-fungsi.mjs --apply ' + Array.from(approved).join(',');
}
function copyCmd() { navigator.clipboard.writeText(document.getElementById('cmd').textContent); alert('Command copied! Paste di terminal.'); }
</script>
</body></html>`;

function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

const htmlFile = resolve(ROOT, "scripts", "auto-fix-suggestions.html");
writeFileSync(htmlFile, html);

console.log(`\n=== DONE ===`);
console.log(`Candidates: ${candidates.length}`);
console.log(`Generated successfully: ${validCands.length}`);
console.log(`Failed: ${candidates.length - validCands.length}`);
console.log(`\nReview: ${htmlFile}`);
console.log(`Open: start D:\\turo\\scripts\\auto-fix-suggestions.html`);
console.log(`\nSetelah review + approve, jalankan:`);
console.log(`  node scripts/auto-fix-grafik-fungsi.mjs --apply <ids>`);
