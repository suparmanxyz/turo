import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { invalidatePoolCache, invalidateItemCache } from "@/lib/item-bank";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/item-bank/[kode]/update-item
 * Body: { itemId, fields: { konten?: {pertanyaan, opsi, kunci, pembahasan, svg}, meta? } }
 *
 * Update text fields item (pertanyaan, opsi, alasan, pembahasan, svg) via admin.
 * Cache otomatis invalidated.
 */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await req.json();
  const itemId = String(body.itemId ?? "").trim();
  const fields = body.fields ?? {};
  if (!itemId) {
    return NextResponse.json({ error: "itemId wajib" }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = db.collection("item_bank").doc(itemId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: `Item ${itemId} tidak ditemukan` }, { status: 404 });
  }

  // Allowlist fields yang boleh di-update
  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (fields.konten && typeof fields.konten === "object") {
    const current = snap.data()?.konten ?? {};
    patch.konten = { ...current };
    if (typeof fields.konten.pertanyaan === "string") patch.konten = { ...patch.konten as object, pertanyaan: fields.konten.pertanyaan };
    if (Array.isArray(fields.konten.opsi)) patch.konten = { ...patch.konten as object, opsi: fields.konten.opsi };
    if (typeof fields.konten.kunci === "number") patch.konten = { ...patch.konten as object, kunci: fields.konten.kunci };
    if (typeof fields.konten.pembahasan === "string") patch.konten = { ...patch.konten as object, pembahasan: fields.konten.pembahasan };
    if (typeof fields.konten.svg === "string") patch.konten = { ...patch.konten as object, svg: fields.konten.svg };
  }
  if (fields.meta && typeof fields.meta === "object") {
    const current = snap.data()?.meta ?? {};
    patch.meta = { ...current, ...fields.meta };
  }

  await ref.update(patch);
  invalidatePoolCache();
  invalidateItemCache(itemId);

  return NextResponse.json({ ok: true, itemId });
}
