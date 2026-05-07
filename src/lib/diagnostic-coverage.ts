/**
 * Area Coverage — Stage B Fast Test (SRS Section 7.3)
 *
 * Tujuan: setelah Locator menemukan kelas estimasi, sebarkan soal balanced antar
 * AREA matematika (bilangan/aljabar/geometri/statistik/dll) untuk dapat profil
 * kemampuan per-area + identifikasi area yang lemah.
 *
 * Algoritma:
 *   1. Mulai dari prior theta hasil Locator.
 *   2. Pilih item dengan content balancing — area dengan gap target-actual terbesar dulu.
 *   3. Pilih max-info item di area itu, prioritas item yang b ≈ theta sekarang.
 *   4. Update theta global + theta per-area secara incremental.
 *   5. Stop kalau SE global < 0.3 atau quota area terpenuhi atau max items hit.
 *
 * Target distribusi default: equal weight per area aktif di jalur (SD: bilangan dominan;
 * SMP: bilangan+aljabar+geometri equal; SMA: aljabar+geometri+kalkulus+statistik).
 */

import { estimateThetaEAP, selectBalancedItem } from "@/lib/irt-engine";
import type { Item, Response, ThetaEstimate } from "@/lib/irt-engine";
import { itemsForJalur, toIrtItems } from "@/lib/item-bank";
import type { ItemBankEntry, JalurDiagnostik } from "@/lib/item-bank";
import type { LocatorResult } from "@/lib/diagnostic-locator";
import type { AreaMatematika } from "@/types";
import { classifyAreaWithConfig, getClassificationConfig } from "@/lib/classification-config";
import {
  isFoundation,
  pickFoundationTarget,
  buildAdaptiveThresholds,
  routePath,
  classifyClusterStatus,
  type Cluster,
  type PathRoute,
  type ClusterThresholds,
} from "@/lib/foundation-set";
import type { JenjangResmi } from "@/types";
import { isSubMateriExposed, type BabsExposedMap } from "@/lib/bab-exposure";

/** Distribusi target area per jalur (proportion, sum to 1). */
const AREA_TARGETS: Record<JalurDiagnostik, Map<AreaMatematika, number>> = {
  "sd-k1-3": new Map<AreaMatematika, number>([
    ["bilangan", 0.6],
    ["geometri", 0.25],
    ["statistik", 0.15],
  ]),
  "sd-k4-6": new Map<AreaMatematika, number>([
    ["bilangan", 0.45],
    ["geometri", 0.25],
    ["aljabar", 0.15],
    ["statistik", 0.15],
  ]),
  "smp": new Map<AreaMatematika, number>([
    ["bilangan", 0.25],
    ["aljabar", 0.30],
    ["geometri", 0.25],
    ["statistik", 0.20],
  ]),
  "sma-reguler": new Map<AreaMatematika, number>([
    ["aljabar", 0.30],
    ["geometri", 0.20],
    ["kalkulus", 0.20],
    ["statistik", 0.15],
    ["trigonometri", 0.15],
  ]),
  "sma-utbk": new Map<AreaMatematika, number>([
    ["bilangan", 0.20],
    ["aljabar", 0.30],
    ["geometri", 0.20],
    ["statistik", 0.20],
    ["logika", 0.10],
  ]),
};

/** State Coverage stage. */
export type CoverageState = {
  jalur: JalurDiagnostik;
  pool: ItemBankEntry[];
  used: Set<string>;
  responses: Response[];
  estimate: ThetaEstimate;
  /** Jumlah pemakaian per area. */
  areaUsed: Map<AreaMatematika, number>;
  /** Theta per area (estimasi parsial — pakai responses sub-set di area itu). */
  thetaByArea: Map<AreaMatematika, ThetaEstimate>;
  /** Bab yang sudah dipelajari user — untuk scoping cluster A. Null = treat all exposed. */
  babsExposed?: import("@/lib/bab-exposure").BabsExposedMap;
  /**
   * User profile (jenjang + kelas). Diset di init untuk enable cluster-aware
   * picking (force min items per cluster A/B/C).
   */
  userJenjang?: JenjangResmi;
  userKelas?: number;
  done: boolean;
  stopReason?: "se_threshold" | "max_items" | "pool_empty" | "quota_full";
};

const COVERAGE_SE_THRESHOLD = 0.3;
const COVERAGE_MIN_ITEMS = 8;
const COVERAGE_MAX_ITEMS = 18;

/** Init Coverage state — pakai prior dari Locator (bisa skip Locator dengan flat prior). */
export async function initCoverage(
  jalur: JalurDiagnostik,
  prior?: LocatorResult,
  modeKurikulum: import("@/types").ModeKurikulumLegacy = "comprehensive",
  babsExposed?: import("@/lib/bab-exposure").BabsExposedMap,
  userProfile?: { jenjang: JenjangResmi; kelas: number },
): Promise<CoverageState> {
  const pool = await itemsForJalur(jalur, modeKurikulum);
  const initialEstimate: ThetaEstimate = prior
    ? { theta: prior.theta, se: prior.se, ci95: [prior.theta - 1.96 * prior.se, prior.theta + 1.96 * prior.se], n: 0 }
    : { theta: 0, se: Infinity, ci95: [-Infinity, Infinity], n: 0 };

  // Carry-over: kalau Locator sudah punya responses, masukkan ke state Coverage
  // supaya estimasi continue (SRS section 7.2 → carry-over efisien).
  const carriedResponses = prior?.responses ?? [];
  const carriedUsed = new Set(carriedResponses.map((r) => r.itemId));
  const areaUsed = new Map<AreaMatematika, number>();
  for (const id of carriedUsed) {
    const it = pool.find((p) => p.id === id);
    if (it) areaUsed.set(it.area, (areaUsed.get(it.area) ?? 0) + 1);
  }

  return {
    jalur,
    pool,
    used: carriedUsed,
    responses: carriedResponses,
    estimate: initialEstimate,
    areaUsed,
    thetaByArea: new Map(),
    babsExposed,
    userJenjang: userProfile?.jenjang,
    userKelas: userProfile?.kelas,
    done: false,
  };
}

/** Cek quota — semua area target sudah punya minimal 2 item? */
function quotaTerpenuhi(state: CoverageState, minPerArea: number = 2): boolean {
  const targets = AREA_TARGETS[state.jalur];
  for (const area of targets.keys()) {
    if ((state.areaUsed.get(area) ?? 0) < minPerArea) return false;
  }
  return true;
}

/**
 * Cek quota cluster: setiap cluster (A/B/C) yang punya items eligible di pool
 * harus punya minimum N items answered. Cluster yang pool empty (no items
 * eligible) di-skip (akan di-mark data_kurang di scoring).
 *
 * @param responses semua responses sejauh ini (termasuk hypothetical baru)
 * @param used itemIds yang sudah dipakai
 */
function quotaClusterTerpenuhi(
  state: CoverageState,
  responses: Response[],
  used: Set<string>,
  minPerCluster: number = MIN_PER_CLUSTER_RELIABLE,
): boolean {
  if (!state.userJenjang || state.userKelas === undefined) return true;
  const targets = AREA_TARGETS[state.jalur];
  const foundationTarget = pickFoundationTarget(state.userJenjang, state.userKelas);
  const itemMap = new Map(state.pool.map((it) => [it.id, it]));

  // Hitung cluster usage dari responses
  const counts: Record<Cluster, number> = { A: 0, B: 0, C: 0 };
  for (const r of responses) {
    const it = itemMap.get(r.itemId);
    if (!it) continue;
    const cluster = classifyItemCluster(
      it.subMateriKode, it.kelas, state.userJenjang, state.userKelas, foundationTarget,
    );
    if (cluster === "A" && state.babsExposed && !isSubMateriExposed(state.babsExposed, it.subMateriKode)) continue;
    counts[cluster]++;
  }

  // Hitung items eligible (belum dipakai) per cluster
  const eligibleByCluster: Record<Cluster, number> = { A: 0, B: 0, C: 0 };
  for (const it of state.pool) {
    if (used.has(it.id)) continue;
    if (!targets.has(it.area)) continue;
    if (state.babsExposed && !isSubMateriExposed(state.babsExposed, it.subMateriKode)) continue;
    const cluster = classifyItemCluster(
      it.subMateriKode, it.kelas, state.userJenjang, state.userKelas, foundationTarget,
    );
    if (cluster === "A" && state.babsExposed && !isSubMateriExposed(state.babsExposed, it.subMateriKode)) continue;
    eligibleByCluster[cluster]++;
  }

  // Cek per cluster
  for (const c of ["A", "B", "C"] as Cluster[]) {
    if (counts[c] >= minPerCluster) continue; // sudah cukup
    if (eligibleByCluster[c] === 0) continue; // pool exhausted/empty — terima yang ada
    return false; // masih bisa nambah, jangan stop dulu
  }
  return true;
}

/** Min items per cluster — used as PICKER bias (mulai prioritize cluster ini). */
const MIN_PER_CLUSTER = 2;

/**
 * Min items per cluster — used as STOP condition guard. Coverage tidak boleh
 * stop sebelum tiap cluster (yang punya items eligible di pool) punya >= 4 items.
 * Mencegah cluster A=5 noise → false-positive remediasi (kasus high_performer_smp_8
 * di run F0kyIpJrxVuWQb4VTc1J: 5 items di K8, 2 benar = 40% accuracy salah klasifikasi
 * COMPREHENSIVE padahal anak high performer).
 */
const MIN_PER_CLUSTER_RELIABLE = 4;

/**
 * Hitung cluster usage dari state.responses + state.pool (resolve item → cluster).
 * Return Map<Cluster, count>.
 */
function countClusterUsage(state: CoverageState): Record<Cluster, number> {
  const counts: Record<Cluster, number> = { A: 0, B: 0, C: 0 };
  if (!state.userJenjang || state.userKelas === undefined) return counts;
  const foundationTarget = pickFoundationTarget(state.userJenjang, state.userKelas);
  const itemMap = new Map(state.pool.map((it) => [it.id, it]));
  for (const r of state.responses) {
    const it = itemMap.get(r.itemId);
    if (!it) continue;
    const cluster = classifyItemCluster(
      it.subMateriKode, it.kelas, state.userJenjang, state.userKelas, foundationTarget,
    );
    // Skip cluster A items yang belum exposed (konsisten dengan scoring di finalizeCoverage)
    if (cluster === "A" && state.babsExposed && !isSubMateriExposed(state.babsExposed, it.subMateriKode)) {
      continue;
    }
    counts[cluster]++;
  }
  return counts;
}

/** Resolve cluster untuk single item (helper untuk picker). */
function resolveItemCluster(state: CoverageState, item: ItemBankEntry): Cluster | null {
  if (!state.userJenjang || state.userKelas === undefined) return null;
  const foundationTarget = pickFoundationTarget(state.userJenjang, state.userKelas);
  const cluster = classifyItemCluster(
    item.subMateriKode, item.kelas, state.userJenjang, state.userKelas, foundationTarget,
  );
  // Cluster A items belum exposed di-treat null (skip dari scoping)
  if (cluster === "A" && state.babsExposed && !isSubMateriExposed(state.babsExposed, item.subMateriKode)) {
    return null;
  }
  return cluster;
}

/** Pick item berikut — content balanced + cluster quota bias. */
export function pickNextCoverageItem(state: CoverageState): ItemBankEntry | null {
  const targets = AREA_TARGETS[state.jalur];
  // Filter ke area yang ada di target jalur (skip area irrelevant) +
  // exclude items dari bab yang BELUM dipelajari user (no point testing material
  // yang belum diajarkan — anak salah ≠ remediasi, tapi belum exposed).
  const allEligible = state.pool.filter((it) =>
    targets.has(it.area)
    && !state.used.has(it.id)
    && (!state.babsExposed || isSubMateriExposed(state.babsExposed, it.subMateriKode))
  );
  if (allEligible.length === 0) return null;

  // CLUSTER QUOTA BIAS: kalau user profile tersedia, prioritize cluster yang
  // belum mencapai MIN_PER_CLUSTER. Mencegah cluster A=0 / C=0 issue (yang
  // bikin path routing salah klasifikasi sebagai INTENSIVE false-positive).
  let eligible = allEligible;
  if (state.userJenjang && state.userKelas !== undefined) {
    const clusterUsage = countClusterUsage(state);
    const underQuotaClusters: Cluster[] = (["A", "B", "C"] as Cluster[])
      .filter((c) => clusterUsage[c] < MIN_PER_CLUSTER);

    if (underQuotaClusters.length > 0) {
      // Filter ke items yang masuk cluster under-quota (kalau ada).
      const quotaItems = allEligible.filter((it) => {
        const c = resolveItemCluster(state, it);
        return c !== null && underQuotaClusters.includes(c);
      });
      // Hanya bias kalau ada items eligible di cluster under-quota.
      // Kalau tidak ada (mis. cluster C empty pool), fallback ke all eligible.
      if (quotaItems.length > 0) eligible = quotaItems;
    }
  }

  const irtCandidates = toIrtItems(eligible);
  const picked = selectBalancedItem(
    state.estimate.theta,
    irtCandidates,
    state.used,
    targets,
    state.areaUsed,
  );
  if (!picked) return null;
  return eligible.find((c) => c.id === picked.id) ?? null;
}

/** Submit response → re-estimate global + per-area, cek stop. */
export function submitCoverageResponse(
  state: CoverageState,
  itemId: string,
  correct: boolean,
  responseTimeMs?: number,
): CoverageState {
  const item = state.pool.find((it) => it.id === itemId);
  if (!item) return state;

  const newUsed = new Set(state.used);
  newUsed.add(itemId);
  const newResponses: Response[] = [...state.responses, { itemId, correct, responseTimeMs }];

  // Global theta
  const allItems: Item[] = state.pool
    .filter((it) => newUsed.has(it.id))
    .map((it) => ({ id: it.id, subMateriKode: it.subMateriKode, area: it.area, b: it.b, a: it.a, c: it.c }));
  const newEstimate = estimateThetaEAP(allItems, newResponses);

  // Per-area theta — re-estimate untuk tiap area yang punya min 2 responses
  const newThetaByArea = new Map<AreaMatematika, ThetaEstimate>();
  const targets = AREA_TARGETS[state.jalur];
  for (const area of targets.keys()) {
    const areaItems = state.pool.filter((it) => it.area === area && newUsed.has(it.id));
    if (areaItems.length < 2) continue;
    const areaItemIds = new Set(areaItems.map((i) => i.id));
    const areaResponses = newResponses.filter((r) => areaItemIds.has(r.itemId));
    const areaIrt: Item[] = areaItems.map((it) => ({
      id: it.id,
      subMateriKode: it.subMateriKode,
      area: it.area,
      b: it.b,
      a: it.a,
      c: it.c,
    }));
    newThetaByArea.set(area, estimateThetaEAP(areaIrt, areaResponses));
  }

  // Update areaUsed
  const newAreaUsed = new Map(state.areaUsed);
  newAreaUsed.set(item.area, (newAreaUsed.get(item.area) ?? 0) + 1);

  // Check stop
  let done = false;
  let stopReason: CoverageState["stopReason"] | undefined;
  const n = newResponses.length;
  if (n >= COVERAGE_MAX_ITEMS) {
    done = true;
    stopReason = "max_items";
  } else if (state.pool.filter((it) => !newUsed.has(it.id) && targets.has(it.area)).length === 0) {
    done = true;
    stopReason = "pool_empty";
  } else if (n >= COVERAGE_MIN_ITEMS && newEstimate.se < COVERAGE_SE_THRESHOLD) {
    // SE threshold — hanya berlaku kalau quota AREA + CLUSTER juga terpenuhi.
    // Cluster quota guard mencegah stop saat cluster A masih sample kecil
    // (false-positive remediasi karena noise).
    const tempState = { ...state, areaUsed: newAreaUsed };
    if (quotaTerpenuhi(tempState) && quotaClusterTerpenuhi(tempState, newResponses, newUsed)) {
      done = true;
      stopReason = "se_threshold";
    }
  } else if (n >= COVERAGE_MIN_ITEMS) {
    const tempState = { ...state, areaUsed: newAreaUsed };
    if (quotaTerpenuhi(tempState, 3) && quotaClusterTerpenuhi(tempState, newResponses, newUsed)) {
      done = true;
      stopReason = "quota_full";
    }
  }

  return {
    ...state,
    used: newUsed,
    responses: newResponses,
    estimate: newEstimate,
    areaUsed: newAreaUsed,
    thetaByArea: newThetaByArea,
    done,
    stopReason,
  };
}

// ============================================================
// Hasil akhir Coverage
// ============================================================

export type AreaProfile = {
  area: AreaMatematika;
  itemsAnswered: number;
  /** Jumlah benar di area ini. */
  itemsCorrect: number;
  /** Accuracy = correct/answered. Signal kuat untuk klasifikasi. */
  accuracy: number;
  theta: number;
  se: number;
  /** Klasifikasi qualitative untuk laporan: "kuat" / "cukup" / "lemah" / "data_kurang" */
  status: "kuat" | "cukup" | "lemah" | "data_kurang";
};

export type ClusterScore = {
  cluster: Cluster;
  itemsAnswered: number;
  itemsCorrect: number;
  accuracy: number;
  /**
   * Status cluster:
   * - siap: accuracy ≥ threshold
   * - review: accuracy mendekati threshold (80-99% dari target)
   * - remediasi: accuracy jauh di bawah threshold
   * - data_kurang: items answered = 0 (cluster tidak di-test di Coverage,
   *   misal cluster A untuk anak yang belum exposed bab kelas user, atau
   *   cluster C untuk jalur yang pool tidak include foundation items)
   */
  status: "siap" | "review" | "remediasi" | "data_kurang";
  threshold: number;
};

export type CoverageResult = {
  jalur: JalurDiagnostik;
  thetaGlobal: number;
  seGlobal: number;
  itemsUsed: number;
  stopReason: NonNullable<CoverageState["stopReason"]>;
  perArea: AreaProfile[];
  /** Area yang lemah relatif theta global — kandidat target Stage 2 (B5). */
  areaSuspect: AreaMatematika[];
  /** Skor per cluster A/B/C (kalau profile user ada — derived dari foundation set). */
  clusterScores?: ClusterScore[];
  /** Path routing 4-tier berdasarkan skor cluster. */
  pathRoute?: PathRoute;
  responses: Response[];
};

// classifyArea sekarang baca config from classification-config.ts (bisa di-tune admin).

/**
 * Per item response, classify ke Cluster A/B/C berdasarkan:
 *   - Foundation Set (untuk jenjang user) → C terlepas kelas
 *   - Kelas item == kelas user → A (target level)
 *   - Kelas item < kelas user → B (supporting from earlier grade)
 *   - Kelas item > kelas user → A (challenging — anggap masih direct relevant)
 */
function classifyItemCluster(
  itemSubMateriKode: string,
  itemKelas: number,
  userJenjang: JenjangResmi,
  userKelas: number,
  foundationTarget: ReturnType<typeof pickFoundationTarget>,
): Cluster {
  if (isFoundation(itemSubMateriKode, foundationTarget)) return "C";
  if (itemKelas >= userKelas) return "A";
  // Item dari kelas lebih rendah TAPI bukan foundation set → B (supporting bridging)
  return "B";
}

/**
 * Build cluster scores dari responses.
 * Butuh profile user (jenjang+kelas) untuk derive cluster mapping.
 */
function buildClusterScores(
  responses: Response[],
  pool: ItemBankEntry[],
  userJenjang: JenjangResmi,
  userKelas: number,
  thresholds: ClusterThresholds,
  babsExposed?: BabsExposedMap,
): ClusterScore[] {
  const foundationTarget = pickFoundationTarget(userJenjang, userKelas);
  const itemMap = new Map(pool.map((it) => [it.id, it]));
  const buckets: Record<Cluster, { ans: number; cor: number }> = {
    A: { ans: 0, cor: 0 },
    B: { ans: 0, cor: 0 },
    C: { ans: 0, cor: 0 },
  };
  for (const r of responses) {
    const it = itemMap.get(r.itemId);
    if (!it) continue;
    const cluster = classifyItemCluster(it.subMateriKode, it.kelas, userJenjang, userKelas, foundationTarget);
    // Cluster A items: skip kalau bab belum exposed — anak belum belajar materi ini,
    // jangan dimasukkan scoring (akan jadi false negative remediasi).
    // Cluster B & C tetap di-score (kelas-kelas bawah pasti exposed kalau anak naik kelas).
    if (cluster === "A" && babsExposed && !isSubMateriExposed(babsExposed, it.subMateriKode)) {
      continue;
    }
    buckets[cluster].ans += 1;
    if (r.correct) buckets[cluster].cor += 1;
  }
  return (["A", "B", "C"] as Cluster[]).map((cluster) => {
    const b = buckets[cluster];
    const accuracy = b.ans > 0 ? b.cor / b.ans : 0;
    // Distinguish "no data" dari "lemah". Kalau itemsAnswered = 0, status =
    // data_kurang — engine tidak tahu cluster ini lemah/kuat. Path routing
    // akan skip cluster ini dari kalkulasi.
    const status: ClusterScore["status"] = b.ans === 0
      ? "data_kurang"
      : classifyClusterStatus(accuracy, cluster, thresholds);
    return {
      cluster,
      itemsAnswered: b.ans,
      itemsCorrect: b.cor,
      accuracy,
      status,
      threshold: thresholds[cluster],
    };
  });
}

export async function finalizeCoverage(
  state: CoverageState,
  userProfile?: { jenjang: JenjangResmi; kelas: number; isUtbkTarget?: boolean },
): Promise<CoverageResult | null> {
  if (!state.done || !state.stopReason) return null;
  const cfg = await getClassificationConfig();
  const targets = AREA_TARGETS[state.jalur];
  const perArea: AreaProfile[] = [];
  for (const area of targets.keys()) {
    const themEst = state.thetaByArea.get(area);
    const used = state.areaUsed.get(area) ?? 0;
    // Hitung accuracy per area dari responses yang itemsnya milik area ini
    const areaItemIds = new Set(
      state.pool.filter((it) => it.area === area && state.used.has(it.id)).map((it) => it.id),
    );
    const areaResponses = state.responses.filter((r) => areaItemIds.has(r.itemId));
    const itemsCorrect = areaResponses.filter((r) => r.correct).length;
    const itemsAnswered = areaResponses.length;
    const accuracy = itemsAnswered > 0 ? itemsCorrect / itemsAnswered : 0;

    if (!themEst || used < 2) {
      // Data kurang TAPI kalau ada >=1 jawaban dan accuracy ≤ threshold lemah, kasih sinyal "lemah"
      const fallbackStatus: AreaProfile["status"] =
        itemsAnswered >= 1 && accuracy <= cfg.coverageLemahMaxAcc ? "lemah" : "data_kurang";
      perArea.push({
        area, itemsAnswered, itemsCorrect, accuracy,
        theta: state.estimate.theta, se: Infinity, status: fallbackStatus,
      });
      continue;
    }
    perArea.push({
      area,
      itemsAnswered,
      itemsCorrect,
      accuracy,
      theta: themEst.theta,
      se: themEst.se,
      status: classifyAreaWithConfig(accuracy, themEst.theta, state.estimate.theta, cfg),
    });
  }
  const areaSuspect = perArea
    .filter((p) => p.status === "lemah")
    .sort((a, b) => a.theta - b.theta) // paling lemah dulu
    .map((p) => p.area);

  // Cluster scores (Pendekatan Integral) — kalau profile user tersedia
  let clusterScores: ClusterScore[] | undefined;
  let pathRoute: PathRoute | undefined;
  if (userProfile) {
    const adaptiveThresholds = buildAdaptiveThresholds(
      userProfile.jenjang,
      userProfile.kelas,
      undefined,
      userProfile.isUtbkTarget ?? false,
    );
    clusterScores = buildClusterScores(
      state.responses, state.pool, userProfile.jenjang, userProfile.kelas,
      adaptiveThresholds, state.babsExposed,
    );
    // Untuk routing: kalau cluster status data_kurang, pakai threshold sebagai
    // proxy "neutral" (anggap pass) supaya tidak mis-classify ke INTENSIVE.
    // Reasoning: tidak ada data berarti tidak bisa simpulkan "lemah". Routing
    // pakai data dari cluster yang ada saja.
    const getAcc = (c: Cluster): number => {
      const cs = clusterScores!.find((s) => s.cluster === c);
      if (!cs) return 0;
      if (cs.status === "data_kurang") return adaptiveThresholds[c]; // neutral = threshold
      return cs.accuracy;
    };
    const accA = getAcc("A");
    const accB = getAcc("B");
    const accC = getAcc("C");
    pathRoute = routePath(accA, accB, accC, adaptiveThresholds);
  }

  return {
    jalur: state.jalur,
    thetaGlobal: state.estimate.theta,
    seGlobal: state.estimate.se,
    itemsUsed: state.responses.length,
    stopReason: state.stopReason,
    perArea,
    areaSuspect,
    clusterScores,
    pathRoute,
    responses: state.responses,
  };
}

// ============================================================
// Simulasi end-to-end (testing)
// ============================================================

export async function simulateCoverage(
  jalur: JalurDiagnostik,
  answerFn: (item: ItemBankEntry) => Promise<{ correct: boolean; responseTimeMs?: number }>,
  prior?: LocatorResult,
): Promise<{ result: CoverageResult | null; trace: { area: AreaMatematika; itemId: string; correct: boolean; theta: number; se: number }[] }> {
  let state = await initCoverage(jalur, prior);
  const trace: { area: AreaMatematika; itemId: string; correct: boolean; theta: number; se: number }[] = [];

  while (!state.done) {
    const item = pickNextCoverageItem(state);
    if (!item) {
      state = { ...state, done: true, stopReason: "pool_empty" };
      break;
    }
    const ans = await answerFn(item);
    state = submitCoverageResponse(state, item.id, ans.correct, ans.responseTimeMs);
    trace.push({
      area: item.area,
      itemId: item.id,
      correct: ans.correct,
      theta: state.estimate.theta,
      se: state.estimate.se,
    });
  }

  return { result: await finalizeCoverage(state), trace };
}
