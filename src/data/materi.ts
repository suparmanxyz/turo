import type { Materi, SubMateri, Jenjang, Kelas } from "@/types";
import { BAB_PER_KELAS, type Bab } from "./bab-reguler";

/**
 * Sumber konten reguler:
 * - Daftar bab per kelas: `bab-reguler.ts` (draft pola Kurikulum Merdeka, perlu cross-check buku Kemdikbud).
 * - Konten CP: Lampiran II Kepka BSKAP No. 046/H/KR/2025 (`docs/cp046.pdf`).
 *
 * Struktur navigasi UI:
 *   reguler   : Jenjang → Kelas → Materi(Bab) → SubMateri
 *   olimpiade : Jenjang → Materi(Elemen) → SubMateri
 *   snbt      : Materi(Elemen) → SubMateri
 *
 * Elemen di SubMateri = metadata tag (untuk laporan & filter).
 */

// ============================================================
// REGULER — 12 kelas (SD 1-6, SMP 7-9, SMA 10-12) × bab buku
// ============================================================

function jenjangDariKelas(k: Kelas): Jenjang {
  if (k <= 6) return "sd";
  if (k <= 9) return "smp";
  return "sma";
}

function bagianAwal(s: string): string {
  // Ambil 1 kalimat pertama untuk ringkasan default sub-materi
  const titik = s.indexOf(".");
  return titik > 0 ? s.slice(0, titik + 1) : s;
}

function babKeMateri(bab: Bab, kelas: Kelas): Materi {
  const jenjang = jenjangDariKelas(kelas);
  const sub: SubMateri = {
    slug: "konsep",
    nama: bab.nama,
    ringkasan: bagianAwal(bab.ringkasan),
    konten: bab.ringkasan,
    elemen: bab.elemen,
    contohSoal: [],
  };
  return {
    slug: `mat-${jenjang}-k${kelas}-${bab.slug}`,
    kategoriUtama: "reguler",
    jenjang,
    kelas,
    elemen: bab.elemen,
    nama: bab.nama,
    deskripsi: bab.ringkasan,
    subMateri: [sub],
  };
}

const REGULER: Materi[] = ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as Kelas[]).flatMap(
  (k) => BAB_PER_KELAS[k].map((b) => babKeMateri(b, k)),
);

// ============================================================
// OLIMPIADE — per jenjang × elemen olimpiade
// ============================================================

const OLIMPIADE_ELEMEN: { slug: string; nama: string; ringkasan: string }[] = [
  { slug: "teori-bilangan", nama: "Teori Bilangan", ringkasan: "Sifat bilangan bulat, keterbagian, modulo, FPB/KPK, kongruen, persamaan Diophantine." },
  { slug: "aljabar", nama: "Aljabar", ringkasan: "Manipulasi aljabar, polinomial, pertidaksamaan, fungsi, persamaan fungsional." },
  { slug: "geometri", nama: "Geometri", ringkasan: "Geometri sintetik & analitik, lingkaran, segitiga, transformasi, geometri solid." },
  { slug: "kombinatorika", nama: "Kombinatorika", ringkasan: "Counting, prinsip inklusi-eksklusi, graf, prinsip kotak (pigeonhole), kombinatorial bukti." },
];

function buatMateriOlimpiade(jenjang: Jenjang): Materi[] {
  const labelJenjang = jenjang.toUpperCase();
  return OLIMPIADE_ELEMEN.map((el) => ({
    slug: `oli-${jenjang}-${el.slug}`,
    kategoriUtama: "olimpiade" as const,
    jenjang,
    nama: `${el.nama} Olimpiade ${labelJenjang}`,
    deskripsi: el.ringkasan,
    subMateri: [
      {
        slug: "pengantar",
        nama: `Pengantar ${el.nama}`,
        ringkasan: el.ringkasan,
        konten: `Konten ${el.nama} untuk olimpiade ${labelJenjang} sedang disiapkan. Latihan tetap bisa dimulai (soal akan di-generate AI sesuai level olimpiade).`,
        contohSoal: [],
      },
    ],
  }));
}

const OLIMPIADE: Materi[] = (["sd", "smp", "sma"] as Jenjang[]).flatMap(buatMateriOlimpiade);

// ============================================================
// SNBT — per elemen tes
// ============================================================

const SNBT: Materi[] = [
  {
    slug: "snbt-penalaran-kuantitatif",
    kategoriUtama: "snbt",
    elemen: "bilangan",
    nama: "Penalaran Kuantitatif",
    deskripsi: "Soal numerik yang menguji penalaran logis dan pengoperasian bilangan dalam konteks.",
    subMateri: [
      { slug: "operasi-bilangan", nama: "Operasi Bilangan", ringkasan: "+−×÷, pecahan, desimal, persen.", konten: "Operasi dasar bilangan dalam konteks soal SNBT.", contohSoal: [] },
      { slug: "perbandingan-rasio", nama: "Perbandingan & Rasio", ringkasan: "Skala, proporsi, perbandingan senilai/berbalik.", konten: "Soal perbandingan dan rasio.", contohSoal: [] },
      { slug: "barisan-pola", nama: "Barisan & Pola", ringkasan: "Barisan aritmetika, geometri, pola bilangan.", konten: "Pola bilangan dan barisan.", contohSoal: [] },
    ],
  },
  {
    slug: "snbt-pengetahuan-kuantitatif",
    kategoriUtama: "snbt",
    elemen: "aljabar",
    nama: "Pengetahuan Kuantitatif",
    deskripsi: "Konsep matematika dasar (aljabar, geometri, statistika) yang diuji dalam SNBT.",
    subMateri: [
      { slug: "aljabar-dasar", nama: "Aljabar Dasar", ringkasan: "Persamaan, pertidaksamaan, sistem persamaan.", konten: "Konsep aljabar untuk SNBT.", contohSoal: [] },
      { slug: "geometri-dasar", nama: "Geometri Dasar", ringkasan: "Bangun datar, ruang, sudut, trigonometri sederhana.", konten: "Konsep geometri SNBT.", contohSoal: [] },
      { slug: "statistika-peluang", nama: "Statistika & Peluang", ringkasan: "Mean/median/modus, peluang sederhana.", konten: "Statistika dasar SNBT.", contohSoal: [] },
    ],
  },
  {
    slug: "snbt-literasi-data",
    kategoriUtama: "snbt",
    elemen: "analisis-data-peluang",
    nama: "Literasi Data",
    deskripsi: "Membaca, menafsirkan, dan menarik kesimpulan dari grafik/tabel.",
    subMateri: [
      { slug: "membaca-grafik", nama: "Membaca Grafik & Tabel", ringkasan: "Diagram batang, garis, lingkaran, scatter, tabel.", konten: "Latihan baca data dari berbagai bentuk grafik.", contohSoal: [] },
      { slug: "interpretasi-data", nama: "Interpretasi Data", ringkasan: "Menarik kesimpulan dari data.", konten: "Latihan interpretasi data.", contohSoal: [] },
    ],
  },
];

// ============================================================
// Export gabungan
// ============================================================

export const DAFTAR_MATERI: Materi[] = [...REGULER, ...OLIMPIADE, ...SNBT];

export function cariSubMateri(materiSlug: string, subSlug: string): SubMateri | undefined {
  const m = DAFTAR_MATERI.find((x) => x.slug === materiSlug);
  return m?.subMateri.find((s) => s.slug === subSlug);
}

export function cariMateri(slug: string): Materi | undefined {
  return DAFTAR_MATERI.find((m) => m.slug === slug);
}

export function materiPerKelas(jenjang: Jenjang, kelas: Kelas): Materi[] {
  return DAFTAR_MATERI.filter(
    (m) => m.kategoriUtama === "reguler" && m.jenjang === jenjang && m.kelas === kelas,
  );
}

export function materiOlimpiadePerJenjang(jenjang: Jenjang): Materi[] {
  return DAFTAR_MATERI.filter((m) => m.kategoriUtama === "olimpiade" && m.jenjang === jenjang);
}

export function materiSnbt(): Materi[] {
  return DAFTAR_MATERI.filter((m) => m.kategoriUtama === "snbt");
}

export function taksonomiUntukPrompt(): string {
  return DAFTAR_MATERI.map((m) => {
    const subs = m.subMateri.map((s) => `    - ${s.slug}: ${s.nama}`).join("\n");
    return `- ${m.slug} (${m.nama}):\n${subs}`;
  }).join("\n");
}
