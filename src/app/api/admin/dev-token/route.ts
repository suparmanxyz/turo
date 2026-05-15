import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/**
 * GET /api/admin/dev-token
 * Return fresh admin ID token untuk admin email allowlist.
 *
 * SECURITY: Hanya aktif di development environment (NODE_ENV !== "production").
 * Endpoint ini bypass auth supaya HTML viewer bisa auto-refresh token tanpa
 * user interaction. Production return 404.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const adminEmail = "suparmanpirates@gmail.com";
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Firebase API key missing" }, { status: 500 });
  }

  try {
    const user = await getAdminAuth().getUserByEmail(adminEmail);
    const customToken = await getAdminAuth().createCustomToken(user.uid);
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      },
    );
    const data = await res.json();
    if (!data.idToken) {
      return NextResponse.json({ error: "Failed to exchange token", detail: data }, { status: 500 });
    }
    // ID token Firebase valid 1 hour. Expose to caller.
    return NextResponse.json({ idToken: data.idToken, expiresIn: data.expiresIn });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
