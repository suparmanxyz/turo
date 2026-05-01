/**
 * Area Coverage — Stage B Fast Test (SRS Section 7.3)
 *
 * Tujuan: setelah Locator menemukan kelas estimasi, sebarkan soal balanced antar
 * AREA matematika (bilangan/aljabar/geometri/statistik/dll) untuk dapat profil
 * kemampuan per-area + identifikasi area yang lemah.
 *
 * Algoritma:
 *   1. Mulai dari prior theta hasil Locator.
 *   2. Pilih item dengan content balancing — area dengan gap target-actual terbesar dulu.
 *   3. Pilih max-info item di area itu, prioritas item yang b ≈ theta sekarang.
 *   4. Update theta global + theta per-area secara incremental.
 *   5. Stop kalau SE global < 0.3 atau quota area terpenuhi atau max items hit.
 *
 * Target distribusi default: equal weight per area aktif di jalur (SD: bilangan dominan;
 * SMP: bilangan+aljabar+geometri equal; SMA: aljabar+geometri+kalkulus+statistik).
 */

import { estimateThetaEAP, selectBalancedItem } from "@/lib/irt-engine";
import type { Item, Response, ThetaEstimate } from "@/lib/irt-engine";
import { itemsForJalur, toIrtItems } from "@/lib/item-bank";
import type { ItemBankEntry, JalurDiagnostik } from "@/lib/item-bank";
import type { LocatorResult } from "@/lib/diagnostic-locator";
import type { AreaMatematika } from "@/types";
import { classifyAreaWithConfig, getClassificationConfig } from "@/lib/classification-config";

/** Distribusi target area per jalur (proportion, sum to 1). */
const AREA_TARGETS: Record<JalurDiagnostik, Map<AreaMatematika, number>> = {
  "sd-k1-3": new Map<AreaMatematika, number>([
    ["bilangan", 0.6],
    ["geometri", 0.25],
    ["statistik", 0.15],
  ]),
  "sd-k4-6": new Map<AreaMatematika, number>([
    ["bilangan", 0.45],
    ["geometri", 0.25],
    ["aljabar", 0.15],
    ["statistik", 0.15],
  ]),
  "smp": new Map<AreaMatematika, number>([
    ["bilangan", 0.25],
    ["aljabar", 0.30],
    ["geometri", 0.25],
    ["statistik", 0.20],
  ]),
  "sma-reguler": new Map<AreaMatematika, number>([
    ["aljabar", 0.30],
    ["geometri", 0.20],
    ["kalkulus", 0.20],
    ["statistik", 0.15],
    ["trigonometri", 0.15],
  ]),
  "sma-utbk": new Map<AreaMatematika, number>([
    ["bilangan", 0.20],
    ["aljabar", 0.30],
    ["geometri", 0.20],
    ["statistik", 0.20],
    ["logika", 0.10],
  ]),
};

/** State Coverage stage. */
export type CoverageState = {
  jalur: JalurDiagnostik;
  pool: ItemBankEntry[];
  used: Set<string>;
  responses: Response[];
  estimate: ThetaEstimate;
  /** Jumlah pemakaian per area. */
  areaUsed: Map<AreaMatematika, number>;
  /** Theta per area (estimasi parsial — pakai responses sub-set di area itu). */
  thetaByArea: Map<AreaMatematika, ThetaEstimate>;
  done: boolean;
  stopReason?: "se_threshold" | "max_items" | "pool_empty" | "quota_full";
};

const COVERAGE_SE_THRESHOLD = 0.3;
const COVERAGE_MIN_ITEMS = 8;
const COVERAGE_MAX_ITEMS = 18;

/** Init Coverage state — pakai prior dari Locator (bisa skip Locator dengan flat prior). */
export async function initCoverage(
  jalur: JalurDiagnostik,
  prior?: LocatorResult,
  modeKurikulum: "strict" | "full" = "full",
): Promise<CoverageState> {
  const pool = await itemsForJalur(jalur, modeKurikulum);
  const initialEstimate: ThetaEstimate = prior
    ? { theta: prior.theta, se: prior.se, ci95: [prior.theta - 1.96 * prior.se, prior.theta + 1.96 * prior.se], n: 0 }
    : { theta: 0, se: Infinity, ci95: [-Infinity, Infinity], n: 0 };

  // Carry-over: kalau Locator sudah punya responses, masukkan ke state Coverage
  // supaya estimasi continue (SRS section 7.2 → carry-over efisien).
  const carriedResponses = prior?.responses ?? [];
  const carriedUsed = new Set(carriedResponses.map((r) => r.itemId));
  const areaUsed = new Map<AreaMatematika, number>();
  for (const id of carriedUsed) {
    const it = pool.find((p) => p.id === id);
    if (it) areaUsed.set(it.area, (areaUsed.get(it.area) ?? 0) + 1);
  }

  return {
    jalur,
    pool,
    used: carriedUsed,
    responses: carriedResponses,
    estimate: initialEstimate,
    areaUsed,
    thetaByArea: new Map(),
    done: false,
  };
}

/** Cek quota — semua area target sudah punya minimal 2 item? */
function quotaTerpenuhi(state: CoverageState, minPerArea: number = 2): boolean {
  const targets = AREA_TARGETS[state.jalur];
  for (const area of targets.keys()) {
    if ((state.areaUsed.get(area) ?? 0) < minPerArea) return false;
  }
  return true;
}

/** Pick item berikut — content balanced. */
export function pickNextCoverageItem(state: CoverageState): ItemBankEntry | null {
  const targets = AREA_TARGETS[state.jalur];
  // Filter ke area yang ada di target jalur (skip area irrelevant)
  const eligible = state.pool.filter((it) => targets.has(it.area) && !state.used.has(it.id));
  if (eligible.length === 0) return null;

  const irtCandidates = toIrtItems(eligible);
  const picked = selectBalancedItem(
    state.estimate.theta,
    irtCandidates,
    state.used,
    targets,
    state.areaUsed,
  );
  if (!picked) return null;
  return eligible.find((c) => c.id === picked.id) ?? null;
}

/** Submit response → re-estimate global + per-area, cek stop. */
export function submitCoverageResponse(
  state: CoverageState,
  itemId: string,
  correct: boolean,
  responseTimeMs?: number,
): CoverageState {
  const item = state.pool.find((it) => it.id === itemId);
  if (!item) return state;

  const newUsed = new Set(state.used);
  newUsed.add(itemId);
  const newResponses: Response[] = [...state.responses, { itemId, correct, responseTimeMs }];

  // Global theta
  const allItems: Item[] = state.pool
    .filter((it) => newUsed.has(it.id))
    .map((it) => ({ id: it.id, subMateriKode: it.subMateriKode, area: it.area, b: it.b, a: it.a, c: it.c }));
  const newEstimate = estimateThetaEAP(allItems, newResponses);

  // Per-area theta — re-estimate untuk tiap area yang punya min 2 responses
  const newThetaByArea = new Map<AreaMatematika, ThetaEstimate>();
  const targets = AREA_TARGETS[state.jalur];
  for (const area of targets.keys()) {
    const areaItems = state.pool.filter((it) => it.area === area && newUsed.has(it.id));
    if (areaItems.length < 2) continue;
    const areaItemIds = new Set(areaItems.map((i) => i.id));
    const areaResponses = newResponses.filter((r) => areaItemIds.has(r.itemId));
    const areaIrt: Item[] = areaItems.map((it) => ({
      id: it.id,
      subMateriKode: it.subMateriKode,
      area: it.area,
      b: it.b,
      a: it.a,
      c: it.c,
    }));
    newThetaByArea.set(area, estimateThetaEAP(areaIrt, areaResponses));
  }

  // Update areaUsed
  const newAreaUsed = new Map(state.areaUsed);
  newAreaUsed.set(item.area, (newAreaUsed.get(item.area) ?? 0) + 1);

  // Check stop
  let done = false;
  let stopReason: CoverageState["stopReason"] | undefined;
  const n = newResponses.length;
  if (n >= COVERAGE_MAX_ITEMS) {
    done = true;
    stopReason = "max_items";
  } else if (state.pool.filter((it) => !newUsed.has(it.id) && targets.has(it.area)).length === 0) {
    done = true;
    stopReason = "pool_empty";
  } else if (n >= COVERAGE_MIN_ITEMS && newEstimate.se < COVERAGE_SE_THRESHOLD) {
    // SE threshold — hanya berlaku kalau quota juga terpenuhi
    const tempState = { ...state, areaUsed: newAreaUsed };
    if (quotaTerpenuhi(tempState)) {
      done = true;
      stopReason = "se_threshold";
    }
  } else if (n >= COVERAGE_MIN_ITEMS) {
    const tempState = { ...state, areaUsed: newAreaUsed };
    if (quotaTerpenuhi(tempState, 3)) {
      done = true;
      stopReason = "quota_full";
    }
  }

  return {
    ...state,
    used: newUsed,
    responses: newResponses,
    estimate: newEstimate,
    areaUsed: newAreaUsed,
    thetaByArea: newThetaByArea,
    done,
    stopReason,
  };
}

// ============================================================
// Hasil akhir Coverage
// ============================================================

export type AreaProfile = {
  area: AreaMatematika;
  itemsAnswered: number;
  /** Jumlah benar di area ini. */
  itemsCorrect: number;
  /** Accuracy = correct/answered. Signal kuat untuk klasifikasi. */
  accuracy: number;
  theta: number;
  se: number;
  /** Klasifikasi qualitative untuk laporan: "kuat" / "cukup" / "lemah" / "data_kurang" */
  status: "kuat" | "cukup" | "lemah" | "data_kurang";
};

export type CoverageResult = {
  jalur: JalurDiagnostik;
  thetaGlobal: number;
  seGlobal: number;
  itemsUsed: number;
  stopReason: NonNullable<CoverageState["stopReason"]>;
  perArea: AreaProfile[];
  /** Area yang lemah relatif theta global — kandidat target Stage 2 (B5). */
  areaSuspect: AreaMatematika[];
  responses: Response[];
};

// classifyArea sekarang baca config from classification-config.ts (bisa di-tune admin).

export async function finalizeCoverage(state: CoverageState): Promise<CoverageResult | null> {
  if (!state.done || !state.stopReason) return null;
  const cfg = await getClassificationConfig();
  const targets = AREA_TARGETS[state.jalur];
  const perArea: AreaProfile[] = [];
  for (const area of targets.keys()) {
    const themEst = state.thetaByArea.get(area);
    const used = state.areaUsed.get(area) ?? 0;
    // Hitung accuracy per area dari responses yang itemsnya milik area ini
    const areaItemIds = new Set(
      state.pool.filter((it) => it.area === area && state.used.has(it.id)).map((it) => it.id),
    );
    const areaResponses = state.responses.filter((r) => areaItemIds.has(r.itemId));
    const itemsCorrect = areaResponses.filter((r) => r.correct).length;
    const itemsAnswered = areaResponses.length;
    const accuracy = itemsAnswered > 0 ? itemsCorrect / itemsAnswered : 0;

    if (!themEst || used < 2) {
      // Data kurang TAPI kalau ada >=1 jawaban dan accuracy ≤ threshold lemah, kasih sinyal "lemah"
      const fallbackStatus: AreaProfile["status"] =
        itemsAnswered >= 1 && accuracy <= cfg.coverageLemahMaxAcc ? "lemah" : "data_kurang";
      perArea.push({
        area, itemsAnswered, itemsCorrect, accuracy,
        theta: state.estimate.theta, se: Infinity, status: fallbackStatus,
      });
      continue;
    }
    perArea.push({
      area,
      itemsAnswered,
      itemsCorrect,
      accuracy,
      theta: themEst.theta,
      se: themEst.se,
      status: classifyAreaWithConfig(accuracy, themEst.theta, state.estimate.theta, cfg),
    });
  }
  const areaSuspect = perArea
    .filter((p) => p.status === "lemah")
    .sort((a, b) => a.theta - b.theta) // paling lemah dulu
    .map((p) => p.area);

  return {
    jalur: state.jalur,
    thetaGlobal: state.estimate.theta,
    seGlobal: state.estimate.se,
    itemsUsed: state.responses.length,
    stopReason: state.stopReason,
    perArea,
    areaSuspect,
    responses: state.responses,
  };
}

// ============================================================
// Simulasi end-to-end (testing)
// ============================================================

export async function simulateCoverage(
  jalur: JalurDiagnostik,
  answerFn: (item: ItemBankEntry) => Promise<{ correct: boolean; responseTimeMs?: number }>,
  prior?: LocatorResult,
): Promise<{ result: CoverageResult | null; trace: { area: AreaMatematika; itemId: string; correct: boolean; theta: number; se: number }[] }> {
  let state = await initCoverage(jalur, prior);
  const trace: { area: AreaMatematika; itemId: string; correct: boolean; theta: number; se: number }[] = [];

  while (!state.done) {
    const item = pickNextCoverageItem(state);
    if (!item) {
      state = { ...state, done: true, stopReason: "pool_empty" };
      break;
    }
    const ans = await answerFn(item);
    state = submitCoverageResponse(state, item.id, ans.correct, ans.responseTimeMs);
    trace.push({
      area: item.area,
      itemId: item.id,
      correct: ans.correct,
      theta: state.estimate.theta,
      se: state.estimate.se,
    });
  }

  return { result: await finalizeCoverage(state), trace };
}
