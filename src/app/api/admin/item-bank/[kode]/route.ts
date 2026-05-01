import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { itemsForSubMateri } from "@/lib/item-bank";
import { cariSubMateriResmi, dependentsOf, petaUntukSubMateri } from "@/data/peta-resmi";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest, props: { params: Promise<{ kode: string }> }) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { kode: kodeRaw } = await props.params;
  const kode = decodeURIComponent(kodeRaw);
  const sub = cariSubMateriResmi(kode);
  if (!sub) return NextResponse.json({ error: `Sub-materi ${kode} tidak ditemukan` }, { status: 404 });

  const items = await itemsForSubMateri(kode);

  return NextResponse.json({
    sub: {
      kode: sub.kode,
      nama: sub.nama,
      jenjang: sub.jenjang,
      kelas: sub.kelas,
      area: sub.area,
      bab_kode: sub.bab_kode,
      bab_nama: sub.bab_nama,
      penjelasan: sub.penjelasan,
      durasi_estimasi: sub.durasi_estimasi,
      is_maku: sub.is_maku,
      is_entry_point: sub.is_entry_point,
      depth: sub.depth,
      dependents_count: sub.dependents_count,
      prereq: sub.prereq,
      strict: sub.strict,
      label: sub.label,
    },
    dependents: dependentsOf(kode),
    items: items.map((it) => ({
      id: it.id,
      b: it.b,
      a: it.a,
      c: it.c,
      format: it.format,
      calibrationN: it.calibrationN,
      source: it.source,
      aiModel: it.aiModel,
      meta: it.meta,
      createdAt: it.createdAt,
      konten: it.konten,
    })),
  });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ kode: string }> }) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const { kode: kodeRaw } = await props.params;
  const kode = decodeURIComponent(kodeRaw);
  const url = new URL(req.url);
  const itemId = url.searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId query param wajib" }, { status: 400 });

  await getAdminDb().collection("item_bank").doc(itemId).delete();
  return NextResponse.json({ deleted: itemId, kode });
}
