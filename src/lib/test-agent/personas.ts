/**
 * Persona "siswa" untuk test agent — menentukan bagaimana agent menjawab.
 *
 * Realisme model (per pertanyaan pak ustadz 2026-05-07):
 *   1. **subMastery(item)**: 0..1 — anak punya mastery level per SUB-MATERI
 *      (deterministic per persona × sub via hash, bukan random per item).
 *      Konsisten antar items di sub yang sama.
 *   2. **defaultShouldAnswer**: subMastery × difficulty multiplier × variance.
 *      Easy items boost +10%, hard items penalty -20%, plus carelessness 5%.
 *   3. **Smart distractor**: saat salah, runner pilih distractor strongDistractor=true
 *      lebih sering (simulate miskonsepsi), bukan pure random wrong option.
 *
 * Persona category:
 *   - "realistic" (default): tampil di dropdown UI
 *   - "stress_test": hidden by default, hanya untuk dev/QA stress test engine
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

export type PersonaCategory = "realistic" | "stress_test";

export type Persona = {
  key: string;
  label: string;
  description: string;
  /** Profile siswa untuk diagnostic. */
  jenjang: JenjangResmi;
  kelas: number;
  jalur: import("@/lib/item-bank").JalurDiagnostik;
  /**
   * Mastery level untuk sub tertentu (0..1) — deterministic per (persona, sub).
   * Anak konsisten kuasai/tidak per sub. Default impl di defaultShouldAnswer
   * pakai ini × difficulty multiplier × variance.
   */
  subMastery: (item: ItemBankEntry) => number;
  /**
   * Override default answering logic (untuk stress tests yang ingin pure random
   * atau always_correct/always_wrong).
   */
  shouldAnswerCorrect?: (item: ItemBankEntry, ctx: AnswerContext) => boolean;
  /** Range response time simulasi (detik). */
  responseTimeSec?: { min: number; max: number };
  /**
   * Override bab terakhir yang dipelajari di kelas user. Override default
   * "all_done" supaya bisa test scenario "anak baru bab 2".
   * Format: "B1", "B2", ..., "all_done", "not_started".
   */
  lastBabExposedOverride?: string;
  /**
   * Kategori persona. Default "realistic". Stress test (always_correct/wrong/random)
   * tag "stress_test" supaya bisa di-hide dari UI dropdown.
   */
  category?: PersonaCategory;
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

/**
 * Deterministic hash dari (personaKey, subKode) → 0..1.
 * Dipakai untuk variation per sub: anak punya MAYORITAS sub mastery sesuai
 * archetype, tapi kadang random ada sub yg lebih lemah/kuat (realistis — anak
 * punya gap individual). Konsisten antar items dari sub yang sama.
 */
function subJitter(personaKey: string, subKode: string): number {
  const seed = `${personaKey}|${subKode}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 10000) / 10000; // 0..1
}

/** Difficulty multiplier untuk probability calculation. */
function difficultyMultiplier(item: ItemBankEntry): number {
  if (isEasy(item)) return 1.10;
  if (isHard(item)) return 0.80;
  return 1.00;
}

/**
 * Default shouldAnswerCorrect — combine subMastery + difficulty + carelessness.
 * Realistic model: probability per item ditentukan dari mastery sub (deterministic),
 * di-adjust difficulty, plus carelessness baseline 5%.
 */
export function defaultShouldAnswer(persona: Persona, item: ItemBankEntry): boolean {
  const mastery = persona.subMastery(item);
  const diffMul = difficultyMultiplier(item);
  // Carelessness — bahkan anak kuat bisa salah karena buru-buru/lupa
  const baseProb = mastery * diffMul;
  const finalProb = Math.min(0.95, Math.max(0.05, baseProb));
  return Math.random() < finalProb;
}

// ============================================================
// Personas
// ============================================================

/**
 * Helper untuk apply jitter dari hash ke base mastery.
 * Anak punya MAYORITAS sub mastery sesuai archetype, tapi jitter ±0.15 simulasi
 * variasi individual per sub. Konsisten antar items dari sub yang sama.
 */
function withJitter(personaKey: string, item: ItemBankEntry, base: number, jitterRange = 0.15): number {
  const j = (subJitter(personaKey, item.subMateriKode) - 0.5) * 2 * jitterRange; // ±jitterRange
  return Math.min(0.95, Math.max(0.05, base + j));
}

export const PERSONAS: Persona[] = [
  // --- High performers ---
  {
    key: "high_performer_smp_8",
    label: "High Performer SMP K8",
    description: "Siswa SMP K8 unggul: ~95% benar di kelas ≤7, ~80% di K8, ~50% di K9-10.",
    jenjang: "SMP", kelas: 8, jalur: "smp",
    subMastery: (item) => withJitter("high_performer_smp_8", item, probByKelasGap(item.kelas, 8) + 0.15),
    responseTimeSec: { min: 8, max: 25 },
  },
  {
    key: "high_performer_sma_11",
    label: "High Performer SMA K11",
    description: "Siswa SMA K11 unggul: kuat di SMP, baik di K10-11, OK di K12.",
    jenjang: "SMA", kelas: 11, jalur: "sma-reguler",
    subMastery: (item) => withJitter("high_performer_sma_11", item, probByKelasGap(item.kelas, 11) + 0.10),
    responseTimeSec: { min: 10, max: 30 },
  },
  {
    key: "gifted_smp_7",
    label: "Anak Gifted SMP K7",
    description: "Anak gifted: jago di kelas user dan +1, +2 (sebagian benar di SMA).",
    jenjang: "SMP", kelas: 7, jalur: "smp",
    subMastery: (item) => {
      const gap = item.kelas - 7;
      const base = gap <= 0 ? 0.95 : gap === 1 ? 0.75 : gap === 2 ? 0.55 : 0.30;
      return withJitter("gifted_smp_7", item, base);
    },
    responseTimeSec: { min: 5, max: 15 },
  },

  // --- Average/typical ---
  {
    key: "average_sd_5",
    label: "Average SD K5",
    description: "Siswa SD K5 rata-rata: ~75% di kelas ≤4, ~55% di K5, ~25% di K6+.",
    jenjang: "SD", kelas: 5, jalur: "sd-k4-6",
    subMastery: (item) => withJitter("average_sd_5", item, probByKelasGap(item.kelas, 5)),
    responseTimeSec: { min: 15, max: 45 },
  },
  {
    key: "average_smp_8",
    label: "Average SMP K8",
    description: "Siswa SMP K8 rata-rata: typical performance per gap kelas.",
    jenjang: "SMP", kelas: 8, jalur: "smp",
    subMastery: (item) => withJitter("average_smp_8", item, probByKelasGap(item.kelas, 8)),
    responseTimeSec: { min: 15, max: 40 },
  },
  {
    key: "average_sma_10",
    label: "Average SMA K10",
    description: "Siswa SMA K10 rata-rata.",
    jenjang: "SMA", kelas: 10, jalur: "sma-reguler",
    subMastery: (item) => withJitter("average_sma_10", item, probByKelasGap(item.kelas, 10)),
    responseTimeSec: { min: 15, max: 50 },
  },

  // --- Weak/struggling ---
  {
    key: "weak_foundation_smp_7",
    label: "Weak Foundation SMP K7",
    description: "Lemah di foundation set (SD basics) — ~30% benar di foundation, ~45% di K7.",
    jenjang: "SMP", kelas: 7, jalur: "smp",
    subMastery: (item) => {
      let base: number;
      if (isFoundationKode(item.subMateriKode)) base = 0.30;
      else {
        const gap = item.kelas - 7;
        base = gap < 0 ? 0.55 : gap === 0 ? 0.45 : 0.20;
      }
      return withJitter("weak_foundation_smp_7", item, base);
    },
    responseTimeSec: { min: 25, max: 60 },
  },
  {
    key: "weak_foundation_sma_11",
    label: "Weak Foundation SMA K11",
    description: "Siswa SMA tapi pondasi SMP/SD bermasalah — kandidat path INTENSIVE.",
    jenjang: "SMA", kelas: 11, jalur: "sma-reguler",
    subMastery: (item) => {
      let base: number;
      if (isFoundationKode(item.subMateriKode)) base = 0.25;
      else if (item.jenjang === "SMP") base = 0.40;
      else if (item.kelas <= 10) base = 0.45;
      else base = 0.25;
      return withJitter("weak_foundation_sma_11", item, base);
    },
    responseTimeSec: { min: 30, max: 70 },
  },

  // --- Kelas mismatch (claim higher than actual ability) ---
  {
    key: "mismatch_kelas_4_acts_8",
    label: "Klaim K8 Tapi Kemampuan K4",
    description: "Profile = SMP K8, tapi kemampuan asli setara SD K4 — semua kelas >4 lemah.",
    jenjang: "SMP", kelas: 8, jalur: "smp",
    subMastery: (item) => {
      const base = item.kelas <= 4 ? 0.85 : 0.10;
      return withJitter("mismatch_kelas_4_acts_8", item, base);
    },
    responseTimeSec: { min: 20, max: 60 },
  },

  // --- Area-specific weakness ---
  {
    key: "weak_aljabar_smp_8",
    label: "Lemah Aljabar SMP K8",
    description: "Kuat di bilangan/geometri/statistik, lemah di aljabar (~25%).",
    jenjang: "SMP", kelas: 8, jalur: "smp",
    subMastery: (item) => {
      const base = item.area === "aljabar" ? 0.25 : probByKelasGap(item.kelas, 8) + 0.15;
      return withJitter("weak_aljabar_smp_8", item, base);
    },
    responseTimeSec: { min: 15, max: 45 },
  },
  {
    key: "visual_learner_sma_10",
    label: "Visual Learner SMA K10",
    description: "Kuat di geometri/statistik (visual), lemah di aljabar/kalkulus abstract.",
    jenjang: "SMA", kelas: 10, jalur: "sma-reguler",
    subMastery: (item) => {
      let base: number;
      if (item.area === "geometri" || item.area === "statistik") base = 0.85;
      else if (item.area === "aljabar" || item.area === "kalkulus") base = 0.35;
      else base = 0.55;
      return withJitter("visual_learner_sma_10", item, base);
    },
    responseTimeSec: { min: 15, max: 45 },
  },

  // --- UTBK/SMA spesifik ---
  {
    key: "utbk_target_sma_12",
    label: "UTBK Target SMA K12",
    description: "Persiapan UTBK: kuat di MAKU & area UTBK, OK lainnya.",
    jenjang: "SMA", kelas: 12, jalur: "sma-utbk",
    subMastery: (item) => {
      let base: number;
      if (item.isMaku) base = 0.80;
      else if (item.kelas >= 10) base = 0.65;
      else base = 0.85;
      return withJitter("utbk_target_sma_12", item, base);
    },
    responseTimeSec: { min: 12, max: 35 },
  },

  // --- Difficulty-based ---
  {
    key: "knows_easy_only",
    label: "Hanya Bisa Easy",
    description: "Hanya benar di item easy/untagged — lemah di medium & hard.",
    jenjang: "SMP", kelas: 8, jalur: "smp",
    subMastery: (item) => {
      // Mastery base sub (kelas-related) tetap, difficulty multiplier (di defaultShouldAnswer)
      // akan handle drop di hard. Plus override per difficulty:
      if (isEasy(item) || !item.meta?.difficultyLabel) return withJitter("knows_easy_only", item, 0.80);
      if (isHard(item)) return withJitter("knows_easy_only", item, 0.10);
      return withJitter("knows_easy_only", item, 0.30); // medium
    },
    responseTimeSec: { min: 15, max: 45 },
  },

  // --- Bab exposure scenarios ---
  {
    key: "smp_8_baru_bab_2",
    label: "SMP K8 Baru Bab 2",
    description: "Anak SMP K8 awal semester — baru selesai bab 1-2. Cluster A scope kecil, fokus B+C.",
    jenjang: "SMP", kelas: 8, jalur: "smp",
    subMastery: (item) => withJitter("smp_8_baru_bab_2", item, probByKelasGap(item.kelas, 8)),
    responseTimeSec: { min: 15, max: 40 },
    lastBabExposedOverride: "B2",
  },
  {
    key: "sma_11_belum_mulai",
    label: "SMA K11 Belum Mulai K11",
    description: "Anak baru naik ke K11 belum belajar bab apapun di K11. Engine pakai K10 + foundation only.",
    jenjang: "SMA", kelas: 11, jalur: "sma-reguler",
    subMastery: (item) => withJitter("sma_11_belum_mulai", item, probByKelasGap(item.kelas, 11)),
    responseTimeSec: { min: 15, max: 40 },
    lastBabExposedOverride: "not_started",
  },

  // --- SD low ---
  {
    key: "consistent_sd_3",
    label: "Konsisten SD K3",
    description: "Performa konsisten di SD K3: perfect di K1-3, drop tajam di K4+.",
    jenjang: "SD", kelas: 3, jalur: "sd-k1-3",
    subMastery: (item) => {
      const base = item.kelas <= 3 ? 0.90 : 0.20;
      return withJitter("consistent_sd_3", item, base);
    },
    responseTimeSec: { min: 20, max: 50 },
  },

  // --- Stress tests (HIDDEN dari UI dropdown) ---
  {
    key: "always_correct",
    label: "Always Correct (stress test)",
    description: "Selalu benar — verify engine bisa stop di SE threshold (max kelas).",
    jenjang: "SMP", kelas: 8, jalur: "smp",
    category: "stress_test",
    subMastery: () => 1.0,
    shouldAnswerCorrect: () => true,
    responseTimeSec: { min: 3, max: 8 },
  },
  {
    key: "always_wrong",
    label: "Always Wrong (stress test)",
    description: "Selalu salah — verify path INTENSIVE & remediasi terisi penuh.",
    jenjang: "SMP", kelas: 8, jalur: "smp",
    category: "stress_test",
    subMastery: () => 0.0,
    shouldAnswerCorrect: () => false,
    responseTimeSec: { min: 3, max: 10 },
  },
  {
    key: "random_50",
    label: "Random 50/50 (stress test)",
    description: "Coin flip per item — stress test stabilitas engine.",
    jenjang: "SMP", kelas: 8, jalur: "smp",
    category: "stress_test",
    subMastery: () => 0.5,
    shouldAnswerCorrect: () => probCorrect(0.5),
    responseTimeSec: { min: 5, max: 30 },
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
