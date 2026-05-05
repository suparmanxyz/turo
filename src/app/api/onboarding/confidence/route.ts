import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { getDiagnosticSession, updateDiagnosticSession, listResponses, appendMaturityHistory } from "@/lib/firestore-schema";
import { loadItem } from "@/lib/item-bank";
import { computeMaturity, type BehavioralResponse } from "@/lib/mathematical-maturity";

export const runtime = "nodejs";

/**
 * POST { sessionId, rating } — receive user confidence rating (1-5),
 * recompute Maturity dengan rating tsb, persist updated maturity.
 */
export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Auth wajib" }, { status: 401 });
  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const body = await req.json();
  const sessionId = String(body.sessionId ?? "");
  const rating = Number(body.rating);
  if (!sessionId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "sessionId + rating (1-5) wajib" }, { status: 400 });
  }

  const session = await getDiagnosticSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 404 });
  if (session.uid !== uid) return NextResponse.json({ error: "Bukan session kamu" }, { status: 403 });

  // Re-fetch responses, items, recompute maturity
  const responses = await listResponses(sessionId);
  const itemIds = [...new Set(responses.map((r) => r.itemId))];
  const items = (await Promise.all(itemIds.map((id) => loadItem(id)))).filter(
    (it): it is NonNullable<typeof it> => it !== null,
  );
  const behavioral: BehavioralResponse[] = responses.map((r) => ({
    itemId: r.itemId,
    correct: r.correct,
    responseTimeMs: r.responseTimeMs,
  }));

  const maturity = computeMaturity(behavioral, items, rating);

  await updateDiagnosticSession(sessionId, {
    hasilMaturity: {
      overall: maturity.overall,
      level: maturity.level,
      dimensions: maturity.dimensions.map((d) => ({
        dimension: d.dimension,
        weight: d.weight,
        overall: d.overall,
        level: d.level,
        subScores: d.subScores.map((s) => ({
          subDimension: s.subDimension,
          score: s.score,
          level: s.level,
          itemsContributing: s.itemsContributing,
          interpretation: s.interpretation,
          recommendation: s.recommendation,
        })),
      })),
      strengths: maturity.strengths.map((s) => ({ subDimension: s.subDimension, score: s.score, level: s.level })),
      priorityAreas: maturity.priorityAreas.map((s) => ({ subDimension: s.subDimension, score: s.score, level: s.level })),
      userConfidenceRating: maturity.userConfidenceRating,
      totalItems: maturity.totalItems,
    },
  });

  // Update history snapshot dengan rating user (replace existing entry by sessionId)
  const dimensionsScores: Record<string, number> = {};
  for (const d of maturity.dimensions) dimensionsScores[d.dimension] = d.overall;
  await appendMaturityHistory(uid, {
    timestamp: Date.now(),
    sessionId,
    overall: maturity.overall,
    level: maturity.level,
    dimensionsScores,
    totalItems: maturity.totalItems,
  });

  return NextResponse.json({ ok: true, overall: maturity.overall, level: maturity.level });
}
