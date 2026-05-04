import { NextRequest, NextResponse } from "next/server";
import { updatePricingConfig, type PricingConfig } from "@/lib/pricing";
import { getAdminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

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
  const { patch, note } = body as {
    patch: Partial<Omit<PricingConfig, "updatedAt" | "updatedBy" | "history">>;
    note?: string;
  };
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ error: "Field patch wajib (object)" }, { status: 400 });
  }

  // Validate basic structure (avoid garbage writes)
  if (patch.plans) {
    for (const [k, v] of Object.entries(patch.plans)) {
      if (typeof v.price !== "number" || v.price < 0) {
        return NextResponse.json({ error: `Plan ${k}: price harus number ≥ 0` }, { status: 400 });
      }
      if (typeof v.periodDays !== "number" || v.periodDays < 1) {
        return NextResponse.json({ error: `Plan ${k}: periodDays harus ≥ 1` }, { status: 400 });
      }
      if (typeof v.maxUsers !== "number" || v.maxUsers < 1) {
        return NextResponse.json({ error: `Plan ${k}: maxUsers harus ≥ 1` }, { status: 400 });
      }
    }
  }
  if (patch.freeTier) {
    const ft = patch.freeTier;
    if (ft.subMateriPerDay < 0 || ft.soalPerDay < 0 || ft.aiTutorPerDay < 0) {
      return NextResponse.json({ error: "Free tier limits tidak boleh negatif" }, { status: 400 });
    }
  }
  if (patch.trial && (patch.trial.durationDays < 1 || patch.trial.durationDays > 90)) {
    return NextResponse.json({ error: "Trial duration harus 1-90 hari" }, { status: 400 });
  }

  const updated = await updatePricingConfig(patch, uid, note);
  return NextResponse.json(updated);
}
