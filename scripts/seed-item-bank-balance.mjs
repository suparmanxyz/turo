// Balance-aware seeding: generate items dengan difficulty SPESIFIK sesuai gap
// per sub. Target distribusi: 1 Easy + 2 Medium + 2 Hard = 5 items per sub.
//
// Input: scripts/seed-balance-priority.json (dari audit-balance-gap.mjs)
// Output: write items baru ke Firestore item_bank.
//
// Usage:
//   node scripts/seed-item-bank-balance.mjs                       # full batch
//   node scripts/seed-item-bank-balance.mjs --top 30              # top 30 priority
//   node scripts/seed-item-bank-balance.mjs --jenjang SMA         # filter
//   node scripts/seed-item-bank-balance.mjs --dry-run             # tidak save
//   node scripts/seed-item-bank-balance.mjs --concurrency 4       # parallel

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

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) });
const db = admin.firestore();
const client = new Anthropic();

const MODEL = "claude-sonnet-4-6";

const args = process.argv.slice(2);
const argVal = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
const top = argVal("--top") ? parseInt(argVal("--top"), 10) : Infinity;
const jenjangFilter = argVal("--jenjang");
const dryRun = args.includes("--dry-run");
const concurrency = argVal("--concurrency") ? parseInt(argVal("--concurrency"), 10) : 3;

const peta = JSON.parse(readFileSync(resolve(import.meta.dirname, "..", "src/data/peta-prasyarat.json"), "utf8"));
const subByKode = new Map(peta.submateri.map((s) => [s.kode, s]));

const priorityFile = resolve(import.meta.dirname, "..", "scripts/seed-balance-priority.json");
if (!existsSync(priorityFile)) {
  console.error(`Run: node scripts/audit-balance-gap.mjs first`);
  process.exit(1);
}
const priority = JSON.parse(readFileSync(priorityFile, "utf8"));

let queue = priority.priorityList;
if (jenjangFilter) queue = queue.filter((p) => p.jenjang === jenjangFilter);
queue = queue.slice(0, top);

console.log(`\n=== BALANCE SEEDING ===`);
console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"} · Concurrency: ${concurrency}`);
console.log(`Filter: jenjang=${jenjangFilter ?? "all"} · top=${top === Infinity ? "all" : top}`);
console.log(`Queue: ${queue.length} sub-materi\n`);

// === IRT params ===
const DEFAULT_A = 1.0;
const DEFAULT_C_MC4 = 0.20;
const DEFAULT_TIME_SECONDS = 90;

function kelasToTheta(kelas) {
  return ((kelas - 6.5) / 5.5) * 3;
}
function inferJalur(sub) {
  const out = [];
  if (sub.jenjang === "SD") out.push(sub.kelas <= 3 ? "sd-k1-3" : "sd-k4-6");
  else if (sub.jenjang === "SMP") out.push("smp");
  else if (sub.jenjang === "SMA") {
    out.push("sma-reguler");
    if (sub.is_maku) out.push("sma-utbk");
  }
  return out;
}
function contentHash(soal) {
  const sig = [soal.pertanyaan.trim(), ...soal.opsi.map((o) => o.teks.trim())].join("|");
  return createHash("sha256").update(sig).digest("hex").slice(0, 16);
}

// === Load existing variantGroups untuk dedup ===
async function loadExistingHashes(subKode) {
  const snap = await db.collection("item_bank").where("subMateriKode", "==", subKode).get();
  const hashes = new Set();
  for (const doc of snap.docs) {
    const v = doc.data().variantGroup;
    if (v) hashes.add(v);
  }
  return hashes;
}

// === Prompt — generate items dengan difficulty SPESIFIK ===
const SYSTEM_INSTRUCTION = `Anda ahli pedagogi matematika. Tugas: generate soal pilihan ganda MC4 dengan tingkat kesulitan SPESIFIK (easy/medium/hard) untuk diagnostik IRT + meta pedagogis.

Aturan:
- 4 opsi (A/B/C/D), PERSIS 1 benar.
- Distractor merepresentasikan miskonsepsi spesifik (BUKAN angka acak).
- Setiap opsi sertakan field "alasan":
  * BENAR: alasan singkat mengapa benar.
  * SALAH: miskonsepsi spesifik yang menyebabkan siswa pilih opsi ini.
- LaTeX $...$ untuk rumus, escape backslash double ($\\\\frac{1}{2}$).
- Geometri/grafik: sertakan "svg" self-contained, viewBox max 400px. Hilangkan kalau tidak perlu.
- Output HANYA JSON murni, tanpa code fence.

PENTING — patuhi tingkat kesulitan yang diminta:
- **easy**: prosedur langsung, 1-2 langkah, hafalan/aplikasi sederhana, distractor obvious miss
- **medium**: aplikasi konsep, 2-4 langkah, butuh pemahaman, distractor masuk akal
- **hard**: multi-step (4+ langkah), butuh insight/analisis, distractor sangat menyerupai jawaban benar (strong distractor)

Setiap soal HARUS punya meta:
{
  "difficultyLabel": "<harus sama dengan permintaan>",
  "microskill": "<sub-skill snake_case>",
  "subConcept": "<sub-konsep singkat>",
  "multiStep": <bool, true untuk hard biasanya>,
  "analyticalSteps": <integer 1-5>,
  "reasoningQualityRequired": <integer 1-4, easy=1-2, medium=2-3, hard=3-4>,
  "requiresManipulation": <bool>,
  "abstractQuestion": <bool>,
  "readingHeavy": <bool>,
  "intuitiveLeap": <bool, true terutama untuk hard>,
  "strongDistractor": <bool, true terutama untuk hard>,
  "questionCondition": <integer 1-5>,
  "expectedResponseTimeSec": <integer, easy:30-60, medium:60-120, hard:120-240>,
  "patternType": "<jenis atau null>",
  "transferType": "<jenis atau null>"
}`;

function buildUserPrompt(sub, difficulty, count, avoidContent = []) {
  const jenjangLabel = sub.jenjang === "SD"
    ? `SD K${sub.kelas}${sub.kelas <= 3 ? " (bahasa anak: konkret, ortu/teman)" : ""}`
    : sub.jenjang === "SMP" ? `SMP K${sub.kelas}`
    : `SMA K${sub.kelas}${sub.is_maku ? " (Materi Kunci UTBK)" : ""}`;

  const avoidNote = avoidContent.length > 0
    ? `\n\nHINDARI variasi yang mirip dengan pertanyaan berikut (ini sudah ada di bank):\n${avoidContent.slice(0, 5).map((p, i) => `${i + 1}. "${p.slice(0, 100)}..."`).join("\n")}\nBuat variasi MENYELURUH (beda angka, konteks, strategi).`
    : "";

  return `Generate ${count} soal pilihan ganda dengan tingkat kesulitan **${difficulty.toUpperCase()}** untuk:

Kode: ${sub.kode}
Nama: ${sub.nama}
Jenjang: ${jenjangLabel}
Area: ${sub.area}
${avoidNote}

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
      "meta": { ...pedagogy fields dengan difficultyLabel="${difficulty}"... }
    }
  ]
}`;
}

async function generateBatch(sub, difficulty, count, existingPertanyaanList = [], retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system: [{ type: "text", text: SYSTEM_INSTRUCTION, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: buildUserPrompt(sub, difficulty, count, existingPertanyaanList) }],
      });
      const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      let parsed;
      try { parsed = JSON.parse(text); }
      catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
        else throw new Error(`Cannot parse: ${text.slice(0, 200)}`);
      }
      if (!Array.isArray(parsed.soal)) throw new Error("Missing soal array");
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
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1))); continue;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000)); continue;
      }
      throw err;
    }
  }
}

function buildEntry(soal, sub, requestedDifficulty) {
  const benarCount = soal.opsi.filter((o) => o.benar).length;
  if (benarCount !== 1) {
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
    opsi: soal.opsi.map((o) => o.alasan !== undefined ? { teks: o.teks, benar: o.benar, alasan: o.alasan } : { teks: o.teks, benar: o.benar }),
    kunci: kunciIdx,
  };
  if (soal.svg) konten.svg = soal.svg;
  // Force difficultyLabel match request (anti-AI override)
  const meta = {};
  if (soal.meta) {
    for (const [k, v] of Object.entries(soal.meta)) {
      if (v !== null && v !== undefined) meta[k] = v;
    }
  }
  meta.difficultyLabel = requestedDifficulty;

  return {
    id, subMateriKode: sub.kode, jalur: inferJalur(sub), area: sub.area,
    jenjang: sub.jenjang, kelas: sub.kelas,
    b: kelasToTheta(sub.kelas), a: DEFAULT_A, c: DEFAULT_C_MC4,
    format: "MC4",
    estimatedTimeSeconds: meta.expectedResponseTimeSec ?? DEFAULT_TIME_SECONDS,
    variantGroup,
    calibrationN: 0,
    isMilestone: sub.is_entry_point || (sub.dependents_count ?? 0) >= 3,
    isMaku: !!sub.is_maku,
    konten, source: "ai-generated", aiModel: MODEL,
    meta, createdAt: now, updatedAt: now,
  };
}

// === Pricing Sonnet 4.6 ===
const PRICING = { input: 3, output: 15, cache_read: 0.30, cache_write: 3.75 };
function calcCost(u) {
  return (u.input * PRICING.input + u.output * PRICING.output + u.cache_read * PRICING.cache_read + u.cache_write * PRICING.cache_write) / 1_000_000;
}

let processedCount = 0, itemsCreated = 0, failedCount = 0, costTotal = 0;
const startTime = Date.now();

for (let i = 0; i < queue.length; i += concurrency) {
  const batch = queue.slice(i, i + concurrency);
  await Promise.all(batch.map(async (p) => {
    const sub = subByKode.get(p.kode);
    if (!sub) { failedCount++; return; }

    try {
      // Load existing items untuk variantGroup dedup + pertanyaan list untuk avoid prompt
      const existingHashes = await loadExistingHashes(p.kode);
      const existingSnap = await db.collection("item_bank").where("subMateriKode", "==", p.kode).get();
      const existingPertanyaan = existingSnap.docs.map(d => d.data().konten?.pertanyaan).filter(Boolean);

      const allEntries = [];
      let subCost = 0;
      let subDropped = 0;

      // Generate per difficulty yang missing
      for (const diff of ["easy", "medium", "hard"]) {
        const need = p.needed[diff];
        if (need === 0) continue;

        const { soal, usage } = await generateBatch(sub, diff, need, existingPertanyaan);
        subCost += calcCost(usage);

        for (const s of soal) {
          try {
            const entry = buildEntry(s, sub, diff);
            // Dedup variantGroup
            if (existingHashes.has(entry.variantGroup)) {
              subDropped++;
              continue;
            }
            allEntries.push(entry);
            existingHashes.add(entry.variantGroup);
          } catch {
            subDropped++;
          }
        }
      }

      if (!dryRun && allEntries.length > 0) {
        const wb = db.batch();
        for (const e of allEntries) wb.set(db.collection("item_bank").doc(e.id), e);
        await wb.commit();
      }

      processedCount++;
      itemsCreated += allEntries.length;
      costTotal += subCost;
      const dropTag = subDropped > 0 ? ` -${subDropped}dup` : "";
      console.log(`  ✓ ${p.kode.padEnd(15)} | E:${p.needed.easy} M:${p.needed.medium} H:${p.needed.hard} → +${allEntries.length}${dropTag} | $${subCost.toFixed(4)} | ${sub.nama.slice(0, 50)}`);
    } catch (err) {
      failedCount++;
      console.log(`  ✗ ${p.kode}: ${(err.message ?? String(err)).slice(0, 100)}`);
    }
  }));

  if (i > 0 && (i / concurrency) % 10 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`\n  📊 ${processedCount}/${queue.length} | items +${itemsCreated} | failed ${failedCount} | $${costTotal.toFixed(2)} | ${elapsed}s\n`);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
console.log(`\n=== DONE ===`);
console.log(`Processed: ${processedCount} subs | Items created: ${itemsCreated}${dryRun ? " (DRY)" : ""} | Failed: ${failedCount}`);
console.log(`Cost: $${costTotal.toFixed(2)} | Elapsed: ${elapsed}s (${(elapsed / 60).toFixed(1)} min)`);

const logPath = resolve(import.meta.dirname, "..", `scripts/seed-balance-log-${Date.now()}.json`);
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
