/**
 * Daily usage counter per uid — enforce free tier limits.
 *
 * Storage: Firestore `daily_usage/{uid}_{YYYY-MM-DD}` (1 doc per user per hari WIB).
 * Auto-prune: doc lama > 90 hari boleh di-delete via cron (TODO).
 *
 * Pakai FieldValue.increment + arrayUnion untuk atomic counter (no race).
 */

import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { todayWIB, emptyUsage, type DailyUsage } from "@/lib/feature-access";

const COLLECTION = "daily_usage";

function docId(uid: string, date: string): string {
  return `${uid}_${date}`;
}

/** Get usage hari ini (WIB) — return empty kalau belum ada doc. */
export async function getTodayUsage(uid: string, now = Date.now()): Promise<DailyUsage> {
  const date = todayWIB(now);
  const snap = await getAdminDb().collection(COLLECTION).doc(docId(uid, date)).get();
  if (!snap.exists) return emptyUsage(date);
  const data = snap.data() as Partial<DailyUsage>;
  return {
    date,
    subMateriAccessed: data.subMateriAccessed ?? [],
    soalAnsweredCount: data.soalAnsweredCount ?? 0,
    aiTutorQueryCount: data.aiTutorQueryCount ?? 0,
  };
}

/**
 * Atomic: tambah subMateriKode ke set hari ini.
 * Pakai arrayUnion supaya idempotent (sub yang sama tidak dobel).
 */
export async function trackSubMateriAccess(uid: string, subMateriKode: string, now = Date.now()): Promise<void> {
  const date = todayWIB(now);
  const ref = getAdminDb().collection(COLLECTION).doc(docId(uid, date));
  await ref.set(
    {
      uid,
      date,
      subMateriAccessed: FieldValue.arrayUnion(subMateriKode),
      updatedAt: now,
    },
    { merge: true },
  );
}

/** Atomic: increment soal answered count. */
export async function trackSoalAnswered(uid: string, count = 1, now = Date.now()): Promise<void> {
  const date = todayWIB(now);
  const ref = getAdminDb().collection(COLLECTION).doc(docId(uid, date));
  await ref.set(
    {
      uid,
      date,
      soalAnsweredCount: FieldValue.increment(count),
      updatedAt: now,
    },
    { merge: true },
  );
}

/** Atomic: increment AI tutor query count. */
export async function trackAiTutorQuery(uid: string, count = 1, now = Date.now()): Promise<void> {
  const date = todayWIB(now);
  const ref = getAdminDb().collection(COLLECTION).doc(docId(uid, date));
  await ref.set(
    {
      uid,
      date,
      aiTutorQueryCount: FieldValue.increment(count),
      updatedAt: now,
    },
    { merge: true },
  );
}
