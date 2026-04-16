import { NextRequest, NextResponse } from "next/server";
import { getClaude, pilihModel } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { audiensPrompt, jenjangSingkat, DEFAULT_KATEGORI } from "@/lib/kategori-prompt";
import type { Kategori } from "@/types";
import { z } from "zod";

export const runtime = "nodejs";

const NodeSchema = z.object({
  id: z.string(),
  topik: z.string(),
  level: z.number().int().min(0),
  prasyarat: z.array(z.string()),
});

const ResponSchema = z.object({
  rootId: z.string(),
  nodes: z.array(NodeSchema),
});

export async function POST(req: NextRequest) {
  const { subMateri, soalTarget, kategori } = await req.json();
  if (!subMateri || typeof subMateri !== "string") {
    return NextResponse.json({ error: "subMateri wajib diisi" }, { status: 400 });
  }
  const kat: Kategori = (kategori as Kategori) ?? DEFAULT_KATEGORI;

  const prompt = `Kamu adalah guru matematika Indonesia yang mengajar ${audiensPrompt(kat)}.
Buat peta prasyarat untuk menyelesaikan SOAL SPESIFIK berikut (bukan peta umum topik).

Sub-materi: "${subMateri}"
${soalTarget ? `Soal target (level 0):\n${soalTarget}` : ""}

Aturan:
- Level 0 = kemampuan menyelesaikan soal target di atas (root).
- Level 1 = prasyarat konsep langsung yang dibutuhkan untuk menyelesaikan soal target.
- Level 2 = prasyarat dari level 1.
- Lanjutkan sampai konsep paling dasar yang pasti sudah dikuasai audiens di awal jenjang (${jenjangSingkat(kat)}).
- Setiap node: id unik (kebab-case), topik spesifik, level (int), daftar id prasyarat.
- Maksimal 10 node.
- Output HANYA JSON murni (TANPA code fence/backtick, TANPA teks tambahan).

Schema:
{
  "rootId": "string",
  "nodes": [ { "id": "string", "topik": "string", "level": 0, "prasyarat": ["..."] } ]
}`;

  const claude = getClaude();
  const msg = await claude.messages.create({
    model: pilihModel("peta"),
    max_tokens: 3000,
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

  const parsed = ResponSchema.safeParse(obj);
  if (!parsed.success) {
    return NextResponse.json({ error: "Schema tidak valid", issues: parsed.error.issues }, { status: 502 });
  }

  return NextResponse.json(parsed.data);
}
