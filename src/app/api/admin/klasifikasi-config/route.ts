import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import {
  DEFAULT_CONFIG,
  getClassificationConfig,
  setClassificationConfig,
  type ClassificationConfig,
} from "@/lib/classification-config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const current = await getClassificationConfig();
  return NextResponse.json({ current, default: DEFAULT_CONFIG });
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const body = await req.json();
  // Whitelist & sanitize numbers
  const patch: Partial<ClassificationConfig> = {};
  const keys: (keyof ClassificationConfig)[] = [
    "coverageLemahMaxAcc", "coverageKuatMinAcc", "coverageCukupMinAcc",
    "coverageKuatThetaGap", "coverageKuatThetaGapAlt",
    "deepRemediasiMaxAcc", "deepSiapMinAcc", "deepSiapThetaGap", "deepRemediasiThetaGap",
  ];
  for (const k of keys) {
    if (body[k] !== undefined && body[k] !== "") {
      const n = Number(body[k]);
      if (Number.isFinite(n)) patch[k] = n;
    }
  }
  const next = await setClassificationConfig(patch);
  return NextResponse.json({ ok: true, current: next });
}

/** Reset ke default. */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const next = await setClassificationConfig(DEFAULT_CONFIG);
  return NextResponse.json({ ok: true, current: next });
}
