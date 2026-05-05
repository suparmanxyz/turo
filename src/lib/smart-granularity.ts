/**
 * Smart Granularity Approach — auto-derived dari peta-prasyarat existing.
 *
 * Per sub-materi punya 2 score:
 *   - Gateway Score (0-100): seberapa penting sebagai prereq untuk materi lain
 *   - Complexity Score (0-100): seberapa kompleks internal materi
 *
 * Berdasar kombinasi → classification:
 *   - SUB_DRILLING_MANDATORY: harus drill ke level granular
 *   - SUB_DRILLING_CONDITIONAL: drill kalau ada signal lemah
 *   - MATERIAL_LEVEL_SUFFICIENT: cukup material level (1-2 soal)
 *
 * Tujuan: time efficiency tanpa kehilangan precision di area kritis.
 *
 * Inspired by Integral Smart Granularity Approach.
 */

import { PETA, INDEX } from "@/data/peta-resmi";
import type { SubMateriResmi } from "@/types";

export type GranularityClassification =
  | "SUB_DRILLING_MANDATORY"
  | "SUB_DRILLING_CONDITIONAL"
  | "MATERIAL_LEVEL_SUFFICIENT";

export type SmartGranularity = {
  kode: string;
  /** Gateway Score 0-100 — pentingnya sebagai prereq materi lain. */
  gatewayScore: number;
  /** Complexity Score 0-100 — kompleksitas internal materi. */
  complexityScore: number;
  classification: GranularityClassification;
  /** Recommended item count untuk diagnostic test ini. */
  recommendedItemCount: number;
  /** Reason untuk audit. */
  reason: string;
};

// ============================================================
// Stats global untuk normalisasi
// ============================================================

let _stats: {
  maxDependents: number;
  maxDepth: number;
  avgDependents: number;
  avgDepth: number;
} | null = null;

function computeStats() {
  if (_stats) return _stats;
  let maxDeps = 0;
  let maxDepth = 0;
  let totalDeps = 0;
  let totalDepth = 0;
  for (const sub of PETA.submateri) {
    if (sub.dependents_count > maxDeps) maxDeps = sub.dependents_count;
    if (sub.depth > maxDepth) maxDepth = sub.depth;
    totalDeps += sub.dependents_count;
    totalDepth += sub.depth;
  }
  _stats = {
    maxDependents: Math.max(maxDeps, 1),
    maxDepth: Math.max(maxDepth, 1),
    avgDependents: totalDeps / PETA.submateri.length,
    avgDepth: totalDepth / PETA.submateri.length,
  };
  return _stats;
}

// ============================================================
// Score computers
// ============================================================

/**
 * Gateway Score: seberapa banyak materi lain yang butuh ini sebagai prereq.
 *
 * Components:
 *   - dependents_count (normalize ke 0-50)
 *   - is_maku flag (+30 kalau true — Materi Kunci eksplisit)
 *   - is_entry_point (+20 kalau true — fondasi awal pohon prereq)
 *
 * Range: 0-100.
 */
export function computeGatewayScore(sub: SubMateriResmi): number {
  const stats = computeStats();
  const depScore = (sub.dependents_count / stats.maxDependents) * 50;
  const makuBoost = sub.is_maku ? 30 : 0;
  const entryBoost = sub.is_entry_point ? 20 : 0;
  return Math.min(100, Math.round(depScore + makuBoost + entryBoost));
}

/**
 * Complexity Score: seberapa kompleks internal materi.
 *
 * Components:
 *   - depth (deeper = more complex topic, normalize 0-50)
 *   - jumlah prereq (lebih banyak prereq = lebih kompleks, 0-30)
 *   - panjang nama heuristic (proxy for sub-concepts breadth, 0-20)
 *
 * Range: 0-100.
 */
export function computeComplexityScore(sub: SubMateriResmi): number {
  const stats = computeStats();
  // Sigmoid-like: depth menengah-tinggi paling impactful
  const depthRatio = sub.depth / stats.maxDepth;
  const depthScore = depthRatio * 45;
  const prereqScore = Math.min(35, sub.prereq.length * 8);
  // Heuristic: nama panjang biasanya mengindikasikan multiple sub-concepts
  const nameWords = sub.nama.split(/\s+/).length;
  const nameScore = Math.min(20, nameWords * 2.5);
  return Math.min(100, Math.round(depthScore + prereqScore + nameScore));
}

// ============================================================
// Classification
// ============================================================

/**
 * Composite score: gateway lebih penting dari complexity (60/40 weighted).
 * Reasoning: materi yang banyak jadi prereq (gateway) lebih penting di-drill
 * walau complexity-nya moderate, karena gap-nya cascade.
 */
function compositeScore(gateway: number, complexity: number): number {
  return gateway * 0.6 + complexity * 0.4;
}

/**
 * Classify drilling need berdasar composite score.
 *
 * Threshold dikalibrasi dari distribusi data nyata Turo (472 sub):
 *   composite ≥55 → MANDATORY (~3-5% paling kritis)
 *   composite ≥42 → CONDITIONAL (~30% drill kalau lemah)
 *   composite <42 → SUFFICIENT (~65% material-level)
 */
export function classifyDrillingNeed(
  gatewayScore: number,
  complexityScore: number,
): { classification: GranularityClassification; reason: string } {
  const composite = compositeScore(gatewayScore, complexityScore);
  if (composite >= 55) {
    return {
      classification: "SUB_DRILLING_MANDATORY",
      reason: `Composite ${composite.toFixed(0)} (G=${gatewayScore} + C=${complexityScore}) — kritis untuk banyak topik, butuh precision per sub-konsep`,
    };
  }
  if (composite >= 42) {
    return {
      classification: "SUB_DRILLING_CONDITIONAL",
      reason: `Composite ${composite.toFixed(0)} (G=${gatewayScore} + C=${complexityScore}) — drill kalau coverage signal lemah`,
    };
  }
  return {
    classification: "MATERIAL_LEVEL_SUFFICIENT",
    reason: `Composite ${composite.toFixed(0)} (G=${gatewayScore} + C=${complexityScore}) — material-level testing cukup, hemat waktu`,
  };
}

/** Recommended item count berdasar classification. */
function recommendedItemCount(c: GranularityClassification): number {
  switch (c) {
    case "SUB_DRILLING_MANDATORY":
      return 5; // 1 easy, 2 medium, 2 hard untuk precision
    case "SUB_DRILLING_CONDITIONAL":
      return 3; // 1 per difficulty
    case "MATERIAL_LEVEL_SUFFICIENT":
      return 2; // 1 medium, 1 medium-hard
  }
}

// ============================================================
// Public API
// ============================================================

/** Get smart granularity untuk satu sub. */
export function getSmartGranularity(sub: SubMateriResmi): SmartGranularity {
  const gateway = computeGatewayScore(sub);
  const complexity = computeComplexityScore(sub);
  const { classification, reason } = classifyDrillingNeed(gateway, complexity);
  return {
    kode: sub.kode,
    gatewayScore: gateway,
    complexityScore: complexity,
    classification,
    recommendedItemCount: recommendedItemCount(classification),
    reason,
  };
}

/** Get smart granularity untuk semua sub di peta. */
let _allCache: Map<string, SmartGranularity> | null = null;

export function getAllSmartGranularity(): Map<string, SmartGranularity> {
  if (_allCache) return _allCache;
  _allCache = new Map();
  for (const sub of PETA.submateri) {
    _allCache.set(sub.kode, getSmartGranularity(sub));
  }
  return _allCache;
}

/** Stats global per classification untuk admin display. */
export function getGranularityStats(): Record<GranularityClassification, number> {
  const all = getAllSmartGranularity();
  const counts: Record<GranularityClassification, number> = {
    SUB_DRILLING_MANDATORY: 0,
    SUB_DRILLING_CONDITIONAL: 0,
    MATERIAL_LEVEL_SUFFICIENT: 0,
  };
  for (const g of all.values()) counts[g.classification]++;
  return counts;
}

// silence unused
void INDEX;
