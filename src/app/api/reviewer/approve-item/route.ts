import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrAssignedReviewer } from "@/lib/reviewer-server";
import { loadItem } from "@/lib/item-bank";
import { approveItem, undoApproveItem, getItemReview } from "@/lib/item-reviews";

export const runtime = "nodejs";

/**
 * POST /api/reviewer/approve-item
 * Body: { itemId, editedFields?: string[], usedAiTweak?: boolean }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId ?? "").trim();
  if (!itemId) return NextResponse.json({ error: "itemId wajib" }, { status: 400 });

  let user;
  try {
    user = await requireAdminOrAssignedReviewer(req, itemId);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const item = await loadItem(itemId);
  if (!item) return NextResponse.json({ error: `Item ${itemId} tidak ditemukan` }, { status: 404 });

  await approveItem(itemId, {
    subMateriKode: item.subMateriKode,
    jenjang: item.jenjang,
    kelas: item.kelas,
    approvedBy: user.email,
    approvedByUid: user.uid,
    editedFields: Array.isArray(body.editedFields) ? body.editedFields : [],
    usedAiTweak: Boolean(body.usedAiTweak),
  });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/reviewer/approve-item?itemId=... — undo approve (hanya yang approve sendiri / admin). */
export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const itemId = url.searchParams.get("itemId") ?? "";
  if (!itemId) return NextResponse.json({ error: "itemId wajib" }, { status: 400 });

  let user;
  try {
    user = await requireAdminOrAssignedReviewer(req, itemId);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const review = await getItemReview(itemId);
  if (!review) return NextResponse.json({ ok: true, note: "Already not approved" });

  // Only original approver atau admin yang boleh undo
  if (review.approvedByUid !== user.uid && !user.isAdmin) {
    return NextResponse.json({ error: "Hanya pemberi approve atau admin yang boleh undo" }, { status: 403 });
  }
  await undoApproveItem(itemId);
  return NextResponse.json({ ok: true });
}
