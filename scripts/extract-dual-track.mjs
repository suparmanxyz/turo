// Ekstrak DATA dari turo-peta-diagnostik-dual-track.html → produce mapping kode→{strict,label}
// Lalu merge ke peta-prasyarat.json sebagai field tambahan + update index.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const HTML_PATH = resolve(ROOT, "docs/turo-peta-diagnostik-dual-track.html");
const PETA_PATH = resolve(ROOT, "src/data/peta-prasyarat.json");
const INDEX_PATH = resolve(ROOT, "src/data/peta-prasyarat-index.json");

console.log("[1/4] Baca HTML...");
const html = readFileSync(HTML_PATH, "utf8");

// Cari "const DATA = {...};" — JS literal
const startMarker = "const DATA = ";
const startIdx = html.indexOf(startMarker);
if (startIdx < 0) throw new Error("DATA const tidak ditemukan");
const dataStart = startIdx + startMarker.length;

// Cari closing "};" yang match — brace counter
let depth = 0;
let inString = false;
let stringChar = "";
let escape = false;
let dataEnd = -1;
for (let i = dataStart; i < html.length; i++) {
  const c = html[i];
  if (inString) {
    if (escape) escape = false;
    else if (c === "\\") escape = true;
    else if (c === stringChar) inString = false;
    continue;
  }
  if (c === '"' || c === "'") { inString = true; stringChar = c; continue; }
  if (c === "{") depth++;
  else if (c === "}") {
    depth--;
    if (depth === 0) { dataEnd = i + 1; break; }
  }
}
if (dataEnd < 0) throw new Error("DATA closing brace tidak ketemu");

const dataJson = html.slice(dataStart, dataEnd);
console.log(`[2/4] Parse DATA (${dataJson.length} chars)...`);
const DATA = JSON.parse(dataJson);
console.log(`     subs count: ${DATA.subs.length}`);

// Build map kode → { strict, label }
const labelMap = new Map();
for (const s of DATA.subs) {
  labelMap.set(s.k, {
    strict: !!s.strict,
    label: normalizeLabel(s.lbl),
  });
}
console.log(`     mapped ${labelMap.size} kode`);

function normalizeLabel(lbl) {
  if (!lbl) return "CP-2025";
  // HTML pakai "CP2025", "Buku-2025", "UTBK", "Pengayaan"
  const map = {
    CP2025: "CP-2025",
    "Buku-2025": "Buku-2025",
    Buku2025: "Buku-2025",
    UTBK: "UTBK",
    Pengayaan: "Pengayaan",
  };
  return map[lbl] ?? lbl;
}

console.log("[3/4] Merge ke peta-prasyarat.json...");
const peta = JSON.parse(readFileSync(PETA_PATH, "utf8"));
let merged = 0;
let unmatched = 0;
const unmatchedKodes = [];
for (const sub of peta.submateri) {
  const m = labelMap.get(sub.kode);
  if (!m) {
    unmatched++;
    unmatchedKodes.push(sub.kode);
    // Default: anggap strict & CP-2025 — paling konservatif
    sub.strict = true;
    sub.label = "CP-2025";
    continue;
  }
  sub.strict = m.strict;
  sub.label = m.label;
  merged++;
}

// Stats baru
const strictCount = peta.submateri.filter((s) => s.strict).length;
const labelCounts = {};
for (const s of peta.submateri) labelCounts[s.label] = (labelCounts[s.label] ?? 0) + 1;
peta.stats.strict_only = strictCount;
peta.stats.full = peta.submateri.length;
peta.stats.label_counts = labelCounts;

writeFileSync(PETA_PATH, JSON.stringify(peta, null, 2));
console.log(`     merged: ${merged}, unmatched: ${unmatched} (defaulted to strict CP-2025)`);
console.log(`     strict: ${strictCount}/${peta.submateri.length}`);
console.log(`     label_counts:`, labelCounts);
if (unmatchedKodes.length > 0 && unmatchedKodes.length <= 50) {
  console.log(`     unmatched kodes:`, unmatchedKodes.slice(0, 50));
}

console.log("[4/4] Update index...");
const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
const strictKodes = peta.submateri.filter((s) => s.strict).map((s) => s.kode);
const byLabel = {};
for (const s of peta.submateri) {
  if (!byLabel[s.label]) byLabel[s.label] = [];
  byLabel[s.label].push(s.kode);
}
index.strict_kodes = strictKodes;
index.by_label = byLabel;
writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
console.log(`     strict_kodes: ${strictKodes.length}`);
console.log(`     by_label keys:`, Object.keys(byLabel));

console.log("\n✓ Selesai. Peta + index updated.");
