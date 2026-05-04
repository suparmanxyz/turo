// Tahap 1: Fetch CP 046 list lengkap dari NB notebook (per jenjang × per kelas).
// Output: out/cp046-exhaustive-{j}-K{n}.md (raw NB answer per kelas)
//
// Strategi:
//   - Per kelas, kirim 1 query exhaustive ke notebook yang sesuai
//   - --new untuk fresh conversation (jangan terkontaminasi dgn deep research lama)
//   - Save raw markdown + JSON refs
//
// Run: node scripts/notebooklm/fetch-cp046-exhaustive.mjs [--jenjang sd|smp|sma|all] [--force]

import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "out");
const CACHE_DIR = resolve(ROOT, "cp046-exhaustive");
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

const NB_CLI = "C:\\Users\\welcome\\AppData\\Roaming\\Python\\Python314\\Scripts\\notebooklm.exe";

// Notebook IDs (full UUIDs dari list)
const NOTEBOOKS = {
  sd: "77086473-6e45-4f1d-94c3-c", // partial OK; CLI auto-resolve
  smp: "464a64fa-ca3e-4125-b372-eca5d7b7f4d9",
  sma: "7accdd21-e596-4839-bbe1-c",
};

const KELAS_PER_JENJANG = {
  sd: [1, 2, 3, 4, 5, 6],
  smp: [7, 8, 9],
  sma: [10, 11, 12],
};

function buildPrompt(jenjang, kelas) {
  const fase = jenjang === "sd"
    ? (kelas <= 2 ? "Fase A" : kelas <= 4 ? "Fase B" : "Fase C")
    : jenjang === "smp" ? "Fase D"
    : (kelas === 10 ? "Fase E" : "Fase F");

  return `Berikan list LENGKAP semua bab matematika untuk Kelas ${kelas} (${fase}) ${jenjang.toUpperCase()} berdasarkan CP 046/H/KR/2025 Kurikulum Merdeka.

PENTING:
- EXHAUSTIVE — sebutkan SETIAP bab yang masuk CP 046 untuk kelas ini, jangan summarize atau filter ke "highlight" saja
- Kalau ada 8-12 bab, list semua 8-12, jangan cuma 5-6 bab utama
- Per bab, tuliskan: nama bab + sub-bab (sub topik)
- Group per elemen CP 046: Bilangan, Aljabar, Pengukuran, Geometri, Analisis Data dan Peluang
${jenjang === "sma" ? "- Untuk K11/K12, pisahkan jalur Wajib (Umum) vs Lanjut (Peminatan)" : ""}

Contoh bab yang HARUS disebutkan kalau memang masuk CP 046 K${kelas}:
${jenjang === "smp" && kelas === 7 ? "- Bilangan Bulat\n- Bilangan Rasional\n- Rasio dan Perbandingan\n- Bentuk Aljabar\n- Persamaan dan Pertidaksamaan Linear Satu Variabel (PLSV/PtLSV)\n- Aritmetika Sosial\n- Himpunan\n- Garis dan Sudut\n- Segitiga dan Segi Empat\n- Penyajian Data" : ""}
${jenjang === "smp" && kelas === 8 ? "- Pola Bilangan dan Barisan\n- Koordinat Kartesius\n- Relasi dan Fungsi\n- Persamaan Garis Lurus\n- SPLDV\n- Teorema Pythagoras\n- Lingkaran\n- Bangun Ruang Sisi Datar\n- Statistika\n- Peluang" : ""}
${jenjang === "smp" && kelas === 9 ? "- Bilangan Berpangkat dan Bentuk Akar\n- Persamaan Kuadrat\n- Fungsi Kuadrat\n- Kekongruenan dan Kesebangunan\n- Bangun Ruang Sisi Lengkung\n- Lingkaran (Garis Singgung)\n- Transformasi Geometri\n- Peluang dan Sampel" : ""}
${jenjang === "sd" && kelas === 6 ? "- Bilangan Cacah Sampai 1.000.000\n- Operasi Pecahan dan Desimal\n- Rasio dan Proporsi\n- Bangun Ruang (Kubus, Balok, Tabung)\n- Pengukuran Kecepatan dan Debit\n- Statistika dan Peluang\n- Simetri dan Mozaik" : ""}

Format output (markdown):

## Kelas ${kelas} - ${fase} - Daftar Lengkap Bab

### Elemen Bilangan
- **Bab N: Nama Bab**
  - Sub-bab 1
  - Sub-bab 2
  - ...

### Elemen Aljabar
...

### Elemen Pengukuran
...

### Elemen Geometri
...

### Elemen Analisis Data dan Peluang
...

Pastikan TIDAK ADA bab yang terlewat. Kalau elemen tertentu memang tidak ada di kelas ini, tulis "Tidak ada di kelas ini".`;
}

function fetchOne(jenjang, kelas, force = false) {
  const outPath = resolve(CACHE_DIR, `${jenjang}-K${kelas}.md`);
  if (existsSync(outPath) && !force) {
    console.log(`  ⊘ ${jenjang} K${kelas}: cached, skip (--force untuk re-fetch)`);
    return;
  }
  const notebookId = NOTEBOOKS[jenjang];
  const prompt = buildPrompt(jenjang, kelas);

  console.log(`  → ${jenjang} K${kelas}: querying notebook ${notebookId.slice(0, 8)}...`);
  const start = Date.now();
  try {
    // Step 1: set context dgn `use` (avoids RPC errors that happen with -n flag)
    execFileSync(NB_CLI, ["use", notebookId], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    });
    // Step 2: ask (uses current context).
    const result = execFileSync(
      NB_CLI,
      ["ask", prompt],
      {
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 240_000, // 4 minutes per query
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    writeFileSync(outPath, result, "utf-8");
    console.log(`  ✓ ${jenjang} K${kelas}: saved (${result.length} chars, ${elapsed}s)`);
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const stderr = err.stderr?.toString() ?? err.message;
    console.error(`  ✗ ${jenjang} K${kelas}: failed (${elapsed}s) — ${stderr.slice(0, 200)}`);
  }
}

// Parse args
const args = process.argv.slice(2);
const argFlag = (name, def = null) => {
  const idx = args.indexOf(`--${name}`);
  if (idx < 0) return def;
  return args[idx + 1] ?? true;
};
const targetJenjang = argFlag("jenjang", "all");
const force = args.includes("--force");

const targets = targetJenjang === "all"
  ? ["sd", "smp", "sma"]
  : [targetJenjang.toLowerCase()];

console.log(`Mode: ${targetJenjang} · Force: ${force}`);
console.log(`Cache dir: ${CACHE_DIR}\n`);

for (const j of targets) {
  if (!NOTEBOOKS[j]) {
    console.error(`Unknown jenjang: ${j}`);
    continue;
  }
  console.log(`=== ${j.toUpperCase()} ===`);
  for (const k of KELAS_PER_JENJANG[j]) {
    fetchOne(j, k, force);
  }
  console.log("");
}

console.log(`✓ Done. Output di ${CACHE_DIR}`);
