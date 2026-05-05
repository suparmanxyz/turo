/**
 * Mathematical Maturity Engine — 5 dimensi profil kognitif siswa.
 *
 * Berdasarkan konsep Integral Smart Sequential Diagnostic. Mengukur BUKAN
 * apa yang siswa tahu (itu sudah dicapture cluster A/B/C scoring), tapi
 * BAGAIMANA siswa mengerjakan matematika — kematangan berpikir matematisnya.
 *
 * 5 Dimensi (total bobot 100%):
 *   1. Abstract Reasoning (30%) — Pattern, Symbolic, Conceptual, Logical
 *   2. Problem Solving (25%) — Multi-step, Analytical, Strategy, Efficiency
 *   3. Math Communication (20%) — Reasoning Quality, Clarity, Language, Flow
 *   4. Persistence & Focus (15%) — Time Consistency, Completion, Effort, Detail
 *   5. Confidence & Self-Regulation (10%) — Performance, Risk, Self-Assessment, Adaptive
 *
 * Source data:
 *   - Behavioral data per response: time, correctness, item metadata
 *   - Optional: 1 single confidence rating di akhir diagnostik (non-burdensome)
 *
 * 5 Levels per sub-dimensi: MASTERY (90+) / PROFICIENT (80-89) /
 * DEVELOPING (70-79) / EMERGING (60-69) / BEGINNING (<60)
 */

import type { Response } from "@/lib/irt-engine";
import type { ItemBankEntry } from "@/lib/item-bank";

// ============================================================
// Types
// ============================================================

export type MaturityLevel = "MASTERY" | "PROFICIENT" | "DEVELOPING" | "EMERGING" | "BEGINNING";

export type MaturityDimension =
  | "abstract_reasoning"
  | "problem_solving"
  | "communication"
  | "persistence"
  | "confidence";

export type MaturitySubDimension =
  // Abstract Reasoning
  | "pattern_recognition"
  | "symbolic_manipulation"
  | "conceptual_understanding"
  | "logical_reasoning"
  // Problem Solving
  | "multi_step_problems"
  | "analytical_consistency"
  | "strategy_selection"
  | "solution_efficiency"
  // Communication
  | "reasoning_quality"
  | "explanation_clarity"
  | "language_processing"
  | "logical_flow"
  // Persistence
  | "time_consistency"
  | "completion_rate"
  | "effort_maintenance"
  | "attention_to_detail"
  // Confidence
  | "performance_consistency"
  | "risk_management"
  | "self_assessment_accuracy"
  | "adaptive_behavior";

export type SubDimensionScore = {
  subDimension: MaturitySubDimension;
  score: number; // 0-100
  level: MaturityLevel;
  itemsContributing: number;
  /** Interpretasi singkat sesuai level (untuk display). */
  interpretation: string;
  /** Rekomendasi actionable (untuk display). */
  recommendation: string;
};

export type DimensionScore = {
  dimension: MaturityDimension;
  weight: number; // 0-1
  overall: number; // 0-100, weighted avg dari sub-dimensi
  level: MaturityLevel;
  subScores: SubDimensionScore[];
};

export type MaturityProfile = {
  overall: number; // 0-100, weighted avg dari 5 dimensi
  level: MaturityLevel;
  dimensions: DimensionScore[];
  /** Top 3 strengths (sub-dimensi MASTERY/PROFICIENT). */
  strengths: { subDimension: MaturitySubDimension; score: number; level: MaturityLevel }[];
  /** Top 3 priority areas (sub-dimensi BEGINNING/EMERGING). */
  priorityAreas: { subDimension: MaturitySubDimension; score: number; level: MaturityLevel }[];
  /** Confidence rating dari user (1-5), kalau ada. */
  userConfidenceRating?: number;
  /** Total items dianalisis. */
  totalItems: number;
};

// ============================================================
// Behavioral data input
// ============================================================

export type BehavioralResponse = {
  itemId: string;
  correct: boolean;
  responseTimeMs?: number;
  /** Apakah user skip (tidak dijawab). */
  skipped?: boolean;
  /** Berapa kali user ganti pilihan sebelum submit (proxy hesitation). */
  changeCount?: number;
};

// ============================================================
// Sub-dimension definitions + interpretations
// ============================================================

const DIMENSION_WEIGHTS: Record<MaturityDimension, number> = {
  abstract_reasoning: 0.30,
  problem_solving: 0.25,
  communication: 0.20,
  persistence: 0.15,
  confidence: 0.10,
};

const SUBDIMS_BY_DIMENSION: Record<MaturityDimension, MaturitySubDimension[]> = {
  abstract_reasoning: ["pattern_recognition", "symbolic_manipulation", "conceptual_understanding", "logical_reasoning"],
  problem_solving: ["multi_step_problems", "analytical_consistency", "strategy_selection", "solution_efficiency"],
  communication: ["reasoning_quality", "explanation_clarity", "language_processing", "logical_flow"],
  persistence: ["time_consistency", "completion_rate", "effort_maintenance", "attention_to_detail"],
  confidence: ["performance_consistency", "risk_management", "self_assessment_accuracy", "adaptive_behavior"],
};

export const SUBDIM_LABELS: Record<MaturitySubDimension, string> = {
  pattern_recognition: "Pengenalan Pola",
  symbolic_manipulation: "Manipulasi Simbolik",
  conceptual_understanding: "Pemahaman Konsep",
  logical_reasoning: "Penalaran Logis",
  multi_step_problems: "Soal Multi-Langkah",
  analytical_consistency: "Konsistensi Analitis",
  strategy_selection: "Pemilihan Strategi",
  solution_efficiency: "Efisiensi Solusi",
  reasoning_quality: "Kualitas Penalaran",
  explanation_clarity: "Kejelasan Penjelasan",
  language_processing: "Pemrosesan Bahasa Matematis",
  logical_flow: "Alur Logis",
  time_consistency: "Konsistensi Waktu",
  completion_rate: "Tingkat Penyelesaian",
  effort_maintenance: "Pemeliharaan Usaha",
  attention_to_detail: "Perhatian Detail",
  performance_consistency: "Konsistensi Performa",
  risk_management: "Manajemen Risiko (Hindari Jebakan)",
  self_assessment_accuracy: "Akurasi Penilaian Diri",
  adaptive_behavior: "Perilaku Adaptif",
};

export const DIMENSION_LABELS: Record<MaturityDimension, string> = {
  abstract_reasoning: "Penalaran Abstrak",
  problem_solving: "Pemecahan Masalah",
  communication: "Komunikasi Matematis",
  persistence: "Ketekunan & Fokus",
  confidence: "Kepercayaan Diri & Regulasi",
};

// ============================================================
// Score → Level
// ============================================================

export function scoreToLevel(score: number): MaturityLevel {
  if (score >= 90) return "MASTERY";
  if (score >= 80) return "PROFICIENT";
  if (score >= 70) return "DEVELOPING";
  if (score >= 60) return "EMERGING";
  return "BEGINNING";
}

// ============================================================
// Sub-dimension scorers — derive dari behavioral + item metadata
// ============================================================

type ScoreContext = {
  responses: BehavioralResponse[];
  itemMap: Map<string, ItemBankEntry>;
  userConfidenceRating?: number; // 1-5
};

/** Helper: filter responses dengan items yang punya kondisi tertentu. */
function filterItems(ctx: ScoreContext, predicate: (it: ItemBankEntry) => boolean): BehavioralResponse[] {
  return ctx.responses.filter((r) => {
    const item = ctx.itemMap.get(r.itemId);
    return item ? predicate(item) : false;
  });
}

/** Accuracy ratio dari response set. */
function accuracy(rs: BehavioralResponse[]): number {
  const answered = rs.filter((r) => !r.skipped);
  if (answered.length === 0) return 0;
  return answered.filter((r) => r.correct).length / answered.length;
}

// === Abstract Reasoning ===

function scorePatternRecognition(ctx: ScoreContext): number {
  // Items dengan microskill mengandung "pola" / "pattern" / "barisan"
  const relevant = filterItems(ctx, (it) =>
    /pola|pattern|barisan|deret|sequence/i.test(it.meta?.microskill ?? "") ||
    /pola|barisan|deret/i.test(it.subMateriKode),
  );
  if (relevant.length === 0) return 50; // No data, return neutral baseline
  return Math.round(accuracy(relevant) * 100);
}

function scoreSymbolicManipulation(ctx: ScoreContext): number {
  // Items dengan requiresManipulation=true atau microskill aljabar/manipulasi
  const relevant = filterItems(ctx, (it) =>
    it.meta?.requiresManipulation === true ||
    /aljabar|manipulasi|substitusi|faktor/i.test(it.meta?.microskill ?? ""),
  );
  if (relevant.length === 0) return 50;
  return Math.round(accuracy(relevant) * 100);
}

function scoreConceptualUnderstanding(ctx: ScoreContext): number {
  // Items dengan reasoningQualityRequired >= 3 (analisis atau analisis kreatif)
  const relevant = filterItems(ctx, (it) => (it.meta?.reasoningQualityRequired ?? 0) >= 3);
  if (relevant.length === 0) return 50;
  return Math.round(accuracy(relevant) * 100);
}

function scoreLogicalReasoning(ctx: ScoreContext): number {
  // Items dengan analyticalSteps >= 2 dan abstract/intuitive leap
  const relevant = filterItems(ctx, (it) =>
    (it.meta?.analyticalSteps ?? 0) >= 2 &&
    (it.meta?.intuitiveLeap === true || it.meta?.abstractQuestion === true),
  );
  if (relevant.length === 0) return 50;
  return Math.round(accuracy(relevant) * 100);
}

// === Problem Solving ===

function scoreMultiStepProblems(ctx: ScoreContext): number {
  const relevant = filterItems(ctx, (it) => it.meta?.multiStep === true);
  if (relevant.length === 0) return 50;
  return Math.round(accuracy(relevant) * 100);
}

function scoreAnalyticalConsistency(ctx: ScoreContext): number {
  // Bandingkan accuracy single-step vs multi-step. Konsistensi tinggi = accuracy mirip.
  const single = filterItems(ctx, (it) => !it.meta?.multiStep);
  const multi = filterItems(ctx, (it) => it.meta?.multiStep === true);
  if (single.length === 0 || multi.length === 0) return 50;
  const dropPct = Math.max(0, accuracy(single) - accuracy(multi));
  // Drop kecil = konsistensi tinggi. dropPct 0 → 100, dropPct 0.5 → 0
  return Math.round(Math.max(0, Math.min(100, 100 - dropPct * 200)));
}

function scoreStrategySelection(ctx: ScoreContext): number {
  // Hard items dengan strongDistractor — kalau betul artinya pilih strategi tepat
  const relevant = filterItems(ctx, (it) =>
    it.meta?.difficultyLabel === "hard" && it.meta?.strongDistractor === true,
  );
  if (relevant.length === 0) {
    // Fallback: hard items in general
    const hardItems = filterItems(ctx, (it) => it.meta?.difficultyLabel === "hard");
    if (hardItems.length === 0) return 50;
    return Math.round(accuracy(hardItems) * 100);
  }
  return Math.round(accuracy(relevant) * 100);
}

function scoreSolutionEfficiency(ctx: ScoreContext): number {
  // Bandingkan response time terhadap expectedResponseTime
  const relevant = ctx.responses.filter((r) => {
    const item = ctx.itemMap.get(r.itemId);
    return item && r.responseTimeMs && item.meta?.expectedResponseTimeSec && r.correct;
  });
  if (relevant.length === 0) return 50;
  let efficiencyScore = 0;
  for (const r of relevant) {
    const item = ctx.itemMap.get(r.itemId)!;
    const expectedMs = (item.meta?.expectedResponseTimeSec ?? 90) * 1000;
    const ratio = (r.responseTimeMs ?? expectedMs) / expectedMs;
    // ratio = 1 (tepat waktu) → 80, ratio = 0.5 (cepat) → 100, ratio = 2 (lambat) → 50
    if (ratio <= 0.5) efficiencyScore += 100;
    else if (ratio <= 1) efficiencyScore += 80 + (1 - ratio) * 40;
    else if (ratio <= 2) efficiencyScore += Math.max(50, 80 - (ratio - 1) * 30);
    else efficiencyScore += Math.max(20, 50 - (ratio - 2) * 10);
  }
  return Math.round(efficiencyScore / relevant.length);
}

// === Communication ===
// Note: tanpa fitur ekspresi/penjelasan tertulis, score ini di-proxy dari
// kemampuan handle reading-heavy dan abstract questions

function scoreReasoningQuality(ctx: ScoreContext): number {
  const relevant = filterItems(ctx, (it) => (it.meta?.reasoningQualityRequired ?? 0) >= 2);
  if (relevant.length === 0) return 60;
  return Math.round(accuracy(relevant) * 100);
}

function scoreExplanationClarity(_ctx: ScoreContext): number {
  // Tanpa fitur ekspresi tertulis, default ke neutral. Future: kalau ada
  // fitur "jelaskan jawabanmu", score dari grading AI.
  return 70;
}

function scoreLanguageProcessing(ctx: ScoreContext): number {
  // Items reading-heavy: kalau betul artinya bisa parse bahasa matematis
  const relevant = filterItems(ctx, (it) => it.meta?.readingHeavy === true);
  if (relevant.length === 0) return 60;
  return Math.round(accuracy(relevant) * 100);
}

function scoreLogicalFlow(ctx: ScoreContext): number {
  // Items dengan analyticalSteps >= 3: kalau betul artinya alur logis terjaga
  const relevant = filterItems(ctx, (it) => (it.meta?.analyticalSteps ?? 0) >= 3);
  if (relevant.length === 0) return 60;
  return Math.round(accuracy(relevant) * 100);
}

// === Persistence & Focus ===

function scoreTimeConsistency(ctx: ScoreContext): number {
  const times = ctx.responses
    .filter((r) => r.responseTimeMs && r.responseTimeMs > 1000)
    .map((r) => r.responseTimeMs!);
  if (times.length < 3) return 50;
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((s, t) => s + (t - mean) ** 2, 0) / times.length;
  const stddev = Math.sqrt(variance);
  const cv = stddev / mean; // coefficient of variation
  // CV rendah = konsisten. CV 0 → 100, CV 0.5 → 80, CV 1 → 60, CV 2 → 30
  if (cv <= 0.3) return 100;
  if (cv <= 0.5) return Math.round(100 - (cv - 0.3) * 100);
  if (cv <= 1) return Math.round(80 - (cv - 0.5) * 40);
  return Math.max(20, Math.round(60 - (cv - 1) * 30));
}

function scoreCompletionRate(ctx: ScoreContext): number {
  if (ctx.responses.length === 0) return 0;
  const skipped = ctx.responses.filter((r) => r.skipped).length;
  return Math.round(((ctx.responses.length - skipped) / ctx.responses.length) * 100);
}

function scoreEffortMaintenance(ctx: ScoreContext): number {
  // Bandingkan accuracy paruh awal vs paruh akhir. Drop besar = stamina turun.
  if (ctx.responses.length < 6) return 70;
  const half = Math.floor(ctx.responses.length / 2);
  const firstHalf = ctx.responses.slice(0, half);
  const lastHalf = ctx.responses.slice(half);
  const drop = Math.max(0, accuracy(firstHalf) - accuracy(lastHalf));
  // drop 0 → 100, drop 0.3 → 60, drop 0.5+ → 30
  return Math.max(20, Math.round(100 - drop * 150));
}

function scoreAttentionToDetail(ctx: ScoreContext): number {
  // Easy items yang salah = ceroboh (low attention)
  const easyItems = filterItems(ctx, (it) => it.meta?.difficultyLabel === "easy");
  if (easyItems.length === 0) return 70;
  return Math.round(accuracy(easyItems) * 100);
}

// === Confidence & Self-Regulation ===

function scorePerformanceConsistency(ctx: ScoreContext): number {
  // Stddev accuracy across area/topic groups. Konsisten tinggi = stable.
  const byKodePrefix = new Map<string, BehavioralResponse[]>();
  for (const r of ctx.responses) {
    const item = ctx.itemMap.get(r.itemId);
    if (!item) continue;
    const prefix = item.subMateriKode.split(".").slice(0, 2).join("."); // e.g. SD.6
    if (!byKodePrefix.has(prefix)) byKodePrefix.set(prefix, []);
    byKodePrefix.get(prefix)!.push(r);
  }
  if (byKodePrefix.size < 2) return 70;
  const accs = [...byKodePrefix.values()].filter((rs) => rs.length >= 2).map(accuracy);
  if (accs.length < 2) return 70;
  const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
  const stddev = Math.sqrt(accs.reduce((s, a) => s + (a - mean) ** 2, 0) / accs.length);
  return Math.max(30, Math.round(100 - stddev * 200));
}

function scoreRiskManagement(ctx: ScoreContext): number {
  // Items dengan strongDistractor: kalau betul artinya tidak terjebak distractor
  const relevant = filterItems(ctx, (it) => it.meta?.strongDistractor === true);
  if (relevant.length === 0) return 60;
  return Math.round(accuracy(relevant) * 100);
}

function scoreSelfAssessmentAccuracy(ctx: ScoreContext): number {
  // Calibration: kalau user kasih confidence rating, bandingkan dengan actual accuracy
  if (!ctx.userConfidenceRating) return 70;
  const actualAcc = accuracy(ctx.responses);
  // userConfidenceRating 1-5 → expected accuracy 20%/40%/60%/80%/100%
  const expectedAcc = ctx.userConfidenceRating * 0.2;
  const gap = Math.abs(actualAcc - expectedAcc);
  // Gap 0 → 100, Gap 0.3 → 70, Gap 0.5+ → 30
  return Math.max(30, Math.round(100 - gap * 200));
}

function scoreAdaptiveBehavior(ctx: ScoreContext): number {
  // Kalau ada changeCount data: changes count rendah + correct = adaptive baik
  const withChange = ctx.responses.filter((r) => typeof r.changeCount === "number");
  if (withChange.length < 3) return 70;
  const avgChange = withChange.reduce((s, r) => s + (r.changeCount ?? 0), 0) / withChange.length;
  // avgChange 0 → 100, 1 → 80, 2 → 60, 3+ → 40
  if (avgChange <= 0.5) return 100;
  if (avgChange <= 1) return 90;
  if (avgChange <= 1.5) return 75;
  if (avgChange <= 2) return 60;
  return Math.max(30, Math.round(60 - (avgChange - 2) * 15));
}

// ============================================================
// Sub-dimension scorer dispatch
// ============================================================

const SUBDIM_SCORERS: Record<MaturitySubDimension, (ctx: ScoreContext) => number> = {
  pattern_recognition: scorePatternRecognition,
  symbolic_manipulation: scoreSymbolicManipulation,
  conceptual_understanding: scoreConceptualUnderstanding,
  logical_reasoning: scoreLogicalReasoning,
  multi_step_problems: scoreMultiStepProblems,
  analytical_consistency: scoreAnalyticalConsistency,
  strategy_selection: scoreStrategySelection,
  solution_efficiency: scoreSolutionEfficiency,
  reasoning_quality: scoreReasoningQuality,
  explanation_clarity: scoreExplanationClarity,
  language_processing: scoreLanguageProcessing,
  logical_flow: scoreLogicalFlow,
  time_consistency: scoreTimeConsistency,
  completion_rate: scoreCompletionRate,
  effort_maintenance: scoreEffortMaintenance,
  attention_to_detail: scoreAttentionToDetail,
  performance_consistency: scorePerformanceConsistency,
  risk_management: scoreRiskManagement,
  self_assessment_accuracy: scoreSelfAssessmentAccuracy,
  adaptive_behavior: scoreAdaptiveBehavior,
};

// ============================================================
// Interpretation library
// ============================================================

const INTERPRETATIONS: Partial<Record<MaturitySubDimension, Record<MaturityLevel, { interp: string; rec: string }>>> = {
  pattern_recognition: {
    MASTERY: { interp: "Sangat mahir mengenali pola tersembunyi dalam soal.", rec: "Tantangan: soal olimpiade tingkat nasional dengan pola kompleks." },
    PROFICIENT: { interp: "Mengenali sebagian besar pola matematis dengan baik.", rec: "Latih dengan pola non-standar dan kombinatorial." },
    DEVELOPING: { interp: "Mampu mengenali pola dasar hingga menengah.", rec: "Perbanyak latihan deret dan barisan dengan bantuan visual." },
    EMERGING: { interp: "Pengenalan pola tidak konsisten — sering terlewat pola dalam bentuk berbeda.", rec: "Latihan pengenalan pola bertahap dari konkret menuju abstrak." },
    BEGINNING: { interp: "Kesulitan mengidentifikasi pola matematis sederhana.", rec: "Mulai dengan pola sangat sederhana menggunakan benda konkret." },
  },
  symbolic_manipulation: {
    MASTERY: { interp: "Manipulasi simbolik lancar dan fleksibel.", rec: "Aljabar abstrak tingkat lanjut, soal kompetisi." },
    PROFICIENT: { interp: "Manipulasi simbolik solid untuk sebagian besar kasus.", rec: "Latih ekspresi rasional kompleks dan faktorisasi lanjut." },
    DEVELOPING: { interp: "Manipulasi simbolik memadai untuk level menengah.", rec: "Fokus pada area yang masih lemah, latihan bertahap." },
    EMERGING: { interp: "Manipulasi simbolik dasar namun tidak konsisten.", rec: "Ulasan aljabar sistematis, panduan langkah demi langkah." },
    BEGINNING: { interp: "Kemampuan manipulasi simbolik sangat terbatas.", rec: "Perbaiki dasar aljabar, pendekatan konkret menuju abstrak." },
  },
  multi_step_problems: {
    MASTERY: { interp: "Menguasai penyelesaian masalah multi-langkah kompleks.", rec: "Soal multi-langkah tingkat kompetisi." },
    PROFICIENT: { interp: "Menangani masalah multi-langkah dengan baik.", rec: "Tingkatkan kompleksitas secara bertahap." },
    DEVELOPING: { interp: "Mampu masalah 3-4 langkah, kesulitan dengan urutan lebih panjang.", rec: "Latih pendekatan terstruktur, ajarkan strategi." },
    EMERGING: { interp: "Masalah 2-3 langkah dengan bantuan, sering kehilangan jejak.", rec: "Latih langkah demi langkah dengan bimbingan." },
    BEGINNING: { interp: "Kesulitan mempertahankan rantai penyelesaian.", rec: "Kuasai masalah langkah tunggal dulu." },
  },
  time_consistency: {
    MASTERY: { interp: "Waktu respons sangat stabil — pengaturan waktu excellent.", rec: "Pertahankan konsistensi." },
    PROFICIENT: { interp: "Konsisten dengan variasi kecil.", rec: "Sempurnakan manajemen waktu." },
    DEVELOPING: { interp: "Beberapa fluktuasi waktu — kadang terburu, kadang lambat.", rec: "Latih kecepatan yang konsisten." },
    EMERGING: { interp: "Pengaturan waktu buruk — variasi sering.", rec: "Latih manajemen waktu dengan timer." },
    BEGINNING: { interp: "Tidak ada kesadaran waktu, sangat tidak konsisten.", rec: "Bangun kesadaran waktu dasar." },
  },
  completion_rate: {
    MASTERY: { interp: "Tidak pernah menyerah — ketekunan luar biasa.", rec: "Tantangan dengan tugas lebih panjang." },
    PROFICIENT: { interp: "Ketekunan tinggi dengan sedikit skip.", rec: "Bangun stamina untuk tugas menantang." },
    DEVELOPING: { interp: "Umumnya tekun, kadang skip masalah sulit.", rec: "Kembangkan strategi ketekunan." },
    EMERGING: { interp: "Sering skip — toleransi frustrasi rendah.", rec: "Latih ketekunan dengan target kecil." },
    BEGINNING: { interp: "Mudah menyerah — banyak skip.", rec: "Bangun pengalaman sukses untuk membangun kepercayaan diri." },
  },
};

function getInterpretation(subDim: MaturitySubDimension, level: MaturityLevel): { interpretation: string; recommendation: string } {
  const dimInterp = INTERPRETATIONS[subDim];
  if (dimInterp?.[level]) {
    return { interpretation: dimInterp[level].interp, recommendation: dimInterp[level].rec };
  }
  // Fallback generic
  const label = SUBDIM_LABELS[subDim];
  const fallback: Record<MaturityLevel, { interp: string; rec: string }> = {
    MASTERY: { interp: `${label}: Sangat baik, level mastery.`, rec: "Pertahankan dan kembangkan ke level lanjut." },
    PROFICIENT: { interp: `${label}: Solid, sebagian besar kasus terkuasai.`, rec: "Latih kasus yang lebih kompleks." },
    DEVELOPING: { interp: `${label}: Memadai untuk level menengah.`, rec: "Perkuat dengan latihan bertahap." },
    EMERGING: { interp: `${label}: Dasar terlihat tapi belum konsisten.`, rec: "Latihan terstruktur dengan bimbingan." },
    BEGINNING: { interp: `${label}: Masih terbatas, perlu fondasi.`, rec: "Mulai dari konsep dasar dengan dukungan." },
  };
  return { interpretation: fallback[level].interp, recommendation: fallback[level].rec };
}

// ============================================================
// Main computation
// ============================================================

/**
 * Compute Mathematical Maturity profile dari behavioral responses + items.
 *
 * @param responses Behavioral data per response (item id, correct, time, dll)
 * @param items Items dari item bank yang dipakai (untuk lookup metadata)
 * @param userConfidenceRating Optional 1-5 dari user setelah selesai diagnostik
 */
export function computeMaturity(
  responses: BehavioralResponse[],
  items: ItemBankEntry[],
  userConfidenceRating?: number,
): MaturityProfile {
  const itemMap = new Map(items.map((it) => [it.id, it]));
  const ctx: ScoreContext = { responses, itemMap, userConfidenceRating };

  const dimensions: DimensionScore[] = [];
  for (const dim of Object.keys(SUBDIMS_BY_DIMENSION) as MaturityDimension[]) {
    const subdims = SUBDIMS_BY_DIMENSION[dim];
    const subScores: SubDimensionScore[] = subdims.map((sd) => {
      const score = SUBDIM_SCORERS[sd](ctx);
      const level = scoreToLevel(score);
      const { interpretation, recommendation } = getInterpretation(sd, level);
      // Items contributing — approximate by checking which scorer found relevant items
      const itemsContributing = countContributingItems(sd, ctx);
      return { subDimension: sd, score, level, itemsContributing, interpretation, recommendation };
    });
    const overall = Math.round(subScores.reduce((s, sd) => s + sd.score, 0) / subScores.length);
    dimensions.push({
      dimension: dim,
      weight: DIMENSION_WEIGHTS[dim],
      overall,
      level: scoreToLevel(overall),
      subScores,
    });
  }

  // Overall composite
  const overall = Math.round(dimensions.reduce((s, d) => s + d.overall * d.weight, 0));

  // Top strengths & priority areas
  const allSubs = dimensions.flatMap((d) => d.subScores).filter((s) => s.itemsContributing > 0);
  const sortedDesc = [...allSubs].sort((a, b) => b.score - a.score);
  const sortedAsc = [...allSubs].sort((a, b) => a.score - b.score);

  return {
    overall,
    level: scoreToLevel(overall),
    dimensions,
    strengths: sortedDesc.slice(0, 3).map((s) => ({ subDimension: s.subDimension, score: s.score, level: s.level })),
    priorityAreas: sortedAsc.slice(0, 3).map((s) => ({ subDimension: s.subDimension, score: s.score, level: s.level })),
    userConfidenceRating,
    totalItems: responses.length,
  };
}

/** Approximate count berapa items relevant untuk sub-dimension ini. */
function countContributingItems(sd: MaturitySubDimension, ctx: ScoreContext): number {
  switch (sd) {
    case "pattern_recognition":
      return filterItems(ctx, (it) => /pola|pattern|barisan|deret|sequence/i.test(it.meta?.microskill ?? "")).length;
    case "symbolic_manipulation":
      return filterItems(ctx, (it) => it.meta?.requiresManipulation === true || /aljabar|manipulasi/i.test(it.meta?.microskill ?? "")).length;
    case "conceptual_understanding":
      return filterItems(ctx, (it) => (it.meta?.reasoningQualityRequired ?? 0) >= 3).length;
    case "logical_reasoning":
      return filterItems(ctx, (it) => (it.meta?.analyticalSteps ?? 0) >= 2 && (it.meta?.intuitiveLeap === true || it.meta?.abstractQuestion === true)).length;
    case "multi_step_problems":
      return filterItems(ctx, (it) => it.meta?.multiStep === true).length;
    case "analytical_consistency":
    case "performance_consistency":
      return ctx.responses.length;
    case "strategy_selection":
      return filterItems(ctx, (it) => it.meta?.difficultyLabel === "hard").length;
    case "solution_efficiency":
      return ctx.responses.filter((r) => r.responseTimeMs).length;
    case "reasoning_quality":
      return filterItems(ctx, (it) => (it.meta?.reasoningQualityRequired ?? 0) >= 2).length;
    case "explanation_clarity":
      return 0; // Belum ada feature ekspresi
    case "language_processing":
      return filterItems(ctx, (it) => it.meta?.readingHeavy === true).length;
    case "logical_flow":
      return filterItems(ctx, (it) => (it.meta?.analyticalSteps ?? 0) >= 3).length;
    case "time_consistency":
    case "effort_maintenance":
      return ctx.responses.length;
    case "completion_rate":
      return ctx.responses.length;
    case "attention_to_detail":
      return filterItems(ctx, (it) => it.meta?.difficultyLabel === "easy").length;
    case "risk_management":
      return filterItems(ctx, (it) => it.meta?.strongDistractor === true).length;
    case "self_assessment_accuracy":
      return ctx.userConfidenceRating ? ctx.responses.length : 0;
    case "adaptive_behavior":
      return ctx.responses.filter((r) => typeof r.changeCount === "number").length;
    default:
      return 0;
  }
}

// silence unused
void filterItems;
void Response;
