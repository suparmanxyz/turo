import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { finishCekKesiapanBab } from "@/lib/cek-kesiapan";
import { loadItem, incrementCalibration } from "@/lib/item-bank";
import { batchUpsertMastery, bumpItemAggregate } from "@/lib/firestore-schema";
import type { SubMateriMastery } from "@/types";

export const runtime = "nodejs";

type AnswerInput = {
  itemId: string;
  blindSpotKode: string;
  pilihIdx: number;
  responseTimeMs?: number;
};

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!auth) return NextResponse.json({ error: "Auth wajib" }, { status: 401 });
  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(auth);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const body = await req.json();
  const materiSlug = String(body.materiSlug ?? "").trim();
  const answers = (body.answers as AnswerInput[]) ?? [];
  if (!materiSlug || !Array.isArray(answers)) {
    return NextResponse.json({ error: "materiSlug + answers[] wajib" }, { status: 400 });
  }

  // Validate jawaban server-side
  const responses: { blindSpotKode: string; itemId: string; correct: boolean; responseTimeMs: number }[] = [];
  for (const a of answers) {
    const item = await loadItem(a.itemId);
    if (!item) continue;
    const correct = a.pilihIdx === item.konten.kunci;
    responses.push({
      blindSpotKode: a.blindSpotKode,
      itemId: a.itemId,
      correct,
      responseTimeMs: a.responseTimeMs ?? 0,
    });
    void incrementCalibration(a.itemId);
    void bumpItemAggregate(a.itemId, 0, correct, a.responseTimeMs ?? 0);
  }

  // Update mastery per blind-spot kode
  const masteryUpdates: SubMateriMastery[] = [];
  const byKode = new Map<string, { correct: number; total: number }>();
  for (const r of responses) {
    const cur = byKode.get(r.blindSpotKode) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (r.correct) cur.correct += 1;
    byKode.set(r.blindSpotKode, cur);
  }
  for (const [kode, agg] of byKode.entries()) {
    const acc = agg.correct / agg.total;
    masteryUpdates.push({
      kode,
      status: acc >= 0.5 ? "siap" : "remediasi",
      confidence: 0.6,
      lastAssessedAt: Date.now(),
      source: "cek_kesiapan",
    });
  }
  if (masteryUpdates.length > 0) {
    await batchUpsertMastery(uid, masteryUpdates);
  }

  const decision = finishCekKesiapanBab(materiSlug, responses);
  return NextResponse.json({ decision, masteryUpdated: masteryUpdates.length });
}
