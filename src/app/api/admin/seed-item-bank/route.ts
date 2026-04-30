import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { cariSubMateriResmi } from "@/data/peta-resmi";
import { generateSoalMcBatch } from "@/lib/generate-soal-mc-core";
import { itemsForSubMateri, saveItemsBatch, seedItemFromSoalMc } from "@/lib/item-bank";
import type { Audiens, Jenjang, JenjangResmi, Kelas } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300; // Pro plan max; hobby tetap auto-cap 60

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
  const modelOverride: "sonnet" | "opus" | undefined =
    body.model === "opus" ? "opus" : body.model === "sonnet" ? "sonnet" : undefined;

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

  // SMA materi sering bikin Anthropic generate response panjang (30-60s per soal).
  // Untuk fit Vercel hobby cap 60s, batasi SMA ke 1 soal per request.
  // User klik tombol Seed lagi untuk batch berikutnya.
  let need = Math.max(1, targetCount - existing.length);
  if (sub.jenjang === "SMA" && need > 1) {
    need = 1;
  }

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
      modelOverride,
    });
    dropped = result.dropped;
    autoFixed = result.autoFixed;

    const items = result.soal.map((s) =>
      seedItemFromSoalMc(s, {
        subMateriKode: kode,
        source: "ai-generated",
        aiModel: result.modelUsed,
      }),
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
