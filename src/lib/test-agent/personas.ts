/**
 * Persona "siswa" untuk test agent — menentukan bagaimana agent menjawab.
 *
 * Setiap persona define:
 *   - Profile siswa (jenjang, kelas)
 *   - Logic shouldAnswerCorrect(item, ctx) → boolean
 *   - Optional: typical response time + perilaku khusus
 *
 * Tujuannya cover berbagai skenario realistis + edge cases supaya engine
 * teruji menyeluruh (high performer, lemah foundation, mismatch kelas, dll).
 */

import type { ItemBankEntry } from "@/lib/item-bank";
import type { JenjangResmi } from "@/types";
import { getFoundationKodes } from "@/lib/foundation-set";

// Universal foundation set (semua target digabung) untuk persona check.
const ALL_FOUNDATION_KODES = new Set<string>([
  ...getFoundationKodes("sd-low"),
  ...getFoundationKodes("sd-mid"),
  ...getFoundationKodes("sd-high"),
  ...getFoundationKodes("smp"),
  ...getFoundationKodes("sma"),
]);

function isFoundationKode(kode: string): boolean {
  return ALL_FOUNDATION_KODES.has(kode);
}

export type AnswerContext = {
  /** Berapa item sudah dijawab di run ini. */
  itemIdx: number;
  /** Stage saat item ini di-serve. */
  stage: string;
};

export type Persona = {
  key: string;
  label: string;
  description: string;
  /** Profile siswa untuk diagnostic. */
  jenjang: JenjangResmi;
  kelas: number;
  jalur: import("@/lib/item-bank").JalurDiagnostik;
  /** Decide jawaban benar/salah. */
  shouldAnswerCorrect: (item: ItemBankEntry, ctx: AnswerContext) => boolean;
  /** Range response time simulasi (detik). */
  responseTimeSec?: { min: number; max: number };
};

// ============================================================
// Helpers
// ============================================================

function probCorrect(p: number): boolean {
  return Math.random() < p;
}

/** Probabilitas berdasarkan gap kelas item vs kelas user. */
function probByKelasGap(itemKelas: number, userKelas: number): number {
  const gap = itemKelas - userKelas;
  if (gap <= -2) return 0.95; // 2+ kelas di bawah → expert
  if (gap === -1) return 0.85;
  if (gap === 0) return 0.65; // kelas user
  if (gap === 1) return 0.40;
  return 0.20; // 2+ di atas
}

function isHard(item: ItemBankEntry): boolean {
  return item.meta?.difficultyLabel === "hard";
}
function isEasy(item: ItemBankEntry): boolean {
  return item.meta?.difficultyLabel === "easy";
}

// ============================================================
// Personas
// ============================================================

export const PERSONAS: Persona[] = [
  // --- High performers ---
  {
    key: "high_performer_smp_8",
    label: "High Performer SMP K8",
    description: "Siswa SMP K8 unggul: 95% benar di kelas ≤7, 80% di K8, 50% di K9-10.",
    jenjang: "SMP",
    kelas: 8,
    jalur: "smp",
    shouldAnswerCorrect: (item) => probCorrect(probByKelasGap(item.kelas, 8) + 0.15),
    responseTimeSec: { min: 8, max: 25 },
  },
  {
    key: "high_performer_sma_11",
    label: "High Performer SMA K11",
    description: "Siswa SMA K11 unggul: kuat di SMP, baik di K10-11, OK di K12.",
    jenjang: "SMA",
    kelas: 11,
    jalur: "sma-reguler",
    shouldAnswerCorrect: (item) => probCorrect(probByKelasGap(item.kelas, 11) + 0.10),
    responseTimeSec: { min: 10, max: 30 },
  },
  {
    key: "gifted_smp_7",
    label: "Anak Gifted SMP K7",
    description: "Anak gifted: jago di kelas user dan +1, +2 (sebagian benar di SMA).",
    jenjang: "SMP",
    kelas: 7,
    jalur: "smp",
    shouldAnswerCorrect: (item) => {
      const gap = item.kelas - 7;
      if (gap <= 0) return probCorrect(0.95);
      if (gap === 1) return probCorrect(0.75);
      if (gap === 2) return probCorrect(0.55);
      return probCorrect(0.30);
    },
    responseTimeSec: { min: 5, max: 15 },
  },

  // --- Average/typical ---
  {
    key: "average_sd_5",
    label: "Average SD K5",
    description: "Siswa SD K5 rata-rata: 75% di kelas ≤4, 55% di K5, 25% di K6+.",
    jenjang: "SD",
    kelas: 5,
    jalur: "sd-k4-6",
    shouldAnswerCorrect: (item) => probCorrect(probByKelasGap(item.kelas, 5)),
    responseTimeSec: { min: 15, max: 45 },
  },
  {
    key: "average_smp_8",
    label: "Average SMP K8",
    description: "Siswa SMP K8 rata-rata: typical performance per gap kelas.",
    jenjang: "SMP",
    kelas: 8,
    jalur: "smp",
    shouldAnswerCorrect: (item) => probCorrect(probByKelasGap(item.kelas, 8)),
    responseTimeSec: { min: 15, max: 40 },
  },
  {
    key: "average_sma_10",
    label: "Average SMA K10",
    description: "Siswa SMA K10 rata-rata.",
    jenjang: "SMA",
    kelas: 10,
    jalur: "sma-reguler",
    shouldAnswerCorrect: (item) => probCorrect(probByKelasGap(item.kelas, 10)),
    responseTimeSec: { min: 15, max: 50 },
  },

  // --- Weak/struggling ---
  {
    key: "weak_foundation_smp_7",
    label: "Weak Foundation SMP K7",
    description: "Lemah di foundation set (SD basics) — hanya 30% benar di foundation, 50% di K7.",
    jenjang: "SMP",
    kelas: 7,
    jalur: "smp",
    shouldAnswerCorrect: (item) => {
      if (isFoundationKode(item.subMateriKode)) return probCorrect(0.30);
      const gap = item.kelas - 7;
      if (gap < 0) return probCorrect(0.55);
      if (gap === 0) return probCorrect(0.45);
      return probCorrect(0.20);
    },
    responseTimeSec: { min: 25, max: 60 },
  },
  {
    key: "weak_foundation_sma_11",
    label: "Weak Foundation SMA K11",
    description: "Siswa SMA tapi pondasi SMP/SD bermasalah — kandidat path INTENSIVE.",
    jenjang: "SMA",
    kelas: 11,
    jalur: "sma-reguler",
    shouldAnswerCorrect: (item) => {
      if (isFoundationKode(item.subMateriKode)) return probCorrect(0.25);
      if (item.jenjang === "SMP") return probCorrect(0.40);
      if (item.kelas <= 10) return probCorrect(0.45);
      return probCorrect(0.25);
    },
    responseTimeSec: { min: 30, max: 70 },
  },

  // --- Kelas mismatch (claim higher than actual ability) ---
  {
    key: "mismatch_kelas_4_acts_8",
    label: "Klaim K8 Tapi Kemampuan K4",
    description: "Profile = SMP K8, tapi kemampuan asli setara SD K4 — semua kelas >4 salah.",
    jenjang: "SMP",
    kelas: 8,
    jalur: "smp",
    shouldAnswerCorrect: (item) => {
      if (item.kelas <= 4) return probCorrect(0.85);
      return probCorrect(0.10);
    },
    responseTimeSec: { min: 20, max: 60 },
  },

  // --- Area-specific weakness ---
  {
    key: "weak_aljabar_smp_8",
    label: "Lemah Aljabar SMP K8",
    description: "Kuat di bilangan/geometri, lemah di aljabar (90% vs 25%).",
    jenjang: "SMP",
    kelas: 8,
    jalur: "smp",
    shouldAnswerCorrect: (item) => {
      if (item.area === "aljabar") return probCorrect(0.25);
      return probCorrect(probByKelasGap(item.kelas, 8) + 0.15);
    },
    responseTimeSec: { min: 15, max: 45 },
  },
  {
    key: "visual_learner_sma_10",
    label: "Visual Learner SMA K10",
    description: "Kuat di geometri/statistik (visual), lemah di aljabar/kalkulus abstract.",
    jenjang: "SMA",
    kelas: 10,
    jalur: "sma-reguler",
    shouldAnswerCorrect: (item) => {
      if (item.area === "geometri" || item.area === "statistik") return probCorrect(0.85);
      if (item.area === "aljabar" || item.area === "kalkulus") return probCorrect(0.35);
      return probCorrect(0.55);
    },
    responseTimeSec: { min: 15, max: 45 },
  },

  // --- UTBK/SMA spesifik ---
  {
    key: "utbk_target_sma_12",
    label: "UTBK Target SMA K12",
    description: "Persiapan UTBK: kuat di MAKU & area UTBK, OK lainnya.",
    jenjang: "SMA",
    kelas: 12,
    jalur: "sma-utbk",
    shouldAnswerCorrect: (item) => {
      if (item.isMaku) return probCorrect(0.80);
      if (item.kelas >= 10) return probCorrect(0.65);
      return probCorrect(0.85);
    },
    responseTimeSec: { min: 12, max: 35 },
  },

  // --- Stress tests / edge cases ---
  {
    key: "always_correct",
    label: "Always Correct (stress test)",
    description: "Selalu benar — verify engine bisa stop di SE threshold (max kelas).",
    jenjang: "SMP",
    kelas: 8,
    jalur: "smp",
    shouldAnswerCorrect: () => true,
    responseTimeSec: { min: 3, max: 8 },
  },
  {
    key: "always_wrong",
    label: "Always Wrong (stress test)",
    description: "Selalu salah — verify path INTENSIVE & remediasi terisi penuh.",
    jenjang: "SMP",
    kelas: 8,
    jalur: "smp",
    shouldAnswerCorrect: () => false,
    responseTimeSec: { min: 3, max: 10 },
  },
  {
    key: "random_50",
    label: "Random 50/50 (stress test)",
    description: "Coin flip per item — stress test stabilitas engine.",
    jenjang: "SMP",
    kelas: 8,
    jalur: "smp",
    shouldAnswerCorrect: () => probCorrect(0.5),
    responseTimeSec: { min: 5, max: 30 },
  },

  // --- Difficulty-based ---
  {
    key: "knows_easy_only",
    label: "Hanya Bisa Easy",
    description: "Hanya benar di item easy/untagged — lemah di medium & hard.",
    jenjang: "SMP",
    kelas: 8,
    jalur: "smp",
    shouldAnswerCorrect: (item) => {
      if (isEasy(item) || !item.meta?.difficultyLabel) return probCorrect(0.80);
      if (isHard(item)) return probCorrect(0.10);
      return probCorrect(0.30); // medium
    },
    responseTimeSec: { min: 15, max: 45 },
  },

  // --- SD low ---
  {
    key: "consistent_sd_3",
    label: "Konsisten SD K3",
    description: "Performa konsisten di SD K3: perfect di K1-3, drop tajam di K4+.",
    jenjang: "SD",
    kelas: 3,
    jalur: "sd-k1-3",
    shouldAnswerCorrect: (item) => {
      if (item.kelas <= 3) return probCorrect(0.90);
      return probCorrect(0.20);
    },
    responseTimeSec: { min: 20, max: 50 },
  },
];

export const PERSONAS_BY_KEY: Record<string, Persona> = Object.fromEntries(
  PERSONAS.map((p) => [p.key, p]),
);

export function getPersona(key: string): Persona | null {
  return PERSONAS_BY_KEY[key] ?? null;
}

/** Sample random response time dari persona (ms). Default 8-30s kalau tidak set. */
export function sampleResponseTimeMs(persona: Persona): number {
  const r = persona.responseTimeSec ?? { min: 8, max: 30 };
  const sec = r.min + Math.random() * (r.max - r.min);
  return Math.round(sec * 1000);
}
