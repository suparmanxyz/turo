// Audit Turo strict tagging vs NB authoritative CP 046 taxonomy.
// Output: PROPOSAL-strict-adjustments-{j}.md per jenjang.
//
// Logic:
//   1. Untuk setiap bab Turo strict di kelas X → cek apakah ada bab NB yang match (semantic).
//   2. Kalau MATCH → keep strict.
//   3. Kalau NO MATCH → propose UNTAG (jadi non-strict / Bridge).
//   4. Untuk setiap bab NB di kelas X → cek apakah ada bab Turo (strict OR non-strict) yang cover.
//   5. Kalau NO COVER → propose ADD candidate.
//
// Run: node scripts/notebooklm/audit-strict-tagging.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "out");
const PETA_PATH = resolve(import.meta.dirname, "..", "..", "src/data/peta-prasyarat.json");

const peta = JSON.parse(readFileSync(PETA_PATH, "utf8"));

function loadNbTaxonomy(jenjangCode) {
  return JSON.parse(readFileSync(resolve(ROOT, `reguler-${jenjangCode}-taxonomy.json`), "utf8"));
}

/** Normalisasi nama untuk fuzzy match (lowercase, strip parens, normalize whitespace). */
function normalizeName(s) {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")          // remove parens content
    .replace(/\[[^\]]*\]/g, "")         // remove brackets [Wajib], [Lanjut], etc
    .replace(/[^\w\s&]/g, " ")          // strip non-word
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract significant keywords (length ≥ 4, exclude stopwords). */
const STOPWORDS = new Set(["dan", "atau", "dari", "untuk", "yang", "dengan", "pada", "bilangan", "lain", "lainnya"]);
function keywords(s) {
  return normalizeName(s)
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

/** Apakah dua nama bab match secara semantic (cukup keyword overlap)? */
function babMatch(nameA, nameB) {
  const kwA = keywords(nameA);
  const kwB = keywords(nameB);
  if (kwA.length === 0 || kwB.length === 0) return false;
  // Match kalau >=1 keyword non-trivial overlap
  return kwA.some((w) => kwB.some((wb) => wb.includes(w) || w.includes(wb)));
}

function buildAudit(jenjang, jenjangCode) {
  const tax = loadNbTaxonomy(jenjangCode);
  const turoStrict = peta.submateri.filter((s) => s.jenjang === jenjang && s.strict);
  const turoAll = peta.submateri.filter((s) => s.jenjang === jenjang);

  const lines = [];
  lines.push(`# PROPOSAL: Strict Tagging Adjustments — ${jenjang}\n`);
  lines.push(`Sumber autoritatif: NotebookLM Deep Research CP 046/H/KR/2025`);
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}\n`);
  lines.push(`**Status saat ini:**`);
  lines.push(`- Total ${jenjang} sub: ${turoAll.length} (strict: ${turoStrict.length}, non-strict: ${turoAll.length - turoStrict.length})\n`);

  let totalUntagCandidates = 0;
  let totalAddCandidates = 0;

  for (const k of tax.kelas) {
    const kelasNum = k.kelas;
    const turoStrictK = turoStrict.filter((s) => s.kelas === kelasNum);
    const turoAllK = turoAll.filter((s) => s.kelas === kelasNum);
    const nbBabs = k.bab;

    lines.push(`## Kelas ${kelasNum} (Fase ${k.fase})\n`);
    lines.push(`- NB CP 046 bab: ${nbBabs.length}`);
    lines.push(`- Turo strict sub: ${turoStrictK.length} (dari ${turoAllK.length} total)\n`);

    // === 1. UNTAG candidates: Turo strict bab yang TIDAK match NB ===
    // Group strict sub by bab_kode + bab_nama
    const turoBabMap = new Map();
    for (const s of turoStrictK) {
      const key = `${s.bab_kode}|${s.bab_nama}`;
      if (!turoBabMap.has(key)) turoBabMap.set(key, []);
      turoBabMap.get(key).push(s);
    }

    const untagCandidates = [];
    for (const [babKey, subs] of turoBabMap) {
      const [, babNama] = babKey.split("|");
      const matchInNb = nbBabs.some((nb) => babMatch(nb.nama, babNama));
      if (!matchInNb) {
        untagCandidates.push({ babNama, babKode: subs[0].bab_kode, subs });
      }
    }

    if (untagCandidates.length > 0) {
      lines.push(`### 🔴 UNTAG Candidates (Turo strict yang TIDAK ada di CP 046 NB) — ${untagCandidates.length} bab\n`);
      lines.push(`Action: ubah \`strict: true\` → \`strict: false\` untuk sub-materi di bab ini. Akan otomatis tampil sebagai 🌉 Bridge di mode comprehensive.\n`);
      for (const c of untagCandidates) {
        totalUntagCandidates += c.subs.length;
        lines.push(`- **${c.babKode} ${c.babNama}** (${c.subs.length} sub):`);
        for (const s of c.subs) {
          lines.push(`  - \`${s.kode}\` ${s.nama}`);
        }
      }
      lines.push("");
    } else {
      lines.push(`### 🔴 UNTAG Candidates: NONE — semua bab strict Turo di K${kelasNum} match NB ✓\n`);
    }

    // === 2. ADD candidates: NB bab yang TIDAK ada di Turo (strict OR non-strict) ===
    const turoAllBabSet = new Set(turoAllK.map((s) => s.bab_nama));
    const turoAllBabList = Array.from(turoAllBabSet);
    const addCandidates = nbBabs.filter((nb) => !turoAllBabList.some((tb) => babMatch(nb.nama, tb)));

    if (addCandidates.length > 0) {
      lines.push(`### 🟢 ADD Candidates (NB CP 046 bab yang BELUM ADA di Turo) — ${addCandidates.length} bab\n`);
      lines.push(`Action: pertimbangkan tambah sub-materi baru di peta-prasyarat.json untuk topik ini.\n`);
      for (const nb of addCandidates) {
        totalAddCandidates += nb.sub_bab.length;
        const jalurInfo = nb.jalur ? ` [${nb.jalur}]` : "";
        lines.push(`- **${nb.id} ${nb.nama}**${jalurInfo} (${nb.sub_bab.length} sub-bab NB):`);
        for (const sb of nb.sub_bab.slice(0, 8)) {
          lines.push(`  - ${sb}`);
        }
        if (nb.sub_bab.length > 8) lines.push(`  - + ${nb.sub_bab.length - 8} lainnya`);
      }
      lines.push("");
    } else {
      lines.push(`### 🟢 ADD Candidates: NONE — semua bab NB sudah ada di Turo ✓\n`);
    }
  }

  lines.push(`## Summary\n`);
  lines.push(`| Metric | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Strict sub yang propose UNTAG | ${totalUntagCandidates} |`);
  lines.push(`| Sub-bab NB yang propose ADD | ${totalAddCandidates} |`);
  lines.push(``);
  lines.push(`## Cara apply\n`);
  lines.push(`1. Pak ustadz review proposal di atas (per kelas).`);
  lines.push(`2. Tandai approve/reject per item.`);
  lines.push(`3. Saya jalankan \`apply-strict-adjustments.mjs --untag <kode1,kode2,...>\` untuk batch update.`);
  lines.push(`4. Re-generate index + foundation set + commit.`);
  lines.push(``);
  lines.push(`**Catatan**: matching berbasis keyword overlap (heuristik). Beberapa "UNTAG candidate" mungkin sebenarnya valid CP 046 dengan nama bab beda (e.g. "Aritmetika Sosial" K7 mungkin sub dari "Rasio & Perbandingan" di NB). Manual review penting.`);

  return lines.join("\n");
}

const audits = [
  { jenjang: "SD", code: "sd" },
  { jenjang: "SMP", code: "smp" },
  { jenjang: "SMA", code: "sma" },
];

for (const a of audits) {
  const md = buildAudit(a.jenjang, a.code);
  const outPath = resolve(ROOT, `PROPOSAL-strict-adjustments-${a.code}.md`);
  writeFileSync(outPath, md, "utf8");
  console.log(`✓ ${outPath}`);
}
