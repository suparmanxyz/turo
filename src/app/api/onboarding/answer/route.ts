import { NextRequest, NextResponse } from "next/server";
import { submitAnswer, buildResult, computeMaturityProfile, type OnboardingState } from "@/lib/onboarding-orchestrator";
import {
  appendResponse,
  updateDiagnosticSession,
  upsertUserProfile,
  batchUpsertMastery,
  appendMaturityHistory,
} from "@/lib/firestore-schema";
import { loadItem, incrementCalibration } from "@/lib/item-bank";
import { bumpItemAggregate } from "@/lib/firestore-schema";
import { getAdminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Auth token wajib" }, { status: 401 });
  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId, state, itemId, pilihIdx, responseTimeMs } = body as {
    sessionId: string;
    state: OnboardingState;
    itemId: string;
    pilihIdx: number;
    responseTimeMs: number;
  };
  if (!sessionId || !state || !itemId || pilihIdx === undefined) {
    return NextResponse.json({ error: "Field wajib hilang" }, { status: 400 });
  }

  // Load item, validate jawaban server-side (jangan trust client)
  const item = await loadItem(itemId);
  if (!item) return NextResponse.json({ error: `Item ${itemId} tidak ditemukan` }, { status: 404 });
  const correct = pilihIdx === item.konten.kunci;

  // Persist response ke Firestore (subcollection responses)
  await appendResponse(sessionId, {
    itemId,
    subMateriKode: item.subMateriKode,
    area: item.area,
    stage: state.stage === "locator"
      ? "fast-locator"
      : state.stage === "coverage"
        ? "fast-coverage"
        : state.stage === "drilling"
          ? "drilling"
          : "deep",
    correct,
    pilihIdx,
    responseTimeMs: responseTimeMs ?? 0,
  });

  // Update aggregate item-bank stats (non-blocking)
  void incrementCalibration(itemId);
  void bumpItemAggregate(itemId, /* approx theta */ 0, correct, responseTimeMs ?? 0);

  // Advance state machine
  const step = await submitAnswer(state, itemId, correct, responseTimeMs);

  // Kalau selesai → finalize: update session, save mastery, compute maturity, update user profile
  if (step.done) {
    const result = buildResult(step.state);
    // Compute Mathematical Maturity (async — fetch items + analyze behavioral data)
    const userConfidenceRating = body.userConfidenceRating as number | undefined;
    const maturity = await computeMaturityProfile(step.state, userConfidenceRating);
    await updateDiagnosticSession(sessionId, {
      stage: "selesai",
      thetaGlobal: result.thetaGlobal,
      kelasEstimasi: result.kelasEstimasi,
      finishedAt: Date.now(),
      hasilLocator: result.hasilLocator
        ? {
            theta: result.hasilLocator.theta,
            se: result.hasilLocator.se,
            kelasEstimasi: result.hasilLocator.kelasEstimasi,
            itemsUsed: result.hasilLocator.itemsUsed,
          }
        : undefined,
      hasilCoverage: result.hasilCoverage
        ? {
            thetaGlobal: result.hasilCoverage.thetaGlobal,
            seGlobal: result.hasilCoverage.seGlobal,
            itemsUsed: result.hasilCoverage.itemsUsed,
            perArea: result.hasilCoverage.perArea.map((p) => ({
              area: p.area,
              theta: p.theta,
              se: p.se,
              status: p.status,
              itemsAnswered: p.itemsAnswered,
              itemsCorrect: p.itemsCorrect,
              accuracy: p.accuracy,
            })),
            areaSuspect: result.hasilCoverage.areaSuspect,
            clusterScores: result.hasilCoverage.clusterScores,
            pathRoute: result.hasilCoverage.pathRoute,
          }
        : undefined,
      hasilDeep: result.hasilDeep
        ? {
            itemsUsed: result.hasilDeep.itemsUsed,
            masteryCount: countByStatus(result.hasilDeep.mastery),
            remediasiKodes: result.hasilDeep.remediasi.map((m) => m.kode),
          }
        : undefined,
      hasilDrilling: result.hasilDrilling
        ? {
            path: result.hasilDrilling.path,
            totalSteps: result.hasilDrilling.totalSteps,
            stepsPassed: result.hasilDrilling.stepsPassed,
            stepsWeak: result.hasilDrilling.stepsWeak,
            stepsSkipped: result.hasilDrilling.stepsSkipped,
            itemsTotal: result.hasilDrilling.itemsTotal,
            itemsAnswered: result.hasilDrilling.itemsAnswered,
            overallAccuracy: result.hasilDrilling.overallAccuracy,
            weakKodes: result.hasilDrilling.weakKodes,
            recommendation: result.hasilDrilling.recommendation,
            steps: result.hasilDrilling.steps.map((s) => ({
              kind: s.kind,
              label: s.label,
              status: s.status,
              accuracy: s.accuracy,
              passThreshold: s.passThreshold,
              itemsAnswered: s.itemsAnswered,
              itemsTotal: s.itemsTotal,
              targetKodes: s.targetKodes,
            })),
          }
        : undefined,
      hasilMaturity: maturity
        ? {
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
          }
        : undefined,
    });

    if (result.hasilDeep) {
      await batchUpsertMastery(uid, result.hasilDeep.mastery);
    }
    await upsertUserProfile(uid, {
      thetaGlobal: result.thetaGlobal,
      kelasEstimasi: result.kelasEstimasi,
      onboardingStatus: result.hasilDeep ? "deep-done" : "fast-done",
    });

    // Append Maturity snapshot ke history user (untuk trend tracking)
    if (maturity) {
      const dimensionsScores: Record<string, number> = {};
      for (const d of maturity.dimensions) dimensionsScores[d.dimension] = d.overall;
      await appendMaturityHistory(uid, {
        timestamp: Date.now(),
        sessionId,
        overall: maturity.overall,
        level: maturity.level,
        dimensionsScores,
        totalItems: maturity.totalItems,
        kelasAtSession: step.state.kelas,
      });
    }
  }

  return NextResponse.json({
    state: step.state,
    nextItem: step.nextItem ? sanitize(step.nextItem) : null,
    correct,
    done: step.done,
    progress: step.progress,
  });
}

function sanitize(item: { id: string; subMateriKode: string; konten: { pertanyaan: string; opsi: { teks: string; benar: boolean; alasan?: string }[]; svg?: string } }) {
  return {
    id: item.id,
    subMateriKode: item.subMateriKode,
    pertanyaan: item.konten.pertanyaan,
    opsi: item.konten.opsi.map((o) => ({ teks: o.teks })),
    svg: item.konten.svg,
  };
}

function countByStatus(mastery: { status: "siap" | "review" | "remediasi" | "unknown" }[]) {
  const out = { siap: 0, review: 0, remediasi: 0, unknown: 0 };
  for (const m of mastery) out[m.status]++;
  return out;
}
