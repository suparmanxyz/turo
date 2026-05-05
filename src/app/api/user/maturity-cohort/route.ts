import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import type { UserProfileDoc, MaturitySnapshot } from "@/lib/firestore-schema";

export const runtime = "nodejs";

/**
 * GET ?jenjang=sd&kelas=6 — return aggregate Maturity stats untuk cohort
 * (siswa dengan jenjang+kelas sama).
 *
 * Privacy: NO individual data exposed — hanya aggregate (mean, percentile, count).
 *
 * Cache 1 jam in-memory (cohort stats tidak berubah cepat).
 */

type CohortStats = {
  cohortKey: string;
  cohortSize: number;
  totalSnapshots: number;
  /** Per dimensi: mean, p25, median, p75 dari semua latest snapshots cohort. */
  dimensions: Record<string, { mean: number; p25: number; median: number; p75: number }>;
  /** Mean overall. */
  overallMean: number;
  /** Distribusi level (count per level). */
  levelDistribution: Record<string, number>;
  cachedAt: number;
};

const CACHE = new Map<string, CohortStats>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function cohortKey(jenjang: string, kelas: number): string {
  return `${jenjang.toLowerCase()}-K${kelas}`;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor((sorted.length - 1) * (p / 100));
  return sorted[idx];
}

async function computeCohort(jenjang: string, kelas: number): Promise<CohortStats> {
  const key = cohortKey(jenjang, kelas);
  const now = Date.now();
  const cached = CACHE.get(key);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) return cached;

  const snap = await getAdminDb()
    .collection("user_profile")
    .where("jenjang", "==", jenjang.toLowerCase())
    .where("kelas", "==", kelas)
    .get();

  const profiles = snap.docs.map((d) => d.data() as UserProfileDoc);
  const latestSnapshots: MaturitySnapshot[] = [];
  for (const p of profiles) {
    const history = p.maturityHistory ?? [];
    if (history.length > 0) {
      // Take last (most recent) snapshot per user
      const latest = [...history].sort((a, b) => b.timestamp - a.timestamp)[0];
      latestSnapshots.push(latest);
    }
  }

  const dimKeys = ["abstract_reasoning", "problem_solving", "communication", "persistence", "confidence"];
  const dimensions: CohortStats["dimensions"] = {};
  for (const dim of dimKeys) {
    const values = latestSnapshots.map((s) => s.dimensionsScores?.[dim] ?? 0).filter((v) => v > 0).sort((a, b) => a - b);
    if (values.length === 0) {
      dimensions[dim] = { mean: 0, p25: 0, median: 0, p75: 0 };
      continue;
    }
    const mean = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    dimensions[dim] = {
      mean,
      p25: percentile(values, 25),
      median: percentile(values, 50),
      p75: percentile(values, 75),
    };
  }

  const overalls = latestSnapshots.map((s) => s.overall).filter((v) => v > 0);
  const overallMean = overalls.length > 0 ? Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length) : 0;

  const levelDistribution: Record<string, number> = {
    MASTERY: 0, PROFICIENT: 0, DEVELOPING: 0, EMERGING: 0, BEGINNING: 0,
  };
  for (const s of latestSnapshots) {
    levelDistribution[s.level] = (levelDistribution[s.level] ?? 0) + 1;
  }

  const stats: CohortStats = {
    cohortKey: key,
    cohortSize: latestSnapshots.length,
    totalSnapshots: profiles.reduce((sum, p) => sum + (p.maturityHistory?.length ?? 0), 0),
    dimensions,
    overallMean,
    levelDistribution,
    cachedAt: now,
  };
  CACHE.set(key, stats);
  return stats;
}

export async function GET(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Auth wajib" }, { status: 401 });
  try {
    await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const url = new URL(req.url);
  const jenjang = url.searchParams.get("jenjang");
  const kelasStr = url.searchParams.get("kelas");
  if (!jenjang || !kelasStr) {
    return NextResponse.json({ error: "Query param jenjang + kelas wajib" }, { status: 400 });
  }
  const kelas = parseInt(kelasStr, 10);
  if (isNaN(kelas) || kelas < 1 || kelas > 12) {
    return NextResponse.json({ error: "kelas harus 1-12" }, { status: 400 });
  }

  const stats = await computeCohort(jenjang, kelas);

  // Privacy threshold: kalau cohort < 3 user, return placeholder (jangan expose data terlalu kecil)
  if (stats.cohortSize < 3) {
    return NextResponse.json({
      cohortSize: stats.cohortSize,
      cohortKey: stats.cohortKey,
      message: "Cohort terlalu kecil untuk comparative analytics. Butuh minimum 3 user.",
    });
  }

  return NextResponse.json(stats);
}
