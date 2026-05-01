import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { cariSubMateriResmi } from "@/data/peta-resmi";
import { generateSoalMcBatch } from "@/lib/generate-soal-mc-core";
import { itemsForSubMateri, saveItemsBatch, seedItemFromSoalMc } from "@/lib/item-bank";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Audiens, Jenjang, JenjangResmi, Kelas } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const JENJANG_REVERSE: Record<JenjangResmi, Jenjang> = { SD: "sd", SMP: "smp", SMA: "sma" };

/**
 * Regenerate: hapus semua items existing untuk sub-materi, lalu generate baru.
 * Berguna untuk update items lama supaya dapat metadata pedagogis terbaru.
 *
 * Body: { count?: number, model?: "sonnet" | "opus" }
 */
export async function POST(req: NextRequest, props: { params: Promise<{ kode: string }> }) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { kode: kodeRaw } = await props.params;
  const kode = decodeURIComponent(kodeRaw);
  const sub = cariSubMateriResmi(kode);
  if (!sub) return NextResponse.json({ error: `Sub-materi ${kode} tidak ditemukan` }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  let count = Math.max(1, Math.min(10, Number(body.count) || 3));
  // SMA limit n=1 supaya tidak timeout (max 60s Vercel hobby)
  if (sub.jenjang === "SMA" && count > 1) count = 1;
  const modelOverride: "sonnet" | "opus" | undefined =
    body.model === "opus" ? "opus" : body.model === "sonnet" ? "sonnet" : undefined;

  // 1. Hapus semua items lama
  const existing = await itemsForSubMateri(kode);
  const db = getAdminDb();
  let deleted = 0;
  for (let i = 0; i < existing.length; i += 500) {
    const batch = db.batch();
    for (const it of existing.slice(i, i + 500)) {
      batch.delete(db.collection("item_bank").doc(it.id));
    }
    await batch.commit();
    deleted += Math.min(500, existing.length - i);
  }

  // 2. Generate baru
  const audiens: Audiens = {
    kategoriUtama: "reguler",
    jenjang: JENJANG_REVERSE[sub.jenjang],
    kelas: sub.kelas as Kelas,
  };

  let generated = 0;
  let dropped = 0;
  let autoFixed = 0;
  let modelUsed = "";
  try {
    const result = await generateSoalMcBatch({
      topik: sub.nama,
      subKonsep: sub.penjelasan?.slice(0, 80),
      level: 1,
      audiens,
      n: count,
      modelOverride,
    });
    dropped = result.dropped;
    autoFixed = result.autoFixed;
    modelUsed = result.modelUsed;

    const items = result.soal.map((s) =>
      seedItemFromSoalMc(s, {
        subMateriKode: kode,
        source: "ai-generated",
        aiModel: result.modelUsed,
        meta: s.meta,
      }),
    );
    await saveItemsBatch(items);
    generated = items.length;
  } catch (e) {
    return NextResponse.json(
      {
        kode,
        deleted,
        generated: 0,
        error: `Gagal generate: ${e instanceof Error ? e.message : String(e)}. Items lama sudah dihapus tapi belum bisa generate baru.`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    kode,
    nama: sub.nama,
    deleted,
    generated,
    dropped,
    autoFixed,
    modelUsed,
  });
}

/**
 * DELETE — hapus semua items untuk sub-materi (tanpa generate).
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ kode: string }> }) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const { kode: kodeRaw } = await props.params;
  const kode = decodeURIComponent(kodeRaw);

  const existing = await itemsForSubMateri(kode);
  const db = getAdminDb();
  let deleted = 0;
  for (let i = 0; i < existing.length; i += 500) {
    const batch = db.batch();
    for (const it of existing.slice(i, i + 500)) {
      batch.delete(db.collection("item_bank").doc(it.id));
    }
    await batch.commit();
    deleted += Math.min(500, existing.length - i);
  }
  return NextResponse.json({ kode, deleted });
}
