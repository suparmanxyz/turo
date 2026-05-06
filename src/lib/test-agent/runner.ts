/**
 * Test agent runner — call /api/onboarding endpoints sebagai user fake,
 * jawab per persona, log semua event.
 *
 * Mode B (end-to-end via API) — catch bug serialization & state round-trip.
 *
 * Flow:
 *   1. Mint custom token via Admin SDK untuk TEST_AGENT_UID.
 *   2. Exchange jadi ID token via Firebase Auth REST.
 *   3. POST /api/onboarding/start untuk inisiasi session.
 *   4. Loop: persona.shouldAnswerCorrect(item) → POST /api/onboarding/answer.
 *   5. Stop kalau done atau loop guard exceeded.
 *   6. Log setiap event ke test_runs subcollection.
 */

import { getAdminAuth } from "@/lib/firebase-admin";
import { loadItem } from "@/lib/item-bank";
import { getPersona, sampleResponseTimeMs, type Persona } from "@/lib/test-agent/personas";
import { appendEvent, createTestRun, failTestRun, finalizeTestRun, updateTestRun, type Assertion } from "@/lib/test-agent/storage";
import { runAssertions } from "@/lib/test-agent/assertions";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const TEST_AGENT_UID = process.env.TEST_AGENT_UID;
const MAX_ITEMS_GUARD = 200; // safety: kalau lebih dari ini, abort (loop indikator)

type SanitizedItem = {
  id: string;
  subMateriKode: string;
  pertanyaan: string;
  opsi: { teks: string }[];
  svg?: string;
};

type AnswerResponse = {
  state: Record<string, unknown>;
  nextItem: SanitizedItem | null;
  correct: boolean;
  done: boolean;
  progress: { stage: string; itemsAnswered: number; estimatedTotal: number; label: string };
};

type StartResponse = {
  sessionId: string;
  state: Record<string, unknown>;
  nextItem: SanitizedItem | null;
  progress: { stage: string; itemsAnswered: number; estimatedTotal: number; label: string };
};

async function getIdToken(uid: string): Promise<string> {
  if (!FIREBASE_API_KEY) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY missing");
  const customToken = await getAdminAuth().createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`signInWithCustomToken failed: ${res.status} ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.idToken as string;
}

/** Build absolute URL untuk fetch internal API. */
function apiUrl(baseUrl: string, path: string): string {
  return baseUrl.replace(/\/$/, "") + path;
}

export type RunOptions = {
  personaKey: string;
  /** Override jenjang/kelas/jalur dari persona kalau set. */
  jenjangOverride?: import("@/types").JenjangResmi;
  kelasOverride?: number;
  jalurOverride?: import("@/lib/item-bank").JalurDiagnostik;
  /** Base URL untuk call API (e.g. http://localhost:3000 atau https://turo.mainmaku.id). */
  baseUrl: string;
};

/**
 * Eksekusi satu run end-to-end. Return runId.
 * Throw kalau setup fail (auth, dll). Failure mid-run di-record ke run doc.
 */
export async function executeTestRun(opts: RunOptions): Promise<string> {
  if (!TEST_AGENT_UID) throw new Error("TEST_AGENT_UID env missing");
  const persona = getPersona(opts.personaKey);
  if (!persona) throw new Error(`Persona ${opts.personaKey} tidak ditemukan`);

  const jenjang = opts.jenjangOverride ?? persona.jenjang;
  const kelas = opts.kelasOverride ?? persona.kelas;
  const jalur = opts.jalurOverride ?? persona.jalur;

  // Buat run doc dulu — kalau crash, runId tetap exist untuk audit
  const runId = await createTestRun({
    personaKey: persona.key,
    personaLabel: persona.label,
    jalur,
    jenjang,
    kelas,
  });

  try {
    const idToken = await getIdToken(TEST_AGENT_UID);

    // 1. START
    const startRes = await fetch(apiUrl(opts.baseUrl, "/api/onboarding/start"), {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ jalur, jenjang, kelas, modeKurikulum: "comprehensive" }),
    });
    if (!startRes.ok) {
      const txt = await startRes.text();
      throw new Error(`POST /start failed: ${startRes.status} ${txt.slice(0, 200)}`);
    }
    const startData: StartResponse = await startRes.json();
    await updateTestRun(runId, { sessionId: startData.sessionId });
    await appendEvent(runId, { type: "info", message: `Session started: ${startData.sessionId}` });
    await appendEvent(runId, { type: "stage_transition", toStage: startData.progress.stage });

    let state = startData.state;
    let nextItem = startData.nextItem;
    let currentStage = startData.progress.stage;
    let stageMilestones: { locator: number; coverage: number; deep: number; drilling: number } = {
      locator: 0, coverage: 0, deep: 0, drilling: 0,
    };
    let loopGuardSameItem = { itemId: "", count: 0 };

    let iter = 0;
    while (nextItem && iter < MAX_ITEMS_GUARD) {
      iter++;
      // Loop guard: itemId yang sama berturut-turut > 3x → abort
      if (nextItem.id === loopGuardSameItem.itemId) {
        loopGuardSameItem.count++;
        if (loopGuardSameItem.count >= 3) {
          throw new Error(`Loop detected: item ${nextItem.id} (${nextItem.subMateriKode}) returned ${loopGuardSameItem.count + 1}x consecutively`);
        }
      } else {
        loopGuardSameItem = { itemId: nextItem.id, count: 0 };
      }

      // Load full item dari Firestore untuk akses meta + kunci (server-side, agent berperan as god)
      const fullItem = await loadItem(nextItem.id);
      if (!fullItem) {
        throw new Error(`Item ${nextItem.id} tidak ditemukan di Firestore`);
      }

      // Decide jawaban via persona
      const wantCorrect = persona.shouldAnswerCorrect(fullItem, { itemIdx: iter, stage: currentStage });
      const kunci = fullItem.konten.kunci;
      let pickedIdx: number;
      if (wantCorrect) {
        pickedIdx = kunci;
      } else {
        // Pilih opsi salah random
        const wrongIdxs = fullItem.konten.opsi.map((_, i) => i).filter((i) => i !== kunci);
        pickedIdx = wrongIdxs[Math.floor(Math.random() * wrongIdxs.length)] ?? 0;
      }
      const responseTimeMs = sampleResponseTimeMs(persona);

      // Log event SEBELUM submit (snapshot pertanyaan + persona pick)
      await appendEvent(runId, {
        type: "answer",
        itemId: fullItem.id,
        subKode: fullItem.subMateriKode,
        itemKelas: fullItem.kelas,
        itemB: fullItem.b,
        itemArea: fullItem.area,
        itemDifficulty: fullItem.meta?.difficultyLabel,
        stage: currentStage,
        picked: pickedIdx,
        kunci,
        correct: pickedIdx === kunci,
        responseTimeMs,
      });

      // 2. ANSWER
      const ansRes = await fetch(apiUrl(opts.baseUrl, "/api/onboarding/answer"), {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          sessionId: startData.sessionId,
          state,
          itemId: fullItem.id,
          pilihIdx: pickedIdx,
          responseTimeMs,
        }),
      });
      if (!ansRes.ok) {
        const txt = await ansRes.text();
        throw new Error(`POST /answer failed at iter ${iter}: ${ansRes.status} ${txt.slice(0, 200)}`);
      }
      const ansData: AnswerResponse = await ansRes.json();

      // Track stage transition
      if (ansData.progress.stage !== currentStage) {
        await appendEvent(runId, {
          type: "stage_transition",
          fromStage: currentStage,
          toStage: ansData.progress.stage,
        });
        currentStage = ansData.progress.stage;
      }
      // Track per-stage milestones
      if (currentStage in stageMilestones) {
        stageMilestones[currentStage as keyof typeof stageMilestones] = ansData.progress.itemsAnswered;
      }

      state = ansData.state;
      nextItem = ansData.nextItem;
      if (ansData.done) break;
    }

    if (iter >= MAX_ITEMS_GUARD) {
      throw new Error(`MAX_ITEMS_GUARD (${MAX_ITEMS_GUARD}) hit — aborting run`);
    }

    // Finalize: fetch final session dari Firestore untuk hasil
    const { getDiagnosticSession } = await import("@/lib/firestore-schema");
    const { getTestRun } = await import("@/lib/test-agent/storage");
    const finalSession = await getDiagnosticSession(startData.sessionId);
    const runDoc = await getTestRun(runId);

    const finalPatch: Partial<import("@/lib/test-agent/storage").TestRunDoc> = {
      status: "done",
      durationMs: Date.now() - (runDoc?.startedAt ?? Date.now()),
      locatorItems: stageMilestones.locator,
      coverageItems: stageMilestones.coverage,
      deepItems: stageMilestones.deep,
      drillingItems: stageMilestones.drilling,
      thetaGlobal: finalSession?.thetaGlobal,
      kelasEstimasi: finalSession?.kelasEstimasi,
      pathRoute: finalSession?.hasilCoverage?.pathRoute?.path,
      maturityOverall: finalSession?.hasilMaturity?.overall,
      maturityLevel: finalSession?.hasilMaturity?.level,
    };

    // Run assertions
    const assertions: Assertion[] = runAssertions(persona, finalSession, stageMilestones);

    await finalizeTestRun(runId, { ...finalPatch, assertions });
    return runId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await appendEvent(runId, { type: "error", message: msg });
    await failTestRun(runId, msg);
    return runId;
  }
}
