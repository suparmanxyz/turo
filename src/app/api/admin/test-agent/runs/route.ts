import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { listTestRuns } from "@/lib/test-agent/storage";

export const runtime = "nodejs";

/** GET /api/admin/test-agent/runs — list 50 latest. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const runs = await listTestRuns(50);
  return NextResponse.json({ runs });
}
