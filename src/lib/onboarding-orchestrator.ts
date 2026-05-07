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
import {
  initDrilling,
  pickNextDrillingItem,
  submitDrillingResponse,
  finalizeDrilling,
  type DrillingState,
  type DrillingResult,
} from "@/lib/diagnostic-drilling";
import type { ItemBankEntry, JalurDiagnostik } from "@/lib/item-bank";
import type { JenjangResmi, ModeKurikulum } from "@/types";
import type { Response as IrtRespEngine } from "@/lib/irt-engine";

export type OnboardingStage = "locator" | "coverage" | "deep" | "drilling" | "selesai";

/** State minimal yang round-trip antar request. */
export type OnboardingState = {
  jalur: JalurDiagnostik;
  jenjang: JenjangResmi;
  /** Kelas user (untuk auto-derive cluster + foundation target). */
  kelas?: number;
  /** Mode kurikulum untuk filter item pool. Default "full". */
  modeKurikulum: ModeKurikulum;
  /**
   * Bab yang sudah dipelajari user — untuk scoping cluster A.
   * Diset di startOnboarding dari user input. Tidak ada (undefined) = treat all bab exposed.
   */
  babsExposed?: import("@/lib/bab-exposure").BabsExposedMap;
  stage: OnboardingStage;
  /** Semua response sejauh ini (cumulative). */
  responses: IrtRespEngine[];
  /** Hasil snapshot per stage — disimpan biar gak recompute terus. */
  hasilLocator?: LocatorResult;
  hasilCoverage?: CoverageResult;
  hasilDeep?: DeepResult;
  hasilDrilling?: DrillingResult;
  /**
   * Snapshot drilling state (items pre-allocated saat init) — disimpan
   * supaya rehydrate konsisten antar request, tidak re-roll item selection.
   */
  drillingSnapshot?: DrillingState;
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
  drilling: 30,
  selesai: 0,
};

const STAGE_LABEL: Record<OnboardingStage, string> = {
  locator: "Tahap 1: Cek level kelas",
  coverage: "Tahap 2: Cek per area",
  deep: "Tahap 3: Cek detail",
  drilling: "Tahap 4: Drilling adaptif",
  selesai: "Selesai",
};

// ============================================================
// Re-hydrate state per stage
// ============================================================

async function rehydrateLocator(state: OnboardingState): Promise<LocatorState> {
  let s = await initLocator(state.jalur, state.modeKurikulum);
  // Replay responses
  for (const r of state.responses) {
    s = submitLocatorResponse(s, r.itemId, r.correct, r.responseTimeMs);
  }
  return s;
}

async function rehydrateCoverage(state: OnboardingState): Promise<CoverageState> {
  const userProfile = state.kelas !== undefined
    ? { jenjang: state.jenjang, kelas: state.kelas }
    : undefined;
  let s = await initCoverage(state.jalur, state.hasilLocator, state.modeKurikulum, state.babsExposed, userProfile);
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
  let s = await initDeep(state.jenjang, state.hasilCoverage, state.babsExposed);
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

async function ensureDrillingSnapshot(state: OnboardingState): Promise<DrillingState> {
  if (!state.hasilCoverage) throw new Error("Drilling butuh coverage result");
  if (state.kelas === undefined) throw new Error("Drilling butuh kelas user");
  // Pakai snapshot kalau ada (item allocation deterministic — tidak boleh re-roll)
  if (state.drillingSnapshot) return state.drillingSnapshot;
  // Pre-drilling items: SEMUA itemId yang sudah ada di state.responses
  // (locator + coverage + deep) supaya drilling step.items tidak overlap.
  const previouslyUsedIds = state.responses.map((r) => r.itemId);
  return await initDrilling(state.jenjang, state.kelas, state.hasilCoverage, previouslyUsedIds);
}

function rehydrateDrillingFromSnapshot(
  snapshot: DrillingState,
  state: OnboardingState,
): DrillingState {
  // Cari response yang BUKAN bagian dari Locator/Coverage/Deep stages
  const previousIds = new Set<string>();
  if (state.hasilCoverage) {
    for (const r of state.hasilCoverage.responses) previousIds.add(r.itemId);
  }
  // Deep responses: semua items yang berada di pool deep stage
  // (gak punya hasilDeep.responses → infer dari snapshot.usedIds awal)
  const initialUsed = new Set(snapshot.usedIds);
  const drillingResponses = state.responses.filter(
    (r) => !previousIds.has(r.itemId) && !initialUsed.has(r.itemId),
  );
  let s = snapshot;
  for (const r of drillingResponses) {
    s = submitDrillingResponse(s, r.itemId, r.correct, r.responseTimeMs);
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
  modeKurikulum: ModeKurikulum = "comprehensive",
  kelas?: number,
  babsExposed?: import("@/lib/bab-exposure").BabsExposedMap,
): Promise<OnboardingStep> {
  const state: OnboardingState = {
    jalur,
    jenjang,
    kelas,
    modeKurikulum,
    babsExposed,
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
      const userProfile = state.kelas !== undefined
        ? {
            jenjang: state.jenjang,
            kelas: state.kelas,
            isUtbkTarget: state.jalur === "sma-utbk",
          }
        : undefined;
      const result = await finalizeCoverage(cov, userProfile);
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
      // No coverage result → skip deep+drilling, langsung selesai
      const newState: OnboardingState = { ...state, stage: "selesai" };
      return { state: newState, nextItem: null, done: true, progress: { stage: "selesai", itemsAnswered: state.responses.length, estimatedTotal: 0, label: STAGE_LABEL.selesai } };
    }
    const deep = await rehydrateDeep(state);
    if (deep.done) {
      const result = finalizeDeep(deep);
      // PHASE 4: Diagnostik berhenti setelah Deep — drilling jadi modul Program Belajar
      // terpisah, bukan bagian tes. Anak burnout kalau tes 60-100 soal sekaligus.
      // Logic drilling tetap ada di codebase (akan di-repurpose untuk generator
      // Program Belajar di iterasi berikutnya).
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

  // STAGE 4: DRILLING
  if (state.stage === "drilling") {
    // Skip kalau prereq tidak terpenuhi
    if (!state.hasilCoverage || state.kelas === undefined || !state.hasilCoverage.pathRoute) {
      const newState: OnboardingState = { ...state, stage: "selesai" };
      return { state: newState, nextItem: null, done: true, progress: { stage: "selesai", itemsAnswered: state.responses.length, estimatedTotal: 0, label: STAGE_LABEL.selesai } };
    }
    // Init or load snapshot
    const snapshot = await ensureDrillingSnapshot(state);
    const stateWithSnapshot: OnboardingState = state.drillingSnapshot
      ? state
      : { ...state, drillingSnapshot: snapshot };

    const drill = rehydrateDrillingFromSnapshot(snapshot, stateWithSnapshot);
    if (drill.done) {
      const result = finalizeDrilling(drill);
      const newState: OnboardingState = {
        ...stateWithSnapshot,
        stage: "selesai",
        hasilDrilling: result ?? undefined,
        drillingSnapshot: drill,
      };
      return { state: newState, nextItem: null, done: true, progress: { stage: "selesai", itemsAnswered: state.responses.length, estimatedTotal: 0, label: STAGE_LABEL.selesai } };
    }
    const next = pickNextDrillingItem(drill);
    if (!next) {
      // Force done — semua sub-step sudah dieksekusi tapi belum di-mark done
      const newState: OnboardingState = {
        ...stateWithSnapshot,
        stage: "selesai",
        hasilDrilling: finalizeDrilling({ ...drill, done: true, stopReason: "all_done" }) ?? undefined,
        drillingSnapshot: drill,
      };
      return { state: newState, nextItem: null, done: true, progress: { stage: "selesai", itemsAnswered: state.responses.length, estimatedTotal: 0, label: STAGE_LABEL.selesai } };
    }
    // Hitung items at stage = total drilling responses sejauh ini
    const drillingItemsAnswered = drill.steps.reduce((sum, s) => sum + s.responses.length, 0);
    const drillingItemsTotal = drill.steps.reduce((sum, s) => sum + s.items.length, 0);
    const currentStep = drill.steps[drill.currentStepIdx];
    const stepLabel = currentStep ? `Drilling — ${currentStep.config.label}` : STAGE_LABEL.drilling;
    return {
      state: stateWithSnapshot,
      nextItem: next.item,
      done: false,
      progress: {
        stage: "drilling",
        itemsAnswered: drillingItemsAnswered,
        estimatedTotal: drillingItemsTotal || ESTIMATED_TOTALS.drilling,
        label: stepLabel,
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
  hasilDrilling?: DrillingResult;
  hasilMaturity?: import("@/lib/mathematical-maturity").MaturityProfile;
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
    hasilDrilling: state.hasilDrilling,
  };
}

/**
 * Async helper: compute Mathematical Maturity dari responses + items.
 * Dipanggil terpisah dari buildResult() karena butuh fetch items dari Firestore.
 *
 * @param state OnboardingState dengan responses lengkap
 * @param userConfidenceRating Optional dari user (1-5)
 */
export async function computeMaturityProfile(
  state: OnboardingState,
  userConfidenceRating?: number,
): Promise<import("@/lib/mathematical-maturity").MaturityProfile | null> {
  if (state.responses.length === 0) return null;
  const { computeMaturity } = await import("@/lib/mathematical-maturity");
  const { loadItem } = await import("@/lib/item-bank");
  const itemIds = [...new Set(state.responses.map((r) => r.itemId))];
  const items = (await Promise.all(itemIds.map((id) => loadItem(id)))).filter(
    (it): it is import("@/lib/item-bank").ItemBankEntry => it !== null,
  );
  return computeMaturity(state.responses, items, userConfidenceRating);
}

