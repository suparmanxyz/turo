import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { getAdminDb } from "@/lib/firebase-admin";
import type { DiagnosticSessionDoc } from "@/lib/firestore-schema";

export const runtime = "nodejs";

/**
 * GET /api/admin/diagnostic-sessions?limit=50
 * List semua diagnostic_session dari semua user, sorted by startedAt desc.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit")) || 50));
  const stage = url.searchParams.get("stage"); // optional filter

  let q = getAdminDb().collection("diagnostic_session").orderBy("startedAt", "desc").limit(limit);
  if (stage) q = q.where("stage", "==", stage) as typeof q;

  const snap = await q.get();
  const sessions = snap.docs.map((d) => d.data() as DiagnosticSessionDoc);

  // Resolve user emails (best-effort) — limit to unique uids
  const uniqueUids = Array.from(new Set(sessions.map((s) => s.uid)));
  const userMap = new Map<string, string>();
  // Pakai admin Auth API kalau perlu; untuk MVP cukup return uid mentah
  for (const uid of uniqueUids) userMap.set(uid, uid);

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      uid: s.uid,
      jalur: s.jalur,
      stage: s.stage,
      thetaGlobal: s.thetaGlobal,
      kelasEstimasi: s.kelasEstimasi,
      itemsAnswered: s.itemsAnswered,
      itemsSkipped: s.itemsSkipped,
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
    })),
  });
}
