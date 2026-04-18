import { createHash } from "node:crypto";
import type { Audiens } from "@/types";

/** Normalisasi text input untuk cache key (whitespace, case-insensitive). */
function norm(s: string | undefined | null): string {
  return (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function audiensSig(a: Audiens): string {
  return `${a.kategoriUtama}|${a.jenjang ?? ""}|${a.kelas ?? ""}`;
}

/** Hash key untuk peta prasyarat. */
export function petaCacheKey(opts: {
  subMateri: string;
  soalTarget?: string;
  audiens: Audiens;
}): string {
  const sig = [norm(opts.subMateri), norm(opts.soalTarget), audiensSig(opts.audiens)].join("\n");
  return createHash("sha256").update(sig).digest("hex").slice(0, 32);
}

/** Hash key untuk visual SVG (jelaskan-visual). */
export function visualCacheKey(opts: {
  konsep: string;
  konteks?: string;
  audiens: Audiens;
}): string {
  const sig = [norm(opts.konsep), norm(opts.konteks), audiensSig(opts.audiens)].join("\n");
  return createHash("sha256").update(sig).digest("hex").slice(0, 32);
}
