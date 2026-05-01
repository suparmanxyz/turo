"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";

type Row = {
  kode: string;
  nama: string;
  jenjang: "SD" | "SMP" | "SMA";
  kelas: number;
  area: string;
  bab: string;
  isMaku: boolean;
  isEntryPoint: boolean;
  dependentsCount: number;
  count: number;
};

type SeedResult = {
  kode: string;
  generated: number;
  existing: number;
  total: number;
  skipped?: boolean;
  error?: string;
};

export default function AdminItemBankPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<{ totalItems: number; subsWithItems: number; subsTotalPriority: number } | null>(null);
  const [filter, setFilter] = useState<{ jenjang: string; kelas: string }>({ jenjang: "", kelas: "" });
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seeding state
  const [targetCount, setTargetCount] = useState(3);
  const [modelChoice, setModelChoice] = useState<"auto" | "sonnet" | "opus">("auto");
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [log, setLog] = useState<SeedResult[]>([]);
  const [stopRequested, setStopRequested] = useState(false);

  async function loadStatus() {
    if (!user) return;
    setMemuat(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const params = new URLSearchParams();
      if (filter.jenjang) params.set("jenjang", filter.jenjang);
      if (filter.kelas) params.set("kelas", filter.kelas);
      const res = await fetch(`/api/admin/item-bank-status?${params}`, {
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      setRows(data.rows);
      setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setMemuat(false);
    }
  }

  useEffect(() => {
    if (user && isAdminEmail(user.email)) loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter.jenjang, filter.kelas]);

  async function seedOne(kode: string): Promise<SeedResult> {
    const idToken = await user!.getIdToken();
    const body: { kode: string; count: number; model?: string } = { kode, count: targetCount };
    if (modelChoice !== "auto") body.model = modelChoice;
    const res = await fetch("/api/admin/seed-item-bank", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return { kode, generated: 0, existing: 0, total: 0, error: data.error ?? `HTTP ${res.status}` };
    }
    return data;
  }

  async function seedBatch(items: Row[]) {
    setSeeding(true);
    setStopRequested(false);
    setLog([]);
    setProgress({ done: 0, total: items.length });
    for (let i = 0; i < items.length; i++) {
      if (stopRequested) break;
      const row = items[i]!;
      // Skip yang sudah cukup (gak overwrite)
      if (row.count >= targetCount) {
        setLog((l) => [...l, { kode: row.kode, generated: 0, existing: row.count, total: row.count, skipped: true }]);
        setProgress({ done: i + 1, total: items.length });
        continue;
      }
      const result = await seedOne(row.kode);
      setLog((l) => [...l, result]);
      setProgress({ done: i + 1, total: items.length });
      // Update local row count
      setRows((rs) =>
        rs.map((r) => (r.kode === row.kode ? { ...r, count: result.total } : r)),
      );
      // Throttle 1 detik antar request supaya gak rate-limit
      await new Promise((res) => setTimeout(res, 800));
    }
    setSeeding(false);
    // Refresh stats
    await loadStatus();
  }

  async function regenerateOne(kode: string, count: number): Promise<SeedResult> {
    const idToken = await user!.getIdToken();
    const body: { count: number; model?: string } = { count };
    if (modelChoice !== "auto") body.model = modelChoice;
    const res = await fetch(`/api/admin/item-bank/${encodeURIComponent(kode)}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return { kode, generated: 0, existing: count, total: 0, error: data.error ?? `HTTP ${res.status}` };
    }
    return { kode, generated: data.generated, existing: data.deleted, total: data.generated };
  }

  async function regenerateBatch(items: Row[]) {
    if (items.length === 0) return;
    if (!confirm(`♻ Regenerate ${items.length} sub-materi?\n\nIni akan HAPUS items lama setiap sub, lalu generate baru. Tujuan: refresh items lama supaya dapat metadata pedagogis.\n\nEstimasi cost: ~$${(items.length * 0.012).toFixed(2)}. Throttle 800ms antar request.\n\nLanjut?`)) return;
    setSeeding(true);
    setStopRequested(false);
    setLog([]);
    setProgress({ done: 0, total: items.length });
    for (let i = 0; i < items.length; i++) {
      if (stopRequested) break;
      const row = items[i]!;
      // Pakai count target = max(targetCount, row.count saat ini) supaya gak ngecil
      const useCount = Math.max(targetCount, row.count);
      const result = await regenerateOne(row.kode, useCount);
      setLog((l) => [...l, result]);
      setProgress({ done: i + 1, total: items.length });
      setRows((rs) =>
        rs.map((r) => (r.kode === row.kode ? { ...r, count: result.total } : r)),
      );
      await new Promise((res) => setTimeout(res, 800));
    }
    setSeeding(false);
    await loadStatus();
  }

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user || !isAdminEmail(user.email)) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-rose-600">⛔ Akses ditolak</p>
        <Link href="/" className="text-brand underline">← Beranda</Link>
      </main>
    );
  }

  const gaps = rows.filter((r) => r.count < targetCount);

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-brand">← Admin</Link>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-2">
        Item Bank<span className="text-brand">.</span>
      </h1>
      <p className="text-muted mb-6">Seed soal MC ke <code className="bg-slate-100 px-1 rounded">item_bank</code> per sub-materi prioritas (entry/MAKU/milestone).</p>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card title="Total Items" value={String(stats.totalItems)} />
          <Card title="Sub dengan Items" value={String(stats.subsWithItems)} />
          <Card title="Sub Prioritas" value={String(stats.subsTotalPriority)} sub="ditampilkan" />
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={filter.jenjang}
          onChange={(e) => setFilter((f) => ({ ...f, jenjang: e.target.value, kelas: "" }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Semua Jenjang</option>
          <option value="SD">SD</option>
          <option value="SMP">SMP</option>
          <option value="SMA">SMA</option>
        </select>
        <select
          value={filter.kelas}
          onChange={(e) => setFilter((f) => ({ ...f, kelas: e.target.value }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Semua Kelas</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((k) => (
            <option key={k} value={k}>Kelas {k}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          Target/sub:
          <input
            type="number"
            min={1}
            max={10}
            value={targetCount}
            onChange={(e) => setTargetCount(Math.max(1, Math.min(10, Number(e.target.value))))}
            className="w-16 rounded-lg border border-slate-200 px-2 py-1"
            disabled={seeding}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          Model:
          <select
            value={modelChoice}
            onChange={(e) => setModelChoice(e.target.value as "auto" | "sonnet" | "opus")}
            className="rounded-lg border border-slate-200 px-2 py-1"
            disabled={seeding}
          >
            <option value="auto">Auto (Sonnet)</option>
            <option value="sonnet">Sonnet 4.6 (cepat)</option>
            <option value="opus">Opus 4.7 (presisi, ~5× lebih mahal)</option>
          </select>
        </label>
        <button
          onClick={loadStatus}
          disabled={memuat || seeding}
          className="rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm disabled:opacity-50"
        >
          {memuat ? "Memuat..." : "🔄 Refresh"}
        </button>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-sm">{error}</div>}

      {/* Seeding controls — untuk sub yang BELUM cukup */}
      <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-semibold text-amber-900">⚡ Seed batch — {gaps.length} sub-materi belum cukup ({targetCount}/sub)</div>
            <div className="text-xs text-amber-700 mt-1">Untuk sub yang count &lt; {targetCount}. Estimasi cost: ~${(gaps.length * 0.012).toFixed(2)}. Throttle 800ms.</div>
          </div>
          <div className="flex gap-2">
            {!seeding ? (
              <>
                <button
                  onClick={() => seedBatch(gaps.slice(0, 10))}
                  disabled={gaps.length === 0}
                  className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 text-sm disabled:opacity-50"
                >
                  Seed 10 Pertama
                </button>
                <button
                  onClick={() => seedBatch(gaps)}
                  disabled={gaps.length === 0}
                  className="rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-medium px-4 py-2 text-sm disabled:opacity-50"
                >
                  Seed Semua ({gaps.length})
                </button>
              </>
            ) : (
              <button
                onClick={() => setStopRequested(true)}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium px-4 py-2 text-sm"
              >
                ⏸ Stop
              </button>
            )}
          </div>
        </div>

        {seeding && (
          <div className="mt-3">
            <div className="text-xs text-amber-800 mb-1">Progress: {progress.done} / {progress.total}</div>
            <div className="h-2 rounded-full bg-amber-200 overflow-hidden">
              <div className="h-full bg-amber-600 transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Regenerate batch — untuk sub yang SUDAH punya items (refresh metadata) */}
      {(() => {
        const withItems = rows.filter((r) => r.count > 0);
        return (
          <div className="mb-6 rounded-2xl bg-violet-50 border border-violet-200 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-semibold text-violet-900">♻ Regenerate batch — {withItems.length} sub-materi sudah punya items</div>
                <div className="text-xs text-violet-700 mt-1">
                  Hapus items lama + generate baru dengan metadata pedagogis lengkap.
                  Untuk update items lama (sebelum schema metadata).
                  Estimasi cost: ~${(withItems.length * 0.012).toFixed(2)}.
                </div>
              </div>
              <div className="flex gap-2">
                {!seeding ? (
                  <>
                    <button
                      onClick={() => regenerateBatch(withItems.slice(0, 10))}
                      disabled={withItems.length === 0}
                      className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium px-4 py-2 text-sm disabled:opacity-50"
                    >
                      Regenerate 10 Pertama
                    </button>
                    <button
                      onClick={() => regenerateBatch(withItems)}
                      disabled={withItems.length === 0}
                      className="rounded-lg bg-violet-700 hover:bg-violet-800 text-white font-medium px-4 py-2 text-sm disabled:opacity-50"
                    >
                      Regenerate Semua ({withItems.length})
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setStopRequested(true)}
                    className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium px-4 py-2 text-sm"
                  >
                    ⏸ Stop
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Recent log */}
      {log.length > 0 && (
        <div className="mb-6 rounded-2xl bg-white border border-slate-200 p-4 max-h-60 overflow-y-auto">
          <h3 className="font-semibold mb-2 text-sm">Log seeding ({log.length})</h3>
          <div className="space-y-1 text-xs font-mono">
            {log.slice().reverse().map((l, i) => (
              <div key={i} className={l.error ? "text-rose-600" : l.skipped ? "text-slate-400" : "text-emerald-700"}>
                {l.error ? "❌" : l.skipped ? "⏭️" : "✅"} {l.kode} — {l.error ? l.error : l.skipped ? `skip (${l.existing})` : `+${l.generated} (total ${l.total})`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-materi table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs">
            <tr>
              <th className="p-3">Kode</th>
              <th className="p-3">Nama</th>
              <th className="p-3">Jenjang/Kelas</th>
              <th className="p-3">Area</th>
              <th className="p-3 text-center">Tags</th>
              <th className="p-3 text-center">Items</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.kode} className="border-t border-slate-100">
                <td className="p-3 font-mono text-xs">{r.kode}</td>
                <td className="p-3">{r.nama}</td>
                <td className="p-3 text-xs text-slate-500">{r.jenjang} K{r.kelas}</td>
                <td className="p-3 text-xs">{r.area}</td>
                <td className="p-3 text-center text-xs space-x-1">
                  {r.isMaku && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">MAKU</span>}
                  {r.isEntryPoint && <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">entry</span>}
                  {r.dependentsCount >= 3 && <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">d:{r.dependentsCount}</span>}
                </td>
                <td className="p-3 text-center">
                  <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-medium ${
                    r.count === 0 ? "bg-rose-100 text-rose-700" : r.count >= targetCount ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {r.count}
                  </span>
                </td>
                <td className="p-3 space-x-1 whitespace-nowrap">
                  <Link
                    href={`/admin/item-bank/${encodeURIComponent(r.kode)}`}
                    className="text-xs rounded bg-sky-100 hover:bg-sky-200 text-sky-700 px-2 py-1 inline-block"
                  >
                    Detail
                  </Link>
                  <button
                    onClick={async () => {
                      const result = await seedOne(r.kode);
                      setLog((l) => [...l, result]);
                      setRows((rs) => rs.map((rr) => (rr.kode === r.kode ? { ...rr, count: result.total } : rr)));
                    }}
                    disabled={seeding}
                    className="text-xs rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 disabled:opacity-50"
                  >
                    Seed
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wider">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
