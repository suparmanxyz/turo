import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-server";

export const runtime = "nodejs";

/** GET ?slug=X — return sub-topik cache untuk materi. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (resp) {
    return resp as Response;
  }

  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug wajib" }, { status: 400 });

  const db = getAdminDb();
  try {
    const s = await db.collection("subTopikCache").doc(slug).get();
    if (!s.exists) return NextResponse.json({ subTopik: null });
    const d = s.data();
    return NextResponse.json({
      subTopik: d?.subTopik ?? null,
      editedByAdmin: !!d?.editedByAdmin,
      createdAt: d?.createdAt ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "gagal" }, { status: 500 });
  }
}

/** POST — save edited sub-topik untuk materi. Body: { slug, subTopik, materiNama, kategoriUtama, jenjang?, kelas? } */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (resp) {
    return resp as Response;
  }

  const body = await req.json();
  const { slug, subTopik, materiNama, kategoriUtama, jenjang, kelas } = body;
  if (!slug || !Array.isArray(subTopik) || !materiNama) {
    return NextResponse.json({ error: "slug, subTopik[], materiNama wajib" }, { status: 400 });
  }
  // Validasi sub-topik
  for (const [i, s] of subTopik.entries()) {
    if (!s.slug || !s.nama || !s.ringkasan) {
      return NextResponse.json({ error: `Sub-topik #${i + 1} tidak lengkap (slug/nama/ringkasan)` }, { status: 400 });
    }
  }
  try {
    const db = getAdminDb();
    await db.collection("subTopikCache").doc(slug).set({
      subTopik,
      materiNama,
      kategoriUtama,
      jenjang: jenjang ?? null,
      kelas: kelas ?? null,
      createdAt: Date.now(),
      editedByAdmin: true,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "gagal" }, { status: 500 });
  }
}
