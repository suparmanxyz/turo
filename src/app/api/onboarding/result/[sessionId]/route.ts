import { NextRequest, NextResponse } from "next/server";
import { getDiagnosticSession } from "@/lib/firestore-schema";
import { getAdminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest, props: { params: Promise<{ sessionId: string }> }) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Auth wajib" }, { status: 401 });
  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const { sessionId } = await props.params;
  const session = await getDiagnosticSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 404 });
  if (session.uid !== uid) return NextResponse.json({ error: "Bukan session kamu" }, { status: 403 });

  return NextResponse.json(session);
}
