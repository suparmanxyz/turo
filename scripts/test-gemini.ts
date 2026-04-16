import { config } from "dotenv";
config({ path: ".env.local" });

import { GoogleGenAI } from "@google/genai";

async function main() {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("=== Tes Gemini 2.5 Flash ===");
  const r = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: "Apa itu mod (modulo) dalam matematika? Jawab 2 kalimat singkat untuk siswa SMP." }] }],
    config: { maxOutputTokens: 300, thinkingConfig: { thinkingBudget: 0 } },
  });
  console.log("✓ Response:", r.text);
  console.log("\n  Tokens:", r.usageMetadata);
}
main().catch((e) => { console.error("✗", e.message); process.exit(1); });
