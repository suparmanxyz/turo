// Generate landing page illustrations via Leonardo AI.
// Reuses LEONARDO_API_KEY from D:\book gen\server\.env (if not in turo .env.local).
//
// Usage:
//   node scripts/generate-leonardo-illustrations.mjs              # generate all 4
//   node scripts/generate-leonardo-illustrations.mjs --only hero  # generate one
//   node scripts/generate-leonardo-illustrations.mjs --variants 4 # variants per illust
//
// Output: D:\turo\public\illustrations\{id}-v{n}.png

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// === Load env from turo .env.local OR fallback to book gen .env ===
function loadEnv() {
  const paths = [
    resolve(ROOT, ".env.local"),
    "D:\\book gen\\server\\.env",
  ];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  }
}
loadEnv();

const API_KEY = process.env.LEONARDO_API_KEY;
if (!API_KEY || API_KEY === "xxx") {
  console.error("\nLEONARDO_API_KEY tidak ditemukan.");
  console.error("Tambahkan di D:\\turo\\.env.local atau pastikan ada di D:\\book gen\\server\\.env\n");
  process.exit(1);
}

const LEONARDO_BASE_URL = "https://cloud.leonardo.ai/api/rest/v1";
// Lucid Origin — vibrant, HD illustration model (best for flat illustrations)
const MODEL_ID = "7b592283-e8a7-4c5a-9ba6-d18c31f258b9";

const args = process.argv.slice(2);
const argVal = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
const onlyId = argVal("--only");
const variants = parseInt(argVal("--variants") ?? "2", 10);

const OUTPUT_DIR = resolve(ROOT, "public", "illustrations");
mkdirSync(OUTPUT_DIR, { recursive: true });

// === SHARED STYLE GUIDE ===
const STYLE_BASE = `Modern flat 2D illustration in clean SaaS landing page style. Soft pastel color palette dominated by teal (#0d9488), violet (#7c3aed), and amber (#f59e0b) accents on a clean white background. Friendly, professional, approachable for Indonesian education audience. Characters have South-East Asian / Indonesian features (warm tan skin tones, dark hair, friendly expressions). Minimal shading, subtle gradients, vector-style appearance, consistent character art style across all illustrations.`;

const NEGATIVE_PROMPT = `text, letters, words, numbers, alphabets, typography, captions, labels, signs, books with visible text, papers with readable words, prescription text, watermark, signature, logo, dark mood, scary, horror, deformed, disfigured, blurry, low quality, realistic photography, 3D render, photorealistic, gore, violence, weapons, anatomically incorrect, multiple heads, extra limbs, childish doodle, ugly, european features, white skin, blonde hair`;

// === 7 ILLUSTRATIONS (sesuai mockup v3) ===
// Diversity karakter: hijab, anak SD & remaja, laki-laki & perempuan, Indonesian features
const ILLUSTRATIONS = [
  {
    id: "hero-doctor-math",
    name: "Hero — Dokter perempuan berhijab + anak SD laki-laki",
    aspectRatio: "1:1",
    prompt: `${STYLE_BASE}

Subject: A friendly young Indonesian female doctor (Asian features, warm tan skin, kind warm smile) wearing a modest soft teal hijab headscarf (traditional Indonesian Muslim style, covering hair and neck) and a clean white doctor's coat over a violet blouse. She holds a magical stethoscope where the chestpiece is shaped like a mathematical sigma or integral symbol. She is gently examining a small Indonesian elementary-age boy patient (about 9 years old, dark hair, wearing a casual yellow t-shirt and shorts), who sits on a chair holding a closed math textbook, looking hopeful and engaged.

Background: Soft white with subtle floating geometric shapes (circles, triangles, squares) and faint abstract mathematical symbol shapes (no readable text or letters). Warm gradient glow in corners — teal on one side, violet on the other.

Composition: Centered, balanced, doctor and child patient as focal point. Maternal, warm, friendly atmosphere. Aspect ratio 1:1 square.`,
  },
  {
    id: "selling-1-understanding",
    name: "Selling 1 — Dokter perempuan + brain illustration 5 warna",
    aspectRatio: "1:1",
    prompt: `Modern flat 2D illustration, SaaS landing page style, white background, soft pastel teal/violet/amber palette. Indonesian Asian features.

Wide shot scene with two elements side by side:

LEFT: Young Indonesian female doctor, full body, dark hair in low bun, white doctor's coat over violet blouse, friendly smile, standing and pointing toward the brain on the right. Holds a clipboard in other hand.

RIGHT: A LARGE cartoon flat illustration of a human BRAIN divided into 5 clearly separated puzzle-piece colored sections (teal, violet, amber, emerald, rose pink). Soft glow around it. No text.

Background: clean white with soft pastel gradient and minimal floating dots.

NOT a portrait. NOT a close-up. Full wide-shot composition showing BOTH doctor and big colorful brain visible together. Aspect ratio 1:1 square.`,
  },
  {
    id: "selling-2-diagnosis",
    name: "Selling 2 — Dokter + 2 pasien (anak SD perempuan + remaja laki-laki)",
    aspectRatio: "1:1",
    prompt: `${STYLE_BASE}

Subject: A friendly young Indonesian male doctor (Asian features, dark hair, warm tan skin) wearing a white coat, standing in the center holding two different prescription papers — one in each hand. The prescription papers show only colorful icon symbols (geometric shapes, hearts, stars, checkmarks in teal, violet, amber colors) with NO readable text or letters at all. On his left, a small Indonesian elementary-age girl (about 8 years old, dark hair in pigtails, wearing a colorful t-shirt) smiles. On his right, an Indonesian teenage boy (about 16 years old, dark hair, wearing a casual shirt) stands smiling. A small medicine bottle with a heart icon sits on the floor between them.

Background: Soft white with warm peach gradient blob. Sparkle accents around the prescription papers.

Composition: Doctor centered, two patients flanking. Different ages showing personalization. Aspect ratio 1:1 square.`,
  },
  {
    id: "selling-3-complete",
    name: "Selling 3 — Dokter perempuan berhijab + anak SD laki-laki naik tangga buku",
    aspectRatio: "1:1",
    prompt: `${STYLE_BASE}

Subject: A young Indonesian female doctor (Asian features, warm tan skin) wearing a modest cream-colored hijab headscarf and a white doctor's coat over a teal blouse, standing on the left as a friendly guide pointing upward. On the right, a tall staircase made of stacked colorful book chapters — each step a different color (teal, violet, amber, emerald, rose). A small Indonesian elementary boy (about 9 years old, dark hair, wearing a yellow t-shirt and shorts) is climbing up the staircase, currently around the middle, looking determined and confident. At the top of the staircase, a glowing golden trophy with sparkles.

Background: Clean white with subtle vertical gradient (lighter at top). Floating sparkle particles suggesting progress.

Composition: Vertical staircase on the right, doctor on the left as guide, child climbing in the middle, trophy at top. Inspirational atmosphere. Aspect ratio 1:1 square.`,
  },
  {
    id: "how-1-diagnostik",
    name: "Cara Kerja 1 — Anak SD perempuan kerjakan tes adaptif di tablet",
    aspectRatio: "1:1",
    prompt: `${STYLE_BASE}

Subject: An Indonesian elementary-age girl (about 9 years old, dark hair in two side pigtails with cute hair clips, warm tan skin, wearing a casual rose pink t-shirt) sitting at a small desk, focused and engaged while tapping on a tablet device. The tablet screen shows abstract colorful geometric shapes and a glowing progress circle (no readable text). On the desk, a small notebook and a pencil. She has a thoughtful concentrated expression.

Background: Soft white with subtle teal gradient circle behind her. Floating sparkle dots suggesting active thinking. A small clock icon shape in the corner suggesting "30 minutes."

Composition: Centered character, slightly above shoulder view of tablet. Focused, calm atmosphere. Aspect ratio 1:1 square.`,
  },
  {
    id: "how-2-spektrum",
    name: "Cara Kerja 2 — Remaja perempuan berhijab lihat radar chart 5 dimensi",
    aspectRatio: "1:1",
    prompt: `${STYLE_BASE}

Subject: An Indonesian teenage girl (about 15 years old, warm tan skin) wearing a modest soft violet hijab headscarf and a casual white shirt, standing on the left looking with curious smile at a large floating radar chart (pentagon-shaped 5-axis chart) on the right. The radar chart has 5 axes filled with different colored areas (teal, violet, amber, emerald, rose), creating a colorful pentagon shape. Each axis tip has a small icon (brain, puzzle, chat bubble, target, muscle — all simple flat icons).

Background: Clean white with soft violet gradient blob behind the chart. Minimal floating dots.

Composition: Girl on the left, radar chart prominent on the right. Discovery, insight atmosphere. Aspect ratio 1:1 square.`,
  },
  {
    id: "how-3-program",
    name: "Cara Kerja 3 — Remaja laki-laki dengan roadmap belajar",
    aspectRatio: "1:1",
    prompt: `${STYLE_BASE}

Subject: An Indonesian teenage boy (about 16 years old, dark hair, warm tan skin, wearing a casual amber/orange t-shirt) standing confidently and pointing at a large floating roadmap or path diagram. The roadmap has multiple colorful waypoints connected by a winding teal path — each waypoint is a circle with a different colored chapter icon (geometric shapes representing math chapters), some with checkmark icons showing completion. A small backpack on his shoulder. Determined and motivated expression.

Background: Soft white with subtle amber gradient. Floating sparkle dots along the path.

Composition: Boy on the left, winding roadmap dominating the right. Action, journey atmosphere. Aspect ratio 1:1 square.`,
  },
];

// === API HELPERS ===
async function requestGeneration(prompt, aspectRatio, numImages) {
  const res = aspectRatio === "1:1" ? { w: 1024, h: 1024 } : { w: 1360, h: 768 };
  const body = {
    modelId: MODEL_ID,
    prompt,
    negative_prompt: NEGATIVE_PROMPT,
    width: res.w,
    height: res.h,
    num_images: numImages,
    public: false,
    photoReal: false,
    presetStyle: "ILLUSTRATION",
  };
  const response = await fetch(`${LEONARDO_BASE_URL}/generations`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Leonardo API ${response.status}: ${JSON.stringify(data)}`);
  }
  return data.sdGenerationJob.generationId;
}

async function pollStatus(generationId, timeoutMs = 180000) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < timeoutMs) {
    attempt++;
    const res = await fetch(`${LEONARDO_BASE_URL}/generations/${generationId}`, {
      headers: { authorization: `Bearer ${API_KEY}` },
    });
    const data = await res.json();
    const gen = data.generations_by_pk;
    if (!gen) {
      await new Promise((r) => setTimeout(r, 4000));
      continue;
    }
    if (gen.status === "COMPLETE") return gen.generated_images;
    if (gen.status === "FAILED") throw new Error("Generation FAILED on Leonardo side");
    process.stdout.write(`.`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Polling timeout after ${timeoutMs / 1000}s`);
}

async function downloadImage(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(filepath, buffer);
}

// === MAIN ===
const queue = onlyId
  ? ILLUSTRATIONS.filter((i) => i.id === onlyId)
  : ILLUSTRATIONS;

if (queue.length === 0) {
  console.error(`\nNo illustration matched --only ${onlyId}`);
  console.error(`Available IDs: ${ILLUSTRATIONS.map((i) => i.id).join(", ")}\n`);
  process.exit(1);
}

console.log("\n=== LEONARDO AI ILLUSTRATION GENERATOR ===");
console.log(`Model: Lucid Origin (vibrant HD illustration)`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Variants per illustration: ${variants}`);
console.log(`Queue: ${queue.length} illustration(s)\n`);

let totalSuccess = 0;
let totalFailed = 0;

for (const ill of queue) {
  console.log(`→ [${ill.id}]`);
  console.log(`  ${ill.name}`);
  try {
    console.log(`  Requesting generation (${variants} variants @ ${ill.aspectRatio})...`);
    const genId = await requestGeneration(ill.prompt, ill.aspectRatio, variants);
    console.log(`  Generation ID: ${genId}`);
    process.stdout.write(`  Polling`);
    const images = await pollStatus(genId);
    console.log(` ✓ ${images.length} images ready`);

    for (let i = 0; i < images.length; i++) {
      const filename = `${ill.id}-v${i + 1}.png`;
      const filepath = resolve(OUTPUT_DIR, filename);
      await downloadImage(images[i].url, filepath);
      console.log(`    ✓ Saved: public/illustrations/${filename}`);
    }
    totalSuccess++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${err.message}`);
    totalFailed++;
  }
  console.log("");
}

console.log("=== DONE ===");
console.log(`Success: ${totalSuccess} · Failed: ${totalFailed}`);
console.log(`Files at: ${OUTPUT_DIR}\n`);
