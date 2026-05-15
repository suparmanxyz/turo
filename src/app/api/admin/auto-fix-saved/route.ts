import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const DOC_ID = "auto-fix-saved-items"; // single doc untuk simpan list IDs

/** GET — return list itemIds yang sudah di-mark saved oleh admin. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const db = getAdminDb();
  const doc = await db.collection("admin_state").doc(DOC_ID).get();
  const ids: string[] = doc.exists ? (doc.data()?.ids ?? []) : [];
  return NextResponse.json({ ids });
}

/** POST — append itemIds ke saved list. Body: { ids: string[] } */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const body = await req.json();
  const newIds: string[] = Array.isArray(body.ids) ? body.ids.filter((i: unknown) => typeof i === "string") : [];
  if (newIds.length === 0) return NextResponse.json({ ok: true, added: 0 });

  const db = getAdminDb();
  const ref = db.collection("admin_state").doc(DOC_ID);
  const doc = await ref.get();
  const existing: string[] = doc.exists ? (doc.data()?.ids ?? []) : [];
  const merged = Array.from(new Set([...existing, ...newIds]));
  await ref.set({ ids: merged, updatedAt: Date.now() });
  return NextResponse.json({ ok: true, added: newIds.length, total: merged.length });
}

/** DELETE — reset saved list. */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const db = getAdminDb();
  await db.collection("admin_state").doc(DOC_ID).set({ ids: [], updatedAt: Date.now() });
  return NextResponse.json({ ok: true });
}
