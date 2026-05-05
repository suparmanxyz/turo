import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import type { ItemBankEntry } from "@/lib/item-bank";

export const runtime = "nodejs";

/**
 * GET — audit item bank metadata coverage.
 * Return per-field counts + per-jenjang breakdown untuk decide batch enrichment strategy.
 */
export async function GET(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Auth wajib" }, { status: 401 });
  try {
    await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const snap = await getAdminDb().collection("item_bank").get();
  const items: ItemBankEntry[] = snap.docs.map((d) => d.data() as ItemBankEntry);
  const total = items.length;

  const fieldCounts = {
    difficultyLabel: 0,
    microskill: 0,
    multiStep: 0,
    analyticalSteps: 0,
    reasoningQualityRequired: 0,
    requiresManipulation: 0,
    abstractQuestion: 0,
    readingHeavy: 0,
    strongDistractor: 0,
    expectedResponseTimeSec: 0,
    questionCondition: 0,
    intuitiveLeap: 0,
    subConcept: 0,
    patternType: 0,
    transferType: 0,
    scorePerOption: 0,
  };

  const perJenjang: Record<string, { total: number; withMeta: number }> = {
    SD: { total: 0, withMeta: 0 },
    SMP: { total: 0, withMeta: 0 },
    SMA: { total: 0, withMeta: 0 },
  };

  let withAnyMeta = 0;
  let fullyTagged = 0;
  const requiredFields = ["difficultyLabel", "microskill", "multiStep", "reasoningQualityRequired"];

  for (const it of items) {
    const meta = it.meta;
    if (!meta) {
      perJenjang[it.jenjang] = perJenjang[it.jenjang] ?? { total: 0, withMeta: 0 };
      perJenjang[it.jenjang].total++;
      continue;
    }
    if (meta.difficultyLabel) fieldCounts.difficultyLabel++;
    if (meta.microskill) fieldCounts.microskill++;
    if (meta.multiStep !== undefined) fieldCounts.multiStep++;
    if (meta.analyticalSteps !== undefined) fieldCounts.analyticalSteps++;
    if (meta.reasoningQualityRequired !== undefined) fieldCounts.reasoningQualityRequired++;
    if (meta.requiresManipulation !== undefined) fieldCounts.requiresManipulation++;
    if (meta.abstractQuestion !== undefined) fieldCounts.abstractQuestion++;
    if (meta.readingHeavy !== undefined) fieldCounts.readingHeavy++;
    if (meta.strongDistractor !== undefined) fieldCounts.strongDistractor++;
    if (meta.expectedResponseTimeSec) fieldCounts.expectedResponseTimeSec++;
    if (meta.questionCondition !== undefined) fieldCounts.questionCondition++;
    if (meta.intuitiveLeap !== undefined) fieldCounts.intuitiveLeap++;
    if (meta.subConcept) fieldCounts.subConcept++;
    if (meta.patternType) fieldCounts.patternType++;
    if (meta.transferType) fieldCounts.transferType++;
    if (meta.scorePerOption) fieldCounts.scorePerOption++;

    withAnyMeta++;
    const hasAllRequired = requiredFields.every((f) => {
      const v = (meta as Record<string, unknown>)[f];
      return v !== undefined && v !== null && v !== "";
    });
    if (hasAllRequired) fullyTagged++;

    perJenjang[it.jenjang] = perJenjang[it.jenjang] ?? { total: 0, withMeta: 0 };
    perJenjang[it.jenjang].total++;
    if (hasAllRequired) perJenjang[it.jenjang].withMeta++;
  }

  // Sample sub-materi yang punya items kosong (buat priority enrichment list)
  const emptyMetaKodes = new Map<string, number>();
  for (const it of items) {
    const meta = it.meta;
    const hasAllRequired = meta && requiredFields.every((f) => {
      const v = (meta as Record<string, unknown>)[f];
      return v !== undefined && v !== null && v !== "";
    });
    if (!hasAllRequired) {
      emptyMetaKodes.set(it.subMateriKode, (emptyMetaKodes.get(it.subMateriKode) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    total,
    withAnyMeta,
    fullyTagged,
    coverage: {
      anyMeta: total > 0 ? ((withAnyMeta / total) * 100).toFixed(1) + "%" : "0%",
      fullyTagged: total > 0 ? ((fullyTagged / total) * 100).toFixed(1) + "%" : "0%",
    },
    fieldCounts,
    fieldCoverage: Object.fromEntries(
      Object.entries(fieldCounts).map(([k, v]) => [k, total > 0 ? `${v} (${((v / total) * 100).toFixed(1)}%)` : "0"]),
    ),
    perJenjang,
    needEnrichment: {
      total: emptyMetaKodes.size,
      sampleKodes: [...emptyMetaKodes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
    },
  });
}
