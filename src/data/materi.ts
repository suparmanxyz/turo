import type { Materi } from "@/types";

export const DAFTAR_MATERI: Materi[] = [];

export function cariSubMateri(materiSlug: string, subSlug: string) {
  const m = DAFTAR_MATERI.find((x) => x.slug === materiSlug);
  return m?.subMateri.find((s) => s.slug === subSlug);
}

export function taksonomiUntukPrompt(): string {
  return DAFTAR_MATERI.map((m) => {
    const subs = m.subMateri.map((s) => `    - ${s.slug}: ${s.nama}`).join("\n");
    return `- ${m.slug} (${m.nama}):\n${subs}`;
  }).join("\n");
}
