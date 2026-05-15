import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrAssignedReviewer } from "@/lib/reviewer-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { invalidatePoolCache, invalidateItemCache } from "@/lib/item-bank";

export const runtime = "nodejs";

/**
 * PATCH /api/reviewer/update-item
 * Body: { itemId, fields: { konten?: { pertanyaan, opsi, kunci, pembahasan, svg }, meta? } }
 *
 * Mirror dari /api/admin/item-bank/[kode]/update-item, tapi:
 *   - Diizinkan untuk reviewer (selain admin), dengan check assignment match.
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const itemId = String(body.itemId ?? "").trim();
  if (!itemId) return NextResponse.json({ error: "itemId wajib" }, { status: 400 });

  try {
    await requireAdminOrAssignedReviewer(req, itemId);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const fields = body.fields ?? {};
  const db = getAdminDb();
  const ref = db.collection("item_bank").doc(itemId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: `Item ${itemId} tidak ditemukan` }, { status: 404 });
  }

  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (fields.konten && typeof fields.konten === "object") {
    const current = snap.data()?.konten ?? {};
    let kontenNext: Record<string, unknown> = { ...current };
    if (typeof fields.konten.pertanyaan === "string") kontenNext.pertanyaan = fields.konten.pertanyaan;
    if (Array.isArray(fields.konten.opsi)) kontenNext.opsi = fields.konten.opsi;
    if (typeof fields.konten.kunci === "number") kontenNext.kunci = fields.konten.kunci;
    if (typeof fields.konten.pembahasan === "string") kontenNext.pembahasan = fields.konten.pembahasan;
    if (typeof fields.konten.svg === "string") kontenNext.svg = fields.konten.svg;
    patch.konten = kontenNext;
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
