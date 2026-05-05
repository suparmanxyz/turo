/**
 * Feature access gating — gabungkan subscription status + pricing config
 * untuk derive apa yang user boleh akses.
 *
 * Pakai di server (API routes) untuk gate sebelum eksekusi mahal,
 * dan di UI untuk show paywall prompt.
 */

import { hasPremiumAccess, type SubscriptionDoc } from "@/lib/subscription";
import { type FreeTierLimits } from "@/lib/pricing";

export type Feature =
  | "drilling"          // Phase 2 adaptive drilling
  | "generate_soal"     // AI-generated MC soal
  | "ai_tutor"          // chat pembahasan / hint AI
  | "maturity_full"     // Peta Spektrum full insights (free dapat preview)
  | "cohort_analytics"  // comparative cohort
  | "pdf_export"        // download PDF hasil
  | "unlimited_soal"    // > free tier daily limit
  | "unlimited_sub";    // > free tier sub-materi/day

export type AccessDecision =
  | { allowed: true; reason: "premium" | "trial" | "free_tier_within_limit" }
  | { allowed: false; reason: "paywall_required" | "daily_limit_reached"; upgradePrompt: string };

/** Daily usage counters untuk free tier enforcement. */
export type DailyUsage = {
  /** YYYY-MM-DD timezone WIB. */
  date: string;
  subMateriAccessed: string[];  // unique kode list
  soalAnsweredCount: number;
  aiTutorQueryCount: number;
};

/**
 * Cek apakah user boleh akses feature.
 *
 * @param sub Subscription doc (null kalau belum register/none)
 * @param freeTier Pricing free tier limits
 * @param feature Feature yang mau diakses
 * @param usage Daily usage counter (optional, hanya butuh untuk feature dengan limit harian)
 * @param subMateriKode Kode sub-materi yang sedang diakses (untuk gating sub limit)
 */
export function checkAccess(
  sub: SubscriptionDoc | null,
  freeTier: FreeTierLimits,
  feature: Feature,
  usage?: DailyUsage,
  subMateriKode?: string,
): AccessDecision {
  // Premium/trial — boleh semua
  if (hasPremiumAccess(sub)) {
    return { allowed: true, reason: sub?.status === "trial" ? "trial" : "premium" };
  }

  // Free tier — cek per feature
  switch (feature) {
    case "drilling":
      if (freeTier.drillingEnabled) return { allowed: true, reason: "free_tier_within_limit" };
      return {
        allowed: false,
        reason: "paywall_required",
        upgradePrompt: "Drilling adaptif eksklusif untuk member premium. Upgrade untuk akses penuh.",
      };

    case "generate_soal":
      if (freeTier.generateSoalEnabled) return { allowed: true, reason: "free_tier_within_limit" };
      return {
        allowed: false,
        reason: "paywall_required",
        upgradePrompt: "Generate soal AI eksklusif untuk member premium.",
      };

    case "ai_tutor":
      if (freeTier.aiTutorPerDay === 0) {
        return {
          allowed: false,
          reason: "paywall_required",
          upgradePrompt: "AI Tutor eksklusif untuk member premium.",
        };
      }
      if (usage && usage.aiTutorQueryCount >= freeTier.aiTutorPerDay) {
        return {
          allowed: false,
          reason: "daily_limit_reached",
          upgradePrompt: `Limit AI Tutor harian tercapai (${freeTier.aiTutorPerDay}/hari). Upgrade untuk unlimited.`,
        };
      }
      return { allowed: true, reason: "free_tier_within_limit" };

    case "maturity_full":
    case "cohort_analytics":
    case "pdf_export":
      return {
        allowed: false,
        reason: "paywall_required",
        upgradePrompt: "Fitur ini eksklusif untuk member premium.",
      };

    case "unlimited_soal":
      if (usage && usage.soalAnsweredCount >= freeTier.soalPerDay) {
        return {
          allowed: false,
          reason: "daily_limit_reached",
          upgradePrompt: `Limit harian tercapai (${freeTier.soalPerDay} soal/hari). Upgrade untuk unlimited.`,
        };
      }
      return { allowed: true, reason: "free_tier_within_limit" };

    case "unlimited_sub":
      if (!subMateriKode || !usage) return { allowed: true, reason: "free_tier_within_limit" };
      // Kalau sub sudah pernah diakses hari ini, free
      if (usage.subMateriAccessed.includes(subMateriKode)) {
        return { allowed: true, reason: "free_tier_within_limit" };
      }
      // Kalau belum, cek limit
      if (usage.subMateriAccessed.length >= freeTier.subMateriPerDay) {
        return {
          allowed: false,
          reason: "daily_limit_reached",
          upgradePrompt: `Limit ${freeTier.subMateriPerDay} sub-materi/hari tercapai. Upgrade untuk unlimited.`,
        };
      }
      return { allowed: true, reason: "free_tier_within_limit" };
  }
}

/** Format tanggal hari ini di WIB sebagai YYYY-MM-DD. */
export function todayWIB(now = Date.now()): string {
  const d = new Date(now + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/** Empty usage untuk hari ini. */
export function emptyUsage(date = todayWIB()): DailyUsage {
  return { date, subMateriAccessed: [], soalAnsweredCount: 0, aiTutorQueryCount: 0 };
}
