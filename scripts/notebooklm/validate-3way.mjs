// 3-way validation: NB report + Claude-direct + Peta Turo strict per jenjang.
// Output: COMPARISON-3way-{sd,smp,sma}.md

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "out");
const PETA_PATH = resolve(import.meta.dirname, "..", "..", "src/data/peta-prasyarat.json");

const peta = JSON.parse(readFileSync(PETA_PATH, "utf8"));

/**
 * Parse NB report markdown — ekstrak bab per kelas dari heading H3/H4 + tabel.
 * Cari pattern:
 *   ### Materi Matematika Kelas N: ...
 *   | Nama Bab / Topik Utama | Sub-Bab ... |
 *   | Bab1 | sub1; sub2 |
 */
function parseNbReport(reportPath) {
  const content = readFileSync(reportPath, "utf8");
  const lines = content.split("\n");

  const result = { kelas: new Map() }; // kelasNum → [bab names]
  let currentKelas = null;
  let inTable = false;
  let pastHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect kelas heading (### Materi Matematika Kelas N atau ## Kelas N)
    const kelasMatch = line.match(/^#+\s.*Kelas\s+(\d+|VIII|IX|X|XI|XII|VII|I|II|III|IV|V|VI)/i);
    if (kelasMatch) {
      const raw = kelasMatch[1];
      const romanMap = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };
      const k = isNaN(parseInt(raw, 10)) ? romanMap[raw.toUpperCase()] : parseInt(raw, 10);
      if (k && k >= 1 && k <= 12) {
        currentKelas = k;
        if (!result.kelas.has(k)) result.kelas.set(k, []);
      }
      inTable = false;
      pastHeader = false;
      continue;
    }

    // Detect table start (header row dengan "Bab" / "Topik" / "Materi")
    if (currentKelas && line.startsWith("|") && /Nama Bab|Topik Utama|Materi/i.test(line)) {
      inTable = true;
      pastHeader = false;
      continue;
    }

    // Skip separator row (|---|---|)
    if (inTable && /^\|[\s:|-]+\|$/.test(line)) {
      pastHeader = true;
      continue;
    }

    // Parse bab row dari tabel (kolom 1 = nama bab)
    if (inTable && pastHeader && line.startsWith("|")) {
      const cols = line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
      if (cols.length >= 1) {
        // Bersihkan kolom 1 dari markdown bold/italic
        let babName = cols[0].replace(/^\*+|\*+$/g, "").trim();
        // Skip kalau kosong atau cuma "..." atau emoji
        if (babName && !/^[.…\s]+$/.test(babName) && babName.length > 3) {
          result.kelas.get(currentKelas).push(babName);
        }
      }
      continue;
    }

    // Exit table kalau line bukan |...|
    if (inTable && !line.startsWith("|") && line.length > 0) {
      inTable = false;
    }
  }

  return result;
}

function loadJson(file) {
  return JSON.parse(readFileSync(resolve(ROOT, file), "utf8"));
}

function buildComparison(jenjang, jenjangCode) {
  const nbParsed = parseNbReport(resolve(ROOT, `reguler-${jenjangCode}-report.md`));
  const claudeDirect = loadJson(`reguler-${jenjangCode}-taxonomy.claude-direct.json`);
  const turoStrict = peta.submateri.filter((s) => s.jenjang === jenjang && s.strict);

  const lines = [];
  lines.push(`# 3-Way Comparison: ${jenjang} CP 046\n`);
  lines.push(`Source: NotebookLM Deep Research vs Claude-direct vs Peta Turo (strict=true)`);
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}\n`);

  // Stats overview
  const turoBabUnik = new Set(turoStrict.map((s) => s.bab_kode));
  const totalCdBab = claudeDirect.kelas.reduce((acc, k) => acc + k.bab.length, 0);
  const totalCdSub = claudeDirect.kelas.reduce((acc, k) => acc + k.bab.reduce((a, b) => a + b.sub_bab.length, 0), 0);
  const totalNbBab = Array.from(nbParsed.kelas.values()).reduce((acc, arr) => acc + arr.length, 0);

  lines.push(`## Overview\n`);
  lines.push(`| Source | Bab | Sub | Coverage |`);
  lines.push(`|---|---|---|---|`);
  lines.push(`| **NotebookLM Deep Research** | ${totalNbBab} | (semantic in markdown) | 100% (authoritative) |`);
  lines.push(`| **Claude-direct** | ${totalCdBab} | ${totalCdSub} | Coverage broad, struktural |`);
  lines.push(`| **Peta Turo strict=true** | ${turoBabUnik.size} unik | ${turoStrict.length} sub | granular per node |\n`);

  // Per kelas comparison
  lines.push(`## Per Kelas Comparison\n`);
  for (const cdKelas of claudeDirect.kelas) {
    const k = cdKelas.kelas;
    const nbBabs = nbParsed.kelas.get(k) ?? [];
    const cdBabs = cdKelas.bab.map((b) => b.nama);
    const turoSubs = turoStrict.filter((s) => s.kelas === k);
    const turoBabsUnik = new Set(turoSubs.map((s) => `${s.bab_kode} ${s.bab_nama}`));

    lines.push(`### Kelas ${k} (Fase ${cdKelas.fase ?? "-"})\n`);
    lines.push(`| # | NotebookLM (${nbBabs.length}) | Claude-direct (${cdBabs.length}) | Peta Turo strict (${turoBabsUnik.size} bab, ${turoSubs.length} sub) |`);
    lines.push(`|---|---|---|---|`);
    const maxRows = Math.max(nbBabs.length, cdBabs.length, turoBabsUnik.size, 5);
    const turoBabList = Array.from(turoBabsUnik);
    for (let i = 0; i < maxRows; i++) {
      const nb = nbBabs[i] ?? "";
      const cd = cdBabs[i] ?? "";
      const turo = turoBabList[i] ?? "";
      lines.push(`| ${i + 1} | ${nb} | ${cd} | ${turo} |`);
    }
    lines.push("");

    // Cross-validation: bab di Claude-direct yang TIDAK ada di NB (potential gap)
    const nbLower = nbBabs.map((b) => b.toLowerCase());
    const cdGapsFromNb = cdBabs.filter((cd) => {
      const cdLower = cd.toLowerCase();
      // Match kalau ada keyword overlap
      const cdKeywords = cdLower.split(/[\s,&-]+/).filter((w) => w.length >= 4);
      return !nbBabs.some((nb) => {
        const nbLowerStr = nb.toLowerCase();
        return cdKeywords.some((kw) => nbLowerStr.includes(kw));
      });
    });
    if (cdGapsFromNb.length > 0) {
      lines.push(`**⚠ Bab Claude-direct yang BELUM match di NB**: ${cdGapsFromNb.join(", ")}`);
      lines.push("");
    }

    // Bab di NB yang TIDAK ada di Claude-direct (potential addition)
    const cdLower = cdBabs.map((b) => b.toLowerCase());
    const nbGapsFromCd = nbBabs.filter((nb) => {
      const nbLowerStr = nb.toLowerCase();
      const nbKeywords = nbLowerStr.split(/[\s,&-]+/).filter((w) => w.length >= 4);
      return !cdBabs.some((cd) => {
        const cdLowerStr = cd.toLowerCase();
        return nbKeywords.some((kw) => cdLowerStr.includes(kw));
      });
    });
    if (nbGapsFromCd.length > 0) {
      lines.push(`**⚠ Bab NB yang BELUM match di Claude-direct**: ${nbGapsFromCd.join(", ")}`);
      lines.push("");
    }
  }

  // Summary recommendation
  lines.push(`## Summary & Recommendation\n`);
  lines.push(`**Validation strategy untuk peta turo (strict=true ${jenjang}):**`);
  lines.push(`1. Untuk setiap bab di NB report (authoritative CP 046), cek apakah ada sub-materi di peta turo yang cover.`);
  lines.push(`2. Bab di NB yang **tidak punya match** di peta turo → potential ADD ke peta-prasyarat.json`);
  lines.push(`3. Sub di peta turo dengan strict=true yang **tidak match nama bab NB** → review tagging strict (mungkin perlu di-untag)`);
  lines.push(``);
  lines.push(`**Bab Tagging Status:**`);
  lines.push(`- 🟢 NB ∩ Claude-direct ∩ Turo = mature, sudah di-cover dengan baik`);
  lines.push(`- 🟡 NB ∩ Claude-direct (tapi tidak di Turo) = ADD candidate untuk peta-prasyarat.json`);
  lines.push(`- 🟠 NB tapi tidak di Claude-direct = NEW concept di CP 046/2025 yang Claude miss (typically konsep baru di kurikulum)`);
  lines.push(`- 🔴 Hanya di Turo strict (tidak di NB/CD) = Review tagging strict (mungkin extras)`);
  lines.push(``);
  lines.push(`**Next action**: Manual review COMPARISON file ini → adjust peta-prasyarat.json strict tagging + add missing sub-materi.`);

  return lines.join("\n");
}

const sdMd = buildComparison("SD", "sd");
const smpMd = buildComparison("SMP", "smp");
const smaMd = buildComparison("SMA", "sma");

writeFileSync(resolve(ROOT, "COMPARISON-3way-sd.md"), sdMd);
writeFileSync(resolve(ROOT, "COMPARISON-3way-smp.md"), smpMd);
writeFileSync(resolve(ROOT, "COMPARISON-3way-sma.md"), smaMd);

console.log("✓ Saved 3 comparison files:");
console.log("  COMPARISON-3way-sd.md");
console.log("  COMPARISON-3way-smp.md");
console.log("  COMPARISON-3way-sma.md");
