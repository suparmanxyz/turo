// Auto-fix grafik fungsi v2: VISUAL ANALYSIS via Claude vision API.
// Render SVG existing → PNG, kirim ke Claude untuk identify expression yang benar,
// generate plot baru via plotFunction. Akurasi jauh lebih tinggi dari regex extraction.
//
// Usage:
//   node scripts/auto-fix-grafik-fungsi-v2.mjs                  # scan + analyze + suggest
//   node scripts/auto-fix-grafik-fungsi-v2.mjs --jenjang SMA    # filter
//   node scripts/auto-fix-grafik-fungsi-v2.mjs --limit 10       # batch kecil dulu
//   node scripts/auto-fix-grafik-fungsi-v2.mjs --apply <ids>    # apply
//
// Cost estimasi: ~$0.005 per item (Sonnet 4.6 vision). 30 items ≈ $0.15

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { Resvg } from "@resvg/resvg-js";

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

const ADMIN_EMAIL = "suparmanpirates@gmail.com";
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const BASE_URL = "http://localhost:3000";

if (!process.env.ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY missing"); process.exit(1); }

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});
const db = admin.firestore();
const claude = new Anthropic();

const args = process.argv.slice(2);
const argVal = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
const jenjangFilter = argVal("--jenjang");
const limitArg = argVal("--limit") ? parseInt(argVal("--limit"), 10) : null;
const applyIds = argVal("--apply");

async function mintAdminToken() {
  const u = await admin.auth().getUserByEmail(ADMIN_EMAIL);
  const ct = await admin.auth().createCustomToken(u.uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: ct, returnSecureToken: true }) },
  );
  return (await res.json()).idToken;
}

function isGrafikFungsiCandidate(pertanyaan) {
  if (!pertanyaan) return false;
  const p = pertanyaan.toLowerCase();
  return /grafik\s+fungsi|\bf\(x\)\s*=|kurva\s+(fungsi|y\s*=)|grafik\s+(dari\s+)?(persamaan|y\s*=)|grafik|kurva/.test(p);
}

function renderSvgToPng(svg, width = 800) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
  return resvg.render().asPng();
}

// === Claude vision: analyze SVG + soal → identify expression ===
async function analyzeWithVision(svg, pertanyaan, opsi) {
  let pngBuf;
  try {
    pngBuf = renderSvgToPng(svg);
  } catch (e) {
    return { error: `SVG render fail: ${e.message}` };
  }
  const pngBase64 = pngBuf.toString("base64");

  const opsiText = opsi.map((o, i) => `${String.fromCharCode(65 + i)}. ${o.teks}`).join("\n");
  const prompt = `Soal matematika berikut menampilkan grafik fungsi. Identifikasi:
1. Expression matematika yang DIGAMBARKAN di grafik (lihat visual, bisa beda dari teks soal)
2. Range x dan y yang sesuai

PERTANYAAN:
${pertanyaan}

OPSI:
${opsiText}

⚠️ OUTPUT WAJIB: JSON murni saja. JANGAN ada penjelasan, JANGAN ada chain-of-thought, JANGAN code fence.
LANGSUNG mulai dengan { dan akhiri dengan }.

Format JSON:
{
  "expression": "x^2 + 2*x - 3",
  "xMin": -5,
  "xMax": 5,
  "yMin": null,
  "yMax": null,
  "isGrafikFungsi": true,
  "confidence": "high|medium|low",
  "catatan": "ringkas, e.g. parabola terbuka ke atas dengan vertex di (-1,-4)"
}

ATURAN expression:
- Pakai * eksplisit untuk perkalian: 2*x, NOT 2x
- Pakai ^ untuk pangkat: x^2, NOT x²
- WAJIB wrap negative dengan kurung untuk menghindari precedence:
    BENAR: -(x^2) atau (-1)*x^2 atau -1*x^2
    SALAH: -x^2 (parser ambigu)
- Fungsi: sin(x), cos(x), tan(x), ln(x), log(x), sqrt(x), exp(x), abs(x)
- Variable HANYA x. Jangan ada a, b, c (ganti ke angka konkret kalau ada)
- Konstanta π = pi

Set isGrafikFungsiHQ=false kalau:
- Bukan grafik fungsi (geometri, diagram, dll)
- Multi-fungsi (sulit pilih satu)
- Piecewise complex
- Grafik tidak jelas / rusak total`;

  const msg = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: pngBase64 } },
        { type: "text", text: prompt },
      ],
    }],
  });

  const text = msg.content.filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
  // Strip code fence + extract first JSON object kalau ada chain of thought
  let cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  // Cari JSON object pertama (handle kalau ada CoT sebelum JSON)
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  try {
    const parsed = JSON.parse(cleaned);
    // Auto-fix expression: wrap unary minus + power ke parentheses
    if (parsed.expression) {
      parsed.expression = parsed.expression
        // Leading -x^N atau -(...)+ → -(x^N)
        .replace(/(^|[\s\(\+])-(\w+|\([^)]+\))\^(\d+)/g, "$1-($2^$3)")
        // Inside binop: + -x^N → - (x^N) (already handled above with leading char)
        .trim();
    }
    return parsed;
  } catch (e) {
    return { error: `JSON parse fail: ${cleaned.slice(0, 100)}` };
  }
}

// === Generate plot ===
async function generatePlot(itemId, expression, xMin, xMax, yMin, yMax, idToken) {
  const item = (await db.collection("item_bank").doc(itemId).get()).data();
  if (!item) throw new Error("item not found");
  const subKode = item.subMateriKode;

  const res = await fetch(`${BASE_URL}/api/admin/item-bank/${encodeURIComponent(subKode)}/fix-visual`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      itemId, mode: "plot-fungsi",
      expression, xMin, xMax,
      yMin: yMin ?? undefined, yMax: yMax ?? undefined,
      label: `y = ${expression}`,
      xTickMode: "auto",
    }),
  });
  return await res.json();
}

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
console.log("Admin token + Anthropic ready.\n");

if (applyIds) {
  const ids = applyIds.split(",").map((s) => s.trim()).filter(Boolean);
  console.log(`Apply mode: ${ids.length} items.`);
  const sugFile = resolve(ROOT, "scripts", "auto-fix-suggestions-v2.json");
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

let candidates = [];
for (const doc of snap.docs) {
  const item = doc.data();
  if (!item.konten?.svg || item.konten.svg.trim().length === 0) continue;
  if (jenjangFilter && item.jenjang !== jenjangFilter) continue;
  const p = item.konten.pertanyaan ?? "";
  if (!isGrafikFungsiCandidate(p)) continue;

  candidates.push({
    itemId: doc.id,
    subMateriKode: item.subMateriKode,
    jenjang: item.jenjang,
    kelas: item.kelas,
    pertanyaan: p,
    opsi: item.konten.opsi,
    svgBefore: item.konten.svg,
  });
}
if (limitArg) candidates = candidates.slice(0, limitArg);
console.log(`Candidates: ${candidates.length}\n`);

// Phase 1: visual analysis untuk identify expression
console.log("Phase 1: Visual analysis via Claude vision...");
let totalCost = 0;
for (let i = 0; i < candidates.length; i++) {
  const c = candidates[i];
  process.stdout.write(`[${i + 1}/${candidates.length}] ${c.itemId.slice(0, 8)} ${c.subMateriKode} ... `);
  try {
    const analysis = await analyzeWithVision(c.svgBefore, c.pertanyaan, c.opsi);
    if (analysis.error) {
      c.analysisError = analysis.error;
      console.log(`✗ analysis: ${analysis.error}`);
      continue;
    }
    if (!analysis.isGrafikFungsi) {
      c.skipped = `not grafik fungsi (${analysis.catatan ?? ""})`;
      console.log(`⏭️  skip: ${c.skipped}`);
      continue;
    }
    c.expression = analysis.expression;
    c.xMin = analysis.xMin;
    c.xMax = analysis.xMax;
    c.yMin = analysis.yMin;
    c.yMax = analysis.yMax;
    c.confidence = analysis.confidence;
    c.catatan = analysis.catatan;
    totalCost += 0.005;
    console.log(`✓ y=${c.expression} [${c.xMin},${c.xMax}] · ${c.confidence}`);
  } catch (e) {
    c.analysisError = e.message;
    console.log(`✗ ${e.message}`);
  }
}

// Phase 2: generate plot baru
console.log(`\nPhase 2: Generate plots via plotFunction...`);
const validForPlot = candidates.filter((c) => c.expression && !c.analysisError);
for (let i = 0; i < validForPlot.length; i++) {
  const c = validForPlot[i];
  process.stdout.write(`[${i + 1}/${validForPlot.length}] ${c.itemId.slice(0, 8)} y=${c.expression} ... `);
  try {
    const result = await generatePlot(c.itemId, c.expression, c.xMin, c.xMax, c.yMin, c.yMax, idToken);
    if (result.error) {
      c.plotError = result.error;
      console.log(`✗ ${result.error}`);
    } else {
      c.svgAfter = result.svgAfter;
      console.log(`✓`);
    }
  } catch (e) {
    c.plotError = e.message;
    console.log(`✗ ${e.message}`);
  }
}

// Save JSON
const sugFile = resolve(ROOT, "scripts", "auto-fix-suggestions-v2.json");
writeFileSync(sugFile, JSON.stringify(candidates, null, 2));
console.log(`\nSaved: ${sugFile}`);
console.log(`Estimated cost: $${totalCost.toFixed(3)}`);

// Build HTML viewer
const validCands = candidates.filter((c) => c.svgAfter && !c.plotError);
function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Auto-fix Grafik Fungsi v2 (Vision) — Review</title>
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
  .conf { font-size: 0.75em; padding: 2px 8px; border-radius: 999px; margin-left: 6px; }
  .conf-high { background: #d1fae5; color: #065f46; }
  .conf-medium { background: #fef3c7; color: #92400e; }
  .conf-low { background: #fee2e2; color: #991b1b; }
  .approve-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid; cursor: pointer; font-weight: 600; font-size: 0.9em; }
  .approved { background: #10b981; color: white; border-color: #10b981; }
  .pending { background: white; color: #475569; border-color: #cbd5e1; }
  .summary { position: sticky; top: 0; background: white; padding: 12px 16px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 10; }
  .summary code { background: #1e293b; color: #f1f5f9; padding: 8px 12px; border-radius: 6px; font-size: 0.85em; display: block; word-break: break-all; max-height: 80px; overflow-y: auto; }
</style>
</head><body>
<h1>🔍 Auto-fix Grafik Fungsi v2 (Vision-based)</h1>
<p>${validCands.length} candidate dari ${candidates.length} scan. Analisis pakai Claude Sonnet 4.6 vision (~$${totalCost.toFixed(3)}).</p>
<div class="summary">
  <strong>Approved (<span id="count">0</span>):</strong>
  <code id="cmd">node scripts/auto-fix-grafik-fungsi-v2.mjs --apply </code>
  <button onclick="copyCmd()">📋 Copy</button>
</div>
${validCands.map((c, i) => `
  <div class="item" id="item-${i}">
    <div class="header">
      <div>
        <div class="meta">#${i + 1} · ${c.itemId} · ${c.subMateriKode} · ${c.jenjang} K${c.kelas}</div>
        <div class="pertanyaan">${escapeHtml(c.pertanyaan.slice(0, 300))}${c.pertanyaan.length > 300 ? "..." : ""}</div>
        <div>Expression: <span class="expr-box">y = ${escapeHtml(c.expression)}</span> · range x:[${c.xMin}, ${c.xMax}]<span class="conf conf-${c.confidence}">${c.confidence}</span></div>
        ${c.catatan ? `<div style="margin-top:6px; color:#64748b; font-size:0.85em;">📝 ${escapeHtml(c.catatan)}</div>` : ""}
      </div>
      <button class="approve-btn pending" onclick="toggle('${c.itemId}', ${i})" id="btn-${i}">Approve</button>
    </div>
    <div class="compare">
      <div class="col"><h4>Before (existing)</h4><div class="svg-box">${c.svgBefore}</div></div>
      <div class="col"><h4>After (vision-based plot)</h4><div class="svg-box">${c.svgAfter}</div></div>
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
  document.getElementById('cmd').textContent = 'node scripts/auto-fix-grafik-fungsi-v2.mjs --apply ' + Array.from(approved).join(',');
}
function copyCmd() { navigator.clipboard.writeText(document.getElementById('cmd').textContent); alert('Command copied!'); }
</script>
</body></html>`;

const htmlFile = resolve(ROOT, "scripts", "auto-fix-suggestions-v2.html");
writeFileSync(htmlFile, html);

console.log(`\n=== DONE ===`);
console.log(`Candidates: ${candidates.length}`);
console.log(`Skipped (not grafik fungsi): ${candidates.filter((c) => c.skipped).length}`);
console.log(`Generated successfully: ${validCands.length}`);
console.log(`Failed: ${candidates.length - validCands.length - candidates.filter((c) => c.skipped).length}`);
console.log(`Cost: ~$${totalCost.toFixed(3)}`);
console.log(`\nReview: ${htmlFile}`);
console.log(`Open: start D:\\turo\\scripts\\auto-fix-suggestions-v2.html`);
