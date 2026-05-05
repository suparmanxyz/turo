// Batch seed soal MC ke item_bank Firestore untuk sub-materi yang masih kosong/low-coverage.
// Pakai Claude Sonnet 4.6 + prompt caching untuk efisiensi cost.
//
// Input: scripts/seed-priority-list.json (output dari audit-item-bank-coverage.mjs)
// Output: write item baru ke Firestore item_bank (target 3 items per sub-materi).
//
// Usage:
//   node scripts/seed-item-bank-batch.mjs                    # full batch (semua priority)
//   node scripts/seed-item-bank-batch.mjs --top 30           # top 30 priority saja
//   node scripts/seed-item-bank-batch.mjs --jenjang SMA      # filter jenjang
//   node scripts/seed-item-bank-batch.mjs --dry-run          # tidak write Firestore
//   node scripts/seed-item-bank-batch.mjs --resume           # skip kode yang sudah cukup (>=3)
//   node scripts/seed-item-bank-batch.mjs --concurrency 4    # parallel (default 3)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import admin from "firebase-admin";

function loadEnv() {
  const p = resolve(import.meta.dirname, "..", ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

if (!process.env.ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY missing"); process.exit(1); }
if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) { console.error("FIREBASE_SERVICE_ACCOUNT_JSON missing"); process.exit(1); }

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});
const db = admin.firestore();
const client = new Anthropic();

const MODEL = "claude-sonnet-4-6";
const TARGET_COUNT = 3;

// CLI args
const args = process.argv.slice(2);
const argVal = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
const top = argVal("--top") ? parseInt(argVal("--top"), 10) : Infinity;
const jenjangFilter = argVal("--jenjang");
const dryRun = args.includes("--dry-run");
const resume = args.includes("--resume");
const concurrency = argVal("--concurrency") ? parseInt(argVal("--concurrency"), 10) : 3;

// Peta resmi untuk default IRT params (kelasToTheta inline)
const peta = JSON.parse(readFileSync(resolve(import.meta.dirname, "..", "src/data/peta-prasyarat.json"), "utf8"));
const subByKode = new Map(peta.submateri.map((s) => [s.kode, s]));

const priorityFile = resolve(import.meta.dirname, "..", "scripts/seed-priority-list.json");
if (!existsSync(priorityFile)) {
  console.error(`Priority file missing: ${priorityFile}\nRun: node scripts/audit-item-bank-coverage.mjs`);
  process.exit(1);
}
const priority = JSON.parse(readFileSync(priorityFile, "utf8"));

// Filter priority list
let queue = priority.priorityList;
if (jenjangFilter) queue = queue.filter((p) => p.jenjang === jenjangFilter);
queue = queue.slice(0, top);

console.log(`\n=== ITEM BANK SEEDING BATCH ===`);
console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"} · Concurrency: ${concurrency} · Resume: ${resume}`);
console.log(`Filter: jenjang=${jenjangFilter ?? "all"} · top=${top === Infinity ? "all" : top}`);
console.log(`Queue: ${queue.length} sub-materi\n`);

// === Default IRT params (mirror src/lib/item-bank.ts) ===
const DEFAULT_A = 1.0;
const DEFAULT_C_MC4 = 0.20;
const DEFAULT_TIME_SECONDS = 90;

function kelasToTheta(kelas) {
  // Linear: kelas 1 → -3, kelas 6.5 → 0, kelas 12 → +3
  return ((kelas - 6.5) / 5.5) * 3;
}

function inferJalur(sub) {
  const out = [];
  if (sub.jenjang === "SD") {
    if (sub.kelas <= 3) out.push("sd-k1-3");
    else out.push("sd-k4-6");
  } else if (sub.jenjang === "SMP") {
    out.push("smp");
  } else if (sub.jenjang === "SMA") {
    out.push("sma-reguler");
    if (sub.is_maku) out.push("sma-utbk");
  }
  return out;
}

function contentHash(soal) {
  const sig = [soal.pertanyaan.trim(), ...soal.opsi.map((o) => o.teks.trim())].join("|");
  return createHash("sha256").update(sig).digest("hex").slice(0, 16);
}

// === Prompt: generate soal MC + meta dalam 1 call ===
const SYSTEM_INSTRUCTION = `Anda ahli pedagogi matematika. Tugas: generate soal pilihan ganda (MC4) untuk diagnostik IRT + meta pedagogis lengkap.

Aturan ketat:
- Per soal: 4 opsi (A, B, C, D), PERSIS 1 opsi benar.
- Distractor (3 opsi salah) HARUS merepresentasikan miskonsepsi spesifik (bukan angka acak).
- Setiap opsi sertakan field "alasan":
  * Opsi BENAR: alasan singkat mengapa benar.
  * Opsi SALAH: miskonsepsi spesifik yang menyebabkan siswa pilih opsi ini.
- Pakai LaTeX $...$ untuk rumus. Escape backslash jadi DOUBLE backslash di JSON ($\\\\frac{1}{2}$).
- Kalau geometri/grafik perlu visual, sertakan "svg" (self-contained, viewBox max 400px). Kalau tidak perlu, hilangkan field "svg".
- Output HANYA JSON murni, tanpa code fence/backtick.

Setiap soal HARUS punya meta pedagogis:
{
  "difficultyLabel": "easy" | "medium" | "hard",
  "microskill": "<sub-skill snake_case, e.g. 'substitusi_langsung', 'faktor_sederhana'>",
  "subConcept": "<sub-konsep singkat>",
  "multiStep": true | false,
  "analyticalSteps": <integer 1-5>,
  "reasoningQualityRequired": <integer 1-4, 1=hafalan, 2=apply, 3=analyze, 4=create>,
  "requiresManipulation": true | false,
  "abstractQuestion": true | false,
  "readingHeavy": true | false,
  "intuitiveLeap": true | false,
  "strongDistractor": true | false,
  "questionCondition": <integer 1-5>,
  "expectedResponseTimeSec": <integer detik, easy:30-60, medium:60-120, hard:120-240>,
  "patternType": "<jenis pola atau null>",
  "transferType": "<jenis transfer atau null>"
}

Distribusi difficulty per batch 3 soal: 1 easy, 1 medium, 1 hard.`;

function buildUserPrompt(sub, count) {
  const jenjangLabel = sub.jenjang === "SD"
    ? `SD kelas ${sub.kelas}${sub.kelas <= 3 ? " (gunakan bahasa anak: konkret, konteks ortu/teman/permainan)" : ""}`
    : sub.jenjang === "SMP"
    ? `SMP kelas ${sub.kelas}`
    : `SMA kelas ${sub.kelas}${sub.is_maku ? " (Materi Kunci — bisa muncul di UTBK)" : ""}`;

  return `Generate ${count} soal pilihan ganda berbeda untuk sub-materi:

Kode: ${sub.kode}
Nama: ${sub.nama}
Jenjang: ${jenjangLabel}
Area: ${sub.area}

Soal harus:
- Realistis untuk siswa ${jenjangLabel}.
- Variasi MENYELURUH (beda angka, beda konteks/cerita, beda strategi).
- Distribusi: 1 easy (procedural), 1 medium (apply concept), 1 hard (multi-step/analyze).
- Distractor merepresentasikan miskonsepsi UMUM siswa pada topik ini.

Schema output:
{
  "soal": [
    {
      "pertanyaan": "string",
      "opsi": [
        { "teks": "...", "benar": false, "alasan": "miskonsepsi: ..." },
        { "teks": "...", "benar": true,  "alasan": "..." },
        { "teks": "...", "benar": false, "alasan": "miskonsepsi: ..." },
        { "teks": "...", "benar": false, "alasan": "miskonsepsi: ..." }
      ],
      "svg": "<svg ...>...</svg>",
      "meta": { ...pedagogy fields... }
    }
  ]
}`;
}

async function generateBatch(sub, needed, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system: [{ type: "text", text: SYSTEM_INSTRUCTION, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: buildUserPrompt(sub, needed) }],
      });
      const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      let parsed;
      try { parsed = JSON.parse(text); }
      catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
        else throw new Error(`Cannot parse: ${text.slice(0, 200)}`);
      }
      if (!Array.isArray(parsed.soal)) throw new Error("Missing 'soal' array");
      return {
        soal: parsed.soal,
        usage: {
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

function buildEntry(soal, sub) {
  const benarCount = soal.opsi.filter((o) => o.benar).length;
  if (benarCount !== 1) {
    // auto-fix: keep first benar, sisanya false
    let found = false;
    soal.opsi = soal.opsi.map((o) => {
      if (o.benar && !found) { found = true; return o; }
      return { ...o, benar: false };
    });
    if (!found) throw new Error("No correct option");
  }
  const kunciIdx = soal.opsi.findIndex((o) => o.benar);
  const variantGroup = `${sub.kode}-${contentHash(soal)}`;
  const id = createHash("sha256")
    .update(`${sub.kode}|${variantGroup}|${Date.now()}|${Math.random()}`)
    .digest("hex").slice(0, 24);
  const now = Date.now();

  const konten = {
    pertanyaan: soal.pertanyaan,
    opsi: soal.opsi.map((o) =>
      o.alasan !== undefined
        ? { teks: o.teks, benar: o.benar, alasan: o.alasan }
        : { teks: o.teks, benar: o.benar },
    ),
    kunci: kunciIdx,
  };
  if (soal.svg) konten.svg = soal.svg;

  // Clean meta: remove nulls (Firestore reject undefined; null OK tapi cleaner skip)
  const meta = {};
  if (soal.meta) {
    for (const [k, v] of Object.entries(soal.meta)) {
      if (v !== null && v !== undefined) meta[k] = v;
    }
  }

  return {
    id,
    subMateriKode: sub.kode,
    jalur: inferJalur(sub),
    area: sub.area,
    jenjang: sub.jenjang,
    kelas: sub.kelas,
    b: kelasToTheta(sub.kelas),
    a: DEFAULT_A,
    c: DEFAULT_C_MC4,
    format: "MC4",
    estimatedTimeSeconds: meta.expectedResponseTimeSec ?? DEFAULT_TIME_SECONDS,
    variantGroup,
    calibrationN: 0,
    isMilestone: sub.is_entry_point || (sub.dependents_count ?? 0) >= 3,
    isMaku: !!sub.is_maku,
    konten,
    source: "ai-generated",
    aiModel: MODEL,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

// === Run loop ===
let processedCount = 0;
let itemsCreated = 0;
let failedCount = 0;
let costTotal = 0;

// Sonnet 4.6 pricing (USD per 1M tokens)
const PRICING = { input: 3, output: 15, cache_read: 0.30, cache_write: 3.75 };
function calcCost(u) {
  return (u.input * PRICING.input + u.output * PRICING.output + u.cache_read * PRICING.cache_read + u.cache_write * PRICING.cache_write) / 1_000_000;
}

async function checkExistingCount(kode) {
  const snap = await db.collection("item_bank").where("subMateriKode", "==", kode).count().get();
  return snap.data().count;
}

const startTime = Date.now();

for (let i = 0; i < queue.length; i += concurrency) {
  const batch = queue.slice(i, i + concurrency);
  await Promise.all(batch.map(async (p) => {
    const sub = subByKode.get(p.kode);
    if (!sub) {
      console.log(`  ✗ ${p.kode}: not in peta`);
      failedCount++;
      return;
    }

    // Resume mode: re-check current count (someone else mungkin sudah seed)
    let needed = p.needed;
    if (resume) {
      const current = await checkExistingCount(p.kode);
      needed = Math.max(0, TARGET_COUNT - current);
      if (needed === 0) {
        console.log(`  ⊘ ${p.kode}: already ${current} items, skip`);
        return;
      }
    }

    try {
      const { soal, usage } = await generateBatch(sub, needed);
      const cost = calcCost(usage);
      costTotal += cost;

      const entries = [];
      let dropped = 0;
      for (const s of soal) {
        try {
          entries.push(buildEntry(s, sub));
        } catch (e) {
          dropped++;
        }
      }

      if (!dryRun && entries.length > 0) {
        const wb = db.batch();
        for (const e of entries) {
          wb.set(db.collection("item_bank").doc(e.id), e);
        }
        await wb.commit();
      }

      processedCount++;
      itemsCreated += entries.length;
      const cacheTag = usage.cache_read > 0 ? "🟢" : "⚪";
      console.log(`  ✓ ${p.kode.padEnd(15)} | +${entries.length}${dropped ? ` (-${dropped} dropped)` : ""} | ${cacheTag} $${cost.toFixed(4)} | ${sub.nama.slice(0, 50)}`);
    } catch (err) {
      failedCount++;
      console.log(`  ✗ ${p.kode}: ${(err.message ?? String(err)).slice(0, 100)}`);
    }
  }));

  // Progress + cost sanity check tiap 10 batch
  if (i > 0 && (i / concurrency) % 10 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`\n  📊 Progress: ${processedCount}/${queue.length} | items +${itemsCreated} | failed ${failedCount} | $${costTotal.toFixed(2)} | ${elapsed}s\n`);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
console.log(`\n=== DONE ===`);
console.log(`Processed: ${processedCount} subs`);
console.log(`Items created: ${itemsCreated}${dryRun ? " (DRY RUN, not saved)" : ""}`);
console.log(`Failed: ${failedCount}`);
console.log(`Total cost: $${costTotal.toFixed(2)}`);
console.log(`Elapsed: ${elapsed}s (${(elapsed / 60).toFixed(1)} min)`);

// Save run log
const logPath = resolve(import.meta.dirname, "..", `scripts/seed-batch-log-${Date.now()}.json`);
writeFileSync(logPath, JSON.stringify({
  startedAt: new Date(startTime).toISOString(),
  finishedAt: new Date().toISOString(),
  mode: dryRun ? "dry-run" : "live",
  filter: { jenjang: jenjangFilter, top },
  stats: { processed: processedCount, itemsCreated, failed: failedCount, costUSD: costTotal },
  elapsedSec: parseInt(elapsed, 10),
}, null, 2));
console.log(`Log: ${logPath}`);

process.exit(0);
