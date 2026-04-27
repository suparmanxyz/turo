"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";

type SessionRow = {
  id: string;
  uid: string;
  jalur: string;
  stage: string;
  thetaGlobal?: number;
  kelasEstimasi?: number;
  itemsAnswered: number;
  itemsSkipped: number;
  startedAt: number;
  finishedAt?: number;
};

const STAGE_COLOR: Record<string, string> = {
  "fast-locator": "bg-sky-100 text-sky-700",
  "fast-coverage": "bg-violet-100 text-violet-700",
  deep: "bg-amber-100 text-amber-700",
  selesai: "bg-emerald-100 text-emerald-700",
};

export default function AdminDiagnosticSessionsPage() {
  const { user, loading } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("");

  async function load() {
    if (!user) return;
    setMemuat(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const params = new URLSearchParams({ limit: "100" });
      if (stageFilter) params.set("stage", stageFilter);
      const res = await fetch(`/api/admin/diagnostic-sessions?${params}`, {
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      setSessions(data.sessions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setMemuat(false);
    }
  }

  useEffect(() => { if (user && isAdminEmail(user.email)) load(); /* eslint-disable-next-line */ }, [user, stageFilter]);

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user || !isAdminEmail(user.email)) {
    return <main className="mx-auto max-w-3xl p-8 text-center"><p className="text-rose-600">⛔ Akses ditolak</p></main>;
  }

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-brand">← Admin</Link>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-2">
        Tes Diagnostik<span className="text-brand">.</span>
      </h1>
      <p className="text-muted mb-6">Audit sesi diagnostik IRT (Phase B onboarding) dari semua user — verifikasi kecocokan soal vs peta prasyarat.</p>

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Semua Stage</option>
          <option value="fast-locator">Locator</option>
          <option value="fast-coverage">Coverage</option>
          <option value="deep">Deep</option>
          <option value="selesai">Selesai</option>
        </select>
        <button
          onClick={load}
          disabled={memuat}
          className="rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm disabled:opacity-50"
        >
          {memuat ? "Memuat..." : "🔄 Refresh"}
        </button>
        <span className="text-xs text-slate-500 ml-auto">{sessions.length} sesi</span>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-sm">{error}</div>}

      {sessions.length === 0 && !memuat && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500 text-sm">
          Belum ada sesi diagnostik. User perlu jalankan onboarding di /onboarding dulu.
        </div>
      )}

      {sessions.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">User</th>
                <th className="p-3">Jalur</th>
                <th className="p-3">Stage</th>
                <th className="p-3 text-right">Items</th>
                <th className="p-3 text-right">θ / Kelas</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-3 text-xs">
                    <div>{new Date(s.startedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</div>
                    {s.finishedAt && <div className="text-emerald-600">✓ {Math.round((s.finishedAt - s.startedAt) / 60000)}m</div>}
                  </td>
                  <td className="p-3 text-xs font-mono text-slate-500" title={s.uid}>{s.uid.slice(0, 10)}...</td>
                  <td className="p-3 text-xs">{s.jalur}</td>
                  <td className="p-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${STAGE_COLOR[s.stage] ?? "bg-slate-100 text-slate-600"}`}>
                      {s.stage}
                    </span>
                  </td>
                  <td className="p-3 text-right text-xs">
                    <div>{s.itemsAnswered}<span className="text-slate-400"> / {s.itemsAnswered + s.itemsSkipped}</span></div>
                    {s.itemsSkipped > 0 && <div className="text-amber-600 text-[10px]">{s.itemsSkipped} skip</div>}
                  </td>
                  <td className="p-3 text-right text-xs">
                    {s.thetaGlobal !== undefined ? (
                      <>
                        <div>θ={s.thetaGlobal.toFixed(2)}</div>
                        {s.kelasEstimasi !== undefined && <div className="text-slate-500">K{s.kelasEstimasi.toFixed(1)}</div>}
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/diagnostic-sessions/${s.id}`}
                      className="text-xs rounded bg-sky-100 hover:bg-sky-200 text-sky-700 px-2 py-1 inline-block"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
