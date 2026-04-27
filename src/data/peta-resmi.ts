/**
 * Loader peta prasyarat resmi (versi 2.0.0, 25 April 2026)
 * 472 sub-materi terkurasi dari SD K1 sampai SMA K12 dengan 663 relasi prasyarat.
 *
 * Sumber: konsepbaru/data/peta-prasyarat.json
 * Spec: konsepbaru/docs/peta-prasyarat.md
 *
 * Pakai ini sebagai source of truth untuk:
 * - Daftar sub-materi (kode SD.1.B1.01 dst)
 * - Pohon prasyarat dengan relation (STRICT/SOFT/ALTERNATIVE) + weight (CRITICAL/IMPORTANT/HELPER)
 * - Index untuk traversal cepat (by_jenjang_kelas, by_area, by_bab, dependents)
 */

import type {
  AreaMatematika,
  JenjangResmi,
  PetaPrasyaratIndex,
  PetaPrasyaratResmi,
  SubMateriResmi,
} from "@/types";
import petaJson from "./peta-prasyarat.json";
import indexJson from "./peta-prasyarat-index.json";

export const PETA: PetaPrasyaratResmi = petaJson as PetaPrasyaratResmi;
export const INDEX: PetaPrasyaratIndex = indexJson as PetaPrasyaratIndex;

/** Cari sub-materi by kode (e.g. "SMP.8.B5.01"). */
const byKode = new Map<string, SubMateriResmi>();
for (const s of PETA.submateri) byKode.set(s.kode, s);

export function cariSubMateriResmi(kode: string): SubMateriResmi | undefined {
  return byKode.get(kode);
}

/** Semua sub-materi di kelas tertentu (e.g. SMP K8). */
export function subMateriPerKelas(jenjang: JenjangResmi, kelas: number): SubMateriResmi[] {
  const key = `${jenjang}.${kelas}`;
  const kodes = INDEX.by_jenjang_kelas[key] ?? [];
  return kodes.map((k) => byKode.get(k)).filter((s): s is SubMateriResmi => !!s);
}

/** Semua sub-materi di area tertentu. */
export function subMateriPerArea(area: AreaMatematika): SubMateriResmi[] {
  const kodes = INDEX.by_area[area] ?? [];
  return kodes.map((k) => byKode.get(k)).filter((s): s is SubMateriResmi => !!s);
}

/** Semua sub-materi di bab tertentu (e.g. "SMP.8.B5"). */
export function subMateriPerBab(jenjang: JenjangResmi, kelas: number, babKode: string): SubMateriResmi[] {
  // bab_kode di JSON: "Bab 5" — normalisasi ke "B5"
  const babNum = babKode.replace(/[^0-9]/g, "");
  const key = `${jenjang}.${kelas}.B${babNum}`;
  const kodes = INDEX.by_bab[key] ?? [];
  return kodes.map((k) => byKode.get(k)).filter((s): s is SubMateriResmi => !!s);
}

/** Daftar sub-materi yang punya `kode` sebagai prereq (reverse lookup). */
export function dependentsOf(kode: string) {
  return INDEX.dependents[kode] ?? [];
}

/** Semua entry points (sub-materi tanpa prereq). */
export function entryPoints(): SubMateriResmi[] {
  return INDEX.entry_points
    .map((k) => byKode.get(k))
    .filter((s): s is SubMateriResmi => !!s);
}

/** Daftar bab unik per (jenjang, kelas) — dengan nama bab. */
export function babsPerKelas(jenjang: JenjangResmi, kelas: number): { kode: string; nama: string; subMateri: SubMateriResmi[] }[] {
  const subs = subMateriPerKelas(jenjang, kelas);
  const map = new Map<string, { kode: string; nama: string; subMateri: SubMateriResmi[] }>();
  for (const s of subs) {
    if (!map.has(s.bab_kode)) {
      map.set(s.bab_kode, { kode: s.bab_kode, nama: s.bab_nama, subMateri: [] });
    }
    map.get(s.bab_kode)!.subMateri.push(s);
  }
  // Urut by bab number
  return Array.from(map.values()).sort((a, b) => {
    const na = parseInt(a.kode.replace(/[^0-9]/g, ""), 10);
    const nb = parseInt(b.kode.replace(/[^0-9]/g, ""), 10);
    return na - nb;
  });
}

/** Statistik ringkas untuk admin. */
export const STATS = PETA.stats;

// ============================================================
// Adapter: SubMateriResmi → NodePrasyarat (struct lama untuk engine diagnostik/latihan)
// ============================================================

import type { NodePrasyarat, PetaPrasyarat } from "@/types";

/**
 * Bangun PetaPrasyarat (struct lama) dari peta resmi, dengan `kode` sebagai root.
 * Telusuri prereq STRICT secara BFS, depth = level (root=0, prasyarat langsung=1, dst).
 * Hanya STRICT prereq yang masuk pohon (gating prereq sesuai SRS).
 *
 * Output kompatibel dengan engine diagnostik & latihan existing.
 */
export function petaUntukSubMateri(
  rootKode: string,
  opts?: { maxDepth?: number; includeNonStrict?: boolean; modeKurikulum?: "strict" | "full" },
): PetaPrasyarat | null {
  const root = byKode.get(rootKode);
  if (!root) return null;
  const maxDepth = opts?.maxDepth ?? 8;
  const includeNonStrict = opts?.includeNonStrict ?? false;
  const modeKurikulum = opts?.modeKurikulum ?? "full";

  // Gate: kalau mode strict & root tidak masuk strict, fallback ke full untuk root
  // (root materi user pilih, gak boleh blokir; tapi tree node turunan akan di-filter)
  const passKurikulum = (s: SubMateriResmi) => modeKurikulum === "full" || s.strict;

  const visited = new Map<string, { sub: SubMateriResmi; level: number }>();
  visited.set(root.kode, { sub: root, level: 0 });

  // BFS turun ke prereq
  const queue: { kode: string; level: number }[] = [{ kode: root.kode, level: 0 }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.level >= maxDepth) continue;
    const sub = byKode.get(cur.kode);
    if (!sub) continue;
    for (const p of sub.prereq) {
      if (!includeNonStrict && p.relation !== "STRICT") continue;
      if (visited.has(p.kode)) {
        // Update level kalau path baru lebih dangkal (jarang, tapi safe)
        const ex = visited.get(p.kode)!;
        if (cur.level + 1 < ex.level) ex.level = cur.level + 1;
        continue;
      }
      const psub = byKode.get(p.kode);
      if (!psub) continue;
      // Filter mode kurikulum — skip non-strict prereq saat mode strict
      if (!passKurikulum(psub)) continue;
      visited.set(p.kode, { sub: psub, level: cur.level + 1 });
      queue.push({ kode: p.kode, level: cur.level + 1 });
    }
  }

  // Convert ke NodePrasyarat[]
  const nodes: NodePrasyarat[] = Array.from(visited.values()).map(({ sub, level }) => {
    // Prasyarat array = STRICT prereq yang ada di visited (subset relevant)
    const prasyaratIds = sub.prereq
      .filter((p) => (includeNonStrict || p.relation === "STRICT") && visited.has(p.kode))
      .map((p) => p.kode);
    return {
      id: sub.kode,
      topik: sub.nama,
      level,
      prasyarat: prasyaratIds,
      subKonsep: [sub.nama], // placeholder — diagnostic engine pakai 1 sub-konsep per node
      linkedSlug: sub.kode, // kode resmi = slug SubMateri di Materi yang sesuai
      kelasEstimasi: sub.kelas,
    };
  });

  return {
    rootId: root.kode,
    nodes,
  };
}

// ============================================================
// Dual-track helpers
// ============================================================

/** Filter sub-materi by mode kurikulum. */
export function filterByMode<T extends { kode: string }>(
  items: T[],
  mode: "strict" | "full",
): T[] {
  if (mode === "full") return items;
  const strictSet = new Set(INDEX.strict_kodes ?? []);
  return items.filter((it) => strictSet.has(it.kode));
}

/** Apakah sub-materi masuk Jalur Strict. */
export function isStrict(kode: string): boolean {
  return (INDEX.strict_kodes ?? []).includes(kode);
}
