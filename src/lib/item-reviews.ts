import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * `item_reviews/{itemId}` — status approval per item. Satu doc per item.
 * Kalau doc ada = sudah di-approve. Kalau tidak ada = belum direview.
 */
export type ItemReview = {
  itemId: string;
  subMateriKode: string;
  jenjang: string;
  kelas: number;
  approvedBy: string;        // reviewer email
  approvedByUid: string;
  approvedAt: { seconds: number; nanoseconds: number } | null;
  editedFields: string[];    // ["pertanyaan", "opsi.0.teks", "svg", ...]
  usedAiTweak: boolean;
};

const COLLECTION = "item_reviews";

export async function getItemReview(itemId: string): Promise<ItemReview | null> {
  const snap = await getAdminDb().collection(COLLECTION).doc(itemId).get();
  if (!snap.exists) return null;
  return snap.data() as ItemReview;
}

/** Batch fetch — single Firestore round-trip. */
export async function getItemReviewsForIds(itemIds: string[]): Promise<Map<string, ItemReview>> {
  const result = new Map<string, ItemReview>();
  if (itemIds.length === 0) return result;
  const db = getAdminDb();
  // Firestore `in` cap 30 per query — chunk batch
  const chunks: string[][] = [];
  for (let i = 0; i < itemIds.length; i += 30) chunks.push(itemIds.slice(i, i + 30));
  await Promise.all(
    chunks.map(async (chunk) => {
      const snaps = await db.getAll(...chunk.map((id) => db.collection(COLLECTION).doc(id)));
      for (const s of snaps) {
        if (s.exists) {
          const data = s.data() as ItemReview;
          result.set(s.id, data);
        }
      }
    }),
  );
  return result;
}

export async function approveItem(
  itemId: string,
  data: {
    subMateriKode: string;
    jenjang: string;
    kelas: number;
    approvedBy: string;
    approvedByUid: string;
    editedFields: string[];
    usedAiTweak: boolean;
  },
): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(itemId).set({
    itemId,
    ...data,
    approvedAt: FieldValue.serverTimestamp(),
  });
}

export async function undoApproveItem(itemId: string): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(itemId).delete();
}

/** Untuk dashboard stats. */
export async function listAllItemReviews(): Promise<ItemReview[]> {
  const snap = await getAdminDb().collection(COLLECTION).get();
  return snap.docs.map((d) => d.data() as ItemReview);
}
