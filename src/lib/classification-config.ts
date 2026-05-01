/**
 * Threshold klasifikasi diagnostik — bisa di-tune via /admin/klasifikasi-config.
 * Disimpan di Firestore: app_config/classification.
 *
 * Default: nilai yang sekarang hard-coded.
 *
 * Cache: load sekali per server instance, refresh kalau ada explicit invalidate
 * (untuk MVP, server restart = refresh). Vercel serverless cold-start = fresh load.
 */

import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";

export type ClassificationConfig = {
  // ── Coverage classifyArea ──
  /** Accuracy <= ini → "lemah" (default 0.4). */
  coverageLemahMaxAcc: number;
  /** Accuracy >= ini → kandidat "kuat" (need theta tinggi juga, default 0.8). */
  coverageKuatMinAcc: number;
  /** Accuracy >= ini + gap >= 0.5 → "kuat", else "cukup" (default 0.65). */
  coverageCukupMinAcc: number;
  /** Theta gap dari global untuk "kuat" tier (default 0.5). */
  coverageKuatThetaGap: number;
  /** Theta gap untuk "kuat" alternate (default 0.3). */
  coverageKuatThetaGapAlt: number;

  // ── Deep classifyMastery ──
  /** Accuracy <= ini → "remediasi" terlepas theta (default 0.4). */
  deepRemediasiMaxAcc: number;
  /** Accuracy >= ini + theta cukup → "siap" (default 0.7). */
  deepSiapMinAcc: number;
  /** Theta gap dari global untuk "siap" (default -0.3, artinya theta >= global - 0.3). */
  deepSiapThetaGap: number;
  /** Theta gap untuk fallback "remediasi" (default -1.0). */
  deepRemediasiThetaGap: number;
};

export const DEFAULT_CONFIG: ClassificationConfig = {
  coverageLemahMaxAcc: 0.4,
  coverageKuatMinAcc: 0.8,
  coverageCukupMinAcc: 0.65,
  coverageKuatThetaGap: 0.5,
  coverageKuatThetaGapAlt: 0.3,
  deepRemediasiMaxAcc: 0.4,
  deepSiapMinAcc: 0.7,
  deepSiapThetaGap: -0.3,
  deepRemediasiThetaGap: -1.0,
};

const COLLECTION = "app_config";
const DOC_ID = "classification";

let cached: { config: ClassificationConfig; loadedAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 detik

/** Load config dari Firestore (with cache). Fallback ke DEFAULT_CONFIG kalau tidak ada / error. */
export async function getClassificationConfig(): Promise<ClassificationConfig> {
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.config;
  }
  try {
    const snap = await getAdminDb().collection(COLLECTION).doc(DOC_ID).get();
    const data = snap.exists ? snap.data() : null;
    const merged: ClassificationConfig = {
      ...DEFAULT_CONFIG,
      ...(data ?? {}),
    };
    cached = { config: merged, loadedAt: Date.now() };
    return merged;
  } catch (e) {
    console.warn("getClassificationConfig fallback default:", e);
    return DEFAULT_CONFIG;
  }
}

/** Save config baru (admin only). Invalidate cache. */
export async function setClassificationConfig(patch: Partial<ClassificationConfig>): Promise<ClassificationConfig> {
  const current = await getClassificationConfig();
  const next: ClassificationConfig = { ...current, ...patch };
  await getAdminDb().collection(COLLECTION).doc(DOC_ID).set(next);
  cached = { config: next, loadedAt: Date.now() };
  return next;
}

/** Force refresh cache (panggil setelah save). */
export function invalidateConfigCache() {
  cached = null;
}

// ============================================================
// Klasifikasi pure functions — pakai config sebagai param
// ============================================================

export function classifyAreaWithConfig(
  accuracy: number,
  thetaArea: number,
  thetaGlobal: number,
  cfg: ClassificationConfig,
): "kuat" | "cukup" | "lemah" {
  if (accuracy <= cfg.coverageLemahMaxAcc) return "lemah";
  if (accuracy >= cfg.coverageKuatMinAcc && thetaArea >= thetaGlobal - cfg.coverageKuatThetaGapAlt) return "kuat";
  if (accuracy >= cfg.coverageCukupMinAcc) {
    const gap = thetaArea - thetaGlobal;
    return gap >= cfg.coverageKuatThetaGap ? "kuat" : "cukup";
  }
  return "cukup";
}

export function classifyMasteryWithConfig(
  accuracy: number,
  thetaLocal: number,
  thetaGlobal: number,
  cfg: ClassificationConfig,
): "siap" | "review" | "remediasi" {
  if (accuracy <= cfg.deepRemediasiMaxAcc) return "remediasi";
  if (accuracy >= cfg.deepSiapMinAcc && thetaLocal >= thetaGlobal + cfg.deepSiapThetaGap) return "siap";
  if (thetaLocal < thetaGlobal + cfg.deepRemediasiThetaGap) return "remediasi";
  return "review";
}
