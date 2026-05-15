import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { ItemBankEntry } from "@/lib/item-bank";

/**
 * Aturan filter assignment reviewer. Reviewer akan melihat item kalau item
 * cocok dengan SETIDAKNYA SATU filter (OR semantics antar filter).
 *
 * Field opsional — kalau kosong, dianggap "match all" untuk field tersebut.
 *   - jenjang        : SD/SMP/SMA exact match
 *   - kelasMin/Max   : range kelas inklusif
 *   - subKodePrefix  : prefix subMateriKode (e.g. "SMP.7.B1")
 *   - area           : area matematika exact (e.g. "B1", "B3")
 */
export type ReviewerFilter = {
  jenjang?: "SD" | "SMP" | "SMA";
  kelasMin?: number;
  kelasMax?: number;
  subKodePrefix?: string;
  area?: string;
};

export type ReviewerAssignment = {
  uid: string;
  email: string;
  filters: ReviewerFilter[];
  updatedAt?: { seconds: number; nanoseconds: number } | null;
  updatedBy?: string;
};

const COLLECTION = "reviewer_assignments";

export async function getReviewerAssignment(uid: string): Promise<ReviewerAssignment | null> {
  const snap = await getAdminDb().collection(COLLECTION).doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as ReviewerAssignment;
}

export async function listReviewerAssignments(): Promise<ReviewerAssignment[]> {
  const snap = await getAdminDb().collection(COLLECTION).get();
  return snap.docs.map((d) => d.data() as ReviewerAssignment);
}

export async function setReviewerAssignment(
  uid: string,
  email: string,
  filters: ReviewerFilter[],
  updatedBy: string,
): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(uid).set({
    uid,
    email,
    filters,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy,
  });
}

export async function deleteReviewerAssignment(uid: string): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(uid).delete();
}

/** Cek apakah item match dengan SETIDAKNYA SATU filter (OR semantics). */
export function itemMatchesAssignment(item: ItemBankEntry, filters: ReviewerFilter[]): boolean {
  if (!filters || filters.length === 0) return false;
  return filters.some((f) => filterMatchesItem(item, f));
}

function filterMatchesItem(item: ItemBankEntry, f: ReviewerFilter): boolean {
  if (f.jenjang && item.jenjang !== f.jenjang) return false;
  if (typeof f.kelasMin === "number" && item.kelas < f.kelasMin) return false;
  if (typeof f.kelasMax === "number" && item.kelas > f.kelasMax) return false;
  if (f.subKodePrefix && !(item.subMateriKode ?? "").startsWith(f.subKodePrefix)) return false;
  if (f.area && item.area !== f.area) return false;
  return true;
}
