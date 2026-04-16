import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { getClaude, pilihModel } from "./claude";

export type Pesan = { role: "user" | "assistant"; content: string };

export type OpsiAI = {
  system?: string;
  messages: Pesan[];
  maxTokens?: number;
  preferGemini?: boolean;
};

export type HasilAI = {
  text: string;
  provider: "gemini" | "claude";
  model: string;
};

const GEMINI_MODEL = "gemini-2.5-flash";

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (geminiClient) return geminiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

async function callGemini(opsi: OpsiAI): Promise<HasilAI> {
  const client = getGemini();
  if (!client) throw new Error("GEMINI_API_KEY tidak diset");

  const contents = opsi.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const r = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: opsi.system,
      maxOutputTokens: opsi.maxTokens ?? 1000,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = r.text ?? "";
  if (!text) throw new Error("Gemini return empty text");
  return { text, provider: "gemini", model: GEMINI_MODEL };
}

async function callClaude(opsi: OpsiAI, tipe: "hint" | "soal" = "hint"): Promise<HasilAI> {
  const client: Anthropic = getClaude();
  const model = pilihModel(tipe);
  const msg = await client.messages.create({
    model,
    max_tokens: opsi.maxTokens ?? 1000,
    system: opsi.system,
    messages: opsi.messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const text = msg.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n");
  return { text, provider: "claude", model };
}

/**
 * Panggil AI dengan preferensi Gemini → fallback Claude kalau gagal.
 * Cocok untuk task ringan: chat, hint, sederhanakan.
 */
export async function chatRingan(opsi: OpsiAI): Promise<HasilAI> {
  if (opsi.preferGemini !== false && process.env.GEMINI_API_KEY) {
    try {
      return await callGemini(opsi);
    } catch (e) {
      console.warn(`[ai-provider] Gemini gagal, fallback Claude: ${e instanceof Error ? e.message : e}`);
    }
  }
  return await callClaude(opsi, "hint");
}
