import { NextRequest, NextResponse } from "next/server";
import { getClaude, pilihModel } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { getAdminDb } from "@/lib/firebase-admin";
import { DAFTAR_MATERI, taksonomiUntukPrompt } from "@/data/materi";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

const OpsiRaw = z.union([
  z.array(z.string()),
  z.array(z.object({ teks: z.string() }).passthrough()).transform((arr) => arr.map((o) => o.teks)),
]);
const PembahasanRaw = z.union([
  z.array(z.string()),
  z.string().transform((s) => s.split(/\n{2,}|\n(?=\s*\d+[\.\)])/).map((x) => x.trim()).filter(Boolean)),
]);
const LevelRaw = z.union([z.number(), z.string()]).transform((v) => {
  if (typeof v === "number") return Math.max(0, Math.min(3, Math.floor(v)));
  const s = v.toLowerCase();
  if (/nasional|\bosn\b|\bksn\b/.test(s)) return 0;
  if (/provinsi|\bksp\b|\bosp\b/.test(s)) return 1;
  if (/kabupaten|\bosk\b|\bksk\b/.test(s)) return 2;
  if (/sulit|hard|olimpiade/.test(s)) return 0;
  if (/sedang|medium/.test(s)) return 1;
  if (/mudah|easy|dasar/.test(s)) return 2;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(3, n)) : 1;
});

const SoalItem = z.object({
  pertanyaan: z.string(),
  jawabanBenar: z.union([z.string(), z.number()]).optional().transform((v) => String(v ?? "")),
  pembahasan: PembahasanRaw.optional().default([]),
  opsi: OpsiRaw.optional(),
  materiSlug: z.string(),
  subMateriSlug: z.string(),
  topik: z.string().optional().default(""),
  level: LevelRaw.optional().default(1),
});
const Schema = z.object({ soal: z.array(SoalItem) });

const SLUG_VALID = new Set<string>();
for (const m of DAFTAR_MATERI) {
  for (const s of m.subMateri) SLUG_VALID.add(`${m.slug}/${s.slug}`);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const catatan = String(form.get("catatan") ?? "");
  const simpan = String(form.get("simpan") ?? "false") === "true";

  if (files.length === 0) {
    return NextResponse.json({ error: "Minimal 1 file PDF" }, { status: 400 });
  }
  for (const f of files) {
    if (f.type !== "application/pdf") {
      return NextResponse.json({ error: `File '${f.name}' bukan PDF` }, { status: 400 });
    }
    if (f.size > 30 * 1024 * 1024) {
      return NextResponse.json({ error: `File '${f.name}' > 30MB` }, { status: 400 });
    }
  }

  const claude = getClaude();
  const taksonomi = taksonomiUntukPrompt();

  const instruksiBase = `Ekstrak SEMUA soal matematika dari PDF ini untuk aplikasi belajar matematika multi-jenjang (SD, SMP, SMA, SNBT, olimpiade) Indonesia.

TAKSONOMI MATERI (WAJIB dipakai untuk klasifikasi):
${taksonomi}

Untuk TIAP soal, tentukan:
- pertanyaan: teks lengkap dengan LaTeX $...$ untuk rumus
- jawabanBenar: kunci jawaban kalau ada di PDF, kalau tidak kosongkan ""
- pembahasan: array langkah pembahasan kalau ada, kalau tidak []
- opsi: array pilihan ganda kalau ada
- materiSlug: PILIH DARI SLUG MATERI DI ATAS (misal "bilangan", "aljabar")
- subMateriSlug: PILIH DARI SUB-SLUG YANG SESUAI (misal "kpk-fpb")
- topik: ringkasan topik spesifik (1-3 kata, misal "Teorema Pythagoras")
- level: 0 (nasional/OSN hardest) / 1 (provinsi) / 2 (kabupaten) / 3 (sekolah)

ATURAN KETAT:
- materiSlug + subMateriSlug HARUS kombinasi valid sesuai taksonomi di atas.
- Jika tidak cocok mana pun, pakai "lainnya" + "belum-terklasifikasi".
- opsi HARUS array of string biasa, BUKAN object. Contoh: ["216", "215", "209", "208"].
- pembahasan HARUS array of string, tiap elemen 1 langkah singkat (max 2 kalimat). MAX 6 langkah.
- JANGAN tulis "periksa ulang" atau pembahasan berulang. Langsung ke jawaban final.
- level HARUS angka (0=nasional, 1=provinsi, 2=kabupaten, 3=sekolah).
- Output HANYA JSON murni (TANPA code fence/backtick/teks tambahan).

CONTOH FORMAT SATU SOAL:
{
  "pertanyaan": "Nilai dari $N(6^3, 6^4, 6^6)$ adalah...",
  "opsi": ["216", "215", "209", "208"],
  "jawabanBenar": "C",
  "pembahasan": ["Batas bawah: $216k > 1296 \\\\Rightarrow k \\\\geq 7$.", "Batas atas: $216k < 46656 \\\\Rightarrow k \\\\leq 215$.", "Banyaknya: $215 - 7 + 1 = 209$."],
  "materiSlug": "bilangan",
  "subMateriSlug": "keterbagian",
  "topik": "Kelipatan",
  "level": 2
}

Output:
{ "soal": [ {...}, {...} ] }`;

  type Hasil = { file: string; soal: z.infer<typeof SoalItem>[]; error?: string };
  const hasil: Hasil[] = [];

  for (const file of files) {
    try {
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const msg = await claude.messages
        .stream({
          model: pilihModel("ekstrak-pdf"),
          max_tokens: 32000,
          messages: [
            {
              role: "user",
              content: [
                { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
                {
                  type: "text",
                  text: `${instruksiBase}\n\nNama file: ${file.name}\n${catatan ? `Catatan: ${catatan}` : ""}`,
                },
              ],
            },
          ],
        })
        .finalMessage();
      const text = msg.content
        .filter((c) => c.type === "text")
        .map((c) => (c as { text: string }).text)
        .join("\n");
      const truncated = msg.stop_reason === "max_tokens";
      const obj = extractJson(text);
      const parsed = Schema.safeParse(obj);
      if (!parsed.success) {
        const rawArr = (obj as { soal?: unknown[] })?.soal ?? [];
        const salvage: z.infer<typeof SoalItem>[] = [];
        for (const item of Array.isArray(rawArr) ? rawArr : []) {
          const r = SoalItem.safeParse(item);
          if (r.success) salvage.push(r.data);
        }
        hasil.push({
          file: file.name,
          soal: salvage.map((s) => {
            const combo = `${s.materiSlug}/${s.subMateriSlug}`;
            return SLUG_VALID.has(combo) ? s : { ...s, materiSlug: "lainnya", subMateriSlug: "belum-terklasifikasi" };
          }),
          error: `Schema sebagian invalid (salvage ${salvage.length} soal). ${truncated ? "Output ter-truncate di max_tokens." : ""} Issue pertama: ${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}`,
        });
        continue;
      }
      const soalValid = parsed.data.soal.map((s) => {
        const combo = `${s.materiSlug}/${s.subMateriSlug}`;
        if (!SLUG_VALID.has(combo)) {
          return { ...s, materiSlug: "lainnya", subMateriSlug: "belum-terklasifikasi" };
        }
        return s;
      });
      hasil.push({
        file: file.name,
        soal: soalValid,
        error: truncated ? "⚠ Output ter-truncate di max_tokens, mungkin ada soal yang terpotong di akhir." : undefined,
      });
    } catch (e) {
      hasil.push({ file: file.name, soal: [], error: e instanceof Error ? e.message : "unknown" });
    }
  }

  const semuaSoal = hasil.flatMap((h) => h.soal.map((s) => ({ ...s, sumber: h.file })));

  let disimpan = 0;
  if (simpan && semuaSoal.length > 0) {
    try {
      const db = getAdminDb();
      const batchSize = 400;
      for (let i = 0; i < semuaSoal.length; i += batchSize) {
        const batch = db.batch();
        for (const s of semuaSoal.slice(i, i + batchSize)) {
          const ref = db.collection("soalManual").doc();
          batch.set(ref, { ...s, sumberJenis: "pdf-import", createdAt: new Date().toISOString() });
        }
        await batch.commit();
      }
      disimpan = semuaSoal.length;
    } catch (e) {
      return NextResponse.json(
        { hasil, total: semuaSoal.length, disimpan: 0, error: `Gagal simpan: ${e instanceof Error ? e.message : e}` },
      );
    }
  }

  const ringkasanPer: Record<string, number> = {};
  for (const s of semuaSoal) {
    const key = `${s.materiSlug}/${s.subMateriSlug}`;
    ringkasanPer[key] = (ringkasanPer[key] ?? 0) + 1;
  }

  return NextResponse.json({
    hasil,
    total: semuaSoal.length,
    disimpan,
    ringkasanPer,
  });
}
