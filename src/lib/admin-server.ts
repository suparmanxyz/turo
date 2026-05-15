import "server-only";
import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { isAdminEmail, isAdminOrReviewerEmail } from "@/lib/admin";

/**
 * Verify Firebase ID token dari header Authorization. Returns decoded user.
 * Throws Response (401) kalau token invalid.
 */
async function verifyTokenFromReq(req: NextRequest): Promise<{ uid: string; email: string }> {
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
  return { uid: decoded.uid, email: decoded.email! };
}

/**
 * Server-side admin guard. Verify token + cek email vs admin allowlist.
 * Throws Response (401/403) kalau gagal.
 */
export async function requireAdmin(req: NextRequest): Promise<{ uid: string; email: string }> {
  const user = await verifyTokenFromReq(req);
  if (!isAdminEmail(user.email)) {
    throw new Response(JSON.stringify({ error: "Bukan admin" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/**
 * Server-side reviewer guard. Admin juga lolos (admin > reviewer).
 * Throws Response (401/403) kalau bukan reviewer/admin.
 */
export async function requireReviewer(req: NextRequest): Promise<{ uid: string; email: string }> {
  const user = await verifyTokenFromReq(req);
  if (!isAdminOrReviewerEmail(user.email)) {
    throw new Response(JSON.stringify({ error: "Bukan reviewer atau admin" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
