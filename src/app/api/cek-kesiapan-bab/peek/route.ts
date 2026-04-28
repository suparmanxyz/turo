import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { identifyBlindSpotsForBab } from "@/lib/cek-kesiapan";
import { cariSubMateriResmi } from "@/data/peta-resmi";
import { getMastery } from "@/lib/firestore-schema";

export const runtime = "nodejs";

/**
 * Peek (preview) — non-destructive cek kalau ada prereq lemah di bab.
 * Untuk MateriPrereqWarning soft warning di /materi/[slug].
 * Tidak generate warmup, tidak tulis apa-apa.
 *
 * Returns:
 *   - weakPrereqCount: jumlah prereq dengan mastery status "remediasi"
 *     (status "unknown" / blind-spot belum di-assess TIDAK dihitung
 *     supaya banner tidak muncul untuk user baru tanpa data)
 *   - totalPrereq: total prereq STRICT-CRITICAL agregat bab
 *   - weakSamples: 3 sub-materi prereq lemah (untuk preview)
 */
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
  const subKodes = Array.isArray(body.subKodes) ? body.subKodes.filter((s: unknown) => typeof s === "string") : [];
  if (!materiSlug || subKodes.length === 0) {
    return NextResponse.json({ weakPrereqCount: 0, totalPrereq: 0, weakSamples: [] });
  }

  // identifyBlindSpotsForBab returns prereq yang BELUM siap (unknown atau remediasi)
  // Untuk warning banner, kita perketat — hanya hitung yang status REMEDIASI explicit
  // Supaya user baru tanpa data tidak panic.
  const allBlindSpots = await identifyBlindSpotsForBab(uid, subKodes);

  // Total prereq agregat = jumlah unique prereq STRICT-CRITICAL dari semua sub
  // (= len blindSpots + len yang sudah siap, tapi kita gak track yang siap dari peek ini)
  // Untuk simplicity, totalPrereq = unique prereq dari peta (cek lagi)
  const inBabSet = new Set(subKodes as string[]);
  const totalPrereqSet = new Set<string>();
  for (const subKode of subKodes as string[]) {
    const sub = cariSubMateriResmi(subKode);
    if (!sub) continue;
    for (const p of sub.prereq) {
      if (p.relation !== "STRICT" || p.weight !== "CRITICAL") continue;
      if (inBabSet.has(p.kode)) continue;
      totalPrereqSet.add(p.kode);
    }
  }

  // Filter: hanya yang explicit "remediasi" atau "review" (sudah di-assess + lemah)
  // — bukan yang "unknown" (belum di-assess, jangan panic user)
  const weakKodes: string[] = [];
  for (const bs of allBlindSpots) {
    const m = await getMastery(uid, bs.kode);
    if (m && (m.status === "remediasi" || m.status === "review")) {
      weakKodes.push(bs.kode);
    }
  }

  const weakSamples = weakKodes.slice(0, 3).map((kode) => {
    const sub = cariSubMateriResmi(kode);
    return { kode, nama: sub?.nama ?? kode };
  });

  return NextResponse.json({
    weakPrereqCount: weakKodes.length,
    totalPrereq: totalPrereqSet.size,
    weakSamples,
  });
}
