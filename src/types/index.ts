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
  /** Estimasi kelas tempat konsep ini diajarkan (untuk traceability admin). 1-12 untuk reguler. */
  kelasEstimasi?: number;
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

// ============================================================
// Peta Prasyarat resmi (dari konsepbaru/data — 472 sub-materi terkurasi)
// Kode: SD.1.B1.01 / SMP.8.B5.01 / SMA.12.B3.04
// ============================================================

export type JenjangResmi = "SD" | "SMP" | "SMA";

export type AreaMatematika =
  | "bilangan"
  | "aljabar"
  | "geometri"
  | "statistik"
  | "kalkulus"
  | "trigonometri"
  | "logika"
  | "lain";

export type RelationType = "STRICT" | "SOFT" | "ALTERNATIVE";

export type WeightPrereq = "CRITICAL" | "IMPORTANT" | "HELPER";

export interface PrereqRelation {
  /** Kode sub-materi yang menjadi prasyarat */
  kode: string;
  relation: RelationType;
  weight: WeightPrereq;
  reason: string;
}

/** Label kategori sub-materi di dual-track curriculum (Turo v3.0). */
export type LabelKurikulum = "CP-2025" | "Buku-2025" | "UTBK" | "Pengayaan";

/**
 * Mode kurikulum yang dipilih user.
 *   - strict        : ikut CP 046/2025 saja (438 sub) — siswa sekolah Indonesia standar
 *   - comprehensive : peta penuh + bridge sub-materi (472 sub) — siswa yang mau detail lengkap
 *   - accelerated   : skip foundation procedural, fokus topik tantangan/HOTS — anak cepat / olimpiade
 *
 * Alias backwards-compat: "full" → "comprehensive" (di-handle di filter helper).
 */
export type ModeKurikulum = "strict" | "comprehensive" | "accelerated";

/** Alias untuk backwards-compat — sebelumnya pakai "full". */
export type ModeKurikulumLegacy = ModeKurikulum | "full";

export interface SubMateriResmi {
  /** Format: {JENJANG}.{KELAS}.B{NOMOR_BAB}.{NOMOR_URUT} */
  kode: string;
  nama: string;
  jenjang: JenjangResmi;
  kelas: number;
  bab_kode: string;
  bab_nama: string;
  area: AreaMatematika;
  is_maku: boolean;
  is_entry_point: boolean;
  durasi_estimasi: string;
  penjelasan: string;
  depth: number;
  dependents_count: number;
  prereq: PrereqRelation[];
  /** Apakah masuk Jalur Strict CP 046 (true) atau hanya Comprehensive Full (false). */
  strict: boolean;
  /**
   * Optional explicit tag untuk Bridge sub-materi (penghubung antar topik di
   * mode comprehensive). Kalau undefined, derived dari strict==false +
   * dependents_count >= 2 di runtime.
   */
  bridge?: boolean;
  /**
   * Optional explicit tag untuk Accelerated mode (sub-materi tantangan / HOTS).
   * Kalau undefined, derived dari is_maku && (depth >= 3 || dependents_count >= 5)
   * di kelas SMP/SMA.
   */
  accelerated?: boolean;
  /** Label kategori untuk audit transparansi. */
  label: LabelKurikulum;
}

export interface PetaPrasyaratResmi {
  $schema: string;
  version: string;
  tanggal_update: string;
  deskripsi: string;
  schema_relation_types: Record<RelationType, string>;
  schema_weights: Record<WeightPrereq, string>;
  schema_areas: AreaMatematika[];
  stats: {
    total_submateri: number;
    total_relations: number;
    submateri_dengan_multi_prereq: number;
    entry_points: number;
    submateri_maku: number;
    /** Jumlah sub yang masuk Jalur Strict CP 046. */
    strict_only?: number;
    /** Jumlah sub di Jalur Full = total. */
    full?: number;
    label_counts?: Record<string, number>;
  };
  submateri: SubMateriResmi[];
}

export interface PetaPrasyaratIndex {
  by_jenjang_kelas: Record<string, string[]>;
  by_area: Record<AreaMatematika, string[]>;
  by_bab: Record<string, string[]>;
  entry_points: string[];
  maku_codes: string[];
  /** Sub-materi yang masuk Jalur Strict CP 046. */
  strict_kodes?: string[];
  by_label?: Record<string, string[]>;
  dependents: Record<
    string,
    Array<{
      kode: string;
      relation: RelationType;
      weight: WeightPrereq;
    }>
  >;
}

/**
 * Mastery status user terhadap sub-materi (Phase B+ data model).
 *
 * - siap: kuasai, lanjut ke level berikutnya
 * - review: hampir kuasai, perlu latihan ringan
 * - remediasi: perlu repair sistematis
 * - unknown: belum cukup data assessment
 * - belum_dipelajari: bab user belum exposed di kelas user, akan di-test on-demand
 *   via tes kesiapan bab ketika user mau mempelajari bab tersebut
 */
export type MasteryStatus = "siap" | "review" | "remediasi" | "unknown" | "belum_dipelajari";

export interface SubMateriMastery {
  kode: string;
  status: MasteryStatus;
  /** Confidence 0-1 */
  confidence: number;
  /** Timestamp last assessment (ms) */
  lastAssessedAt: number;
  source: "diagnostic" | "latihan" | "post_test" | "cek_kesiapan";
}

export interface BlindSpot {
  kode: string;
  weight: WeightPrereq;
  reason: string;
}
