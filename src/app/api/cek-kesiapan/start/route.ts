import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { startCekKesiapan } from "@/lib/cek-kesiapan";
import { cariSubMateriResmi } from "@/data/peta-resmi";

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
  const kode = String(body.kode ?? "").trim();
  if (!kode) return NextResponse.json({ error: "kode wajib" }, { status: 400 });

  const sub = cariSubMateriResmi(kode);
  if (!sub) return NextResponse.json({ error: `Sub-materi ${kode} tidak ditemukan` }, { status: 404 });

  const result = await startCekKesiapan(uid, kode);

  return NextResponse.json({
    targetKode: result.targetKode,
    targetNama: sub.nama,
    blindSpots: result.blindSpots,
    warmupQueue: result.warmupQueue.map((w) => ({
      blindSpotKode: w.blindSpotKode,
      item: {
        id: w.item.id,
        subMateriKode: w.item.subMateriKode,
        pertanyaan: w.item.konten.pertanyaan,
        opsi: w.item.konten.opsi.map((o) => ({ teks: o.teks })),
        svg: w.item.konten.svg,
      },
    })),
    shortCircuit: result.shortCircuit,
  });
}
