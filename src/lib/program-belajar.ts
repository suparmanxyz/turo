/**
 * Program Belajar — generator rencana belajar dari hasil diagnostik.
 *
 * Ini bukan tes lagi, tapi modul intervensi/practice yang user kerjakan
 * progresif harian/mingguan setelah diagnostik selesai.
 *
 * Reuse logic dari diagnostic-drilling.ts: blueprint per path + sub picking
 * via foundation_set / cluster_a_top / cluster_b_supporting / area_suspect /
 * cross_cluster. Output: list "sesi belajar" yang user kerjakan satu per satu.
 *
 * Per sesi belajar:
 *   - 5-15 items (dependent jenjang scaling)
 *   - Fokus 1-2 sub
 *   - Mix difficulty (E/M/H)
 *   - Setelah selesai → top-up maturity
 */

import { initDrilling, type DrillingState } from "@/lib/diagnostic-drilling";
import type { CoverageResult } from "@/lib/diagnostic-coverage";
import type { JenjangResmi } from "@/types";
import { getTreatmentScaling } from "@/lib/jenjang-labels";
import type { JalurDiagnostik, ItemBankEntry } from "@/lib/item-bank";

export type ProgramBelajarSession = {
  /** Order index — sesi 1, 2, 3, ... */
  index: number;
  /** Source kategori (foundation/bridge/cluster A/dll). */
  source: string;
  /** Label step (e.g. "Pondasi Dasar Kelas 5"). */
  label: string;
  /** Fokus sub kodes yang dikerjakan. */
  targetKodes: string[];
  /** Items yang akan dikerjakan. */
  items: ItemBankEntry[];
  /** Estimasi waktu (menit). */
  estimasiMenit: number;
  /** Status — pending / in_progress / done. */
  status: "pending" | "in_progress" | "done";
};

export type ProgramBelajar = {
  /** Generated dari diagnostic session ini. */
  diagnosticSessionId: string;
  /** Path tier dari diagnostic. */
  pathTier: "ADVANCED" | "STANDARD" | "COMPREHENSIVE" | "INTENSIVE";
  /** Total sesi yang akan dikerjakan. */
  totalSesi: number;
  /** List sesi terurut. */
  sesi: ProgramBelajarSession[];
  /** Total items keseluruhan. */
  totalItems: number;
  /** Estimasi total waktu (menit). */
  totalEstimasiMenit: number;
  createdAt: number;
};

/**
 * Generate Program Belajar dari hasil diagnostik.
 *
 * Pakai initDrilling untuk allocate items, lalu bagi step blueprint jadi
 * "sesi" individual yang user kerjakan satu per satu.
 *
 * @param previouslyUsedIds itemIds yang sudah dipakai di diagnostik (locator+
 *   coverage+deep) — dilewati supaya tidak repeat soal.
 */
export async function generateProgramBelajar(
  diagnosticSessionId: string,
  jenjang: JenjangResmi,
  kelas: number,
  jalur: JalurDiagnostik,
  coverage: CoverageResult,
  previouslyUsedIds: string[],
): Promise<ProgramBelajar | null> {
  if (!coverage.pathRoute) return null;

  // Generate full drilling state pakai existing logic
  const drillState: DrillingState = await initDrilling(jenjang, kelas, coverage, previouslyUsedIds);
  if (drillState.steps.length === 0) return null;

  const scaling = getTreatmentScaling(jenjang, kelas, jalur);

  // Convert drilling steps → program belajar sesi (tiap step = 1 sesi)
  // Cap items per sesi sesuai treatment scaling jenjang
  const sesi: ProgramBelajarSession[] = [];
  let sesiIndex = 0;
  for (const step of drillState.steps) {
    if (step.items.length === 0) continue;

    // Cap items per sesi — anak SD max 6 items, SMA UTBK max 18
    const cappedItems = step.items.slice(0, scaling.maxItemsPerStep);
    sesiIndex++;
    sesi.push({
      index: sesiIndex,
      source: step.config.source,
      label: step.config.label,
      targetKodes: step.targetKodes,
      items: cappedItems,
      estimasiMenit: Math.ceil(cappedItems.length * 1.5), // ~1.5 menit/soal rata-rata
      status: "pending",
    });
  }

  // Cap total items overall
  let totalItems = sesi.reduce((s, x) => s + x.items.length, 0);
  if (totalItems > scaling.maxTotalItems) {
    // Trim dari sesi terakhir dulu
    while (totalItems > scaling.maxTotalItems && sesi.length > 0) {
      const last = sesi[sesi.length - 1];
      if (last.items.length === 0) sesi.pop();
      else last.items.pop();
      totalItems--;
    }
  }

  return {
    diagnosticSessionId,
    pathTier: coverage.pathRoute.path,
    totalSesi: sesi.length,
    sesi,
    totalItems,
    totalEstimasiMenit: sesi.reduce((s, x) => s + x.estimasiMenit, 0),
    createdAt: Date.now(),
  };
}
