/**
 * Item Bank — schema + Firestore CRUD untuk diagnostik IRT-driven.
 *
 * Sumber: SRS-Turo-Diagnostik.md Section 7.1-7.3
 *
 * Struktur:
 *   - Collection: `item_bank`
 *   - Doc id: hash dari (subMateriKode + variantGroup + signature konten)
 *   - Setiap item: konten (soal+opsi+kunci) + IRT params (b/a/c) + metadata
 *
 * Bootstrap flow:
 *   1. AI generate soal (existing soal-pool) → SoalMc
 *   2. seedItemFromSoalMc(soal, opts) → ItemBankEntry (default IRT params)
 *   3. Save ke Firestore via saveItem()
 *   4. Diagnostic engine (B3+) ambil item via query
 *   5. Tiap response → akumulasi calibration_n, recalibrate periodik (B-later)
 */

import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { cariSubMateriResmi, subMateriPerArea, subMateriPerKelas } from "@/data/peta-resmi";
import { kelasToTheta } from "@/lib/irt-engine";
import type { SoalMc } from "@/lib/diagnostic";
import type { AreaMatematika, JenjangResmi, SubMateriResmi } from "@/types";

/** 5 jalur diagnostik (SRS Section 4.1). */
export type JalurDiagnostik = "sd-k1-3" | "sd-k4-6" | "smp" | "sma-reguler" | "sma-utbk";

/** Format soal di item bank. */
export type ItemFormat = "MC4" | "MC5" | "ISIAN_SINGKAT";

/** Difficulty label sesuai Integral spec — komplemen IRT b parameter. */
export type DifficultyLabel = "easy" | "medium" | "hard";

/**
 * Metadata pedagogis untuk pemilihan soal di Phase 2 drilling.
 * Sesuai Integral spec Table 1 & 2 — dipakai untuk:
 *   - Phase 2 drilling: Easy/Medium/Hard mix per LANGKAH
 *   - Adaptive confirmation tier: pilih difficulty progresif
 *   - Anti-luck: detect strong distractors yang bedakan mastery vs guess
 */
export type ItemPedagogyMetadata = {
  /** Easy / Medium / Hard — independent dari IRT b. */
  difficultyLabel?: DifficultyLabel;
  /** Sub-skill spesifik (e.g. "substitusi_langsung", "faktor_sederhana"). */
  microskill?: string;
  /** Sub-konsep detail (e.g. "Substitusi Nilai"). */
  subConcept?: string;
  /** Pengecoh kuat (boolean) — distractor yang menyerupai jawaban benar. */
  strongDistractor?: boolean;
  /** Soal multi-langkah (perlu reasoning bertingkat). */
  multiStep?: boolean;
  /** Jumlah langkah analitis 1-5. */
  analyticalSteps?: number;
  /** Memerlukan intuitive leap (insight tidak procedural). */
  intuitiveLeap?: boolean;
  /** Memerlukan manipulasi simbolik. */
  requiresManipulation?: boolean;
  /** Bersifat abstrak (bukan kontekstual). */
  abstractQuestion?: boolean;
  /** Reading-heavy (perlu interpretasi bacaan). */
  readingHeavy?: boolean;
  /** Jumlah kondisi/syarat di soal 1-5. */
  questionCondition?: number;
  /** Estimasi waktu respons (detik). */
  expectedResponseTimeSec?: number;
  /** Kualitas reasoning yang dibutuhkan 1-4 (1=hafalan, 4=analisis kreatif). */
  reasoningQualityRequired?: number;
  /** Pattern type untuk pengelompokan (e.g. "pattern_grafik_sin"). */
  patternType?: string;
  /** Jenis transfer konsep (e.g. "transfer_komposisi"). */
  transferType?: string;
  /** Score per option untuk partial credit (A/B/C/D, 0-4). */
  scorePerOption?: number[];
};

/** Default IRT params untuk item baru sebelum dikalibrasi. */
const DEFAULT_A = 1.0;
const DEFAULT_C_MC4 = 0.25;
const DEFAULT_C_MC5 = 0.20;
const DEFAULT_C_ISIAN = 0.05;
const DEFAULT_TIME_SECONDS = 90;

/**
 * Item lengkap di item bank Firestore.
 * Konten dipisah dari IRT params supaya kalibrasi bisa update params tanpa rewrite konten.
 */
export type ItemBankEntry = {
  id: string;
  subMateriKode: string;
  jalur: JalurDiagnostik[];
  area: AreaMatematika;
  jenjang: JenjangResmi;
  kelas: number;
  /** IRT 2PL/3PL params. */
  b: number;
  a: number;
  c: number;
  format: ItemFormat;
  estimatedTimeSeconds: number;
  /** Group dari item-item ekuivalen (variant) — untuk anti-bocor. */
  variantGroup: string;
  /** Jumlah response yang sudah masuk (untuk kalibrasi). */
  calibrationN: number;
  /** Apakah konsep utama (milestone) di pohon prasyarat. */
  isMilestone: boolean;
  /** Apakah Materi Kunci (MAKU) sesuai peta resmi. */
  isMaku: boolean;
  /** Konten soal MC. */
  konten: {
    pertanyaan: string;
    opsi: { teks: string; benar: boolean; alasan?: string }[];
    /** Index opsi yang benar (0-based). */
    kunci: number;
    pembahasan?: string;
    svg?: string;
  };
  /** Source untuk audit. */
  source: "ai-generated" | "manual" | "imported";
  /** Model AI yang dipakai (untuk audit kualitas). e.g. "claude-sonnet-4-6", "claude-opus-4-7". */
  aiModel?: string;
  /** Metadata pedagogis untuk Phase 2 drilling (Integral spec). */
  meta?: ItemPedagogyMetadata;
  createdAt: number;
  updatedAt: number;
};

// ============================================================
// Default IRT params dari peta resmi
// ============================================================

/**
 * Default difficulty (b) berdasarkan kelas sub-materi.
 * Kelas 1 → b ≈ -3, Kelas 6.5 → b = 0, Kelas 12 → b ≈ +3.
 */
export function defaultDifficulty(sub: SubMateriResmi): number {
  return kelasToTheta(sub.kelas);
}

/** Default discrimination (a). 1.0 = medium. Naikkan kalau item terkalibrasi punya a tinggi. */
export function defaultDiscrimination(_sub: SubMateriResmi): number {
  return DEFAULT_A;
}

/** Default pseudo-guessing (c) berdasarkan format. */
export function defaultGuessing(format: ItemFormat): number {
  if (format === "MC4") return DEFAULT_C_MC4;
  if (format === "MC5") return DEFAULT_C_MC5;
  return DEFAULT_C_ISIAN;
}

// ============================================================
// Adapter: SoalMc (dari pool AI) → ItemBankEntry
// ============================================================

/** Hash konten soal untuk dedup variant. */
function contentHash(soal: SoalMc): string {
  const sig = [
    soal.pertanyaan.trim(),
    ...soal.opsi.map((o) => o.teks.trim()),
  ].join("|");
  return createHash("sha256").update(sig).digest("hex").slice(0, 16);
}

/** Inferensikan jalur diagnostik default dari sub-materi. */
export function inferJalur(sub: SubMateriResmi): JalurDiagnostik[] {
  const out: JalurDiagnostik[] = [];
  if (sub.jenjang === "SD") {
    if (sub.kelas <= 3) out.push("sd-k1-3");
    else out.push("sd-k4-6");
  } else if (sub.jenjang === "SMP") {
    out.push("smp");
  } else if (sub.jenjang === "SMA") {
    out.push("sma-reguler");
    // MAKU SMA juga relevan untuk UTBK
    if (sub.is_maku) out.push("sma-utbk");
  }
  return out;
}

/**
 * Bangun ItemBankEntry dari SoalMc + sub-materi kode.
 * Default IRT params di-derive dari peta resmi.
 *
 * Throws kalau sub-materi tidak ditemukan atau opsi tidak valid.
 */
export function seedItemFromSoalMc(
  soal: SoalMc,
  opts: {
    subMateriKode: string;
    format?: ItemFormat;
    source?: ItemBankEntry["source"];
    aiModel?: string;
    meta?: ItemPedagogyMetadata;
  },
): ItemBankEntry {
  const sub = cariSubMateriResmi(opts.subMateriKode);
  if (!sub) throw new Error(`Sub-materi ${opts.subMateriKode} tidak ditemukan di peta resmi`);

  const kunciIdx = soal.opsi.findIndex((o) => o.benar);
  if (kunciIdx < 0) throw new Error(`Soal tidak punya kunci jawaban`);

  const format: ItemFormat = opts.format ?? (soal.opsi.length === 5 ? "MC5" : "MC4");
  const variantGroup = `${sub.kode}-${contentHash(soal)}`;
  const id = createHash("sha256")
    .update(`${sub.kode}|${variantGroup}|${Date.now()}|${Math.random()}`)
    .digest("hex")
    .slice(0, 24);

  const now = Date.now();
  // Build konten tanpa undefined fields (Firestore reject undefined)
  const konten: ItemBankEntry["konten"] = {
    pertanyaan: soal.pertanyaan,
    opsi: soal.opsi.map((o) =>
      o.alasan !== undefined ? { teks: o.teks, benar: o.benar, alasan: o.alasan } : { teks: o.teks, benar: o.benar },
    ),
    kunci: kunciIdx,
  };
  if (soal.svg) konten.svg = soal.svg;

  return {
    id,
    subMateriKode: sub.kode,
    jalur: inferJalur(sub),
    area: sub.area,
    jenjang: sub.jenjang,
    kelas: sub.kelas,
    b: defaultDifficulty(sub),
    a: defaultDiscrimination(sub),
    c: defaultGuessing(format),
    format,
    estimatedTimeSeconds: DEFAULT_TIME_SECONDS,
    variantGroup,
    calibrationN: 0,
    isMilestone: sub.is_entry_point || sub.dependents_count >= 3,
    isMaku: sub.is_maku,
    konten,
    source: opts.source ?? "ai-generated",
    aiModel: opts.aiModel,
    meta: opts.meta,
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================
// Query helpers untuk Phase 2 drilling — filter by metadata
// ============================================================

/** Items yang match difficulty label (untuk Easy/Med/Hard mix). */
export async function itemsByDifficulty(
  subMateriKode: string,
  difficulty: DifficultyLabel,
): Promise<ItemBankEntry[]> {
  const all = await itemsForSubMateri(subMateriKode);
  return all.filter((it) => it.meta?.difficultyLabel === difficulty);
}

/** Pilih mix items sesuai pattern E/M/H — untuk Phase 2 drilling step (Integral Table 4). */
export async function pickItemsWithMix(
  subMateriKode: string,
  mix: { easy: number; medium: number; hard: number },
  excludeIds: Set<string> = new Set(),
): Promise<{ easy: ItemBankEntry[]; medium: ItemBankEntry[]; hard: ItemBankEntry[]; total: ItemBankEntry[] }> {
  const all = await itemsForSubMateri(subMateriKode);
  const eligible = all.filter((it) => !excludeIds.has(it.id));
  const byDiff = {
    easy: eligible.filter((it) => it.meta?.difficultyLabel === "easy"),
    medium: eligible.filter((it) => it.meta?.difficultyLabel === "medium"),
    hard: eligible.filter((it) => it.meta?.difficultyLabel === "hard"),
    untagged: eligible.filter((it) => !it.meta?.difficultyLabel),
  };
  // Fallback: kalau difficulty kurang, ambil dari untagged (assume medium default)
  function pick(arr: ItemBankEntry[], n: number): ItemBankEntry[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }
  const easyPicks = pick(byDiff.easy, mix.easy);
  const mediumPicks = pick(byDiff.medium, mix.medium);
  const hardPicks = pick(byDiff.hard, mix.hard);
  // Top up dari untagged kalau kurang
  const totalAvailable = easyPicks.length + mediumPicks.length + hardPicks.length;
  const targetTotal = mix.easy + mix.medium + mix.hard;
  if (totalAvailable < targetTotal) {
    const need = targetTotal - totalAvailable;
    const fillUp = pick(byDiff.untagged, need);
    mediumPicks.push(...fillUp); // assume untagged = medium
  }
  return {
    easy: easyPicks,
    medium: mediumPicks,
    hard: hardPicks,
    total: [...easyPicks, ...mediumPicks, ...hardPicks],
  };
}

/** Coverage stats — berapa % item di sub punya metadata (audit). */
export async function metadataCoverage(subMateriKode: string): Promise<{
  total: number;
  withDifficulty: number;
  withMicroskill: number;
  withMultiStep: number;
  withReasoningQuality: number;
}> {
  const items = await itemsForSubMateri(subMateriKode);
  return {
    total: items.length,
    withDifficulty: items.filter((it) => it.meta?.difficultyLabel).length,
    withMicroskill: items.filter((it) => it.meta?.microskill).length,
    withMultiStep: items.filter((it) => it.meta?.multiStep !== undefined).length,
    withReasoningQuality: items.filter((it) => it.meta?.reasoningQualityRequired !== undefined).length,
  };
}

// ============================================================
// Firestore CRUD
// ============================================================

const COLLECTION = "item_bank";

/** Simpan item ke Firestore. Overwrite by id. */
export async function saveItem(item: ItemBankEntry): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(item.id).set(item);
}

/** Bulk save — pakai writeBatch (max 500 per batch). */
export async function saveItemsBatch(items: ItemBankEntry[]): Promise<void> {
  const db = getAdminDb();
  for (let i = 0; i < items.length; i += 500) {
    const batch = db.batch();
    for (const it of items.slice(i, i + 500)) {
      batch.set(db.collection(COLLECTION).doc(it.id), it);
    }
    await batch.commit();
  }
}

/** Load item by id. */
export async function loadItem(id: string): Promise<ItemBankEntry | null> {
  const snap = await getAdminDb().collection(COLLECTION).doc(id).get();
  return snap.exists ? (snap.data() as ItemBankEntry) : null;
}

/** Increment calibration counter setelah response masuk (best-effort, non-blocking). */
export async function incrementCalibration(id: string, by: number = 1): Promise<void> {
  try {
    await getAdminDb().collection(COLLECTION).doc(id).update({
      calibrationN: FieldValue.increment(by),
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn("incrementCalibration gagal:", e);
  }
}

/**
 * Update IRT params setelah re-kalibrasi.
 * Calibration sendiri (EM/MML) di-handle terpisah — fungsi ini cuma persist hasilnya.
 */
export async function updateIrtParams(
  id: string,
  params: { b: number; a: number; c?: number; calibrationN?: number },
): Promise<void> {
  const patch: Record<string, unknown> = {
    b: params.b,
    a: params.a,
    updatedAt: Date.now(),
  };
  if (params.c !== undefined) patch.c = params.c;
  if (params.calibrationN !== undefined) patch.calibrationN = params.calibrationN;
  await getAdminDb().collection(COLLECTION).doc(id).update(patch);
}

// ============================================================
// Query helpers (untuk B3+ diagnostic engine)
// ============================================================

/** Items untuk satu sub-materi (semua varian). */
export async function itemsForSubMateri(kode: string): Promise<ItemBankEntry[]> {
  const snap = await getAdminDb()
    .collection(COLLECTION)
    .where("subMateriKode", "==", kode)
    .get();
  return snap.docs.map((d) => d.data() as ItemBankEntry);
}

/** Items per jalur (e.g. "smp"). Optional filter mode kurikulum 3-mode + legacy "full". */
export async function itemsForJalur(
  jalur: JalurDiagnostik,
  modeKurikulum: import("@/types").ModeKurikulumLegacy = "comprehensive",
): Promise<ItemBankEntry[]> {
  const snap = await getAdminDb()
    .collection(COLLECTION)
    .where("jalur", "array-contains", jalur)
    .get();
  const items = snap.docs.map((d) => d.data() as ItemBankEntry);
  // Normalize legacy "full" → "comprehensive"
  const mode = modeKurikulum === "full" ? "comprehensive" : modeKurikulum;
  if (mode === "comprehensive") return items;
  if (mode === "strict") {
    const { isStrict } = await import("@/data/peta-resmi");
    return items.filter((it) => isStrict(it.subMateriKode));
  }
  // accelerated
  const { isAccelerated } = await import("@/data/peta-resmi");
  return items.filter((it) => isAccelerated(it.subMateriKode));
}

/** Items per (jenjang, kelas) — untuk locator stage. */
export async function itemsForKelas(jenjang: JenjangResmi, kelas: number): Promise<ItemBankEntry[]> {
  const snap = await getAdminDb()
    .collection(COLLECTION)
    .where("jenjang", "==", jenjang)
    .where("kelas", "==", kelas)
    .get();
  return snap.docs.map((d) => d.data() as ItemBankEntry);
}

/** Items per area (untuk content balancing di Stage B). */
export async function itemsForArea(area: AreaMatematika): Promise<ItemBankEntry[]> {
  const snap = await getAdminDb()
    .collection(COLLECTION)
    .where("area", "==", area)
    .get();
  return snap.docs.map((d) => d.data() as ItemBankEntry);
}

/** Coverage check — sub-materi yang punya minimal N item di bank. */
export async function coverageBySubMateri(minItems: number = 3): Promise<{ kode: string; count: number }[]> {
  const snap = await getAdminDb().collection(COLLECTION).get();
  const counts = new Map<string, number>();
  for (const d of snap.docs) {
    const kode = (d.data() as ItemBankEntry).subMateriKode;
    counts.set(kode, (counts.get(kode) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n >= minItems)
    .map(([kode, count]) => ({ kode, count }));
}

/**
 * Sub-materi yang BELUM punya cukup item — target untuk seeding berikutnya.
 * Returns daftar kode dengan jumlah item current (0 berarti sama sekali kosong).
 */
export async function gapsBySubMateri(
  jenjang: JenjangResmi,
  kelas: number,
  minItems: number = 3,
): Promise<{ sub: SubMateriResmi; current: number; needed: number }[]> {
  const semua = subMateriPerKelas(jenjang, kelas);
  const items = await itemsForKelas(jenjang, kelas);
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.subMateriKode, (counts.get(it.subMateriKode) ?? 0) + 1);
  return semua
    .map((sub) => {
      const current = counts.get(sub.kode) ?? 0;
      return { sub, current, needed: Math.max(0, minItems - current) };
    })
    .filter((x) => x.needed > 0);
}

/** Convenience: sample area items (untuk debug/admin). */
export async function sampleArea(area: AreaMatematika, n: number = 5): Promise<ItemBankEntry[]> {
  const all = await itemsForArea(area);
  // Random pick tanpa shuffle full
  const out: ItemBankEntry[] = [];
  const used = new Set<number>();
  while (out.length < Math.min(n, all.length)) {
    const idx = Math.floor(Math.random() * all.length);
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(all[idx]!);
  }
  return out;
}

// ============================================================
// Helper: convert ItemBankEntry → IRT Item (untuk irt-engine)
// ============================================================

import type { Item as IrtItem } from "@/lib/irt-engine";

/** Convert ItemBankEntry ke shape minimal yang dibutuhkan irt-engine. */
export function toIrtItem(entry: ItemBankEntry): IrtItem {
  return {
    id: entry.id,
    subMateriKode: entry.subMateriKode,
    area: entry.area,
    b: entry.b,
    a: entry.a,
    c: entry.c,
  };
}

/** Bulk convert. */
export function toIrtItems(entries: ItemBankEntry[]): IrtItem[] {
  return entries.map(toIrtItem);
}

// ============================================================
// Re-exports untuk akses peta resmi dari konsumer item-bank
// ============================================================
export { subMateriPerArea };
