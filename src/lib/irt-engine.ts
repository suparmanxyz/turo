/**
 * IRT 2PL Engine — TypeScript implementasi
 *
 * Sumber: konsepbaru/docs/SRS-Turo-Diagnostik.md Section 7.1
 *
 * Persamaan 2PL:
 *   P(θ) = 1 / (1 + exp(-a · (θ - b)))
 *
 *   θ (theta) = estimasi kemampuan siswa, range -3 sampai +3
 *   a = discrimination (seberapa baik soal membedakan kemampuan tinggi vs rendah)
 *   b = difficulty (level kesulitan soal)
 *
 * Theta estimation: EAP (Expected A Posteriori) dengan prior normal N(0,1)
 *   - Robust di awal tes saat data sedikit
 *   - Bayesian — gabungkan prior + likelihood
 *
 * Item selection: Maximum Information at Current θ
 *   I(θ) = a² · P(θ) · (1 - P(θ))
 *
 * Stopping: SE(θ) < 0.3 (95% CI ~ ±0.6)
 */

// ============================================================
// Types
// ============================================================

export type IrtParams = {
  /** Difficulty: -3 (sangat mudah) sampai +3 (sangat sulit). Mean ~0. */
  b: number;
  /** Discrimination: 0.5 (rendah) sampai 2.5 (tinggi). Default 1.0. */
  a: number;
  /** Pseudo-guessing (3PL extension): 0-0.3. Default 0.25 untuk PG 4 opsi. */
  c?: number;
};

export type Item = IrtParams & {
  id: string;
  /** Sub-materi kode (e.g. SMP.8.B5.01). */
  subMateriKode: string;
  /** Area matematika untuk content balancing. */
  area?: string;
};

export type Response = {
  itemId: string;
  /** True kalau benar, false kalau salah. */
  correct: boolean;
  /** Response time dalam ms (untuk pattern detection). Optional. */
  responseTimeMs?: number;
};

/** State estimasi theta selama tes berlangsung. */
export type ThetaEstimate = {
  /** Current theta estimate (-3 to +3). */
  theta: number;
  /** Standard error theta. Lower = more confident. Stop kalau < 0.3. */
  se: number;
  /** 95% confidence interval (theta ± 1.96·se). */
  ci95: [number, number];
  /** Jumlah respon yang sudah dipakai estimasi. */
  n: number;
};

// ============================================================
// 2PL Probability Function
// ============================================================

/**
 * Probability siswa dengan kemampuan θ menjawab benar item dengan params (a, b, c).
 * Formula 3PL (kalau c=0, jadi 2PL): P = c + (1-c) / (1 + exp(-a(θ-b)))
 */
export function probability(theta: number, item: IrtParams): number {
  const c = item.c ?? 0;
  const z = item.a * (theta - item.b);
  // Clamp z untuk avoid overflow di exp
  const zClamped = Math.max(-50, Math.min(50, z));
  const p2pl = 1 / (1 + Math.exp(-zClamped));
  return c + (1 - c) * p2pl;
}

/**
 * Item Information Function — seberapa banyak info item ini berikan tentang θ.
 * Untuk 2PL: I(θ) = a² · P · (1-P)
 * Untuk 3PL: I(θ) = a² · ((P-c)/(1-c))² · ((1-P)/P)
 *
 * Item paling informatif saat θ ≈ b (kesulitan match kemampuan).
 */
export function itemInformation(theta: number, item: IrtParams): number {
  const p = probability(theta, item);
  const c = item.c ?? 0;
  if (c === 0) {
    // 2PL pure
    return item.a * item.a * p * (1 - p);
  }
  // 3PL
  const numerator = (p - c) ** 2 * (1 - p);
  const denominator = (1 - c) ** 2 * p;
  if (denominator === 0) return 0;
  return (item.a * item.a * numerator) / denominator;
}

/** Total information dari sekumpulan respons di θ tertentu. */
export function testInformation(theta: number, items: IrtParams[]): number {
  return items.reduce((sum, item) => sum + itemInformation(theta, item), 0);
}

/** Standard Error dari theta estimate, dihitung dari total information. */
export function standardError(theta: number, items: IrtParams[]): number {
  const info = testInformation(theta, items);
  if (info <= 0) return Infinity;
  return 1 / Math.sqrt(info);
}

// ============================================================
// Likelihood & EAP Estimation
// ============================================================

/**
 * Log-likelihood dari sekumpulan respons di θ tertentu.
 * L(θ) = Π [P(θ)^correct · (1-P(θ))^(1-correct)]
 * log L = Σ [correct·log(P) + (1-correct)·log(1-P)]
 */
function logLikelihood(theta: number, items: Item[], responses: Map<string, boolean>): number {
  let ll = 0;
  for (const item of items) {
    const correct = responses.get(item.id);
    if (correct === undefined) continue;
    const p = probability(theta, item);
    const pSafe = Math.max(1e-10, Math.min(1 - 1e-10, p));
    ll += correct ? Math.log(pSafe) : Math.log(1 - pSafe);
  }
  return ll;
}

/** Prior normal N(0,1) di log scale. */
function logPriorNormal(theta: number, mean = 0, sd = 1): number {
  const z = (theta - mean) / sd;
  return -0.5 * z * z - Math.log(sd * Math.sqrt(2 * Math.PI));
}

/**
 * EAP (Expected A Posteriori) estimation dari theta.
 * Numerical integration over quadrature points (Gauss-Hermite atau uniform grid).
 *
 * Default: uniform grid -4 sampai +4, step 0.05 = 161 points (cukup akurat & cepat).
 *
 * Returns: { theta, se }
 */
export function estimateThetaEAP(
  items: Item[],
  responses: Response[],
  opts: { priorMean?: number; priorSd?: number; gridStep?: number } = {},
): ThetaEstimate {
  const priorMean = opts.priorMean ?? 0;
  const priorSd = opts.priorSd ?? 1;
  const step = opts.gridStep ?? 0.05;

  const responseMap = new Map<string, boolean>();
  for (const r of responses) responseMap.set(r.itemId, r.correct);

  // Filter items yang ada di responses
  const answered = items.filter((it) => responseMap.has(it.id));

  // Uniform grid quadrature
  const grid: { theta: number; posterior: number }[] = [];
  let totalPosterior = 0;
  for (let theta = -4; theta <= 4; theta += step) {
    const ll = logLikelihood(theta, answered, responseMap);
    const lprior = logPriorNormal(theta, priorMean, priorSd);
    // Posterior ∝ exp(ll + log_prior)
    const posterior = Math.exp(ll + lprior);
    grid.push({ theta, posterior });
    totalPosterior += posterior;
  }

  // Normalize
  if (totalPosterior > 0) {
    for (const g of grid) g.posterior /= totalPosterior;
  }

  // E[θ] = Σ θ · posterior
  let thetaHat = 0;
  for (const g of grid) thetaHat += g.theta * g.posterior;

  // SE = sqrt(Var[θ]) = sqrt(Σ (θ - thetaHat)² · posterior)
  let variance = 0;
  for (const g of grid) variance += (g.theta - thetaHat) ** 2 * g.posterior;
  const se = Math.sqrt(variance);

  return {
    theta: thetaHat,
    se,
    ci95: [thetaHat - 1.96 * se, thetaHat + 1.96 * se],
    n: answered.length,
  };
}

// ============================================================
// Item Selection: Maximum Information
// ============================================================

/**
 * Pilih item berikutnya dengan Maximum Information at Current θ.
 * Excludes items yang sudah dipakai.
 *
 * Untuk content balancing, panggil dengan items pre-filtered (e.g. hanya area tertentu).
 */
export function selectMaxInfoItem<T extends Item>(
  theta: number,
  candidates: T[],
  excludeIds: Set<string>,
): T | null {
  let best: { item: T; info: number } | null = null;
  for (const item of candidates) {
    if (excludeIds.has(item.id)) continue;
    const info = itemInformation(theta, item);
    if (best === null || info > best.info) {
      best = { item, info };
    }
  }
  return best?.item ?? null;
}

/**
 * Pilih item dengan content balancing — distribusi area target.
 * Pilih area dengan rasio terkecil (paling kurang terwakili relatif target),
 * lalu pilih max-info item di area itu.
 */
export function selectBalancedItem<T extends Item>(
  theta: number,
  candidates: T[],
  excludeIds: Set<string>,
  areaTargets: Map<string, number>, // area → target proportion (sum to 1)
  areaUsed: Map<string, number>, // area → jumlah sudah dipakai
): T | null {
  const totalUsed = Array.from(areaUsed.values()).reduce((a, b) => a + b, 0);

  // Hitung gap per area (target - actual proportion)
  const areaGaps: { area: string; gap: number }[] = [];
  for (const [area, target] of areaTargets.entries()) {
    const actual = totalUsed > 0 ? (areaUsed.get(area) ?? 0) / totalUsed : 0;
    areaGaps.push({ area, gap: target - actual });
  }
  // Sort: gap terbesar dulu (area yang paling under-represented)
  areaGaps.sort((a, b) => b.gap - a.gap);

  // Coba pilih dari area dengan gap terbesar dulu
  for (const { area } of areaGaps) {
    const areaCandidates = candidates.filter((c) => c.area === area);
    const picked = selectMaxInfoItem(theta, areaCandidates, excludeIds);
    if (picked) return picked;
  }
  // Fallback: max info dari semua candidates
  return selectMaxInfoItem(theta, candidates, excludeIds);
}

// ============================================================
// Stopping Rules
// ============================================================

export type StopReason =
  | "se_threshold"
  | "max_items"
  | "min_items_not_met"
  | "time_cap"
  | "fatigue"
  | "skip_threshold"
  | "continue";

export type StopCheckInput = {
  estimate: ThetaEstimate;
  itemsAnswered: number;
  itemsSkipped: number;
  elapsedMs: number;
  /** Response time average (ms) dari 5 soal pertama untuk baseline fatigue. */
  baselineRtMs?: number;
  /** Response time average (ms) dari 5 soal terakhir. */
  recentRtMs?: number;
  /** Accuracy 5 soal pertama (0-1). */
  baselineAccuracy?: number;
  /** Accuracy 5 soal terakhir (0-1). */
  recentAccuracy?: number;
};

export type StopCriteria = {
  seThreshold?: number; // default 0.3
  minItems?: number; // default 5
  maxItems?: number; // wajib diisi sesuai jenjang
  hardCapMs?: number; // wajib diisi sesuai jenjang
  skipRateMax?: number; // default 0.6
};

/**
 * Cek apakah tes harus stop. Return reason atau "continue".
 * Sesuai SRS Section 7.4.
 */
export function checkStop(input: StopCheckInput, criteria: StopCriteria): StopReason {
  const seThreshold = criteria.seThreshold ?? 0.3;
  const minItems = criteria.minItems ?? 5;
  const maxItems = criteria.maxItems;
  const hardCapMs = criteria.hardCapMs;
  const skipRateMax = criteria.skipRateMax ?? 0.6;

  const totalAttempted = input.itemsAnswered + input.itemsSkipped;

  // Skip threshold (priority: kalau user skip terlalu banyak, stop early)
  if (totalAttempted >= 5 && input.itemsSkipped / totalAttempted > skipRateMax) {
    return "skip_threshold";
  }

  // Hard cap (time)
  if (hardCapMs !== undefined && input.elapsedMs >= hardCapMs) {
    return "time_cap";
  }

  // Max items
  if (maxItems !== undefined && totalAttempted >= maxItems) {
    return "max_items";
  }

  // Min items belum terpenuhi → continue
  if (input.itemsAnswered < minItems) {
    return "continue";
  }

  // Fatigue detection
  if (
    input.baselineRtMs !== undefined &&
    input.recentRtMs !== undefined &&
    input.baselineAccuracy !== undefined &&
    input.recentAccuracy !== undefined
  ) {
    const rtIncrease = (input.recentRtMs - input.baselineRtMs) / input.baselineRtMs;
    const accDrop = input.baselineAccuracy - input.recentAccuracy;
    if (rtIncrease > 0.5 && accDrop > 0.3) {
      return "fatigue";
    }
  }

  // Normal completion: SE < threshold
  if (input.estimate.se < seThreshold) {
    return "se_threshold";
  }

  return "continue";
}

// ============================================================
// Theta → Kelas Estimate Mapping
// ============================================================

/**
 * Map theta (-3 to +3) ke estimasi level kelas (1.0 - 12.9).
 * Linear mapping default: theta 0 = K6.5 (median K1-K12), spread ±3 cover K1-K12.
 *
 * NOTE: idealnya dikalibrasi dari data — hubungan theta vs kelas bisa non-linear.
 * Untuk MVP, pakai linear approximation.
 */
export function thetaToKelas(theta: number): number {
  // theta ∈ [-3, +3] → kelas ∈ [1, 12]
  // Mid theta=0 → kelas=6.5
  const kelas = 6.5 + theta * 1.83; // (12-1)/(3-(-3)) ≈ 1.83
  return Math.max(1.0, Math.min(12.9, kelas));
}

/** Inverse: kelas → theta. */
export function kelasToTheta(kelas: number): number {
  return (kelas - 6.5) / 1.83;
}
