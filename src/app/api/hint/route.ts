import { NextRequest, NextResponse } from "next/server";
import { chatRingan } from "@/lib/ai-provider";
import { extractJson } from "@/lib/extract-json";
import { audiensPrompt, audiensDariBody } from "@/lib/kategori-prompt";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({ petunjuk: z.array(z.string()).min(1) });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { soal } = body;
  if (!soal) return NextResponse.json({ error: "soal wajib" }, { status: 400 });
  const audiens = audiensDariBody(body);

  const prompt = `Berikan petunjuk (hint) untuk ${audiensPrompt(audiens)} yang sedang mengerjakan soal berikut.
Soal: ${soal}

ATURAN:
- JANGAN berikan jawaban akhir.
- Beri 2-4 petunjuk progresif (dari yang paling halus ke yang paling jelas).
- Tiap petunjuk singkat (1-2 kalimat).
- Pakai LaTeX $...$ kalau perlu rumus.
- Output HANYA JSON murni (tanpa code fence):
{ "petunjuk": ["hint 1 (paling halus)", "hint 2", "..."] }`;

  const r = await chatRingan({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 1500,
  });

  try {
    const obj = extractJson(r.text);
    const parsed = Schema.safeParse(obj);
    if (!parsed.success) throw new Error("schema invalid");
    return NextResponse.json({ ...parsed.data, _provider: r.provider });
  } catch {
    return NextResponse.json({ error: "AI tidak return JSON valid", raw: r.text }, { status: 502 });
  }
}
