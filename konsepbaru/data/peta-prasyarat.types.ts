/**
 * Type definitions untuk peta prasyarat Turo
 * Versi: 2.0.0 (25 April 2026)
 *
 * Untuk Claude Code: import these types untuk type-safe parsing JSON
 *
 * Usage:
 *   import { PetaPrasyaratData, SubMateri } from "./turo-peta-prasyarat.types";
 *   const peta: PetaPrasyaratData = require("./turo-peta-prasyarat.json");
 */

export type Jenjang = "SD" | "SMP" | "SMA";

export type Area =
  | "bilangan"
  | "aljabar"
  | "geometri"
  | "statistik"
  | "kalkulus"
  | "trigonometri"
  | "logika"
  | "lain";

export type RelationType = "STRICT" | "SOFT" | "ALTERNATIVE";

export type Weight = "CRITICAL" | "IMPORTANT" | "HELPER";

export interface PrereqRelation {
  /** Kode sub-materi yang menjadi prasyarat */
  kode: string;
  /** Jenis relasi prasyarat */
  relation: RelationType;
  /** Tingkat kepentingan prereq */
  weight: Weight;
  /** Penjelasan kenapa ini prereq */
  reason: string;
}

export interface SubMateri {
  /** Format: {JENJANG}.{KELAS}.B{NOMOR_BAB}.{NOMOR_URUT} */
  kode: string;
  nama: string;
  jenjang: Jenjang;
  kelas: number;
  bab_kode: string;
  bab_nama: string;
  area: Area;
  /** Apakah sub-materi MAKU (Matematika Bisu, milestone visual) */
  is_maku: boolean;
  /** Apakah valid tanpa prereq (foundation node) */
  is_entry_point: boolean;
  durasi_estimasi: string;
  penjelasan: string;
  /** Kedalaman di pohon prasyarat dari root */
  depth: number;
  /** Berapa sub-materi punya ini sebagai prereq */
  dependents_count: number;
  prereq: PrereqRelation[];
}

export interface PetaPrasyaratData {
  $schema: string;
  version: string;
  tanggal_update: string;
  deskripsi: string;
  schema_relation_types: Record<RelationType, string>;
  schema_weights: Record<Weight, string>;
  schema_areas: Area[];
  stats: {
    total_submateri: number;
    total_relations: number;
    submateri_dengan_multi_prereq: number;
    entry_points: number;
    submateri_maku: number;
  };
  submateri: SubMateri[];
}

export interface PetaPrasyaratIndex {
  /** Map jenjang.kelas to list kode */
  by_jenjang_kelas: Record<string, string[]>;
  /** Map area to list kode */
  by_area: Record<Area, string[]>;
  /** Map jenjang.kelas.bab to list kode */
  by_bab: Record<string, string[]>;
  /** List kode entry points */
  entry_points: string[];
  /** List kode MAKU */
  maku_codes: string[];
  /** Reverse index: kode to list dependents */
  dependents: Record<
    string,
    Array<{
      kode: string;
      relation: RelationType;
      weight: Weight;
    }>
  >;
}

/** Mastery status user terhadap sub-materi */
export type MasteryStatus = "siap" | "review" | "remediasi" | "unknown";

export interface SubMateriMastery {
  kode: string;
  status: MasteryStatus;
  /** Confidence 0-1 */
  confidence: number;
  /** Timestamp last assessment (ms) */
  lastAssessedAt: number;
  source: "diagnostic" | "latihan" | "post_test" | "cek_kesiapan";
}

export interface BlindSpot {
  kode: string;
  weight: Weight;
  reason: string;
}
