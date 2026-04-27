/**
 * Core generation logic untuk soal MC — extracted dari /api/generate-soal-mc
 * supaya bisa di-reuse oleh seeding script & admin tools tanpa HTTP roundtrip.
 *
 * Logic identik dengan endpoint, kecuali:
 *   - Tidak handle pool cache (caller decide).
 *   - Throws Error pada kegagalan (caller handle).
 */

import "server-only";
import { z } from "zod";
import { getClaude, pilihModel } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { audiensPrompt, gayaBahasaPanduan, levelKesulitanPanduan } from "@/lib/kategori-prompt";
import type { Audiens } from "@/types";
import type { SoalMc } from "@/lib/diagnostic";

const OpsiSchema = z.object({
  teks: z.string(),
  benar: z.boolean(),
  alasan: z.string().optional(),
});

const SoalMcSchema = z.object({
  pertanyaan: z.string(),
  // Toleransi 3-5 opsi — auto-trim ke 4 di post-process supaya AI yang return 5 tidak gagal total
  opsi: z.array(OpsiSchema).min(3).max(5),
  svg: z.string().optional(),
});

const BatchSchema = z.object({
  soal: z.array(SoalMcSchema).min(1),
});

export type GenerateOpts = {
  topik: string;
  subKonsep?: string;
  level?: number;
  audiens: Audiens;
  /** Berapa soal yang dihasilkan dalam satu batch. */
  n: number;
  hindari?: string[];
};

export type GenerateResult = {
  soal: SoalMc[];
  dropped: number;
  autoFixed: number;
};

export async function generateSoalMcBatch(opts: GenerateOpts): Promise<GenerateResult> {
  const { topik, subKonsep, level, audiens, n, hindari } = opts;
  if (!topik) throw new Error("topik wajib diisi");

  const isSdBawah = audiens.kategoriUtama === "reguler" && audiens.jenjang === "sd" && (audiens.kelas ?? 0) <= 3;
  const isSd = audiens.kategoriUtama === "reguler" && audiens.jenjang === "sd";

  const fokusBaris = subKonsep ? `Fokus pada sub-konsep: "${subKonsep}".` : "";

  const gayaSvg = isSdBawah
    ? `Gaya SVG untuk anak SD kelas 1-3: KONKRET (gambar benda yang bisa dihitung, balon, apel, kotak), warna terang & ceria, label nama (Andi, Sari) bukan huruf teknis (A, B, P).`
    : isSd
    ? `Gaya SVG untuk SD kelas atas: diagram matematis sederhana dengan label (sisi, sudut, satuan), bangun datar dengan ukuran tertulis.`
    : `Gaya SVG: diagram matematis presisi & profesional, label notasi standar (titik A, B, sudut θ, sisi r), grid kalau perlu untuk koordinat.`;

  const visualRules = `GAMBAR / VISUAL (WAJIB kalau soal butuh visual — terutama GEOMETRI):

KAPAN WAJIB include "svg":
1. Soal GEOMETRI apa pun yang melibatkan bentuk: lingkaran, segitiga, segiempat, segi-banyak, bangun ruang.
2. Soal yang menyebut "pada gambar...", "perhatikan diagram...", "lihat grafik..." — kalimat seperti itu HARUS disertai SVG.
3. Grafik fungsi (linear, kuadrat, eksponensial), parabola, garis, plot titik, koordinat Kartesius.
4. Statistik visual: diagram batang/lingkaran/garis, histogram, box plot, scatter plot, piktogram.

KAPAN BOLEH skip SVG:
- Soal aritmatika murni tanpa konteks visual.
- Soal aljabar simbolik tanpa grafik.

ATURAN TEKNIS SVG:
- Self-contained (tanpa <script>, tanpa external image/font).
- viewBox proporsional. Stroke 2-3px, warna kontras tinggi. Font 14-22px.
- Di dalam <text>, JANGAN pakai LaTeX. Pakai unicode (×, ÷, ≤, π, θ, x², dll).

${gayaSvg}`;

  const prompt = `Buat ${n} soal pilihan ganda matematika untuk diagnosa kesiapan ${audiensPrompt(audiens)}. Soal akan disimpan di item bank dan random-pick untuk banyak siswa.

Topik: "${topik}"
${fokusBaris}
Level kesulitan: ${level ?? 1} (0=paling sulit, makin besar makin dasar/mudah).
${hindari?.length ? `Hindari soal yang mirip dengan: ${hindari.join(" | ")}` : ""}

GAYA BAHASA (PENTING):
${gayaBahasaPanduan(audiens)}

ATURAN KETAT:
- Soal harus realistis untuk audiens di atas.
${levelKesulitanPanduan(audiens)}
- Buat ${n} soal yang BENAR-BENAR berbeda satu sama lain — beda angka, beda konteks, beda opsi jawaban.
- Per soal: 4 opsi (A, B, C, D). PERSIS 1 opsi dengan "benar": true.
- DISTRACTOR (3 opsi salah) WAJIB merepresentasikan miskonsepsi/salah-langkah yang UMUM.
- Untuk setiap opsi, sertakan field "alasan":
  * Opsi BENAR: alasan = ringkas mengapa benar (1 kalimat).
  * Opsi SALAH: alasan = miskonsepsi spesifik yang menyebabkan siswa memilih opsi ini (1 kalimat).
- Pakai LaTeX $...$ untuk rumus${isSdBawah ? " (HINDARI LaTeX kompleks untuk SD kelas 1-3)" : ""}.
- PENTING: di dalam JSON string, escape backslash LaTeX jadi DOUBLE backslash. Contoh "$\\\\times$" untuk $\\times$.

${visualRules}

- Output HANYA JSON murni (TANPA code fence/backtick).

Schema:
{
  "soal": [
    {
      "pertanyaan": "string",
      "opsi": [
        { "teks": "...", "benar": false, "alasan": "miskonsepsi: ..." },
        { "teks": "...", "benar": true,  "alasan": "..." },
        { "teks": "...", "benar": false, "alasan": "miskonsepsi: ..." },
        { "teks": "...", "benar": false, "alasan": "miskonsepsi: ..." }
      ],
      "svg": "<svg ...>...</svg>  // OPSIONAL"
    },
    "... total ${n} soal ..."
  ]
}`;

  const claude = getClaude();
  // Pakai streaming — Anthropic API reject non-streaming kalau request bisa >10 menit
  // (max_tokens besar untuk pool size). Stream() helper accumulate ke final message.
  const stream = claude.messages.stream({
    model: pilihModel("soal", level),
    max_tokens: Math.min(60000, 3500 * n + 2000),
    messages: [{ role: "user", content: prompt }],
  });
  const msg = await stream.finalMessage();

  const text = msg.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n");

  const truncated = msg.stop_reason === "max_tokens";

  let obj: unknown;
  try {
    obj = extractJson(text);
  } catch {
    throw new Error(
      truncated
        ? `Response Claude terpotong (max_tokens). Coba kurangi n.`
        : `Claude tidak return JSON valid. Raw: ${text.slice(0, 200)}`,
    );
  }

  const parsed = BatchSchema.safeParse(obj);
  if (!parsed.success) {
    throw new Error(`Schema tidak valid: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }

  // Auto-fix opsi count
  let autoFixed = 0;
  let dropped = 0;
  const valid: SoalMc[] = [];
  for (const sRaw of parsed.data.soal) {
    // Trim ke 4 opsi: kalau 5, drop opsi salah terakhir; kalau 3, skip (drop).
    let opsi = sRaw.opsi;
    if (opsi.length > 4) {
      // Keep semua opsi benar + ambil opsi salah secukupnya sampai total 4
      const benars = opsi.filter((o) => o.benar);
      const salahs = opsi.filter((o) => !o.benar);
      const need = Math.max(0, 4 - benars.length);
      opsi = [...benars, ...salahs.slice(0, need)];
      autoFixed++;
    }
    if (opsi.length < 4) {
      dropped++;
      continue;
    }
    const s = { ...sRaw, opsi };
    const benarCount = s.opsi.filter((o) => o.benar).length;
    if (benarCount === 1) {
      valid.push(s);
    } else if (benarCount > 1) {
      let sudahKetemu = false;
      const opsiFix = s.opsi.map((o) => {
        if (o.benar && !sudahKetemu) {
          sudahKetemu = true;
          return o;
        }
        return { ...o, benar: false };
      });
      valid.push({ ...s, opsi: opsiFix });
      autoFixed++;
    } else {
      dropped++;
    }
  }

  if (valid.length === 0) {
    throw new Error(`Semua ${parsed.data.soal.length} soal invalid (0 opsi benar). dropped=${dropped}, autoFixed=${autoFixed}`);
  }

  return { soal: valid, dropped, autoFixed };
}
