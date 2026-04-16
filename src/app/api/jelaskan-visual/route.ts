import { NextRequest, NextResponse } from "next/server";
import { getClaude, pilihModel } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { audiensPrompt, DEFAULT_KATEGORI } from "@/lib/kategori-prompt";
import type { Kategori } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { konsep, konteks, kategori } = await req.json();
  if (!konsep) {
    return NextResponse.json({ error: "konsep wajib diisi" }, { status: 400 });
  }
  const kat: Kategori = (kategori as Kategori) ?? DEFAULT_KATEGORI;

  const prompt = `Jelaskan konsep matematika berikut secara VISUAL untuk ${audiensPrompt(kat)}, dengan menghasilkan SVG.
Konsep: ${konsep}
${konteks ? `Konteks: ${konteks}` : ""}

Output HANYA JSON murni (TANPA code fence/backtick):
{
  "narasi": "penjelasan singkat langkah per langkah (max 6 bullet)",
  "svg": "<svg ...>...</svg> (viewBox 0 0 400 300, gunakan warna kontras, label jelas)"
}`;

  const claude = getClaude();
  const msg = await claude.messages.create({
    model: pilihModel("visual"),
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n");

  let obj: unknown;
  try {
    obj = extractJson(text);
  } catch {
    return NextResponse.json({ error: "Claude tidak return JSON valid", raw: text }, { status: 502 });
  }
  return NextResponse.json(obj);
}
