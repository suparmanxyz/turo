import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Audiens } from "@/types";
import type { SoalMc } from "@/lib/diagnostic";

/** Pool size — variasi soal per (topik+subKonsep+level+audiens). */
export const POOL_SIZE = 10;
/** Pool di-regen kalau usedCount mencapai threshold ini. */
export const POOL_MAX_USE = 50;
/** Pool di-regen kalau umurnya melewati TTL ini (ms). */
export const POOL_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

export type PoolDoc = {
  pool: SoalMc[];
  usedCount: number;
  createdAt: number;
  topik: string;
  subKonsep?: string;
  level: number;
  kategoriUtama: string;
  jenjang?: string;
  kelas?: number;
};

/** Hash key untuk pool soal. */
export function soalPoolKey(opts: {
  topik: string;
  subKonsep?: string;
  level: number;
  audiens: Audiens;
}): string {
  const norm = (s: string | undefined | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const sig = [
    norm(opts.topik),
    norm(opts.subKonsep),
    String(opts.level),
    opts.audiens.kategoriUtama,
    opts.audiens.jenjang ?? "",
    String(opts.audiens.kelas ?? ""),
  ].join("|");
  return createHash("sha256").update(sig).digest("hex").slice(0, 32);
}

export async function loadPool(key: string): Promise<PoolDoc | null> {
  try {
    const snap = await getAdminDb().collection("soalCache").doc(key).get();
    if (!snap.exists) return null;
    return snap.data() as PoolDoc;
  } catch (e) {
    console.warn("loadPool gagal:", e);
    return null;
  }
}

export async function savePool(
  key: string,
  data: Omit<PoolDoc, "createdAt"> & { createdAt?: number },
): Promise<void> {
  try {
    // Bersihkan undefined biar Firestore tidak reject
    const clean: Record<string, unknown> = {
      pool: data.pool,
      usedCount: data.usedCount,
      createdAt: data.createdAt ?? Date.now(),
      topik: data.topik,
      level: data.level,
      kategoriUtama: data.kategoriUtama,
    };
    if (data.subKonsep !== undefined) clean.subKonsep = data.subKonsep;
    if (data.jenjang !== undefined) clean.jenjang = data.jenjang;
    if (data.kelas !== undefined) clean.kelas = data.kelas;
    await getAdminDb().collection("soalCache").doc(key).set(clean);
  } catch (e) {
    console.warn("savePool gagal:", e);
  }
}

/** Increment usedCount async (best-effort, jangan block response). */
export async function incrementUsed(key: string, by: number = 1): Promise<void> {
  try {
    await getAdminDb().collection("soalCache").doc(key).update({
      usedCount: FieldValue.increment(by),
    });
  } catch (e) {
    console.warn("incrementUsed gagal:", e);
  }
}

export function isPoolValid(doc: PoolDoc | null | undefined): doc is PoolDoc {
  if (!doc || !Array.isArray(doc.pool) || doc.pool.length === 0) return false;
  if (doc.usedCount >= POOL_MAX_USE) return false;
  if (Date.now() - (doc.createdAt ?? 0) > POOL_TTL_MS) return false;
  return true;
}

/** Pick N random items dari array (Fisher-Yates shuffle). */
export function pickRandom<T>(arr: readonly T[], n: number): T[] {
  if (n >= arr.length) return [...arr];
  const candidates = [...arr];
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
  }
  return candidates.slice(0, n);
}
