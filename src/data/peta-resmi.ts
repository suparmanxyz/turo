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
