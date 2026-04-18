import { NextRequest, NextResponse } from "next/server";
import { getClaude, pilihModel } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { audiensPrompt, levelKesulitanPanduan, audiensDariBody } from "@/lib/kategori-prompt";
import { z } from "zod";

export const runtime = "nodejs";

const OpsiSchema = z.object({
  teks: z.string(),
  benar: z.boolean(),
  alasan: z.string().optional(),
});

const SoalMcSchema = z.object({
  pertanyaan: z.string(),
  opsi: z.array(OpsiSchema).length(4),
});

const BatchSchema = z.object({
  soal: z.array(SoalMcSchema).min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { topik, subKonsep, level, hindari, n } = body;
  const audiens = audiensDariBody(body);
  if (!topik) {
    return NextResponse.json({ error: "topik wajib diisi" }, { status: 400 });
  }
  const jumlah = Math.max(1, Math.min(5, Number(n) || 1));

  const fokusBaris = subKonsep ? `Fokus pada sub-konsep: "${subKonsep}".` : "";

  const prompt = `Buat ${jumlah} soal pilihan ganda matematika untuk diagnosa kesiapan ${audiensPrompt(audiens)}.

Topik: "${topik}"
${fokusBaris}
Level kesulitan: ${level ?? 1} (0=paling sulit, makin besar makin dasar/mudah).
${hindari?.length ? `Hindari soal yang mirip dengan: ${hindari.join(" | ")}` : ""}

ATURAN KETAT untuk soal diagnostic:
- Soal harus realistis untuk audiens di atas.
${levelKesulitanPanduan(audiens)}
- Buat ${jumlah} soal yang ${jumlah > 1 ? "BERBEDA satu sama lain — beda angka, beda konteks, beda opsi jawaban. JANGAN sekedar ganti kata, harus benar-benar variasi yang berbeda." : "valid"}.
- Per soal: 4 opsi (A, B, C, D). PERSIS 1 opsi dengan "benar": true, sisanya "benar": false. JANGAN ada soal dengan 0 atau >1 opsi benar.
- DISTRACTOR (3 opsi salah) WAJIB merepresentasikan miskonsepsi/salah-langkah yang UMUM dilakukan siswa pada topik ini, BUKAN angka acak.
- Untuk setiap opsi, sertakan field "alasan":
  * Opsi BENAR: alasan = ringkas mengapa benar (1 kalimat).
  * Opsi SALAH: alasan = miskonsepsi spesifik yang menyebabkan siswa memilih opsi ini (1 kalimat). Contoh: "Lupa membalik tanda saat dikalikan negatif".
- Pakai LaTeX $...$ untuk rumus.
- PENTING: di dalam JSON string, escape backslash LaTeX jadi DOUBLE backslash. Contoh tulis "$\\\\times$" untuk $\\times$, "$\\\\frac{1}{2}$" untuk pecahan. JANGAN pakai single backslash di JSON.
- Output HANYA JSON murni (TANPA code fence/backtick).

Schema:
{
  "soal": [
    {
      "pertanyaan": "string",
      "opsi": [
        { "teks": "...", "benar": false, "alasan": "miskonsepsi: ..." },
        { "teks": "...", "benar": true,  "alasan": "..." },
        { "teks": "...", "benar": false, "alasan": "miskonsepsi: ..." },
        { "teks": "...", "benar": false, "alasan": "miskonsepsi: ..." }
      ]
    }${jumlah > 1 ? ",\n    { ... soal kedua dengan angka & konteks BEDA ... }" : ""}
  ]
}`;

  const claude = getClaude();
  let msg;
  try {
    msg = await claude.messages.create({
      model: pilihModel("soal", level),
      // Per soal MC dengan 4 distractor + alasan + LaTeX bisa 1500-3000 tokens.
      // Beri budget besar supaya tidak truncated mid-JSON.
      max_tokens: 4000 * jumlah + 1000,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    let pesan = m;
    let status = 502;
    if (m.includes("credit balance is too low")) {
      pesan = "Kredit Anthropic API habis. Top up di console.anthropic.com.";
      status = 402;
    } else if (m.includes("rate_limit") || m.includes("429")) {
      pesan = "Rate limit Anthropic. Tunggu beberapa detik lalu coba lagi.";
      status = 429;
    } else if (m.includes("overloaded") || m.includes("529")) {
      pesan = "Server Anthropic overload. Coba lagi nanti.";
      status = 503;
    }
    return NextResponse.json({ error: pesan, detail: m.slice(0, 300) }, { status });
  }

  const text = msg.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n");

  const truncated = msg.stop_reason === "max_tokens";

  let obj: unknown;
  try {
    obj = extractJson(text);
  } catch {
    return NextResponse.json(
      {
        error: truncated
          ? "Response Claude terpotong (max_tokens). Coba kurangi 'n' atau topik lebih ringkas."
          : "Claude tidak return JSON valid",
        raw: text.slice(0, 500),
        stopReason: msg.stop_reason,
      },
      { status: 502 },
    );
  }

  const parsed = BatchSchema.safeParse(obj);
  if (!parsed.success) {
    return NextResponse.json({ error: "Schema tidak valid", issues: parsed.error.issues, raw: obj }, { status: 502 });
  }

  // Filter soal yang valid (tepat 1 opsi benar). Skip yang invalid biar tidak gagal seluruh batch.
  const valid = parsed.data.soal.filter((s) => s.opsi.filter((o) => o.benar).length === 1);
  const dropped = parsed.data.soal.length - valid.length;

  if (valid.length === 0) {
    return NextResponse.json(
      { error: "Semua soal yang di-generate AI invalid (jumlah opsi benar bukan 1)", raw: parsed.data },
      { status: 502 },
    );
  }

  return NextResponse.json({ soal: valid, ...(dropped > 0 ? { _dropped: dropped } : {}) });
}
