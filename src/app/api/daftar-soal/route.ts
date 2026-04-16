import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const materiSlug = searchParams.get("materiSlug");
  const subMateriSlug = searchParams.get("subMateriSlug");
  if (!materiSlug || !subMateriSlug) {
    return NextResponse.json({ error: "materiSlug & subMateriSlug wajib" }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const snap = await db
      .collection("soalManual")
      .where("materiSlug", "==", materiSlug)
      .where("subMateriSlug", "==", subMateriSlug)
      .limit(200)
      .get();

    const semua = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        pertanyaan: data.pertanyaan,
        topik: data.topik ?? "",
        level: data.level ?? 0,
        sumberJenis: data.sumberJenis ?? "manual",
        sumberFile: data.sumber ?? "",
        originalId: data.originalId ?? null,
      };
    });

    const original = semua.filter((s) => s.sumberJenis !== "ai-variasi");
    const variasi = semua.filter((s) => s.sumberJenis === "ai-variasi");
    const variasiByOrig: Record<string, typeof variasi> = {};
    for (const v of variasi) {
      const k = v.originalId ?? "";
      if (!k) continue;
      (variasiByOrig[k] ??= []).push(v);
    }

    return NextResponse.json({
      total: semua.length,
      original: original.map((o) => ({ ...o, variasi: variasiByOrig[o.id] ?? [] })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "gagal" }, { status: 500 });
  }
}
