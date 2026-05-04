/**
 * Pricing config — single source of truth untuk semua harga + free tier limits.
 *
 * Disimpan di Firestore (collection `pricing_config`, doc `current`) supaya
 * mutable runtime tanpa redeploy. Pak ustadz edit via /admin/pricing.
 *
 * History 10 perubahan terakhir disimpan di `history` array (audit trail).
 */

import { getAdminDb } from "@/lib/firebase-admin";

export type PlanKey = "solo_monthly" | "solo_yearly" | "family_monthly" | "family_yearly" | "utbk_pack";

export type PlanConfig = {
  /** Display name di UI. */
  label: string;
  /** Harga dalam rupiah (integer). */
  price: number;
  /** Periode aktif setelah pembelian (hari). */
  periodDays: number;
  /** Max user/akun per pembelian (1 untuk solo, 3+ untuk family). */
  maxUsers: number;
  /** Apakah recurring (subscription) atau one-time (pack). */
  recurring: boolean;
  /** Apakah aktif/tampil di paywall. */
  enabled: boolean;
  /** Deskripsi singkat untuk UI. */
  description?: string;
};

export type FreeTierLimits = {
  /** Sub-materi yang bisa diakses per hari. 0 = unlimited. */
  subMateriPerDay: number;
  /** Soal latihan per hari. */
  soalPerDay: number;
  /** AI tutor query per hari. 0 = disabled. */
  aiTutorPerDay: number;
  /** Apakah Phase 2 Drilling adaptif tersedia di free? */
  drillingEnabled: boolean;
  /** Apakah generate-soal AI tersedia di free? */
  generateSoalEnabled: boolean;
};

export type TrialConfig = {
  /** Durasi trial dalam hari. */
  durationDays: number;
  /** Apakah butuh CC upfront untuk start trial. */
  requireCreditCard: boolean;
  /** Plan apa yang dipakai saat trial (default: solo_monthly tier). */
  trialPlan: PlanKey;
};

export type PricingHistory = {
  updatedAt: number;
  updatedBy: string;
  /** Snapshot full pricing sebelum perubahan. */
  snapshot: Omit<PricingConfig, "history">;
  /** Catatan singkat alasan perubahan (opsional). */
  note?: string;
};

export type PricingConfig = {
  plans: Record<PlanKey, PlanConfig>;
  freeTier: FreeTierLimits;
  trial: TrialConfig;
  /** Currency code (default IDR). */
  currency: string;
  /** Last update timestamp. */
  updatedAt: number;
  /** UID yang terakhir update. */
  updatedBy: string;
  /** Catatan freetext untuk pak ustadz. */
  notes?: string;
  /** History perubahan terakhir (max 10). */
  history?: PricingHistory[];
};

/** Default pricing — sesuai rekomendasi strategi monetisasi 2026-05-04. */
export const DEFAULT_PRICING: PricingConfig = {
  plans: {
    solo_monthly: {
      label: "Solo Bulanan",
      price: 89_000,
      periodDays: 30,
      maxUsers: 1,
      recurring: true,
      enabled: true,
      description: "1 siswa, 1 akun. Akses penuh semua fitur.",
    },
    solo_yearly: {
      label: "Solo Tahunan",
      price: 799_000,
      periodDays: 365,
      maxUsers: 1,
      recurring: true,
      enabled: true,
      description: "Bayar setahun, hemat 25% (~Rp 67K/bulan).",
    },
    family_monthly: {
      label: "Family Bulanan",
      price: 149_000,
      periodDays: 30,
      maxUsers: 3,
      recurring: true,
      enabled: true,
      description: "Sampai 3 anak per akun keluarga.",
    },
    family_yearly: {
      label: "Family Tahunan",
      price: 1_299_000,
      periodDays: 365,
      maxUsers: 3,
      recurring: true,
      enabled: true,
      description: "Family hemat tahunan (~Rp 108K/bulan).",
    },
    utbk_pack: {
      label: "UTBK Pack",
      price: 299_000,
      periodDays: 180,
      maxUsers: 1,
      recurring: false,
      enabled: true,
      description: "One-time pembayaran, akses UTBK module 6 bulan.",
    },
  },
  freeTier: {
    subMateriPerDay: 1,
    soalPerDay: 5,
    aiTutorPerDay: 0,
    drillingEnabled: false,
    generateSoalEnabled: false,
  },
  trial: {
    durationDays: 7,
    requireCreditCard: false,
    trialPlan: "solo_monthly",
  },
  currency: "IDR",
  updatedAt: Date.now(),
  updatedBy: "system",
  notes: "Default pricing sesuai strategi monetisasi 2026-05-04. Edit via /admin/pricing.",
  history: [],
};

const COLLECTION = "pricing_config";
const DOC_ID = "current";

/** Get pricing config — return DEFAULT kalau belum ada di Firestore. */
export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    const snap = await getAdminDb().collection(COLLECTION).doc(DOC_ID).get();
    if (!snap.exists) return DEFAULT_PRICING;
    return snap.data() as PricingConfig;
  } catch (e) {
    console.warn("getPricingConfig failed, return DEFAULT:", e);
    return DEFAULT_PRICING;
  }
}

/**
 * Update pricing config. Push snapshot lama ke history (max 10 entries).
 *
 * @param patch Partial update — fields yang tidak disebutkan akan unchanged.
 * @param actorUid UID admin yang melakukan update.
 * @param note Optional catatan alasan perubahan.
 */
export async function updatePricingConfig(
  patch: Partial<Omit<PricingConfig, "updatedAt" | "updatedBy" | "history">>,
  actorUid: string,
  note?: string,
): Promise<PricingConfig> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(DOC_ID);
  const current = await getPricingConfig();
  const now = Date.now();

  // Snapshot history
  const snapshot: Omit<PricingConfig, "history"> = {
    plans: current.plans,
    freeTier: current.freeTier,
    trial: current.trial,
    currency: current.currency,
    updatedAt: current.updatedAt,
    updatedBy: current.updatedBy,
    notes: current.notes,
  };
  const newHistory: PricingHistory[] = [
    { updatedAt: now, updatedBy: actorUid, snapshot, note },
    ...(current.history ?? []),
  ].slice(0, 10);

  const updated: PricingConfig = {
    ...current,
    ...patch,
    plans: { ...current.plans, ...(patch.plans ?? {}) },
    freeTier: { ...current.freeTier, ...(patch.freeTier ?? {}) },
    trial: { ...current.trial, ...(patch.trial ?? {}) },
    updatedAt: now,
    updatedBy: actorUid,
    history: newHistory,
  };

  await ref.set(updated);
  return updated;
}

/** Format rupiah untuk display. */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

/** Hitung harga per bulan untuk plan tahunan (untuk display "save X%"). */
export function pricePerMonth(plan: PlanConfig): number {
  if (plan.periodDays <= 30) return plan.price;
  return Math.round((plan.price / plan.periodDays) * 30);
}
