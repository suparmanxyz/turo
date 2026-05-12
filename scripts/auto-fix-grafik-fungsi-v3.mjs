// v3: Vision-based + multi-curve + preserve labels/areas via extended plotFunction.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
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
const refreshHtmlOnly = args.includes("--refresh-html");

async function mintAdminToken() {
  const u = await admin.auth().getUserByEmail(ADMIN_EMAIL);
  const ct = await admin.auth().createCustomToken(u.uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: ct, returnSecureToken: true }) },
  );
  return (await res.json()).idToken;
}

function isGrafikFungsiCandidate(p) {
  if (!p) return false;
  const l = p.toLowerCase();
  return /grafik|kurva|fungsi.*y\s*=|f\(x\)/.test(l);
}

function renderSvgToPng(svg, w = 800) {
  return new Resvg(svg, { fitTo: { mode: "width", value: w } }).render().asPng();
}

async function analyzeWithVision(svg, pertanyaan, opsi) {
  let pngBuf;
  try { pngBuf = renderSvgToPng(svg); } catch (e) { return { error: `SVG render fail: ${e.message}` }; }
  const opsiText = opsi.map((o, i) => `${String.fromCharCode(65 + i)}. ${o.teks}`).join("\n");
  const prompt = `Analisa grafik fungsi di gambar untuk identify expression(s) DAN element pendukung yang harus di-preserve.

PERTANYAAN:
${pertanyaan}

OPSI:
${opsiText}

⚠️ OUTPUT WAJIB: JSON murni saja. JANGAN ada penjelasan, JANGAN code fence.
LANGSUNG mulai dengan { dan akhiri dengan }.

Format JSON:
{
  "isGrafikFungsi": true,
  "mainCurve": {
    "expression": "x^2 + 2*x - 3",
    "color": "#1e40af"
  },
  "extraCurves": [
    { "expression": "2*x + 1", "color": "#dc2626", "label": "y = 2x+1" }
  ],
  "xMin": -5,
  "xMax": 5,
  "yMin": null,
  "yMax": null,
  "customLabels": [
    { "text": "A(2,5)", "x": 2, "y": 5, "color": "#dc2626" },
    { "text": "(0, -3)", "x": 0, "y": -3 }
  ],
  "shadedAreas": [
    { "fromExpression": "x^2", "toExpression": "2*x", "xFrom": 0, "xTo": 2, "color": "#3b82f6", "opacity": 0.2 }
  ],
  "confidence": "high",
  "catatan": "Parabola y=x^2+2x-3 + garis y=2x+1, perpotongan di (1,3) dan (-2,-3)"
}

ATURAN:
- mainCurve: kurva utama (1 expression). WAJIB.
- extraCurves: kurva tambahan kalau gambar punya 2+ kurva. Kosongkan [] kalau cuma 1.
- customLabels: HANYA kalau ada text/label di gambar yang penting (titik koordinat, nama titik, anotasi). Kosongkan [] kalau tidak ada.
- shadedAreas: HANYA kalau ada area arsiran. Kosongkan [] kalau tidak ada.
- Expression syntax: pakai * untuk multiply, ^ untuk pangkat, fungsi sin(x), cos(x), ln(x), sqrt(x), abs(x).
- Wrap negative dengan kurung: -(x^2) bukan -x^2.
- Variable HANYA x.
- Set isGrafikFungsi=false kalau bukan grafik fungsi (geometri, diagram, statistik).`;

  const msg = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: pngBuf.toString("base64") } },
        { type: "text", text: prompt },
      ],
    }],
  });
  let text = msg.content.filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
  text = text.replace(/```json\s*|\s*```/g, "").trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (m) text = m[0];
  try {
    const p = JSON.parse(text);
    // Auto-fix unary minus precedence
    const fix = (e) => e ? e.replace(/(^|[\s\(\+])-(\w+|\([^)]+\))\^(\d+)/g, "$1-($2^$3)") : e;
    if (p.mainCurve) p.mainCurve.expression = fix(p.mainCurve.expression);
    if (p.extraCurves) p.extraCurves.forEach((c) => { c.expression = fix(c.expression); });
    if (p.shadedAreas) p.shadedAreas.forEach((a) => { a.fromExpression = fix(a.fromExpression); if (a.toExpression) a.toExpression = fix(a.toExpression); });
    return p;
  } catch (e) {
    return { error: `JSON parse fail: ${text.slice(0, 100)}` };
  }
}

async function generatePlot(itemId, analysis, idToken) {
  const item = (await db.collection("item_bank").doc(itemId).get()).data();
  const subKode = item.subMateriKode;
  const body = {
    itemId,
    mode: "plot-fungsi",
    expression: analysis.mainCurve.expression,
    xMin: analysis.xMin,
    xMax: analysis.xMax,
    yMin: analysis.yMin ?? undefined,
    yMax: analysis.yMax ?? undefined,
    label: `y = ${analysis.mainCurve.expression}`,
    xTickMode: "auto",
    extraCurves: analysis.extraCurves?.length ? analysis.extraCurves : undefined,
    customLabels: analysis.customLabels?.length ? analysis.customLabels : undefined,
    shadedAreas: analysis.shadedAreas?.length ? analysis.shadedAreas : undefined,
  };
  const res = await fetch(`${BASE_URL}/api/admin/item-bank/${encodeURIComponent(subKode)}/fix-visual`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
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
const idToken = await mintAdminToken();
console.log("Ready.\n");

if (applyIds) {
  const ids = applyIds.split(",").map((s) => s.trim()).filter(Boolean);
  console.log(`Apply: ${ids.length} items.`);
  const sugFile = resolve(ROOT, "scripts", "auto-fix-suggestions-v3.json");
  const sugs = JSON.parse(readFileSync(sugFile, "utf8"));
  const byId = new Map(sugs.map((s) => [s.itemId, s]));
  let s = 0, f = 0;
  for (const id of ids) {
    const sug = byId.get(id);
    if (!sug?.svgAfter) { console.log(`  ✗ ${id}: not found`); f++; continue; }
    try { await applyOne(id, sug.svgAfter, idToken); console.log(`  ✓ ${id}`); s++; }
    catch (e) { console.log(`  ✗ ${id}: ${e.message}`); f++; }
  }
  console.log(`\n${s} applied, ${f} failed.`);
  process.exit(0);
}

let candidates = [];
let cost = 0;
const sugFileGlobal = resolve(ROOT, "scripts", "auto-fix-suggestions-v3.json");

if (refreshHtmlOnly) {
  if (!existsSync(sugFileGlobal)) {
    console.error("JSON not found, run scan dulu sebelum --refresh-html");
    process.exit(1);
  }
  candidates = JSON.parse(readFileSync(sugFileGlobal, "utf8"));
  console.log(`🔄 Refresh HTML mode: ${candidates.length} candidate dari JSON.`);
  console.log(`   Skip scan + vision + plot. Token fresh akan di-embed.\n`);
} else {

console.log("Scanning...");
const snap = await db.collection("item_bank").get();
for (const doc of snap.docs) {
  const item = doc.data();
  if (!item.konten?.svg || item.konten.svg.trim().length === 0) continue;
  if (jenjangFilter && item.jenjang !== jenjangFilter) continue;
  const p = item.konten.pertanyaan ?? "";
  if (!isGrafikFungsiCandidate(p)) continue;
  candidates.push({
    itemId: doc.id, subMateriKode: item.subMateriKode,
    jenjang: item.jenjang, kelas: item.kelas,
    pertanyaan: p, opsi: item.konten.opsi,
    svgBefore: item.konten.svg,
  });
}
if (limitArg) candidates = candidates.slice(0, limitArg);
console.log(`Candidates: ${candidates.length}\n`);

console.log("Phase 1: Vision analysis (multi-curve + labels + areas)...");
for (let i = 0; i < candidates.length; i++) {
  const c = candidates[i];
  process.stdout.write(`[${i + 1}/${candidates.length}] ${c.itemId.slice(0, 8)} ${c.subMateriKode} ... `);
  try {
    const a = await analyzeWithVision(c.svgBefore, c.pertanyaan, c.opsi);
    if (a.error) { c.analysisError = a.error; console.log(`✗ ${a.error}`); continue; }
    if (!a.isGrafikFungsi) { c.skipped = a.catatan ?? "not grafik fungsi"; console.log(`⏭️  ${c.skipped.slice(0, 60)}`); continue; }
    c.analysis = a;
    cost += 0.005;
    const extra = a.extraCurves?.length ? ` +${a.extraCurves.length}c` : "";
    const lbl = a.customLabels?.length ? ` +${a.customLabels.length}lbl` : "";
    const area = a.shadedAreas?.length ? ` +${a.shadedAreas.length}area` : "";
    console.log(`✓ y=${a.mainCurve.expression}${extra}${lbl}${area}`);
  } catch (e) { c.analysisError = e.message; console.log(`✗ ${e.message}`); }
}

console.log(`\nPhase 2: Generate plots (multi-curve + labels)...`);
const valid = candidates.filter((c) => c.analysis && !c.analysisError);
for (let i = 0; i < valid.length; i++) {
  const c = valid[i];
  process.stdout.write(`[${i + 1}/${valid.length}] ${c.itemId.slice(0, 8)} ... `);
  try {
    const r = await generatePlot(c.itemId, c.analysis, idToken);
    if (r.error) { c.plotError = r.error; console.log(`✗ ${r.error}`); }
    else { c.svgAfter = r.svgAfter; c.catatanPlot = r.catatan; console.log(`✓`); }
  } catch (e) { c.plotError = e.message; console.log(`✗ ${e.message}`); }
}

writeFileSync(sugFileGlobal, JSON.stringify(candidates, null, 2));

} // end of !refreshHtmlOnly

const ok = candidates.filter((c) => c.svgAfter && !c.plotError);
function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Auto-fix v3 — Multi-curve + Labels + AI Tweak</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/contrib/auto-render.min.js"></script>
<script>
window.addEventListener('DOMContentLoaded', () => {
  // 1. Render Markdown (tables, lists, dll) di element dengan data-md
  document.querySelectorAll('[data-md]').forEach(el => {
    const raw = el.textContent || '';
    el.innerHTML = marked.parse(raw, { breaks: false });
  });
  // 2. Render KaTeX math (\$...\$) di body
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\\\(', right: '\\\\)', display: false },
        { left: '\\\\[', right: '\\\\]', display: true },
      ],
      throwOnError: false,
    });
  }
});
</script>
<style>
.pertanyaan table { border-collapse: collapse; margin: 8px 0; font-size: 0.9em; }
.pertanyaan th, .pertanyaan td { border: 1px solid #cbd5e1; padding: 4px 10px; }
.pertanyaan th { background: #f1f5f9; }
.pertanyaan p { margin: 6px 0; }
/* Inline SVG editor */
.editable-svg { user-select: none; }
.editable-svg text, .editable-svg foreignObject {
  cursor: move;
  transition: opacity 0.15s;
}
.editable-svg text:hover, .editable-svg foreignObject:hover {
  opacity: 0.7;
  outline: 1.5px dashed #f59e0b;
}
.editable-svg .dragging {
  opacity: 0.4 !important;
}
.delete-overlay {
  position: absolute;
  width: 22px;
  height: 22px;
  background: #dc2626;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  z-index: 5;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
.delete-overlay:hover { background: #991b1b; transform: scale(1.1); }
.editor-tools {
  display: flex;
  gap: 6px;
  font-size: 0.75em;
  color: #64748b;
  margin-top: 4px;
  align-items: center;
}
.editor-tools button {
  background: white;
  border: 1px solid #cbd5e1;
  padding: 3px 8px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.85em;
}
.editor-tools button:hover { background: #f1f5f9; }
.editor-tools .reset-btn { color: #b45309; border-color: #fde68a; background: #fefce8; }
.editor-tools .reset-btn:hover { background: #fef3c7; }
</style>
<style>
  body{font-family:-apple-system,system-ui,sans-serif;max-width:1280px;margin:0 auto;padding:20px;background:#f8fafc}
  .item{background:white;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
  .header{display:flex;justify-content:space-between;gap:12px;margin-bottom:12px}
  .meta{font-size:.85em;color:#64748b}
  .pertanyaan{font-size:.95em;line-height:1.5;margin:8px 0}
  .body-grid{display:grid;grid-template-columns:1fr 1fr 280px;gap:14px}
  .col h4{font-size:.85em;color:#475569;margin:0 0 6px;text-transform:uppercase;letter-spacing:.05em}
  .svg-box{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:12px;min-height:200px;display:flex;align-items:center;justify-content:center;position:relative}
  .svg-box svg{max-width:100%;max-height:280px}
  .expr{font-family:monospace;background:#f0fdfa;padding:4px 8px;border-radius:4px;font-size:.85em}
  .badge{font-size:.75em;padding:2px 8px;border-radius:999px;margin-left:6px}
  .high{background:#d1fae5;color:#065f46}.medium{background:#fef3c7;color:#92400e}.low{background:#fee2e2;color:#991b1b}
  .feature{background:#ede9fe;color:#5b21b6;padding:2px 8px;border-radius:999px;font-size:.75em;margin-right:4px}
  .btn{padding:6px 14px;border-radius:8px;border:1px solid;cursor:pointer;font-weight:600;font-size:.9em}
  .approved{background:#10b981;color:white;border-color:#10b981}
  .pending{background:white;color:#475569;border-color:#cbd5e1}
  .summary{position:sticky;top:0;background:white;padding:12px 16px;margin-bottom:16px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.1);z-index:10}
  .summary code{background:#1e293b;color:#f1f5f9;padding:8px 12px;border-radius:6px;font-size:.85em;display:block;word-break:break-all;max-height:80px;overflow-y:auto}
  /* AI tweak panel */
  .ai-panel{background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px}
  .ai-panel h4{font-size:.85em;color:#854d0e;margin:0;text-transform:uppercase;letter-spacing:.05em}
  .ai-panel textarea{width:100%;min-height:90px;padding:8px;border:1px solid #fde68a;border-radius:6px;font-size:.85em;font-family:inherit;resize:vertical;box-sizing:border-box}
  .ai-panel button{background:#a855f7;color:white;border:none;padding:7px 12px;border-radius:6px;font-weight:600;cursor:pointer;font-size:.85em}
  .ai-panel button:hover{background:#9333ea}
  .ai-panel button:disabled{background:#cbd5e1;cursor:not-allowed}
  .ai-status{font-size:.75em;color:#64748b;min-height:1em}
  .ai-status.error{color:#dc2626}
  .ai-status.success{color:#16a34a}
  .ai-suggest{font-size:.75em;color:#92400e}
  .model-toggle{display:flex;gap:4px;font-size:.75em}
  .model-toggle label{display:flex;gap:3px;align-items:center;cursor:pointer}
</style></head><body>
<h1>🔍 Auto-fix v3 — Multi-curve + Labels + AI Tweak</h1>
<p>${ok.length} candidate dari ${candidates.length}. Cost ~$${cost.toFixed(3)}.</p>
<p style="font-size:.9em;color:#64748b">💡 Setiap item punya kotak AI command — kasih instruksi text untuk fine-tune SVG (warna, ukuran, label tambahan, dll). Hasil ter-update real-time di kolom "After".</p>
<div class="summary">
<strong>Approved (<span id="count">0</span>):</strong>
<button onclick="saveAllApproved()" id="save-all-btn" style="background:#10b981;color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;margin-right:8px">💾 Save All Approved (langsung ke Firestore)</button>
<button onclick="copyCmd()" style="background:#64748b;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-size:.85em">📋 Copy CLI</button>
<div id="save-status" style="margin-top:6px;font-size:.85em;color:#64748b"></div>
<details style="margin-top:6px"><summary style="font-size:.8em;color:#64748b;cursor:pointer">CLI fallback</summary>
<code id="cmd" style="margin-top:4px">node scripts/auto-fix-grafik-fungsi-v3.mjs --apply </code>
</details>
</div>
${ok.map((c, i) => `
  <div class="item" id="item-${i}" data-itemid="${c.itemId}" data-subkode="${c.subMateriKode}">
    <div class="header">
      <div>
        <div class="meta">#${i + 1} · ${c.itemId} · ${c.subMateriKode} · ${c.jenjang} K${c.kelas}</div>
        <div class="pertanyaan" data-md>${escapeHtml(c.pertanyaan)}</div>
        <details style="margin-top:6px;font-size:.85em"><summary style="cursor:pointer;color:#64748b">Lihat opsi (${c.opsi.length})</summary><ol style="margin-top:6px;padding-left:24px;color:#475569" type="A">${c.opsi.map((o) => `<li style="margin:4px 0">${escapeHtml(o.teks)}</li>`).join("")}</ol></details>
        <div>
          <span class="expr">y = ${escapeHtml(c.analysis.mainCurve.expression)}</span>
          <span class="badge ${c.analysis.confidence}">${c.analysis.confidence}</span>
          ${c.analysis.extraCurves?.length ? `<span class="feature">+${c.analysis.extraCurves.length} kurva</span>` : ""}
          ${c.analysis.customLabels?.length ? `<span class="feature">+${c.analysis.customLabels.length} label</span>` : ""}
          ${c.analysis.shadedAreas?.length ? `<span class="feature">+${c.analysis.shadedAreas.length} area</span>` : ""}
        </div>
        ${c.analysis.extraCurves?.length ? `<div style="font-size:.85em;color:#64748b;margin-top:4px">Extra: ${c.analysis.extraCurves.map((cv) => "y=" + cv.expression).join(", ")}</div>` : ""}
        ${c.analysis.catatan ? `<div style="margin-top:4px;color:#64748b;font-size:.85em">📝 ${escapeHtml(c.analysis.catatan)}</div>` : ""}
      </div>
      <button class="btn pending" onclick="toggle('${c.itemId}', ${i})" id="btn-${i}">Approve</button>
    </div>
    <div class="body-grid">
      <div class="col"><h4>Before</h4><div class="svg-box">${c.svgBefore}</div></div>
      <div class="col">
        <h4>After (auto) — drag label, klik 🗑️ untuk hapus</h4>
        <div class="svg-box editable-svg" id="after-${i}" data-itemid="${c.itemId}">${c.svgAfter}</div>
        <div class="editor-tools">
          <button class="reset-btn" onclick="resetSvg('${c.itemId}', ${i})">🔄 Reset ke awal</button>
          <span style="color:#94a3b8">Hover label → drag pindah · klik tombol merah 🗑️ untuk hapus</span>
        </div>
      </div>
      <div class="ai-panel">
        <h4>🤖 Tweak AI</h4>
        <div class="ai-suggest">Contoh: "perbesar 30%", "tambah label di titik puncak (2,5)", "ganti warna kurva ke merah", "tambah arsiran area di bawah kurva untuk x ∈ [0,2]"</div>
        <textarea id="ai-input-${i}" placeholder="Instruksi tweak..."></textarea>
        <div class="model-toggle">
          <label><input type="radio" name="model-${i}" value="sonnet" checked> Sonnet (cepat)</label>
          <label><input type="radio" name="model-${i}" value="opus"> Opus (presisi)</label>
        </div>
        <button onclick="tweakItem(${i}, '${c.itemId}', '${c.subMateriKode}')" id="ai-btn-${i}">⚡ Apply Tweak</button>
        <div class="ai-status" id="ai-status-${i}"></div>
      </div>
    </div>
  </div>
`).join("")}
<script>
const ADMIN_TOKEN = ${JSON.stringify(idToken)};
const BASE_URL = "${BASE_URL}";
const TOKEN_EXPIRES_AT = Date.now() + 50 * 60 * 1000; // 50 min (token valid 1h)

const ap = new Set();
function toggle(id, i) {
  const b = document.getElementById('btn-' + i);
  if (ap.has(id)) { ap.delete(id); b.classList.replace('approved', 'pending'); b.textContent = 'Approve'; }
  else { ap.add(id); b.classList.replace('pending', 'approved'); b.textContent = '✓ Approved'; }
  document.getElementById('count').textContent = ap.size;
  document.getElementById('cmd').textContent = 'node scripts/auto-fix-grafik-fungsi-v3.mjs --apply ' + Array.from(ap).join(',');
}
function copyCmd() { navigator.clipboard.writeText(document.getElementById('cmd').textContent); alert('CLI command copied!'); }

async function saveAllApproved() {
  if (Date.now() > TOKEN_EXPIRES_AT) { alert("Token expired (1 jam). Re-run script untuk dapat token baru."); return; }
  if (ap.size === 0) { alert("Tidak ada item approved"); return; }
  if (!confirm("Save " + ap.size + " items ke Firestore (TERMASUK semua tweaks AI)?")) return;
  const status = document.getElementById('save-status');
  const btn = document.getElementById('save-all-btn');
  btn.disabled = true; btn.textContent = "⏳ Saving...";
  let success = 0, fail = 0;
  for (const id of Array.from(ap)) {
    const itemEl = document.querySelector('[data-itemid="' + id + '"]');
    if (!itemEl) { fail++; continue; }
    const subKode = itemEl.getAttribute('data-subkode');
    try {
      const res = await fetch(BASE_URL + "/api/admin/item-bank/" + encodeURIComponent(subKode) + "/fix-visual", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + ADMIN_TOKEN },
        body: JSON.stringify({ itemId: id, svg: currentSvg[id] }),
      });
      if (res.ok) { success++; status.textContent = "Saving " + (success + fail) + "/" + ap.size + "..."; }
      else fail++;
    } catch (e) { fail++; }
  }
  btn.disabled = false; btn.textContent = "💾 Save All Approved";
  status.textContent = "✓ " + success + " saved, " + fail + " failed";
  if (success > 0) alert(success + " items saved! Refresh /admin/item-bank/[kode] untuk lihat hasilnya.");
}

// Map svgAfter: original (untuk reset) + current (sedang ditampilkan)
const originalSvg = {};
const currentSvg = {};
${ok.map((c) => {
  const safeJson = JSON.stringify(c.svgAfter).replace(/<\/script>/gi, "<\\/script>");
  return `originalSvg["${c.itemId}"] = ${safeJson};\ncurrentSvg["${c.itemId}"] = ${safeJson};`;
}).join("\n")}

// ============== INLINE SVG EDITOR (drag + delete + reset) ==============
function attachEditorHandlers(container, itemId) {
  if (!container) return;
  const svg = container.querySelector('svg');
  if (!svg) return;

  // Get SVG viewBox untuk konversi pixel → SVG coord
  const vb = svg.viewBox.baseVal;
  const svgWidth = vb.width || 400;
  const svgHeight = vb.height || 280;

  // Attach drag to all text & foreignObject elements
  const draggables = svg.querySelectorAll('text, foreignObject');
  draggables.forEach((el, idx) => {
    el.setAttribute('data-edit-idx', idx);

    let dragging = false;
    let startMouseX = 0, startMouseY = 0;
    let startElX = 0, startElY = 0;

    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // only left click
      // Skip kalau klik delete overlay (handled separately)
      if (e.target.classList?.contains('delete-overlay')) return;
      dragging = true;
      startMouseX = e.clientX;
      startMouseY = e.clientY;
      startElX = parseFloat(el.getAttribute('x') || 0);
      startElY = parseFloat(el.getAttribute('y') || 0);
      el.classList.add('dragging');
      e.preventDefault();
    });

    function onMove(e) {
      if (!dragging) return;
      // Calculate scale factor: SVG might be scaled to fit container
      const rect = svg.getBoundingClientRect();
      const scaleX = svgWidth / rect.width;
      const scaleY = svgHeight / rect.height;
      const dx = (e.clientX - startMouseX) * scaleX;
      const dy = (e.clientY - startMouseY) * scaleY;
      el.setAttribute('x', (startElX + dx).toFixed(1));
      el.setAttribute('y', (startElY + dy).toFixed(1));
    }
    function onUp() {
      if (dragging) {
        dragging = false;
        el.classList.remove('dragging');
        // Save current SVG back ke state
        currentSvg[itemId] = svg.outerHTML;
      }
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    // Add delete overlay (visible on hover)
    const overlay = document.createElement('div');
    overlay.className = 'delete-overlay';
    overlay.textContent = '✗';
    overlay.title = 'Hapus label';
    overlay.style.display = 'none';

    el.addEventListener('mouseenter', () => {
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      overlay.style.left = (elRect.right - containerRect.left - 11) + 'px';
      overlay.style.top = (elRect.top - containerRect.top - 11) + 'px';
      overlay.style.display = 'flex';
    });
    overlay.addEventListener('mouseleave', () => {
      overlay.style.display = 'none';
    });
    overlay.addEventListener('mousedown', (e) => e.stopPropagation()); // prevent drag
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
      overlay.remove();
      currentSvg[itemId] = svg.outerHTML;
    });
    container.appendChild(overlay);
  });
}

function resetSvg(itemId, idx) {
  if (!confirm('Reset SVG ke kondisi awal? Semua tweak akan hilang.')) return;
  currentSvg[itemId] = originalSvg[itemId];
  const container = document.getElementById('after-' + idx);
  // Clear old overlays
  container.querySelectorAll('.delete-overlay').forEach((o) => o.remove());
  container.innerHTML = originalSvg[itemId];
  attachEditorHandlers(container, itemId);
}

// Attach handlers ke semua editable SVG saat HTML load (after KaTeX render)
window.addEventListener('load', () => {
  setTimeout(() => {
    document.querySelectorAll('.editable-svg').forEach((c) => {
      attachEditorHandlers(c, c.getAttribute('data-itemid'));
    });
  }, 500); // delay supaya KaTeX selesai render dulu
});

async function tweakItem(idx, itemId, subKode) {
  if (Date.now() > TOKEN_EXPIRES_AT) {
    alert("Token expired (1 jam). Re-run script untuk dapat token baru.");
    return;
  }
  const input = document.getElementById('ai-input-' + idx);
  const status = document.getElementById('ai-status-' + idx);
  const btn = document.getElementById('ai-btn-' + idx);
  const instruksi = input.value.trim();
  if (!instruksi) { status.textContent = "Isi instruksi dulu"; status.className = "ai-status error"; return; }

  const model = document.querySelector('input[name="model-' + idx + '"]:checked').value;
  btn.disabled = true; btn.textContent = "⏳ Tweaking...";
  status.textContent = "AI sedang revisi SVG..."; status.className = "ai-status";

  // Kirim SVG terkini via svgInput supaya endpoint pakai itu (bukan dari Firestore).
  // Endpoint preserve <foreignObject> KaTeX label kalau ada.
  try {
    const res = await fetch(BASE_URL + "/api/admin/item-bank/" + encodeURIComponent(subKode) + "/fix-visual", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + ADMIN_TOKEN },
      body: JSON.stringify({ itemId, mode: "chat", instruksi, model, svgInput: currentSvg[itemId] }),
    });
    const data = await res.json();
    if (!res.ok) {
      let errMsg = "✗ " + (data.error ?? res.status);
      if (data.raw) errMsg += "\\n[Raw: " + data.raw.slice(0, 150) + "...]";
      if (data.stopReason) errMsg += " (stop: " + data.stopReason + ")";
      status.textContent = errMsg;
      status.className = "ai-status error";
      console.error("Tweak fail:", data);
    }
    else if (!data.svgAfter) { status.textContent = "✗ AI return empty SVG"; status.className = "ai-status error"; }
    else {
      currentSvg[itemId] = data.svgAfter;
      const container = document.getElementById('after-' + idx);
      // Clear old delete overlays before innerHTML swap
      container.querySelectorAll('.delete-overlay').forEach((o) => o.remove());
      container.innerHTML = data.svgAfter;
      // Re-attach drag/delete handlers ke SVG baru
      attachEditorHandlers(container, itemId);
      status.textContent = "✓ " + (data.catatan ?? "updated"); status.className = "ai-status success";
      input.value = "";
    }
  } catch (e) {
    status.textContent = "✗ " + e.message; status.className = "ai-status error";
  } finally {
    btn.disabled = false; btn.textContent = "⚡ Apply Tweak";
  }
}
</script></body></html>`;
// Save di public/ supaya bisa diakses via dev server (same-origin → no CORS issue
// untuk fetch ke /api/admin/...).
const publicHtmlFile = resolve(ROOT, "public", "auto-fix-suggestions-v3.html");
writeFileSync(publicHtmlFile, html);
// Mirror juga di scripts/ untuk reference
writeFileSync(resolve(ROOT, "scripts", "auto-fix-suggestions-v3.html"), html);

console.log(`\n=== DONE ===`);
console.log(`OK: ${ok.length} / ${candidates.length} · Skipped: ${candidates.filter(c => c.skipped).length} · Cost: ~$${cost.toFixed(3)}`);
console.log(`\n🌐 BUKA DI BROWSER (via dev server, supaya tombol AI tweak BERFUNGSI):`);
console.log(`   http://localhost:3000/auto-fix-suggestions-v3.html`);
console.log(`\n(Reference file lokal: ${publicHtmlFile})`);
