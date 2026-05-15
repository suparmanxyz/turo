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

/**
 * Range kelas per jalur. Pisahkan jadi 3 concept:
 *   - `mid`         : initial probe midpoint Locator
 *   - `max`         : upper cap kelas estimasi (mastery curriculum bound)
 *   - `probingMin`  : Locator boleh probe sampai kelas berapa rendah (untuk
 *                     deteksi weak outlier — e.g. anak SMA K12 weak pecahan
 *                     yang real-nya level K5). Asymmetric: lebih rendah dari
 *                     placement lower bound — mencegah engine "memaksa" kelas
 *                     est ke jalur range padahal anak jauh di bawah.
 *
 * Filosofi: cap upper (mencegah strong outlier over-extrapolasi karena IRT
 * theta naik), TIDAK cap lower (anak weak harus visible — diagnosa jujur).
 */
const JALUR_KELAS_RANGE: Record<
  JalurDiagnostik,
  { min: number; max: number; mid: number; probingMin: number }
> = {
  "sd-k1-3": { min: 1, max: 3, mid: 2, probingMin: 1 },
  "sd-k4-6": { min: 4, max: 6, mid: 5, probingMin: 1 },
  "smp": { min: 7, max: 9, mid: 8, probingMin: 4 },
  "sma-reguler": { min: 10, max: 12, mid: 11, probingMin: 4 },
  "sma-utbk": { min: 7, max: 12, mid: 11, probingMin: 4 },
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
export async function initLocator(
  jalur: JalurDiagnostik,
  modeKurikulum: import("@/types").ModeKurikulumLegacy = "comprehensive",
): Promise<LocatorState> {
  const pool = await itemsForJalur(jalur, modeKurikulum);
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
  // Probe sampai probingMin (lebih lebar dari placement min) — supaya bisa
  // deteksi anak K12 yang real-nya K5 di pecahan.
  const targetKelas = Math.max(range.probingMin, Math.min(range.max, Math.round(state.kelasNow)));

  // Track sub yang sudah dipakai di Locator → prefer sub baru (anti-repeat)
  const usedSubKodes = new Set<string>();
  for (const r of state.responses) {
    const it = state.pool.find((p) => p.id === r.itemId);
    if (it) usedSubKodes.add(it.subMateriKode);
  }

  // Candidate filter: belum dipakai, kelas == targetKelas
  let candidates = state.pool.filter((it) => !state.used.has(it.id) && it.kelas === targetKelas);

  // Fallback: kalau kelas target kosong, lebar window ±1 lalu ±2
  for (let widen = 1; widen <= 3 && candidates.length === 0; widen++) {
    candidates = state.pool.filter(
      (it) => !state.used.has(it.id) && Math.abs(it.kelas - targetKelas) <= widen,
    );
  }
  if (candidates.length === 0) return null;

  // BIAS 1: prefer items dari sub yang BELUM ditest di Locator stage.
  const newSubCandidates = candidates.filter((it) => !usedSubKodes.has(it.subMateriKode));
  let finalCandidates = newSubCandidates.length > 0 ? newSubCandidates : candidates;

  // BIAS 2 (Bug C fix): untuk jalur sma-utbk, boost MAKU items (Materi Kunci UTBK).
  // Tanpa bias ini, utbk_target_sma_12 dapat kelas est K7-K8 (target K12)
  // karena MAKU items tidak diprioritaskan di Locator stage.
  if (state.jalur === "sma-utbk") {
    const makuCandidates = finalCandidates.filter((it) => it.isMaku);
    if (makuCandidates.length > 0) finalCandidates = makuCandidates;
  }

  const irtCandidates = toIrtItems(finalCandidates);
  const picked = selectMaxInfoItem(state.estimate.theta, irtCandidates, state.used);
  if (!picked) return null;
  return finalCandidates.find((c) => c.id === picked.id) ?? null;
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
  const targetKelas = Math.max(range.probingMin, Math.min(range.max, thetaToKelas(newEstimate.theta)));
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
  // Asymmetric cap:
  //   UPPER  → cap di range.max (mastery curriculum bound — anak SD K3 mastery
  //            tidak boleh dapat estimasi K6+ via IRT over-extrapolasi)
  //   LOWER  → TIDAK di-cap (anak K12 weak yang real-nya K5 di pecahan harus
  //            VISIBLE — itu info diagnosa berharga, "obat mujarab" personal)
  const range = JALUR_KELAS_RANGE[state.jalur];
  const capUpper = (k: number) => Math.min(range.max, k);
  return {
    jalur: state.jalur,
    theta: state.estimate.theta,
    se: state.estimate.se,
    kelasEstimasi: capUpper(thetaToKelas(state.estimate.theta)),
    kelasRange: [capUpper(thetaToKelas(state.estimate.ci95[0])), capUpper(thetaToKelas(state.estimate.ci95[1]))],
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
