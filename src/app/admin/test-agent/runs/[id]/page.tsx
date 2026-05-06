"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { MathText } from "@/components/MathText";

type Assertion = {
  name: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  reason?: string;
};

type RunDetail = {
  run: {
    id: string;
    createdAt: number;
    startedAt: number;
    finishedAt?: number;
    status: "running" | "done" | "failed";
    errorMsg?: string;
    personaKey: string;
    personaLabel: string;
    jalur: string;
    jenjang: string;
    kelas: number;
    itemsAnswered: number;
    itemsCorrect: number;
    durationMs?: number;
    locatorItems?: number;
    coverageItems?: number;
    deepItems?: number;
    drillingItems?: number;
    thetaGlobal?: number;
    kelasEstimasi?: number;
    pathRoute?: string;
    maturityOverall?: number;
    maturityLevel?: string;
    assertions: Assertion[];
    assertionsPassed: number;
    assertionsTotal: number;
    sessionId?: string;
  };
  events: {
    id: string;
    ts: number;
    type: "answer" | "stage_transition" | "info" | "error";
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
    fromStage?: string;
    toStage?: string;
    message?: string;
  }[];
  items: Record<string, {
    pertanyaan: string;
    opsi: { teks: string; benar: boolean; alasan?: string }[];
    kunci: number;
    svg?: string;
    meta?: Record<string, unknown>;
  }>;
};

const STAGE_BADGE: Record<string, string> = {
  locator: "bg-sky-50 text-sky-700 border-sky-200",
  coverage: "bg-violet-50 text-violet-700 border-violet-200",
  deep: "bg-amber-50 text-amber-700 border-amber-200",
  drilling: "bg-indigo-50 text-indigo-700 border-indigo-200",
  selesai: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_BADGE: Record<string, string> = {
  running: "bg-amber-100 text-amber-700 border-amber-200",
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  failed: "bg-rose-100 text-rose-700 border-rose-200",
};

function formatDuration(ms?: number): string {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString("id-ID");
}

export default function AdminTestRunDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const { user, loading } = useAuth();
  const [data, setData] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string>("");
  const [showOnlyWrong, setShowOnlyWrong] = useState(false);

  async function load() {
    if (!user) return;
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/test-agent/runs/${id}`, { headers: { authorization: `Bearer ${idToken}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    if (user && isAdminEmail(user.email)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user || !isAdminEmail(user.email)) {
    return <main className="mx-auto max-w-3xl p-8 text-center"><p className="text-rose-600">⛔ Akses ditolak</p></main>;
  }
  if (error) return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/admin/test-agent" className="text-sm text-slate-500 hover:text-brand">← Test Agent</Link>
      <p className="text-rose-600 mt-4">{error}</p>
    </main>
  );
  if (!data) return <main className="p-8 text-slate-500">Memuat run...</main>;

  const { run, events, items } = data;
  const answerEvents = events.filter((e) => e.type === "answer");
  const transitionEvents = events.filter((e) => e.type === "stage_transition");
  const errorEvents = events.filter((e) => e.type === "error");

  // Filter answers
  let displayed = answerEvents;
  if (filterStage) displayed = displayed.filter((e) => e.stage === filterStage);
  if (showOnlyWrong) displayed = displayed.filter((e) => e.correct === false);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <Link href="/admin/test-agent" className="text-sm text-slate-500 hover:text-brand">← Test Agent</Link>
        <h1 className="text-2xl font-bold mt-2">Run #{run.id.slice(0, 8)}</h1>
      </div>

      {/* Header summary */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500">Persona</div>
            <div className="font-semibold">{run.personaLabel}</div>
            <div className="text-xs text-slate-400 font-mono">{run.personaKey}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Profil siswa</div>
            <div className="font-semibold">{run.jenjang} K{run.kelas}</div>
            <div className="text-xs text-slate-400">jalur: {run.jalur}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Status</div>
            <div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[run.status]}`}>
                {run.status}
              </span>
            </div>
            {run.errorMsg && (
              <div className="text-xs text-rose-600 mt-1">{run.errorMsg}</div>
            )}
          </div>
          <div>
            <div className="text-xs text-slate-500">Durasi</div>
            <div className="font-semibold">{formatDuration(run.durationMs)}</div>
            <div className="text-xs text-slate-400">{formatTs(run.startedAt)}</div>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
          <div>
            <div className="text-slate-500">Total items</div>
            <div className="text-xl font-bold">{run.itemsAnswered}</div>
            <div className="text-xs text-slate-400">{run.itemsCorrect} benar ({run.itemsAnswered > 0 ? Math.round(run.itemsCorrect / run.itemsAnswered * 100) : 0}%)</div>
          </div>
          <div>
            <div className="text-slate-500">Locator</div>
            <div className="text-xl font-bold text-sky-700">{run.locatorItems ?? 0}</div>
          </div>
          <div>
            <div className="text-slate-500">Coverage</div>
            <div className="text-xl font-bold text-violet-700">{run.coverageItems ?? 0}</div>
          </div>
          <div>
            <div className="text-slate-500">Deep</div>
            <div className="text-xl font-bold text-amber-700">{run.deepItems ?? 0}</div>
          </div>
          <div>
            <div className="text-slate-500">Drilling</div>
            <div className="text-xl font-bold text-indigo-700">{run.drillingItems ?? 0}</div>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">θ Global</div>
            <div className="font-mono font-semibold">{run.thetaGlobal?.toFixed(3) ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Kelas estimasi</div>
            <div className="font-mono font-semibold">{run.kelasEstimasi?.toFixed(2) ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Path routing</div>
            <div className="font-semibold">{run.pathRoute ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Maturity</div>
            <div className="font-semibold">
              {run.maturityOverall !== undefined ? `${run.maturityOverall}% ${run.maturityLevel}` : "—"}
            </div>
          </div>
        </div>

        {run.sessionId && (
          <div className="mt-3 text-xs">
            <Link href={`/admin/diagnostic-sessions/${run.sessionId}`} className="text-brand hover:underline">
              ↗ Lihat session asli #{run.sessionId.slice(0, 8)}
            </Link>
          </div>
        )}
      </div>

      {/* Assertions */}
      {run.assertions.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 mb-5">
          <h2 className="font-semibold mb-3">
            ✓ Asersi ({run.assertionsPassed}/{run.assertionsTotal} passed)
          </h2>
          <div className="space-y-2">
            {run.assertions.map((a, i) => (
              <div key={i} className={`rounded-lg border p-3 text-sm ${a.passed ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
                <div className="flex items-start gap-2">
                  <span>{a.passed ? "✓" : "✗"}</span>
                  <div className="flex-1">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      Expected: <code className="font-mono">{JSON.stringify(a.expected)}</code> ·
                      Actual: <code className="font-mono">{JSON.stringify(a.actual)}</code>
                    </div>
                    {a.reason && <div className="text-xs text-slate-500 mt-1 italic">{a.reason}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {errorEvents.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 mb-5">
          <h2 className="font-semibold mb-3 text-rose-700">⚠ Errors ({errorEvents.length})</h2>
          {errorEvents.map((e, i) => (
            <div key={i} className="text-sm font-mono text-rose-800 bg-white p-2 rounded mb-1">
              {e.message}
            </div>
          ))}
        </div>
      )}

      {/* Stage transitions */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 mb-5">
        <h2 className="font-semibold mb-3">📍 Stage transitions</h2>
        <div className="flex flex-wrap gap-2">
          {transitionEvents.map((t, i) => (
            <div key={i} className="flex items-center gap-1 text-xs">
              {t.fromStage && (
                <>
                  <span className={`px-2 py-0.5 rounded-full border ${STAGE_BADGE[t.fromStage] ?? "bg-slate-100"}`}>{t.fromStage}</span>
                  <span className="text-slate-400">→</span>
                </>
              )}
              <span className={`px-2 py-0.5 rounded-full border ${STAGE_BADGE[t.toStage ?? ""] ?? "bg-slate-100"}`}>{t.toStage}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 mb-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-slate-600">Filter:</span>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
        >
          <option value="">Semua stage</option>
          <option value="locator">Locator</option>
          <option value="coverage">Coverage</option>
          <option value="deep">Deep</option>
          <option value="drilling">Drilling</option>
        </select>
        <label className="flex items-center gap-2 cursor-pointer text-xs">
          <input type="checkbox" checked={showOnlyWrong} onChange={(e) => setShowOnlyWrong(e.target.checked)} />
          Hanya yang salah
        </label>
        <span className="ml-auto text-xs text-slate-500">{displayed.length} item ditampilkan</span>
      </div>

      {/* Items + answers */}
      <div className="space-y-3">
        {displayed.map((e, idx) => {
          if (!e.itemId || !items[e.itemId]) return null;
          const it = items[e.itemId];
          const correct = e.correct === true;
          return (
            <div key={e.id} className={`rounded-2xl bg-white border ${correct ? "border-emerald-200" : "border-rose-200"} p-4`}>
              <div className="flex items-center justify-between mb-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono">#{idx + 1}</span>
                  <span className={`px-2 py-0.5 rounded-full border ${STAGE_BADGE[e.stage ?? ""] ?? "bg-slate-100"}`}>{e.stage}</span>
                  <span className="text-slate-500 font-mono">{e.subKode}</span>
                  <span className="text-slate-400">K{e.itemKelas}</span>
                  <span className="text-slate-400">{e.itemArea}</span>
                  {e.itemDifficulty && <span className="text-slate-400">· {e.itemDifficulty}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">b={e.itemB?.toFixed(2)}</span>
                  <span className="text-slate-500">{Math.round((e.responseTimeMs ?? 0) / 1000)}s</span>
                  <span className={correct ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>{correct ? "✓ BENAR" : "✗ SALAH"}</span>
                </div>
              </div>
              {it.svg && <div className="mb-2 flex justify-center" dangerouslySetInnerHTML={{ __html: it.svg }} />}
              <div className="text-sm mb-3"><MathText>{it.pertanyaan}</MathText></div>
              <div className="space-y-1">
                {it.opsi.map((o, i) => {
                  const isPicked = i === e.picked;
                  const isKunci = i === e.kunci;
                  return (
                    <div key={i} className={`text-xs rounded-lg border p-2 flex items-start gap-2 ${
                      isPicked && isKunci ? "bg-emerald-50 border-emerald-300" :
                      isPicked && !isKunci ? "bg-rose-50 border-rose-300" :
                      isKunci ? "bg-emerald-50/50 border-emerald-200" :
                      "bg-slate-50 border-slate-200"
                    }`}>
                      <span className="font-mono font-bold w-5">{String.fromCharCode(65 + i)}.</span>
                      <span className="flex-1"><MathText>{o.teks}</MathText></span>
                      <span className="shrink-0 flex gap-1">
                        {isPicked && <span className={isKunci ? "text-emerald-600" : "text-rose-600"}>← agent pick</span>}
                        {isKunci && !isPicked && <span className="text-emerald-600">← kunci</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
