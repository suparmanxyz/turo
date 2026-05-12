import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { getAdminDb } from "@/lib/firebase-admin";
import type { ItemBankEntry } from "@/lib/item-bank";

export const runtime = "nodejs";

/**
 * GET /api/admin/items-paginated?page=1&limit=50&jenjang=&kelas=&hasSvg=
 * Paginated list of items untuk admin review.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const jenjangFilter = url.searchParams.get("jenjang");
  const kelasFilter = url.searchParams.get("kelas");
  const hasSvgFilter = url.searchParams.get("hasSvg"); // "yes" | "no" | null

  const db = getAdminDb();
  let query: FirebaseFirestore.Query = db.collection("item_bank");

  if (jenjangFilter) query = query.where("jenjang", "==", jenjangFilter);
  if (kelasFilter) query = query.where("kelas", "==", Number(kelasFilter));

  // Sort by subMateriKode + createdAt untuk consistent pagination
  query = query.orderBy("subMateriKode").orderBy("createdAt");

  // Count total (efficient via aggregation)
  const countSnap = await query.count().get();
  const totalAll = countSnap.data().count;

  // Pagination via offset (acceptable untuk admin tool, items <5000)
  const offset = (page - 1) * limit;
  const snap = await query.offset(offset).limit(limit).get();
  let items = snap.docs.map((d) => d.data() as ItemBankEntry);

  // Filter hasSvg (client-side karena Firestore tidak support null check di nested)
  if (hasSvgFilter === "yes") {
    items = items.filter((it) => it.konten?.svg && it.konten.svg.trim().length > 0);
  } else if (hasSvgFilter === "no") {
    items = items.filter((it) => !it.konten?.svg || it.konten.svg.trim().length === 0);
  }

  return NextResponse.json({
    items: items.map((it) => ({
      id: it.id,
      subMateriKode: it.subMateriKode,
      jenjang: it.jenjang,
      kelas: it.kelas,
      area: it.area,
      b: it.b,
      konten: it.konten,
      meta: it.meta,
      createdAt: it.createdAt,
    })),
    pagination: {
      page,
      limit,
      total: totalAll,
      totalPages: Math.ceil(totalAll / limit),
    },
  });
}
