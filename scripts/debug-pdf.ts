// Debug: kirim PDF ke Claude, tampilkan response mentah.
// npx tsx scripts/debug-pdf.ts "data/osn-pdf/OSK 24.pdf"

import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

async function main() {
  const path = process.argv[2];
  if (!path) { console.error("Usage: npx tsx scripts/debug-pdf.ts <pdf>"); process.exit(1); }

  const buf = fs.readFileSync(path);
  console.log(`File: ${path} (${(buf.length / 1024).toFixed(1)} KB)`);

  const header = buf.slice(0, 8).toString("latin1");
  console.log(`Header: "${header}" (harus "%PDF-...")`);

  const isi = buf.toString("latin1");
  const adaText = /\/Font|BT\s|Tj\s/.test(isi);
  const adaImage = /\/Image|\/XObject/.test(isi);
  console.log(`Kemungkinan ada text layer: ${adaText}`);
  console.log(`Kemungkinan ada image embedded: ${adaImage}`);

  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log("\n=== Ekstraksi dengan prompt aplikasi ===");
  const taksonomi = `- bilangan (Bilangan & Teori Bilangan):
    - keterbagian: Keterbagian
    - kpk-fpb: KPK dan FPB
    - bilangan-prima: Bilangan Prima & Faktorisasi
    - modulo: Aritmetika Modulo
    - pola-bilangan: Pola & Barisan Bilangan
    - basis-bilangan: Basis Bilangan
- aljabar (Aljabar):
    - persamaan-linear: Persamaan & Sistem Linear
    - pertidaksamaan: Pertidaksamaan
    - persamaan-kuadrat: Persamaan Kuadrat
    - fungsi: Fungsi
    - eksponen-logaritma: Eksponen & Logaritma
    - suku-banyak: Polinomial / Suku Banyak
- geometri (Geometri):
    - segitiga: Segitiga & Teorema Pythagoras
    - kesebangunan: Kesebangunan & Kekongruenan
    - lingkaran: Lingkaran
    - sudut: Sudut & Garis
    - bangun-datar: Luas & Keliling Bangun Datar
    - bangun-ruang: Bangun Ruang
    - koordinat: Geometri Koordinat
- kombinatorika (Kombinatorika & Peluang):
    - aturan-perkalian: Aturan Perkalian & Penjumlahan
    - permutasi-kombinasi: Permutasi & Kombinasi
    - pigeonhole: Prinsip Sarang Merpati
    - peluang: Peluang
- statistika (Statistika & Data):
    - ukuran-pemusatan: Mean, Median, Modus
    - penyajian-data: Penyajian Data
- lainnya:
    - belum-terklasifikasi`;

  const instruksi = `Ekstrak SEMUA soal matematika dari PDF ini untuk aplikasi olimpiade SMP Indonesia.

TAKSONOMI MATERI:
${taksonomi}

Untuk TIAP soal, tentukan: pertanyaan, jawabanBenar, pembahasan, opsi, materiSlug, subMateriSlug, topik, level.

Output HANYA JSON murni (TANPA code fence):
{ "soal": [ {...} ] }`;

  const r = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } },
          { type: "text", text: instruksi },
        ],
      },
    ],
  });
  const t = r.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("\n");
  console.log("=== RAW RESPONSE ===");
  console.log(t.slice(0, 3000));
  console.log("...");
  console.log(t.slice(-500));
  console.log(`\nStopReason: ${r.stop_reason}`);
  console.log(`Tokens: input=${r.usage.input_tokens}, output=${r.usage.output_tokens}`);

  fs.writeFileSync("debug-response.txt", t);
  console.log("\n(Full response disimpan ke debug-response.txt)");
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
