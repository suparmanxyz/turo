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

const BATCH_SIZE = 5; // server max per call (Vercel timeout)

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
  const [progress, setProgress] = useState<{ current: number; total: number; subName?: string } | null>(null);

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
    else next.add(kode);
    setSelected(next);
  }

  /** Centang semua sub yang lagi visible (atau yang ke-filter saat ini). */
  function selectAllVisible() {
    const next = new Set(selected);
    for (const p of visiblePriority) next.add(p.kode);
    setSelected(next);
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function runSeed() {
    if (!user || selected.size === 0) return;
    setRunning(true);
    setError(null);
    setLastResult(null);

    // Pecah selection jadi batches BATCH_SIZE supaya tidak timeout per call
    const allKodes = Array.from(selected);
    const batches: string[][] = [];
    for (let i = 0; i < allKodes.length; i += BATCH_SIZE) {
      batches.push(allKodes.slice(i, i + BATCH_SIZE));
    }

    const accumulated: SeedResult = {
      results: [],
      totals: { added: 0, dropped: 0, failed: 0, cost: 0 },
    };

    try {
      const idToken = await user.getIdToken();
      for (let bi = 0; bi < batches.length; bi++) {
        const batch = batches[bi];
        setProgress({ current: bi + 1, total: batches.length, subName: batch[0] });
        const res = await fetch("/api/admin/seed-balance/run", {
          method: "POST",
          headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ kodes: batch }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Batch ${bi + 1}/${batches.length} fail: HTTP ${res.status} ${txt.slice(0, 200)}`);
        }
        const data: SeedResult = await res.json();
        accumulated.results.push(...data.results);
        accumulated.totals.added += data.totals.added;
        accumulated.totals.dropped += data.totals.dropped;
        accumulated.totals.failed += data.totals.failed;
        accumulated.totals.cost += data.totals.cost;
        // Update intermediate result supaya pak ustadz lihat progress
        setLastResult({ ...accumulated });
      }
      setSelected(new Set());
      await loadAudit();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-brand">← Admin</Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">🌱 Seed Item Bank — Balance</h1>
      <p className="text-sm text-slate-500 mb-6">
        Generate soal otomatis (Sonnet 4.6) untuk balance distribusi difficulty per sub-materi.
        Target: 1 Easy + 2 Medium + 2 Hard = 5 items per sub. Pak ustadz centang berapapun
        sub yang mau di-seed; client otomatis pecah jadi batch {BATCH_SIZE} sub per call (~3-5
        menit per batch).
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
            onClick={selectAllVisible}
            disabled={running || visiblePriority.length === 0}
            className="rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 text-sm px-4 py-2 disabled:opacity-50"
          >
            ☑ Centang semua tampilan ({visiblePriority.length})
          </button>
          <button
            onClick={clearSelection}
            disabled={running || selected.size === 0}
            className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm px-3 py-2 disabled:opacity-50"
          >
            ✗ Hapus centang
          </button>
          <button
            onClick={runSeed}
            disabled={running || selected.size === 0}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2 disabled:opacity-50"
          >
            {running
              ? progress
                ? `⏳ Batch ${progress.current}/${progress.total}...`
                : "⏳ Sedang seed..."
              : `🌱 Seed ${selected.size} sub`}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Centang sub yang mau di-seed (berapapun). Client otomatis pecah jadi {BATCH_SIZE} sub per
          batch. Estimasi cost: ~$0.10-0.15 per sub × {selected.size > 0 ? selected.size : 0} = <strong>~${(selected.size * 0.12).toFixed(2)}</strong>.
        </p>
        {selected.size > BATCH_SIZE && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠ Total {selected.size} sub akan di-seed dalam {Math.ceil(selected.size / BATCH_SIZE)} batch.
            Estimasi total waktu: ~{Math.ceil(selected.size / BATCH_SIZE * 4)} menit. Jangan tutup tab.
          </p>
        )}
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
            <span className="text-xs text-slate-500">{selected.size} dipilih</span>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={visiblePriority.length > 0 && visiblePriority.every((p) => selected.has(p.kode))}
                      onChange={(e) => {
                        if (e.target.checked) selectAllVisible();
                        else {
                          const next = new Set(selected);
                          for (const p of visiblePriority) next.delete(p.kode);
                          setSelected(next);
                        }
                      }}
                      disabled={running}
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                      title="Centang semua tampilan"
                    />
                  </th>
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
                  return (
                    <tr key={p.kode} className={`border-b border-slate-100 ${isSel ? "bg-emerald-50/50" : "hover:bg-slate-50"}`}>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleSelect(p.kode)}
                          disabled={running}
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
