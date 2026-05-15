import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireReviewer, requireAdmin } from "@/lib/admin-server";
import { isAdminEmail } from "@/lib/admin";
import { getReviewerAssignment, itemMatchesAssignment } from "@/lib/reviewer-assignment";
import { loadItem } from "@/lib/item-bank";

/**
 * Verifikasi user adalah admin ATAU reviewer yang punya akses ke item tertentu
 * (via assignment filter match). Throws Response 401/403/404.
 *
 * Used oleh shared endpoint yang dipanggil dari admin DAN reviewer UI
 * (update-item, fix-visual).
 */
export async function requireAdminOrAssignedReviewer(
  req: NextRequest,
  itemId: string,
): Promise<{ uid: string; email: string; isAdmin: boolean }> {
  const user = await requireReviewer(req); // baik admin maupun reviewer lolos
  if (isAdminEmail(user.email)) return { ...user, isAdmin: true };

  // Reviewer: cek assignment
  const item = await loadItem(itemId);
  if (!item) {
    throw new Response(JSON.stringify({ error: `Item ${itemId} tidak ditemukan` }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const assignment = await getReviewerAssignment(user.uid);
  if (!assignment || !itemMatchesAssignment(item, assignment.filters)) {
    throw new Response(JSON.stringify({ error: "Item ini tidak dalam assignment Anda" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { ...user, isAdmin: false };
}

/** Re-export untuk convenience. */
export { requireReviewer, requireAdmin };
