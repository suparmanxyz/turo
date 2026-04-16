export type TipeTugas = "soal" | "peta" | "hint" | "visual" | "ekstrak-pdf";

export const MODEL_OPUS = "claude-opus-4-6";
export const MODEL_SONNET = "claude-sonnet-4-6";
export const MODEL_HAIKU = "claude-haiku-4-5-20251001";

export function pilihModel(tipe: TipeTugas, level?: number): string {
  switch (tipe) {
    case "soal":
      return level === 0 ? MODEL_OPUS : MODEL_SONNET;
    case "peta":
    case "hint":
    case "visual":
    case "ekstrak-pdf":
      return MODEL_SONNET;
  }
}
