/**
 * Maturity top-up — re-compute Mathematical Maturity setiap user kerjakan
 * sesi belajar tambahan (Program Belajar).
 *
 * Konteks: tes diagnostik awal kasih maturity v1 dari ~30-40 items.
 * Kualitas dimensi tertentu (multi-step, persistence) butuh sample lebih besar.
 * Setiap user complete sesi Program Belajar (~10-15 items), call topUpMaturity
 * supaya maturity di-recompute dengan data accumulated.
 *
 * Strategi:
 * 1. Load semua responses user sejauh ini (diagnostic + program belajar) dari
 *    user aggregate doc atau gather dari sessions.
 * 2. Re-compute maturity dengan items + responses lengkap.
 * 3. Append ke user.maturityHistory dengan flag isTopUp=true.
 * 4. Update sessionId jadi marker "topup-{timestamp}" supaya tidak collide
 *    dengan diagnostic session.
 *
 * UI dapat tampil "Maturity di-update Y kali sejak diagnostic awal".
 */

import { computeMaturity, type MaturityProfile } from "@/lib/mathematical-maturity";
import { loadItem, type ItemBankEntry } from "@/lib/item-bank";
import { appendMaturityHistory, getUserProfile } from "@/lib/firestore-schema";
import type { Response as IrtResponse } from "@/lib/irt-engine";

export type TopUpInput = {
  /** All responses sejauh ini (diagnostic + program belajar accumulated). */
  responses: IrtResponse[];
  /** Optional confidence rating dari user. */
  userConfidenceRating?: number;
};

/**
 * Compute fresh maturity dari accumulated responses, append snapshot ke user history.
 *
 * @returns MaturityProfile baru, atau null kalau gagal load items.
 */
export async function topUpMaturity(
  uid: string,
  input: TopUpInput,
  kelasAtSession?: number,
): Promise<MaturityProfile | null> {
  if (input.responses.length === 0) return null;

  // Load semua items unik
  const itemIds = [...new Set(input.responses.map((r) => r.itemId))];
  const items = (await Promise.all(itemIds.map((id) => loadItem(id)))).filter(
    (it): it is ItemBankEntry => it !== null,
  );
  if (items.length === 0) return null;

  const maturity = computeMaturity(input.responses, items, input.userConfidenceRating);
  if (!maturity) return null;

  // Append snapshot ke history dengan sessionId unique untuk top-up
  const dimensionsScores: Record<string, number> = {};
  for (const d of maturity.dimensions) dimensionsScores[d.dimension] = d.overall;

  await appendMaturityHistory(uid, {
    timestamp: Date.now(),
    sessionId: `topup-${Date.now()}`,
    overall: maturity.overall,
    level: maturity.level,
    dimensionsScores,
    totalItems: maturity.totalItems,
    kelasAtSession: kelasAtSession ?? 0,
  });

  return maturity;
}

/**
 * Helper: hitung berapa banyak topup snapshot yang sudah dilakukan user.
 * Untuk display "maturity di-update X kali" di UI.
 */
export async function countTopUps(uid: string): Promise<number> {
  const profile = await getUserProfile(uid);
  if (!profile?.maturityHistory) return 0;
  return profile.maturityHistory.filter((s) => s.sessionId.startsWith("topup-")).length;
}

/**
 * Confidence dari maturity v1 → v2 → v3 — naik seiring lebih banyak items.
 * Returns 0..1 (0 = sangat awal, 1 = full confidence).
 */
export function maturityConfidence(totalItemsAccumulated: number): number {
  // Heuristik: 30 items = 0.5 (awal v1), 60 items = 0.7, 100+ items = 0.9
  if (totalItemsAccumulated < 30) return Math.max(0.2, totalItemsAccumulated / 60);
  if (totalItemsAccumulated < 60) return 0.5 + (totalItemsAccumulated - 30) / 150;
  if (totalItemsAccumulated < 100) return 0.7 + (totalItemsAccumulated - 60) / 200;
  return Math.min(1.0, 0.9 + (totalItemsAccumulated - 100) / 1000);
}
