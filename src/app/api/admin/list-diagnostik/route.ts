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
    const m = e instanceof Error ? e.message : String(e);
    // Firestore FAILED_PRECONDITION = missing index, biasanya kasih link auto-create
    if (m.includes("FAILED_PRECONDITION") || m.includes("requires an index")) {
      return NextResponse.json(
        {
          error: "Firestore butuh composite index untuk query ini. Deploy: `firebase deploy --only firestore:indexes` atau klik link di pesan error untuk auto-create.",
          detail: m,
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: m }, { status: 500 });
  }
}
