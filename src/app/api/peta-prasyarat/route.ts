import { NextRequest, NextResponse } from "next/server";
import { getClaude, pilihModel } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { getAdminDb } from "@/lib/firebase-admin";
import { petaCacheKey } from "@/lib/cache-key";
import { audiensPrompt, jenjangSingkat, audiensDariBody } from "@/lib/kategori-prompt";
import { DAFTAR_MATERI } from "@/data/materi";
import { z } from "zod";

export const runtime = "nodejs";

const NodeSchema = z.object({
  id: z.string(),
  topik: z.string(),
  level: z.number().int().min(0),
  prasyarat: z.array(z.string()),
  subKonsep: z.array(z.string()).optional(),
  linkedSlug: z.string().optional(),
});

const ResponSchema = z.object({
  rootId: z.string(),
  nodes: z.array(NodeSchema),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { subMateri, soalTarget } = body;
  if (!subMateri || typeof subMateri !== "string") {
    return NextResponse.json({ error: "subMateri wajib diisi" }, { status: 400 });
  }
  const audiens = audiensDariBody(body);

  // ── Daftar bab kandidat untuk soft-linking (filter relevant per audiens) ──
  const babKandidat = DAFTAR_MATERI.filter((m) => {
    if (audiens.kategoriUtama && m.kategoriUtama !== audiens.kategoriUtama) return false;
    if (audiens.kategoriUtama === "reguler") {
      // Untuk reguler: bab di jenjang yang sama atau jenjang lebih rendah (prasyarat bisa dari kelas sebelumnya)
      if (audiens.jenjang === "sma") return true; // semua reguler bisa
      if (audiens.jenjang === "smp") return m.jenjang === "sd" || m.jenjang === "smp";
      if (audiens.jenjang === "sd") return m.jenjang === "sd";
    }
    return true;
  }).map((m) => ({
    slug: m.slug,
    nama: m.nama,
    kelas: m.kelas,
  }));

  // ── Cache lookup (skip kalau force=true) ──
  const cacheKey = petaCacheKey({ subMateri, soalTarget, audiens });
  if (!body.force) {
    try {
      const db = getAdminDb();
      const snap = await db.collection("petaCache").doc(cacheKey).get();
      if (snap.exists) {
        const data = snap.data() as { peta?: unknown };
        if (data?.peta) {
          return NextResponse.json({ ...(data.peta as object), _cached: true });
        }
      }
    } catch (e) {
      console.warn("petaCache lookup gagal, lanjut generate:", e);
    }
  }

  const babList = babKandidat
    .slice(0, 120) // batasi biar prompt tidak terlalu besar
    .map((b) => `  - ${b.slug}${b.kelas ? ` (kelas ${b.kelas})` : ""}: ${b.nama}`)
    .join("\n");

  const prompt = `Kamu adalah guru matematika Indonesia yang mengajar ${audiensPrompt(audiens)}.
Buat peta prasyarat untuk menyelesaikan SOAL SPESIFIK berikut (bukan peta umum topik).

Sub-materi: "${subMateri}"
${soalTarget ? `Soal target (level 0):\n${soalTarget}` : ""}

Aturan:
- Level 0 = kemampuan menyelesaikan soal target di atas (root).
- Level 1 = prasyarat konsep langsung yang dibutuhkan untuk menyelesaikan soal target.
- Level 2 = prasyarat dari level 1.
- Lanjutkan sampai konsep paling dasar yang pasti sudah dikuasai audiens di awal jenjang (${jenjangSingkat(audiens)}).
- Setiap node: id unik (kebab-case), topik spesifik, level (int), daftar id prasyarat, dan subKonsep (2-4 sub-konsep yang testable dalam topik tsb).
- Maksimal 25 node.
- Output HANYA JSON murni (TANPA code fence/backtick, TANPA teks tambahan).

DAFTAR BAB DI SISTEM (untuk soft-link):
${babList}

Untuk setiap node, kalau topik node BENAR-BENAR cocok dengan salah satu bab di daftar di atas (bukan sekedar mirip nama), isi field "linkedSlug" dengan slug bab tsb. Kalau tidak yakin/konseptual general, JANGAN isi linkedSlug (biarkan kosong).

Schema:
{
  "rootId": "string",
  "nodes": [
    {
      "id": "string",
      "topik": "string",
      "level": 0,
      "prasyarat": ["..."],
      "subKonsep": ["sub konsep 1", "sub konsep 2"],
      "linkedSlug": "slug-bab-kalau-match"
    }
  ]
}`;

  const claude = getClaude();
  const msg = await claude.messages.create({
    model: pilihModel("peta"),
    max_tokens: 6000,
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

  // ── Save to cache (best-effort, don't block response) ──
  try {
    const db = getAdminDb();
    await db.collection("petaCache").doc(cacheKey).set({
      peta: parsed.data,
      subMateri,
      soalTargetPreview: typeof soalTarget === "string" ? soalTarget.slice(0, 200) : null,
      kategoriUtama: audiens.kategoriUtama,
      jenjang: audiens.jenjang ?? null,
      kelas: audiens.kelas ?? null,
      createdAt: Date.now(),
    });
  } catch (e) {
    console.warn("petaCache save gagal:", e);
  }

  return NextResponse.json(parsed.data);
}
