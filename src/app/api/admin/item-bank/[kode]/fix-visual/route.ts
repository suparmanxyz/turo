import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { loadItem } from "@/lib/item-bank";
import { getAdminDb } from "@/lib/firebase-admin";
import { getClaude } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { plotFunction } from "@/lib/svg-plotter";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const ResponseSchema = z.object({
  svg: z.string(),
  catatan: z.string().optional(),
});

/**
 * AI fix visual SVG sebuah item.
 * Body: { itemId: string, instruksi: string, model?: "sonnet" | "opus" }
 *
 * AI hanya revisi SVG (bukan pertanyaan/opsi/kunci). Return new SVG untuk
 * preview di client. Save terjadi terpisah (PUT endpoint atau via admin UI).
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const body = await req.json();
  const itemId = String(body.itemId ?? "").trim();
  const mode = body.mode === "plot-fungsi" ? "plot-fungsi" : "chat";
  if (!itemId) {
    return NextResponse.json({ error: "itemId wajib" }, { status: 400 });
  }

  const item = await loadItem(itemId);
  if (!item) return NextResponse.json({ error: `Item ${itemId} tidak ditemukan` }, { status: 404 });

  // ── MODE: PLOT FUNGSI (server-side, akurat 100%) ──
  if (mode === "plot-fungsi") {
    const expression = String(body.expression ?? "").trim();
    const xMin = Number(body.xMin);
    const xMax = Number(body.xMax);
    const yMinRaw = body.yMin === "" || body.yMin === undefined ? undefined : Number(body.yMin);
    const yMaxRaw = body.yMax === "" || body.yMax === undefined ? undefined : Number(body.yMax);
    const label = body.label ? String(body.label) : undefined;
    const xTickMode = ["auto", "radian", "derajat", "numerik"].includes(body.xTickMode)
      ? body.xTickMode as "auto" | "radian" | "derajat" | "numerik"
      : "auto";
    if (!expression || !Number.isFinite(xMin) || !Number.isFinite(xMax)) {
      return NextResponse.json({ error: "expression, xMin, xMax wajib" }, { status: 400 });
    }
    try {
      const result = plotFunction({
        expression,
        xMin, xMax,
        yMin: yMinRaw,
        yMax: yMaxRaw,
        label,
        xTickMode,
      });
      return NextResponse.json({
        itemId,
        svgBefore: item.konten.svg ?? "",
        svgAfter: result.svg,
        catatan: `Plot otomatis ${expression} di range x:[${xMin}, ${xMax}], y:[${result.yMinUsed.toFixed(2)}, ${result.yMaxUsed.toFixed(2)}] dari ${result.validPoints} titik sampling.`,
        modelUsed: "server-plot",
      });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
    }
  }

  // ── MODE: CHAT AI (instruksi bebas) ──
  const instruksi = String(body.instruksi ?? "").trim();
  const modelChoice = body.model === "opus" ? "claude-opus-4-7" : "claude-sonnet-4-6";
  if (!instruksi) {
    return NextResponse.json({ error: "instruksi wajib untuk mode chat" }, { status: 400 });
  }

  const currentSvg = item.konten.svg ?? "";
  const prompt = `Kamu editor SVG matematika. Berikut soal MC + SVG saat ini:

PERTANYAAN:
${item.konten.pertanyaan}

OPSI:
${item.konten.opsi.map((o, i) => `${String.fromCharCode(65 + i)}. ${o.teks}${i === item.konten.kunci ? " [KUNCI]" : ""}`).join("\n")}

SVG SAAT INI:
${currentSvg || "(belum ada SVG)"}

INSTRUKSI USER:
${instruksi}

ATURAN REVISI:
- Hanya ubah SVG. Jangan ubah pertanyaan/opsi/kunci.
- KONSISTENSI ANGKA: jumlah elemen visual harus match angka di pertanyaan.
- Self-contained (tanpa <script>, tanpa external image/font).
- viewBox proporsional (lebar 200-500). Stroke 2-3px. Font 14-22px.
- Di dalam <text>, JANGAN pakai LaTeX. Pakai unicode (×, ÷, ≤, π, θ, x², dll).
- Output JSON murni TANPA code fence:
  { "svg": "<svg ...>...</svg>", "catatan": "ringkasan apa yang diubah (1 kalimat)" }`;

  const claude = getClaude();
  let msg;
  try {
    msg = await claude.messages.create({
      model: modelChoice,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }

  const text = msg.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n");

  let obj: unknown;
  try {
    obj = extractJson(text);
  } catch {
    return NextResponse.json(
      { error: "AI tidak return JSON valid", raw: text.slice(0, 500) },
      { status: 502 },
    );
  }
  const parsed = ResponseSchema.safeParse(obj);
  if (!parsed.success) {
    return NextResponse.json({ error: "Schema tidak valid", issues: parsed.error.issues }, { status: 502 });
  }

  return NextResponse.json({
    itemId,
    svgBefore: currentSvg,
    svgAfter: parsed.data.svg,
    catatan: parsed.data.catatan,
    modelUsed: modelChoice,
  });
}

/**
 * PUT — apply revisi SVG ke item bank.
 * Body: { itemId: string, svg: string }
 */
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const body = await req.json();
  const itemId = String(body.itemId ?? "").trim();
  const svg = String(body.svg ?? "");
  if (!itemId) return NextResponse.json({ error: "itemId wajib" }, { status: 400 });

  const item = await loadItem(itemId);
  if (!item) return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });

  const newKonten = { ...item.konten, svg: svg || undefined };
  await getAdminDb().collection("item_bank").doc(itemId).update({
    konten: newKonten,
    updatedAt: Date.now(),
  });
  return NextResponse.json({ ok: true });
}
