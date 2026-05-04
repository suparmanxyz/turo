// Build HTML side-by-side comparison viewer per jenjang.
// Output: comparison-{sd,smp,sma}.html — interactive, dapat di-buka di browser.
//
// Features:
//   - 3 kolom: NB CP 046 (authoritative) | Turo (strict + non-strict) | Claude-direct
//   - Per kelas tab
//   - Toggle approve/reject per bab Turo (untuk planning UNTAG/KEEP)
//   - Toggle add per bab NB yang missing (untuk planning ADD)
//   - Export decisions sebagai JSON di akhir (clipboard copy)
//
// Run: node scripts/notebooklm/build-comparison-html.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "out");
const PETA_PATH = resolve(import.meta.dirname, "..", "..", "src/data/peta-prasyarat.json");

const peta = JSON.parse(readFileSync(PETA_PATH, "utf8"));

function loadJson(file) {
  return JSON.parse(readFileSync(resolve(ROOT, file), "utf8"));
}

function safeText(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildJenjangData(jenjang, code) {
  const nb = loadJson(`reguler-${code}-taxonomy.json`);
  const cd = loadJson(`reguler-${code}-taxonomy.claude-direct.json`);
  const turoSubs = peta.submateri.filter((s) => s.jenjang === jenjang);

  // Group Turo per kelas + bab
  const turoByKelas = new Map();
  for (const s of turoSubs) {
    if (!turoByKelas.has(s.kelas)) turoByKelas.set(s.kelas, new Map());
    const babMap = turoByKelas.get(s.kelas);
    const babKey = `${s.bab_kode}|${s.bab_nama}`;
    if (!babMap.has(babKey)) babMap.set(babKey, []);
    babMap.get(babKey).push(s);
  }

  const kelasList = [];
  for (const k of nb.kelas) {
    const turoBabs = Array.from(turoByKelas.get(k.kelas) ?? new Map()).map(([key, subs]) => {
      const [babKode, babNama] = key.split("|");
      const allStrict = subs.every((s) => s.strict);
      const someStrict = subs.some((s) => s.strict);
      const status = allStrict ? "strict" : someStrict ? "mixed" : "non-strict";
      return { babKode, babNama, subs, status };
    }).sort((a, b) => a.babKode.localeCompare(b.babKode, undefined, { numeric: true }));

    const cdKelas = cd.kelas.find((c) => c.kelas === k.kelas);
    kelasList.push({
      kelas: k.kelas,
      fase: k.fase,
      fokus: k.fokus,
      nbBab: k.bab,
      turoBab: turoBabs,
      cdBab: cdKelas?.bab ?? [],
    });
  }

  return { jenjang, code, kelas: kelasList, totalSub: turoSubs.length };
}

function renderKelas(kelas) {
  const nbCol = kelas.nbBab.map((b, i) => {
    const jalurBadge = b.jalur ? `<span class="badge badge-jalur">${safeText(b.jalur)}</span>` : "";
    const subList = b.sub_bab.map((s) => `<li>${safeText(s)}</li>`).join("");
    return `
      <div class="bab-card nb-card" data-bab-id="${b.id}">
        <div class="bab-header">
          <span class="bab-id">${safeText(b.id)}</span>
          <span class="bab-name">${safeText(b.nama)}</span>
          ${jalurBadge}
        </div>
        <ul class="sub-list">${subList}</ul>
        <div class="actions">
          <button class="btn btn-add" data-action="add" data-key="add:${b.id}">➕ ADD ke Turo</button>
        </div>
      </div>`;
  }).join("");

  const turoCol = kelas.turoBab.map((b) => {
    const subList = b.subs.map((s) => `
      <li class="sub-${s.strict ? 'strict' : 'bridge'}">
        <code>${safeText(s.kode)}</code> ${safeText(s.nama)}
      </li>
    `).join("");
    const statusBadge = b.status === "strict" ? '<span class="badge badge-strict">All Strict</span>' :
                       b.status === "mixed" ? '<span class="badge badge-mixed">Mixed</span>' :
                       '<span class="badge badge-bridge">Bridge</span>';
    return `
      <div class="bab-card turo-card" data-bab-kode="${b.babKode}">
        <div class="bab-header">
          <span class="bab-id">${safeText(b.babKode)}</span>
          <span class="bab-name">${safeText(b.babNama)}</span>
          ${statusBadge}
        </div>
        <ul class="sub-list">${subList}</ul>
        ${b.status !== "non-strict" ? `
          <div class="actions">
            <button class="btn btn-untag" data-action="untag" data-key="untag:${b.babKode}">🌉 UNTAG → Bridge</button>
            <button class="btn btn-keep" data-action="keep" data-key="keep:${b.babKode}">✓ KEEP Strict</button>
          </div>
        ` : ''}
      </div>`;
  }).join("");

  const cdCol = kelas.cdBab.map((b) => {
    const subList = (b.sub_bab ?? []).map((s) => `<li>${safeText(s)}</li>`).join("");
    return `
      <div class="bab-card cd-card">
        <div class="bab-header">
          <span class="bab-id">${safeText(b.id)}</span>
          <span class="bab-name">${safeText(b.nama)}</span>
        </div>
        <ul class="sub-list">${subList}</ul>
      </div>`;
  }).join("");

  return `
    <section class="kelas-section" data-kelas="${kelas.kelas}">
      <header class="kelas-header">
        <h2>Kelas ${kelas.kelas} <span class="fase">(Fase ${kelas.fase})</span></h2>
        <p class="fokus">${safeText(kelas.fokus || '')}</p>
        <div class="counts">
          <span>NB: ${kelas.nbBab.length} bab</span>
          <span>Turo: ${kelas.turoBab.length} bab</span>
          <span>Claude-direct: ${kelas.cdBab.length} bab</span>
        </div>
      </header>

      <div class="three-col">
        <div class="col col-nb">
          <h3>📘 NotebookLM CP 046 (autoritatif)</h3>
          ${nbCol || '<p class="empty">Tidak ada data</p>'}
        </div>
        <div class="col col-turo">
          <h3>🎯 Peta Turo (current)</h3>
          ${turoCol || '<p class="empty">Tidak ada data</p>'}
        </div>
        <div class="col col-cd">
          <h3>🤖 Claude-direct (referensi)</h3>
          ${cdCol || '<p class="empty">Tidak ada data</p>'}
        </div>
      </div>
    </section>`;
}

function buildHtml(data) {
  const kelasNav = data.kelas.map((k, i) => `
    <button class="tab-btn ${i === 0 ? 'active' : ''}" data-kelas="${k.kelas}">K${k.kelas}</button>
  `).join("");

  const kelasContent = data.kelas.map((k, i) => `
    <div class="tab-content ${i === 0 ? 'active' : ''}" data-kelas="${k.kelas}">
      ${renderKelas(k)}
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Comparison ${data.jenjang} — Strict Tagging Audit</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    margin: 0;
    background: #f1f5f9;
    color: #0f172a;
    font-size: 14px;
  }
  header.app-header {
    background: linear-gradient(135deg, #0f766e, #14b8a6);
    color: white;
    padding: 20px 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  header.app-header h1 {
    margin: 0 0 4px 0;
    font-size: 24px;
  }
  header.app-header p {
    margin: 0;
    opacity: 0.9;
    font-size: 13px;
  }
  .toolbar {
    background: white;
    padding: 12px 24px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .tab-btn {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
  }
  .tab-btn.active {
    background: #0f766e;
    color: white;
    border-color: #0f766e;
  }
  .tab-btn:hover:not(.active) {
    background: #e2e8f0;
  }
  .export-btn {
    margin-left: auto;
    background: #fbbf24;
    color: #78350f;
    border: 1px solid #f59e0b;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
  }
  .export-btn:hover { background: #f59e0b; color: white; }

  .tab-content { display: none; padding: 16px 24px; }
  .tab-content.active { display: block; }

  .kelas-header {
    margin-bottom: 16px;
  }
  .kelas-header h2 {
    margin: 0 0 4px 0;
    color: #0f172a;
  }
  .fase { color: #64748b; font-weight: normal; font-size: 16px; }
  .fokus { color: #64748b; margin: 4px 0; font-size: 13px; }
  .counts {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #475569;
    margin-top: 8px;
  }
  .counts span {
    background: #e0f2fe;
    padding: 4px 10px;
    border-radius: 4px;
  }

  .three-col {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
  }
  @media (max-width: 1100px) {
    .three-col { grid-template-columns: 1fr; }
  }

  .col {
    min-width: 0;
  }
  .col h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 8px;
    background: white;
    position: sticky;
    top: 60px;
    z-index: 5;
  }
  .col-nb h3 { background: #ecfdf5; color: #065f46; }
  .col-turo h3 { background: #eff6ff; color: #1e40af; }
  .col-cd h3 { background: #fef3c7; color: #78350f; }

  .bab-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 10px;
    transition: all 0.15s;
  }
  .bab-card:hover {
    border-color: #94a3b8;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .nb-card { border-left: 4px solid #10b981; }
  .turo-card { border-left: 4px solid #3b82f6; }
  .cd-card { border-left: 4px solid #f59e0b; }

  .bab-card.marked-untag { background: #fef2f2; border-color: #fca5a5; }
  .bab-card.marked-keep { background: #f0fdf4; border-color: #86efac; }
  .bab-card.marked-add { background: #fef3c7; border-color: #fbbf24; }

  .bab-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }
  .bab-id {
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 11px;
    background: #f1f5f9;
    color: #475569;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .bab-name {
    font-weight: 600;
    flex: 1;
    min-width: 0;
  }
  .badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .badge-jalur { background: #ddd6fe; color: #5b21b6; }
  .badge-strict { background: #d1fae5; color: #065f46; }
  .badge-bridge { background: #dbeafe; color: #1e40af; }
  .badge-mixed { background: #fef3c7; color: #78350f; }

  .sub-list {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
    color: #334155;
  }
  .sub-list li { margin-bottom: 3px; }
  .sub-list code {
    font-size: 10px;
    background: #f1f5f9;
    color: #64748b;
    padding: 1px 4px;
    border-radius: 3px;
    margin-right: 4px;
  }
  .sub-strict { }
  .sub-bridge { color: #1e40af; opacity: 0.85; }

  .actions {
    margin-top: 10px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .btn {
    border: 1px solid;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    background: white;
  }
  .btn-untag { color: #b91c1c; border-color: #fca5a5; }
  .btn-untag:hover { background: #fee2e2; }
  .btn-untag.active { background: #ef4444; color: white; border-color: #ef4444; }
  .btn-keep { color: #15803d; border-color: #86efac; }
  .btn-keep:hover { background: #dcfce7; }
  .btn-keep.active { background: #16a34a; color: white; border-color: #16a34a; }
  .btn-add { color: #b45309; border-color: #fbbf24; }
  .btn-add:hover { background: #fef3c7; }
  .btn-add.active { background: #f59e0b; color: white; border-color: #f59e0b; }

  .empty { color: #94a3b8; font-style: italic; padding: 12px; }

  /* Export modal */
  .modal {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 100;
    align-items: center;
    justify-content: center;
  }
  .modal.show { display: flex; }
  .modal-content {
    background: white;
    border-radius: 12px;
    padding: 20px;
    max-width: 700px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }
  .modal-content h2 { margin-top: 0; }
  .modal-content textarea {
    width: 100%;
    min-height: 250px;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    padding: 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
  }
  .modal-actions { margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end; }
  .modal-actions button {
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    cursor: pointer;
    background: white;
  }
  .modal-actions button.primary { background: #0f766e; color: white; border-color: #0f766e; }
</style>
</head>
<body>

<header class="app-header">
  <h1>Comparison ${data.jenjang} — Strict Tagging Audit</h1>
  <p>NB CP 046/2025 (autoritatif) vs Peta Turo (${data.totalSub} sub) vs Claude-direct (referensi). Tandai keputusan UNTAG/KEEP/ADD lalu export.</p>
</header>

<div class="toolbar">
  ${kelasNav}
  <button class="export-btn" onclick="showExport()">📋 Export Decisions</button>
</div>

${kelasContent}

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
  const decisions = { untag: [], keep: [], add: [] };

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.kelas;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.kelas === k));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.kelas === k));
      window.scrollTo(0, 0);
    });
  });

  // Action button toggling
  document.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const key = btn.dataset.key;
      const card = btn.closest('.bab-card');
      const wasActive = btn.classList.contains('active');

      // Untuk turo card: untag & keep mutually exclusive
      if (action === 'untag' || action === 'keep') {
        card.querySelectorAll('button[data-action="untag"], button[data-action="keep"]').forEach(b => b.classList.remove('active'));
        card.classList.remove('marked-untag', 'marked-keep');
        // Remove from arrays
        decisions.untag = decisions.untag.filter(d => d.key !== key.replace(/^(untag|keep):/, 'untag:').replace(/^keep:/, 'untag:'));
        decisions.keep = decisions.keep.filter(d => d.key !== key.replace(/^(untag|keep):/, 'keep:'));
      }

      if (!wasActive) {
        btn.classList.add('active');
        if (action === 'untag') {
          card.classList.add('marked-untag');
          decisions.untag.push({ key, babKode: card.dataset.babKode });
        } else if (action === 'keep') {
          card.classList.add('marked-keep');
          decisions.keep.push({ key, babKode: card.dataset.babKode });
        } else if (action === 'add') {
          card.classList.add('marked-add');
          decisions.add.push({ key, babId: card.dataset.babId });
        }
      } else if (action === 'add') {
        card.classList.remove('marked-add');
        decisions.add = decisions.add.filter(d => d.key !== key);
      }

      updateExport();
    });
  });

  function updateExport() {
    const out = {
      jenjang: '${data.jenjang}',
      generated: new Date().toISOString(),
      untag_bab_kodes: decisions.untag.map(d => d.babKode),
      keep_strict_bab_kodes: decisions.keep.map(d => d.babKode),
      add_nb_bab_ids: decisions.add.map(d => d.babId),
    };
    document.getElementById('exportText').value = JSON.stringify(out, null, 2);
  }

  function showExport() {
    updateExport();
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
  const outPath = resolve(ROOT, `comparison-${t.code}.html`);
  writeFileSync(outPath, html, "utf8");
  console.log(`✓ ${outPath} (${data.kelas.length} kelas, ${data.totalSub} sub Turo)`);
}
