/**
 * Helper jenjang/kelas crossing — dipakai oleh Deep & Drilling stage.
 *
 * Konteks: peta kurikulum membagi jenjang ke SD (K1-6), SMP (K7-9), SMA (K10-12).
 * Banyak engine logic perlu iterate "kelas-1, -2, -3" relative ke kelas user atau
 * kelas estimasi. Tanpa crossing, untuk SMA K11 → loop k=10/9/8 hanya dapat K10
 * (K9/8 tidak ada di SMA → empty). Bug ini bikin Bridge drilling kosong dan
 * Deep stage skip untuk weak student.
 *
 * `bridgeJenjangKelas(userJenjang, k)` → resolve (jenjang, kelas) yang valid.
 */

import type { JenjangResmi } from "@/types";

/**
 * Map (jenjang user, k) → (jenjang aktual, kelas) yang valid di peta.
 * Untuk SMA user dengan k<10, drop ke SMP. Untuk SMP user dengan k<7, drop ke SD.
 * Return null kalau k < 1.
 */
export function bridgeJenjangKelas(
  userJenjang: JenjangResmi,
  k: number,
): { jenjang: JenjangResmi; kelas: number } | null {
  if (k < 1) return null;
  if (userJenjang === "SMA") {
    if (k >= 10) return { jenjang: "SMA", kelas: k };
    if (k >= 7) return { jenjang: "SMP", kelas: k };
    return { jenjang: "SD", kelas: k };
  }
  if (userJenjang === "SMP") {
    if (k >= 7) return { jenjang: "SMP", kelas: k };
    return { jenjang: "SD", kelas: k };
  }
  // SD user — clamp ke max K6
  return { jenjang: "SD", kelas: Math.min(6, k) };
}

/**
 * Build set of (jenjang, kelas) tuples dari window kelas — pakai bridge logic.
 * Output: Set of "JENJANG:K" string keys, untuk lookup cepat di filter.
 */
export function buildKelasWindowSet(
  userJenjang: JenjangResmi,
  kelasWindow: number[],
): Set<string> {
  const set = new Set<string>();
  for (const k of kelasWindow) {
    const t = bridgeJenjangKelas(userJenjang, k);
    if (t) set.add(`${t.jenjang}:${t.kelas}`);
  }
  return set;
}
