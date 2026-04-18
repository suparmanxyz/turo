import "server-only";
import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { isAdminEmail } from "@/lib/admin";

/**
 * Server-side admin guard. Verify Firebase ID token dari header Authorization,
 * lalu cek email vs allowlist. Throws Response (401/403) kalau gagal.
 */
export async function requireAdmin(req: NextRequest): Promise<{ uid: string; email: string }> {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    throw new Response(JSON.stringify({ error: "Token autentikasi wajib" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const idToken = m[1];
  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken);
  } catch {
    throw new Response(JSON.stringify({ error: "Token tidak valid" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!isAdminEmail(decoded.email)) {
    throw new Response(JSON.stringify({ error: "Bukan admin" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { uid: decoded.uid, email: decoded.email! };
}
