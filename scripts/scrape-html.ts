// Scrape soal dari halaman HTML (situs komunitas).
// Cara pakai:
//   npx tsx scripts/scrape-html.ts config/olimattohir-2024.json
//
// Config JSON schema:
//   {
//     "url": "https://...",
//     "tahun": "2024",
//     "tingkat": "provinsi",
//     "selectorSoal": ".post-body li",  // CSS selector untuk blok tiap soal
//     "selectorJawaban": null,           // optional, selector untuk kunci jawaban
//     "catatan": "..."
//   }
//
// Setelah scrape, output di-verifikasi Claude: struktur dibersihkan, LaTeX dinormalkan, topik ditentukan.

import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs/promises";
import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type Konfig = {
  url: string;
  tahun: string;
  tingkat: "kabupaten" | "provinsi" | "nasional";
  selectorSoal: string;
  selectorJawaban?: string;
  catatan?: string;
};

type SoalItem = {
  pertanyaan: string;
  jawabanBenar?: string;
  pembahasan?: string[];
  opsi?: string[];
  topik?: string;
  level?: number;
};

function extractJson(text: string): unknown {
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch {} }
  const open = text.match(/```(?:json)?\s*([\s\S]*)/);
  if (open) { try { return JSON.parse(open[1].trim()); } catch {} }
  throw new Error("No JSON");
}

async function normalkan(client: Anthropic, teksSoal: string[], konfig: Konfig): Promise<SoalItem[]> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: `Normalkan ${teksSoal.length} soal matematika OSN SMP berikut ke format JSON standar.

Tahun: ${konfig.tahun}, Tingkat: ${konfig.tingkat}
${konfig.catatan ? `Catatan: ${konfig.catatan}` : ""}

Soal mentah (dari scraping HTML):
${teksSoal.map((t, i) => `--- Soal ${i + 1} ---\n${t}`).join("\n\n")}

Tugas:
- Bersihkan teks (hapus nomor soal redundant, noise HTML).
- Konversi notasi matematika ke LaTeX $...$.
- Deteksi kunci jawaban dan pembahasan jika ada.
- Tentukan topik (1-3 kata) dan level (0=nasional, 1=provinsi, 2=kabupaten).

Output HANYA JSON murni (tanpa code fence):
{ "soal": [ { "pertanyaan": "...", "jawabanBenar": "...", "pembahasan": [...], "opsi": [...], "topik": "...", "level": 0 } ] }`,
      },
    ],
  });
  const text = msg.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("\n");
  const obj = extractJson(text) as { soal: SoalItem[] };
  return obj.soal;
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) { console.error("Usage: npx tsx scripts/scrape-html.ts <config.json>"); process.exit(1); }

  const konfig: Konfig = JSON.parse(await fs.readFile(configPath, "utf-8"));
  console.log(`Scraping ${konfig.url}...`);

  const html = await fetch(konfig.url, {
    headers: { "User-Agent": "Mozilla/5.0 (turo scraper)" },
  }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  });

  const $ = cheerio.load(html);
  const blok = $(konfig.selectorSoal)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 20);
  console.log(`✓ Ditemukan ${blok.length} blok soal dari HTML`);

  if (blok.length === 0) {
    console.log("Tidak ada soal ditemukan. Periksa selectorSoal.");
    return;
  }

  const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
  if (!getApps().length) initializeApp({ credential: cert(creds) });
  const db = getFirestore();
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log("Memanggil Claude untuk normalisasi...");
  const soal = await normalkan(claude, blok, konfig);
  console.log(`✓ Dinormalkan: ${soal.length} soal`);

  const batch = db.batch();
  for (const s of soal) {
    const ref = db.collection("soalManual").doc();
    batch.set(ref, {
      ...s,
      tahun: konfig.tahun,
      tingkat: konfig.tingkat,
      sumber: konfig.url,
      sumberJenis: "scrape-html",
      createdAt: new Date().toISOString(),
    });
  }
  await batch.commit();
  console.log(`✓ Disimpan ${soal.length} soal ke Firestore`);
}

main().catch((e) => { console.error(e); process.exit(1); });
