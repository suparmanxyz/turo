import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  const snap = await getAdminDb().collection("soalManual").doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "tidak ditemukan" }, { status: 404 });
  const data = snap.data()!;
  return NextResponse.json({
    pertanyaan: data.pertanyaan,
    jawabanBenar: data.jawabanBenar ?? "",
    pembahasan: Array.isArray(data.pembahasan) ? data.pembahasan : [],
    opsi: Array.isArray(data.opsi) ? data.opsi : undefined,
    _id: snap.id,
    _sumber: data.sumberJenis === "ai-variasi" ? "ai-variasi" : "manual",
    _sumberFile: data.sumber ?? "",
  });
}
