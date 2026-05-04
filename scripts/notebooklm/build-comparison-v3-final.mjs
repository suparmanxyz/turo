// HTML Viewer v3 FINAL: Turo strict vs CP 046 ASLI (truth) + AI verdict
//
// 3 kolom:
//   - 📘 CP 046 Truth (per Fase per elemen, raw text dari source primer)
//   - 🎯 Turo strict per kelas per bab + AI verdict badge per sub
//   - 🤖 Detail audit (verdict + reasoning + kutipan CP) — buka via click
//
// Run: node scripts/notebooklm/build-comparison-v3-final.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "out");
const PETA_PATH = resolve(import.meta.dirname, "..", "..", "src/data/peta-prasyarat.json");
const TRUTH_PATH = resolve(ROOT, "cp046-truth.json");
const CACHE_PATH = resolve(ROOT, "audit-vs-cp046-truth-cache.json");

const peta = JSON.parse(readFileSync(PETA_PATH, "utf8"));
const truth = JSON.parse(readFileSync(TRUTH_PATH, "utf8"));
const auditCache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, "utf8")) : {};

const safe = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function jenjangKelasToFase(jenjang, kelas) {
  if (jenjang === "SD") {
    if (kelas <= 2) return "Fase A (Kelas 1-2 SD)";
    if (kelas <= 4) return "Fase B (Kelas 3-4 SD)";
    return "Fase C (Kelas 5-6 SD)";
  }
  if (jenjang === "SMP") return "Fase D (Kelas 7-9 SMP)";
  if (jenjang === "SMA") {
    if (kelas === 10) return "Fase E (Kelas 10 SMA)";
    return "Fase F (Kelas 11-12 SMA Wajib)";
  }
  return null;
}

function buildJenjangData(jenjang, code) {
  const turoSubs = peta.submateri.filter((s) => s.jenjang === jenjang);
  // Group by kelas → bab
  const turoByKelas = new Map();
  for (const s of turoSubs) {
    if (!turoByKelas.has(s.kelas)) turoByKelas.set(s.kelas, new Map());
    const babMap = turoByKelas.get(s.kelas);
    const key = `${s.bab_kode}|${s.bab_nama}`;
    if (!babMap.has(key)) babMap.set(key, []);
    babMap.get(key).push(s);
  }

  const kelasData = [];
  for (const [k, babMap] of [...turoByKelas].sort((a, b) => a[0] - b[0])) {
    const fase = jenjangKelasToFase(jenjang, k);
    const babs = [...babMap].map(([key, subs]) => {
      const [babKode, babNama] = key.split("|");
      // Aggregate verdicts in this bab
      const counts = { MATCH_FASE_SAMA: 0, MATCH_FASE_LAIN: 0, NO_MATCH: 0, none: 0 };
      for (const s of subs) {
        if (!s.strict) continue;
        const v = auditCache[s.kode]?.verdict ?? "none";
        counts[v] = (counts[v] ?? 0) + 1;
      }
      const allStrict = subs.every((s) => s.strict);
      const someStrict = subs.some((s) => s.strict);
      const status = allStrict ? "strict" : someStrict ? "mixed" : "non-strict";
      return { babKode, babNama, subs, status, verdictCounts: counts };
    }).sort((a, b) => a.babKode.localeCompare(b.babKode, undefined, { numeric: true }));
    kelasData.push({ kelas: k, fase, babs });
  }

  // Faseset for this jenjang's CP truth
  const relevantFases = jenjang === "SD" ? ["Fase A (Kelas 1-2 SD)", "Fase B (Kelas 3-4 SD)", "Fase C (Kelas 5-6 SD)"]
    : jenjang === "SMP" ? ["Fase D (Kelas 7-9 SMP)"]
    : ["Fase E (Kelas 10 SMA)", "Fase F (Kelas 11-12 SMA Wajib)", "Fase F TL (Kelas 11-12 SMA Lanjut)"];

  return { jenjang, code, kelasData, relevantFases, totalSub: turoSubs.length };
}

function renderCpFase(faseName, faseData) {
  const elemenList = Object.entries(faseData.elemen).map(([elemen, elData]) => `
    <div class="elemen-block">
      <div class="elemen-name">${safe(elemen)}</div>
      <div class="elemen-text">${safe(elData.raw || "(tidak ada teks)")}</div>
    </div>
  `).join("");
  return `
    <div class="cp-fase-card" data-fase="${safe(faseName)}">
      <div class="cp-fase-name">${safe(faseName)}</div>
      ${elemenList}
    </div>
  `;
}

function renderTuroBab(b) {
  const subList = b.subs.map((s) => {
    const audit = auditCache[s.kode];
    const verdict = audit?.verdict ?? "none";
    const verdictBadge = renderVerdictBadge(verdict);
    const reasoningAttr = audit ? safe(JSON.stringify({
      verdict: audit.verdict,
      matched_fase: audit.matched_fase,
      matched_elemen: audit.matched_elemen,
      kutipan_cp: audit.kutipan_cp,
      reasoning: audit.reasoning,
      confidence: audit.confidence,
      _expected_fase: audit._expected_fase,
    })) : "";
    return `
      <li class="sub-item sub-${s.strict ? 'strict' : 'bridge'} verdict-${verdict}" data-verdict="${verdict}" data-audit='${reasoningAttr}'>
        ${verdictBadge}
        <code>${safe(s.kode)}</code>
        <span class="sub-name">${safe(s.nama)}</span>
      </li>
    `;
  }).join("");

  const statusBadge = b.status === "strict" ? '<span class="badge badge-strict">All Strict</span>' :
                     b.status === "mixed" ? '<span class="badge badge-mixed">Mixed</span>' :
                     '<span class="badge badge-bridge">Bridge</span>';

  const vc = b.verdictCounts;
  const totalAudited = vc.MATCH_FASE_SAMA + vc.MATCH_FASE_LAIN + vc.NO_MATCH;
  const verdictSummary = totalAudited > 0 ? `
    <div class="verdict-summary">
      ${vc.MATCH_FASE_SAMA > 0 ? `<span class="vs vs-same">✓ ${vc.MATCH_FASE_SAMA}</span>` : ""}
      ${vc.MATCH_FASE_LAIN > 0 ? `<span class="vs vs-other">⚠ ${vc.MATCH_FASE_LAIN}</span>` : ""}
      ${vc.NO_MATCH > 0 ? `<span class="vs vs-no">🚨 ${vc.NO_MATCH}</span>` : ""}
    </div>
  ` : "";

  return `
    <div class="bab-card turo-card" data-bab-kode="${safe(b.babKode)}">
      <div class="bab-header">
        <span class="bab-id">${safe(b.babKode)}</span>
        <span class="bab-name">${safe(b.babNama)}</span>
        ${statusBadge}
      </div>
      ${verdictSummary}
      <ul class="sub-list">${subList}</ul>
      ${b.status !== "non-strict" ? `
        <div class="actions">
          <button class="btn btn-untag" data-action="untag" data-key="untag:${safe(b.babKode)}">🌉 UNTAG → Bridge</button>
          <button class="btn btn-keep" data-action="keep" data-key="keep:${safe(b.babKode)}">✓ KEEP Strict</button>
        </div>
      ` : ''}
    </div>
  `;
}

function renderVerdictBadge(verdict) {
  switch (verdict) {
    case "MATCH_FASE_SAMA":
      return `<span class="vbadge vbadge-same" title="✓ AI: di CP 046, Fase sama">✓</span>`;
    case "MATCH_FASE_LAIN":
      return `<span class="vbadge vbadge-other" title="⚠ AI: di CP 046, tapi Fase berbeda">⚠</span>`;
    case "NO_MATCH":
      return `<span class="vbadge vbadge-no" title="🚨 AI: tidak ada di CP 046">🚨</span>`;
    default:
      return `<span class="vbadge vbadge-none" title="Belum diaudit / Bridge">·</span>`;
  }
}

function renderKelas(kelas, relevantFases) {
  const turoCol = kelas.babs.map(renderTuroBab).join("");
  // CP truth column: show ALL relevant fases for this jenjang (not just current kelas's fase)
  const cpCol = relevantFases.map((faseName) => {
    const faseData = truth.matematika_reguler[faseName] ?? truth.matematika_tingkat_lanjut[faseName];
    if (!faseData) return "";
    return renderCpFase(faseName, faseData);
  }).join("");

  return `
    <section class="kelas-section" data-kelas="${kelas.kelas}">
      <header class="kelas-header">
        <h2>Kelas ${kelas.kelas} <span class="fase-name">— ${safe(kelas.fase)}</span></h2>
      </header>
      <div class="two-col">
        <div class="col col-cp">
          <h3>📘 CP 046 ASLI (autoritatif)</h3>
          ${cpCol}
        </div>
        <div class="col col-turo">
          <h3>🎯 Turo Strict + AI Verdict</h3>
          ${turoCol || '<p class="empty">Tidak ada bab</p>'}
        </div>
      </div>
    </section>
  `;
}

function buildHtml(data) {
  const kelasNav = data.kelasData.map((k, i) => `
    <button class="tab-btn ${i === 0 ? 'active' : ''}" data-kelas="${k.kelas}">K${k.kelas}</button>
  `).join("");

  const kelasContent = data.kelasData.map((k, i) => `
    <div class="tab-content ${i === 0 ? 'active' : ''}" data-kelas="${k.kelas}">
      ${renderKelas(k, data.relevantFases)}
    </div>
  `).join("");

  // Aggregate stats
  let totalSame = 0, totalOther = 0, totalNo = 0, totalNone = 0;
  for (const k of data.kelasData) for (const b of k.babs) {
    totalSame += b.verdictCounts.MATCH_FASE_SAMA;
    totalOther += b.verdictCounts.MATCH_FASE_LAIN;
    totalNo += b.verdictCounts.NO_MATCH;
    totalNone += b.verdictCounts.none;
  }
  const totalAudited = totalSame + totalOther + totalNo;

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Audit FINAL ${data.jenjang} — Turo Strict vs CP 046 ASLI</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #f1f5f9; color: #0f172a; font-size: 14px; }
  header.app-header { background: linear-gradient(135deg, #0f766e, #14b8a6); color: white; padding: 18px 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  header.app-header h1 { margin: 0 0 4px 0; font-size: 22px; }
  header.app-header p { margin: 0; opacity: 0.9; font-size: 13px; }
  .ai-stats { display: flex; gap: 12px; margin-top: 8px; font-size: 12px; background: rgba(0,0,0,0.15); padding: 6px 12px; border-radius: 8px; width: fit-content; }
  .stat-no { color: #fee2e2; font-weight: 600; }

  .toolbar { background: white; padding: 12px 24px; border-bottom: 1px solid #e2e8f0; display: flex; gap: 8px; flex-wrap: wrap; position: sticky; top: 0; z-index: 10; align-items: center; }
  .tab-btn { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; }
  .tab-btn.active { background: #0f766e; color: white; border-color: #0f766e; }
  .tab-btn:hover:not(.active) { background: #e2e8f0; }

  .filter-divider { width: 1px; height: 28px; background: #cbd5e1; margin: 0 4px; }
  .filter-group { display: flex; gap: 4px; align-items: center; font-size: 12px; color: #475569; }
  .filter-group label { font-weight: 600; margin-right: 4px; }
  .filter-btn { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; }
  .filter-btn.active { background: #1e40af; color: white; border-color: #1e40af; }

  .export-btn { margin-left: auto; background: #fbbf24; color: #78350f; border: 1px solid #f59e0b; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; }
  .export-btn:hover { background: #f59e0b; color: white; }

  .tab-content { display: none; padding: 16px 24px; }
  .tab-content.active { display: block; }

  .kelas-header { margin-bottom: 16px; }
  .kelas-header h2 { margin: 0; color: #0f172a; }
  .fase-name { color: #64748b; font-weight: normal; font-size: 14px; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 1100px) { .two-col { grid-template-columns: 1fr; } }

  .col { min-width: 0; }
  .col h3 { margin: 0 0 12px 0; font-size: 14px; padding: 8px 12px; border-radius: 8px; background: white; position: sticky; top: 60px; z-index: 5; }
  .col-cp h3 { background: #ecfdf5; color: #065f46; }
  .col-turo h3 { background: #eff6ff; color: #1e40af; }

  .cp-fase-card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 10px; border-left: 4px solid #10b981; }
  .cp-fase-name { font-weight: 700; font-size: 14px; color: #065f46; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #d1fae5; }
  .elemen-block { margin: 8px 0; }
  .elemen-name { font-weight: 600; font-size: 12px; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .elemen-text { font-size: 13px; line-height: 1.5; color: #334155; padding: 8px 10px; background: #f0fdf4; border-radius: 6px; border-left: 2px solid #86efac; }

  .bab-card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 10px; transition: all 0.15s; }
  .turo-card { border-left: 4px solid #3b82f6; }
  .bab-card:hover { border-color: #94a3b8; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .bab-card.marked-untag { background: #fef2f2; border-color: #fca5a5; }
  .bab-card.marked-keep { background: #f0fdf4; border-color: #86efac; }

  .bab-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
  .bab-id { font-family: ui-monospace, monospace; font-size: 11px; background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; }
  .bab-name { font-weight: 600; flex: 1; min-width: 0; }
  .badge { font-size: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 600; text-transform: uppercase; }
  .badge-strict { background: #d1fae5; color: #065f46; }
  .badge-bridge { background: #dbeafe; color: #1e40af; }
  .badge-mixed { background: #fef3c7; color: #78350f; }

  .verdict-summary { display: flex; gap: 6px; margin: 4px 0 8px 0; font-size: 11px; }
  .vs { padding: 3px 8px; border-radius: 12px; font-weight: 600; }
  .vs-same { background: #d1fae5; color: #065f46; }
  .vs-other { background: #fef3c7; color: #78350f; }
  .vs-no { background: #fee2e2; color: #991b1b; }

  .sub-list { margin: 0; padding: 0; list-style: none; font-size: 13px; color: #334155; }
  .sub-item { display: flex; align-items: center; gap: 6px; padding: 4px 6px; margin: 2px 0; border-radius: 4px; cursor: pointer; transition: background 0.1s; }
  .sub-item:hover { background: #f8fafc; }
  .sub-item.hidden { display: none; }
  .verdict-NO_MATCH { background: rgba(254, 226, 226, 0.4); }
  .verdict-MATCH_FASE_LAIN { background: rgba(254, 243, 199, 0.4); }
  .sub-name { flex: 1; }
  .sub-list code { font-size: 10px; background: #f1f5f9; color: #64748b; padding: 1px 4px; border-radius: 3px; }
  .sub-bridge { color: #1e40af; opacity: 0.85; }

  .vbadge { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; font-size: 11px; border-radius: 50%; font-weight: 600; }
  .vbadge-same { background: #d1fae5; color: #065f46; }
  .vbadge-other { background: #fef3c7; color: #78350f; }
  .vbadge-no { background: #fee2e2; color: #991b1b; }
  .vbadge-none { background: #f1f5f9; color: #94a3b8; }

  .actions { margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap; }
  .btn { border: 1px solid; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; background: white; }
  .btn-untag { color: #b91c1c; border-color: #fca5a5; }
  .btn-untag:hover { background: #fee2e2; }
  .btn-untag.active { background: #ef4444; color: white; border-color: #ef4444; }
  .btn-keep { color: #15803d; border-color: #86efac; }
  .btn-keep:hover { background: #dcfce7; }
  .btn-keep.active { background: #16a34a; color: white; border-color: #16a34a; }

  .empty { color: #94a3b8; font-style: italic; padding: 12px; }

  .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; }
  .modal.show { display: flex; }
  .modal-content { background: white; border-radius: 12px; padding: 20px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto; }
  .modal-content h2 { margin-top: 0; }
  .modal-content textarea { width: 100%; min-height: 250px; font-family: ui-monospace, monospace; font-size: 12px; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; }
  .modal-actions { margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end; }
  .modal-actions button { padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; cursor: pointer; background: white; }
  .modal-actions button.primary { background: #0f766e; color: white; border-color: #0f766e; }

  .audit-detail { background: #f8fafc; border-radius: 8px; padding: 12px; margin: 12px 0; font-size: 13px; line-height: 1.5; }
  .audit-detail .field { margin: 6px 0; }
  .audit-detail .label { font-weight: 600; color: #475569; min-width: 110px; display: inline-block; }
  .audit-detail .quote { margin-top: 8px; padding: 8px 10px; background: #ecfdf5; border-left: 3px solid #10b981; font-style: italic; border-radius: 4px; }
  .audit-detail .reasoning { margin-top: 10px; padding: 10px; background: white; border-radius: 6px; border-left: 3px solid #3b82f6; }
  .conf-high { color: #15803d; font-weight: 600; }
  .conf-medium { color: #b45309; font-weight: 600; }
  .conf-low { color: #b91c1c; font-weight: 600; }
</style>
</head>
<body>

<header class="app-header">
  <h1>Audit FINAL ${data.jenjang} — Turo Strict vs CP 046 ASLI</h1>
  <p>Sumber: <code>docs/cp046.txt</code> (BSKAP 046/H/KR/2025) — autoritatif. Klik sub Turo strict untuk lihat reasoning AI + kutipan CP.</p>
  ${totalAudited > 0 ? `
    <div class="ai-stats">
      <span>AI: ${totalAudited}/${totalAudited + totalNone} sub strict</span>
      <span>✓ ${totalSame} (${(totalSame/totalAudited*100).toFixed(0)}%)</span>
      <span>⚠ ${totalOther} (${(totalOther/totalAudited*100).toFixed(0)}%)</span>
      <span class="stat-no">🚨 ${totalNo} (${(totalNo/totalAudited*100).toFixed(0)}%)</span>
    </div>
  ` : ""}
</header>

<div class="toolbar">
  ${kelasNav}
  <div class="filter-divider"></div>
  <div class="filter-group">
    <label>Filter:</label>
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="NO_MATCH">🚨 NO_MATCH</button>
    <button class="filter-btn" data-filter="MATCH_FASE_LAIN">⚠ Fase lain</button>
    <button class="filter-btn" data-filter="MATCH_FASE_SAMA">✓ Same</button>
  </div>
  <button class="export-btn" onclick="showExport()">📋 Export Decisions</button>
</div>

${kelasContent}

<div class="modal" id="detailModal">
  <div class="modal-content">
    <h2 id="detailTitle">Sub-materi Detail</h2>
    <div id="detailBody"></div>
    <div class="modal-actions">
      <button class="primary" onclick="document.getElementById('detailModal').classList.remove('show')">Tutup</button>
    </div>
  </div>
</div>

<div class="modal" id="exportModal">
  <div class="modal-content">
    <h2>Export Decisions</h2>
    <p style="color:#64748b; font-size:13px;">Copy text di bawah → kirim ke Claude untuk apply ke peta-prasyarat.json.</p>
    <textarea id="exportText" readonly></textarea>
    <div class="modal-actions">
      <button onclick="copyExport()">📋 Copy</button>
      <button class="primary" onclick="document.getElementById('exportModal').classList.remove('show')">Tutup</button>
    </div>
  </div>
</div>

<script>
  const decisions = { untag: [], keep: [] };
  let currentFilter = "all";

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.kelas;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.kelas === k));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.kelas === k));
      window.scrollTo(0, 0);
    });
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.sub-item').forEach(item => {
        if (currentFilter === "all") {
          item.classList.remove('hidden');
        } else {
          item.classList.toggle('hidden', item.dataset.verdict !== currentFilter);
        }
      });
    });
  });

  document.querySelectorAll('.sub-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const auditAttr = item.dataset.audit;
      const code = item.querySelector('code')?.textContent ?? '?';
      const name = item.querySelector('.sub-name')?.textContent ?? '?';
      let body = '<p><strong>' + code + '</strong>: ' + name + '</p>';
      if (auditAttr) {
        try {
          const a = JSON.parse(auditAttr);
          const verdictLabel = {
            MATCH_FASE_SAMA: '✓ MATCH FASE SAMA (valid strict)',
            MATCH_FASE_LAIN: '⚠ MATCH FASE LAIN (placement mismatch)',
            NO_MATCH: '🚨 NO MATCH (tidak di CP 046)',
          }[a.verdict] || a.verdict;
          body += '<div class="audit-detail">';
          body += '<div class="field"><span class="label">Verdict:</span> <strong>' + verdictLabel + '</strong></div>';
          if (a._expected_fase) body += '<div class="field"><span class="label">Placement Turo:</span> ' + a._expected_fase + '</div>';
          if (a.matched_fase) body += '<div class="field"><span class="label">CP taruh di:</span> <strong>' + a.matched_fase + '</strong>' + (a.matched_elemen ? ' (elemen ' + a.matched_elemen + ')' : '') + '</div>';
          if (a.confidence) body += '<div class="field"><span class="label">Confidence:</span> <span class="conf-' + a.confidence + '">' + a.confidence.toUpperCase() + '</span></div>';
          if (a.kutipan_cp) body += '<div class="quote">"' + a.kutipan_cp + '"</div>';
          if (a.reasoning) body += '<div class="reasoning"><strong>Alasan:</strong> ' + a.reasoning + '</div>';
          body += '</div>';
        } catch (err) {
          body += '<p style="color: #b91c1c;">Error parsing: ' + err.message + '</p>';
        }
      } else {
        body += '<p style="color: #94a3b8; font-style: italic;">Sub belum diaudit (mungkin bridge / non-strict).</p>';
      }
      document.getElementById('detailTitle').textContent = code;
      document.getElementById('detailBody').innerHTML = body;
      document.getElementById('detailModal').classList.add('show');
    });
  });

  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('show'); });
  });

  document.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const key = btn.dataset.key;
      const card = btn.closest('.bab-card');
      const wasActive = btn.classList.contains('active');

      card.querySelectorAll('button[data-action]').forEach(b => b.classList.remove('active'));
      card.classList.remove('marked-untag', 'marked-keep');
      decisions.untag = decisions.untag.filter(d => d.babKode !== card.dataset.babKode);
      decisions.keep = decisions.keep.filter(d => d.babKode !== card.dataset.babKode);

      if (!wasActive) {
        btn.classList.add('active');
        if (action === 'untag') {
          card.classList.add('marked-untag');
          decisions.untag.push({ key, babKode: card.dataset.babKode });
        } else {
          card.classList.add('marked-keep');
          decisions.keep.push({ key, babKode: card.dataset.babKode });
        }
      }
    });
  });

  function showExport() {
    const out = {
      jenjang: '${data.jenjang}',
      generated: new Date().toISOString(),
      untag_bab_kodes: decisions.untag.map(d => d.babKode),
      keep_strict_bab_kodes: decisions.keep.map(d => d.babKode),
    };
    document.getElementById('exportText').value = JSON.stringify(out, null, 2);
    document.getElementById('exportModal').classList.add('show');
  }

  function copyExport() {
    const ta = document.getElementById('exportText');
    ta.select();
    document.execCommand('copy');
    alert('Copied!');
  }
</script>

</body>
</html>`;
}

const targets = [
  { jenjang: "SD", code: "sd" },
  { jenjang: "SMP", code: "smp" },
  { jenjang: "SMA", code: "sma" },
];

for (const t of targets) {
  const data = buildJenjangData(t.jenjang, t.code);
  const html = buildHtml(data);
  const outPath = resolve(ROOT, `comparison-v3-final-${t.code}.html`);
  writeFileSync(outPath, html, "utf8");
  let auditCount = 0;
  for (const k of data.kelasData) for (const b of k.babs) {
    auditCount += b.verdictCounts.MATCH_FASE_SAMA + b.verdictCounts.MATCH_FASE_LAIN + b.verdictCounts.NO_MATCH;
  }
  console.log(`✓ ${outPath} (${data.kelasData.length} kelas, ${data.totalSub} sub, ${auditCount} audited)`);
}
