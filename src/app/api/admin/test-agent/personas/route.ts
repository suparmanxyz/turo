import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { PERSONAS } from "@/lib/test-agent/personas";

export const runtime = "nodejs";

/** GET /api/admin/test-agent/personas — daftar persona untuk form trigger. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const personas = PERSONAS.map((p) => ({
    key: p.key,
    label: p.label,
    description: p.description,
    jenjang: p.jenjang,
    kelas: p.kelas,
    jalur: p.jalur,
  }));
  return NextResponse.json({ personas });
}
