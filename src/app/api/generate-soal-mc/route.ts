import { NextRequest, NextResponse } from "next/server";
import { getClaude, pilihModel } from "@/lib/claude";
import { extractJson } from "@/lib/extract-json";
import { audiensPrompt, gayaBahasaPanduan, levelKesulitanPanduan, audiensDariBody } from "@/lib/kategori-prompt";
import {
  incrementUsed,
  isPoolValid,
  loadPool,
  pickRandom,
  POOL_SIZE,
  savePool,
  soalPoolKey,
} from "@/lib/soal-pool";
import { z } from "zod";

export const runtime = "nodejs";

const OpsiSchema = z.object({
  teks: z.string(),
  benar: z.boolean(),
  alasan: z.string().optional(),
});

const SoalMcSchema = z.object({
  pertanyaan: z.string(),
  opsi: z.array(OpsiSchema).length(4),
  svg: z.string().optional(),
});

const BatchSchema = z.object({
  soal: z.array(SoalMcSchema).min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { topik, subKonsep, level, hindari, n, force } = body;
  const audiens = audiensDariBody(body);
  if (!topik) {
    return NextResponse.json({ error: "topik wajib diisi" }, { status: 400 });
  }
  const jumlah = Math.max(1, Math.min(POOL_SIZE, Number(n) || 1));

  // ── Cek pool dulu ──
  const poolKey = soalPoolKey({ topik, subKonsep, level: level ?? 1, audiens });
  if (!force) {
    const existing = await loadPool(poolKey);
    if (isPoolValid(existing) && existing.pool.length >= jumlah) {
      const picked = pickRandom(existing.pool, jumlah);
      // Increment usedCount async (don't block response)
      incrementUsed(poolKey, jumlah).catch((e) => console.warn(e));
      return NextResponse.json({ soal: picked, _fromPool: true, _poolUsed: existing.usedCount });
    }
  }

  // ── Pool miss/expired → generate batch POOL_SIZE biar sekali fill bisa serve banyak request ──
  const jumlahGenerate = POOL_SIZE;

  const fokusBaris = subKonsep ? `Fokus pada sub-konsep: "${subKonsep}".` : "";
  const isSdBawah = audiens.kategoriUtama === "reguler" && audiens.jenjang === "sd" && (audiens.kelas ?? 0) <= 3;
  const isSd = audiens.kategoriUtama === "reguler" && audiens.jenjang === "sd";

  const gayaSvg = isSdBawah
    ? `Gaya SVG untuk anak SD kelas 1-3: KONKRET (gambar benda yang bisa dihitung, balon, apel, kotak), warna terang & ceria, label nama (Andi, Sari) bukan huruf teknis (A, B, P).`
    : isSd
    ? `Gaya SVG untuk SD kelas atas: diagram matematis sederhana dengan label (sisi, sudut, satuan), bangun datar dengan ukuran tertulis.`
    : `Gaya SVG: diagram matematis presisi & profesional, label notasi standar (titik A, B, sudut θ, sisi r), grid kalau perlu untuk koordinat.`;

  const visualRules = `GAMBAR / VISUAL (WAJIB kalau soal butuh visual — terutama GEOMETRI):

KAPAN WAJIB include "svg":
1. Soal GEOMETRI apa pun yang melibatkan bentuk: lingkaran, segitiga, segiempat, segi-banyak, bangun ruang (kubus, balok, prisma, tabung, kerucut, bola), sudut, garis sejajar/transversal, transformasi (refleksi/rotasi/translasi/dilatasi), kongruensi/kesebangunan.
2. Soal yang menyebut "pada gambar...", "perhatikan diagram...", "lihat grafik..." — kalimat seperti itu HARUS disertai SVG, bukan hanya teks.
3. Grafik fungsi (linear, kuadrat, eksponensial), parabola, garis, plot titik, koordinat Kartesius.
4. Statistik visual: diagram batang, diagram lingkaran (pie), diagram garis, histogram, box plot, scatter plot, piktogram, tabel frekuensi.
5. ${isSd ? "Untuk SD: visualisasi pembagian/perkalian (kelompok benda, array), pecahan (bagian dari lingkaran/persegi), garis bilangan, jam analog." : "Pola visual, jaring-jaring bangun ruang, irisan bidang."}

KAPAN BOLEH skip SVG:
- Soal aritmatika murni tanpa konteks visual (hitung 12 + 47).
- Soal aljabar simbolik tanpa grafik (selesaikan persamaan).
- Soal teori (kapan suatu fungsi disebut linear).

ATURAN TEKNIS SVG:
- Self-contained (tanpa <script>, tanpa external image/font).
- viewBox proporsional dengan konten (lebar max 400, tinggi sesuai). Jangan terlalu kecil.
- Stroke 2-3px, warna kontras tinggi. Font 14-22px.
- Label angka/titik penting dengan <text>.
- PENTING: di dalam SVG <text>, JANGAN pakai LaTeX ($..$, \\frac, \\times, dll). SVG tidak render LaTeX. Pakai:
  * Plain text/angka biasa: "−5", "P", "Q", "12 cm", "60°"
  * Unicode untuk simbol: × (×), ÷ (÷), ≤ (≤), ≥ (≥), √ (√), π (π), θ (θ), α (α), β (β)
  * Pangkat pakai unicode: x² (x²), x³ (x³), aⁿ (aⁿ)
  * Pecahan tulis verbal: "1/2" atau pisah jadi 2 baris dengan garis horizontal <line>
- Untuk geometri: WAJIB cantumkan ukuran/satuan yang relevan (jari-jari, panjang sisi, sudut) sebagai label PLAIN TEXT.

${gayaSvg}`;

  const prompt = `Buat ${jumlahGenerate} soal pilihan ganda matematika untuk diagnosa kesiapan ${audiensPrompt(audiens)}. Soal akan disimpan di pool dan random-pick untuk banyak siswa.

Topik: "${topik}"
${fokusBaris}
Level kesulitan: ${level ?? 1} (0=paling sulit, makin besar makin dasar/mudah).
${hindari?.length ? `Hindari soal yang mirip dengan: ${hindari.join(" | ")}` : ""}

GAYA BAHASA (PENTING):
${gayaBahasaPanduan(audiens)}

ATURAN KETAT untuk soal diagnostic:
- Soal harus realistis untuk audiens di atas.
${levelKesulitanPanduan(audiens)}
- Buat ${jumlahGenerate} soal yang BENAR-BENAR berbeda satu sama lain — beda angka, beda konteks (cerita/situasi), beda opsi jawaban, beda strategi solusi kalau memungkinkan. JANGAN sekedar ganti kata atau angka kecil. Harus variasi MENYELURUH supaya pool 10 soal terasa seperti 10 soal berbeda untuk siswa.
- Per soal: 4 opsi (A, B, C, D). PERSIS 1 opsi dengan "benar": true, sisanya "benar": false. SEBELUM return JSON, hitung jumlah opsi benar — kalau bukan 1, ULANGI soal sampai exact 1.
- DISTRACTOR (3 opsi salah) WAJIB merepresentasikan miskonsepsi/salah-langkah yang UMUM dilakukan siswa pada topik ini, BUKAN angka acak.
- Untuk setiap opsi, sertakan field "alasan":
  * Opsi BENAR: alasan = ringkas mengapa benar (1 kalimat).
  * Opsi SALAH: alasan = miskonsepsi spesifik yang menyebabkan siswa memilih opsi ini (1 kalimat). Contoh: "Lupa membalik tanda saat dikalikan negatif".
- Pakai LaTeX $...$ untuk rumus${isSdBawah ? " (HINDARI LaTeX kompleks untuk SD kelas 1-3 — pakai angka biasa)" : ""}.
- PENTING: di dalam JSON string, escape backslash LaTeX jadi DOUBLE backslash. Contoh tulis "$\\\\times$" untuk $\\times$, "$\\\\frac{1}{2}$" untuk pecahan. JANGAN pakai single backslash di JSON.

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
      "svg": "<svg ...>...</svg>  // OPSIONAL, hanya kalau visual BENAR-BENAR perlu. Hilangkan field ini kalau tidak ada gambar."
    },
    { ... soal ke-2 dengan angka & konteks BEDA ... },
    { ... soal ke-3 ... },
    "... total ${jumlahGenerate} soal ..."
  ]
}`;

  const claude = getClaude();
  let msg;
  try {
    msg = await claude.messages.create({
      model: pilihModel("soal", level),
      // Per soal MC dengan 4 distractor + alasan + LaTeX bisa 1500-3000 tokens.
      // Beri budget besar supaya tidak truncated mid-JSON.
      // Pool size 10 dengan 4 distractor + alasan + kemungkinan SVG perlu budget besar
      max_tokens: Math.min(60000, 3500 * jumlahGenerate + 2000),
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    let pesan = m;
    let status = 502;
    if (m.includes("credit balance is too low")) {
      pesan = "Kredit Anthropic API habis. Top up di console.anthropic.com.";
      status = 402;
    } else if (m.includes("rate_limit") || m.includes("429")) {
      pesan = "Rate limit Anthropic. Tunggu beberapa detik lalu coba lagi.";
      status = 429;
    } else if (m.includes("overloaded") || m.includes("529")) {
      pesan = "Server Anthropic overload. Coba lagi nanti.";
      status = 503;
    }
    return NextResponse.json({ error: pesan, detail: m.slice(0, 300) }, { status });
  }

  const text = msg.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n");

  const truncated = msg.stop_reason === "max_tokens";

  let obj: unknown;
  try {
    obj = extractJson(text);
  } catch {
    return NextResponse.json(
      {
        error: truncated
          ? "Response Claude terpotong (max_tokens). Coba kurangi 'n' atau topik lebih ringkas."
          : "Claude tidak return JSON valid",
        raw: text.slice(0, 500),
        stopReason: msg.stop_reason,
      },
      { status: 502 },
    );
  }

  const parsed = BatchSchema.safeParse(obj);
  if (!parsed.success) {
    return NextResponse.json({ error: "Schema tidak valid", issues: parsed.error.issues, raw: obj }, { status: 502 });
  }

  // Auto-fix soal dengan jumlah opsi benar tidak tepat 1.
  // - >1 opsi benar: keep yang pertama, sisanya jadikan false (lossy fix, soal masih usable).
  // - 0 opsi benar: drop soal (tidak ada cara reliable menebak yang benar).
  let autoFixed = 0;
  let dropped = 0;
  const valid: typeof parsed.data.soal = [];
  for (const s of parsed.data.soal) {
    const benarCount = s.opsi.filter((o) => o.benar).length;
    if (benarCount === 1) {
      valid.push(s);
    } else if (benarCount > 1) {
      // Keep first true, set others false
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
    return NextResponse.json(
      {
        error: "Semua soal yang di-generate AI invalid (0 opsi benar). Coba lagi.",
        detail: `dropped=${dropped}, autoFixed=${autoFixed}`,
      },
      { status: 502 },
    );
  }

  // ── Save batch ke pool (best-effort, jangan block response) ──
  // Pool stores all valid (bisa < POOL_SIZE kalau ada drop). Pool serve banyak request berikut.
  savePool(poolKey, {
    pool: valid,
    usedCount: jumlah, // sudah ada `jumlah` yang akan dipakai response ini
    topik,
    subKonsep,
    level: level ?? 1,
    kategoriUtama: audiens.kategoriUtama,
    jenjang: audiens.jenjang,
    kelas: audiens.kelas,
  }).catch((e) => console.warn("savePool gagal:", e));

  // Pick `jumlah` random dari batch untuk response sekarang
  const picked = pickRandom(valid, jumlah);
  return NextResponse.json({
    soal: picked,
    _fromPool: false,
    _justFilled: true,
    _poolSize: valid.length,
    ...(dropped > 0 ? { _dropped: dropped } : {}),
    ...(autoFixed > 0 ? { _autoFixed: autoFixed } : {}),
  });
}
