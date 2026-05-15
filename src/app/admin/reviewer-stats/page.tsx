"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";

type Stat = {
  email: string;
  uid: string;
  total: number;
  last7days: number;
  byJenjang: Record<string, number>;
  byEditedFields: { withEdits: number; aiUsed: number };
  lastApprovedAt: number | null;
};

export default function ReviewerStatsPage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<Stat[]>([]);
  const [totalApproved, setTotalApproved] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/reviewer-stats", { headers: { authorization: `Bearer ${idToken}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data.stats ?? []);
      setTotalApproved(data.totalApproved ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => { if (user && isAdminEmail(user.email)) load(); }, [user, load]);

  if (loading) return <main className="p-8 text-slate-400">Memuat...</main>;
  if (!user) return <main className="p-8"><Link href="/login" className="text-brand">Login dulu</Link></main>;
  if (!isAdminEmail(user.email)) return <main className="p-8 text-rose-600">Bukan admin</main>;

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📊 Reviewer Stats</h1>
          <p className="text-sm text-slate-500 mt-1">Total approved: <strong>{totalApproved}</strong></p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/admin/assign-reviewer" className="text-brand hover:underline">👥 Assign</Link>
          <Link href="/admin" className="text-brand hover:underline">← Admin</Link>
          <button onClick={load} disabled={busy} className="text-slate-600 hover:text-slate-900">🔄</button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded text-sm">{error}</div>}

      {stats.length === 0 && !busy && (
        <div className="text-center py-12 text-slate-500 italic">Belum ada data approval.</div>
      )}

      {stats.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Reviewer</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">7 hari</th>
                <th className="text-left p-3">Breakdown Jenjang</th>
                <th className="text-right p-3">w/ edits</th>
                <th className="text-right p-3">AI tweak</th>
                <th className="text-left p-3">Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.uid} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="p-3">
                    <div className="font-semibold">{s.email}</div>
                    <div className="text-xs text-slate-400 font-mono">{s.uid.slice(0, 12)}…</div>
                  </td>
                  <td className="text-right p-3 font-bold text-emerald-700">{s.total}</td>
                  <td className="text-right p-3">{s.last7days}</td>
                  <td className="p-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.entries(s.byJenjang).sort().map(([j, n]) => (
                        <span key={j} className="px-2 py-0.5 bg-slate-100 rounded text-xs">{j}: <strong>{n}</strong></span>
                      ))}
                    </div>
                  </td>
                  <td className="text-right p-3 text-slate-600">{s.byEditedFields.withEdits}</td>
                  <td className="text-right p-3 text-violet-600">{s.byEditedFields.aiUsed}</td>
                  <td className="p-3 text-xs text-slate-500">
                    {s.lastApprovedAt ? new Date(s.lastApprovedAt).toLocaleString("id-ID") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        💡 Kolom <em>w/ edits</em> = jumlah soal yang reviewer edit sebelum approve.{" "}
        <em>AI tweak</em> = jumlah yang pakai AI revisi SVG.
      </p>
    </main>
  );
}
