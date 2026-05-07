/**
 * Firestore Schema — collection definitions + CRUD helpers untuk SRS Phase B.
 * SRS Section 8 (Data Model).
 *
 * Collections:
 *   - user_profile           : profile siswa (jenjang, kelas, jalur, prefs)
 *   - diagnostic_session     : satu sesi diagnostik (header)
 *     └─ subcollection responses : tiap respon item dalam sesi
 *   - sub_materi_mastery     : status mastery per (user, sub-materi) — current state
 *   - item_response          : aggregate response untuk kalibrasi item-bank (cross-user)
 *
 * Anti-pattern dihindari:
 *   - Tidak nest >1 level deep (Firestore terbatas)
 *   - Setiap doc punya updatedAt untuk debug
 *   - Composite indexes di firestore.indexes.json — JANGAN lupa deploy
 */

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { JalurDiagnostik } from "@/lib/item-bank";
import type {
  AreaMatematika,
  JenjangResmi,
  Kelas,
  KategoriUtama,
  MasteryStatus,
  ModeKurikulum,
  SubMateriMastery,
} from "@/types";

// ============================================================
// Collection names (centralized — gampang refactor)
// ============================================================

export const COL = {
  USER_PROFILE: "user_profile",
  DIAGNOSTIC_SESSION: "diagnostic_session",
  RESPONSES: "responses", // subcollection di diagnostic_session
  SUB_MATERI_MASTERY: "sub_materi_mastery",
  ITEM_RESPONSE: "item_response",
} as const;

// ============================================================
// 1. user_profile
// ============================================================

/** Snapshot Maturity dari satu sesi diagnostik (untuk trend tracking). */
export type MaturitySnapshot = {
  timestamp: number;
  sessionId: string;
  overall: number;
  level: "MASTERY" | "PROFICIENT" | "DEVELOPING" | "EMERGING" | "BEGINNING";
  /** Per dimensi score (5 dimensi). */
  dimensionsScores: Record<string, number>;
  totalItems: number;
  /** Optional: kelas user saat sesi (untuk track perkembangan vs jenjang). */
  kelasAtSession?: number;
};

export type UserProfileDoc = {
  uid: string;
  email?: string;
  jenjang?: "sd" | "smp" | "sma";
  kelas?: Kelas;
  kategoriUtama: KategoriUtama;
  modePersiapan?: "sekolah" | "utbk" | "olimpiade";
  /** Mode kurikulum dual-track: strict CP 046 atau full comprehensive. */
  modeKurikulum?: ModeKurikulum;
  /** Jalur aktif sekarang. */
  jalurAktif?: JalurDiagnostik;
  /** Last theta global (dari diagnostik terakhir). */
  thetaGlobal?: number;
  /** Last kelas estimasi. */
  kelasEstimasi?: number;
  /** Onboarding state: belum / fast-done / deep-done. */
  onboardingStatus: "belum" | "fast-done" | "deep-done";
  /** History Mathematical Maturity — last 20 snapshots (oldest first). */
  maturityHistory?: MaturitySnapshot[];
  /**
   * Bab yang sudah dipelajari user per kelas. Format key:
   *   - "K8" = bab di kelas user (kelas yang dia pilih saat onboarding)
   *   - "SD.K3", "SMP.K7" = bab di kelas/jenjang lebih rendah (auto-marked all
   *     exposed kalau anak sudah naik kelas)
   * Value: array bab kode normalized e.g. ["B1", "B2", "B3"].
   * Engine pakai field ini untuk scoping cluster A — sub di bab yang belum
   * exposed di-skip dari diagnostic, akan di-test on-demand via tes kesiapan bab.
   */
  babsExposedPerKelas?: import("@/lib/bab-exposure").BabsExposedMap;
  createdAt: number;
  updatedAt: number;
};

export async function getUserProfile(uid: string): Promise<UserProfileDoc | null> {
  const snap = await getAdminDb().collection(COL.USER_PROFILE).doc(uid).get();
  return snap.exists ? (snap.data() as UserProfileDoc) : null;
}

export async function upsertUserProfile(
  uid: string,
  patch: Partial<Omit<UserProfileDoc, "uid" | "createdAt">>,
): Promise<void> {
  const ref = getAdminDb().collection(COL.USER_PROFILE).doc(uid);
  const existing = await ref.get();
  const now = Date.now();
  if (existing.exists) {
    await ref.update({ ...cleanUndefined(patch), updatedAt: now });
  } else {
    const doc: UserProfileDoc = {
      uid,
      kategoriUtama: patch.kategoriUtama ?? "reguler",
      onboardingStatus: patch.onboardingStatus ?? "belum",
      ...cleanUndefined(patch),
      createdAt: now,
      updatedAt: now,
    } as UserProfileDoc;
    await ref.set(doc);
  }
}

/**
 * Append Maturity snapshot ke user profile history.
 * Keep last 20 entries (rolling buffer, oldest first).
 * Idempotent: kalau sessionId sudah ada, replace existing (untuk re-compute confidence).
 */
export async function appendMaturityHistory(
  uid: string,
  snapshot: MaturitySnapshot,
): Promise<void> {
  const ref = getAdminDb().collection(COL.USER_PROFILE).doc(uid);
  const snap = await ref.get();
  const profile = snap.exists ? (snap.data() as UserProfileDoc) : null;
  const existing = profile?.maturityHistory ?? [];
  // Replace kalau sessionId sudah ada (re-compute scenario)
  const filtered = existing.filter((s) => s.sessionId !== snapshot.sessionId);
  // Append + cap 20 entries (oldest first, drop oldest)
  const updated = [...filtered, snapshot].slice(-20);
  if (snap.exists) {
    await ref.update({ maturityHistory: updated, updatedAt: Date.now() });
  } else {
    // Create new profile dengan minimal fields
    await ref.set({
      uid,
      kategoriUtama: "reguler",
      onboardingStatus: "fast-done",
      maturityHistory: updated,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as UserProfileDoc);
  }
}

// ============================================================
// 2. diagnostic_session
// ============================================================

export type DiagnosticStage = "fast-locator" | "fast-coverage" | "deep" | "drilling" | "selesai";

export type DiagnosticSessionDoc = {
  id: string;
  uid: string;
  jalur: JalurDiagnostik;
  stage: DiagnosticStage;
  /** Theta global running. */
  thetaGlobal?: number;
  seGlobal?: number;
  kelasEstimasi?: number;
  /** Hasil per stage (snapshot supaya audit trail jelas). */
  hasilLocator?: {
    theta: number;
    se: number;
    kelasEstimasi: number;
    itemsUsed: number;
  };
  hasilCoverage?: {
    thetaGlobal: number;
    seGlobal: number;
    itemsUsed: number;
    perArea: { area: AreaMatematika; theta: number; se: number; status: string; itemsAnswered?: number; itemsCorrect?: number; accuracy?: number }[];
    clusterScores?: { cluster: "A" | "B" | "C"; itemsAnswered: number; itemsCorrect: number; accuracy: number; status: "siap" | "review" | "remediasi" | "data_kurang"; threshold: number }[];
    pathRoute?: { path: "ADVANCED" | "STANDARD" | "COMPREHENSIVE" | "INTENSIVE"; duration: string; fokus: string };
    areaSuspect: AreaMatematika[];
  };
  hasilDeep?: {
    itemsUsed: number;
    masteryCount: { siap: number; review: number; remediasi: number; unknown: number };
    remediasiKodes: string[];
  };
  hasilDrilling?: {
    path: "ADVANCED" | "STANDARD" | "COMPREHENSIVE" | "INTENSIVE";
    totalSteps: number;
    stepsPassed: number;
    stepsWeak: number;
    stepsSkipped: number;
    itemsTotal: number;
    itemsAnswered: number;
    overallAccuracy: number;
    weakKodes: string[];
    recommendation: string;
    steps: {
      kind: string;
      label: string;
      status: "pending" | "in_progress" | "passed" | "weak" | "skipped";
      accuracy?: number;
      passThreshold: number;
      itemsAnswered: number;
      itemsTotal: number;
      targetKodes: string[];
    }[];
  };
  /** Mathematical Maturity profile — 5 dimensi kognitif. */
  hasilMaturity?: {
    overall: number;
    level: "MASTERY" | "PROFICIENT" | "DEVELOPING" | "EMERGING" | "BEGINNING";
    dimensions: {
      dimension: string;
      weight: number;
      overall: number;
      level: "MASTERY" | "PROFICIENT" | "DEVELOPING" | "EMERGING" | "BEGINNING";
      subScores: {
        subDimension: string;
        score: number;
        level: "MASTERY" | "PROFICIENT" | "DEVELOPING" | "EMERGING" | "BEGINNING";
        itemsContributing: number;
        interpretation: string;
        recommendation: string;
      }[];
    }[];
    strengths: { subDimension: string; score: number; level: string }[];
    priorityAreas: { subDimension: string; score: number; level: string }[];
    userConfidenceRating?: number;
    totalItems: number;
  };
  /** Counter untuk indikator stop. */
  itemsAnswered: number;
  itemsSkipped: number;
  startedAt: number;
  finishedAt?: number;
  updatedAt: number;
};

export async function createDiagnosticSession(
  uid: string,
  jalur: JalurDiagnostik,
): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection(COL.DIAGNOSTIC_SESSION).doc();
  const now = Date.now();
  const doc: DiagnosticSessionDoc = {
    id: ref.id,
    uid,
    jalur,
    stage: "fast-locator",
    itemsAnswered: 0,
    itemsSkipped: 0,
    startedAt: now,
    updatedAt: now,
  };
  await ref.set(doc);
  return ref.id;
}

export async function getDiagnosticSession(id: string): Promise<DiagnosticSessionDoc | null> {
  const snap = await getAdminDb().collection(COL.DIAGNOSTIC_SESSION).doc(id).get();
  return snap.exists ? (snap.data() as DiagnosticSessionDoc) : null;
}

export async function updateDiagnosticSession(
  id: string,
  patch: Partial<Omit<DiagnosticSessionDoc, "id" | "uid" | "startedAt">>,
): Promise<void> {
  await getAdminDb().collection(COL.DIAGNOSTIC_SESSION).doc(id).update({
    ...cleanUndefined(patch),
    updatedAt: Date.now(),
  });
}

export async function listSessionsByUser(
  uid: string,
  limit: number = 20,
): Promise<DiagnosticSessionDoc[]> {
  const snap = await getAdminDb()
    .collection(COL.DIAGNOSTIC_SESSION)
    .where("uid", "==", uid)
    .orderBy("startedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as DiagnosticSessionDoc);
}

// ============================================================
// 2b. responses subcollection
// ============================================================

export type ResponseDoc = {
  id: string;
  sessionId: string;
  itemId: string;
  subMateriKode: string;
  area: AreaMatematika;
  /** Stage saat respon ini dikerjakan. */
  stage: DiagnosticStage;
  correct: boolean;
  pilihIdx?: number; // untuk MC
  responseTimeMs: number;
  /** Theta running saat ini selesai dijawab. */
  thetaAfter?: number;
  seAfter?: number;
  createdAt: number;
};

export async function appendResponse(
  sessionId: string,
  resp: Omit<ResponseDoc, "id" | "sessionId" | "createdAt">,
): Promise<string> {
  const db = getAdminDb();
  const ref = db
    .collection(COL.DIAGNOSTIC_SESSION)
    .doc(sessionId)
    .collection(COL.RESPONSES)
    .doc();
  const doc: ResponseDoc = {
    id: ref.id,
    sessionId,
    ...resp,
    createdAt: Date.now(),
  };
  await ref.set(doc);
  // Increment counter di parent session (best effort)
  try {
    await db.collection(COL.DIAGNOSTIC_SESSION).doc(sessionId).update({
      itemsAnswered: FieldValue.increment(1),
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn("update session counter gagal:", e);
  }
  return ref.id;
}

export async function listResponses(sessionId: string): Promise<ResponseDoc[]> {
  const snap = await getAdminDb()
    .collection(COL.DIAGNOSTIC_SESSION)
    .doc(sessionId)
    .collection(COL.RESPONSES)
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((d) => d.data() as ResponseDoc);
}

// ============================================================
// 3. sub_materi_mastery (per user)
// ============================================================

export type SubMateriMasteryDoc = SubMateriMastery & {
  uid: string;
  /** Composite key: `${uid}_${kode}` — dipakai sebagai doc id. */
  /** Riwayat ringkas (last 5 assessments) untuk trend. */
  riwayat?: { status: MasteryStatus; confidence: number; assessedAt: number }[];
};

function masteryDocId(uid: string, kode: string): string {
  return `${uid}_${kode}`;
}

export async function upsertMastery(
  uid: string,
  mastery: SubMateriMastery,
): Promise<void> {
  const ref = getAdminDb().collection(COL.SUB_MATERI_MASTERY).doc(masteryDocId(uid, mastery.kode));
  const existing = await ref.get();
  const newRiwayat = (existing.exists ? (existing.data() as SubMateriMasteryDoc).riwayat ?? [] : [])
    .slice(-4);
  newRiwayat.push({ status: mastery.status, confidence: mastery.confidence, assessedAt: mastery.lastAssessedAt });

  const doc: SubMateriMasteryDoc = {
    uid,
    ...mastery,
    riwayat: newRiwayat,
  };
  await ref.set(doc);
}

export async function batchUpsertMastery(
  uid: string,
  masteryList: SubMateriMastery[],
): Promise<void> {
  // Sequential supaya riwayat bener (gabisa pakai batch untuk read-modify-write)
  for (const m of masteryList) {
    await upsertMastery(uid, m);
  }
}

export async function getMastery(uid: string, kode: string): Promise<SubMateriMasteryDoc | null> {
  const snap = await getAdminDb().collection(COL.SUB_MATERI_MASTERY).doc(masteryDocId(uid, kode)).get();
  return snap.exists ? (snap.data() as SubMateriMasteryDoc) : null;
}

export async function listMasteryByUser(uid: string): Promise<SubMateriMasteryDoc[]> {
  const snap = await getAdminDb()
    .collection(COL.SUB_MATERI_MASTERY)
    .where("uid", "==", uid)
    .get();
  return snap.docs.map((d) => d.data() as SubMateriMasteryDoc);
}

// ============================================================
// 4. item_response — agregat untuk kalibrasi (cross-user)
// ============================================================

export type ItemResponseAggregate = {
  itemId: string;
  /** Total respon. */
  totalN: number;
  /** Total benar. */
  totalCorrect: number;
  /** P-value empiris = totalCorrect / totalN. */
  pValue: number;
  /** Rata-rata response time (ms). */
  avgRtMs: number;
  /** Bucket theta-correctness untuk kalibrasi 2PL (theta bin → {n, correct}). */
  thetaBins?: Record<string, { n: number; correct: number }>;
  updatedAt: number;
};

export async function bumpItemAggregate(
  itemId: string,
  theta: number,
  correct: boolean,
  rtMs: number,
): Promise<void> {
  const ref = getAdminDb().collection(COL.ITEM_RESPONSE).doc(itemId);
  // Simple atomic increment — actual aggregate update via transaction
  try {
    await getAdminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Date.now();
      const bin = String(Math.round(theta * 2) / 2); // bin width 0.5
      if (!snap.exists) {
        const doc: ItemResponseAggregate = {
          itemId,
          totalN: 1,
          totalCorrect: correct ? 1 : 0,
          pValue: correct ? 1 : 0,
          avgRtMs: rtMs,
          thetaBins: { [bin]: { n: 1, correct: correct ? 1 : 0 } },
          updatedAt: now,
        };
        tx.set(ref, doc);
        return;
      }
      const cur = snap.data() as ItemResponseAggregate;
      const newN = cur.totalN + 1;
      const newCorrect = cur.totalCorrect + (correct ? 1 : 0);
      const newAvg = (cur.avgRtMs * cur.totalN + rtMs) / newN;
      const bins = { ...(cur.thetaBins ?? {}) };
      const cell = bins[bin] ?? { n: 0, correct: 0 };
      bins[bin] = { n: cell.n + 1, correct: cell.correct + (correct ? 1 : 0) };
      tx.update(ref, {
        totalN: newN,
        totalCorrect: newCorrect,
        pValue: newCorrect / newN,
        avgRtMs: newAvg,
        thetaBins: bins,
        updatedAt: now,
      });
    });
  } catch (e) {
    console.warn("bumpItemAggregate gagal:", e);
  }
}

// ============================================================
// Utility
// ============================================================

function cleanUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** Convert Firestore Timestamp (kalau muncul dari snapshot mentah) → number ms. */
export function tsToMs(value: number | Timestamp | undefined | null): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") return value;
  if (value instanceof Timestamp) return value.toMillis();
  return undefined;
}
