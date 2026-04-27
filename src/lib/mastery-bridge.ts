/**
 * Client helper untuk bridge mastery dari Sistem A (legacy diagnostik & latihan)
 * ke collection sub_materi_mastery (Phase B).
 *
 * Tujuan: cek-kesiapan & onboarding bisa lihat mastery yang user dapat
 * dari latihan/diagnostik legacy juga, bukan hanya dari onboarding IRT.
 *
 * Best-effort: gagal tidak block flow utama, hanya log warning.
 */

import type { User } from "firebase/auth";
import type { MasteryStatus } from "@/types";

export type MasteryItem = {
  kode: string;
  status: MasteryStatus;
  confidence?: number;
  source?: "diagnostic" | "latihan" | "post_test" | "cek_kesiapan";
};

/**
 * Push mastery items ke server (best-effort, async non-blocking).
 * Caller dapat optionally await — kalau gagal, return false dan log saja.
 */
export async function bridgeMastery(user: User, items: MasteryItem[]): Promise<boolean> {
  if (!user || items.length === 0) return false;
  try {
    const idToken = await user.getIdToken();
    const res = await fetch("/api/mastery/bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn(`bridgeMastery HTTP ${res.status}: ${txt.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("bridgeMastery error:", e instanceof Error ? e.message : e);
    return false;
  }
}
