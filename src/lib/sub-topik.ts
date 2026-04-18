import { getAdminDb } from "@/lib/firebase-admin";

export type SubTopikAi = {
  slug: string;
  nama: string;
  ringkasan: string;
};

/** Server-side: lookup sub-topik dari Firestore cache by materiSlug. */
export async function loadSubTopikCache(materiSlug: string): Promise<SubTopikAi[] | null> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("subTopikCache").doc(materiSlug).get();
    if (!snap.exists) return null;
    const data = snap.data() as { subTopik?: SubTopikAi[] };
    return data?.subTopik ?? null;
  } catch (e) {
    console.warn("loadSubTopikCache gagal:", e);
    return null;
  }
}

/** Cari sub-topik by slug di cache. */
export async function cariSubTopikDariCache(
  materiSlug: string,
  subSlug: string,
): Promise<SubTopikAi | null> {
  const list = await loadSubTopikCache(materiSlug);
  return list?.find((s) => s.slug === subSlug) ?? null;
}

/** Save edited sub-topik (admin only). */
export async function saveSubTopikCache(
  materiSlug: string,
  subTopik: SubTopikAi[],
  metadata: { materiNama: string; kategoriUtama: string; jenjang?: string; kelas?: number },
): Promise<void> {
  const db = getAdminDb();
  await db.collection("subTopikCache").doc(materiSlug).set({
    subTopik,
    materiNama: metadata.materiNama,
    kategoriUtama: metadata.kategoriUtama,
    jenjang: metadata.jenjang ?? null,
    kelas: metadata.kelas ?? null,
    createdAt: Date.now(),
    editedByAdmin: true,
  });
}
