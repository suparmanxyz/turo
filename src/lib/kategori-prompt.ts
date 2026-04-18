import type { Audiens, Jenjang, Kelas, KategoriUtama } from "@/types";

export const DEFAULT_AUDIENS: Audiens = {
  kategoriUtama: "reguler",
  jenjang: "smp",
};

const UMUR_KELAS: Record<Kelas, string> = {
  1: "6-7 tahun",
  2: "7-8 tahun",
  3: "8-9 tahun",
  4: "9-10 tahun",
  5: "10-11 tahun",
  6: "11-12 tahun",
  7: "12-13 tahun",
  8: "13-14 tahun",
  9: "14-15 tahun",
  10: "15-16 tahun",
  11: "16-17 tahun",
  12: "17-18 tahun",
};

function jenjangFull(j: Jenjang): string {
  switch (j) {
    case "sd": return "SD/MI";
    case "smp": return "SMP/MTs";
    case "sma": return "SMA/MA/SMK";
  }
}

export function audiensPrompt(a: Audiens): string {
  const ku = a.kategoriUtama;

  if (ku === "snbt") {
    return "siswa kelas 12 SMA / lulusan yang sedang persiapan SNBT (Seleksi Nasional Berbasis Tes) untuk masuk PTN";
  }

  if (ku === "olimpiade") {
    if (a.jenjang === "sd") return "siswa SD Indonesia yang sedang persiapan olimpiade matematika tingkat kabupaten/provinsi (KSN/OSN SD)";
    if (a.jenjang === "smp") return "siswa SMP Indonesia yang sedang persiapan olimpiade matematika tingkat nasional (KSN/OSN SMP)";
    if (a.jenjang === "sma") return "siswa SMA Indonesia yang sedang persiapan olimpiade matematika tingkat nasional (KSN/OSN) hingga IMO";
    return "siswa Indonesia yang sedang persiapan olimpiade matematika";
  }

  // reguler
  if (a.jenjang && a.kelas) {
    return `siswa ${jenjangFull(a.jenjang)} kelas ${a.kelas} Indonesia (umur ${UMUR_KELAS[a.kelas]})`;
  }
  if (a.jenjang === "sd") return "siswa SD/MI Indonesia (kelas 4-6, umur 9-12 tahun)";
  if (a.jenjang === "smp") return "siswa SMP/MTs Indonesia (kelas 7-9, umur 12-15 tahun)";
  if (a.jenjang === "sma") return "siswa SMA/MA Indonesia (kelas 10-12, umur 15-18 tahun)";
  return "siswa sekolah Indonesia (jenjang umum)";
}

export function jenjangSingkat(a: Audiens): string {
  if (a.kategoriUtama === "snbt") return "SNBT";
  if (a.kategoriUtama === "olimpiade") {
    if (a.jenjang) return `olimpiade ${a.jenjang.toUpperCase()}`;
    return "olimpiade matematika";
  }
  if (a.jenjang) {
    return a.kelas ? `${a.jenjang.toUpperCase()} kelas ${a.kelas}` : a.jenjang.toUpperCase();
  }
  return "umum";
}

export function levelKesulitanPanduan(a: Audiens): string {
  const ku = a.kategoriUtama;

  if (ku === "snbt") {
    return `- Soal harus sesuai format SNBT: penalaran kuantitatif, pengetahuan kuantitatif, atau literasi data.
- Level 0 = soal SNBT sulit (persaingan PTN favorit).
- Level 1-2 = soal SNBT menengah.
- Level 3+ = soal dasar untuk pemanasan.`;
  }

  if (ku === "olimpiade") {
    return `- Level 0 = soal olimpiade nasional (KSN/OSN) atau setara IMO tingkat awal.
- Level 1-2 = soal olimpiade tingkat provinsi/kabupaten.
- Level 3+ = soal pengantar konsep olimpiade.`;
  }

  // reguler — per jenjang
  if (a.jenjang === "sd") {
    return `- Level 0 = soal HOTS SD, aplikatif & menantang tapi tetap realistis untuk kelas yang dimaksud.
- Level 1-2 = soal ujian sekolah SD yang menantang.
- Level 3+ = soal latihan dasar sesuai kurikulum SD.`;
  }
  if (a.jenjang === "smp") {
    return `- Level 0 = soal olimpiade SMP nasional (OSN/KSN tingkat kabupaten-provinsi), BUKAN IMO.
- Level 1-2 = soal ujian sekolah/tryout SMP yang menantang.
- Level 3+ = soal latihan dasar sesuai kurikulum SMP.`;
  }
  if (a.jenjang === "sma") {
    return `- Level 0 = soal olimpiade SMA nasional (OSN/KSN) atau UTBK tingkat tinggi.
- Level 1-2 = soal ujian sekolah/tryout SMA yang menantang.
- Level 3+ = soal latihan dasar sesuai kurikulum SMA.`;
  }
  return `- Level 0 = soal HOTS sesuai jenjang.
- Level 1-2 = soal ujian sekolah menantang.
- Level 3+ = soal latihan dasar.`;
}

/** Parse Audiens dari body request (toleran terhadap legacy field 'kategori'). */
export function audiensDariBody(body: Record<string, unknown>): Audiens {
  const ku = (body.kategoriUtama as KategoriUtama | undefined) ?? guessKategoriUtama(body.kategori as string | undefined);
  const jenjang = body.jenjang as Jenjang | undefined ?? jenjangDariLegacy(body.kategori as string | undefined);
  const kelas = body.kelas as Kelas | undefined;
  return { kategoriUtama: ku, jenjang, kelas };
}

function guessKategoriUtama(legacy: string | undefined): KategoriUtama {
  if (legacy === "snbt") return "snbt";
  if (legacy === "olimpiade") return "olimpiade";
  return "reguler";
}

function jenjangDariLegacy(legacy: string | undefined): Jenjang | undefined {
  if (legacy === "sd" || legacy === "smp" || legacy === "sma") return legacy;
  return undefined;
}
