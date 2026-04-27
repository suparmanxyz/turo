/**
 * Onboarding Orchestrator — chain Locator → Coverage → Deep di satu state machine.
 * SRS Section 7.0 (Diagnostic Engine high-level flow).
 *
 * Stateless di server: client kirim full state per request, server recompute
 * next item. State kecil (responses[] + stage marker), aman di-roundtrip.
 *
 * Kalau pool item bank kosong → fallback "no-data": skip stage, mark unknown.
 */

import {
  initLocator,
  pickNextLocatorItem,
  submitLocatorResponse,
  finalizeLocator,
  type LocatorState,
  type LocatorResult,
} from "@/lib/diagnostic-locator";
import {
  initCoverage,
  pickNextCoverageItem,
  submitCoverageResponse,
  finalizeCoverage,
  type CoverageState,
  type CoverageResult,
} from "@/lib/diagnostic-coverage";
import {
  initDeep,
  pickNextDeepItem,
  submitDeepResponse,
  finalizeDeep,
  type DeepState,
  type DeepResult,
} from "@/lib/diagnostic-deep";
import type { ItemBankEntry, JalurDiagnostik } from "@/lib/item-bank";
import type { JenjangResmi } from "@/types";
import type { Response as IrtRespEngine } from "@/lib/irt-engine";

export type OnboardingStage = "locator" | "coverage" | "deep" | "selesai";

/** State minimal yang round-trip antar request. */
export type OnboardingState = {
  jalur: JalurDiagnostik;
  jenjang: JenjangResmi;
  stage: OnboardingStage;
  /** Semua response sejauh ini (cumulative). */
  responses: IrtRespEngine[];
  /** Hasil snapshot per stage — disimpan biar gak recompute terus. */
  hasilLocator?: LocatorResult;
  hasilCoverage?: CoverageResult;
  hasilDeep?: DeepResult;
};

export type OnboardingStep = {
  state: OnboardingState;
  /** Next item buat user, null kalau done. */
  nextItem: ItemBankEntry | null;
  done: boolean;
  /** Progress untuk UI. */
  progress: {
    stage: OnboardingStage;
    itemsAnswered: number;
    /** Estimasi total item (untuk progress bar). */
    estimatedTotal: number;
    label: string;
  };
};

const ESTIMATED_TOTALS: Record<OnboardingStage, number> = {
  locator: 7,
  coverage: 18,
  deep: 30,
  selesai: 0,
};

const STAGE_LABEL: Record<OnboardingStage, string> = {
  locator: "Tahap 1: Cek level kelas",
  coverage: "Tahap 2: Cek per area",
  deep: "Tahap 3: Cek detail",
  selesai: "Selesai",
};

// ============================================================
// Re-hydrate state per stage
// ============================================================

async function rehydrateLocator(state: OnboardingState): Promise<LocatorState> {
  let s = await initLocator(state.jalur);
  // Replay responses
  for (const r of state.responses) {
    s = submitLocatorResponse(s, r.itemId, r.correct, r.responseTimeMs);
  }
  return s;
}

async function rehydrateCoverage(state: OnboardingState): Promise<CoverageState> {
  let s = await initCoverage(state.jalur, state.hasilLocator);
  // Filter responses yang BUKAN bagian dari Locator (carry-over sudah di-init)
  const carriedIds = new Set(state.hasilLocator?.responses.map((r) => r.itemId) ?? []);
  const newResponses = state.responses.filter((r) => !carriedIds.has(r.itemId));
  for (const r of newResponses) {
    s = submitCoverageResponse(s, r.itemId, r.correct, r.responseTimeMs);
  }
  return s;
}

async function rehydrateDeep(state: OnboardingState): Promise<DeepState> {
  if (!state.hasilCoverage) throw new Error("Deep stage butuh coverage result");
  let s = await initDeep(state.jenjang, state.hasilCoverage);
  // Replay deep responses (those after coverage finished)
  const previousIds = new Set(state.hasilCoverage.responses.map((r) => r.itemId));
  const deepResponses = state.responses.filter((r) => !previousIds.has(r.itemId));
  for (const r of deepResponses) {
    // Need to find subKode for this item — search queue
    const sub = s.queue.find((q) => q.pool.some((p) => p.id === r.itemId));
    if (!sub) continue;
    s = submitDeepResponse(s, r.itemId, sub.kode, r.correct, r.responseTimeMs);
  }
  return s;
}

// ============================================================
// Step orchestration
// ============================================================

/** Mulai onboarding — return state initial + first item. */
export async function startOnboarding(
  jalur: JalurDiagnostik,
  jenjang: JenjangResmi,
): Promise<OnboardingStep> {
  const state: OnboardingState = {
    jalur,
    jenjang,
    stage: "locator",
    responses: [],
  };
  return await nextStep(state);
}

/** Submit answer + advance ke next item (atau next stage). */
export async function submitAnswer(
  state: OnboardingState,
  itemId: string,
  correct: boolean,
  responseTimeMs?: number,
): Promise<OnboardingStep> {
  const newState: OnboardingState = {
    ...state,
    responses: [...state.responses, { itemId, correct, responseTimeMs }],
  };
  return await nextStep(newState);
}

/** Compute next step — pick next item, transition stage kalau perlu. */
async function nextStep(state: OnboardingState): Promise<OnboardingStep> {
  // STAGE 1: LOCATOR
  if (state.stage === "locator") {
    const loc = await rehydrateLocator(state);
    if (loc.done) {
      const result = finalizeLocator(loc);
      const newState: OnboardingState = { ...state, stage: "coverage", hasilLocator: result ?? undefined };
      return await nextStep(newState);
    }
    const item = pickNextLocatorItem(loc);
    if (!item) {
      // Pool kosong di Locator → skip ke coverage dengan flat prior
      const newState: OnboardingState = { ...state, stage: "coverage" };
      return await nextStep(newState);
    }
    return {
      state,
      nextItem: item,
      done: false,
      progress: {
        stage: "locator",
        itemsAnswered: state.responses.length,
        estimatedTotal: ESTIMATED_TOTALS.locator,
        label: STAGE_LABEL.locator,
      },
    };
  }

  // STAGE 2: COVERAGE
  if (state.stage === "coverage") {
    const cov = await rehydrateCoverage(state);
    if (cov.done) {
      const result = finalizeCoverage(cov);
      const newState: OnboardingState = { ...state, stage: "deep", hasilCoverage: result ?? undefined };
      return await nextStep(newState);
    }
    const item = pickNextCoverageItem(cov);
    if (!item) {
      const newState: OnboardingState = { ...state, stage: "deep" };
      return await nextStep(newState);
    }
    const itemsAtStage = state.responses.length - (state.hasilLocator?.itemsUsed ?? 0);
    return {
      state,
      nextItem: item,
      done: false,
      progress: {
        stage: "coverage",
        itemsAnswered: itemsAtStage,
        estimatedTotal: ESTIMATED_TOTALS.coverage,
        label: STAGE_LABEL.coverage,
      },
    };
  }

  // STAGE 3: DEEP
  if (state.stage === "deep") {
    if (!state.hasilCoverage) {
      // No coverage result → skip deep, langsung selesai
      const newState: OnboardingState = { ...state, stage: "selesai" };
      return { state: newState, nextItem: null, done: true, progress: { stage: "selesai", itemsAnswered: state.responses.length, estimatedTotal: 0, label: STAGE_LABEL.selesai } };
    }
    const deep = await rehydrateDeep(state);
    if (deep.done) {
      const result = finalizeDeep(deep);
      const newState: OnboardingState = { ...state, stage: "selesai", hasilDeep: result ?? undefined };
      return { state: newState, nextItem: null, done: true, progress: { stage: "selesai", itemsAnswered: state.responses.length, estimatedTotal: 0, label: STAGE_LABEL.selesai } };
    }
    const next = pickNextDeepItem(deep);
    if (!next) {
      const result = finalizeDeep({ ...deep, done: true, stopReason: "queue_empty" });
      const newState: OnboardingState = { ...state, stage: "selesai", hasilDeep: result ?? undefined };
      return { state: newState, nextItem: null, done: true, progress: { stage: "selesai", itemsAnswered: state.responses.length, estimatedTotal: 0, label: STAGE_LABEL.selesai } };
    }
    const itemsAtStage = state.responses.length - (state.hasilLocator?.itemsUsed ?? 0) - (state.hasilCoverage.itemsUsed - (state.hasilLocator?.itemsUsed ?? 0));
    return {
      state,
      nextItem: next.item,
      done: false,
      progress: {
        stage: "deep",
        itemsAnswered: itemsAtStage,
        estimatedTotal: ESTIMATED_TOTALS.deep,
        label: STAGE_LABEL.deep,
      },
    };
  }

  // SELESAI
  return {
    state,
    nextItem: null,
    done: true,
    progress: { stage: "selesai", itemsAnswered: state.responses.length, estimatedTotal: 0, label: STAGE_LABEL.selesai },
  };
}

/** Sumarisasi hasil akhir untuk laporan. */
export type OnboardingResult = {
  jalur: JalurDiagnostik;
  thetaGlobal: number;
  kelasEstimasi: number;
  totalItems: number;
  hasilLocator?: LocatorResult;
  hasilCoverage?: CoverageResult;
  hasilDeep?: DeepResult;
};

export function buildResult(state: OnboardingState): OnboardingResult {
  const theta = state.hasilCoverage?.thetaGlobal ?? state.hasilLocator?.theta ?? 0;
  const kelasEst = state.hasilLocator?.kelasEstimasi ?? (theta * 1.83 + 6.5);
  return {
    jalur: state.jalur,
    thetaGlobal: theta,
    kelasEstimasi: kelasEst,
    totalItems: state.responses.length,
    hasilLocator: state.hasilLocator,
    hasilCoverage: state.hasilCoverage,
    hasilDeep: state.hasilDeep,
  };
}

