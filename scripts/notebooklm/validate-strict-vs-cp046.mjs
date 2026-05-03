// Validasi peta turo (strict=true) vs claude-direct CP 046 taxonomy.
// Output: COMPARISON-strict-vs-cp046.md per jenjang dengan
//   - Coverage stats
//   - Bab di CP 046 standar tapi tidak ada di peta turo
//   - Bab di peta turo strict tapi tidak match CP 046

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "out");
const PETA_PATH = resolve(import.meta.dirname, "..", "..", "src/data/peta-prasyarat.json");

const peta = JSON.parse(readFileSync(PETA_PATH, "utf8"));

function loadTaxonomy(domain) {
  return JSON.parse(readFileSync(resolve(ROOT, `${domain}-taxonomy.claude-direct.json`), "utf8"));
}

const taxoSD = loadTaxonomy("reguler-sd");
const taxoSMP = loadTaxonomy("reguler-smp");
const taxoSMA = loadTaxonomy("reguler-sma");

// Extract sub-materi strict=true dari peta turo per jenjang
const strictPerJenjang = {
  SD: peta.submateri.filter((s) => s.jenjang === "SD" && s.strict),
  SMP: peta.submateri.filter((s) => s.jenjang === "SMP" && s.strict),
  SMA: peta.submateri.filter((s) => s.jenjang === "SMA" && s.strict),
};

function summarizeJenjang(jenjang, taxo, strictSubs) {
  const lines = [];
  lines.push(`# Comparison: Peta Turo Strict CP 046 vs Claude-Direct CP 046 — ${jenjang}\n`);
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}\n`);

  // Stats
  const totalCpBab = taxo.kelas.reduce((acc, k) => acc + k.bab.length, 0);
  const totalCpSubBab = taxo.kelas.reduce((acc, k) => acc + k.bab.reduce((a, b) => a + b.sub_bab.length, 0), 0);
  const totalTuroStrict = strictSubs.length;
  const turoBabUnik = new Set(strictSubs.map((s) => s.bab_kode));

  lines.push(`## Statistik\n`);
  lines.push(`| Source | Jumlah Bab | Jumlah Sub |`);
  lines.push(`|---|---|---|`);
  lines.push(`| Claude-direct CP 046 | ${totalCpBab} | ${totalCpSubBab} |`);
  lines.push(`| Peta Turo (strict=true) | ${turoBabUnik.size} bab unik | ${totalTuroStrict} sub-materi |\n`);

  // Per kelas breakdown
  lines.push(`## Per Kelas Breakdown\n`);
  lines.push(`| Kelas | CP Bab | CP Sub | Turo Strict Sub |`);
  lines.push(`|---|---|---|---|`);
  for (const k of taxo.kelas) {
    const cpBab = k.bab.length;
    const cpSub = k.bab.reduce((a, b) => a + b.sub_bab.length, 0);
    const turoSub = strictSubs.filter((s) => s.kelas === k.kelas).length;
    lines.push(`| K${k.kelas} | ${cpBab} | ${cpSub} | ${turoSub} |`);
  }
  lines.push("");

  // Bab di CP yang potentially tidak ter-cover di Turo (heuristik: nama bab match by keyword)
  lines.push(`## Bab CP 046 — Status di Peta Turo\n`);
  lines.push(`Heuristik: cari sub-materi di peta turo yang nama_nya mengandung kata kunci nama bab CP.\n`);

  for (const k of taxo.kelas) {
    lines.push(`### Kelas ${k.kelas}\n`);
    for (const bab of k.bab) {
      // Extract kata kunci utama dari nama bab (skip kata umum)
      const stopWords = new Set(["dan", "di", "atau", "yang", "dengan", "untuk", "dari", "sampai", "ke", "lanjut", "lanjutan", "dasar", "pengenalan"]);
      const keywords = bab.nama.toLowerCase().split(/[\s,&-]+/).filter((w) => w.length >= 4 && !stopWords.has(w));

      // Cari sub turo K{kelas} yang match keyword
      const turoKelasSubs = strictSubs.filter((s) => s.kelas === k.kelas);
      const matched = turoKelasSubs.filter((s) => {
        const subNamaLower = (s.nama + " " + s.bab_nama).toLowerCase();
        return keywords.some((kw) => subNamaLower.includes(kw));
      });

      const status = matched.length > 0 ? `✅ Cover (${matched.length} sub match)` : `❌ MISS — tidak ada sub match`;
      lines.push(`- **${bab.nama}** — ${status}`);
      if (matched.length > 0 && matched.length <= 3) {
        for (const m of matched) {
          lines.push(`  - \`${m.kode}\` ${m.nama}`);
        }
      } else if (matched.length === 0) {
        lines.push(`  - Sub-bab CP yang dimaksud: ${bab.sub_bab.slice(0, 3).map((sb) => `_${sb}_`).join(", ")}${bab.sub_bab.length > 3 ? "..." : ""}`);
      }
    }
    lines.push("");
  }

  // Sub Turo strict yang berpotensi extra (tidak nyambung CP)
  lines.push(`## Sub Turo Strict — Sample Extras (verifikasi)\n`);
  lines.push(`Sample 10 sub di peta turo (strict=true) untuk cross-check apakah memang CP 046:\n`);
  const sample = strictSubs.slice(0, 10);
  for (const s of sample) {
    lines.push(`- \`${s.kode}\` (K${s.kelas}) ${s.nama}`);
  }
  lines.push("");

  return lines.join("\n");
}

const sdMd = summarizeJenjang("SD", taxoSD, strictPerJenjang.SD);
const smpMd = summarizeJenjang("SMP", taxoSMP, strictPerJenjang.SMP);
const smaMd = summarizeJenjang("SMA", taxoSMA, strictPerJenjang.SMA);

writeFileSync(resolve(ROOT, "COMPARISON-strict-vs-cp046-sd.md"), sdMd);
writeFileSync(resolve(ROOT, "COMPARISON-strict-vs-cp046-smp.md"), smpMd);
writeFileSync(resolve(ROOT, "COMPARISON-strict-vs-cp046-sma.md"), smaMd);

console.log("✓ 3 comparison files saved:");
console.log("  COMPARISON-strict-vs-cp046-sd.md");
console.log("  COMPARISON-strict-vs-cp046-smp.md");
console.log("  COMPARISON-strict-vs-cp046-sma.md");
console.log("");
console.log("Strict count per jenjang:");
console.log(`  SD: ${strictPerJenjang.SD.length} sub`);
console.log(`  SMP: ${strictPerJenjang.SMP.length} sub`);
console.log(`  SMA: ${strictPerJenjang.SMA.length} sub`);
