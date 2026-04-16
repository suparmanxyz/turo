import { NextRequest, NextResponse } from "next/server";
import { getClaude, pilihModel } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { getAdminDb } from "@/lib/firebase-admin";
import { z } from "zod";

export const runtime = "nodejs";

const VariasiSchema = z.object({
  variasi: z
    .array(
      z.object({
        pertanyaan: z.string(),
        jawabanBenar: z.string(),
        pembahasan: z.array(z.string()),
        opsi: z.array(z.string()).optional(),
      }),
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const { soalId } = await req.json();
  if (!soalId) return NextResponse.json({ error: "soalId wajib" }, { status: 400 });

  const db = getAdminDb();
  const docRef = db.collection("soalManual").doc(soalId);
  const snap = await docRef.get();
  if (!snap.exists) return NextResponse.json({ error: "soal tidak ditemukan" }, { status: 404 });
  const asli = snap.data()!;

  const cek = await db.collection("soalManual")
    .where("originalId", "==", soalId)
    .where("sumberJenis", "==", "ai-variasi")
    .limit(2)
    .get();
  if (cek.size >= 2) {
    return NextResponse.json({
      _cached: true,
      variasi: cek.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  }

  const prompt = `Buat 2 variasi soal matematika berikut. Variasi punya struktur dan tingkat kesulitan yang SAMA, tapi angka/konteks DIUBAH. Konsep yang diuji harus identik.

Soal asli:
${asli.pertanyaan}

${asli.opsi ? `Opsi asli: ${JSON.stringify(asli.opsi)}` : ""}
${asli.jawabanBenar ? `Jawaban asli: ${asli.jawabanBenar}` : ""}
Topik: ${asli.topik ?? ""}
Materi: ${asli.materiSlug}/${asli.subMateriSlug}

ATURAN:
- Tetap pada jenjang/tingkat yang sama dengan soal asli, struktur sama, kesulitan sama.
- Ubah angka/nama/konteks supaya berbeda nyata.
- Jika asli pilihan ganda, variasi juga pilihan ganda dengan 4 opsi.
- Pembahasan SINGKAT, max 5 langkah.
- Pakai LaTeX $...$ untuk rumus.
- Output HANYA JSON murni (tanpa code fence):

{ "variasi": [
  { "pertanyaan": "...", "jawabanBenar": "...", "pembahasan": ["..."], "opsi": ["..."] },
  { "pertanyaan": "...", "jawabanBenar": "...", "pembahasan": ["..."], "opsi": ["..."] }
] }`;

  const claude = getClaude();
  const msg = await claude.messages.stream({
    model: pilihModel("soal", 1),
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  }).finalMessage();

  const text = msg.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n");

  let obj: unknown;
  try { obj = extractJson(text); } catch {
    return NextResponse.json({ error: "AI tidak return JSON valid", raw: text.slice(0, 500) }, { status: 502 });
  }
  const parsed = VariasiSchema.safeParse(obj);
  if (!parsed.success) {
    return NextResponse.json({ error: "schema invalid", issues: parsed.error.issues }, { status: 502 });
  }

  const batch = db.batch();
  const ids: string[] = [];
  for (const v of parsed.data.variasi) {
    const ref = db.collection("soalManual").doc();
    ids.push(ref.id);
    batch.set(ref, {
      ...v,
      materiSlug: asli.materiSlug,
      subMateriSlug: asli.subMateriSlug,
      topik: asli.topik ?? "",
      level: asli.level ?? 1,
      originalId: soalId,
      sumberJenis: "ai-variasi",
      sumber: `Variasi dari ${asli.sumber ?? soalId}`,
      createdAt: new Date().toISOString(),
    });
  }
  await batch.commit();

  return NextResponse.json({
    _cached: false,
    variasi: parsed.data.variasi.map((v, i) => ({ id: ids[i], ...v })),
  });
}
