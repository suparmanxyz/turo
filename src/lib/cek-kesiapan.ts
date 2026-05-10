/**
 * Cek Kesiapan Lapis 2 — SRS Section 6.2.
 *
 * Skenario: user mau akses sub-materi target X.
 * Sebelum mulai, sistem cek kesiapan prereq STRICT-CRITICAL X via blind spot detection:
 *   1. Lookup mastery user untuk semua prereq STRICT-CRITICAL X.
 *   2. Identifikasi blind spot = prereq yang status="unknown" / "remediasi" / stale.
 *   3. Kalau ada blind spot, jalankan inline warmup (1-2 soal per blind spot, 3 max total).
 *   4. Hasil warmup → update mastery + putuskan: lanjut ke X / remediasi dulu / minta diagnostik ulang.
 */

import { cariSubMateriResmi } from "@/data/peta-resmi";
import { itemsForSubMateri } from "@/lib/item-bank";
import type { ItemBankEntry } from "@/lib/item-bank";
import { listMasteryByUser, getMastery } from "@/lib/firestore-schema";
import type { BlindSpot, MasteryStatus, PrereqRelation, WeightPrereq } from "@/types";

/** TTL untuk mastery — di atas ini dianggap stale, perlu re-cek. */
const MASTERY_STALE_MS = 60 * 24 * 60 * 60 * 1000; // 60 hari

/** Status yang dianggap "siap" — gak perlu warmup. */
const STATUS_SIAP: MasteryStatus[] = ["siap"];

/** Cek apakah satu mastery entry masih valid. */
function masteryValid(status: MasteryStatus, lastAssessedAt: number, now: number): boolean {
  if (!STATUS_SIAP.includes(status)) return false;
  if (now - lastAssessedAt > MASTERY_STALE_MS) return false;
  return true;
}

/**
 * Identifikasi blind spots untuk sub-materi target.
 * Return prereq STRICT-CRITICAL yang user belum dikuasai / stale.
 */
export async function identifyBlindSpots(uid: string, targetKode: string): Promise<BlindSpot[]> {
  const target = cariSubMateriResmi(targetKode);
  if (!target) return [];
  const now = Date.now();

  // Filter STRICT-CRITICAL prereq (gating only — SOFT/HELPER tidak block)
  const criticalPrereqs: PrereqRelation[] = target.prereq.filter(
    (p) => p.relation === "STRICT" && p.weight === "CRITICAL",
  );

  const blindSpots: BlindSpot[] = [];
  for (const p of criticalPrereqs) {
    const m = await getMastery(uid, p.kode);
    if (!m || !masteryValid(m.status, m.lastAssessedAt, now)) {
      blindSpots.push({
        kode: p.kode,
        weight: p.weight,
        reason: m
          ? `mastery ${m.status}, last ${Math.floor((now - m.lastAssessedAt) / 86400000)} hari lalu`
          : "belum pernah di-assess",
      });
    }
  }
  return blindSpots;
}

// ============================================================
// Warmup test (inline mini-IRT)
// ============================================================

/**
 * Konfigurasi warmup. Differential per stage (revisi 2026-05-10):
 *   - Bab: 3 items per BS (1 easy + 1 medium + 1 hard), threshold 67% (≥2/3)
 *     → decision Bab critical (impact program belajar), butuh akurasi tinggi
 *   - Sub: 2 items per BS (1 medium + 1 hard), threshold 50% (≥1/2)
 *     → decision Sub granular, akurasi sedang cukup
 *
 * Sebelum: 1 item per BS × 55-65% lucky probability → false positive tinggi.
 */
const WARMUP_MAX_TOTAL_ITEMS_BAB = 12; // 4 BS × 3 items
const WARMUP_MAX_TOTAL_ITEMS_SUB = 6;  // 3 BS × 2 items
const WARMUP_ITEMS_PER_BLINDSPOT_BAB = 3;
const WARMUP_ITEMS_PER_BLINDSPOT_SUB = 2;
/** Threshold per blind spot — kalau accuracy < ini → tag remediasi. */
export const WARMUP_PASS_THRESHOLD_BAB = 0.67; // ≥2/3 untuk 3 items
export const WARMUP_PASS_THRESHOLD_SUB = 0.5;  // ≥1/2 untuk 2 items
/** Default threshold (untuk back-compat). */
export const WARMUP_PASS_THRESHOLD = WARMUP_PASS_THRESHOLD_SUB;

export type WarmupItem = {
  blindSpotKode: string;
  item: ItemBankEntry;
};

/**
 * Bangun queue warmup items dari blind spots.
 *
 * @param blindSpots - list blind spot terdeteksi
 * @param scope - "bab" (3 items/BS, max 12) atau "sub" (2 items/BS, max 6)
 *
 * Pick variasi difficulty per BS:
 *   - 3 items (Bab): 1 easy (b paling kecil) + 1 medium (b ≈ 0) + 1 hard (b tertinggi)
 *   - 2 items (Sub): 1 medium + 1 hard
 */
export async function buildWarmupQueue(
  blindSpots: BlindSpot[],
  scope: "bab" | "sub" = "sub",
): Promise<WarmupItem[]> {
  const itemsPerBs = scope === "bab" ? WARMUP_ITEMS_PER_BLINDSPOT_BAB : WARMUP_ITEMS_PER_BLINDSPOT_SUB;
  const maxTotal = scope === "bab" ? WARMUP_MAX_TOTAL_ITEMS_BAB : WARMUP_MAX_TOTAL_ITEMS_SUB;

  // Sort: weight CRITICAL dulu (sudah filter di identifyBlindSpots, tapi safe)
  const sorted = [...blindSpots].sort((a, b) => {
    const wa = a.weight === "CRITICAL" ? 0 : 1;
    const wb = b.weight === "CRITICAL" ? 0 : 1;
    return wa - wb;
  });

  const queue: WarmupItem[] = [];
  for (const bs of sorted) {
    if (queue.length >= maxTotal) break;
    const pool = await itemsForSubMateri(bs.kode);
    if (pool.length === 0) continue;

    // Sort pool by b ascending (easiest first) untuk easy/medium/hard pick
    const sortedAsc = [...pool].sort((a, b) => a.b - b.b);
    const picks: ItemBankEntry[] = [];
    if (itemsPerBs >= 3 && sortedAsc.length >= 3) {
      // 3 items: easy (b min) + medium (b di tengah) + hard (b max)
      picks.push(sortedAsc[0]!);
      picks.push(sortedAsc[Math.floor(sortedAsc.length / 2)]!);
      picks.push(sortedAsc[sortedAsc.length - 1]!);
    } else {
      // 2 items: medium (b ≈ 0) + hard (b max)
      const byAbsB = [...pool].sort((a, b) => Math.abs(a.b) - Math.abs(b.b));
      const medium = byAbsB[0]!;
      picks.push(medium);
      const hard = sortedAsc[sortedAsc.length - 1];
      if (hard && hard.id !== medium.id) picks.push(hard);
      else if (sortedAsc.length >= 2) picks.push(sortedAsc[sortedAsc.length - 2]!);
    }
    // Dedup (kalau pool kecil bisa same item ke-pick 2×)
    const seen = new Set<string>();
    const unique = picks.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });

    for (const pick of unique.slice(0, itemsPerBs)) {
      if (queue.length >= maxTotal) break;
      queue.push({ blindSpotKode: bs.kode, item: pick });
    }
  }
  return queue;
}

// ============================================================
// Decision logic — hasil warmup → action
// ============================================================

export type WarmupResponse = {
  blindSpotKode: string;
  itemId: string;
  correct: boolean;
  responseTimeMs: number;
};

export type CekKesiapanDecision =
  | { action: "lanjut"; targetKode: string; alasan: string }
  | { action: "remediasi"; targetKode: string; remediasiKodes: string[]; alasan: string }
  | { action: "diagnostik"; targetKode: string; alasan: string };

/**
 * Putuskan action berdasarkan hasil warmup ADAPTIF (multi-item per blind spot).
 *
 * Logic:
 *   - Per blind spot: hitung accuracy. Kalau < WARMUP_PASS_THRESHOLD → "fail".
 *   - 0 fail → "lanjut"
 *   - 1 fail → "remediasi" (kasih daftar sub yang harus diperbaiki dulu)
 *   - 2+ fail → "diagnostik" (gap sistemik, perlu mini-diagnostik lebih dalam)
 *
 * Catatan: dengan 2 items per BS, threshold 50% berarti butuh ≥1 benar.
 * Anak yang lucky 1 dari 2 = pass (acceptable). Anak benar 2 dari 2 = solid pass.
 * Anak salah keduanya = clear fail.
 */
export function putuskanCekKesiapan(
  targetKode: string,
  responses: WarmupResponse[],
  threshold: number = WARMUP_PASS_THRESHOLD_SUB,
): CekKesiapanDecision {
  // Group by blind spot kode
  const byKode = new Map<string, { correct: number; total: number }>();
  for (const r of responses) {
    const cur = byKode.get(r.blindSpotKode) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (r.correct) cur.correct += 1;
    byKode.set(r.blindSpotKode, cur);
  }

  // Tag tiap blind spot pass/fail berdasarkan threshold
  const failedKodes: string[] = [];
  for (const [kode, agg] of byKode.entries()) {
    if (agg.total === 0) continue;
    if (agg.correct / agg.total < threshold) {
      failedKodes.push(kode);
    }
  }

  const totalBs = byKode.size;
  const totalItems = responses.length;

  if (failedKodes.length === 0) {
    return {
      action: "lanjut",
      targetKode,
      alasan: `Semua ${totalBs} prereq cek lulus (${totalItems} item dijawab)`,
    };
  }
  if (failedKodes.length === 1) {
    return {
      action: "remediasi",
      targetKode,
      remediasiKodes: failedKodes,
      alasan: `1 prereq belum siap: ${failedKodes[0]}`,
    };
  }
  // 2+ blind spot fail → gap sistemik
  return {
    action: "diagnostik",
    targetKode,
    alasan: `${failedKodes.length} prereq lemah (${failedKodes.join(", ")}) — perlu diagnostik lebih dalam`,
  };
}

// ============================================================
// Helper: end-to-end Cek Kesiapan flow (untuk API route)
// ============================================================

/**
 * Step 1: cek kesiapan TANPA jalankan warmup — return blind spots + warmup queue.
 * Caller (UI) lalu kerjakan warmup, kirim responses, panggil step 2.
 */
export async function startCekKesiapan(uid: string, targetKode: string): Promise<{
  targetKode: string;
  blindSpots: BlindSpot[];
  warmupQueue: WarmupItem[];
  /** Kalau gak ada blind spot, langsung lanjut. */
  shortCircuit?: CekKesiapanDecision;
}> {
  const blindSpots = await identifyBlindSpots(uid, targetKode);
  if (blindSpots.length === 0) {
    return {
      targetKode,
      blindSpots: [],
      warmupQueue: [],
      shortCircuit: {
        action: "lanjut",
        targetKode,
        alasan: "Tidak ada blind spot — semua prereq STRICT-CRITICAL sudah dikuasai",
      },
    };
  }
  const warmupQueue = await buildWarmupQueue(blindSpots, "sub");
  if (warmupQueue.length === 0) {
    // Item bank kosong untuk blind spots — fallback ke diagnostik
    return {
      targetKode,
      blindSpots,
      warmupQueue: [],
      shortCircuit: {
        action: "diagnostik",
        targetKode,
        alasan: "Item bank belum punya soal untuk prereq target — perlu diagnostik manual",
      },
    };
  }
  return { targetKode, blindSpots, warmupQueue };
}

/**
 * Step 2: setelah user kerjakan warmup, putuskan + (caller) update mastery di Firestore.
 */
export function finishCekKesiapan(
  targetKode: string,
  responses: WarmupResponse[],
): CekKesiapanDecision {
  return putuskanCekKesiapan(targetKode, responses, WARMUP_PASS_THRESHOLD_SUB);
}

// ============================================================
// VARIAN PER-BAB (Lapis 1.5)
// ============================================================

/**
 * Identifikasi blind spots untuk SELURUH bab.
 * Strategi: union prereq STRICT-CRITICAL dari semua sub di bab,
 * kemudian filter prereq yang ada di dalam bab itu sendiri (in-bab prereq
 * akan auto di-cover saat user belajar bab itu, gak perlu cek dulu).
 *
 * Input subKodesInBab = list kode sub-materi yang ada di bab target.
 */
export async function identifyBlindSpotsForBab(
  uid: string,
  subKodesInBab: string[],
): Promise<BlindSpot[]> {
  if (subKodesInBab.length === 0) return [];
  const inBabSet = new Set(subKodesInBab);
  const now = Date.now();

  // Kumpulkan prereq STRICT-CRITICAL dari SEMUA sub di bab — dedup by kode
  const aggregatePrereq = new Map<string, { kode: string; weight: WeightPrereq; reason: string; fromSubs: string[] }>();
  for (const subKode of subKodesInBab) {
    const sub = cariSubMateriResmi(subKode);
    if (!sub) continue;
    for (const p of sub.prereq) {
      if (p.relation !== "STRICT" || p.weight !== "CRITICAL") continue;
      // Skip prereq yang ada di bab itu sendiri — akan auto di-cover
      if (inBabSet.has(p.kode)) continue;
      const ex = aggregatePrereq.get(p.kode);
      if (ex) {
        ex.fromSubs.push(subKode);
      } else {
        aggregatePrereq.set(p.kode, { kode: p.kode, weight: p.weight, reason: p.reason, fromSubs: [subKode] });
      }
    }
  }

  // Cek mastery user untuk tiap prereq agregat
  const blindSpots: BlindSpot[] = [];
  for (const [kode, info] of aggregatePrereq.entries()) {
    const m = await getMastery(uid, kode);
    if (!m || !masteryValid(m.status, m.lastAssessedAt, now)) {
      // Reason kombinasi: dari berapa sub di bab yang butuh prereq ini
      const reasonAggregate = info.fromSubs.length > 1
        ? `dibutuhkan ${info.fromSubs.length} sub-materi di bab ini`
        : info.reason;
      blindSpots.push({ kode, weight: info.weight, reason: reasonAggregate });
    }
  }
  return blindSpots;
}

/**
 * Start cek kesiapan per BAB.
 * Cek dulu apakah user lemah di prereq agregat — kalau iya, sajikan warmup.
 */
export async function startCekKesiapanBab(
  uid: string,
  materiSlug: string,
  subKodesInBab: string[],
): Promise<{
  materiSlug: string;
  blindSpots: BlindSpot[];
  warmupQueue: WarmupItem[];
  shortCircuit?: CekKesiapanDecision;
}> {
  const blindSpots = await identifyBlindSpotsForBab(uid, subKodesInBab);
  if (blindSpots.length === 0) {
    return {
      materiSlug,
      blindSpots: [],
      warmupQueue: [],
      shortCircuit: {
        action: "lanjut",
        targetKode: materiSlug,
        alasan: "Semua prereq STRICT-CRITICAL bab sudah dikuasai",
      },
    };
  }
  const warmupQueue = await buildWarmupQueue(blindSpots, "bab");
  if (warmupQueue.length === 0) {
    return {
      materiSlug,
      blindSpots,
      warmupQueue: [],
      shortCircuit: {
        action: "diagnostik",
        targetKode: materiSlug,
        alasan: "Item bank belum punya soal untuk prereq bab — perlu diagnostik manual",
      },
    };
  }
  return { materiSlug, blindSpots, warmupQueue };
}

/**
 * Decision logic untuk cek kesiapan bab — pakai threshold 67% per BS
 * (≥2 dari 3 items benar) untuk akurasi tinggi, karena decision Bab
 * impact ke seluruh program belajar.
 */
export function finishCekKesiapanBab(
  materiSlug: string,
  responses: WarmupResponse[],
): CekKesiapanDecision {
  return putuskanCekKesiapan(materiSlug, responses, WARMUP_PASS_THRESHOLD_BAB);
}

// Re-export untuk konsumer
export { listMasteryByUser };
