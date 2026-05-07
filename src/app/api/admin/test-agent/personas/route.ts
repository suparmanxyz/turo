import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { PERSONAS } from "@/lib/test-agent/personas";

export const runtime = "nodejs";

/**
 * GET /api/admin/test-agent/personas — daftar persona untuk form trigger.
 *
 * Default: hanya persona realistic (16 persona). Stress test (always_correct,
 * always_wrong, random_50) hidden by default karena tidak realistis di dunia
 * nyata + bikin audit hasil membingungkan.
 *
 * Query: ?showStressTests=true → include stress test persona juga.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const url = new URL(req.url);
  const showStressTests = url.searchParams.get("showStressTests") === "true";

  const filtered = showStressTests
    ? PERSONAS
    : PERSONAS.filter((p) => (p.category ?? "realistic") !== "stress_test");

  const personas = filtered.map((p) => ({
    key: p.key,
    label: p.label,
    description: p.description,
    jenjang: p.jenjang,
    kelas: p.kelas,
    jalur: p.jalur,
    category: p.category ?? "realistic",
  }));
  return NextResponse.json({ personas });
}
