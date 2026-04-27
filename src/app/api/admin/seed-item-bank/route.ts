import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { cariSubMateriResmi } from "@/data/peta-resmi";
import { generateSoalMcBatch } from "@/lib/generate-soal-mc-core";
import { itemsForSubMateri, saveItemsBatch, seedItemFromSoalMc } from "@/lib/item-bank";
import type { Audiens, Jenjang, JenjangResmi, Kelas } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel hobby plan limit

const JENJANG_REVERSE: Record<JenjangResmi, Jenjang> = { SD: "sd", SMP: "smp", SMA: "sma" };

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await req.json();
  const kode = String(body.kode ?? "").trim();
  const targetCount = Math.max(1, Math.min(10, Number(body.count) || 3));
  const force = !!body.force;

  if (!kode) {
    return NextResponse.json({ error: "kode wajib (e.g. SMP.8.B5.01)" }, { status: 400 });
  }
  const sub = cariSubMateriResmi(kode);
  if (!sub) {
    return NextResponse.json({ error: `Sub-materi ${kode} tidak ditemukan` }, { status: 404 });
  }

  const existing = await itemsForSubMateri(kode);
  if (!force && existing.length >= targetCount) {
    return NextResponse.json({
      kode,
      skipped: true,
      reason: `Sudah ada ${existing.length} item (target ${targetCount})`,
      existing: existing.length,
      generated: 0,
    });
  }

  const need = Math.max(1, targetCount - existing.length);
  const audiens: Audiens = {
    kategoriUtama: "reguler",
    jenjang: JENJANG_REVERSE[sub.jenjang],
    kelas: sub.kelas as Kelas,
  };

  let generated = 0;
  let dropped = 0;
  let autoFixed = 0;
  try {
    const result = await generateSoalMcBatch({
      topik: sub.nama,
      subKonsep: sub.penjelasan?.slice(0, 80),
      level: 1,
      audiens,
      n: need,
    });
    dropped = result.dropped;
    autoFixed = result.autoFixed;

    const items = result.soal.map((s) =>
      seedItemFromSoalMc(s, { subMateriKode: kode, source: "ai-generated" }),
    );
    await saveItemsBatch(items);
    generated = items.length;
  } catch (e) {
    return NextResponse.json(
      {
        kode,
        generated: 0,
        existing: existing.length,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    kode,
    nama: sub.nama,
    jenjang: sub.jenjang,
    kelas: sub.kelas,
    area: sub.area,
    existing: existing.length,
    generated,
    total: existing.length + generated,
    dropped,
    autoFixed,
  });
}
