/**
 * Locator Stage — Stage A Fast Test (SRS Section 7.2)
 *
 * Tujuan: estimasi cepat level kelas siswa via binary search di pohon kurikulum,
 * dengan 5-7 anchor item di kelas yang berbeda.
 *
 * Algoritma:
 *   1. Mulai dari kelas median jalur (e.g. SMP → kelas 8).
 *   2. Pilih item anchor (b ≈ kelasToTheta(kelasNow)) dari item bank.
 *   3. Update theta via EAP setelah setiap respon.
 *   4. Geser kelasNow ke arah theta baru (binary-step).
 *   5. Stop kalau SE < 0.5 atau sudah 7 item — pindah ke Stage B (area coverage).
 */

import { estimateThetaEAP, kelasToTheta, thetaToKelas, selectMaxInfoItem } from "@/lib/irt-engine";
import type { Item, Response, ThetaEstimate } from "@/lib/irt-engine";
import { itemsForJalur } from "@/lib/item-bank";
import type { ItemBankEntry, JalurDiagnostik } from "@/lib/item-bank";
import { toIrtItems } from "@/lib/item-bank";

/** Range kelas per jalur — initial midpoint untuk locator. */
const JALUR_KELAS_RANGE: Record<JalurDiagnostik, { min: number; max: number; mid: number }> = {
  "sd-k1-3": { min: 1, max: 3, mid: 2 },
  "sd-k4-6": { min: 4, max: 6, mid: 5 },
  "smp": { min: 7, max: 9, mid: 8 },
  "sma-reguler": { min: 10, max: 12, mid: 11 },
  "sma-utbk": { min: 7, max: 12, mid: 9 }, // UTBK butuh basis SMP+SMA
};

/** State Locator selama berjalan. */
export type LocatorState = {
  jalur: JalurDiagnostik;
  /** Items pool yang tersedia untuk jalur ini, sudah convert ke IRT shape. */
  pool: ItemBankEntry[];
  /** Item yang sudah dipakai (id). */
  used: Set<string>;
  /** Responses sejauh ini. */
  responses: Response[];
  /** Estimate theta sekarang. */
  estimate: ThetaEstimate;
  /** Kelas estimasi saat ini (untuk anchor selection). */
  kelasNow: number;
  /** Riwayat kelas yang sudah di-probe — hindari osilasi. */
  kelasProbed: number[];
  done: boolean;
  /** Reason kalau sudah selesai. */
  stopReason?: "se_threshold" | "max_items" | "pool_empty";
};

/** Kriteria stop untuk Locator (longgar — tujuan rough estimate, bukan precision). */
const LOCATOR_SE_THRESHOLD = 0.5;
const LOCATOR_MIN_ITEMS = 5;
const LOCATOR_MAX_ITEMS = 7;

/** Init Locator state — load pool dari item bank. */
export async function initLocator(jalur: JalurDiagnostik): Promise<LocatorState> {
  const pool = await itemsForJalur(jalur);
  const range = JALUR_KELAS_RANGE[jalur];
  return {
    jalur,
    pool,
    used: new Set(),
    responses: [],
    estimate: {
      theta: kelasToTheta(range.mid),
      se: Infinity,
      ci95: [-Infinity, Infinity],
      n: 0,
    },
    kelasNow: range.mid,
    kelasProbed: [],
    done: false,
  };
}

/**
 * Pilih item berikut dari pool — ambil item yang b-nya paling dekat dengan kelasNow,
 * lalu di antara kandidat di kelas itu, pilih yang max-info di theta sekarang.
 */
export function pickNextLocatorItem(state: LocatorState): ItemBankEntry | null {
  if (state.pool.length === 0) return null;
  const range = JALUR_KELAS_RANGE[state.jalur];
  const targetKelas = Math.max(range.min, Math.min(range.max, Math.round(state.kelasNow)));

  // Candidate filter: belum dipakai, kelas == targetKelas
  let candidates = state.pool.filter((it) => !state.used.has(it.id) && it.kelas === targetKelas);

  // Fallback: kalau kelas target kosong, lebar window ±1 lalu ±2
  for (let widen = 1; widen <= 3 && candidates.length === 0; widen++) {
    candidates = state.pool.filter(
      (it) => !state.used.has(it.id) && Math.abs(it.kelas - targetKelas) <= widen,
    );
  }
  if (candidates.length === 0) return null;

  // Max info di theta sekarang
  const irtCandidates = toIrtItems(candidates);
  const picked = selectMaxInfoItem(state.estimate.theta, irtCandidates, state.used);
  if (!picked) return null;
  return candidates.find((c) => c.id === picked.id) ?? null;
}

/**
 * Submit respons → update theta, geser kelasNow, cek stop.
 * Returns state baru (immutable update).
 */
export function submitLocatorResponse(
  state: LocatorState,
  itemId: string,
  correct: boolean,
  responseTimeMs?: number,
): LocatorState {
  const item = state.pool.find((it) => it.id === itemId);
  if (!item) return state;

  const newUsed = new Set(state.used);
  newUsed.add(itemId);
  const newResponses: Response[] = [...state.responses, { itemId, correct, responseTimeMs }];

  // Re-estimate theta dari semua items + responses sejauh ini
  const answeredItems: Item[] = state.pool
    .filter((it) => newUsed.has(it.id))
    .map((it) => ({ id: it.id, subMateriKode: it.subMateriKode, area: it.area, b: it.b, a: it.a, c: it.c }));
  const newEstimate = estimateThetaEAP(answeredItems, newResponses);

  // Geser kelasNow ke target baru — binary step ke arah theta
  const range = JALUR_KELAS_RANGE[state.jalur];
  const targetKelas = Math.max(range.min, Math.min(range.max, thetaToKelas(newEstimate.theta)));
  // Half-step toward target (smoothing — hindari overshoot)
  const newKelasNow = (state.kelasNow + targetKelas) / 2;

  const newKelasProbed = [...state.kelasProbed, Math.round(state.kelasNow)];

  // Check stop
  let done = false;
  let stopReason: LocatorState["stopReason"] | undefined;
  const n = newResponses.length;
  if (n >= LOCATOR_MAX_ITEMS) {
    done = true;
    stopReason = "max_items";
  } else if (n >= LOCATOR_MIN_ITEMS && newEstimate.se < LOCATOR_SE_THRESHOLD) {
    done = true;
    stopReason = "se_threshold";
  } else if (state.pool.filter((it) => !newUsed.has(it.id)).length === 0) {
    done = true;
    stopReason = "pool_empty";
  }

  return {
    ...state,
    used: newUsed,
    responses: newResponses,
    estimate: newEstimate,
    kelasNow: newKelasNow,
    kelasProbed: newKelasProbed,
    done,
    stopReason,
  };
}

/**
 * Hasil akhir Locator → kelas estimasi + theta + range CI95 dalam unit kelas.
 * Output ini dipakai Stage B (Area Coverage) sebagai prior.
 */
export type LocatorResult = {
  jalur: JalurDiagnostik;
  theta: number;
  se: number;
  kelasEstimasi: number;
  /** CI95 dalam unit kelas (dari ci95 theta). */
  kelasRange: [number, number];
  itemsUsed: number;
  stopReason: NonNullable<LocatorState["stopReason"]>;
  responses: Response[];
};

export function finalizeLocator(state: LocatorState): LocatorResult | null {
  if (!state.done || !state.stopReason) return null;
  return {
    jalur: state.jalur,
    theta: state.estimate.theta,
    se: state.estimate.se,
    kelasEstimasi: thetaToKelas(state.estimate.theta),
    kelasRange: [thetaToKelas(state.estimate.ci95[0]), thetaToKelas(state.estimate.ci95[1])],
    itemsUsed: state.responses.length,
    stopReason: state.stopReason,
    responses: state.responses,
  };
}

// ============================================================
// Helper: full sync run untuk testing/debug
// ============================================================

/**
 * Simulasi locator end-to-end (untuk testing).
 * `answerFn` callback yang return correct/incorrect untuk item yang diberikan.
 */
export async function simulateLocator(
  jalur: JalurDiagnostik,
  answerFn: (item: ItemBankEntry) => Promise<{ correct: boolean; responseTimeMs?: number }>,
): Promise<{ result: LocatorResult | null; trace: { kelas: number; itemId: string; correct: boolean; theta: number; se: number }[] }> {
  let state = await initLocator(jalur);
  const trace: { kelas: number; itemId: string; correct: boolean; theta: number; se: number }[] = [];

  while (!state.done) {
    const item = pickNextLocatorItem(state);
    if (!item) {
      state = { ...state, done: true, stopReason: "pool_empty" };
      break;
    }
    const ans = await answerFn(item);
    state = submitLocatorResponse(state, item.id, ans.correct, ans.responseTimeMs);
    trace.push({
      kelas: item.kelas,
      itemId: item.id,
      correct: ans.correct,
      theta: state.estimate.theta,
      se: state.estimate.se,
    });
  }

  return { result: finalizeLocator(state), trace };
}
