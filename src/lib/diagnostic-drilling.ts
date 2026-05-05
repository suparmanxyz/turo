/**
 * Phase 2 Drilling Engine — adaptive multi-step drilling setelah Coverage.
 *
 * Setelah Locator → Coverage selesai dan kita dapat `pathRoute` (ADVANCED /
 * STANDARD / COMPREHENSIVE / INTENSIVE), Drilling Engine eksekusi 3-4 step
 * bertahap untuk:
 *   - Verifikasi placement (anti-luck) di ADVANCED
 *   - Repair foundation gap di STANDARD/COMPREHENSIVE
 *   - Rebuild foundation emergency di INTENSIVE
 *
 * Strategi per path mengikuti Integral spec Table 5 + adaptasi PUFM (Liping Ma).
 *
 * Prinsip:
 *   - State plan-driven: blueprint per path → resolve target sub-materi & item
 *     mix saat init, jadi step list pre-computed → replay-friendly.
 *   - Per step: items pre-loaded dari item bank pakai pickItemsWithMix.
 *   - Settle per step: accuracy >= passThreshold → "passed", else "weak".
 *     Kedua status tetap lanjut (drilling adalah diagnostik tambahan, bukan
 *     gating).
 */

import {
  pickItemsWithMix,
  type ItemBankEntry,
} from "@/lib/item-bank";
import type { Response } from "@/lib/irt-engine";
import {
  cariSubMateriResmi,
  subMateriPerArea,
  subMateriPerKelas,
} from "@/data/peta-resmi";
import {
  getFoundationKodes,
  pickFoundationTarget,
  type FoundationTarget,
} from "@/lib/foundation-set";
import { getSmartGranularity, type GranularityClassification } from "@/lib/smart-granularity";
import type { CoverageResult } from "@/lib/diagnostic-coverage";
import type { AreaMatematika, JenjangResmi, SubMateriResmi } from "@/types";

// ============================================================
// Types
// ============================================================

export type DrillingPathName =
  | "ADVANCED"
  | "STANDARD"
  | "COMPREHENSIVE"
  | "INTENSIVE";

export type DrillingStepKind =
  // ADVANCED
  | "verification"
  | "integration_testing"
  | "strategy_applied"
  // STANDARD
  | "priority_gap"
  | "foundation_repair"
  | "integration_check"
  | "confidence_building"
  // COMPREHENSIVE
  | "foundation_first"
  | "supporting_bridge"
  | "direct_prereq"
  | "integration_minimal"
  // INTENSIVE
  | "foundation_emergency"
  | "bridge_building"
  | "selective_cluster_a"
  | "reality_check";

export type DrillingStepStatus =
  | "pending"
  | "in_progress"
  | "passed"
  | "weak"
  | "skipped";

/** Mix item difficulty per sub-materi target (ambil dari pool). */
export type ItemMix = { easy: number; medium: number; hard: number };

/** Source dari mana sub-materi target diambil. */
export type SubSource =
  | "cluster_a_top"      // sub kelas user, prioritas dependents
  | "area_suspect"       // sub di area lemah
  | "foundation_set"     // sub dari Universal Foundation Set
  | "cluster_b_supporting" // sub kelas <= user (bukan foundation)
  | "cross_cluster";     // mix

export type DrillingStepConfig = {
  kind: DrillingStepKind;
  label: string;
  description: string;
  /** Berapa sub-materi disasar di step ini. */
  targetSubCount: number;
  /** Mix per sub. Total per step = targetSubCount × (easy+medium+hard). */
  mixPerSub: ItemMix;
  /** Sumber pemilihan sub-materi target. */
  source: SubSource;
  /** Threshold accuracy untuk PASS. */
  passThreshold: number;
};

export type DrillingStep = {
  config: DrillingStepConfig;
  /** Sub-materi yang disasar (resolved dari source). */
  targetKodes: string[];
  /** Items pre-loaded untuk step ini. */
  items: ItemBankEntry[];
  /** Responses sejauh ini di step. */
  responses: Response[];
  status: DrillingStepStatus;
  accuracy?: number;
};

export type DrillingState = {
  path: DrillingPathName;
  jenjang: JenjangResmi;
  kelas: number;
  thetaGlobal: number;
  steps: DrillingStep[];
  /** Index step yang sedang aktif. */
  currentStepIdx: number;
  /** Item IDs yang sudah dipakai (carry-over Coverage + drilling progress). */
  usedIds: string[];
  done: boolean;
  stopReason?: "all_done" | "no_items_left";
};

// ============================================================
// Blueprints per path
// ============================================================

/**
 * Blueprint per path. Items count default tuning:
 *   - "easy" lebih banyak di intensive
 *   - "hard" lebih banyak di advanced
 */
const PATH_BLUEPRINTS: Record<DrillingPathName, DrillingStepConfig[]> = {
  ADVANCED: [
    {
      kind: "verification",
      label: "Verifikasi Placement",
      description: "Pastikan placement bukan luck — soal hard di topik kuat.",
      targetSubCount: 2,
      mixPerSub: { easy: 0, medium: 1, hard: 2 }, // 2×3 = 6 soal
      source: "cluster_a_top",
      passThreshold: 0.75,
    },
    {
      kind: "integration_testing",
      label: "Integration Testing",
      description: "Soal multi-step menguji penalaran lintas konsep.",
      targetSubCount: 3,
      mixPerSub: { easy: 0, medium: 2, hard: 1 }, // 3×3 = 9 soal
      source: "cross_cluster",
      passThreshold: 0.70,
    },
    {
      kind: "strategy_applied",
      label: "Strategi Terapan",
      description: "Soal aplikatif konteks SNBT/HOTS.",
      targetSubCount: 2,
      mixPerSub: { easy: 0, medium: 1, hard: 2 }, // 2×3 = 6 soal
      source: "cluster_a_top",
      passThreshold: 0.65,
    },
  ],

  STANDARD: [
    {
      kind: "priority_gap",
      label: "Identifikasi Gap Prioritas",
      description: "Sweep cepat di area lemah untuk peta gap.",
      targetSubCount: 3,
      mixPerSub: { easy: 1, medium: 2, hard: 0 }, // 3×3 = 9 soal
      source: "area_suspect",
      passThreshold: 0.65,
    },
    {
      kind: "foundation_repair",
      label: "Perbaikan Pondasi",
      description: "Drill medium di sub-materi gap utama.",
      targetSubCount: 4,
      mixPerSub: { easy: 1, medium: 3, hard: 0 }, // 4×4 = 16 soal
      source: "area_suspect",
      passThreshold: 0.70,
    },
    {
      kind: "integration_check",
      label: "Cek Integrasi",
      description: "Soal mix untuk pastikan repair berhasil terhubung.",
      targetSubCount: 3,
      mixPerSub: { easy: 0, medium: 2, hard: 1 }, // 3×3 = 9 soal
      source: "cluster_a_top",
      passThreshold: 0.70,
    },
    {
      kind: "confidence_building",
      label: "Bangun Percaya Diri",
      description: "Medium-hard di topik yang sudah pulih.",
      targetSubCount: 2,
      mixPerSub: { easy: 0, medium: 2, hard: 1 }, // 2×3 = 6 soal
      source: "cluster_a_top",
      passThreshold: 0.75,
    },
  ],

  COMPREHENSIVE: [
    {
      kind: "foundation_first",
      label: "Pondasi Dulu",
      description: "Drill easy-medium di prereq paling dasar.",
      targetSubCount: 5,
      mixPerSub: { easy: 2, medium: 2, hard: 0 }, // 5×4 = 20 soal
      source: "foundation_set",
      passThreshold: 0.70,
    },
    {
      kind: "supporting_bridge",
      label: "Jembatan Pendukung",
      description: "Sub-materi kelas lebih rendah yang mendukung target.",
      targetSubCount: 4,
      mixPerSub: { easy: 1, medium: 2, hard: 0 }, // 4×3 = 12 soal
      source: "cluster_b_supporting",
      passThreshold: 0.65,
    },
    {
      kind: "direct_prereq",
      label: "Prereq Langsung",
      description: "Drill medium-hard di prereq direct kelas user.",
      targetSubCount: 4,
      mixPerSub: { easy: 0, medium: 2, hard: 1 }, // 4×3 = 12 soal
      source: "cluster_a_top",
      passThreshold: 0.65,
    },
    {
      kind: "integration_minimal",
      label: "Integrasi Minimal",
      description: "Cek apakah semua repair terhubung minimal.",
      targetSubCount: 2,
      mixPerSub: { easy: 0, medium: 2, hard: 1 }, // 2×3 = 6 soal
      source: "cluster_a_top",
      passThreshold: 0.60,
    },
  ],

  INTENSIVE: [
    {
      kind: "foundation_emergency",
      label: "Pondasi Darurat",
      description: "Easy massive di sub paling dasar (kuasai dulu).",
      targetSubCount: 6,
      mixPerSub: { easy: 3, medium: 1, hard: 0 }, // 6×4 = 24 soal
      source: "foundation_set",
      passThreshold: 0.65,
    },
    {
      kind: "bridge_building",
      label: "Bangun Jembatan",
      description: "Sub-materi kelas <= user untuk bridging.",
      targetSubCount: 5,
      mixPerSub: { easy: 2, medium: 2, hard: 0 }, // 5×4 = 20 soal
      source: "cluster_b_supporting",
      passThreshold: 0.60,
    },
    {
      kind: "selective_cluster_a",
      label: "Pilih Cluster A",
      description: "Hanya 2-3 sub kelas user — bukan semua sekaligus.",
      targetSubCount: 3,
      mixPerSub: { easy: 1, medium: 2, hard: 0 }, // 3×3 = 9 soal
      source: "cluster_a_top",
      passThreshold: 0.55,
    },
    {
      kind: "reality_check",
      label: "Cek Realistis",
      description: "Gambaran final mana yang bisa, mana yang masih perlu.",
      targetSubCount: 2,
      mixPerSub: { easy: 1, medium: 1, hard: 0 }, // 2×2 = 4 soal
      source: "cross_cluster",
      passThreshold: 0.50,
    },
  ],
};

// ============================================================
// Target sub-materi resolver
// ============================================================

/** Sort sub by importance: is_maku → dependents → is_entry_point. */
function sortByImportance(subs: SubMateriResmi[]): SubMateriResmi[] {
  return [...subs].sort((a, b) => {
    const aScore = (a.is_maku ? 1000 : 0) + a.dependents_count * 10 + (a.is_entry_point ? 5 : 0);
    const bScore = (b.is_maku ? 1000 : 0) + b.dependents_count * 10 + (b.is_entry_point ? 5 : 0);
    return bScore - aScore;
  });
}

/** Sub di kelas user, prioritas dependents-tinggi (Cluster A top). */
function pickClusterATop(
  jenjang: JenjangResmi,
  kelas: number,
  count: number,
): SubMateriResmi[] {
  const subs = subMateriPerKelas(jenjang, kelas);
  return sortByImportance(subs).slice(0, count);
}

/** Sub di area suspect (lemah dari Coverage). */
function pickAreaSuspect(
  jenjang: JenjangResmi,
  kelas: number,
  areaSuspect: AreaMatematika[],
  count: number,
): SubMateriResmi[] {
  if (areaSuspect.length === 0) {
    // Fallback ke cluster A top kalau gak ada area suspect
    return pickClusterATop(jenjang, kelas, count);
  }
  const out: SubMateriResmi[] = [];
  const kelasWindow = [kelas, kelas - 1, kelas + 1].filter((k) => k >= 1 && k <= 12);
  for (const area of areaSuspect) {
    const areaSubs = subMateriPerArea(area).filter(
      (s) => s.jenjang === jenjang && kelasWindow.includes(s.kelas),
    );
    out.push(...sortByImportance(areaSubs).slice(0, Math.ceil(count / areaSuspect.length)));
  }
  return out.slice(0, count);
}

/** Sub dari Universal Foundation Set sesuai jenjang user. */
function pickFromFoundationSet(
  target: FoundationTarget,
  count: number,
): SubMateriResmi[] {
  const kodes = getFoundationKodes(target);
  const subs = kodes
    .map((k) => cariSubMateriResmi(k))
    .filter((s): s is SubMateriResmi => !!s);
  return sortByImportance(subs).slice(0, count);
}

/** Sub kelas <= user kelas (bukan foundation set) — supporting bridge. */
function pickClusterBSupporting(
  jenjang: JenjangResmi,
  kelas: number,
  foundationTarget: FoundationTarget,
  count: number,
): SubMateriResmi[] {
  const foundationSet = new Set(getFoundationKodes(foundationTarget));
  // Ambil dari kelas-1, kelas-2, kelas-3
  const out: SubMateriResmi[] = [];
  for (let k = kelas - 1; k >= Math.max(1, kelas - 3); k--) {
    const subs = subMateriPerKelas(jenjang, k).filter((s) => !foundationSet.has(s.kode));
    out.push(...sortByImportance(subs).slice(0, Math.ceil(count / 3)));
  }
  return out.slice(0, count);
}

/** Mix dari semua source — variasi luas. */
function pickCrossCluster(
  jenjang: JenjangResmi,
  kelas: number,
  areaSuspect: AreaMatematika[],
  foundationTarget: FoundationTarget,
  count: number,
): SubMateriResmi[] {
  const a = pickClusterATop(jenjang, kelas, Math.ceil(count / 3));
  const b = pickAreaSuspect(jenjang, kelas, areaSuspect, Math.ceil(count / 3));
  const c = pickFromFoundationSet(foundationTarget, Math.ceil(count / 3));
  // Dedup by kode
  const seen = new Set<string>();
  const out: SubMateriResmi[] = [];
  for (const sub of [...a, ...b, ...c]) {
    if (seen.has(sub.kode)) continue;
    seen.add(sub.kode);
    out.push(sub);
  }
  return out.slice(0, count);
}

function resolveTargetSubs(
  source: SubSource,
  ctx: {
    jenjang: JenjangResmi;
    kelas: number;
    areaSuspect: AreaMatematika[];
    foundationTarget: FoundationTarget;
  },
  count: number,
): SubMateriResmi[] {
  switch (source) {
    case "cluster_a_top":
      return pickClusterATop(ctx.jenjang, ctx.kelas, count);
    case "area_suspect":
      return pickAreaSuspect(ctx.jenjang, ctx.kelas, ctx.areaSuspect, count);
    case "foundation_set":
      return pickFromFoundationSet(ctx.foundationTarget, count);
    case "cluster_b_supporting":
      return pickClusterBSupporting(ctx.jenjang, ctx.kelas, ctx.foundationTarget, count);
    case "cross_cluster":
      return pickCrossCluster(ctx.jenjang, ctx.kelas, ctx.areaSuspect, ctx.foundationTarget, count);
  }
}

// ============================================================
// Smart Granularity adjustment — adapt items count per sub
// ============================================================

/**
 * Adjust item mix berdasar classification dari Smart Granularity.
 *
 * Strategi (Time efficiency tanpa kehilangan precision):
 *   - MANDATORY (gateway+complexity tinggi) → minimum 5 items untuk precision
 *   - CONDITIONAL → keep blueprint default
 *   - SUFFICIENT → maksimum 2 items, hemat waktu
 */
function adjustMixForGranularity(
  baseMix: ItemMix,
  classification: GranularityClassification,
): ItemMix {
  switch (classification) {
    case "SUB_DRILLING_MANDATORY":
      // Minimum 5 items: 1E + 2M + 2H (precision testing)
      return {
        easy: Math.max(1, baseMix.easy),
        medium: Math.max(2, baseMix.medium),
        hard: Math.max(2, baseMix.hard),
      };
    case "SUB_DRILLING_CONDITIONAL":
      // Keep blueprint default
      return baseMix;
    case "MATERIAL_LEVEL_SUFFICIENT": {
      // Maximum 2 items: 0E + 1M + (1H kalau blueprint punya hard)
      const easy = Math.min(0, baseMix.easy);
      const medium = baseMix.medium > 0 ? 1 : 0;
      const hard = baseMix.hard > 0 ? 1 : 0;
      // Pastikan minimal 1 item (kalau semua jadi 0, force 1 medium)
      const total = easy + medium + hard;
      return total > 0 ? { easy, medium, hard } : { easy: 0, medium: 1, hard: 0 };
    }
  }
}

// ============================================================
// Init drilling — pre-allocate items per step
// ============================================================

export async function initDrilling(
  jenjang: JenjangResmi,
  kelas: number,
  coverage: CoverageResult,
  /** Item IDs yang sudah dipakai di stage Locator+Coverage+Deep — anti-bocor. */
  previouslyUsedIds: string[] = [],
): Promise<DrillingState> {
  const path: DrillingPathName = coverage.pathRoute?.path ?? "STANDARD";
  const blueprint = PATH_BLUEPRINTS[path];
  const foundationTarget = pickFoundationTarget(jenjang, kelas);

  // Carry-over: coverage.responses sudah include locator (carried via initCoverage),
  // tambah deep items lewat previouslyUsedIds.
  const used = new Set<string>(coverage.responses.map((r) => r.itemId));
  for (const id of previouslyUsedIds) used.add(id);
  const ctx = {
    jenjang,
    kelas,
    areaSuspect: coverage.areaSuspect,
    foundationTarget,
  };

  const steps: DrillingStep[] = [];
  for (const config of blueprint) {
    const targetSubs = resolveTargetSubs(config.source, ctx, config.targetSubCount);
    const items: ItemBankEntry[] = [];
    for (const sub of targetSubs) {
      // Smart Granularity: adapt mix per sub berdasar Gateway × Complexity
      const granularity = getSmartGranularity(sub);
      const adjustedMix = adjustMixForGranularity(config.mixPerSub, granularity.classification);
      const picks = await pickItemsWithMix(sub.kode, adjustedMix, used);
      for (const it of picks.total) {
        items.push(it);
        used.add(it.id);
      }
    }
    steps.push({
      config,
      targetKodes: targetSubs.map((s) => s.kode),
      items,
      responses: [],
      status: items.length === 0 ? "skipped" : "pending",
    });
  }

  // Kalau semua step skipped → done
  const allSkipped = steps.every((s) => s.status === "skipped");
  // Active idx = first non-skipped
  const firstActive = steps.findIndex((s) => s.status !== "skipped");

  return {
    path,
    jenjang,
    kelas,
    thetaGlobal: coverage.thetaGlobal,
    steps,
    currentStepIdx: firstActive >= 0 ? firstActive : 0,
    usedIds: Array.from(used),
    done: allSkipped,
    stopReason: allSkipped ? "no_items_left" : undefined,
  };
}

// ============================================================
// Pick next item — dari current step, item yang belum di-respond
// ============================================================

export function pickNextDrillingItem(
  state: DrillingState,
): { item: ItemBankEntry; stepIdx: number } | null {
  if (state.done) return null;
  // Defense in depth: exclude items yang sudah ada di state.usedIds global,
  // bukan cuma step.responses. Mencegah loop kalau item duplikat di multiple
  // step, atau replay state desync.
  const globalUsed = new Set(state.usedIds);
  for (let i = state.currentStepIdx; i < state.steps.length; i++) {
    const step = state.steps[i];
    if (!step) continue;
    if (step.status === "skipped" || step.status === "passed" || step.status === "weak") continue;
    const respondedIds = new Set(step.responses.map((r) => r.itemId));
    const next = step.items.find(
      (it) => !respondedIds.has(it.id) && !globalUsed.has(it.id),
    );
    if (next) return { item: next, stepIdx: i };
  }
  return null;
}

// ============================================================
// Submit — update step, settle kalau habis
// ============================================================

export function submitDrillingResponse(
  state: DrillingState,
  itemId: string,
  correct: boolean,
  responseTimeMs?: number,
): DrillingState {
  // Cari step yang punya item ini
  const stepIdx = state.steps.findIndex((s) => s.items.some((it) => it.id === itemId));
  if (stepIdx < 0) return state;
  const step = state.steps[stepIdx]!;
  // Skip kalau item sudah di-respond
  if (step.responses.some((r) => r.itemId === itemId)) return state;

  const newResponses: Response[] = [...step.responses, { itemId, correct, responseTimeMs }];

  // Cek apakah step ini selesai (semua items di-respond)
  let newStatus: DrillingStepStatus = "in_progress";
  let accuracy: number | undefined;
  if (newResponses.length >= step.items.length) {
    const correctCount = newResponses.filter((r) => r.correct).length;
    accuracy = correctCount / newResponses.length;
    newStatus = accuracy >= step.config.passThreshold ? "passed" : "weak";
  }

  const newStep: DrillingStep = {
    ...step,
    responses: newResponses,
    status: newStatus,
    accuracy,
  };
  const newSteps = state.steps.map((s, i) => (i === stepIdx ? newStep : s));

  // Advance currentStepIdx kalau step ini selesai
  let newCurrentStepIdx = state.currentStepIdx;
  if (newStatus === "passed" || newStatus === "weak") {
    for (let i = stepIdx + 1; i < newSteps.length; i++) {
      const s = newSteps[i];
      if (s && s.status !== "skipped") {
        newCurrentStepIdx = i;
        break;
      }
      newCurrentStepIdx = i; // bahkan kalau skipped, increment
    }
    if (newCurrentStepIdx === stepIdx) {
      newCurrentStepIdx = newSteps.length;
    }
  }

  // Cek done — semua step selesai (passed/weak/skipped)
  const allDone = newSteps.every(
    (s) => s.status === "passed" || s.status === "weak" || s.status === "skipped",
  );

  const newUsed = new Set(state.usedIds);
  newUsed.add(itemId);

  return {
    ...state,
    steps: newSteps,
    currentStepIdx: newCurrentStepIdx,
    usedIds: Array.from(newUsed),
    done: allDone,
    stopReason: allDone ? "all_done" : state.stopReason,
  };
}

// ============================================================
// Finalize → DrillingResult
// ============================================================

export type DrillingStepResult = {
  kind: DrillingStepKind;
  label: string;
  status: DrillingStepStatus;
  accuracy?: number;
  passThreshold: number;
  itemsAnswered: number;
  itemsTotal: number;
  targetKodes: string[];
};

export type DrillingResult = {
  path: DrillingPathName;
  totalSteps: number;
  stepsPassed: number;
  stepsWeak: number;
  stepsSkipped: number;
  itemsTotal: number;
  itemsAnswered: number;
  overallAccuracy: number;
  steps: DrillingStepResult[];
  /** Sub-materi yang masih lemah (dari step weak) — kandidat learning plan. */
  weakKodes: string[];
  /** Recommended next action (text). */
  recommendation: string;
};

export function finalizeDrilling(state: DrillingState): DrillingResult | null {
  if (!state.done) return null;

  const stepResults: DrillingStepResult[] = state.steps.map((s) => ({
    kind: s.config.kind,
    label: s.config.label,
    status: s.status,
    accuracy: s.accuracy,
    passThreshold: s.config.passThreshold,
    itemsAnswered: s.responses.length,
    itemsTotal: s.items.length,
    targetKodes: s.targetKodes,
  }));

  const stepsPassed = stepResults.filter((s) => s.status === "passed").length;
  const stepsWeak = stepResults.filter((s) => s.status === "weak").length;
  const stepsSkipped = stepResults.filter((s) => s.status === "skipped").length;

  const itemsTotal = stepResults.reduce((sum, s) => sum + s.itemsTotal, 0);
  const itemsAnswered = stepResults.reduce((sum, s) => sum + s.itemsAnswered, 0);
  const totalCorrect = state.steps.reduce(
    (sum, s) => sum + s.responses.filter((r) => r.correct).length,
    0,
  );
  const overallAccuracy = itemsAnswered > 0 ? totalCorrect / itemsAnswered : 0;

  // Weak kodes: gabungan target dari step weak
  const weakKodes = Array.from(
    new Set(stepResults.filter((s) => s.status === "weak").flatMap((s) => s.targetKodes)),
  );

  return {
    path: state.path,
    totalSteps: stepResults.length,
    stepsPassed,
    stepsWeak,
    stepsSkipped,
    itemsTotal,
    itemsAnswered,
    overallAccuracy,
    steps: stepResults,
    weakKodes,
    recommendation: buildRecommendation(state.path, stepsPassed, stepsWeak, weakKodes.length),
  };
}

function buildRecommendation(
  path: DrillingPathName,
  passed: number,
  weak: number,
  weakKodesCount: number,
): string {
  if (weak === 0 && passed > 0) {
    return `Hebat! Semua ${passed} step lulus. Lanjut ke materi lanjutan / latihan rutin.`;
  }
  if (path === "INTENSIVE") {
    return `Pondasi perlu diperkuat. Mulai dari ${weakKodesCount} sub-materi prioritas — pelan tapi pasti.`;
  }
  if (path === "COMPREHENSIVE") {
    return `Sistematik rebuild di ${weakKodesCount} sub-materi. Drill 1 topik/hari + review besoknya.`;
  }
  if (path === "STANDARD") {
    return `Targeted gap filling — fokus ${weakKodesCount} sub yang weak, sisanya sudah cukup.`;
  }
  // ADVANCED
  return `Polish di ${weakKodesCount} sub yang masih bisa dipertajam. Lanjut ke soal HOTS/SNBT.`;
}

// ============================================================
// Helpers untuk orchestrator (re-hydrate)
// ============================================================

/**
 * Replay responses ke state existing (untuk rehydrate).
 * Pakai ini di orchestrator: init dulu, lalu loop submit untuk tiap response.
 */
export function rehydrateFromResponses(
  baseState: DrillingState,
  responses: Response[],
): DrillingState {
  let s = baseState;
  for (const r of responses) {
    s = submitDrillingResponse(s, r.itemId, r.correct, r.responseTimeMs);
  }
  return s;
}

