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

  // Strategy: fetch ALL items (cache friendly, ~5K items × ~1KB = 5MB), filter +
  // paginate in-memory. Avoid Firestore composite index requirement untuk
  // orderBy + multiple filter combinations.
  const snap = await db.collection("item_bank").select("id", "subMateriKode", "jenjang", "kelas", "area", "b", "konten", "meta").get();
  let allItems = snap.docs.map((d) => d.data() as ItemBankEntry);

  // Apply filters
  if (jenjangFilter) allItems = allItems.filter((it) => it.jenjang === jenjangFilter);
  if (kelasFilter) allItems = allItems.filter((it) => it.kelas === Number(kelasFilter));
  if (hasSvgFilter === "yes") allItems = allItems.filter((it) => it.konten?.svg && it.konten.svg.trim().length > 0);
  else if (hasSvgFilter === "no") allItems = allItems.filter((it) => !it.konten?.svg || it.konten.svg.trim().length === 0);

  // Sort by subMateriKode untuk consistent pagination
  allItems.sort((a, b) => (a.subMateriKode || "").localeCompare(b.subMateriKode || ""));

  const totalAll = allItems.length;
  const offset = (page - 1) * limit;
  const items = allItems.slice(offset, offset + limit);

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
