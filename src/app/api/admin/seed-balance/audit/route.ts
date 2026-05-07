import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { auditBalanceGap } from "@/lib/admin-seed-balance";

export const runtime = "nodejs";

/** GET /api/admin/seed-balance/audit — return gap priority list. */
export async function GET(req: NextRequest) {
  try { await requireAdmin(req); } catch (e) { if (e instanceof Response) return e; throw e; }
  const data = await auditBalanceGap();
  return NextResponse.json(data);
}
