import { NextRequest, NextResponse } from "next/server";
import { getLabelOverrides } from "@/lib/label-overrides";
import { getAdminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/**
 * GET → return all label overrides as { kode: label } map.
 * Dipakai admin UI untuk merge dengan base labels dari JSON.
 */
export async function GET(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Auth wajib" }, { status: 401 });
  try {
    await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const overrides = await getLabelOverrides();
  return NextResponse.json({ overrides, total: Object.keys(overrides).length });
}
