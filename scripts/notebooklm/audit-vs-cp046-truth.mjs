// Audit FINAL: Turo strict vs cp046-truth.json (CP 046 ASLI dari source primer)
// Pakai Claude Sonnet 4.6 + prompt caching.
//
// Replaces audit-strict-semantic.mjs (yang pakai NB taxonomy salah sebagai ref).
//
// Output:
//   - out/audit-vs-cp046-truth-cache.json (per-sub verdicts)
//   - out/AUDIT-FINAL-{j}.md (report)
//
// Run: node scripts/notebooklm/audit-vs-cp046-truth.mjs [--jenjang sd|smp|sma|all] [--force]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

function loadEnv() {
  const envPath = resolve(import.meta.dirname, "..", "..", ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const ROOT = resolve(import.meta.dirname, "out");
const PETA_PATH = resolve(import.meta.dirname, "..", "..", "src/data/peta-prasyarat.json");
const TRUTH_PATH = resolve(ROOT, "cp046-truth.json");
const CACHE_PATH = resolve(ROOT, "audit-vs-cp046-truth-cache.json");

const peta = JSON.parse(readFileSync(PETA_PATH, "utf8"));
const truth = JSON.parse(readFileSync(TRUTH_PATH, "utf8"));

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ERROR: ANTHROPIC_API_KEY tidak ditemukan");
  process.exit(1);
}

const client = new Anthropic();
const MODEL = "claude-sonnet-4-6";

const args = process.argv.slice(2);
const argFlag = (name, def = null) => {
  const idx = args.indexOf(`--${name}`);
  if (idx < 0) return def;
  return args[idx + 1] ?? true;
};
const targetJenjang = argFlag("jenjang", "all");
const forceRefresh = args.includes("--force");

// ============================================================
// Map jenjang/kelas → Fase
// ============================================================

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

// ============================================================
// Build CP truth reference (cached system prompt)
// ============================================================

function buildCpReference() {
  const lines = [];
  lines.push(`# CP 046/H/KR/2025 — Capaian Pembelajaran Matematika ASLI`);
  lines.push(`Source: docs/cp046.txt — BSKAP Kemdikbud (autoritatif).`);
  lines.push(`Format: prosa naratif per Fase (mencakup multiple kelas), per elemen.`);
  lines.push(``);
  lines.push(`PENTING: CP 046 tidak split per kelas spesifik (misal K7 vs K8 vs K9). Fase D mencakup SEMUA materi K7+K8+K9 sekaligus. Mapping per kelas adalah interpretasi sekolah/penerbit buku, BUKAN dari teks CP asli.`);
  lines.push(``);
  lines.push(`## PART A — MATEMATIKA REGULER (IV.1)`);
  lines.push(``);
  for (const [faseName, faseData] of Object.entries(truth.matematika_reguler)) {
    lines.push(`### ${faseName}`);
    for (const [elemen, elData] of Object.entries(faseData.elemen)) {
      lines.push(`#### ${elemen}`);
      lines.push(elData.raw || "(tidak ada teks)");
      lines.push(``);
    }
  }
  lines.push(`## PART B — MATEMATIKA TINGKAT LANJUT / PEMINATAN (IV.2)`);
  lines.push(`Mata pelajaran PILIHAN khusus untuk SMA Fase F (K11-K12). Murid yang mengambil jalur Lanjut/Peminatan untuk persiapan teknik/sains.`);
  lines.push(``);
  for (const [faseName, faseData] of Object.entries(truth.matematika_tingkat_lanjut)) {
    lines.push(`### ${faseName}`);
    for (const [elemen, elData] of Object.entries(faseData.elemen)) {
      lines.push(`#### ${elemen} [Lanjut]`);
      lines.push(elData.raw || "(tidak ada teks)");
      lines.push(``);
    }
  }
  return lines.join("\n");
}

const CP_REFERENCE = buildCpReference();

// ============================================================
// Cache load/save
// ============================================================

function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
}

// ============================================================
// Prompt
// ============================================================

const SYSTEM_INSTRUCTION = `Anda adalah ahli kurikulum matematika Indonesia. Tugas: untuk setiap sub-materi Turo, klasifikasikan apakah topik tersebut termasuk dalam Capaian Pembelajaran Matematika CP 046/H/KR/2025 ASLI (referensi di bawah, dikutip langsung dari teks BSKAP Kemdikbud).

Aturan klasifikasi (ada 3 verdict):

1. **MATCH_FASE_SAMA** — Topik ini DISEBUT (eksplisit atau implisit) di teks CP asli untuk Fase YANG SAMA dengan placement Turo.
   - Contoh: Turo SMP K7 "PLSV" → CP Fase D (SMP) menyebut "menyelesaikan persamaan dan pertidaksamaan linear satu variabel" → MATCH_FASE_SAMA. (CP tidak split K7/K8/K9, jadi PLSV di SMP K7/K8/K9 semuanya MATCH karena Fase D punya itu)

2. **MATCH_FASE_LAIN** — Topik DISEBUT di CP, tapi di Fase YANG BERBEDA dengan placement Turo.
   - Contoh: Turo SMP K7 "Lingkaran" → CP Fase D punya "panjang busur, sudut dan luas juring lingkaran" → MATCH_FASE_SAMA (sama Fase D). TAPI kalau topik adalah "limit fungsi" di Turo SD K6, sementara CP-nya di Fase F (SMA), itu MATCH_FASE_LAIN.

3. **NO_MATCH** — Topik TIDAK DISEBUT sama sekali di CP 046 manapun (BAIK Reguler IV.1 MAUPUN Tingkat Lanjut IV.2).
   - Contoh: "Subitasi" (mengenali jumlah sekilas) → CP tidak menyebut, tapi konsep ini implisit dalam "intuisi bilangan (number sense)" Fase A → bisa MATCH_FASE_SAMA dengan reasoning. Tapi kalau topik benar-benar pengayaan (extras), NO_MATCH.

CATATAN PENTING UNTUK SMA: Referensi CP punya 2 part:
- PART A: Matematika Reguler/Wajib (Fase A-F dasar)
- PART B: Matematika Tingkat Lanjut/Peminatan (Fase F TL — kelas 11-12, jalur khusus)

Kalau topik Turo SMA muncul di PART B (Lanjut), itu tetap MATCH_FASE_SAMA dengan matched_fase="Fase F TL". Polinomial, Bilangan Kompleks, Matriks, Limit, Turunan, Integral, Vektor R^2/R^3 — semua ada di PART B.

PENTING:
- Bandingkan SEMANTIK (makna), bukan kecocokan kata. Kutip teks CP yang relevan.
- CP ditulis sebagai prosa, sub-bab implisit. Misal "operasi hitung campuran" di Fase A sudah cover penjumlahan, pengurangan, perkalian, pembagian — semua tersirat.
- Kalau topik adalah review/perluasan (e.g., "+/− bersusun bilangan 3-4 digit"), check apakah CP Fase relevant menyebut operasi pada bilangan dengan range itu.
- Confidence rating: HIGH kalau ada kutipan langsung dari CP, MEDIUM kalau implisit/tersirat, LOW kalau ambigu.

Output WAJIB JSON valid (tanpa markdown wrap), schema:
{
  "verdict": "MATCH_FASE_SAMA" | "MATCH_FASE_LAIN" | "NO_MATCH",
  "matched_fase": "Fase A" | "Fase B" | "Fase C" | "Fase D" | "Fase E" | "Fase F" | null,
  "matched_elemen": "<Bilangan|Aljabar|Pengukuran|Geometri|Analisis Data dan Peluang> or null",
  "kutipan_cp": "<kalimat asli CP yang relevan, atau null kalau tidak ada>",
  "reasoning": "<1-2 kalimat alasan>",
  "confidence": "high" | "medium" | "low"
}

Contoh:
Input: SD.6.B1.04 +/− bilangan bulat sederhana (kelas 6, bab "Bilangan Bulat — Pengenalan Negatif", placement Turo Fase C)
Output: {"verdict":"MATCH_FASE_LAIN","matched_fase":"Fase D","matched_elemen":"Bilangan","kutipan_cp":"Membaca, menulis, dan membandingkan bilangan bulat, bilangan rasional...","reasoning":"Bilangan bulat (negatif) di CP 046 ada di Fase D (SMP), bukan Fase C (SD). Turo taruh di K6 — placement mismatch.","confidence":"high"}

Input: SMP.7.B5.01 PLSV (kelas 7, bab PLSV, placement Turo Fase D)
Output: {"verdict":"MATCH_FASE_SAMA","matched_fase":"Fase D","matched_elemen":"Aljabar","kutipan_cp":"menyelesaikan persamaan dan pertidaksamaan linear satu variabel","reasoning":"PLSV explicitly disebut di CP Fase D Aljabar.","confidence":"high"}`;

function buildUserPrompt(sub, expectedFase) {
  return `Audit sub-materi Turo strict berikut:

Kode: ${sub.kode}
Nama: ${sub.nama}
Kelas: ${sub.kelas}
Bab: ${sub.bab_kode} — ${sub.bab_nama}
Area: ${sub.area}
Label current: ${sub.label}
Placement Turo: ${expectedFase}

Klasifikasikan vs CP 046 ASLI (referensi di system prompt) dan return JSON.`;
}

// ============================================================
// Audit
// ============================================================

async function auditSub(sub, retries = 2) {
  const expectedFase = jenjangKelasToFase(sub.jenjang, sub.kelas);
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 600,
        system: [
          { type: "text", text: SYSTEM_INSTRUCTION },
          { type: "text", text: CP_REFERENCE, cache_control: { type: "ephemeral" } },
        ],
        messages: [{ role: "user", content: buildUserPrompt(sub, expectedFase) }],
      });
      const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      let parsed;
      try { parsed = JSON.parse(text); }
      catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
        else throw new Error(`Cannot parse JSON: ${text.slice(0, 200)}`);
      }
      return {
        ...parsed,
        _expected_fase: expectedFase,
        _usage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          cache_read: response.usage.cache_read_input_tokens ?? 0,
          cache_write: response.usage.cache_creation_input_tokens ?? 0,
        },
      };
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError && attempt < retries) {
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
}

// ============================================================
// Process per jenjang
// ============================================================

async function processJenjang(jenjang) {
  console.log(`\n=== ${jenjang} ===`);
  const turoStrict = peta.submateri.filter((s) => s.jenjang === jenjang && s.strict);
  const cache = loadCache();
  const todo = turoStrict.filter((s) => forceRefresh || !cache[s.kode]);
  console.log(`Total ${turoStrict.length} sub strict · ${turoStrict.length - todo.length} cached · ${todo.length} to audit`);

  let costTotal = 0;
  const concurrency = 3;
  for (let i = 0; i < todo.length; i += concurrency) {
    const batch = todo.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (sub) => {
        try { return { sub, verdict: await auditSub(sub) }; }
        catch (err) { return { sub, verdict: { error: err.message } }; }
      }),
    );
    for (const { sub, verdict } of results) {
      cache[sub.kode] = { ...verdict, _audited_at: new Date().toISOString() };
      if (verdict._usage) {
        const u = verdict._usage;
        costTotal += (u.input * 3 + u.output * 15 + u.cache_write * 3 * 1.25 + u.cache_read * 3 * 0.1) / 1_000_000;
      }
      const v = verdict.verdict ?? "ERROR";
      const m = v === "MATCH_FASE_SAMA" ? "✓" : v === "MATCH_FASE_LAIN" ? "⚠" : v === "NO_MATCH" ? "🚨" : "✗";
      console.log(`  ${m} ${sub.kode} ${v}${verdict.matched_fase ? ` → ${verdict.matched_fase}` : ""}`);
    }
    saveCache(cache);
  }
  console.log(`\nCost: $${costTotal.toFixed(4)}`);

  generateReport(jenjang, turoStrict, cache);
}

// ============================================================
// Report
// ============================================================

function generateReport(jenjang, turoStrict, cache) {
  const lines = [];
  lines.push(`# AUDIT FINAL: Turo Strict vs CP 046 ASLI — ${jenjang}\n`);
  lines.push(`Sumber referensi: \`docs/cp046.txt\` (BSKAP No. 046/H/KR/2025) — source primer autoritatif.`);
  lines.push(`Method: Claude Sonnet 4.6 + prompt caching (CP 046 raw text di system prompt).`);
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}\n`);

  const verdicts = { MATCH_FASE_SAMA: [], MATCH_FASE_LAIN: [], NO_MATCH: [], ERROR: [] };
  for (const sub of turoStrict) {
    const v = cache[sub.kode];
    if (!v || v.error) { verdicts.ERROR.push({ sub, verdict: v }); continue; }
    (verdicts[v.verdict] ?? verdicts.ERROR).push({ sub, verdict: v });
  }
  const total = turoStrict.length;
  lines.push(`## Summary\n`);
  lines.push(`| Status | Count | % |`);
  lines.push(`|---|---|---|`);
  lines.push(`| ✓ MATCH Fase SAMA (valid strict) | ${verdicts.MATCH_FASE_SAMA.length} | ${(verdicts.MATCH_FASE_SAMA.length/total*100).toFixed(1)}% |`);
  lines.push(`| ⚠ MATCH Fase LAIN (placement mismatch) | ${verdicts.MATCH_FASE_LAIN.length} | ${(verdicts.MATCH_FASE_LAIN.length/total*100).toFixed(1)}% |`);
  lines.push(`| 🚨 NO MATCH (tidak di CP 046) | ${verdicts.NO_MATCH.length} | ${(verdicts.NO_MATCH.length/total*100).toFixed(1)}% |`);
  if (verdicts.ERROR.length > 0) lines.push(`| ✗ ERROR | ${verdicts.ERROR.length} | ${(verdicts.ERROR.length/total*100).toFixed(1)}% |`);
  lines.push(`| **Total Turo strict** | **${total}** | 100% |`);
  lines.push(``);

  function groupByKelasBab(arr) {
    const map = new Map();
    for (const item of arr) {
      const k = item.sub.kelas;
      if (!map.has(k)) map.set(k, new Map());
      const babMap = map.get(k);
      const babKey = `${item.sub.bab_kode}|${item.sub.bab_nama}`;
      if (!babMap.has(babKey)) babMap.set(babKey, []);
      babMap.get(babKey).push(item);
    }
    return map;
  }

  // 🚨 NO MATCH
  if (verdicts.NO_MATCH.length > 0) {
    lines.push(`## 🚨 NO MATCH — Tidak di CP 046 (${verdicts.NO_MATCH.length} sub)\n`);
    lines.push(`Sub-materi yang TIDAK ditemukan dalam teks CP 046 manapun. Strong candidate untag → bridge.\n`);
    const grouped = groupByKelasBab(verdicts.NO_MATCH);
    for (const k of [...grouped.keys()].sort((a, b) => a - b)) {
      lines.push(`### Kelas ${k}\n`);
      for (const [babKey, items] of grouped.get(k)) {
        const [babKode, babNama] = babKey.split("|");
        lines.push(`**${babKode} — ${babNama}** (${items.length} sub):`);
        for (const { sub, verdict } of items) {
          const conf = verdict.confidence ? ` [${verdict.confidence}]` : "";
          lines.push(`- \`${sub.kode}\` ${sub.nama}${conf}`);
          if (verdict.reasoning) lines.push(`  - _Alasan_: ${verdict.reasoning}`);
        }
        lines.push(``);
      }
    }
  } else lines.push(`## 🚨 NO MATCH: NONE — semua strict ada di CP 046 ✓\n`);

  // ⚠ MATCH FASE LAIN
  if (verdicts.MATCH_FASE_LAIN.length > 0) {
    lines.push(`## ⚠ MATCH FASE LAIN — Placement mismatch (${verdicts.MATCH_FASE_LAIN.length} sub)\n`);
    lines.push(`Sub yang ada di CP 046, tapi di Fase BERBEDA dengan placement Turo.\n`);
    const grouped = groupByKelasBab(verdicts.MATCH_FASE_LAIN);
    for (const k of [...grouped.keys()].sort((a, b) => a - b)) {
      lines.push(`### Turo Kelas ${k} (placement: ${jenjangKelasToFase(turoStrict.find(s => s.kelas === k).jenjang, k)})\n`);
      for (const [babKey, items] of grouped.get(k)) {
        const [babKode, babNama] = babKey.split("|");
        lines.push(`**${babKode} — ${babNama}**:`);
        for (const { sub, verdict } of items) {
          const conf = verdict.confidence ? ` [${verdict.confidence}]` : "";
          lines.push(`- \`${sub.kode}\` ${sub.nama}${conf}`);
          lines.push(`  → CP taruh di **${verdict.matched_fase}** (${verdict.matched_elemen})`);
          if (verdict.kutipan_cp) lines.push(`  - _Kutipan CP_: "${verdict.kutipan_cp}"`);
          if (verdict.reasoning) lines.push(`  - _Alasan_: ${verdict.reasoning}`);
        }
        lines.push(``);
      }
    }
  } else lines.push(`## ⚠ MATCH FASE LAIN: NONE — semua placement match ✓\n`);

  // ✓ Sample MATCH FASE SAMA
  lines.push(`## ✓ Sample MATCH FASE SAMA (sanity check, 10 first)\n`);
  for (const { sub, verdict } of verdicts.MATCH_FASE_SAMA.slice(0, 10)) {
    const conf = verdict.confidence ? ` [${verdict.confidence}]` : "";
    lines.push(`- \`${sub.kode}\` ${sub.nama} ↔ CP ${verdict.matched_fase} ${verdict.matched_elemen}${conf}`);
    if (verdict.kutipan_cp) lines.push(`  - "${verdict.kutipan_cp}"`);
  }
  lines.push(``);

  if (verdicts.ERROR.length > 0) {
    lines.push(`\n## ✗ ERROR\n`);
    for (const { sub, verdict } of verdicts.ERROR) {
      lines.push(`- \`${sub.kode}\` ${sub.nama} — ${verdict?.error ?? "unknown"}`);
    }
  }

  lines.push(`\n## Cara apply\n`);
  lines.push(`1. Review section 🚨 NO MATCH — sub-materi yang benar-benar tidak ada di CP 046.`);
  lines.push(`2. Review section ⚠ MATCH FASE LAIN — placement-nya salah, perlu pindah Fase atau untag.`);
  lines.push(`3. Saya jalankan apply script setelah pak ustadz approve.`);
  lines.push(``);
  lines.push(`**Source autoritatif**: \`docs/cp046.txt\` (Lampiran II BSKAP 046/2025) — extracted ke \`scripts/notebooklm/out/cp046-truth.json\`. Jauh lebih akurat dari NB Deep Research yang sebelumnya.`);

  const outPath = resolve(ROOT, `AUDIT-FINAL-${jenjang.toLowerCase()}.md`);
  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`✓ Report: ${outPath}`);
}

// Main
const targets = targetJenjang === "all"
  ? ["SD", "SMP", "SMA"]
  : [targetJenjang.toUpperCase()];

console.log(`Mode: ${targetJenjang} · Force: ${forceRefresh}`);
console.log(`CP reference: ${CP_REFERENCE.length} chars (cached in system prompt)`);

for (const j of targets) {
  await processJenjang(j);
}
console.log(`\n✓ Done.`);
