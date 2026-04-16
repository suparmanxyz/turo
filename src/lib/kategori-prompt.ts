import type { Kategori } from "@/types";

export const DEFAULT_KATEGORI: Kategori = "smp";

export function audiensPrompt(k: Kategori): string {
  switch (k) {
    case "sd":
      return "siswa SD Indonesia (kelas 4-6, umur 9-12 tahun)";
    case "smp":
      return "siswa SMP Indonesia (kelas 7-9, umur 12-15 tahun)";
    case "sma":
      return "siswa SMA Indonesia (kelas 10-12, umur 15-18 tahun)";
    case "snbt":
      return "siswa kelas 12 SMA / lulusan yang sedang persiapan SNBT (Seleksi Nasional Berbasis Tes) untuk masuk PTN";
    case "olimpiade":
      return "siswa Indonesia yang sedang persiapan olimpiade matematika tingkat nasional (OSN/KSN) hingga internasional";
  }
}

export function jenjangSingkat(k: Kategori): string {
  switch (k) {
    case "sd": return "SD";
    case "smp": return "SMP";
    case "sma": return "SMA";
    case "snbt": return "SNBT";
    case "olimpiade": return "olimpiade matematika";
  }
}

export function levelKesulitanPanduan(k: Kategori): string {
  switch (k) {
    case "sd":
      return `- Level 0 = soal HOTS SD, aplikatif & menantang tapi tetap realistis.
- Level 1-2 = soal ujian sekolah SD yang menantang.
- Level 3+ = soal latihan dasar sesuai kurikulum SD.`;
    case "smp":
      return `- Level 0 = soal olimpiade SMP nasional (OSN/KSN tingkat kabupaten-provinsi), BUKAN IMO.
- Level 1-2 = soal ujian sekolah/tryout SMP yang menantang.
- Level 3+ = soal latihan dasar sesuai kurikulum SMP.`;
    case "sma":
      return `- Level 0 = soal olimpiade SMA nasional (OSN/KSN) atau UTBK tingkat tinggi.
- Level 1-2 = soal ujian sekolah/tryout SMA yang menantang.
- Level 3+ = soal latihan dasar sesuai kurikulum SMA.`;
    case "snbt":
      return `- Soal harus sesuai format SNBT: penalaran kuantitatif, pengetahuan kuantitatif, atau literasi data.
- Level 0 = soal SNBT sulit (persaingan PTN favorit).
- Level 1-2 = soal SNBT menengah.
- Level 3+ = soal dasar untuk pemanasan.`;
    case "olimpiade":
      return `- Level 0 = soal olimpiade nasional (KSN/OSN) atau setara IMO tingkat awal.
- Level 1-2 = soal olimpiade tingkat provinsi/kabupaten.
- Level 3+ = soal pengantar konsep olimpiade.`;
  }
}
