import { NextRequest, NextResponse } from "next/server";
import { requireReviewer } from "@/lib/admin-server";
import { isAdminEmail } from "@/lib/admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { getReviewerAssignment, itemMatchesAssignment } from "@/lib/reviewer-assignment";
import { getItemReviewsForIds } from "@/lib/item-reviews";
import type { ItemBankEntry } from "@/lib/item-bank";

export const runtime = "nodejs";

/**
 * GET /api/reviewer/items-paginated?page=1&limit=50&hasSvg=&status=pending|mine|all
 *
 * Untuk reviewer (atau admin). Filter:
 *   - Cuma item dalam assignment reviewer
 *   - status=pending (default): belum approved
 *   - status=mine: approved by current user
 *   - status=all: termasuk yang sudah approved by anyone
 */
export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireReviewer(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const userIsAdmin = isAdminEmail(user.email);

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const hasSvgFilter = url.searchParams.get("hasSvg");
  const status = (url.searchParams.get("status") ?? "pending") as "pending" | "mine" | "all";

  // Assignment policy:
  //   - Admin: default lihat semua (?adminScope=assigned untuk batasi ke assignment-nya)
  //   - Reviewer: harus punya assignment, kalau tidak return empty + message
  const assignment = await getReviewerAssignment(user.uid);
  const adminScopeAssigned = userIsAdmin && url.searchParams.get("adminScope") === "assigned";

  if (!userIsAdmin && (!assignment || assignment.filters.length === 0)) {
    return NextResponse.json({
      items: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
      message: "Belum ada assignment. Hubungi admin untuk set filter di /admin/assign-reviewer.",
    });
  }

  // Fetch all items, filter in-memory
  const db = getAdminDb();
  const snap = await db.collection("item_bank").select("id", "subMateriKode", "jenjang", "kelas", "area", "b", "konten", "meta").get();
  let allItems = snap.docs.map((d) => d.data() as ItemBankEntry);

  // Assignment filter (reviewer always; admin only kalau adminScope=assigned)
  const shouldApplyAssignment = !userIsAdmin || adminScopeAssigned;
  if (shouldApplyAssignment && assignment && assignment.filters.length > 0) {
    allItems = allItems.filter((it) => itemMatchesAssignment(it, assignment.filters));
  }
  if (hasSvgFilter === "yes") allItems = allItems.filter((it) => it.konten?.svg && it.konten.svg.trim().length > 0);
  else if (hasSvgFilter === "no") allItems = allItems.filter((it) => !it.konten?.svg || it.konten.svg.trim().length === 0);

  allItems.sort((a, b) => (a.subMateriKode || "").localeCompare(b.subMateriKode || ""));

  // Status filter — need review docs to know
  const allIds = allItems.map((it) => it.id);
  const reviewMap = await getItemReviewsForIds(allIds);

  if (status === "pending") {
    allItems = allItems.filter((it) => !reviewMap.has(it.id));
  } else if (status === "mine") {
    allItems = allItems.filter((it) => reviewMap.get(it.id)?.approvedByUid === user.uid);
  }
  // "all" → no filter

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
      review: reviewMap.get(it.id) ? {
        approvedBy: reviewMap.get(it.id)!.approvedBy,
        approvedByUid: reviewMap.get(it.id)!.approvedByUid,
        approvedAt: reviewMap.get(it.id)!.approvedAt,
        isMine: reviewMap.get(it.id)!.approvedByUid === user.uid,
      } : null,
    })),
    pagination: {
      page,
      limit,
      total: totalAll,
      totalPages: Math.ceil(totalAll / limit),
    },
    user: { uid: user.uid, email: user.email, isAdmin: userIsAdmin },
  });
}
