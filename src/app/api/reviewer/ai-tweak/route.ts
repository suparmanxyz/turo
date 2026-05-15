import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrAssignedReviewer } from "@/lib/reviewer-server";
import { loadItem } from "@/lib/item-bank";
import { getClaude } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * AI tweak unified — bisa revisi field apapun (pertanyaan/opsi/kunci/pembahasan/svg)
 * berdasarkan instruksi bebas. AI auto-detect field mana yang harus berubah.
 *
 * Body: { itemId, instruksi, model?: "sonnet" | "opus",
 *         currentKonten?: partial konten yang sudah ke-edit di UI (preserve) }
 */
const OpsiSchema = z.object({
  teks: z.string(),
  benar: z.boolean().optional(),
  alasan: z.string().optional(),
});
const ResponseSchema = z.object({
  pertanyaan: z.string().optional(),
  opsi: z.array(OpsiSchema).optional(),
  kunci: z.number().int().min(0).max(4).optional(),
  pembahasan: z.string().optional(),
  svg: z.string().optional(),
  catatan: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const itemId = String(body.itemId ?? "").trim();
  if (!itemId) return NextResponse.json({ error: "itemId wajib" }, { status: 400 });

  try {
    await requireAdminOrAssignedReviewer(req, itemId);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const item = await loadItem(itemId);
  if (!item) return NextResponse.json({ error: `Item ${itemId} tidak ditemukan` }, { status: 404 });

  const instruksi = String(body.instruksi ?? "").trim();
  const modelChoice = body.model === "opus" ? "claude-opus-4-7" : "claude-sonnet-4-6";
  if (!instruksi) return NextResponse.json({ error: "instruksi wajib" }, { status: 400 });

  // Gunakan konten yang dikirim dari UI (sudah ke-edit) sebagai baseline,
  // fallback ke item dari Firestore kalau tidak ada.
  const cc = body.currentKonten ?? {};
  const baseline = {
    pertanyaan: typeof cc.pertanyaan === "string" ? cc.pertanyaan : item.konten.pertanyaan,
    opsi: Array.isArray(cc.opsi) ? cc.opsi : item.konten.opsi,
    kunci: typeof cc.kunci === "number" ? cc.kunci : item.konten.kunci,
    pembahasan: typeof cc.pembahasan === "string" ? cc.pembahasan : (item.konten.pembahasan ?? ""),
    svg: typeof cc.svg === "string" ? cc.svg : (item.konten.svg ?? ""),
  };
  const hasKatexLabel = /<foreignObject[^>]*>[\s\S]*?class="katex/.test(baseline.svg);

  const prompt = `Kamu editor soal matematika. Berikut item soal MC saat ini:

INFO: ${item.jenjang} kelas ${item.kelas} · subMateri ${item.subMateriKode} · area ${item.area}

PERTANYAAN:
${baseline.pertanyaan}

OPSI (kunci jawaban: ${String.fromCharCode(65 + baseline.kunci)}):
${baseline.opsi.map((o: { teks: string; alasan?: string }, i: number) => `${String.fromCharCode(65 + i)}. ${o.teks}${o.alasan ? ` — alasan: ${o.alasan}` : ""}`).join("\n")}

PEMBAHASAN:
${baseline.pembahasan || "(kosong)"}

${baseline.svg ? `SVG SAAT INI:
${baseline.svg}

` : ""}INSTRUKSI USER:
${instruksi}

ATURAN REVISI:
- HANYA ubah field yang user minta. JANGAN ubah field yang user tidak sebut.
- Kalau user minta "perbaiki angka di pertanyaan" → return pertanyaan saja.
- Kalau user minta "ganti opsi B" → return opsi saja (semua 4-5 opsi, dengan B berubah).
- Kalau user minta "kunci salah, harusnya C" → return kunci (sebagai angka 0-4: A=0, B=1, C=2, D=3, E=4) dan opsi (update flag benar).
- Kalau user minta "perbaiki gambar/grafik" → return svg saja.
- Bisa kombinasi (e.g. "ganti angka 5 jadi 7 di pertanyaan + opsi C") → return pertanyaan + opsi.
- Untuk opsi: selalu return SEMUA opsi (4 atau 5) dalam urutan asli, dengan field {teks, benar, alasan?}.
- Konsistensi: kalau pertanyaan berubah angkanya → cek apakah opsi & kunci masih benar. Kalau perlu, update sekalian.
- Pembahasan: kalau soal/opsi berubah, pembahasan mungkin perlu update juga. Tapi kalau user explicitly tidak minta, tinggalkan.
- Matematika: pakai KaTeX/LaTeX dalam $...$ untuk inline math (e.g. $x^2 + 2x = 0$).
${baseline.svg ? (hasKatexLabel
  ? `- ⚠ SVG punya <foreignObject class="katex"> (label fungsi). PRESERVE struktur foreignObject — hanya boleh ubah posisi x/y kalau diminta "pindah label".`
  : `- SVG <text> JANGAN pakai LaTeX. Pakai unicode (×, ÷, ≤, π, x², dll).`) : ""}
- Output JSON murni TANPA code fence:
  { "pertanyaan"?, "opsi"?, "kunci"?, "pembahasan"?, "svg"?, "catatan": "ringkasan 1 kalimat" }
- "catatan" wajib, field lain optional — hanya include yang berubah.`;

  const claude = getClaude();
  let msg;
  const delays = [1000, 3000, 6000];
  let lastError: unknown = null;
  for (let attempt = 0; attempt < delays.length + 1; attempt++) {
    try {
      const stream = claude.messages.stream({
        model: modelChoice,
        max_tokens: 24000,
        messages: [{ role: "user", content: prompt }],
      });
      msg = await stream.finalMessage();
      break;
    } catch (e) {
      lastError = e;
      const errStr = e instanceof Error ? e.message : String(e);
      const isOverload = errStr.includes("529") || errStr.includes("overloaded") || errStr.includes("rate_limit");
      if (!isOverload || attempt >= delays.length) {
        return NextResponse.json(
          { error: isOverload ? "API overloaded setelah 3x retry — coba lagi" : errStr },
          { status: 502 },
        );
      }
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  if (!msg) {
    return NextResponse.json({ error: lastError instanceof Error ? lastError.message : "Failed" }, { status: 502 });
  }

  const text = msg.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n");
  const stopReason = msg.stop_reason;
  const truncated = stopReason === "max_tokens";

  let obj: unknown;
  try {
    obj = extractJson(text);
  } catch {
    return NextResponse.json(
      {
        error: truncated
          ? "AI response truncated — coba instruksi lebih singkat atau pakai Opus"
          : "AI tidak return JSON valid",
        raw: text.slice(0, 800),
        stopReason,
      },
      { status: 502 },
    );
  }
  const parsed = ResponseSchema.safeParse(obj);
  if (!parsed.success) {
    return NextResponse.json({ error: "Schema tidak valid", issues: parsed.error.issues }, { status: 502 });
  }

  // Build changed fields list untuk display di UI
  const changedFields: string[] = [];
  if (parsed.data.pertanyaan !== undefined) changedFields.push("pertanyaan");
  if (parsed.data.opsi !== undefined) changedFields.push("opsi");
  if (parsed.data.kunci !== undefined) changedFields.push("kunci");
  if (parsed.data.pembahasan !== undefined) changedFields.push("pembahasan");
  if (parsed.data.svg !== undefined) changedFields.push("svg");

  return NextResponse.json({
    itemId,
    catatan: parsed.data.catatan,
    changedFields,
    pertanyaanAfter: parsed.data.pertanyaan,
    opsiAfter: parsed.data.opsi,
    kunciAfter: parsed.data.kunci,
    pembahasanAfter: parsed.data.pembahasan,
    svgAfter: parsed.data.svg,
    modelUsed: modelChoice,
  });
}
