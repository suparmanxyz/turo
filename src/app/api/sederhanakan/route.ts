import { NextRequest, NextResponse } from "next/server";
import { chatRingan } from "@/lib/ai-provider";
import { audiensPrompt, DEFAULT_KATEGORI } from "@/lib/kategori-prompt";
import type { Kategori } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { soal, langkahSebelumnya, langkahIni, percobaan, kategori } = await req.json();
  if (!langkahIni) return NextResponse.json({ error: "langkahIni wajib" }, { status: 400 });
  const kat: Kategori = (kategori as Kategori) ?? DEFAULT_KATEGORI;

  const gaya =
    percobaan >= 2
      ? "SANGAT sederhana, seperti menjelaskan ke anak yang lebih kecil. Pakai analogi sehari-hari kalau bisa"
      : percobaan === 1
      ? "lebih sederhana dari sebelumnya, pecah jadi sub-langkah kecil"
      : "lebih sederhana & detail, jelaskan mengapa langkah ini dilakukan";

  const prompt = `${audiensPrompt(kat)} belum paham langkah pembahasan berikut. Jelaskan ${gaya}.

Soal: ${soal ?? "(konteks soal)"}
${langkahSebelumnya?.length ? `Langkah-langkah sebelumnya (sudah dipahami):\n${langkahSebelumnya.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}` : ""}

Langkah yang belum dipahami:
"${langkahIni}"

Jawab 1-3 kalimat saja. Pakai LaTeX $...$ kalau perlu rumus. JANGAN kasih jawaban final soal. Fokus jelaskan langkah ini saja.
Output: teks biasa (tanpa JSON, tanpa code fence).`;

  const r = await chatRingan({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 600,
  });

  return NextResponse.json({ penjelasan: r.text.trim(), _provider: r.provider });
}
