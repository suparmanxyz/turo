import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { executeTestRun, type RunOptions } from "@/lib/test-agent/runner";
import { cleanupOldRuns } from "@/lib/test-agent/storage";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel: max 300s untuk Pro plan

/**
 * POST /api/admin/test-agent/run
 * Body: { personaKey, jenjangOverride?, kelasOverride?, jalurOverride? }
 *
 * Eksekusi sync — return runId setelah selesai (atau gagal).
 * Frontend polling /runs/[id] kalau mau live progress, tapi sederhananya
 * tunggu response selesai (~30-60 detik per run).
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await req.json();
  const personaKey = body.personaKey as string;
  if (!personaKey) {
    return NextResponse.json({ error: "personaKey wajib" }, { status: 400 });
  }

  // Base URL untuk call API internally — pakai header host kalau dev
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  const opts: RunOptions = {
    personaKey,
    baseUrl,
    jenjangOverride: body.jenjangOverride,
    kelasOverride: body.kelasOverride,
    jalurOverride: body.jalurOverride,
  };

  try {
    const runId = await executeTestRun(opts);
    // Auto-cleanup keep 50 latest (best effort)
    cleanupOldRuns().catch((e) => console.warn("cleanup failed:", e));
    return NextResponse.json({ runId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
