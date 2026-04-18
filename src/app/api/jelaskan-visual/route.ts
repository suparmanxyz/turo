import { NextRequest, NextResponse } from "next/server";
import { getClaude, pilihModel } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { getAdminDb } from "@/lib/firebase-admin";
import { visualCacheKey } from "@/lib/cache-key";
import { audiensPrompt, audiensDariBody } from "@/lib/kategori-prompt";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { konsep, konteks } = body;
  if (!konsep) {
    return NextResponse.json({ error: "konsep wajib diisi" }, { status: 400 });
  }
  const audiens = audiensDariBody(body);

  // ── Cache lookup ──
  const cacheKey = visualCacheKey({ konsep, konteks, audiens });
  try {
    const db = getAdminDb();
    const snap = await db.collection("visualCache").doc(cacheKey).get();
    if (snap.exists) {
      const data = snap.data() as { hasil?: unknown };
      if (data?.hasil) {
        return NextResponse.json({ ...(data.hasil as object), _cached: true });
      }
    }
  } catch (e) {
    console.warn("visualCache lookup gagal, lanjut generate:", e);
  }

  const prompt = `Jelaskan konsep matematika berikut secara VISUAL untuk ${audiensPrompt(audiens)}, dengan menghasilkan SVG.
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

  // ── Save to cache (best-effort) ──
  try {
    const db = getAdminDb();
    await db.collection("visualCache").doc(cacheKey).set({
      hasil: obj,
      konsep,
      konteksPreview: typeof konteks === "string" ? konteks.slice(0, 200) : null,
      kategoriUtama: audiens.kategoriUtama,
      jenjang: audiens.jenjang ?? null,
      kelas: audiens.kelas ?? null,
      createdAt: Date.now(),
    });
  } catch (e) {
    console.warn("visualCache save gagal:", e);
  }

  return NextResponse.json(obj);
}
