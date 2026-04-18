import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** GET — list semua hasil diagnostik dari semua user. Limit 200 terbaru. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (resp) {
    return resp as Response;
  }

  const db = getAdminDb();
  try {
    // Collection group query: scan semua /progress/{uid}/diagnostik/*
    const snap = await db.collectionGroup("diagnostik").orderBy("createdAt", "desc").limit(200).get();
    const items = snap.docs.map((d) => {
      const path = d.ref.path; // progress/{uid}/diagnostik/{key}
      const parts = path.split("/");
      const uid = parts[1] ?? "";
      const data = d.data();
      return {
        uid,
        key: d.id,
        materiSlug: data.materiSlug,
        materiNama: data.materiNama,
        jenis: data.jenis ?? "diagnostik",
        skorBenar: data.skorBenar ?? 0,
        skorTotal: data.skorTotal ?? 0,
        pohonOk: data.pohonOk ?? 0,
        perluBelajarCount: Array.isArray(data.perluBelajar) ? data.perluBelajar.length : 0,
        soalCount: Array.isArray(data.jawabanRiwayat) ? data.jawabanRiwayat.length : 0,
        createdAt: data.createdAt ?? null,
      };
    });
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "gagal" }, { status: 500 });
  }
}
