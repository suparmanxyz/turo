// Semantic audit Turo strict tagging vs NB CP 046 — pakai Claude Sonnet 4.6
// dengan prompt caching untuk efisiensi.
//
// Strategy:
//   - System prompt: NB taxonomy lengkap untuk 1 jenjang (cached, ~5K tokens)
//   - Per request: 1 sub-materi Turo strict, return JSON verdict
//   - Cache hasil per sub di JSON file → re-run aman, idempotent
//   - Concurrent dengan p-limit (3 parallel) untuk throughput
//   - Batch per jenjang supaya cache prompt stabil
//
// Output:
//   - scripts/notebooklm/out/audit-strict-semantic-cache.json (per-sub verdicts)
//   - scripts/notebooklm/out/AUDIT-strict-semantic-{j}.md (report markdown)
//
// Run: node scripts/notebooklm/audit-strict-semantic.mjs [--jenjang sd|smp|sma|all] [--force]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

// Load .env.local manually (Node doesn't auto-load)
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
const CACHE_PATH = resolve(ROOT, "audit-strict-semantic-cache.json");

const peta = JSON.parse(readFileSync(PETA_PATH, "utf8"));

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ERROR: ANTHROPIC_API_KEY tidak ditemukan di env atau .env.local");
  process.exit(1);
}

const client = new Anthropic();
const MODEL = "claude-sonnet-4-6";

// Parse CLI args
const args = process.argv.slice(2);
const argFlag = (name, def = null) => {
  const idx = args.indexOf(`--${name}`);
  if (idx < 0) return def;
  return args[idx + 1] ?? true;
};
const targetJenjang = argFlag("jenjang", "all");
const forceRefresh = args.includes("--force");

// ============================================================
// Load NB taxonomy + format ke compact reference
// ============================================================

function loadNbTaxonomy(code) {
  return JSON.parse(readFileSync(resolve(ROOT, `reguler-${code}-taxonomy.json`), "utf8"));
}

function formatNbReference(jenjang, tax) {
  const lines = [];
  lines.push(`# NB CP 046 ${jenjang} — Daftar Bab & Sub-Bab Autoritatif`);
  lines.push(`Sumber: NotebookLM Deep Research dari BSKAP No. 046/H/KR/2025 (Kurikulum Merdeka).`);
  lines.push(`Struktur: per kelas, per bab, dengan sub-bab lengkap.`);
  lines.push(``);
  for (const k of tax.kelas) {
    lines.push(`## Kelas ${k.kelas} (Fase ${k.fase})`);
    if (k.fokus) lines.push(`Fokus: ${k.fokus}`);
    lines.push(``);
    for (const b of k.bab) {
      const jalur = b.jalur ? ` [${b.jalur}]` : "";
      lines.push(`### ${b.id}${jalur} ${b.nama}`);
      for (const sb of b.sub_bab) {
        lines.push(`- ${sb}`);
      }
      lines.push(``);
    }
  }
  return lines.join("\n");
}

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
// Prompt construction
// ============================================================

const SYSTEM_INSTRUCTION = `Anda adalah ahli kurikulum matematika Indonesia yang melakukan audit semantik.

Tugas Anda: untuk setiap sub-materi yang diberikan, klasifikasikan apakah topik tersebut termasuk dalam Kurikulum Merdeka CP 046/H/KR/2025 (referensi NB di bawah), dan jika ya, di kelas mana.

Aturan klasifikasi:
1. MATCH_SAME_KELAS — Topik ini ADA di NB CP 046, di kelas yang SAMA dengan placement Turo.
2. MATCH_OTHER_KELAS — Topik ini ADA di NB CP 046, tapi NB taruh di kelas BERBEDA. Sebutkan kelas NB.
3. NO_MATCH — Topik ini TIDAK ADA di NB CP 046 di kelas manapun. Ini bisa jadi:
   - Topik dari buku lama (K2013) yang dihapus di CP 046
   - Topik pengayaan/extras yang ditambah Turo tapi bukan CP 046
   - Konsep yang di CP 046 disatukan dengan topik lain (jelaskan)

PENTING:
- Bandingkan SEMANTIK (makna konsep), bukan kecocokan kata. Misal: "Modus" dan "Setengah" bukan match meskipun ada kata "tengah". Tapi "FPB" dan "Faktor Persekutuan Terbesar" jelas match.
- Pertimbangkan konteks: "Subitasi" (mengenali jumlah sekilas) adalah konsep PUFM yang relevan dengan number sense awal SD K1, jadi MATCH dengan bab "Bilangan Cacah sampai 20" K1 NB.
- "Doubles" (1+1, 2+2) adalah strategi perhitungan dasar — bagian dari "Penjumlahan dan Pengurangan Dasar" K1 NB.
- Kalau topik adalah review/perluasan dari kelas sebelumnya, klasifikasi berdasarkan kelas placement Turo (bukan kelas asal).

Output WAJIB JSON valid (tanpa markdown), schema:
{
  "verdict": "MATCH_SAME_KELAS" | "MATCH_OTHER_KELAS" | "NO_MATCH",
  "matched_kelas": <number or null>,
  "matched_bab": "<nama bab di NB or null>",
  "matched_sub": "<nama sub-bab di NB or null>",
  "reasoning": "<1-2 kalimat alasan singkat>",
  "confidence": "high" | "medium" | "low"
}

Contoh:
Input: SD.6.B1.04 +/− bilangan bulat sederhana (kelas 6, bab "Bilangan Bulat — Pengenalan Negatif")
Output: {"verdict":"NO_MATCH","matched_kelas":null,"matched_bab":null,"matched_sub":null,"reasoning":"NB CP 046 K6 tidak punya bilangan bulat negatif sama sekali. Bilangan bulat negatif baru muncul di SMP K7 NB.","confidence":"high"}

Input: SD.4.B2.01 FPB (Faktor Persekutuan Terbesar) (kelas 4, bab "KPK dan FPB")
Output: {"verdict":"MATCH_OTHER_KELAS","matched_kelas":5,"matched_bab":"KPK dan FPB Lanjutan","matched_sub":"FPB & faktorisasi prima","reasoning":"FPB ada di NB CP 046 SD K5 sebagai bagian dari KPK & FPB Lanjutan, bukan K4.","confidence":"high"}`;

function buildUserPrompt(sub) {
  return `Audit sub-materi Turo strict berikut:

Kode: ${sub.kode}
Nama: ${sub.nama}
Kelas: ${sub.kelas}
Bab: ${sub.bab_kode} — ${sub.bab_nama}
Area: ${sub.area}
Label current: ${sub.label}

Klasifikasikan vs NB CP 046 (referensi di system prompt) dan return JSON.`;
}

// ============================================================
// Audit one sub
// ============================================================

async function auditSub(sub, nbReference, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        system: [
          {
            type: "text",
            text: SYSTEM_INSTRUCTION,
          },
          {
            type: "text",
            text: nbReference,
            cache_control: { type: "ephemeral" }, // cache referensi NB
          },
        ],
        messages: [{ role: "user", content: buildUserPrompt(sub) }],
      });
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      // Parse JSON from response
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Try extract JSON from markdown code fence
        const m = text.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
        else throw new Error(`Cannot parse JSON: ${text.slice(0, 200)}`);
      }
      return {
        ...parsed,
        _usage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          cache_read: response.usage.cache_read_input_tokens ?? 0,
          cache_write: response.usage.cache_creation_input_tokens ?? 0,
        },
      };
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError && attempt < retries) {
        const wait = 5000 * (attempt + 1);
        console.log(`  Rate limit, wait ${wait}ms...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (attempt < retries) {
        console.log(`  Error: ${err.message}, retry ${attempt + 1}/${retries}`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
}

// ============================================================
// Process one jenjang dengan concurrency limit
// ============================================================

async function processJenjang(jenjang, code) {
  console.log(`\n=== ${jenjang} ===`);
  const tax = loadNbTaxonomy(code);
  const nbReference = formatNbReference(jenjang, tax);
  const turoStrict = peta.submateri.filter((s) => s.jenjang === jenjang && s.strict);

  const cache = loadCache();
  let processed = 0;
  let cached = 0;
  let costTotal = 0;
  const concurrency = 3;

  // Sort: process kode yang belum di-cache dulu
  const todo = turoStrict.filter((s) => forceRefresh || !cache[s.kode]);
  const skipped = turoStrict.length - todo.length;
  console.log(`Total ${turoStrict.length} sub strict · ${skipped} sudah di-cache · ${todo.length} perlu di-audit`);

  if (todo.length === 0) {
    console.log("Semua sudah di-cache. Generate report saja.");
  } else {
    console.log(`Concurrency: ${concurrency}, model: ${MODEL}`);

    // Simple batch concurrency
    const batchSize = concurrency;
    for (let i = 0; i < todo.length; i += batchSize) {
      const batch = todo.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (sub) => {
          try {
            const verdict = await auditSub(sub, nbReference);
            return { sub, verdict };
          } catch (err) {
            console.error(`  ✗ ${sub.kode}: ${err.message}`);
            return { sub, verdict: { error: err.message } };
          }
        }),
      );
      for (const { sub, verdict } of results) {
        cache[sub.kode] = { ...verdict, _audited_at: new Date().toISOString() };
        if (verdict._usage) {
          // Sonnet 4.6: input $3/1M, output $15/1M, cache write 1.25x, cache read 0.1x
          const u = verdict._usage;
          const cost = (u.input * 3 + u.output * 15 + u.cache_write * 3 * 1.25 + u.cache_read * 3 * 0.1) / 1_000_000;
          costTotal += cost;
        }
        processed++;
        const v = verdict.verdict ?? "ERROR";
        const marker = v === "MATCH_SAME_KELAS" ? "✓" : v === "MATCH_OTHER_KELAS" ? "⚠" : v === "NO_MATCH" ? "🚨" : "✗";
        console.log(`  ${marker} ${sub.kode} ${v}${verdict.matched_kelas ? ` → K${verdict.matched_kelas}` : ""}`);
      }
      // Save cache every batch (incremental)
      saveCache(cache);
    }
    console.log(`\nDone ${processed} sub. Estimated cost: $${costTotal.toFixed(4)}`);
  }

  // Generate markdown report
  generateReport(jenjang, code, turoStrict, cache);
}

// ============================================================
// Generate markdown report
// ============================================================

function generateReport(jenjang, code, turoStrict, cache) {
  const lines = [];
  lines.push(`# AUDIT SEMANTIC: Strict Tagging vs NB CP 046 — ${jenjang}\n`);
  lines.push(`Sumber: NB CP 046/H/KR/2025 + Claude Sonnet 4.6 (semantic matching)`);
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}\n`);

  const verdicts = { MATCH_SAME_KELAS: [], MATCH_OTHER_KELAS: [], NO_MATCH: [], ERROR: [] };
  for (const sub of turoStrict) {
    const v = cache[sub.kode];
    if (!v || v.error) {
      verdicts.ERROR.push({ sub, verdict: v });
      continue;
    }
    const bucket = verdicts[v.verdict] ?? verdicts.ERROR;
    bucket.push({ sub, verdict: v });
  }

  const total = turoStrict.length;
  lines.push(`## Summary\n`);
  lines.push(`| Status | Count | % |`);
  lines.push(`|---|---|---|`);
  lines.push(`| ✓ MATCH kelas sama (valid strict) | ${verdicts.MATCH_SAME_KELAS.length} | ${(verdicts.MATCH_SAME_KELAS.length/total*100).toFixed(1)}% |`);
  lines.push(`| ⚠ MATCH kelas LAIN (placement mismatch) | ${verdicts.MATCH_OTHER_KELAS.length} | ${(verdicts.MATCH_OTHER_KELAS.length/total*100).toFixed(1)}% |`);
  lines.push(`| 🚨 NO MATCH (tidak di NB CP 046) | ${verdicts.NO_MATCH.length} | ${(verdicts.NO_MATCH.length/total*100).toFixed(1)}% |`);
  if (verdicts.ERROR.length > 0) lines.push(`| ✗ ERROR (audit gagal) | ${verdicts.ERROR.length} | ${(verdicts.ERROR.length/total*100).toFixed(1)}% |`);
  lines.push(`| **Total Turo strict** | **${total}** | 100% |`);
  lines.push(``);

  // === 🚨 NO MATCH ===
  if (verdicts.NO_MATCH.length > 0) {
    lines.push(`## 🚨 NO MATCH — Tidak di NB CP 046 (${verdicts.NO_MATCH.length} sub)\n`);
    lines.push(`Sub-materi Turo strict yang **tidak ada di NB CP 046** di kelas manapun. Strong candidate untuk untag jadi bridge.\n`);
    const byKelas = groupBy(verdicts.NO_MATCH, (x) => x.sub.kelas);
    for (const k of [...byKelas.keys()].sort((a, b) => a - b)) {
      lines.push(`### Kelas ${k}\n`);
      const byBab = groupBy(byKelas.get(k), (x) => `${x.sub.bab_kode}|${x.sub.bab_nama}`);
      for (const [babKey, items] of byBab) {
        const [babKode, babNama] = babKey.split("|");
        lines.push(`**${babKode} — ${babNama}** (${items.length} sub):`);
        for (const { sub, verdict } of items) {
          const conf = verdict.confidence ? ` [conf: ${verdict.confidence}]` : "";
          lines.push(`- \`${sub.kode}\` ${sub.nama}${conf}`);
          if (verdict.reasoning) lines.push(`  - _Alasan_: ${verdict.reasoning}`);
        }
        lines.push(``);
      }
    }
  } else {
    lines.push(`## 🚨 NO MATCH: NONE — semua strict sub ada di NB CP 046 ✓\n`);
  }

  // === ⚠ MATCH OTHER KELAS ===
  if (verdicts.MATCH_OTHER_KELAS.length > 0) {
    lines.push(`## ⚠ MATCH KELAS LAIN — Placement mismatch (${verdicts.MATCH_OTHER_KELAS.length} sub)\n`);
    lines.push(`Sub-materi yang ada di NB CP 046, tapi di **kelas yang berbeda** dari placement Turo.\n`);
    const byKelas = groupBy(verdicts.MATCH_OTHER_KELAS, (x) => x.sub.kelas);
    for (const k of [...byKelas.keys()].sort((a, b) => a - b)) {
      lines.push(`### Turo Kelas ${k}\n`);
      const byBab = groupBy(byKelas.get(k), (x) => `${x.sub.bab_kode}|${x.sub.bab_nama}`);
      for (const [babKey, items] of byBab) {
        const [babKode, babNama] = babKey.split("|");
        lines.push(`**${babKode} — ${babNama}**:`);
        for (const { sub, verdict } of items) {
          const conf = verdict.confidence ? ` [conf: ${verdict.confidence}]` : "";
          lines.push(`- \`${sub.kode}\` ${sub.nama}${conf}`);
          lines.push(`  → NB taruh di **K${verdict.matched_kelas}**: ${verdict.matched_bab ?? "?"}${verdict.matched_sub ? ` / "${verdict.matched_sub}"` : ""}`);
          if (verdict.reasoning) lines.push(`  - _Alasan_: ${verdict.reasoning}`);
        }
        lines.push(``);
      }
    }
  } else {
    lines.push(`## ⚠ MATCH KELAS LAIN: NONE — semua placement match ✓\n`);
  }

  // === Sample MATCH SAME KELAS ===
  lines.push(`## ✓ Sample MATCH SAME KELAS (sanity check, 10 first)\n`);
  for (const { sub, verdict } of verdicts.MATCH_SAME_KELAS.slice(0, 10)) {
    const matchedInfo = verdict.matched_sub ? `"${verdict.matched_sub}"` : (verdict.matched_bab ?? "(unspecified)");
    const conf = verdict.confidence ? ` [${verdict.confidence}]` : "";
    lines.push(`- \`${sub.kode}\` ${sub.nama} ↔ NB K${verdict.matched_kelas}: ${matchedInfo}${conf}`);
  }

  if (verdicts.ERROR.length > 0) {
    lines.push(`\n## ✗ ERROR — Audit gagal (${verdicts.ERROR.length} sub)\n`);
    for (const { sub, verdict } of verdicts.ERROR) {
      lines.push(`- \`${sub.kode}\` ${sub.nama}`);
      if (verdict?.error) lines.push(`  - Error: ${verdict.error}`);
    }
  }

  lines.push(`\n## Cara apply\n`);
  lines.push(`1. Pak ustadz review section 🚨 NO MATCH dulu — itu strong candidate untag → bridge.`);
  lines.push(`2. Section ⚠ MATCH KELAS LAIN — keputusan filosofis: ikut NB (pindah/untag) atau pertahankan.`);
  lines.push(`3. Saya jalankan apply script setelah pak ustadz tandai approve per sub.`);
  lines.push(``);
  lines.push(`**Metode**: Claude Sonnet 4.6 dengan prompt caching (NB taxonomy autoritatif). Setiap verdict include reasoning + confidence level — jauh lebih akurat dari keyword matching.`);

  const outPath = resolve(ROOT, `AUDIT-strict-semantic-${code}.md`);
  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`✓ Report: ${outPath}`);
}

function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

// ============================================================
// Main
// ============================================================

const targets = [
  { jenjang: "SD", code: "sd" },
  { jenjang: "SMP", code: "smp" },
  { jenjang: "SMA", code: "sma" },
];

const filtered = targetJenjang === "all"
  ? targets
  : targets.filter((t) => t.code === targetJenjang.toLowerCase());

if (filtered.length === 0) {
  console.error(`Unknown jenjang: ${targetJenjang}. Pakai sd|smp|sma|all.`);
  process.exit(1);
}

console.log(`Mode: ${targetJenjang} · Force refresh: ${forceRefresh}`);
console.log(`Cache file: ${CACHE_PATH}`);

for (const t of filtered) {
  try {
    await processJenjang(t.jenjang, t.code);
  } catch (err) {
    console.error(`✗ ${t.jenjang}: ${err.message}`);
  }
}

console.log(`\n✓ Done. Output di scripts/notebooklm/out/`);
