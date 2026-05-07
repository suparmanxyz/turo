/**
 * Backend module untuk balance-aware seeding — extracted dari
 * scripts/seed-item-bank-balance.mjs supaya bisa dipanggil dari API
 * (admin UI manual trigger) atau script CLI.
 *
 * Per call: process N sub (default 3-5 max) supaya fit dalam 5-min Vercel timeout.
 */

import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { getAdminDb } from "@/lib/firebase-admin";
import { itemsForSubMateri, type ItemBankEntry, type ItemPedagogyMetadata } from "@/lib/item-bank";
import { cariSubMateriResmi } from "@/data/peta-resmi";
import { PETA } from "@/data/peta-resmi";
import type { JenjangResmi } from "@/types";
import type { JalurDiagnostik } from "@/lib/item-bank";

const MODEL = "claude-sonnet-4-6";
const TARGET = { easy: 1, medium: 2, hard: 2 } as const;

const DEFAULT_A = 1.0;
const DEFAULT_C_MC4 = 0.20;
const DEFAULT_TIME_SECONDS = 90;

function kelasToTheta(kelas: number): number {
  return ((kelas - 6.5) / 5.5) * 3;
}

function inferJalur(sub: { jenjang: JenjangResmi; kelas: number; is_maku?: boolean }): JalurDiagnostik[] {
  const out: JalurDiagnostik[] = [];
  if (sub.jenjang === "SD") out.push(sub.kelas <= 3 ? "sd-k1-3" : "sd-k4-6");
  else if (sub.jenjang === "SMP") out.push("smp");
  else if (sub.jenjang === "SMA") {
    out.push("sma-reguler");
    if (sub.is_maku) out.push("sma-utbk");
  }
  return out;
}

function contentHash(soal: { pertanyaan: string; opsi: { teks: string }[] }): string {
  const sig = [soal.pertanyaan.trim(), ...soal.opsi.map((o) => o.teks.trim())].join("|");
  return createHash("sha256").update(sig).digest("hex").slice(0, 16);
}

const PRICING = { input: 3, output: 15, cache_read: 0.30, cache_write: 3.75 };
function calcCost(u: { input: number; output: number; cache_read: number; cache_write: number }): number {
  return (u.input * PRICING.input + u.output * PRICING.output + u.cache_read * PRICING.cache_read + u.cache_write * PRICING.cache_write) / 1_000_000;
}

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
- **easy**: prosedur langsung, 1-2 langkah, hafalan/aplikasi sederhana
- **medium**: aplikasi konsep, 2-4 langkah
- **hard**: multi-step (4+ langkah), analisis, strong distractor

Setiap soal HARUS punya meta lengkap (difficultyLabel, microskill, multiStep, analyticalSteps, reasoningQualityRequired, dll).`;

function buildUserPrompt(sub: { kode: string; nama: string; jenjang: string; kelas: number; area: string; is_maku?: boolean }, difficulty: string, count: number, avoidPertanyaan: string[] = []): string {
  const jenjangLabel = sub.jenjang === "SD"
    ? `SD K${sub.kelas}${sub.kelas <= 3 ? " (bahasa anak konkret)" : ""}`
    : sub.jenjang === "SMP" ? `SMP K${sub.kelas}`
    : `SMA K${sub.kelas}${sub.is_maku ? " (Materi Kunci UTBK)" : ""}`;
  const avoidNote = avoidPertanyaan.length > 0
    ? `\n\nHINDARI variasi yang mirip dengan pertanyaan berikut (sudah ada di bank):\n${avoidPertanyaan.slice(0, 5).map((p, i) => `${i + 1}. "${p.slice(0, 100)}..."`).join("\n")}\nBuat variasi MENYELURUH (beda angka, konteks, strategi).`
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
        { "teks": "...", "benar": true, "alasan": "..." },
        { "teks": "...", "benar": false, "alasan": "miskonsepsi: ..." },
        { "teks": "...", "benar": false, "alasan": "miskonsepsi: ..." }
      ],
      "svg": "<svg ...>...</svg>",
      "meta": { ...pedagogy fields dengan difficultyLabel="${difficulty}"... }
    }
  ]
}`;
}

async function generateBatch(sub: ReturnType<typeof cariSubMateriResmi>, difficulty: string, count: number, avoidPertanyaan: string[] = [], retries = 2): Promise<{ soal: Array<{ pertanyaan: string; opsi: Array<{ teks: string; benar: boolean; alasan?: string }>; svg?: string; meta?: Record<string, unknown> }>; usage: { input: number; output: number; cache_read: number; cache_write: number } }> {
  if (!sub) throw new Error("sub null");
  const client = new Anthropic();
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system: [{ type: "text", text: SYSTEM_INSTRUCTION, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: buildUserPrompt(sub, difficulty, count, avoidPertanyaan) }],
      });
      const text = response.content.filter((b) => b.type === "text").map((b) => "text" in b ? b.text : "").join("");
      let parsed: { soal?: unknown };
      try { parsed = JSON.parse(text); }
      catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
        else throw new Error(`Cannot parse: ${text.slice(0, 200)}`);
      }
      if (!Array.isArray(parsed.soal)) throw new Error("Missing soal array");
      return {
        soal: parsed.soal as Array<{ pertanyaan: string; opsi: Array<{ teks: string; benar: boolean; alasan?: string }>; svg?: string; meta?: Record<string, unknown> }>,
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
  throw new Error("Unreachable");
}

function buildEntry(soal: { pertanyaan: string; opsi: Array<{ teks: string; benar: boolean; alasan?: string }>; svg?: string; meta?: Record<string, unknown> }, sub: NonNullable<ReturnType<typeof cariSubMateriResmi>>, requestedDifficulty: string): ItemBankEntry {
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
  const konten: ItemBankEntry["konten"] = {
    pertanyaan: soal.pertanyaan,
    opsi: soal.opsi.map((o) => o.alasan !== undefined ? { teks: o.teks, benar: o.benar, alasan: o.alasan } : { teks: o.teks, benar: o.benar }),
    kunci: kunciIdx,
  };
  if (soal.svg) konten.svg = soal.svg;
  const meta: Record<string, unknown> = {};
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
    estimatedTimeSeconds: typeof meta.expectedResponseTimeSec === "number" ? meta.expectedResponseTimeSec : DEFAULT_TIME_SECONDS,
    variantGroup,
    calibrationN: 0,
    isMilestone: sub.is_entry_point || (sub.dependents_count ?? 0) >= 3,
    isMaku: !!sub.is_maku,
    konten, source: "ai-generated", aiModel: MODEL,
    meta: meta as ItemPedagogyMetadata,
    createdAt: now, updatedAt: now,
  };
}

export type SeedSubResult = {
  kode: string;
  nama: string;
  added: number;
  dropped: number;
  cost: number;
  error?: string;
  needed: { easy: number; medium: number; hard: number };
};

/** Audit gap difficulty per sub. Return priority list sorted by importance. */
export type BalanceGap = {
  kode: string;
  nama: string;
  jenjang: string;
  kelas: number;
  is_maku: boolean;
  dependents_count: number;
  current: { easy: number; medium: number; hard: number; total: number };
  needed: { easy: number; medium: number; hard: number };
  totalNeeded: number;
  priorityScore: number;
};

export async function auditBalanceGap(): Promise<{ priority: BalanceGap[]; summary: { totalSubs: number; subsNeed: number; itemsNeeded: number; byDiff: { easy: number; medium: number; hard: number } } }> {
  const db = getAdminDb();
  const snap = await db.collection("item_bank").get();
  const subStats = new Map<string, { easy: number; medium: number; hard: number; untagged: number; total: number }>();
  for (const doc of snap.docs) {
    const d = doc.data();
    const kode = d.subMateriKode;
    const diff = d.meta?.difficultyLabel ?? "untagged";
    if (!subStats.has(kode)) subStats.set(kode, { easy: 0, medium: 0, hard: 0, untagged: 0, total: 0 });
    const s = subStats.get(kode)!;
    s.total++;
    s[diff as "easy" | "medium" | "hard" | "untagged"]++;
  }

  const priority: BalanceGap[] = [];
  let totalNeeded = 0;
  const byDiff = { easy: 0, medium: 0, hard: 0 };
  for (const sub of PETA.submateri) {
    const c = subStats.get(sub.kode) ?? { easy: 0, medium: 0, hard: 0, untagged: 0, total: 0 };
    const effE = c.easy;
    const effM = c.medium + c.untagged;
    const effH = c.hard;
    const needE = Math.max(0, TARGET.easy - effE);
    const needM = Math.max(0, TARGET.medium - effM);
    const needH = Math.max(0, TARGET.hard - effH);
    const need = needE + needM + needH;
    if (need === 0) continue;
    priority.push({
      kode: sub.kode, nama: sub.nama, jenjang: sub.jenjang, kelas: sub.kelas,
      is_maku: !!sub.is_maku,
      dependents_count: sub.dependents_count ?? 0,
      current: { easy: effE, medium: effM, hard: effH, total: c.total },
      needed: { easy: needE, medium: needM, hard: needH },
      totalNeeded: need,
      priorityScore: (sub.is_maku ? 1000 : 0) + (sub.dependents_count ?? 0) * 10 + need,
    });
    totalNeeded += need;
    byDiff.easy += needE;
    byDiff.medium += needM;
    byDiff.hard += needH;
  }
  priority.sort((a, b) => b.priorityScore - a.priorityScore);
  return {
    priority,
    summary: { totalSubs: PETA.submateri.length, subsNeed: priority.length, itemsNeeded: totalNeeded, byDiff },
  };
}

/**
 * Seed N subs. Per sub: generate items per difficulty gap.
 * Return per-sub result + total stats.
 *
 * Constraint: max 5 subs per call supaya fit dalam Vercel 5-min timeout.
 */
export async function seedSubsBalance(kodes: string[], onProgress?: (msg: string) => void): Promise<{
  results: SeedSubResult[];
  totals: { added: number; dropped: number; failed: number; cost: number };
}> {
  const results: SeedSubResult[] = [];
  const totals = { added: 0, dropped: 0, failed: 0, cost: 0 };
  const db = getAdminDb();

  for (const kode of kodes) {
    const sub = cariSubMateriResmi(kode);
    if (!sub) {
      totals.failed++;
      results.push({ kode, nama: "?", added: 0, dropped: 0, cost: 0, needed: { easy: 0, medium: 0, hard: 0 }, error: "Sub kode tidak ditemukan di peta" });
      continue;
    }
    try {
      // Hitung needed per difficulty
      const existing = await itemsForSubMateri(kode);
      const counts = { easy: 0, medium: 0, hard: 0, untagged: 0 };
      for (const it of existing) {
        const d = (it.meta?.difficultyLabel ?? "untagged") as keyof typeof counts;
        counts[d]++;
      }
      const effE = counts.easy;
      const effM = counts.medium + counts.untagged;
      const effH = counts.hard;
      const needed = {
        easy: Math.max(0, TARGET.easy - effE),
        medium: Math.max(0, TARGET.medium - effM),
        hard: Math.max(0, TARGET.hard - effH),
      };
      if (needed.easy + needed.medium + needed.hard === 0) {
        results.push({ kode, nama: sub.nama, added: 0, dropped: 0, cost: 0, needed });
        continue;
      }

      const existingHashes = new Set(existing.map((it) => it.variantGroup).filter(Boolean));
      const existingPertanyaan = existing.map((it) => it.konten?.pertanyaan).filter(Boolean) as string[];

      const allEntries: ItemBankEntry[] = [];
      let subCost = 0;
      let subDropped = 0;

      for (const diff of ["easy", "medium", "hard"] as const) {
        const need = needed[diff];
        if (need === 0) continue;
        onProgress?.(`${kode}: generating ${need} ${diff}...`);
        const { soal, usage } = await generateBatch(sub, diff, need, existingPertanyaan);
        subCost += calcCost(usage);
        for (const s of soal) {
          try {
            const entry = buildEntry(s, sub, diff);
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

      if (allEntries.length > 0) {
        const wb = db.batch();
        for (const e of allEntries) wb.set(db.collection("item_bank").doc(e.id), e);
        await wb.commit();
      }

      totals.added += allEntries.length;
      totals.dropped += subDropped;
      totals.cost += subCost;
      results.push({ kode, nama: sub.nama, added: allEntries.length, dropped: subDropped, cost: subCost, needed });
      onProgress?.(`${kode}: +${allEntries.length} items, $${subCost.toFixed(4)}`);
    } catch (e) {
      totals.failed++;
      results.push({ kode, nama: sub.nama, added: 0, dropped: 0, cost: 0, needed: { easy: 0, medium: 0, hard: 0 }, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return { results, totals };
}
