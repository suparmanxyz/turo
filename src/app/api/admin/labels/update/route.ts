import { NextRequest, NextResponse } from "next/server";
import { setLabelOverride, getLabelOverrides } from "@/lib/label-overrides";
import { getAdminAuth } from "@/lib/firebase-admin";
import type { LabelKurikulum } from "@/types";

export const runtime = "nodejs";

const VALID_LABELS = new Set<LabelKurikulum>(["CP-2025", "Buku-2025", "UTBK", "Pengayaan"]);

/**
 * POST { kode, label } → set override label di Firestore.
 * Works production — Firestore mutable runtime, tidak perlu redeploy.
 */
export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Auth wajib" }, { status: 401 });
  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const body = await req.json();
  const kode = String(body.kode ?? "").trim();
  const label = String(body.label ?? "").trim() as LabelKurikulum;

  if (!kode || !VALID_LABELS.has(label)) {
    return NextResponse.json({ error: "Field kode + label wajib. Label valid: CP-2025, Buku-2025, UTBK, Pengayaan." }, { status: 400 });
  }

  try {
    await setLabelOverride(kode, label, uid);
    const all = await getLabelOverrides();
    return NextResponse.json({ ok: true, kode, label, totalOverrides: Object.keys(all).length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
