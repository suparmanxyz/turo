import { doc, getDoc, setDoc, serverTimestamp, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ModeLatihan } from "@/types";

/**
 * Progress per (userId, materiSlug, subMateriSlug).
 * Path Firestore: /progress/{userId}/sesi/{key} dengan key = `${materiSlug}__${subMateriSlug}`.
 */
export type ProgressSesi = {
  materiSlug: string;
  subMateriSlug: string;
  mode: ModeLatihan;
  nodeIdsBenar: string[];
  nodeIdSekarang: string | null;
  jumlahDijawab: number;
  jumlahBenar: number;
  updatedAt: Timestamp | null;
};

function sesiKey(materiSlug: string, subMateriSlug: string): string {
  return `${materiSlug}__${subMateriSlug}`;
}

function sesiRef(userId: string, materiSlug: string, subMateriSlug: string) {
  return doc(db, "progress", userId, "sesi", sesiKey(materiSlug, subMateriSlug));
}

export async function loadSesi(
  userId: string,
  materiSlug: string,
  subMateriSlug: string,
): Promise<ProgressSesi | null> {
  try {
    const snap = await getDoc(sesiRef(userId, materiSlug, subMateriSlug));
    if (!snap.exists()) return null;
    return snap.data() as ProgressSesi;
  } catch (e) {
    console.warn("loadSesi gagal:", e);
    return null;
  }
}

export async function saveSesi(
  userId: string,
  data: Omit<ProgressSesi, "updatedAt">,
): Promise<void> {
  try {
    await setDoc(
      sesiRef(userId, data.materiSlug, data.subMateriSlug),
      { ...data, updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch (e) {
    console.warn("saveSesi gagal:", e);
  }
}
