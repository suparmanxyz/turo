import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { PETA } from "@/data/peta-resmi";
import type { ItemBankEntry } from "@/lib/item-bank";
import type { JenjangResmi } from "@/types";

export const runtime = "nodejs";

/**
 * GET /api/admin/item-bank-status?jenjang=SMP&kelas=8
 *
 * Return: daftar sub-materi prioritas (entry/maku/milestone) dengan jumlah item current.
 * Default: tanpa filter → semua sub-materi prioritas (cap 100).
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const url = new URL(req.url);
  const jenjangFilter = url.searchParams.get("jenjang") as JenjangResmi | null;
  const kelasFilter = url.searchParams.get("kelas");
  const onlyPriority = url.searchParams.get("priority") !== "false"; // default true

  // Load semua items, count by subMateriKode + SVG count (untuk filter "items dengan gambar")
  const snap = await getAdminDb().collection("item_bank").select("subMateriKode", "konten.svg").get();
  const counts = new Map<string, number>();
  const svgCounts = new Map<string, number>();
  for (const d of snap.docs) {
    const data = d.data() as { subMateriKode: string; konten?: { svg?: string } };
    counts.set(data.subMateriKode, (counts.get(data.subMateriKode) ?? 0) + 1);
    if (data.konten?.svg && data.konten.svg.trim().length > 0) {
      svgCounts.set(data.subMateriKode, (svgCounts.get(data.subMateriKode) ?? 0) + 1);
    }
  }

  // Filter sub-materi sesuai prioritas
  const subs = PETA.submateri.filter((s) => {
    if (jenjangFilter && s.jenjang !== jenjangFilter) return false;
    if (kelasFilter && s.kelas !== Number(kelasFilter)) return false;
    if (onlyPriority) {
      // Prioritas = entry_point ATAU maku ATAU dependents >= 3
      return s.is_entry_point || s.is_maku || s.dependents_count >= 3;
    }
    return true;
  });

  // Sort: deficit terbesar dulu (count rendah → prioritas seed)
  const ranked = subs
    .map((s) => ({ sub: s, count: counts.get(s.kode) ?? 0 }))
    .sort((a, b) => {
      // Priority score: maku & entry dulu, lalu yang count-nya rendah
      const aScore = (a.sub.is_maku ? 100 : 0) + (a.sub.is_entry_point ? 50 : 0) + a.sub.dependents_count - a.count * 10;
      const bScore = (b.sub.is_maku ? 100 : 0) + (b.sub.is_entry_point ? 50 : 0) + b.sub.dependents_count - b.count * 10;
      return bScore - aScore;
    })
    .slice(0, 200) // cap 200 per request
    .map(({ sub, count }) => ({
      kode: sub.kode,
      nama: sub.nama,
      jenjang: sub.jenjang,
      kelas: sub.kelas,
      area: sub.area,
      bab: sub.bab_nama,
      isMaku: sub.is_maku,
      isEntryPoint: sub.is_entry_point,
      dependentsCount: sub.dependents_count,
      count,
      svgCount: svgCounts.get(sub.kode) ?? 0,
    }));

  // Aggregate stats
  const totalItems = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const subsWithItems = counts.size;

  return NextResponse.json({
    stats: {
      totalItems,
      subsWithItems,
      subsTotalPriority: ranked.length,
    },
    rows: ranked,
  });
}
