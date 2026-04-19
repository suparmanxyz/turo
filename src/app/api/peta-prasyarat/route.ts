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
  kelasEstimasi: z.number().int().min(1).max(12).optional(),
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

  const kelasTarget = audiens.kategoriUtama === "reguler" && audiens.kelas ? audiens.kelas : null;

  // Adaptive depth based on kelas target
  const depthGuide = !kelasTarget
    ? "USAHAKAN 3-5 level kedalaman."
    : kelasTarget <= 2
    ? "Untuk kelas SD bawah ini, peta CUKUP DANGKAL: 1-3 level total. Konsep sangat dasar (counting, recognition). Boleh peta cuma punya 1 level (root saja) kalau memang konsep paling fundamental tanpa prasyarat formal."
    : kelasTarget <= 6
    ? "USAHAKAN 2-4 level kedalaman. Konsep SD masih dekat dengan kemampuan dasar — jangan paksa peta dalam kalau memang prasyaratnya pendek."
    : "USAHAKAN 3-5 level kedalaman untuk SMP/SMA — konsep biasanya butuh banyak prasyarat dari kelas-kelas sebelumnya.";

  const kelasGuide = !kelasTarget
    ? ""
    : kelasTarget <= 2
    ? `Untuk target kelas ${kelasTarget}, kelasEstimasi level 0 = ${kelasTarget}. Level 1+ boleh tetap kelas ${kelasTarget} (kalau berupa sub-konsep prasyarat dalam materi yang sama, e.g., counting 1-5 sebelum 1-10) ATAU di-skip kalau memang tidak ada prasyarat formal.`
    : `Untuk target kelas ${kelasTarget}: kelasEstimasi level 0 = ${kelasTarget}. Level 1 typically ≤ ${kelasTarget - 1}. Level 2 lebih rendah lagi. WAJIB MENURUN saat level naik (kecuali sub-konsep dari materi yang sama di kelas yang sama).`;

  const prompt = `Kamu adalah guru matematika Indonesia yang mengajar ${audiensPrompt(audiens)}.
Buat PETA PRASYARAT untuk konsep berikut. PRASYARAT ARTINYA: konsep dari kelas/materi SEBELUMNYA yang harus dikuasai DULU sebelum bisa pelajari konsep di level atasnya.

Konsep target: "${subMateri}"${kelasTarget ? ` (kelas ${kelasTarget})` : ""}
${soalTarget ? `Soal contoh:\n${soalTarget}` : ""}

⚠️ ATURAN SEMANTIK PRASYARAT (PALING PENTING):
- "Prasyarat" BUKAN "sub-bab dari materi target". Misal kalau target = "Bilangan Bulat (kelas 7)", JANGAN bikin level 1 = "Operasi Bilangan Bulat", "Konsep Bilangan Bulat", "Sifat Operasi Bilangan Bulat" — semua itu sub-bab DARI MATERI TARGET ITU SENDIRI, BUKAN prasyarat.
- "Prasyarat" = konsep dari MATERI/KELAS LEBIH RENDAH yang harus dikuasai dulu (atau konsep mendasar yang sama di materi serupa di kelas sebelumnya).
  Contoh BENAR untuk "Bilangan Bulat (kelas 7)":
    L1 = ["Bilangan Cacah & Operasinya (kelas 6)", "Bilangan Negatif & Garis Bilangan (kelas 6)"]
    L2 = "Penjumlahan Pengurangan ≤1000 (kelas 4)"
    L3 = "Penjumlahan dasar (kelas 2-3)"

Aturan struktur:
- Level 0 (root) = konsep target ITU SENDIRI. HANYA 1 node level 0.
- Level 1+ = prasyarat — dari materi/kelas yang lebih dasar.
- ${depthGuide}
- ${kelasGuide}
- Untuk konsep PALING DASAR (e.g., kelas 1 counting 1-10), boleh peta cuma 1 node (root saja, tanpa prasyarat). Jangan paksa generate prasyarat artificial.
- Maksimal 25 nodes total.
- Output HANYA JSON murni (TANPA code fence/backtick, TANPA teks tambahan).

DAFTAR BAB DI SISTEM (untuk soft-link, semua kelas yang relevan):
${babList}

Per node:
- "id": unik kebab-case
- "topik": deskripsi konsep (sebut konteks kelas-nya kalau perlu)
- "level": int 0,1,2,...
- "prasyarat": daftar id node yang HARUS dikuasai dulu (boleh empty array untuk node terdasar)
- "subKonsep": 2-4 sub-konsep testable di dalam topik
- "linkedSlug": optional, kalau match bab di daftar
- "kelasEstimasi" (1-12): kelas tempat konsep diajarkan

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
      "linkedSlug": "slug-bab-kalau-match",
      "kelasEstimasi": 5
    }
  ]
}`;

  const claude = getClaude();

  /** Generate sekali — return parsed atau null kalau fail. */
  async function generateOnce(extraHint?: string): Promise<{ ok: true; data: z.infer<typeof ResponSchema> } | { ok: false; rawSnippet: string; reason: string }> {
    try {
      const msg = await claude.messages.create({
        model: pilihModel("peta"),
        max_tokens: 6000,
        messages: [{ role: "user", content: prompt + (extraHint ? `\n\n${extraHint}` : "") }],
      });
      const text = msg.content
        .filter((c) => c.type === "text")
        .map((c) => (c as { text: string }).text)
        .join("\n");
      let obj: unknown;
      try {
        obj = extractJson(text);
      } catch {
        return { ok: false, rawSnippet: text.slice(0, 300), reason: "JSON tidak valid" };
      }
      const parsed = ResponSchema.safeParse(obj);
      if (!parsed.success) {
        return { ok: false, rawSnippet: JSON.stringify(parsed.error.issues).slice(0, 300), reason: "Schema invalid" };
      }
      return { ok: true, data: parsed.data };
    } catch (e) {
      return { ok: false, rawSnippet: e instanceof Error ? e.message : String(e), reason: "Exception" };
    }
  }

  // Coba generate, retry sekali kalau fail
  let result = await generateOnce();
  if (!result.ok) {
    console.warn("peta gen pertama fail:", result.reason, result.rawSnippet);
    result = await generateOnce(`SEBELUMNYA gagal: ${result.reason}. Pastikan output adalah JSON valid persis sesuai schema. Kalau konsep terlalu dasar (kelas 1-2) dan tidak ada prasyarat formal, BOLEH return cuma 1 node (root saja) dengan prasyarat kosong.`);
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.reason, raw: result.rawSnippet }, { status: 502 });
  }
  const parsed = { data: result.data };

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
