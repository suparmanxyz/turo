import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Threshold mastery — kalau skor terakhir di bab ≥ ini, dianggap dikuasai. */
export const MASTERY_THRESHOLD = 0.8;

export type MasteryInfo = {
  /** Skor 0..1 (proporsi benar). null kalau tidak ada data. */
  skor: number | null;
  /** Sumber: dari sesi latihan ('latihan'), dari diagnostik ('diagnostik'), atau gabungan. */
  sumber: "latihan" | "diagnostik" | "tidak-ada";
  jumlahDijawab: number;
  jumlahBenar: number;
};

/**
 * Cek mastery user di bab tertentu (slug). Ambil data terbaik dari:
 * 1. Sesi latihan untuk materiSlug (kalau ada)
 * 2. Diagnostik sebelumnya (post-test atau diagnostik) untuk materiSlug
 * Pilih yang paling representatif (terbaru, atau dengan jumlah soal terbanyak).
 */
export async function cekMasteryBab(uid: string, materiSlug: string): Promise<MasteryInfo> {
  let bestSkor: number | null = null;
  let bestSumber: MasteryInfo["sumber"] = "tidak-ada";
  let bestDijawab = 0;
  let bestBenar = 0;

  // Sesi latihan
  try {
    const sesiQ = query(
      collection(db, "progress", uid, "sesi"),
      where("materiSlug", "==", materiSlug),
      limit(10),
    );
    const sesiSnap = await getDocs(sesiQ);
    for (const d of sesiSnap.docs) {
      const data = d.data();
      const dijawab = data.jumlahDijawab ?? 0;
      const benar = data.jumlahBenar ?? 0;
      if (dijawab >= 3) {
        const skor = benar / dijawab;
        if (bestSkor === null || dijawab > bestDijawab) {
          bestSkor = skor;
          bestSumber = "latihan";
          bestDijawab = dijawab;
          bestBenar = benar;
        }
      }
    }
  } catch (e) {
    console.warn("cekMasteryBab sesi gagal:", e);
  }

  // Diagnostik / post-test (collection by id starts with materiSlug__)
  try {
    const dQ = query(
      collection(db, "progress", uid, "diagnostik"),
      where("materiSlug", "==", materiSlug),
      limit(10),
    );
    const dSnap = await getDocs(dQ);
    for (const d of dSnap.docs) {
      const data = d.data();
      const dijawab = data.skorTotal ?? 0;
      const benar = data.skorBenar ?? 0;
      if (dijawab >= 3) {
        const skor = benar / dijawab;
        if (bestSkor === null || dijawab > bestDijawab) {
          bestSkor = skor;
          bestSumber = "diagnostik";
          bestDijawab = dijawab;
          bestBenar = benar;
        }
      }
    }
  } catch (e) {
    console.warn("cekMasteryBab diagnostik gagal:", e);
  }

  return {
    skor: bestSkor,
    sumber: bestSumber,
    jumlahDijawab: bestDijawab,
    jumlahBenar: bestBenar,
  };
}

/** True kalau user sudah mastery di bab. */
export function sudahMastery(info: MasteryInfo): boolean {
  return info.skor !== null && info.skor >= MASTERY_THRESHOLD;
}
