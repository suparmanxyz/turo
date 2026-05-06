/**
 * Adaptive label per jenjang untuk path routing tier.
 *
 * Internal logic 4 tier tetap sama (ADVANCED/STANDARD/COMPREHENSIVE/INTENSIVE),
 * tapi label UI disesuaikan supaya:
 *   - SD/SMP: terminologi netral, tidak terkesan punishment
 *   - SMA reguler: medium-formal
 *   - SMA UTBK: original Integral terminologi (audience siap)
 *
 * Pak ustadz pilih: netral untuk SD/SMP, original untuk SMA UTBK.
 */

import type { JenjangResmi } from "@/types";
import type { JalurDiagnostik } from "@/lib/item-bank";

export type PathTier = "ADVANCED" | "STANDARD" | "COMPREHENSIVE" | "INTENSIVE";

export type TierLabel = {
  /** Short label untuk badge (UI). */
  short: string;
  /** Full descriptive label. */
  full: string;
  /** Emoji indicator. */
  emoji: string;
  /** Tone/severity color: positive | neutral | warning | critical. */
  tone: "positive" | "neutral" | "warning" | "critical";
};

const LABELS_NEUTRAL: Record<PathTier, TierLabel> = {
  ADVANCED:      { short: "Mahir",            full: "Mahir — sudah kuat",                        emoji: "🟢", tone: "positive" },
  STANDARD:      { short: "Stabil",           full: "Stabil — perlu polish ringan",              emoji: "🟡", tone: "neutral" },
  COMPREHENSIVE: { short: "Perlu Penguatan",  full: "Perlu Penguatan — beberapa area lemah",     emoji: "🟠", tone: "warning" },
  INTENSIVE:     { short: "Pondasi Dasar",    full: "Pondasi Dasar — fokus penguatan menyeluruh", emoji: "🔴", tone: "critical" },
};

const LABELS_SMA_REGULER: Record<PathTier, TierLabel> = {
  ADVANCED:      { short: "Lanjut",            full: "Lanjut — siap tantangan tingkat tinggi",   emoji: "🟢", tone: "positive" },
  STANDARD:      { short: "Standar",           full: "Standar — kuasai sebagian besar",          emoji: "🟡", tone: "neutral" },
  COMPREHENSIVE: { short: "Komprehensif",      full: "Komprehensif — perlu penguatan sistematis", emoji: "🟠", tone: "warning" },
  INTENSIVE:     { short: "Intensif",          full: "Intensif — pondasi perlu disusun ulang",   emoji: "🔴", tone: "critical" },
};

const LABELS_UTBK: Record<PathTier, TierLabel> = {
  ADVANCED:      { short: "ADVANCED",      full: "ADVANCED — siap UTBK, polish strategi",     emoji: "🟢", tone: "positive" },
  STANDARD:      { short: "STANDARD",      full: "STANDARD — gap moderate, targeted repair",  emoji: "🟡", tone: "neutral" },
  COMPREHENSIVE: { short: "COMPREHENSIVE", full: "COMPREHENSIVE — gap signifikan, systematic", emoji: "🟠", tone: "warning" },
  INTENSIVE:     { short: "INTENSIVE",     full: "INTENSIVE — emergency intervention SNBT",   emoji: "🔴", tone: "critical" },
};

/**
 * Resolve label set by user profile.
 * Untuk SMA UTBK target (jalur sma-utbk) pakai original Integral terminology.
 * Untuk lainnya pakai netral untuk SD/SMP, atau medium untuk SMA reguler.
 */
export function getTierLabels(
  jenjang: JenjangResmi,
  jalur?: JalurDiagnostik,
): Record<PathTier, TierLabel> {
  if (jalur === "sma-utbk") return LABELS_UTBK;
  if (jenjang === "SMA") return LABELS_SMA_REGULER;
  return LABELS_NEUTRAL; // SD + SMP
}

/** Convenience helper untuk single tier lookup. */
export function getTierLabel(
  tier: PathTier,
  jenjang: JenjangResmi,
  jalur?: JalurDiagnostik,
): TierLabel {
  return getTierLabels(jenjang, jalur)[tier];
}

/**
 * Treatment scaling per jenjang — berapa banyak sub yang ditarget per stage,
 * berapa items per sub. Anak SD perlu scope lebih kecil supaya tidak burnout.
 */
export type TreatmentScaling = {
  /** Multiplier untuk targetSubCount di Drilling/Program Belajar. */
  subCountMultiplier: number;
  /** Max items per drilling step. */
  maxItemsPerStep: number;
  /** Max total items di Drilling/Program Belajar. */
  maxTotalItems: number;
};

const SCALING: Record<"sd-low" | "sd-mid" | "sd-high" | "smp" | "sma" | "sma-utbk", TreatmentScaling> = {
  "sd-low":  { subCountMultiplier: 0.5, maxItemsPerStep: 6,  maxTotalItems: 20 },
  "sd-mid":  { subCountMultiplier: 0.6, maxItemsPerStep: 8,  maxTotalItems: 25 },
  "sd-high": { subCountMultiplier: 0.7, maxItemsPerStep: 10, maxTotalItems: 30 },
  "smp":     { subCountMultiplier: 0.8, maxItemsPerStep: 12, maxTotalItems: 40 },
  "sma":     { subCountMultiplier: 1.0, maxItemsPerStep: 15, maxTotalItems: 50 },
  "sma-utbk":{ subCountMultiplier: 1.2, maxItemsPerStep: 18, maxTotalItems: 75 }, // original Integral
};

export function getTreatmentScaling(jenjang: JenjangResmi, kelas?: number, jalur?: JalurDiagnostik): TreatmentScaling {
  if (jalur === "sma-utbk") return SCALING["sma-utbk"];
  if (jenjang === "SMA") return SCALING.sma;
  if (jenjang === "SMP") return SCALING.smp;
  // SD breakdown by kelas
  const k = kelas ?? 4;
  if (k <= 2) return SCALING["sd-low"];
  if (k <= 4) return SCALING["sd-mid"];
  return SCALING["sd-high"];
}
