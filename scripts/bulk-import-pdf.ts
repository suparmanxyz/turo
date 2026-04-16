// Bulk impor PDF OSN SMP → Claude ekstrak → Firestore.
// Cara pakai:
//   1. Download PDF OSN dari Puspresnas/Kemdikbud ke folder data/osn-pdf/
//      Penamaan disarankan: osn-smp-2024-kabupaten.pdf, osn-smp-2024-provinsi.pdf, dst.
//   2. Jalankan: npx tsx scripts/bulk-import-pdf.ts data/osn-pdf
//
// Script akan:
//   - Loop semua *.pdf di folder
//   - Ekstrak metadata dari nama file (tahun, tingkat)
//   - Panggil Claude (Sonnet) untuk ekstrak soal
//   - Tulis ke collection "soalManual" dengan sumber=nama file

import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type SoalItem = {
  pertanyaan: string;
  jawabanBenar?: string;
  pembahasan?: string[];
  opsi?: string[];
  topik?: string;
  level?: number;
};

function parseFilename(name: string) {
  const lower = name.toLowerCase();
  const tahun = lower.match(/20(1\d|2\d)/)?.[0] ?? "";
  let tingkat: "kabupaten" | "provinsi" | "nasional" | "" = "";
  if (lower.includes("kabupaten") || lower.includes("ksk")) tingkat = "kabupaten";
  else if (lower.includes("provinsi") || lower.includes("ksp")) tingkat = "provinsi";
  else if (lower.includes("nasional") || lower.includes("ksn") || lower.includes("osn")) tingkat = "nasional";
  return { tahun, tingkat };
}

function extractJson(text: string): unknown {
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch {} }
  const open = text.match(/```(?:json)?\s*([\s\S]*)/);
  if (open) { try { return JSON.parse(open[1].trim()); } catch {} }
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") { if (depth === 0) start = i; depth++; }
    else if (c === "}") { depth--; if (depth === 0 && start !== -1) { try { return JSON.parse(text.slice(start, i + 1)); } catch { start = -1; } } }
  }
  throw new Error("No JSON found");
}

async function ekstrak(client: Anthropic, base64: string, konteks: string): Promise<SoalItem[]> {
  const msg = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 32000,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          {
            type: "text",
            text: `Ekstrak SEMUA soal matematika OSN SMP dari PDF ini.
${konteks ? `Konteks: ${konteks}` : ""}

Untuk tiap soal, isi field:
- pertanyaan (wajib, pakai LaTeX $...$ untuk rumus)
- jawabanBenar (kalau ada di PDF)
- pembahasan (array langkah, kalau ada)
- opsi (array kalau pilihan ganda)
- topik (1-3 kata, misal "KPK-FPB", "Geometri Segitiga")
- level (0=OSN nasional, 1=provinsi, 2=kabupaten, sesuai tingkat PDF)

Output HANYA JSON (tanpa code fence):
{ "soal": [ { ... }, { ... } ] }`,
          },
        ],
      },
    ],
  }).finalMessage();
  const text = msg.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("\n");
  const obj = extractJson(text) as { soal: SoalItem[] };
  return obj.soal;
}

async function main() {
  const folder = process.argv[2];
  if (!folder) { console.error("Usage: npx tsx scripts/bulk-import-pdf.ts <folder>"); process.exit(1); }

  const files = (await fs.readdir(folder)).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (files.length === 0) { console.log("Tidak ada PDF di folder", folder); return; }

  console.log(`Ditemukan ${files.length} PDF di ${folder}`);

  const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
  if (!getApps().length) initializeApp({ credential: cert(creds) });
  const db = getFirestore();
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let totalSoal = 0;
  let totalDisimpan = 0;

  for (const [i, f] of files.entries()) {
    const full = path.join(folder, f);
    const buf = await fs.readFile(full);
    const { tahun, tingkat } = parseFilename(f);
    const konteks = `Nama file: ${f}. Tahun: ${tahun || "?"}. Tingkat: ${tingkat || "?"}.`;

    console.log(`\n[${i + 1}/${files.length}] ${f} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
    console.log(`  ${konteks}`);

    try {
      const t0 = Date.now();
      const soal = await ekstrak(claude, buf.toString("base64"), konteks);
      console.log(`  ✓ Ekstrak: ${soal.length} soal (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      totalSoal += soal.length;

      const batch = db.batch();
      for (const s of soal) {
        const ref = db.collection("soalManual").doc();
        batch.set(ref, {
          ...s,
          tahun,
          tingkat,
          sumber: f,
          sumberJenis: "pdf-resmi",
          createdAt: new Date().toISOString(),
        });
      }
      await batch.commit();
      totalDisimpan += soal.length;
      console.log(`  ✓ Disimpan ke Firestore`);
    } catch (e) {
      console.error(`  ✗ Error: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`\n=== Selesai ===`);
  console.log(`Total soal diekstrak: ${totalSoal}`);
  console.log(`Total soal disimpan:  ${totalDisimpan}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
