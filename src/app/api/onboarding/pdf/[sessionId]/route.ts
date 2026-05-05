import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { getAdminAuth } from "@/lib/firebase-admin";
import { getDiagnosticSession } from "@/lib/firestore-schema";
import { JALUR_LABEL } from "@/lib/diagnostic-routing";
import { HasilPdfDocument } from "@/components/HasilPdf";

export const runtime = "nodejs";

/**
 * GET /api/onboarding/pdf/[sessionId] — generate PDF hasil diagnostik
 * dan return sebagai download.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ sessionId: string }> },
) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Auth wajib" }, { status: 401 });
  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const { sessionId } = await props.params;
  const session = await getDiagnosticSession(sessionId);
  if (!session) return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 404 });
  if (session.uid !== uid) return NextResponse.json({ error: "Bukan session kamu" }, { status: 403 });

  const userName = email?.split("@")[0] ?? "Siswa";
  const jenjangLabel = JALUR_LABEL[session.jalur] ?? session.jalur;

  // Render PDF
  const buffer = await renderToBuffer(
    React.createElement(HasilPdfDocument, {
      session,
      userName,
      userEmail: email,
      jenjangLabel,
      generatedAtMs: Date.now(),
    }) as React.ReactElement<DocumentProps>,
  );

  const filename = `hasil-diagnostik-turo-${sessionId.slice(0, 8)}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
