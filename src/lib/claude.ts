import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY belum diset di .env.local");
  client = new Anthropic({ apiKey });
  return client;
}

export { pilihModel, MODEL_OPUS, MODEL_SONNET, MODEL_HAIKU } from "./model";
// legacy export
export const CLAUDE_MODEL = "claude-sonnet-4-6";
