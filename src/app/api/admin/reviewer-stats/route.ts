import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { listAllItemReviews } from "@/lib/item-reviews";

export const runtime = "nodejs";

/**
 * GET /api/admin/reviewer-stats
 * Aggregate stats per reviewer: total approved, breakdown jenjang, 7 hari terakhir.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const all = await listAllItemReviews();
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  type Stat = {
    email: string;
    uid: string;
    total: number;
    last7days: number;
    byJenjang: Record<string, number>;
    byEditedFields: { withEdits: number; aiUsed: number };
    lastApprovedAt: number | null;
  };
  const map = new Map<string, Stat>();

  for (const r of all) {
    if (!r.approvedByUid) continue;
    const key = r.approvedByUid;
    let s = map.get(key);
    if (!s) {
      s = {
        email: r.approvedBy,
        uid: r.approvedByUid,
        total: 0,
        last7days: 0,
        byJenjang: {},
        byEditedFields: { withEdits: 0, aiUsed: 0 },
        lastApprovedAt: null,
      };
      map.set(key, s);
    }
    s.total++;
    const tMs = r.approvedAt?.seconds ? r.approvedAt.seconds * 1000 : 0;
    if (tMs && now - tMs < sevenDaysMs) s.last7days++;
    if (tMs > (s.lastApprovedAt ?? 0)) s.lastApprovedAt = tMs;
    s.byJenjang[r.jenjang] = (s.byJenjang[r.jenjang] ?? 0) + 1;
    if (Array.isArray(r.editedFields) && r.editedFields.length > 0) s.byEditedFields.withEdits++;
    if (r.usedAiTweak) s.byEditedFields.aiUsed++;
  }

  const stats = Array.from(map.values()).sort((a, b) => b.total - a.total);
  const totalApproved = all.length;

  return NextResponse.json({ stats, totalApproved });
}
