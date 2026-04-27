import { NextRequest, NextResponse } from "next/server";
import { petaUntukSubMateri, cariSubMateriResmi } from "@/data/peta-resmi";

export const runtime = "nodejs";

/**
 * Peta prasyarat sekarang DI-DERIVE dari peta resmi (`peta-prasyarat.json`),
 * BUKAN AI generate. Tidak ada Claude call, $0 per request, instant.
 *
 * Input body:
 *   - kode: string         — kode resmi sub-materi root (e.g. "SMP.8.B5.01")
 *   - subMateri?: string   — fallback: nama sub-materi (untuk legacy caller). Kalau kode tidak diberi, server cari sub yang nama-nya match (best-effort).
 *   - includeNonStrict?: boolean   — include SOFT/ALTERNATIVE prereq juga (default: false, hanya STRICT)
 *   - maxDepth?: number    — kedalaman max BFS (default: 8)
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { kode, subMateri, includeNonStrict, maxDepth, modeKurikulum } = body;

  let rootKode: string | undefined = typeof kode === "string" ? kode : undefined;

  // Fallback: cari by nama (best-effort, untuk legacy caller yang kirim subMateri text)
  if (!rootKode && typeof subMateri === "string") {
    const target = subMateri.trim().toLowerCase();
    // import lazily untuk avoid circular
    const { PETA } = await import("@/data/peta-resmi");
    const match = PETA.submateri.find((s) => s.nama.toLowerCase() === target);
    if (match) rootKode = match.kode;
  }

  if (!rootKode) {
    return NextResponse.json({ error: "kode sub-materi wajib diisi (e.g. \"SMP.8.B5.01\")" }, { status: 400 });
  }

  const root = cariSubMateriResmi(rootKode);
  if (!root) {
    return NextResponse.json({ error: `Sub-materi dengan kode "${rootKode}" tidak ditemukan di peta resmi` }, { status: 404 });
  }

  const mode = modeKurikulum === "strict" ? "strict" : "full";
  const peta = petaUntukSubMateri(rootKode, {
    includeNonStrict: !!includeNonStrict,
    maxDepth: typeof maxDepth === "number" ? maxDepth : undefined,
    modeKurikulum: mode,
  });
  if (!peta) {
    return NextResponse.json({ error: "Gagal bangun peta dari kode" }, { status: 500 });
  }
  return NextResponse.json({ ...peta, _resmi: true, _mode: mode });
}
