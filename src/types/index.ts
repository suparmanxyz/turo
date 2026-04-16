export type Kategori = "sd" | "smp" | "sma" | "snbt" | "olimpiade";

export const KATEGORI_LABEL: Record<Kategori, string> = {
  sd: "Matematika SD",
  smp: "Matematika SMP",
  sma: "Matematika SMA",
  snbt: "Persiapan SNBT",
  olimpiade: "Matematika Olimpiade",
};

export const KATEGORI_DESKRIPSI: Record<Kategori, string> = {
  sd: "Dasar berhitung, bilangan, pengukuran, bangun sederhana.",
  smp: "Aljabar dasar, geometri, statistika, persiapan pra-SMA.",
  sma: "Fungsi, kalkulus dasar, trigonometri, statistika lanjutan.",
  snbt: "Penalaran matematika, pengetahuan kuantitatif, literasi data.",
  olimpiade: "Teori bilangan, kombinatorika, geometri, aljabar tingkat olimpiade.",
};

export type Materi = {
  slug: string;
  kategori: Kategori;
  nama: string;
  deskripsi: string;
  subMateri: SubMateri[];
};

export type SubMateri = {
  slug: string;
  nama: string;
  ringkasan: string;
  konten: string;
  contohSoal: ContohSoal[];
};

export type ContohSoal = {
  soal: string;
  pembahasan: string[];
};

export type NodePrasyarat = {
  id: string;
  topik: string;
  level: number;
  prasyarat: string[];
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
