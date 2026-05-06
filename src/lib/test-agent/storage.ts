/**
 * Firestore storage untuk test agent runs.
 *
 * Schema:
 *   test_runs/{runId}                — header doc (config, summary, assertions)
 *   test_runs/{runId}/events/{evId}  — per-item event (subcollection)
 *
 * Auto-prune: keep 50 latest runs (older auto-deleted via cleanupOldRuns).
 */

import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { JalurDiagnostik } from "@/lib/item-bank";
import type { JenjangResmi } from "@/types";

export type TestRunStatus = "running" | "done" | "failed";

export type Assertion = {
  name: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  reason?: string;
};

export type TestRunDoc = {
  id: string;
  createdAt: number;
  startedAt: number;
  finishedAt?: number;
  status: TestRunStatus;
  errorMsg?: string;

  // Config
  personaKey: string;
  personaLabel: string;
  jalur: JalurDiagnostik;
  jenjang: JenjangResmi;
  kelas: number;

  // Summary
  itemsAnswered: number;
  itemsCorrect: number;
  durationMs?: number;

  // Stage milestones
  locatorItems?: number;
  coverageItems?: number;
  deepItems?: number;
  drillingItems?: number;

  // Final results
  thetaGlobal?: number;
  kelasEstimasi?: number;
  pathRoute?: string;
  maturityOverall?: number;
  maturityLevel?: string;

  // Assertions (run after completion)
  assertions: Assertion[];
  assertionsPassed: number;
  assertionsTotal: number;

  /** ID dari diagnostic_session yang dibikin run ini. */
  sessionId?: string;
};

export type TestRunEvent = {
  id: string;
  ts: number;
  type: "answer" | "stage_transition" | "info" | "error";
  // For answer events:
  itemId?: string;
  subKode?: string;
  itemKelas?: number;
  itemB?: number;
  itemArea?: string;
  itemDifficulty?: string;
  stage?: string;
  picked?: number;
  kunci?: number;
  correct?: boolean;
  responseTimeMs?: number;
  // For transitions:
  fromStage?: string;
  toStage?: string;
  // For errors/info:
  message?: string;
};

const COL = "test_runs";
const SUB_EVENTS = "events";
const KEEP_LATEST = 50;

export async function createTestRun(init: Omit<TestRunDoc, "id" | "createdAt" | "startedAt" | "status" | "itemsAnswered" | "itemsCorrect" | "assertions" | "assertionsPassed" | "assertionsTotal">): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection(COL).doc();
  const now = Date.now();
  const doc: TestRunDoc = {
    ...init,
    id: ref.id,
    createdAt: now,
    startedAt: now,
    status: "running",
    itemsAnswered: 0,
    itemsCorrect: 0,
    assertions: [],
    assertionsPassed: 0,
    assertionsTotal: 0,
  };
  await ref.set(doc);
  return ref.id;
}

export async function appendEvent(runId: string, ev: Omit<TestRunEvent, "id" | "ts">): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection(COL).doc(runId).collection(SUB_EVENTS).doc();
  const event: TestRunEvent = { ...ev, id: ref.id, ts: Date.now() };
  await ref.set(event);
  if (ev.type === "answer") {
    await db.collection(COL).doc(runId).update({
      itemsAnswered: FieldValue.increment(1),
      itemsCorrect: FieldValue.increment(ev.correct ? 1 : 0),
    });
  }
}

export async function updateTestRun(runId: string, patch: Partial<TestRunDoc>): Promise<void> {
  await getAdminDb().collection(COL).doc(runId).update(patch);
}

export async function finalizeTestRun(runId: string, patch: Partial<TestRunDoc> & { assertions: Assertion[] }): Promise<void> {
  const passed = patch.assertions.filter((a) => a.passed).length;
  await getAdminDb().collection(COL).doc(runId).update({
    ...patch,
    finishedAt: Date.now(),
    assertionsPassed: passed,
    assertionsTotal: patch.assertions.length,
  });
}

export async function failTestRun(runId: string, errorMsg: string): Promise<void> {
  await getAdminDb().collection(COL).doc(runId).update({
    status: "failed",
    errorMsg: errorMsg.slice(0, 1000),
    finishedAt: Date.now(),
  });
}

export async function getTestRun(runId: string): Promise<TestRunDoc | null> {
  const snap = await getAdminDb().collection(COL).doc(runId).get();
  if (!snap.exists) return null;
  return snap.data() as TestRunDoc;
}

export async function listTestRuns(limit = 50): Promise<TestRunDoc[]> {
  const snap = await getAdminDb().collection(COL).orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => d.data() as TestRunDoc);
}

export async function getTestRunEvents(runId: string): Promise<TestRunEvent[]> {
  const snap = await getAdminDb().collection(COL).doc(runId).collection(SUB_EVENTS).orderBy("ts", "asc").get();
  return snap.docs.map((d) => d.data() as TestRunEvent);
}

/** Hapus run lama, keep KEEP_LATEST. */
export async function cleanupOldRuns(): Promise<number> {
  const db = getAdminDb();
  const snap = await db.collection(COL).orderBy("createdAt", "desc").get();
  if (snap.size <= KEEP_LATEST) return 0;
  const toDelete = snap.docs.slice(KEEP_LATEST);
  let count = 0;
  for (const doc of toDelete) {
    // Delete events subcollection first
    const evSnap = await doc.ref.collection(SUB_EVENTS).get();
    const batch = db.batch();
    for (const e of evSnap.docs) batch.delete(e.ref);
    batch.delete(doc.ref);
    await batch.commit();
    count++;
  }
  return count;
}
