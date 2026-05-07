/**
 * POST /api/admin/import-item-bank/extract
 * Form-data: files (PDF), filterJenjang? ("SD"|"SMP"|"SMA"), filterKelas? (number)
 *
 * Extract soal dari PDF + auto-tag ke peta-prasyarat sub-materi kode + difficulty
 * + meta pedagogis. Return list soal untuk preview/review sebelum save.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { getClaude, pilihModel } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { PETA } from "@/data/peta-resmi";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

const OpsiSchema = z.object({
  teks: z.string(),
  benar: z.boolean(),
  alasan: z.string().optional(),
});

const MetaSchema = z.object({
  difficultyLabel: z.enum(["easy", "medium", "hard"]),
  microskill: z.string().optional(),
  subConcept: z.string().optional(),
  multiStep: z.boolean().optional(),
  analyticalSteps: z.number().int().min(1).max(5).optional(),
  reasoningQualityRequired: z.number().int().min(1).max(4).optional(),
  requiresManipulation: z.boolean().optional(),
  abstractQuestion: z.boolean().optional(),
  readingHeavy: z.boolean().optional(),
  intuitiveLeap: z.boolean().optional(),
  strongDistractor: z.boolean().optional(),
  questionCondition: z.number().int().min(1).max(5).optional(),
  expectedResponseTimeSec: z.number().int().optional(),
  patternType: z.string().nullable().optional(),
  transferType: z.string().nullable().optional(),
});

const SoalSchema = z.object({
  pertanyaan: z.string(),
  opsi: z.array(OpsiSchema).length(4),
  pembahasan: z.string().optional(),
  svg: z.string().optional(),
  subMateriKode: z.string(),
  meta: MetaSchema,
});

const Schema = z.object({ soal: z.array(SoalSchema) });

/** Bangun list sub-materi kode + nama untuk Claude prompt. */
function buildSubMateriList(filterJenjang?: string, filterKelas?: number): string {
  const filtered = PETA.submateri.filter((s) => {
    if (filterJenjang && s.jenjang !== filterJenjang) return false;
    if (filterKelas !== undefined && s.kelas !== filterKelas) return false;
    return true;
  });
  const lines: string[] = [];
  for (const s of filtered) {
    lines.push(`${s.kode} | ${s.area} | ${s.nama}`);
  }
  return lines.join("\n");
}

const VALID_KODES = new Set(PETA.submateri.map((s) => s.kode));

export async function POST(req: NextRequest) {
  try { await requireAdmin(req); } catch (e) { if (e instanceof Response) return e; throw e; }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const filterJenjang = (form.get("filterJenjang") as string) || undefined;
  const filterKelasStr = (form.get("filterKelas") as string) || undefined;
  const filterKelas = filterKelasStr ? parseInt(filterKelasStr, 10) : undefined;
  const catatan = String(form.get("catatan") ?? "");

  if (files.length === 0) {
    return NextResponse.json({ error: "Minimal 1 PDF" }, { status: 400 });
  }
  for (const f of files) {
    if (f.type !== "application/pdf") return NextResponse.json({ error: `'${f.name}' bukan PDF` }, { status: 400 });
    if (f.size > 30 * 1024 * 1024) return NextResponse.json({ error: `'${f.name}' > 30MB` }, { status: 400 });
  }

  const claude = getClaude();
  const subMateriList = buildSubMateriList(filterJenjang, filterKelas);

  const instruksi = `Ekstrak SEMUA soal pilihan ganda matematika dari PDF + auto-tag ke peta-prasyarat sub-materi.

DAFTAR SUB-MATERI YANG VALID${filterJenjang ? ` (filter: ${filterJenjang}${filterKelas ? ` K${filterKelas}` : ""})` : ""}:
(format: kode | area | nama)

${subMateriList}

Untuk TIAP soal pilihan ganda di PDF, generate JSON object dengan field:

{
  "pertanyaan": "<teks soal lengkap, pakai LaTeX $...$ untuk rumus, escape backslash double>",
  "opsi": [
    { "teks": "<opsi A>", "benar": false, "alasan": "miskonsepsi: ..." },
    { "teks": "<opsi B>", "benar": true, "alasan": "<alasan singkat mengapa benar>" },
    { "teks": "<opsi C>", "benar": false, "alasan": "miskonsepsi: ..." },
    { "teks": "<opsi D>", "benar": false, "alasan": "miskonsepsi: ..." }
  ],
  "pembahasan": "<step-by-step solusi opsional>",
  "svg": "<svg ...>...</svg> opsional kalau perlu visual, hilangkan kalau tidak",
  "subMateriKode": "<PILIH dari daftar di atas — kode yang paling sesuai konten soal>",
  "meta": {
    "difficultyLabel": "easy" | "medium" | "hard",
    "microskill": "<sub-skill snake_case e.g. substitusi_langsung>",
    "subConcept": "<sub-konsep singkat>",
    "multiStep": true | false,
    "analyticalSteps": 1-5,
    "reasoningQualityRequired": 1-4,
    "requiresManipulation": true | false,
    "abstractQuestion": true | false,
    "readingHeavy": true | false,
    "intuitiveLeap": true | false,
    "strongDistractor": true | false,
    "questionCondition": 1-5,
    "expectedResponseTimeSec": <integer detik>,
    "patternType": "<atau null>",
    "transferType": "<atau null>"
  }
}

ATURAN KETAT:
- Soal HARUS pilihan ganda 4 opsi. Skip soal isian/uraian.
- PERSIS 1 opsi "benar": true, 3 lainnya false.
- Kalau opsi salah TIDAK ada alasan miskonsepsi di PDF, GENERATE alasan miskonsepsi yang masuk akal.
- subMateriKode HARUS dari daftar di atas. Kalau tidak yakin, pilih yang paling dekat secara konten.
- difficultyLabel sesuai analisis soal: easy=procedural langsung, medium=aplikasi konsep, hard=multi-step/analisis kreatif.
- Output HANYA JSON murni (tanpa code fence/backtick).

Schema output:
{ "soal": [ {...}, {...}, ... ] }`;

  type Hasil = { file: string; soal: z.infer<typeof SoalSchema>[]; rejected?: number; error?: string };
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
                { type: "text", text: `${instruksi}\n\nFile: ${file.name}\n${catatan ? `Catatan admin: ${catatan}` : ""}` },
              ],
            },
          ],
        })
        .finalMessage();
      const text = msg.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("\n");
      const obj = extractJson(text);
      const parsed = Schema.safeParse(obj);
      if (!parsed.success) {
        // Salvage per item
        const rawArr = (obj as { soal?: unknown[] })?.soal ?? [];
        const salvage: z.infer<typeof SoalSchema>[] = [];
        for (const item of Array.isArray(rawArr) ? rawArr : []) {
          const r = SoalSchema.safeParse(item);
          if (r.success) salvage.push(r.data);
        }
        const validKode = salvage.filter((s) => VALID_KODES.has(s.subMateriKode));
        hasil.push({
          file: file.name,
          soal: validKode,
          rejected: salvage.length - validKode.length,
          error: `Schema partial fail. Salvaged ${salvage.length}/${rawArr.length}. Issue: ${parsed.error.issues[0]?.message}`,
        });
        continue;
      }
      const validKode = parsed.data.soal.filter((s) => VALID_KODES.has(s.subMateriKode));
      hasil.push({
        file: file.name,
        soal: validKode,
        rejected: parsed.data.soal.length - validKode.length,
      });
    } catch (e) {
      hasil.push({ file: file.name, soal: [], error: e instanceof Error ? e.message : "unknown" });
    }
  }

  const totalSoal = hasil.reduce((s, h) => s + h.soal.length, 0);
  const totalRejected = hasil.reduce((s, h) => s + (h.rejected ?? 0), 0);

  return NextResponse.json({ hasil, totalSoal, totalRejected });
}
