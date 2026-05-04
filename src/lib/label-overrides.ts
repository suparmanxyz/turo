/**
 * Label overrides — runtime mutable storage (Firestore-backed).
 *
 * Strategi: peta-prasyarat.json (file static) sebagai BASE, Firestore sebagai
 * OVERRIDES. Effective label = override kalau ada, else base. Pak ustadz bisa
 * edit label live di production via /admin/labels — tidak perlu redeploy.
 *
 * Storage: collection `peta_overrides`, doc `labels`:
 *   {
 *     labels: { "SD.6.B1.04": "CP-2025", "SMP.7.B5.01": "Pengayaan", ... },
 *     updatedAt: number,
 *     updatedBy: string,
 *     history: [{ kode, oldLabel, newLabel, updatedBy, updatedAt }, ...]
 *   }
 */

import { getAdminDb } from "@/lib/firebase-admin";
import type { LabelKurikulum } from "@/types";
import { cariSubMateriResmi } from "@/data/peta-resmi";

const COLLECTION = "peta_overrides";
const DOC_ID = "labels";
const CACHE_TTL_MS = 60_000; // 1 minute — balance freshness vs Firestore reads

export type LabelOverridesDoc = {
  labels: Record<string, LabelKurikulum>;
  updatedAt: number;
  updatedBy: string;
  history?: { kode: string; oldLabel: string; newLabel: string; updatedBy: string; updatedAt: number }[];
};

let cached: { data: Record<string, LabelKurikulum>; fetchedAt: number } | null = null;

/** Get all label overrides — cached 60s. */
export async function getLabelOverrides(): Promise<Record<string, LabelKurikulum>> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }
  try {
    const snap = await getAdminDb().collection(COLLECTION).doc(DOC_ID).get();
    const data = snap.exists ? (snap.data() as LabelOverridesDoc) : null;
    const labels = data?.labels ?? {};
    cached = { data: labels, fetchedAt: now };
    return labels;
  } catch (e) {
    console.warn("getLabelOverrides failed:", e);
    return cached?.data ?? {};
  }
}

/** Force refresh cache — panggil setelah update. */
export function invalidateLabelOverridesCache() {
  cached = null;
}

/**
 * Get effective label untuk satu sub: override kalau ada, else base label dari JSON.
 *
 * NOTE: ini server-side function (butuh Firestore Admin). Kalau dipanggil di
 * client component, fetch overrides via API dulu dan merge di client.
 */
export async function getEffectiveLabel(kode: string): Promise<LabelKurikulum | null> {
  const overrides = await getLabelOverrides();
  if (overrides[kode]) return overrides[kode];
  const sub = cariSubMateriResmi(kode);
  return (sub?.label as LabelKurikulum) ?? null;
}

/**
 * Set label override. Push history entry, max 50.
 *
 * @param kode Sub-materi kode
 * @param label Label baru (CP-2025/Buku-2025/Pengayaan/UTBK)
 * @param actorUid UID admin yang melakukan update
 * @returns Updated full overrides map
 */
export async function setLabelOverride(
  kode: string,
  label: LabelKurikulum,
  actorUid: string,
): Promise<Record<string, LabelKurikulum>> {
  const sub = cariSubMateriResmi(kode);
  if (!sub) throw new Error(`Sub-materi ${kode} tidak ditemukan di peta`);

  const db = getAdminDb();
  const ref = db.collection(COLLECTION).doc(DOC_ID);
  const snap = await ref.get();
  const current = snap.exists ? (snap.data() as LabelOverridesDoc) : { labels: {}, updatedAt: 0, updatedBy: "system", history: [] };

  const oldLabel = current.labels[kode] ?? sub.label;
  const now = Date.now();

  const newLabels = { ...current.labels };
  // Special case: kalau label baru sama dengan base label JSON, hapus override (biar clean)
  if (label === sub.label) {
    delete newLabels[kode];
  } else {
    newLabels[kode] = label;
  }

  const newHistory = [
    { kode, oldLabel, newLabel: label, updatedBy: actorUid, updatedAt: now },
    ...(current.history ?? []),
  ].slice(0, 50);

  const updated: LabelOverridesDoc = {
    labels: newLabels,
    updatedAt: now,
    updatedBy: actorUid,
    history: newHistory,
  };

  await ref.set(updated);
  invalidateLabelOverridesCache();
  return newLabels;
}

/** Apply overrides ke array sub-materi (untuk consumer yang butuh whole list). */
export async function applyOverridesToSubs<T extends { kode: string; label: string }>(subs: T[]): Promise<T[]> {
  const overrides = await getLabelOverrides();
  if (Object.keys(overrides).length === 0) return subs;
  return subs.map((s) => (overrides[s.kode] ? { ...s, label: overrides[s.kode] } : s));
}
