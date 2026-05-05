// Batch enrich items di item_bank Firestore dengan metadata pedagogis lengkap.
// Pakai Claude Sonnet 4.6 + prompt caching untuk efisiensi cost.
//
// Output: update item.meta dengan field lengkap untuk Mathematical Maturity scoring.
//
// Usage:
//   node scripts/enrich-item-metadata.mjs                  # all items missing required fields
//   node scripts/enrich-item-metadata.mjs --kode SD.6.B1   # filter prefix kode
//   node scripts/enrich-item-metadata.mjs --limit 50       # batch terbatas
//   node scripts/enrich-item-metadata.mjs --dry-run        # tidak write Firestore
//   node scripts/enrich-item-metadata.mjs --force          # re-tag walau sudah lengkap

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import admin from "firebase-admin";

// Load .env.local
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

// Init Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});
const db = admin.firestore();

const client = new Anthropic();
const MODEL = "claude-sonnet-4-6";

// CLI args
const args = process.argv.slice(2);
const filterKode = args.includes("--kode") ? args[args.indexOf("--kode") + 1] : null;
const limit = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1], 10) : Infinity;
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");

const REQUIRED_FIELDS = ["difficultyLabel", "microskill", "multiStep", "reasoningQualityRequired"];

const SYSTEM_INSTRUCTION = `Anda adalah ahli pedagogi matematika. Tugas Anda: analisis soal matematika dan tagging metadata pedagogis lengkap untuk sistem diagnostik IRT + Mathematical Maturity scoring.

Untuk setiap soal, Anda harus generate JSON metadata berikut:

{
  "difficultyLabel": "easy" | "medium" | "hard",
  "microskill": "<sub-skill spesifik, contoh: 'substitusi_langsung', 'faktor_sederhana', 'pola_aritmatika'>",
  "subConcept": "<sub-konsep detail dalam kalimat singkat, e.g. 'Substitusi Nilai dalam Persamaan Linear'>",
  "multiStep": true | false,
  "analyticalSteps": <integer 1-5, jumlah langkah analitis dibutuhkan>,
  "reasoningQualityRequired": <integer 1-4, 1=hafalan/prosedural, 2=aplikasi, 3=analisis, 4=analisis kreatif/sintesis>,
  "requiresManipulation": true | false,
  "abstractQuestion": true | false,
  "readingHeavy": true | false,
  "intuitiveLeap": true | false,
  "strongDistractor": true | false,
  "questionCondition": <integer 1-5, jumlah kondisi/syarat di soal>,
  "expectedResponseTimeSec": <integer detik, perkiraan waktu jawab — easy:30-60, medium:60-120, hard:120-240>,
  "patternType": "<jenis pola, e.g. 'pattern_aritmatika', 'pattern_grafik_sin'> atau null kalau tidak relevan",
  "transferType": "<jenis transfer konsep, e.g. 'transfer_komposisi', 'transfer_kontekstual'> atau null"
}

Aturan:
- difficultyLabel: easy = procedural langsung, medium = aplikasi konsep, hard = analisis multi-konsep
- microskill: gunakan snake_case, spesifik untuk soal
- multiStep: true kalau butuh > 1 langkah penyelesaian
- analyticalSteps: hitung langkah dari read soal → final answer
- reasoningQuality: 1 hafal, 2 apply, 3 analyze, 4 create
- requiresManipulation: true kalau butuh transformasi simbolik aljabar
- abstractQuestion: true kalau soal abstract (tanpa konteks dunia nyata)
- readingHeavy: true kalau soal panjang dengan banyak narasi
- intuitiveLeap: true kalau butuh insight non-prosedural
- strongDistractor: true kalau pengecoh dirancang menyerupai jawaban benar
- questionCondition: berapa syarat/kondisi yang harus dipenuhi
- expectedResponseTimeSec: realistic per difficulty

Output WAJIB JSON valid (no markdown wrap), single object.`;

async function enrichOne(item, retries = 2) {
  const userPrompt = `Analisis soal ini dan generate metadata pedagogis lengkap.

Sub-materi: ${item.subMateriKode} (${item.jenjang} K${item.kelas}, area: ${item.area})

Pertanyaan:
${item.konten.pertanyaan}

Pilihan jawaban:
${item.konten.opsi.map((o, i) => `${String.fromCharCode(65 + i)}. ${o.teks}${o.benar ? " ✓" : ""}`).join("\n")}

${item.konten.pembahasan ? `Pembahasan:\n${item.konten.pembahasan}\n` : ""}

Return JSON metadata.`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 800,
        system: [{ type: "text", text: SYSTEM_INSTRUCTION, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt }],
      });
      const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      let parsed;
      try { parsed = JSON.parse(text); }
      catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
        else throw new Error(`Cannot parse: ${text.slice(0, 200)}`);
      }
      // Clean nulls (Firestore doesn't allow undefined)
      for (const k of Object.keys(parsed)) {
        if (parsed[k] === null) delete parsed[k];
      }
      return {
        meta: parsed,
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

function hasRequiredFields(item) {
  if (!item.meta) return false;
  return REQUIRED_FIELDS.every((f) => {
    const v = item.meta[f];
    return v !== undefined && v !== null && v !== "";
  });
}

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"} · Force: ${force} · Filter: ${filterKode ?? "all"} · Limit: ${limit === Infinity ? "no limit" : limit}`);

  let q = db.collection("item_bank");
  if (filterKode) q = q.where("subMateriKode", ">=", filterKode).where("subMateriKode", "<", filterKode + "￿");
  const snap = await q.get();
  console.log(`Loaded ${snap.size} items from Firestore`);

  const allItems = snap.docs.map((d) => ({ ref: d.ref, data: d.data() }));
  const todo = force ? allItems : allItems.filter(({ data }) => !hasRequiredFields(data));
  const toProcess = todo.slice(0, limit);
  console.log(`Need enrichment: ${todo.length}, processing: ${toProcess.length}\n`);

  if (toProcess.length === 0) {
    console.log("Nothing to do. ✓");
    return;
  }

  let success = 0, failed = 0, costTotal = 0;
  const concurrency = 3;
  for (let i = 0; i < toProcess.length; i += concurrency) {
    const batch = toProcess.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async ({ ref, data }) => {
        try {
          const result = await enrichOne(data);
          return { ref, item: data, ...result };
        } catch (err) {
          return { ref, item: data, error: err.message };
        }
      }),
    );
    for (const r of results) {
      if (r.error) {
        console.log(`  ✗ ${r.item.subMateriKode}/${r.item.id.slice(0, 8)}: ${r.error.slice(0, 80)}`);
        failed++;
        continue;
      }
      // Sonnet 4.6 cost
      const u = r.usage;
      const cost = (u.input * 3 + u.output * 15 + u.cache_write * 3 * 1.25 + u.cache_read * 3 * 0.1) / 1_000_000;
      costTotal += cost;
      const newMeta = { ...(r.item.meta ?? {}), ...r.meta };
      console.log(`  ✓ ${r.item.subMateriKode}/${r.item.id.slice(0, 8)}: ${newMeta.difficultyLabel}, ${newMeta.microskill}, multiStep=${newMeta.multiStep}, RQ=${newMeta.reasoningQualityRequired}`);
      if (!dryRun) {
        await r.ref.update({ meta: newMeta, updatedAt: Date.now() });
      }
      success++;
    }
  }

  console.log(`\nDone: ${success} success, ${failed} failed`);
  console.log(`Total cost: $${costTotal.toFixed(4)}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
