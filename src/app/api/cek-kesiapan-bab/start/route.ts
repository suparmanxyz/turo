import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { startCekKesiapanBab } from "@/lib/cek-kesiapan";
import { cariSubMateriResmi } from "@/data/peta-resmi";
import { DAFTAR_MATERI } from "@/data/materi";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!auth) return NextResponse.json({ error: "Auth wajib" }, { status: 401 });
  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(auth);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const body = await req.json();
  const materiSlug = String(body.materiSlug ?? "").trim();
  if (!materiSlug) return NextResponse.json({ error: "materiSlug wajib" }, { status: 400 });

  const materi = DAFTAR_MATERI.find((m) => m.slug === materiSlug);
  if (!materi) return NextResponse.json({ error: `Materi ${materiSlug} tidak ditemukan` }, { status: 404 });

  // Sub-materi di bab — slug = kode resmi (e.g. SD.4.B3.01)
  const subKodes = materi.subMateri.map((s) => s.slug);
  const result = await startCekKesiapanBab(uid, materiSlug, subKodes);

  // Enrich blindSpots dengan nama+kelas dari peta resmi
  const blindSpotsDetail = result.blindSpots.map((bs) => {
    const bsSub = cariSubMateriResmi(bs.kode);
    return {
      kode: bs.kode,
      nama: bsSub?.nama ?? bs.kode,
      jenjang: bsSub?.jenjang,
      kelas: bsSub?.kelas,
      area: bsSub?.area,
      weight: bs.weight,
      reason: bs.reason,
    };
  });

  return NextResponse.json({
    materiSlug,
    materiNama: materi.nama,
    jumlahSubMateri: subKodes.length,
    blindSpots: blindSpotsDetail,
    warmupQueue: result.warmupQueue.map((w) => {
      const bsSub = cariSubMateriResmi(w.blindSpotKode);
      return {
        blindSpotKode: w.blindSpotKode,
        blindSpotNama: bsSub?.nama,
        blindSpotKelas: bsSub?.kelas,
        blindSpotJenjang: bsSub?.jenjang,
        item: {
          id: w.item.id,
          subMateriKode: w.item.subMateriKode,
          pertanyaan: w.item.konten.pertanyaan,
          opsi: w.item.konten.opsi.map((o) => ({ teks: o.teks })),
          svg: w.item.konten.svg,
        },
      };
    }),
    shortCircuit: result.shortCircuit,
  });
}
