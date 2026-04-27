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
import type { BlindSpot, MasteryStatus, PrereqRelation } from "@/types";

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

/** Konfigurasi warmup. */
const WARMUP_MAX_TOTAL_ITEMS = 5;
const WARMUP_ITEMS_PER_BLINDSPOT = 1;

export type WarmupItem = {
  blindSpotKode: string;
  item: ItemBankEntry;
};

/**
 * Bangun queue warmup items dari blind spots.
 * 1 item per blind spot (max 5 total — kalau lebih, ambil yang weight CRITICAL & is_maku dulu).
 */
export async function buildWarmupQueue(blindSpots: BlindSpot[]): Promise<WarmupItem[]> {
  // Sort: weight CRITICAL dulu (sudah filter di identifyBlindSpots, tapi safe)
  const sorted = [...blindSpots].sort((a, b) => {
    const wa = a.weight === "CRITICAL" ? 0 : 1;
    const wb = b.weight === "CRITICAL" ? 0 : 1;
    return wa - wb;
  });

  const queue: WarmupItem[] = [];
  for (const bs of sorted) {
    if (queue.length >= WARMUP_MAX_TOTAL_ITEMS) break;
    const pool = await itemsForSubMateri(bs.kode);
    if (pool.length === 0) continue;
    // Pilih random 1 item — harusnya yang medium difficulty (b ≈ 0)
    const sortedByB = [...pool].sort((a, b) => Math.abs(a.b) - Math.abs(b.b));
    for (let i = 0; i < WARMUP_ITEMS_PER_BLINDSPOT && i < sortedByB.length; i++) {
      queue.push({ blindSpotKode: bs.kode, item: sortedByB[i]! });
      if (queue.length >= WARMUP_MAX_TOTAL_ITEMS) break;
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
 * Putuskan action berdasarkan hasil warmup.
 *
 * Logic:
 *   - Semua warmup benar → "lanjut" (mastery diupdate ke siap, akses target dibuka).
 *   - 1 salah → "remediasi" (akses target dibuka tapi user di-redirect dulu ke remediasi sub yg salah).
 *   - 2+ salah → "diagnostik" (perlu diagnostik lebih dalam, mungkin gap sistemik).
 */
export function putuskanCekKesiapan(
  targetKode: string,
  responses: WarmupResponse[],
): CekKesiapanDecision {
  const wrong = responses.filter((r) => !r.correct);
  const wrongKodes = Array.from(new Set(wrong.map((r) => r.blindSpotKode)));

  if (wrong.length === 0) {
    return {
      action: "lanjut",
      targetKode,
      alasan: `Semua ${responses.length} prereq cek lulus`,
    };
  }
  if (wrongKodes.length === 1 && wrong.length === 1) {
    return {
      action: "remediasi",
      targetKode,
      remediasiKodes: wrongKodes,
      alasan: `1 prereq belum siap: ${wrongKodes[0]}`,
    };
  }
  if (wrongKodes.length >= 2) {
    return {
      action: "diagnostik",
      targetKode,
      alasan: `${wrongKodes.length} prereq lemah — perlu diagnostik lebih dalam`,
    };
  }
  return {
    action: "remediasi",
    targetKode,
    remediasiKodes: wrongKodes,
    alasan: `${wrong.length} jawaban salah pada prereq ${wrongKodes.join(", ")}`,
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
  const warmupQueue = await buildWarmupQueue(blindSpots);
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
  return putuskanCekKesiapan(targetKode, responses);
}

// Re-export untuk konsumer
export { listMasteryByUser };
