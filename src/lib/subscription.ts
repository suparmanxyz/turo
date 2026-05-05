/**
 * Subscription state per user — Firestore collection `subscriptions/{uid}`.
 *
 * Status workflow:
 *   none → trial → (expired | active) → (cancelled | active)
 *
 * Trial otomatis activated saat register (lihat startTrialIfNew).
 * Premium activated via Midtrans webhook (akan ditambah Phase A1).
 */

import { getAdminDb } from "@/lib/firebase-admin";
import { getPricingConfig, type PlanKey } from "@/lib/pricing";

export type SubscriptionStatus = "none" | "trial" | "active" | "expired" | "cancelled";

export type PaymentRecord = {
  orderId: string;
  amount: number;
  plan: PlanKey;
  status: "pending" | "paid" | "failed" | "refunded";
  paidAt?: number;
  /** Raw response dari payment gateway (untuk audit). */
  rawResponse?: Record<string, unknown>;
};

export type SubscriptionDoc = {
  uid: string;
  status: SubscriptionStatus;
  plan?: PlanKey;
  trialStartedAt?: number;
  trialEndsAt?: number;
  subscriptionStartedAt?: number;
  subscriptionEndsAt?: number;
  /** Order id terakhir untuk reconcile dengan webhook. */
  midtransOrderId?: string;
  /** History pembayaran (max 20 terakhir). */
  paymentHistory: PaymentRecord[];
  createdAt: number;
  updatedAt: number;
};

const COLLECTION = "subscriptions";
const HISTORY_MAX = 20;

/** Get subscription doc — return null kalau belum ada. */
export async function getSubscription(uid: string): Promise<SubscriptionDoc | null> {
  const snap = await getAdminDb().collection(COLLECTION).doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as SubscriptionDoc;
}

/**
 * Derive status efektif sekarang (handle trial/subscription expired).
 * Berbeda dengan field `status` di doc karena field bisa stale.
 */
export function effectiveStatus(sub: SubscriptionDoc | null, now = Date.now()): SubscriptionStatus {
  if (!sub) return "none";
  if (sub.status === "cancelled") return "cancelled";
  if (sub.status === "active") {
    if (sub.subscriptionEndsAt && sub.subscriptionEndsAt < now) return "expired";
    return "active";
  }
  if (sub.status === "trial") {
    if (sub.trialEndsAt && sub.trialEndsAt < now) return "expired";
    return "trial";
  }
  return sub.status;
}

/** Apakah user punya akses premium (trial atau active subscription belum expired). */
export function hasPremiumAccess(sub: SubscriptionDoc | null, now = Date.now()): boolean {
  const s = effectiveStatus(sub, now);
  return s === "trial" || s === "active";
}

/** Hari sisa trial/subscription. 0 kalau expired/none. */
export function daysRemaining(sub: SubscriptionDoc | null, now = Date.now()): number {
  if (!sub) return 0;
  const s = effectiveStatus(sub, now);
  if (s === "trial" && sub.trialEndsAt) {
    return Math.max(0, Math.ceil((sub.trialEndsAt - now) / (24 * 60 * 60 * 1000)));
  }
  if (s === "active" && sub.subscriptionEndsAt) {
    return Math.max(0, Math.ceil((sub.subscriptionEndsAt - now) / (24 * 60 * 60 * 1000)));
  }
  return 0;
}

/**
 * Start trial untuk user baru. Idempotent — kalau sudah ada doc, return existing.
 * Trial duration ambil dari pricing config.
 */
export async function startTrialIfNew(uid: string): Promise<SubscriptionDoc> {
  const existing = await getSubscription(uid);
  if (existing) return existing;

  const pricing = await getPricingConfig();
  const now = Date.now();
  const trialMs = pricing.trial.durationDays * 24 * 60 * 60 * 1000;

  const doc: SubscriptionDoc = {
    uid,
    status: "trial",
    plan: pricing.trial.trialPlan,
    trialStartedAt: now,
    trialEndsAt: now + trialMs,
    paymentHistory: [],
    createdAt: now,
    updatedAt: now,
  };
  await getAdminDb().collection(COLLECTION).doc(uid).set(doc);
  return doc;
}

/**
 * Activate subscription setelah pembayaran sukses (dipanggil dari webhook).
 * Existing trial overridden — start period baru dari sekarang.
 */
export async function activateSubscription(
  uid: string,
  plan: PlanKey,
  payment: Omit<PaymentRecord, "status"> & { status?: PaymentRecord["status"] },
): Promise<SubscriptionDoc> {
  const pricing = await getPricingConfig();
  const planConfig = pricing.plans[plan];
  if (!planConfig) throw new Error(`Plan ${plan} tidak ada di pricing config`);

  const now = Date.now();
  const periodMs = planConfig.periodDays * 24 * 60 * 60 * 1000;
  const ref = getAdminDb().collection(COLLECTION).doc(uid);
  const existing = await getSubscription(uid);

  const record: PaymentRecord = {
    ...payment,
    status: payment.status ?? "paid",
    paidAt: payment.paidAt ?? now,
  };
  const history = [record, ...(existing?.paymentHistory ?? [])].slice(0, HISTORY_MAX);

  const doc: SubscriptionDoc = {
    uid,
    status: "active",
    plan,
    trialStartedAt: existing?.trialStartedAt,
    trialEndsAt: existing?.trialEndsAt,
    subscriptionStartedAt: now,
    subscriptionEndsAt: now + periodMs,
    midtransOrderId: payment.orderId,
    paymentHistory: history,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await ref.set(doc);
  return doc;
}

/** Cancel subscription — tetap aktif sampai subscriptionEndsAt, lalu jadi expired. */
export async function cancelSubscription(uid: string): Promise<SubscriptionDoc | null> {
  const ref = getAdminDb().collection(COLLECTION).doc(uid);
  const existing = await getSubscription(uid);
  if (!existing) return null;
  const updated: SubscriptionDoc = { ...existing, status: "cancelled", updatedAt: Date.now() };
  await ref.set(updated);
  return updated;
}

/** Append payment record (untuk pending/failed events dari webhook). */
export async function appendPaymentRecord(uid: string, record: PaymentRecord): Promise<void> {
  const ref = getAdminDb().collection(COLLECTION).doc(uid);
  const existing = await getSubscription(uid);
  if (!existing) {
    // First-time write tanpa activation (e.g. pending payment)
    const now = Date.now();
    await ref.set({
      uid,
      status: "none",
      paymentHistory: [record],
      createdAt: now,
      updatedAt: now,
    } as SubscriptionDoc);
    return;
  }
  const history = [record, ...existing.paymentHistory].slice(0, HISTORY_MAX);
  await ref.update({ paymentHistory: history, updatedAt: Date.now() });
}
