import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-server";

export const runtime = "nodejs";

/** GET ?uid=X&key=Y — return detail hasil diagnostik milik user lain (admin only). */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (resp) {
    return resp as Response;
  }

  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  const key = url.searchParams.get("key");
  if (!uid || !key) return NextResponse.json({ error: "uid & key wajib" }, { status: 400 });

  try {
    const db = getAdminDb();
    const snap = await db.collection("progress").doc(uid).collection("diagnostik").doc(key).get();
    if (!snap.exists) return NextResponse.json({ error: "tidak ditemukan" }, { status: 404 });
    return NextResponse.json(snap.data());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "gagal" }, { status: 500 });
  }
}
