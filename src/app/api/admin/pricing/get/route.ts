import { NextRequest, NextResponse } from "next/server";
import { getPricingConfig } from "@/lib/pricing";
import { getAdminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Auth wajib" }, { status: 401 });
  try {
    await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const config = await getPricingConfig();
  return NextResponse.json(config);
}
