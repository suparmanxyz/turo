import { config } from "dotenv";
config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  console.log("=== Tes Claude API ===");
  const msg = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 200,
    messages: [
      { role: "user", content: "Balas dengan JSON: {\"status\":\"ok\",\"pesan\":\"halo dari turo\"}" },
    ],
  });
  const text = msg.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("");
  console.log("✓ Response:", text);
  console.log("  Tokens:", msg.usage);
}
main().catch((e) => { console.error("✗", e.message); process.exit(1); });
