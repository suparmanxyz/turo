import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { batchUpsertMastery } from "@/lib/firestore-schema";
import { cariSubMateriResmi } from "@/data/peta-resmi";
import type { MasteryStatus, SubMateriMastery } from "@/types";

export const runtime = "nodejs";

/**
 * Bridge endpoint: dipanggil dari Sistem A (legacy diagnostik & latihan)
 * untuk update sub_materi_mastery — supaya mastery user nyambung antara
 * diagnostik IRT (Phase B) dan diagnostik per-bab (legacy) + latihan adaptif.
 *
 * Input body:
 *   {
 *     items: [
 *       { kode: string, status: MasteryStatus, confidence?: number, source?: string }
 *     ]
 *   }
 *
 * Auth: Bearer ID token (user-level, bukan admin — user update mastery sendiri).
 */
type Source = SubMateriMastery["source"];

const VALID_STATUS: MasteryStatus[] = ["siap", "review", "remediasi", "unknown"];
const VALID_SOURCE: Source[] = ["diagnostic", "latihan", "post_test", "cek_kesiapan"];

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
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ error: "items[] wajib & non-empty" }, { status: 400 });

  // Validate & build SubMateriMastery list
  const masteryList: SubMateriMastery[] = [];
  const skipped: { kode: string; reason: string }[] = [];
  const now = Date.now();

  for (const it of items) {
    const kode = String(it.kode ?? "").trim();
    if (!kode) {
      skipped.push({ kode: "(empty)", reason: "kode kosong" });
      continue;
    }
    // Hanya accept kode yang valid di peta resmi (anti-injection)
    if (!cariSubMateriResmi(kode)) {
      skipped.push({ kode, reason: "tidak ditemukan di peta resmi" });
      continue;
    }
    const status = VALID_STATUS.includes(it.status) ? (it.status as MasteryStatus) : null;
    if (!status) {
      skipped.push({ kode, reason: `status invalid: ${it.status}` });
      continue;
    }
    const source = VALID_SOURCE.includes(it.source) ? (it.source as Source) : "latihan";
    const confidence = Math.max(0, Math.min(1, Number(it.confidence) || 0.5));
    masteryList.push({ kode, status, confidence, lastAssessedAt: now, source });
  }

  if (masteryList.length === 0) {
    return NextResponse.json({ error: "Tidak ada item valid", skipped }, { status: 400 });
  }

  await batchUpsertMastery(uid, masteryList);
  return NextResponse.json({ updated: masteryList.length, skipped: skipped.length, skippedDetail: skipped });
}
