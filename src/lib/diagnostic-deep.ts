/**
 * Deep Test — Multistage Stage 2 (drill) + Stage 3 (confirmation).
 * SRS Section 7.4.
 *
 * Setelah Coverage (Stage B) menemukan area suspect (lemah), Deep Test:
 *   - Stage 2 (Drill): zoom-in ke sub-materi spesifik di area suspect, pakai
 *     pohon prasyarat untuk turun ke prereq sampai ketemu floor (sub-materi
 *     yang dikuasai). Targetnya identifikasi blind spots per sub-materi.
 *   - Stage 3 (Confirmation): item kedua di sub-materi yang user salah di Stage 2
 *     untuk konfirmasi (kurangi false negative).
 *
 * Output akhir: SubMateriMastery[] — daftar sub-materi dengan status
 * siap / review / remediasi / unknown + confidence.
 */

import { estimateThetaEAP, selectMaxInfoItem } from "@/lib/irt-engine";
import type { Item, Response, ThetaEstimate } from "@/lib/irt-engine";
import { itemsForSubMateri, toIrtItems } from "@/lib/item-bank";
import type { ItemBankEntry } from "@/lib/item-bank";
import { cariSubMateriResmi, subMateriPerArea, subMateriPerKelas } from "@/data/peta-resmi";
import type { CoverageResult } from "@/lib/diagnostic-coverage";
import type { AreaMatematika, JenjangResmi, MasteryStatus, SubMateriMastery, SubMateriResmi } from "@/types";
import { classifyMasteryWithConfig, getClassificationConfig, type ClassificationConfig } from "@/lib/classification-config";
import { buildKelasWindowSet } from "@/lib/jenjang-utils";
import { isSubMateriExposed, type BabsExposedMap } from "@/lib/bab-exposure";

/** Per-sub-materi state selama deep test. */
type SubState = {
  kode: string;
  /** Status drill: "active" / "confirm" / "settled-ok" / "settled-bad". */
  phase: "active" | "confirm" | "settled-ok" | "settled-bad";
  responses: Response[];
  /** Kandidat items untuk sub-materi ini. */
  pool: ItemBankEntry[];
  /** Estimasi theta lokal sub-materi (kalau cukup data). */
  estimate?: ThetaEstimate;
};

export type DeepState = {
  jalur: CoverageResult["jalur"];
  jenjang: JenjangResmi;
  /** Theta global hasil Coverage — prior untuk Deep. */
  thetaGlobal: number;
  /** Sub-materi yang sedang di-drill (queue). */
  queue: SubState[];
  /** Index sub yang sedang aktif. */
  activeIdx: number;
  /** Items yang sudah dipakai di seluruh stage (anti-bocor). */
  used: Set<string>;
  /** Hasil mastery per sub-materi (build incremental). */
  mastery: Map<string, SubMateriMastery>;
  /** Threshold klasifikasi (loaded saat init dari Firestore config). */
  cfg: ClassificationConfig;
  done: boolean;
  stopReason?: "queue_empty" | "max_items" | "time_cap";
};

const DEEP_MAX_ITEMS = 30;
const DEEP_MIN_ITEMS_PER_SUB = 1;
const DEEP_MAX_ITEMS_PER_SUB = 3;
/** Threshold benar untuk auto-settle "siap" (cukup confidence dari 1 soal kalau b ≥ theta global). */
const SETTLE_OK_AFTER = 2; // 2 benar berturut → siap
const SETTLE_BAD_AFTER = 2; // 2 salah → remediasi

// ============================================================
// Selection sub-materi target dari area suspect
// ============================================================

/**
 * Pilih sub-materi yang akan di-drill dari area suspect.
 *
 * Strategi: target sub di window kelas seputar kelasEstimasi (level kemampuan
 * actual siswa), pakai bridge cross-jenjang. Untuk weak student SMA K11
 * dengan kelasEstimasi=5.82, window [5,6,7] map ke SD K5/6 + SMP K7 — sub
 * di kelas itu drilled meski siswa "secara profile" K11 SMA. Sebelumnya
 * filter `s.jenjang === userJenjang` bikin queue empty (SMA tidak ada
 * K5/6/7), Deep stage skip total.
 *
 * Sort milestone (is_maku) & high-dependents dulu — drill konsep paling
 * critical di tiap area suspect.
 */
function pilihSubTarget(
  userJenjang: JenjangResmi,
  kelasEstimasi: number,
  areas: AreaMatematika[],
  perArea: number = 4,
  babsExposed?: BabsExposedMap,
): SubMateriResmi[] {
  const target: SubMateriResmi[] = [];
  const kelasInt = Math.round(kelasEstimasi);
  const kelasWindow = [kelasInt, kelasInt - 1, kelasInt + 1].filter(
    (k) => k >= 1 && k <= 12,
  );
  const targetSet = buildKelasWindowSet(userJenjang, kelasWindow);

  for (const area of areas) {
    const areaSubs = subMateriPerArea(area).filter(
      (s) =>
        targetSet.has(`${s.jenjang}:${s.kelas}`)
        // Skip sub yang BELUM dipelajari user — Deep hanya drill yang sudah
        // exposed, supaya status remediasi vs belum_dipelajari tidak ambigu.
        // Sub belum dipelajari akan di-handle terpisah di hasil (status belum_dipelajari).
        && (!babsExposed || isSubMateriExposed(babsExposed, s.kode))
    );
    // Sort: milestone & high-dependents dulu
    areaSubs.sort((a, b) => {
      const aScore = (a.is_maku ? 100 : 0) + a.dependents_count;
      const bScore = (b.is_maku ? 100 : 0) + b.dependents_count;
      return bScore - aScore;
    });
    target.push(...areaSubs.slice(0, perArea));
  }
  return target;
}

// ============================================================
// Init
// ============================================================

export async function initDeep(
  jenjang: JenjangResmi,
  coverage: CoverageResult,
  babsExposed?: BabsExposedMap,
): Promise<DeepState> {
  const kelasEst = coverage.thetaGlobal * 1.83 + 6.5; // inverse kelasToTheta
  const targetSubs = pilihSubTarget(jenjang, kelasEst, coverage.areaSuspect, 4, babsExposed);

  // Load item pool per sub-materi
  const queue: SubState[] = [];
  for (const sub of targetSubs) {
    const pool = await itemsForSubMateri(sub.kode);
    if (pool.length === 0) continue;
    queue.push({
      kode: sub.kode,
      phase: "active",
      responses: [],
      pool,
    });
  }

  // Carry-over: items yang sudah dipakai di Coverage
  const carriedUsed = new Set(coverage.responses.map((r) => r.itemId));

  // Load threshold config dari Firestore (cached)
  const cfg = await getClassificationConfig();

  return {
    jalur: coverage.jalur,
    jenjang,
    thetaGlobal: coverage.thetaGlobal,
    queue,
    activeIdx: 0,
    used: carriedUsed,
    mastery: new Map(),
    cfg,
    done: queue.length === 0,
    stopReason: queue.length === 0 ? "queue_empty" : undefined,
  };
}

// ============================================================
// Item picking
// ============================================================

export function pickNextDeepItem(state: DeepState): { item: ItemBankEntry; subKode: string } | null {
  if (state.done) return null;
  // Skip sub yang sudah settled
  let idx = state.activeIdx;
  for (let i = 0; i < state.queue.length; i++) {
    const sub = state.queue[idx];
    if (!sub) {
      idx = (idx + 1) % state.queue.length;
      continue;
    }
    if (sub.phase === "settled-ok" || sub.phase === "settled-bad") {
      idx = (idx + 1) % state.queue.length;
      continue;
    }
    // Pick item dari pool sub ini
    const candidates = sub.pool.filter((p) => !state.used.has(p.id));
    if (candidates.length === 0) {
      idx = (idx + 1) % state.queue.length;
      continue;
    }
    const irtCandidates = toIrtItems(candidates);
    const picked = selectMaxInfoItem(state.thetaGlobal, irtCandidates, state.used);
    if (!picked) {
      idx = (idx + 1) % state.queue.length;
      continue;
    }
    const itemFull = candidates.find((c) => c.id === picked.id);
    if (!itemFull) continue;
    return { item: itemFull, subKode: sub.kode };
  }
  return null;
}

// ============================================================
// Submit & settle logic
// ============================================================

function classifyMastery(
  responses: Response[],
  thetaGlobal: number,
  itemPool: ItemBankEntry[],
  cfg: ClassificationConfig,
): { status: MasteryStatus; confidence: number } {
  if (responses.length === 0) return { status: "unknown", confidence: 0 };
  const correct = responses.filter((r) => r.correct).length;
  const total = responses.length;
  const accuracy = correct / total;

  // Estimasi theta lokal sub-materi
  const itemMap = new Map(itemPool.map((it) => [it.id, it]));
  const items: Item[] = responses
    .map((r) => itemMap.get(r.itemId))
    .filter((it): it is ItemBankEntry => !!it)
    .map((it) => ({ id: it.id, subMateriKode: it.subMateriKode, area: it.area, b: it.b, a: it.a, c: it.c }));
  const est = estimateThetaEAP(items, responses);
  const confidence = Math.max(0, Math.min(1, 1 - est.se / 2));

  const status = classifyMasteryWithConfig(accuracy, est.theta, thetaGlobal, cfg);
  return { status, confidence };
}

export function submitDeepResponse(
  state: DeepState,
  itemId: string,
  subKode: string,
  correct: boolean,
  responseTimeMs?: number,
): DeepState {
  const queueIdx = state.queue.findIndex((s) => s.kode === subKode);
  if (queueIdx < 0) return state;
  const sub = state.queue[queueIdx]!;

  const newResponses: Response[] = [...sub.responses, { itemId, correct, responseTimeMs }];
  const newUsed = new Set(state.used);
  newUsed.add(itemId);

  // Decide phase transition
  let newPhase: SubState["phase"] = sub.phase;
  const correctCount = newResponses.filter((r) => r.correct).length;
  const wrongCount = newResponses.length - correctCount;
  const totalAnswered = newResponses.length;

  if (correctCount >= SETTLE_OK_AFTER) {
    newPhase = "settled-ok";
  } else if (wrongCount >= SETTLE_BAD_AFTER) {
    newPhase = "settled-bad";
  } else if (totalAnswered >= DEEP_MAX_ITEMS_PER_SUB) {
    newPhase = correctCount >= wrongCount ? "settled-ok" : "settled-bad";
  } else if (totalAnswered >= DEEP_MIN_ITEMS_PER_SUB && !correct) {
    // Salah pertama → confirm phase
    newPhase = "confirm";
  } else {
    newPhase = "active";
  }

  // Update queue (immutable)
  const newQueue = state.queue.map((q, i) =>
    i === queueIdx ? { ...q, responses: newResponses, phase: newPhase } : q,
  );

  // Build mastery kalau settled
  const newMastery = new Map(state.mastery);
  if (newPhase === "settled-ok" || newPhase === "settled-bad") {
    const cls = classifyMastery(newResponses, state.thetaGlobal, sub.pool, state.cfg);
    newMastery.set(sub.kode, {
      kode: sub.kode,
      status: cls.status,
      confidence: cls.confidence,
      lastAssessedAt: Date.now(),
      source: "diagnostic",
    });
  }

  // Total items dipakai untuk Deep stage (gak hitung carry-over Coverage)
  const totalDeepItems = newQueue.reduce((sum, q) => sum + q.responses.length, 0);

  // Cek done — semua sub settled atau max items hit
  let done = false;
  let stopReason: DeepState["stopReason"] | undefined;
  const allSettled = newQueue.every((q) => q.phase === "settled-ok" || q.phase === "settled-bad");
  if (allSettled) {
    done = true;
    stopReason = "queue_empty";
  } else if (totalDeepItems >= DEEP_MAX_ITEMS) {
    done = true;
    stopReason = "max_items";
  }

  // Geser activeIdx ke sub berikutnya yang belum settled
  let newActiveIdx = state.activeIdx;
  if (newPhase === "settled-ok" || newPhase === "settled-bad") {
    for (let i = 1; i <= newQueue.length; i++) {
      const cand = newQueue[(state.activeIdx + i) % newQueue.length];
      if (cand && cand.phase !== "settled-ok" && cand.phase !== "settled-bad") {
        newActiveIdx = (state.activeIdx + i) % newQueue.length;
        break;
      }
    }
  }

  return {
    ...state,
    queue: newQueue,
    activeIdx: newActiveIdx,
    used: newUsed,
    mastery: newMastery,
    done,
    stopReason,
  };
}

// ============================================================
// Finalize → DeepResult
// ============================================================

export type DeepResult = {
  jalur: CoverageResult["jalur"];
  thetaGlobal: number;
  itemsUsed: number;
  stopReason: NonNullable<DeepState["stopReason"]>;
  /** Mastery final per sub-materi yang di-drill. */
  mastery: SubMateriMastery[];
  /** Sub-materi yang remediasi (paling penting → entry point untuk learning plan). */
  remediasi: SubMateriMastery[];
};

export function finalizeDeep(state: DeepState): DeepResult | null {
  if (!state.done || !state.stopReason) return null;

  // Settle sub yang masih active dengan partial data
  const allMastery = new Map(state.mastery);
  for (const sub of state.queue) {
    if (allMastery.has(sub.kode)) continue;
    if (sub.responses.length === 0) {
      allMastery.set(sub.kode, {
        kode: sub.kode,
        status: "unknown",
        confidence: 0,
        lastAssessedAt: Date.now(),
        source: "diagnostic",
      });
      continue;
    }
    const cls = classifyMastery(sub.responses, state.thetaGlobal, sub.pool, state.cfg);
    allMastery.set(sub.kode, {
      kode: sub.kode,
      status: cls.status,
      confidence: cls.confidence,
      lastAssessedAt: Date.now(),
      source: "diagnostic",
    });
  }

  const masteryArr = Array.from(allMastery.values());
  const totalItems = state.queue.reduce((sum, q) => sum + q.responses.length, 0);

  return {
    jalur: state.jalur,
    thetaGlobal: state.thetaGlobal,
    itemsUsed: totalItems,
    stopReason: state.stopReason,
    mastery: masteryArr,
    remediasi: masteryArr
      .filter((m) => m.status === "remediasi")
      .sort((a, b) => {
        // Sort: kelas terendah dulu (foundation lemah lebih penting)
        const sa = cariSubMateriResmi(a.kode);
        const sb = cariSubMateriResmi(b.kode);
        return (sa?.kelas ?? 12) - (sb?.kelas ?? 12);
      }),
  };
}

// ============================================================
// Simulasi end-to-end
// ============================================================

export async function simulateDeep(
  jenjang: JenjangResmi,
  coverage: CoverageResult,
  answerFn: (item: ItemBankEntry, subKode: string) => Promise<{ correct: boolean; responseTimeMs?: number }>,
): Promise<{ result: DeepResult | null; trace: { sub: string; itemId: string; correct: boolean }[] }> {
  let state = await initDeep(jenjang, coverage);
  const trace: { sub: string; itemId: string; correct: boolean }[] = [];
  // unused helper to silence linter
  void subMateriPerKelas;

  while (!state.done) {
    const next = pickNextDeepItem(state);
    if (!next) {
      state = { ...state, done: true, stopReason: "queue_empty" };
      break;
    }
    const ans = await answerFn(next.item, next.subKode);
    state = submitDeepResponse(state, next.item.id, next.subKode, ans.correct, ans.responseTimeMs);
    trace.push({ sub: next.subKode, itemId: next.item.id, correct: ans.correct });
  }

  return { result: finalizeDeep(state), trace };
}
