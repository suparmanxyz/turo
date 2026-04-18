// ============================================================
// Taksonomi: Kategori Utama → Jenjang → Kelas → Materi(Bab) → Sub
// ============================================================

export type KategoriUtama = "reguler" | "snbt" | "olimpiade";

export const KATEGORI_UTAMA_URUT: KategoriUtama[] = ["reguler", "snbt", "olimpiade"];

export const KATEGORI_UTAMA_LABEL: Record<KategoriUtama, string> = {
  reguler: "Matematika Sekolah",
  snbt: "Persiapan SNBT",
  olimpiade: "Olimpiade Matematika",
};

export const KATEGORI_UTAMA_DESKRIPSI: Record<KategoriUtama, string> = {
  reguler: "Mengikuti kurikulum sekolah resmi (CP 046/2025) — SD, SMP, SMA per kelas.",
  snbt: "Persiapan SNBT untuk masuk PTN — penalaran kuantitatif, pengetahuan kuantitatif, literasi data.",
  olimpiade: "Latihan soal olimpiade tingkat kabupaten/provinsi/nasional — KSN, OSN, sampai IMO.",
};

export type Jenjang = "sd" | "smp" | "sma";

export const JENJANG_URUT: Jenjang[] = ["sd", "smp", "sma"];

export const JENJANG_LABEL: Record<Jenjang, string> = {
  sd: "SD/MI",
  smp: "SMP/MTs",
  sma: "SMA/MA",
};

export type Kelas = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const KELAS_PER_JENJANG: Record<Jenjang, Kelas[]> = {
  sd: [1, 2, 3, 4, 5, 6],
  smp: [7, 8, 9],
  sma: [10, 11, 12],
};

/** Elemen konten matematika (CP 046/2025) — dipakai sebagai metadata/tag. */
export type Elemen =
  | "bilangan"
  | "aljabar"
  | "aljabar-dan-fungsi"
  | "pengukuran"
  | "geometri"
  | "analisis-data-peluang";

export const ELEMEN_LABEL: Record<Elemen, string> = {
  bilangan: "Bilangan",
  aljabar: "Aljabar",
  "aljabar-dan-fungsi": "Aljabar dan Fungsi",
  pengukuran: "Pengukuran",
  geometri: "Geometri",
  "analisis-data-peluang": "Analisis Data dan Peluang",
};

// ============================================================
// Audiens — konteks lengkap untuk prompt AI
// ============================================================

export type Audiens = {
  kategoriUtama: KategoriUtama;
  jenjang?: Jenjang;
  kelas?: Kelas;
};

// ============================================================
// Materi & SubMateri
// ============================================================

export type Materi = {
  slug: string;
  kategoriUtama: KategoriUtama;
  jenjang?: Jenjang;
  kelas?: Kelas;
  elemen?: Elemen;
  nama: string;
  deskripsi: string;
  subMateri: SubMateri[];
};

export type SubMateri = {
  slug: string;
  nama: string;
  ringkasan: string;
  konten: string;
  elemen?: Elemen;
  contohSoal: ContohSoal[];
};

export type ContohSoal = {
  soal: string;
  pembahasan: string[];
};

// ============================================================
// Engine peta prasyarat & soal
// ============================================================

export type NodePrasyarat = {
  id: string;
  topik: string;
  level: number;
  prasyarat: string[];
  /** Sub-konsep testable di dalam topik (untuk diagnostic adaptif). 2 soal per sub-konsep. */
  subKonsep?: string[];
  /** Soft link ke slug Materi di DAFTAR_MATERI kalau topik ini cocok dengan bab existing.
   * Optional — Claude isi kalau yakin match, kosong kalau konseptual general. */
  linkedSlug?: string;
};

export type PetaPrasyarat = {
  rootId: string;
  nodes: NodePrasyarat[];
};

export type Soal = {
  id: string;
  nodeId: string;
  level: number;
  pertanyaan: string;
  jawabanBenar: string;
  pembahasan: string[];
  opsi?: string[];
};

export type ModeLatihan = "turun" | "naik";

export type ProgressUser = {
  userId: string;
  subMateriSlug: string;
  mode: ModeLatihan;
  nodeIdsBenar: string[];
  nodeIdSekarang: string;
};
