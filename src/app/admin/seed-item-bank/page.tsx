"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";

type GapEntry = {
  kode: string;
  nama: string;
  jenjang: string;
  kelas: number;
  is_maku: boolean;
  dependents_count: number;
  current: { easy: number; medium: number; hard: number; total: number };
  needed: { easy: number; medium: number; hard: number };
  totalNeeded: number;
  priorityScore: number;
};

type AuditResp = {
  priority: GapEntry[];
  summary: { totalSubs: number; subsNeed: number; itemsNeeded: number; byDiff: { easy: number; medium: number; hard: number } };
};

type SeedResult = {
  results: { kode: string; nama: string; added: number; dropped: number; cost: number; error?: string; needed: { easy: number; medium: number; hard: number } }[];
  totals: { added: number; dropped: number; failed: number; cost: number };
};

const MAX_PER_BATCH = 5;

export default function SeedItemBankPage() {
  const { user, loading } = useAuth();
  const [audit, setAudit] = useState<AuditResp | null>(null);
  const [filterJenjang, setFilterJenjang] = useState<"" | "SD" | "SMP" | "SMA">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SeedResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCount, setShowCount] = useState(20);

  async function loadAudit() {
    if (!user) return;
    setRefreshing(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/seed-balance/audit", { headers: { authorization: `Bearer ${idToken}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAudit(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (user && isAdminEmail(user.email)) loadAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user || !isAdminEmail(user.email)) {
    return <main className="mx-auto max-w-3xl p-8 text-center"><p className="text-rose-600">⛔ Akses ditolak</p></main>;
  }

  const filteredPriority = audit?.priority.filter((p) => !filterJenjang || p.jenjang === filterJenjang) ?? [];
  const visiblePriority = filteredPriority.slice(0, showCount);

  function toggleSelect(kode: string) {
    const next = new Set(selected);
    if (next.has(kode)) next.delete(kode);
    else if (next.size < MAX_PER_BATCH) next.add(kode);
    setSelected(next);
  }

  function autoSelectTop() {
    const next = new Set<string>();
    for (const p of filteredPriority.slice(0, MAX_PER_BATCH)) next.add(p.kode);
    setSelected(next);
  }

  async function runSeed() {
    if (!user || selected.size === 0) return;
    setRunning(true);
    setError(null);
    setLastResult(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/seed-balance/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ kodes: Array.from(selected) }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
      }
      const data: SeedResult = await res.json();
      setLastResult(data);
      setSelected(new Set());
      // Reload audit setelah seed
      await loadAudit();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-brand">← Admin</Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">🌱 Seed Item Bank — Balance</h1>
      <p className="text-sm text-slate-500 mb-6">
        Generate soal otomatis (Sonnet 4.6) untuk balance distribusi difficulty per sub-materi.
        Target: 1 Easy + 2 Medium + 2 Hard = 5 items per sub. Max {MAX_PER_BATCH} sub per batch
        supaya tidak timeout (~30-90 detik per sub).
      </p>

      {/* Summary */}
      {audit && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">📊 Status Coverage</h2>
            <button
              onClick={loadAudit}
              disabled={refreshing}
              className="text-xs text-brand hover:underline disabled:opacity-50"
            >
              {refreshing ? "↻ Memuat..." : "↻ Refresh"}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Total Sub</div>
              <div className="text-2xl font-bold">{audit.summary.totalSubs}</div>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <div className="text-xs text-amber-700">Perlu Balance</div>
              <div className="text-2xl font-bold text-amber-800">{audit.summary.subsNeed}</div>
            </div>
            <div className="rounded-xl bg-rose-50 p-3">
              <div className="text-xs text-rose-700">Items Total</div>
              <div className="text-2xl font-bold text-rose-800">{audit.summary.itemsNeeded}</div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <div className="text-xs text-emerald-700">Cost Total</div>
              <div className="text-2xl font-bold text-emerald-800">~${(audit.summary.itemsNeeded * 0.025).toFixed(0)}</div>
            </div>
          </div>
          <div className="text-xs text-slate-600 mt-3">
            Per difficulty: <strong>Easy {audit.summary.byDiff.easy}</strong> · <strong>Medium {audit.summary.byDiff.medium}</strong> · <strong>Hard {audit.summary.byDiff.hard}</strong>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 mb-6">
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Filter jenjang</label>
            <select
              value={filterJenjang}
              onChange={(e) => { setFilterJenjang(e.target.value as "" | "SD" | "SMP" | "SMA"); setSelected(new Set()); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Semua</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Tampilkan top N</label>
            <select
              value={showCount}
              onChange={(e) => setShowCount(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="500">500</option>
            </select>
          </div>
          <button
            onClick={autoSelectTop}
            disabled={running || filteredPriority.length === 0}
            className="rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 text-sm px-4 py-2 disabled:opacity-50"
          >
            ⚡ Auto-pick top {MAX_PER_BATCH}
          </button>
          <button
            onClick={runSeed}
            disabled={running || selected.size === 0}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2 disabled:opacity-50"
          >
            {running ? "⏳ Sedang seed (~30-90s/sub)..." : `🌱 Seed ${selected.size} sub`}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Pilih max {MAX_PER_BATCH} sub-materi (centang). Per sub akan di-generate items sesuai gap difficulty.
        </p>
        {error && <div className="mt-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 p-3 text-sm">{error}</div>}
      </div>

      {/* Last result */}
      {lastResult && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 mb-6">
          <h3 className="font-semibold text-emerald-800 mb-2">
            ✅ Selesai: +{lastResult.totals.added} items, ${lastResult.totals.cost.toFixed(2)}
            {lastResult.totals.dropped > 0 ? ` (${lastResult.totals.dropped} duplikat skipped)` : ""}
            {lastResult.totals.failed > 0 ? ` · ${lastResult.totals.failed} fail` : ""}
          </h3>
          <div className="text-sm space-y-1">
            {lastResult.results.map((r) => (
              <div key={r.kode} className="text-emerald-900">
                {r.error ? "❌" : "✓"} <span className="font-mono">{r.kode}</span>: +{r.added} items
                {r.dropped > 0 ? ` (-${r.dropped} dup)` : ""}
                {r.error ? ` — ${r.error}` : ` · $${r.cost.toFixed(4)}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority list */}
      {audit && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">🎯 Priority list ({filteredPriority.length} sub)</h2>
            <span className="text-xs text-slate-500">{selected.size} / {MAX_PER_BATCH} dipilih</span>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2"></th>
                  <th className="text-left p-2">Kode</th>
                  <th className="text-left p-2">Nama</th>
                  <th className="text-center p-2">Saat ini</th>
                  <th className="text-center p-2">Need</th>
                  <th className="text-right p-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {visiblePriority.map((p) => {
                  const isSel = selected.has(p.kode);
                  const canSelect = isSel || selected.size < MAX_PER_BATCH;
                  return (
                    <tr key={p.kode} className={`border-b border-slate-100 ${isSel ? "bg-emerald-50/50" : "hover:bg-slate-50"}`}>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleSelect(p.kode)}
                          disabled={!canSelect || running}
                          className="h-4 w-4 cursor-pointer accent-emerald-600 disabled:opacity-30"
                        />
                      </td>
                      <td className="p-2 font-mono text-xs">{p.kode}</td>
                      <td className="p-2 text-slate-700">
                        {p.nama.slice(0, 60)}
                        {p.is_maku && <span className="ml-1 text-amber-600 text-xs">⭐</span>}
                      </td>
                      <td className="p-2 text-center text-xs">
                        E{p.current.easy}/M{p.current.medium}/H{p.current.hard}
                      </td>
                      <td className="p-2 text-center text-xs font-semibold text-rose-600">
                        +E{p.needed.easy}/M{p.needed.medium}/H{p.needed.hard}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-slate-500">{p.priorityScore}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {showCount < filteredPriority.length && (
            <div className="text-center mt-3">
              <button
                onClick={() => setShowCount((c) => c + 20)}
                className="text-xs text-brand hover:underline"
              >
                Show 20 more ({filteredPriority.length - showCount} lagi)
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
