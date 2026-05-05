import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { getUserProfile } from "@/lib/firestore-schema";

export const runtime = "nodejs";

/**
 * GET — return maturityHistory dari user_profile (max 20 snapshots).
 */
export async function GET(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Auth wajib" }, { status: 401 });
  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const profile = await getUserProfile(uid);
  return NextResponse.json({
    history: profile?.maturityHistory ?? [],
    total: profile?.maturityHistory?.length ?? 0,
  });
}
