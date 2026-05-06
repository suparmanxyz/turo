"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";

type Persona = {
  key: string;
  label: string;
  description: string;
  jenjang: string;
  kelas: number;
  jalur: string;
};

type RunRow = {
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
  thetaGlobal?: number;
  kelasEstimasi?: number;
  pathRoute?: string;
  maturityOverall?: number;
  maturityLevel?: string;
  assertionsPassed: number;
  assertionsTotal: number;
};

const STATUS_BADGE: Record<RunRow["status"], string> = {
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
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminTestAgentPage() {
  const { user, loading } = useAuth();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function fetchPersonas() {
    if (!user) return;
    const idToken = await user.getIdToken();
    const res = await fetch("/api/admin/test-agent/personas", { headers: { authorization: `Bearer ${idToken}` } });
    if (!res.ok) return;
    const data = await res.json();
    setPersonas(data.personas);
    if (data.personas.length > 0 && !selectedPersona) setSelectedPersona(data.personas[0].key);
  }

  async function fetchRuns() {
    if (!user) return;
    const idToken = await user.getIdToken();
    const res = await fetch("/api/admin/test-agent/runs", { headers: { authorization: `Bearer ${idToken}` } });
    if (!res.ok) return;
    const data = await res.json();
    setRuns(data.runs);
  }

  useEffect(() => {
    if (user && isAdminEmail(user.email)) {
      fetchPersonas();
      fetchRuns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshKey]);

  async function triggerRun() {
    if (!user || !selectedPersona) return;
    setRunning(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/test-agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ personaKey: selectedPersona }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
      }
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user || !isAdminEmail(user.email)) {
    return <main className="mx-auto max-w-3xl p-8 text-center"><p className="text-rose-600">⛔ Akses ditolak</p></main>;
  }

  const personaSelected = personas.find((p) => p.key === selectedPersona);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-slate-500 hover:text-brand">← Admin</Link>
        <h1 className="text-2xl font-bold mt-2">🤖 Test Agent — Diagnostik Otomatis</h1>
        <p className="text-sm text-slate-500 mt-1">
          Jalankan agent fake yang berperan sebagai persona siswa, lalu review hasilnya. End-to-end via API real (catch bug serialization).
        </p>
      </div>

      {/* Trigger form */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold mb-3">▶ Mulai run baru</h2>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs text-slate-600 mb-1">Persona</label>
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              disabled={running}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {personas.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label} ({p.jenjang} K{p.kelas})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={triggerRun}
            disabled={running || !selectedPersona}
            className="rounded-xl bg-brand hover:bg-brand-strong text-white font-semibold px-6 py-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {running ? "⏳ Sedang berjalan (~30-90s)..." : "▶ Run"}
          </button>
        </div>
        {personaSelected && (
          <p className="text-xs text-slate-500 mt-2 italic">{personaSelected.description}</p>
        )}
        {error && <div className="mt-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 p-3 text-sm">{error}</div>}
      </div>

      {/* Run history */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">📋 Run history (50 terbaru)</h2>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="text-xs text-brand hover:underline"
          >
            ↻ Refresh
          </button>
        </div>

        {runs.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Belum ada run.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="text-left p-2">Tanggal</th>
                  <th className="text-left p-2">Persona</th>
                  <th className="text-left p-2">Jalur · K</th>
                  <th className="text-right p-2">Items</th>
                  <th className="text-right p-2">θ / K_est</th>
                  <th className="text-left p-2">Path</th>
                  <th className="text-left p-2">Maturity</th>
                  <th className="text-center p-2">Asersi</th>
                  <th className="text-center p-2">Status</th>
                  <th className="text-right p-2">Durasi</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const allPassed = r.assertionsTotal > 0 && r.assertionsPassed === r.assertionsTotal;
                  const accuracy = r.itemsAnswered > 0 ? (r.itemsCorrect / r.itemsAnswered * 100).toFixed(0) : "0";
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2 text-xs text-slate-500">{formatTs(r.createdAt)}</td>
                      <td className="p-2 font-medium text-slate-700">{r.personaLabel}</td>
                      <td className="p-2 text-xs text-slate-600">{r.jalur} · K{r.kelas}</td>
                      <td className="p-2 text-right text-xs">
                        {r.itemsAnswered} <span className="text-slate-400">({accuracy}%)</span>
                      </td>
                      <td className="p-2 text-right text-xs font-mono">
                        {r.thetaGlobal?.toFixed(2) ?? "—"} / {r.kelasEstimasi?.toFixed(1) ?? "—"}
                      </td>
                      <td className="p-2 text-xs">{r.pathRoute ?? "—"}</td>
                      <td className="p-2 text-xs">
                        {r.maturityOverall !== undefined ? `${r.maturityOverall}% ${r.maturityLevel}` : "—"}
                      </td>
                      <td className="p-2 text-center text-xs">
                        {r.assertionsTotal > 0 ? (
                          <span className={allPassed ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                            {r.assertionsPassed}/{r.assertionsTotal}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-2 text-right text-xs text-slate-500">{formatDuration(r.durationMs)}</td>
                      <td className="p-2">
                        <Link
                          href={`/admin/test-agent/runs/${r.id}`}
                          className="text-xs text-brand hover:underline"
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
