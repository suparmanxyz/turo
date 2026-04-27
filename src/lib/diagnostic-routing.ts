/**
 * Diagnostik Routing — pilih jalur diagnostik dari user profile.
 * SRS Section 4.1.
 *
 * 5 jalur:
 *   - sd-k1-3   : SD kelas 1-3 (numerasi dasar)
 *   - sd-k4-6   : SD kelas 4-6 (operasi lanjut + pecahan)
 *   - smp       : SMP kelas 7-9
 *   - sma-reguler: SMA kelas 10-12 reguler (kurikulum sekolah)
 *   - sma-utbk  : SMA persiapan UTBK (penalaran kuantitatif lintas-jenjang)
 *
 * Routing input: user profile { jenjang, kelas, kategoriUtama, mode? }
 */

import type { JalurDiagnostik } from "@/lib/item-bank";
import type { Jenjang, Kelas, KategoriUtama } from "@/types";

export type UserProfile = {
  jenjang?: Jenjang;
  kelas?: Kelas;
  kategoriUtama: KategoriUtama;
  /** Override eksplisit kalau user pilih mode SNBT/UTBK. */
  modePersiapan?: "sekolah" | "utbk" | "olimpiade";
};

/** Map (jenjang, kelas, kategori) → JalurDiagnostik. */
export function pilihJalur(profile: UserProfile): JalurDiagnostik {
  // 1. SNBT category → langsung sma-utbk (utbk fokus penalaran kuantitatif)
  if (profile.kategoriUtama === "snbt" || profile.modePersiapan === "utbk") {
    return "sma-utbk";
  }

  // 2. Olimpiade → MVP pakai sma-reguler sebagai diagnosis dasar
  if (profile.kategoriUtama === "olimpiade") {
    if (profile.jenjang === "sd") return profile.kelas && profile.kelas <= 3 ? "sd-k1-3" : "sd-k4-6";
    if (profile.jenjang === "smp") return "smp";
    return "sma-reguler";
  }

  // 3. Reguler — by jenjang+kelas
  if (profile.jenjang === "sd") {
    if (profile.kelas && profile.kelas <= 3) return "sd-k1-3";
    return "sd-k4-6";
  }
  if (profile.jenjang === "smp") return "smp";
  if (profile.jenjang === "sma") return "sma-reguler";

  // Fallback: tanpa info jenjang → asumsikan SMP (median)
  return "smp";
}

/** Label human-friendly untuk jalur. */
export const JALUR_LABEL: Record<JalurDiagnostik, string> = {
  "sd-k1-3": "SD Kelas 1-3 (Numerasi Dasar)",
  "sd-k4-6": "SD Kelas 4-6 (Operasi & Pecahan)",
  "smp": "SMP Kelas 7-9",
  "sma-reguler": "SMA Kelas 10-12 Reguler",
  "sma-utbk": "Persiapan UTBK (Penalaran Kuantitatif)",
};

/** Estimasi total durasi (menit) untuk jalur, untuk tampilkan ke user. */
export const JALUR_DURASI_MENIT: Record<JalurDiagnostik, { fast: number; deep: number }> = {
  "sd-k1-3": { fast: 8, deep: 15 },
  "sd-k4-6": { fast: 10, deep: 20 },
  "smp": { fast: 12, deep: 25 },
  "sma-reguler": { fast: 15, deep: 30 },
  "sma-utbk": { fast: 15, deep: 35 },
};

/** Range kelas yang valid untuk jalur (untuk validasi profile). */
export const JALUR_KELAS_VALID: Record<JalurDiagnostik, Kelas[]> = {
  "sd-k1-3": [1, 2, 3],
  "sd-k4-6": [4, 5, 6],
  "smp": [7, 8, 9],
  "sma-reguler": [10, 11, 12],
  "sma-utbk": [10, 11, 12], // UTBK biasanya kelas 12 / lulusan
};

/** Cek apakah profile valid untuk jalur tertentu. */
export function profileValidForJalur(profile: UserProfile, jalur: JalurDiagnostik): boolean {
  if (!profile.kelas) return true; // tanpa kelas → assume valid (fallback)
  return JALUR_KELAS_VALID[jalur].includes(profile.kelas);
}
