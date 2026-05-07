import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { seedSubsBalance } from "@/lib/admin-seed-balance";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel Pro 5 min

const Body = z.object({
  kodes: z.array(z.string()).min(1).max(5),
});

/**
 * POST /api/admin/seed-balance/run
 * Body: { kodes: string[] } — max 5 sub kodes per call.
 * Process sequentially supaya tidak timeout + tidak overload Firestore.
 */
export async function POST(req: NextRequest) {
  try { await requireAdmin(req); } catch (e) { if (e instanceof Response) return e; throw e; }

  const body = await req.json();
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Schema invalid (max 5 kodes)", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await seedSubsBalance(parsed.data.kodes);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
