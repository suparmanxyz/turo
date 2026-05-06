/**
 * Bab Exposure — track bab apa saja yang sudah dipelajari user di tiap kelas.
 *
 * Konteks: tes diagnostik harus bedakan 3 kategori sub:
 *   ✅ Mastered — sudah dipelajari + kuasai
 *   ⚠ Exposed but weak — sudah dipelajari tapi belum kuasai (target remediasi)
 *   ⏳ Not yet exposed — belum diajarkan di sekolah (skip dari cluster A)
 *
 * Tanpa info exposure, engine misclassify "belum diajarkan" sebagai "remediasi"
 * → false alarm + path INTENSIVE salah.
 *
 * Format storage: `babsExposedPerKelas: { "K8": ["B1", "B2", "B3"] }`
 * (kunci kelas pakai prefix "K", value array bab kode normalized e.g. "B1")
 */

import type { JenjangResmi } from "@/types";
import { babsPerKelas } from "@/data/peta-resmi";

/**
 * Map kelas → daftar bab yang sudah dipelajari (kode bab normalized "B1", "B2", dst).
 * Stored di UserProfileDoc.
 */
export type BabsExposedMap = Record<string, string[]>;

/** Normalize bab kode "Bab 5" → "B5". */
export function normalizeBabKode(babKode: string): string {
  const num = babKode.replace(/[^0-9]/g, "");
  return `B${num}`;
}

/** Convert "B5" → 5 (number) untuk sort. */
function babKodeNumber(babKode: string): number {
  return parseInt(babKode.replace(/[^0-9]/g, ""), 10) || 0;
}

/** Apakah bab specific exposed? */
export function isBabExposed(babs: BabsExposedMap | undefined, kelas: number, babKode: string): boolean {
  if (!babs) return false;
  const exposed = babs[`K${kelas}`];
  if (!exposed) return false;
  const normalized = normalizeBabKode(babKode);
  return exposed.includes(normalized);
}

/**
 * Default smart: berapa bab yang biasanya sudah dipelajari di kelas user
 * berdasarkan bulan ajaran sekarang.
 *
 * Asumsi kalender ajaran Indonesia standar:
 *   - Semester 1: Juli (start) → Desember
 *   - Semester 2: Januari → Juni (end)
 *
 * Per kelas kira-kira 8-12 bab (rata-rata 10). Distribusi:
 *   - Bulan 1-2 (Jul-Aug): bab 1-2
 *   - Bulan 3-4 (Sep-Oct): bab 3-4
 *   - Bulan 5-6 (Nov-Dec): bab 5-6 (akhir semester 1)
 *   - Bulan 7-8 (Jan-Feb): bab 7-8
 *   - Bulan 9-10 (Mar-Apr): bab 9-10
 *   - Bulan 11-12 (Mei-Jun): bab 11+ (selesai semester 2)
 *
 * Return: jumlah bab yang biasanya sudah dipelajari sampai bulan ini.
 */
export function expectedBabsCountByMonth(now: Date = new Date()): number {
  const month = now.getMonth() + 1; // 1-12
  // Map bulan → urutan bulan ajaran (1 = Juli, 12 = Juni)
  let ajaranMonth: number;
  if (month >= 7) ajaranMonth = month - 6; // Jul=1, ..., Dec=6
  else ajaranMonth = month + 6; // Jan=7, ..., Jun=12
  // Per bulan ajaran ~1 bab selesai (linear)
  return Math.max(1, ajaranMonth);
}

/**
 * Smart default: bab terakhir yang biasanya sudah dipelajari per kelas user.
 * Return null kalau bulan ajaran masih awal (belum mulai bab apapun).
 */
export function smartDefaultLastBab(
  jenjang: JenjangResmi,
  kelas: number,
  now: Date = new Date(),
): { babKode: string; babNama: string; index: number } | null {
  const babs = babsPerKelas(jenjang, kelas);
  if (babs.length === 0) return null;
  const expected = Math.min(expectedBabsCountByMonth(now), babs.length);
  if (expected === 0) return null;
  const target = babs[expected - 1]; // 0-indexed
  return {
    babKode: normalizeBabKode(target.kode),
    babNama: target.nama,
    index: expected - 1,
  };
}

/**
 * Build babsExposed list dari "bab terakhir yang dipelajari" — semua bab sebelumnya
 * + bab itu sendiri otomatis terinclude. Approach D dropdown.
 */
export function babsUpToLast(
  jenjang: JenjangResmi,
  kelas: number,
  lastBabKode: string | "not_started" | "all_done",
): string[] {
  if (lastBabKode === "not_started") return [];
  const babs = babsPerKelas(jenjang, kelas);
  if (lastBabKode === "all_done") return babs.map((b) => normalizeBabKode(b.kode));
  // Find index of last bab → return all bab dari awal sampai itu (inclusive)
  const normalized = normalizeBabKode(lastBabKode);
  const idx = babs.findIndex((b) => normalizeBabKode(b.kode) === normalized);
  if (idx < 0) return [];
  return babs.slice(0, idx + 1).map((b) => normalizeBabKode(b.kode));
}

/**
 * Daftar bab di kelas user untuk ditampilkan di dropdown UI.
 * Sorted by bab number.
 */
export function listBabsForKelas(
  jenjang: JenjangResmi,
  kelas: number,
): { kode: string; nama: string; index: number }[] {
  const babs = babsPerKelas(jenjang, kelas);
  return babs
    .map((b, i) => ({ kode: normalizeBabKode(b.kode), nama: b.nama, index: i }))
    .sort((a, b) => babKodeNumber(a.kode) - babKodeNumber(b.kode));
}

/**
 * Set babsExposed untuk kelas user — replace existing entry.
 * Pastikan kelas-kelas BAWAH user (anak naik kelas) auto-marked all bab exposed.
 */
export function buildBabsExposedMap(
  jenjang: JenjangResmi,
  userKelas: number,
  lastBabKode: string | "not_started" | "all_done",
): BabsExposedMap {
  const out: BabsExposedMap = {};

  // Kelas user — sesuai pilihan
  out[`K${userKelas}`] = babsUpToLast(jenjang, userKelas, lastBabKode);

  // Kelas-kelas di bawah user di jenjang yang sama → semua bab exposed (anak naik kelas)
  const minKelas = jenjang === "SD" ? 1 : jenjang === "SMP" ? 7 : 10;
  for (let k = minKelas; k < userKelas; k++) {
    const babs = babsPerKelas(jenjang, k);
    out[`K${k}`] = babs.map((b) => normalizeBabKode(b.kode));
  }

  // Jenjang lebih rendah (anak SMA → SD+SMP semua exposed; anak SMP → SD semua)
  if (jenjang === "SMP" || jenjang === "SMA") {
    for (let k = 1; k <= 6; k++) {
      const babs = babsPerKelas("SD", k);
      out[`SD.K${k}`] = babs.map((b) => normalizeBabKode(b.kode));
    }
  }
  if (jenjang === "SMA") {
    for (let k = 7; k <= 9; k++) {
      const babs = babsPerKelas("SMP", k);
      out[`SMP.K${k}`] = babs.map((b) => normalizeBabKode(b.kode));
    }
  }

  return out;
}

/**
 * Daftar bab di kelas user yang BELUM exposed — untuk display ke ortu/UI
 * sebagai "akan di-test saat anak mau belajar bab ini" + sub-materi nya.
 */
export function notYetExposedBabs(
  jenjang: JenjangResmi,
  userKelas: number,
  babsExposed: BabsExposedMap | undefined,
): { babKode: string; babNama: string; subKodes: string[] }[] {
  const all = babsPerKelas(jenjang, userKelas);
  const exposed = babsExposed?.[`K${userKelas}`] ?? [];
  return all
    .filter((b) => !exposed.includes(normalizeBabKode(b.kode)))
    .map((b) => ({
      babKode: normalizeBabKode(b.kode),
      babNama: b.nama,
      subKodes: b.subMateri.map((s) => s.kode),
    }));
}

/**
 * Cek apakah sub-materi (kode like "SMP.8.B5.02") "exposed" oleh user.
 * Parse kode → cek di map.
 */
export function isSubMateriExposed(babs: BabsExposedMap | undefined, subMateriKode: string): boolean {
  if (!babs) return true; // No data = treat all exposed (backward compat)
  // Parse "SMP.8.B5.02" → jenjang=SMP, kelas=8, bab=B5
  const m = subMateriKode.match(/^(SD|SMP|SMA)\.(\d+)\.(B\d+)/);
  if (!m) return true;
  const [, jenjang, kelasStr, bab] = m;
  const kelas = parseInt(kelasStr, 10);
  // Kelas user: pakai key "K<kelas>"
  // Jenjang lebih rendah: key "SD.K<kelas>" / "SMP.K<kelas>"
  // Coba key sederhana dulu (kelas user)
  let exposed = babs[`K${kelas}`];
  if (!exposed) exposed = babs[`${jenjang}.K${kelas}`];
  if (!exposed) return false;
  return exposed.includes(bab);
}
