import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { getDiagnosticSession, listResponses } from "@/lib/firestore-schema";
import { loadItem } from "@/lib/item-bank";
import { cariSubMateriResmi } from "@/data/peta-resmi";

export const runtime = "nodejs";

/**
 * GET /api/admin/diagnostic-sessions/[id]
 * Detail 1 sesi: header + responses + soal lengkap (dari item bank).
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { id } = await props.params;
  const session = await getDiagnosticSession(id);
  if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });

  const responses = await listResponses(id);

  // Enrich responses dengan soal & sub-materi info
  const enriched = await Promise.all(
    responses.map(async (r) => {
      const [item, sub] = await Promise.all([
        loadItem(r.itemId),
        Promise.resolve(cariSubMateriResmi(r.subMateriKode)),
      ]);
      return {
        ...r,
        sub: sub
          ? {
              kode: sub.kode,
              nama: sub.nama,
              jenjang: sub.jenjang,
              kelas: sub.kelas,
              area: sub.area,
              bab_nama: sub.bab_nama,
              is_maku: sub.is_maku,
              label: sub.label,
              strict: sub.strict,
            }
          : null,
        item: item
          ? {
              id: item.id,
              b: item.b,
              a: item.a,
              c: item.c,
              format: item.format,
              calibrationN: item.calibrationN,
              konten: item.konten,
            }
          : null,
      };
    }),
  );

  return NextResponse.json({ session, responses: enriched });
}
