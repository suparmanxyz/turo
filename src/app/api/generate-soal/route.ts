import { NextRequest, NextResponse } from "next/server";
import { getClaude, pilihModel } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { getAdminDb } from "@/lib/firebase-admin";
import { audiensPrompt, levelKesulitanPanduan, DEFAULT_KATEGORI } from "@/lib/kategori-prompt";
import type { Kategori } from "@/types";
import { z } from "zod";

export const runtime = "nodejs";

const SoalSchema = z.object({
  pertanyaan: z.string(),
  jawabanBenar: z.string(),
  pembahasan: z.array(z.string()),
  opsi: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const { topik, level, hindari, materiSlug, subMateriSlug, hindariIds, kategori } = await req.json();
  const kat: Kategori = (kategori as Kategori) ?? DEFAULT_KATEGORI;
  if (!topik) {
    return NextResponse.json({ error: "topik wajib diisi" }, { status: 400 });
  }

  if (materiSlug && subMateriSlug) {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection("soalManual")
        .where("materiSlug", "==", materiSlug)
        .where("subMateriSlug", "==", subMateriSlug)
        .limit(100)
        .get();
      const exclude: string[] = Array.isArray(hindariIds) ? hindariIds : [];
      const tersedia = snap.docs.filter((d) => !exclude.includes(d.id));
      if (tersedia.length > 0) {
        const pilih = tersedia[Math.floor(Math.random() * tersedia.length)];
        const data = pilih.data();
        return NextResponse.json({
          pertanyaan: data.pertanyaan,
          jawabanBenar: data.jawabanBenar ?? "",
          pembahasan: Array.isArray(data.pembahasan) ? data.pembahasan : [],
          opsi: Array.isArray(data.opsi) ? data.opsi : undefined,
          _id: pilih.id,
          _sumber: "manual",
          _sumberFile: data.sumber,
        });
      }
    } catch (e) {
      console.error("Firestore lookup gagal, fallback ke Claude:", e);
    }
  }

  const prompt = `Buat 1 soal matematika untuk ${audiensPrompt(kat)}.
Topik: "${topik}"
Level kesulitan: ${level ?? 1} (0=paling sulit, makin besar makin dasar/mudah).
${hindari?.length ? `Hindari soal yang mirip dengan: ${hindari.join(" | ")}` : ""}

ATURAN KETAT:
- Soal harus realistis untuk audiens di atas, tidak melampaui kemampuan wajarnya.
${levelKesulitanPanduan(kat)}
- Pembahasan: maksimal 5 langkah, tiap langkah SINGKAT (1-2 kalimat).
- Output HANYA JSON murni, TANPA code fence (tanpa backtick), TANPA teks penjelasan di luar JSON.

Skema JSON:
{
  "pertanyaan": "string (pakai LaTeX $...$ untuk rumus)",
  "jawabanBenar": "string (angka/ekspresi singkat)",
  "pembahasan": ["langkah 1", "langkah 2", "..."],
  "opsi": ["opsi A", "opsi B", "opsi C", "opsi D"]
}`;

  const claude = getClaude();
  const msg = await claude.messages.create({
    model: pilihModel("soal", level),
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

  const parsed = SoalSchema.safeParse(obj);
  if (!parsed.success) {
    return NextResponse.json({ error: "Schema tidak valid", issues: parsed.error.issues }, { status: 502 });
  }

  return NextResponse.json({ ...parsed.data, _sumber: "ai-generated" });
}
