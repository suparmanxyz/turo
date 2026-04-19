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
    const usiaCue =
      a.kelas <= 3
        ? " — anak yang masih belajar membaca, butuh bahasa SANGAT sederhana"
        : a.kelas <= 6
        ? " — sudah lancar baca, suka konteks sehari-hari"
        : a.kelas <= 9
        ? " — remaja awal"
        : "";
    return `siswa ${jenjangFull(a.jenjang)} kelas ${a.kelas} Indonesia (umur ${UMUR_KELAS[a.kelas]})${usiaCue}`;
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

/**
 * Panduan gaya bahasa per jenjang & kelas. Diinjeksi ke prompt soal/hint biar
 * Claude pakai diksi yang sesuai usia anak — bukan bahasa baku formal.
 */
export function gayaBahasaPanduan(a: Audiens): string {
  if (a.kategoriUtama === "snbt") {
    return `- Bahasa formal-ringan ala soal SNBT, tidak terlalu kaku.
- Boleh konteks dunia nyata (data ekonomi, kependudukan, sains populer).`;
  }
  if (a.kategoriUtama === "olimpiade") {
    return `- Bahasa formal matematis, padat & presisi (gaya soal olimpiade).
- Boleh pakai notasi standar matematika.`;
  }

  // Reguler
  if (a.jenjang === "sd" && a.kelas && a.kelas <= 3) {
    return `- WAJIB pakai BAHASA ANAK SD KELAS BAWAH:
  * Kalimat PENDEK (max 15 kata per kalimat).
  * Kata sederhana: "tambah" bukan "operasi penjumlahan", "berapa" bukan "tentukan hasil dari", "ambil" bukan "mengurangi".
  * Konteks bermain & sehari-hari: mainan, kelereng, kue, hewan, buah, mobil-mobilan. JANGAN konteks dewasa (uang besar, bisnis, statistik).
  * 1-2 kalimat per soal MAX. Tidak boleh paragraf panjang.
  * Boleh pakai nama anak Indonesia (Andi, Sari, Budi).
- HINDARI istilah teknis/akademis. Anak SD kelas 1-3 belum kenal kata "bilangan", "operasi", "satuan", "estimasi" — pakai "angka", "hitung", dll.`;
  }
  if (a.jenjang === "sd") {
    // SD kelas 4-6
    return `- Bahasa anak SD kelas atas: ringan tapi mulai pakai istilah matematika dasar (bilangan, pecahan, kelipatan).
- Konteks: sekolah, rumah, hobi, sains sederhana. Boleh konteks uang kecil (saku, harga jajan).
- Kalimat max 25 kata. Soal cerita boleh 2-3 kalimat tapi tetap ringkas.`;
  }
  if (a.jenjang === "smp") {
    return `- Bahasa siswa SMP: semi-formal, mulai pakai notasi matematika ($x$, $f(x)$, dll).
- Konteks: kehidupan remaja, sains, ekonomi rumah tangga, olahraga.
- Soal cerita 2-4 kalimat OK.`;
  }
  if (a.jenjang === "sma") {
    return `- Bahasa siswa SMA: formal, pakai notasi matematika lengkap.
- Konteks aplikatif: sains, ekonomi, teknik, kehidupan sosial.
- Boleh kalimat panjang & multi-step.`;
  }
  return "";
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
