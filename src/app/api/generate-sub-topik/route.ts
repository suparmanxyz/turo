import { NextRequest, NextResponse } from "next/server";
import { getClaude, pilihModel } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { getAdminDb } from "@/lib/firebase-admin";
import { audiensPrompt, audiensDariBody } from "@/lib/kategori-prompt";
import { z } from "zod";

export const runtime = "nodejs";

const SubTopikSchema = z.object({
  slug: z.string(),
  nama: z.string(),
  ringkasan: z.string(),
});

const ResponSchema = z.object({
  subTopik: z.array(SubTopikSchema).min(2).max(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { materiSlug, materiNama, force } = body;
  const audiens = audiensDariBody(body);
  if (!materiSlug || !materiNama) {
    return NextResponse.json({ error: "materiSlug & materiNama wajib" }, { status: 400 });
  }

  // ── Cache lookup (kecuali force=true untuk regenerate) ──
  if (!force) {
    try {
      const db = getAdminDb();
      const snap = await db.collection("subTopikCache").doc(materiSlug).get();
      if (snap.exists) {
        const data = snap.data() as { subTopik?: unknown };
        if (data?.subTopik) {
          return NextResponse.json({ subTopik: data.subTopik, _cached: true });
        }
      }
    } catch (e) {
      console.warn("subTopikCache lookup gagal, lanjut generate:", e);
    }
  }

  const prompt = `Pecah materi (bab) matematika berikut menjadi 3-5 SUB-TOPIK pembelajaran yang logis dan urut, untuk ${audiensPrompt(audiens)}.

Materi/Bab: "${materiNama}"

ATURAN:
- 3-5 sub-topik (jangan terlalu banyak; satu sub = 1 sesi belajar yang bisa dikuasai dalam 15-30 menit).
- Urutan dari pengantar/konsep dasar → aplikasi/penerapan.
- Tiap sub-topik: slug (kebab-case singkat), nama (judul human-friendly), ringkasan (1 kalimat ≤120 karakter).
- Output HANYA JSON murni (TANPA code fence/backtick).

Schema:
{
  "subTopik": [
    { "slug": "...", "nama": "...", "ringkasan": "..." },
    { "slug": "...", "nama": "...", "ringkasan": "..." }
  ]
}`;

  const claude = getClaude();
  const msg = await claude.messages.create({
    model: pilihModel("peta"),
    max_tokens: 1500,
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
    return NextResponse.json({ error: "Schema tidak valid", issues: parsed.error.issues, raw: obj }, { status: 502 });
  }

  // Save cache (best-effort)
  try {
    const db = getAdminDb();
    await db.collection("subTopikCache").doc(materiSlug).set({
      subTopik: parsed.data.subTopik,
      materiNama,
      kategoriUtama: audiens.kategoriUtama,
      jenjang: audiens.jenjang ?? null,
      kelas: audiens.kelas ?? null,
      createdAt: Date.now(),
    });
  } catch (e) {
    console.warn("subTopikCache save gagal:", e);
  }

  return NextResponse.json(parsed.data);
}
