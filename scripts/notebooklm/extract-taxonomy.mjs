// Extract structured taxonomy dari NotebookLM report markdown
// Input : reguler-{jenjang}-report.md
// Output: reguler-{jenjang}-taxonomy.json (mirror format reguler-sd-taxonomy.json)
//
// Run: node scripts/notebooklm/extract-taxonomy.mjs smp
//      node scripts/notebooklm/extract-taxonomy.mjs sma

import { readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "out");

const FASE_BY_JENJANG = {
  sd: { jenjangLabel: "SD", elemen: ["Bilangan", "Aljabar", "Pengukuran", "Geometri", "Analisis Data dan Peluang"], faseRange: { 1: "A", 2: "A", 3: "B", 4: "B", 5: "C", 6: "C" } },
  smp: { jenjangLabel: "SMP", elemen: ["Bilangan", "Aljabar", "Pengukuran", "Geometri", "Analisis Data dan Peluang"], faseRange: { 7: "D", 8: "D", 9: "D" } },
  sma: { jenjangLabel: "SMA", elemen: ["Bilangan", "Aljabar dan Fungsi", "Geometri", "Analisis Data dan Peluang"], faseRange: { 10: "E", 11: "F", 12: "F" } },
};

const FOKUS_HINTS = {
  // SMP per kelas
  "smp-7": "Fondasi transisi kognitif: bilangan bulat, pengenalan aljabar, kesebangunan",
  "smp-8": "Relasi & fungsi, Pythagoras, statistika ukuran pemusatan",
  "smp-9": "Sintesis sistem (SPLDV), bangun ruang, transformasi geometri, peluang",
  // SMA per kelas
  "sma-10": "Fase E — fondasi literasi numerasi: eksponen, vektor, trigonometri, statistika",
  "sma-11": "Fase F — spesialisasi: komposisi fungsi, lingkaran, regresi (Wajib) + bilangan kompleks, polinomial, matriks (Lanjut)",
  "sma-12": "Fase F finalisasi: matematika keuangan, kombinatorik, kalkulus (Lanjut)",
};

/**
 * Bersihkan teks dari markdown noise & referensi.
 */
function cleanText(s) {
  return s
    .replace(/<br\s*\/?>/gi, "|") // sentinel pemisah
    .replace(/\*\*/g, "")          // bold markers
    .replace(/\*/g, "")            // italic
    .replace(/\$([^$]+)\$/g, "$1") // strip math delimiters (keep contents)
    .replace(/\[[\d\s,]+\]/g, "")  // [1, 2, 3] references
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pecah string sub-bab → array of sub-bab terbersih.
 *
 * Format yang ditemui:
 *   - SMP: "1. X|2. Y|3. Z" (after <br> → |)
 *   - SMA: "X, Y, Z" atau "1. X, 2. Y, 3. Z"
 */
function parseSubBab(raw) {
  let parts = raw.split("|");
  if (parts.length === 1) {
    // No <br> — split by koma+digit "1." atau koma+kapital
    parts = raw.split(/\s*,\s*(?=\d+\.|\b[A-Z])/);
  }
  return parts
    .map((p) => p.replace(/^\d+\.\s*/, "").replace(/\s*\.\s*$/, "").trim())
    .filter((p) => p.length >= 3 && !/^[.\s…]+$/.test(p));
}

/**
 * Detect kelas dari heading H2/H3.
 * Return { kelas, jalur } atau null.
 */
function detectKelasContext(line) {
  // Pattern primary: "## ... Kelas N" atau "### ... Kelas N (Fase X)"
  const k1 = line.match(/Kelas\s+(\d{1,2})\b/);
  if (!k1) return null;
  const kelas = parseInt(k1[1], 10);
  if (isNaN(kelas) || kelas < 1 || kelas > 12) return null;

  let jalur = null;
  if (/Tingkat Lanjut|Lanjut|Fase F\+/i.test(line)) jalur = "Lanjut";
  else if (/Wajib/i.test(line)) jalur = "Wajib";

  return { kelas, jalur };
}

/**
 * Parse satu tabel di markdown — return array { nama, subBab[], jalur? }
 */
function parseTable(lines, startIdx) {
  // Header row di lines[startIdx]; separator row di lines[startIdx+1]
  const header = lines[startIdx].split("|").map((c) => c.trim()).filter(Boolean);
  const namaIdx = header.findIndex((h) => /Nama Bab|Topik|Materi/i.test(h));
  const subIdx = header.findIndex((h) => /Sub-?bab|Sub-?Bab|Sub Materi/i.test(h));
  const jalurIdx = header.findIndex((h) => /Jalur/i.test(h));

  if (namaIdx < 0 || subIdx < 0) return { rows: [], endIdx: startIdx };

  let i = startIdx + 1;
  // Skip separator row
  if (i < lines.length && /^\|[\s:|-]+\|$/.test(lines[i].trim())) i++;

  const rows = [];
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) break;
    const cols = line.split("|").map((c) => c.trim());
    // Padding: leading | jadi cols[0] = ""
    const cells = cols.slice(1, -1); // strip leading/trailing empty from outer |
    if (cells.length < 2) { i++; continue; }
    const nama = cleanText(cells[namaIdx] ?? "");
    const subRaw = cleanText(cells[subIdx] ?? "");
    if (!nama || nama.length < 3) { i++; continue; }
    const subBab = parseSubBab(subRaw);
    const jalur = jalurIdx >= 0 ? cleanText(cells[jalurIdx] ?? "") || null : null;
    rows.push({ nama, subBab, jalur });
    i++;
  }
  return { rows, endIdx: i };
}

function extractTaxonomy(jenjang) {
  const meta = FASE_BY_JENJANG[jenjang];
  if (!meta) throw new Error(`Unknown jenjang: ${jenjang}`);

  const reportPath = resolve(ROOT, `reguler-${jenjang}-report.md`);
  const report = readFileSync(reportPath, "utf8");
  const lines = report.split("\n");

  const reportSize = statSync(reportPath).size;

  // sources count
  let sourcesCount = 0;
  try {
    const srcs = JSON.parse(readFileSync(resolve(ROOT, `reguler-${jenjang}-sources.json`), "utf8"));
    sourcesCount = srcs.sources?.length ?? srcs.length ?? 0;
  } catch {
    sourcesCount = 0;
  }

  // Track per kelas + jalur
  const kelasMap = new Map(); // kelasNum → { fase, fokus, bab: [] }

  let currentKelas = null;
  let currentJalur = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect heading kelas
    if (trimmed.startsWith("#")) {
      const ctx = detectKelasContext(trimmed);
      if (ctx) {
        currentKelas = ctx.kelas;
        if (ctx.jalur) currentJalur = ctx.jalur;
        else if (jenjang === "smp") currentJalur = null;
        else if (jenjang === "sma" && ctx.kelas === 10) currentJalur = "Wajib"; // K10 default
        else currentJalur = currentJalur ?? "Wajib";
        if (!kelasMap.has(currentKelas)) {
          kelasMap.set(currentKelas, {
            kelas: currentKelas,
            fase: meta.faseRange[currentKelas] ?? "?",
            fokus: FOKUS_HINTS[`${jenjang}-${currentKelas}`] ?? "",
            bab: [],
          });
        }
      }
      continue;
    }

    // Detect tabel header — line starts with | and has "Nama Bab" or "Topik"
    if (currentKelas && trimmed.startsWith("|") && /Nama Bab|Topik|Materi/i.test(trimmed) && /Sub/i.test(trimmed)) {
      const { rows, endIdx } = parseTable(lines, i);
      for (const r of rows) {
        const babCount = kelasMap.get(currentKelas).bab.length + 1;
        const id = `K${currentKelas}.B${babCount}`;
        kelasMap.get(currentKelas).bab.push({
          id,
          nama: r.nama,
          sub_bab: r.subBab,
          ...(r.jalur || currentJalur ? { jalur: r.jalur || currentJalur } : {}),
        });
      }
      i = endIdx - 1;
      continue;
    }
  }

  const kelasArr = Array.from(kelasMap.values()).sort((a, b) => a.kelas - b.kelas);

  return {
    _meta: {
      source: "notebooklm-deep-research",
      model: "Gemini Deep Research (NotebookLM Pro)",
      domain: `reguler-${jenjang}`,
      generated_at: new Date().toISOString().slice(0, 10),
      kurikulum: "BSKAP No. 046/H/KR/2025 — Kurikulum Merdeka",
      regulasi_pengganti: "BSKAP 032/H/KR/2024 (kini tidak berlaku)",
      berlaku_sejak: "16 Juli 2025",
      filosofi: "Deep learning — bukan transfer prosedural, tapi membangun number sense + literasi numerasi + reasoning kritis",
      scope: jenjang === "sd" ? "SD K1-K6 (Fase A: K1-2, Fase B: K3-4, Fase C: K5-6)"
        : jenjang === "smp" ? "SMP K7-K9 (Fase D)"
        : "SMA K10-K12 (Fase E: K10, Fase F: K11-K12 dengan jalur Wajib & Lanjut)",
      report_size_chars: reportSize,
      sources_count: sourcesCount,
      report_file: `reguler-${jenjang}-report.md`,
      sources_file: `reguler-${jenjang}-sources.json`,
      extraction_method: "automated parser (extract-taxonomy.mjs)",
    },
    elemen_cp046: meta.elemen,
    kelas: kelasArr,
  };
}

// Main
const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/notebooklm/extract-taxonomy.mjs {sd|smp|sma}");
  process.exit(1);
}

const tax = extractTaxonomy(target);
const outPath = resolve(ROOT, `reguler-${target}-taxonomy.json`);
writeFileSync(outPath, JSON.stringify(tax, null, 2), "utf8");

console.log(`✓ Saved: ${outPath}`);
console.log(`  Kelas: ${tax.kelas.length}`);
for (const k of tax.kelas) {
  const totalSub = k.bab.reduce((s, b) => s + b.sub_bab.length, 0);
  const jalurInfo = k.bab.some((b) => b.jalur) ? ` [${[...new Set(k.bab.map((b) => b.jalur).filter(Boolean))].join("/")}]` : "";
  console.log(`  K${k.kelas} (Fase ${k.fase}): ${k.bab.length} bab · ${totalSub} sub-bab${jalurInfo}`);
}
