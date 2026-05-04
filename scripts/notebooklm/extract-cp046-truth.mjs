// Track 1: Extract CP 046 Matematika ASLI dari docs/cp046.txt → cp046-truth.json
//
// Source primer: Lampiran II BSKAP No. 046/H/KR/2025
// Section IV.1 (Matematika Reguler) + IV.2 (Matematika Tingkat Lanjut)
//
// Output: scripts/notebooklm/out/cp046-truth.json
// Struktur: per Fase (A-F) + Lanjut, per elemen, raw text + extracted topics
//
// Run: node scripts/notebooklm/extract-cp046-truth.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "out");
const SRC_PATH = resolve(import.meta.dirname, "..", "..", "docs", "cp046.txt");

const fullText = readFileSync(SRC_PATH, "utf-8");
const lines = fullText.split("\n");

// ============================================================
// Slice ke section IV.1 Matematika Reguler (line 4316-4854)
// dan IV.2 Matematika Tingkat Lanjut (line 4855-5048)
// ============================================================
const matReg = lines.slice(4508, 4854).join("\n"); // 1. Fase A → end of 6.4
const matLanjut = lines.slice(5034, 5048).join("\n"); // Fase F TL header
// CP TL detail di line 5039-5095
const matLanjutDetail = lines.slice(5038, 5095).join("\n");

// ============================================================
// Hardcoded structure parser — manual extract per Fase per elemen
// karena teks CP semi-structured (numbered "X.Y. Elemen" headings).
// ============================================================

function normalizeText(text) {
  return text
    .replace(/\n\s+/g, " ")        // unwrap PDF line breaks
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract per-elemen text dari Fase block.
 *  Supports two patterns:
 *    A. "X.Y. Elemen" (untuk Matematika Reguler — "4.1. Bilangan", "4.2. Aljabar"...)
 *    B. "Y. Elemen" (untuk Matematika Tingkat Lanjut — "1. Aljabar dan Fungsi", "2. Geometri"...)
 */
function extractElemenFromFase(faseText, elemenList, simpleNumbering = false) {
  const result = {};
  for (let i = 0; i < elemenList.length; i++) {
    const elemen = elemenList[i];
    const next = elemenList[i + 1];
    // Pattern depending on numbering style
    const startPattern = simpleNumbering
      ? new RegExp(`(?:^|\\n)\\s*${i + 1}\\.\\s*${elemen.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i")
      : new RegExp(`\\d+\\.${i + 1}\\.\\s*${elemen.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    const startMatch = faseText.match(startPattern);
    if (!startMatch) {
      result[elemen] = { raw: "", topics: [] };
      continue;
    }
    const startIdx = startMatch.index + startMatch[0].length;
    let endIdx = faseText.length;
    if (next) {
      const endPattern = simpleNumbering
        ? new RegExp(`(?:^|\\n)\\s*${i + 2}\\.\\s*${next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i")
        : new RegExp(`\\d+\\.${i + 2}\\.\\s*${next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
      const endMatch = faseText.match(endPattern);
      if (endMatch) endIdx = endMatch.index;
    } else {
      // Last elemen: stop at next Fase header / end of section
      const nextFase = faseText.slice(startIdx).match(/\d+\.\s*Fase\s+[A-F]\s*\(|^V\.\d+\./m);
      if (nextFase) endIdx = startIdx + nextFase.index;
    }
    const raw = normalizeText(faseText.slice(startIdx, endIdx));
    result[elemen] = { raw, topics: [] };
  }
  return result;
}

// ============================================================
// Parse per Fase Matematika Reguler
// ============================================================

const ELEMEN_REG = ["Bilangan", "Aljabar", "Pengukuran", "Geometri", "Analisis Data dan Peluang"];
const ELEMEN_REG_SMA = ["Bilangan", "Aljabar dan Fungsi", "Geometri", "Analisis Data dan Peluang"]; // E & F

function parseFase(faseLetter, kelas, faseText, elemenList) {
  const elemen = extractElemenFromFase(faseText, elemenList);
  return { fase: faseLetter, kelas, elemen };
}

// Split matReg by Fase markers
function splitByFase(text) {
  const fasePattern = /(\d+)\.\s*Fase\s+([A-F])\s*\(/g;
  const matches = [...text.matchAll(fasePattern)];
  const fases = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    fases.push({
      letter: matches[i][2],
      text: text.slice(start, end),
    });
  }
  return fases;
}

const fases = splitByFase(matReg);
const result = {
  _meta: {
    source: "docs/cp046.txt — Lampiran II BSKAP No. 046/H/KR/2025",
    extracted_at: new Date().toISOString().slice(0, 10),
    method: "Direct text parsing (no NotebookLM intermediary). Section IV.1 (Matematika Reguler) + IV.2 (Matematika Tingkat Lanjut).",
    note: "Capaian Pembelajaran Matematika resmi Kurikulum Merdeka 2025. Source primer dari Kemdikbud — autoritatif.",
    catatan_penting: "CP 046 ditulis sebagai PROSA NARATIF per Fase (bukan tabel bab/sub-bab per kelas). Mapping per kelas dilakukan oleh sekolah/penerbit buku — Fase D (K7-K9) mengandung SEMUA materi K7+K8+K9 sekaligus. Sub-bab eksplisit harus di-extract dari kalimat narasi.",
  },
  matematika_reguler: {
    "Fase A (Kelas 1-2 SD)": parseFase("A", [1, 2], fases[0]?.text ?? "", ELEMEN_REG),
    "Fase B (Kelas 3-4 SD)": parseFase("B", [3, 4], fases[1]?.text ?? "", ELEMEN_REG),
    "Fase C (Kelas 5-6 SD)": parseFase("C", [5, 6], fases[2]?.text ?? "", ELEMEN_REG),
    "Fase D (Kelas 7-9 SMP)": parseFase("D", [7, 8, 9], fases[3]?.text ?? "", ELEMEN_REG),
    "Fase E (Kelas 10 SMA)": parseFase("E", [10], fases[4]?.text ?? "", ELEMEN_REG_SMA),
    "Fase F (Kelas 11-12 SMA Wajib)": parseFase("F", [11, 12], fases[5]?.text ?? "", ELEMEN_REG_SMA),
  },
  matematika_tingkat_lanjut: {
    "Fase F TL (Kelas 11-12 SMA Lanjut)": {
      fase: "F-TL",
      kelas: [11, 12],
      jalur: "Lanjut/Peminatan",
      elemen: extractElemenFromFase(matLanjutDetail, ["Aljabar dan Fungsi", "Geometri", "Analisis Data dan Peluang", "Kalkulus"], true),
    },
  },
};

// ============================================================
// Save
// ============================================================

const outPath = resolve(ROOT, "cp046-truth.json");
writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
console.log(`✓ Saved: ${outPath}`);
console.log("\nFases extracted:");
for (const [name, data] of Object.entries(result.matematika_reguler)) {
  const elemens = Object.entries(data.elemen).map(([k, v]) => `${k}: ${v.raw.length} chars`).join(", ");
  console.log(`  ${name}`);
  console.log(`    ${elemens}`);
}
console.log(`\n  Matematika Tingkat Lanjut Fase F:`);
const tlElemens = Object.entries(result.matematika_tingkat_lanjut["Fase F TL (Kelas 11-12 SMA Lanjut)"].elemen).map(([k, v]) => `${k}: ${v.raw.length} chars`).join(", ");
console.log(`    ${tlElemens}`);
