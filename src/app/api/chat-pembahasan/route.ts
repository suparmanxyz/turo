import { NextRequest, NextResponse } from "next/server";
import { chatRingan, type Pesan } from "@/lib/ai-provider";
import { audiensPrompt, audiensDariBody } from "@/lib/kategori-prompt";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { soal, langkahSebelumnya, langkahIni, penjelasanTambahan, messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages wajib" }, { status: 400 });
  }
  const audiens = audiensDariBody(body);

  const system = `Kamu adalah tutor matematika untuk ${audiensPrompt(audiens)}. Siswa sedang belajar soal ini dan terjebak di salah satu langkah pembahasan. Jawab pertanyaannya dengan sabar, ramah, dan sederhana.

SOAL:
${soal ?? "(tidak tersedia)"}

LANGKAH-LANGKAH PEMBAHASAN SEBELUMNYA (sudah dipahami):
${(langkahSebelumnya ?? []).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n") || "(belum ada)"}

LANGKAH YANG SEDANG DIJELASKAN:
${langkahIni ?? ""}

PENJELASAN TAMBAHAN YANG SUDAH DIBERIKAN:
${(penjelasanTambahan ?? []).map((p: string, i: number) => `[${i + 1}] ${p}`).join("\n") || "(belum ada)"}

ATURAN:
- Jawab singkat (2-5 kalimat), pakai bahasa Indonesia.
- Pakai LaTeX $...$ untuk rumus.
- JANGAN berikan jawaban akhir soal, hanya bantu konsep.
- Jika user tanya konsep dasar (misal "apa itu mod"), jelaskan ringkas dengan contoh sederhana.
- Jika user sudah paham, dorong untuk lanjut.`;

  const r = await chatRingan({
    system,
    messages: messages as Pesan[],
    maxTokens: 800,
  });

  return NextResponse.json({ reply: r.text, _provider: r.provider });
}
