"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import type { MaturitySnapshot } from "@/lib/firestore-schema";

const DIMENSION_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  abstract_reasoning: { label: "Penalaran Abstrak", emoji: "🧠", color: "#8b5cf6" },
  problem_solving: { label: "Pemecahan Masalah", emoji: "🎯", color: "#3b82f6" },
  communication: { label: "Komunikasi Matematis", emoji: "💬", color: "#10b981" },
  persistence: { label: "Ketekunan & Fokus", emoji: "💪", color: "#f59e0b" },
  confidence: { label: "Kepercayaan Diri", emoji: "🎓", color: "#ec4899" },
};

const LEVEL_COLOR: Record<string, string> = {
  MASTERY: "bg-emerald-500 text-white",
  PROFICIENT: "bg-emerald-100 text-emerald-700",
  DEVELOPING: "bg-sky-100 text-sky-700",
  EMERGING: "bg-amber-100 text-amber-700",
  BEGINNING: "bg-rose-100 text-rose-700",
};

export default function MaturityProfilePage() {
  const { user, loading } = useAuth();
  const [history, setHistory] = useState<MaturitySnapshot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/user/maturity-history", {
          headers: { authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setHistory(data.history ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [user]);

  // Compute trend insights
  const insights = useMemo(() => {
    if (!history || history.length < 2) return null;
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const overallChange = last.overall - prev.overall;
    const dimChanges: { dim: string; change: number; current: number }[] = [];
    for (const dim of Object.keys(last.dimensionsScores)) {
      const change = last.dimensionsScores[dim] - (prev.dimensionsScores[dim] ?? 0);
      dimChanges.push({ dim, change, current: last.dimensionsScores[dim] });
    }
    return {
      overallChange,
      dimChanges,
      sessionsCount: sorted.length,
      first: sorted[0],
      last,
    };
  }, [history]);

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user) return <main className="p-8"><Link href="/login" className="text-brand underline">Login dulu</Link></main>;

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <Link href="/" className="text-sm text-slate-500 hover:text-brand">← Beranda</Link>
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 mb-1">
        🧠 Trend Kematangan Matematis
      </h1>
      <p className="text-muted text-sm mb-6">
        Riwayat profil Mathematical Maturity dari sesi diagnostik kamu.
      </p>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 mb-4">
          {error}
        </div>
      )}

      {!history && !error && <div className="text-slate-500">Memuat history...</div>}

      {history && history.length === 0 && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-6 text-center">
          <div className="text-4xl mb-2">📊</div>
          <p className="font-semibold text-blue-900 mb-1">Belum ada history Maturity</p>
          <p className="text-sm text-blue-700 mb-3">Selesaikan diagnostik untuk mulai tracking.</p>
          <Link href="/onboarding" className="inline-block px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold">
            Mulai Diagnostik
          </Link>
        </div>
      )}

      {history && history.length > 0 && (
        <div className="space-y-6">
          {/* Insights summary */}
          {insights && (
            <section className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border-2 border-violet-200 p-5">
              <h2 className="font-bold text-lg mb-3">📈 Perubahan dari Sesi Sebelumnya</h2>
              <div className="flex items-baseline gap-3 mb-3">
                <div className="text-4xl font-extrabold text-violet-900">{insights.last.overall}</div>
                <div>
                  <div className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold ${LEVEL_COLOR[insights.last.level]}`}>
                    {insights.last.level}
                  </div>
                  {insights.overallChange !== 0 && (
                    <div className={`text-sm font-semibold mt-1 ${insights.overallChange > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {insights.overallChange > 0 ? "↗" : "↘"} {Math.abs(insights.overallChange)} poin
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-600 mb-3">
                Total {insights.sessionsCount} sesi · sejak {new Date(insights.first.timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                {insights.dimChanges.map((d) => {
                  const meta = DIMENSION_LABELS[d.dim];
                  if (!meta) return null;
                  return (
                    <div key={d.dim} className="rounded-lg bg-white p-2.5 text-center">
                      <div className="text-lg">{meta.emoji}</div>
                      <div className="text-xs font-medium text-slate-600 mt-0.5 truncate">{meta.label}</div>
                      <div className="text-xl font-bold mt-1" style={{ color: meta.color }}>{d.current}</div>
                      {d.change !== 0 && (
                        <div className={`text-[10px] font-semibold ${d.change > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {d.change > 0 ? "+" : ""}{d.change}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Per-dimension trend chart */}
          <section>
            <h2 className="font-bold text-lg mb-3">Trend Per Dimensi</h2>
            <TrendChart history={history} />
          </section>

          {/* History table */}
          <section>
            <h2 className="font-bold text-lg mb-3">Riwayat Sesi</h2>
            <div className="rounded-xl bg-white border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left p-3">Tanggal</th>
                    <th className="text-right p-3">Overall</th>
                    <th className="text-left p-3">Level</th>
                    {Object.entries(DIMENSION_LABELS).map(([k, m]) => (
                      <th key={k} className="text-right p-2 text-[10px]" title={m.label}>{m.emoji}</th>
                    ))}
                    <th className="text-right p-3">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((s, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-xs">
                        {new Date(s.timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                        <div className="text-[10px] text-slate-400">{new Date(s.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
                      </td>
                      <td className="p-3 text-right font-bold">{s.overall}</td>
                      <td className="p-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${LEVEL_COLOR[s.level]}`}>
                          {s.level}
                        </span>
                      </td>
                      {Object.keys(DIMENSION_LABELS).map((dim) => (
                        <td key={dim} className="p-2 text-right text-xs font-mono">
                          {s.dimensionsScores[dim] ?? "-"}
                        </td>
                      ))}
                      <td className="p-3 text-right text-xs text-slate-500">{s.totalItems}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

// ============================================================
// Simple SVG line chart untuk trend per dimensi
// ============================================================

function TrendChart({ history }: { history: MaturitySnapshot[] }) {
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  if (sorted.length === 0) return null;
  const dimensions = Object.keys(DIMENSION_LABELS);

  const W = 600;
  const H = 250;
  const PAD = { top: 20, right: 20, bottom: 40, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  // X scale: index based
  const xStep = sorted.length > 1 ? innerW / (sorted.length - 1) : 0;
  // Y scale: 0-100
  const yScale = (v: number) => PAD.top + innerH - (v / 100) * innerH;

  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minWidth: 500 }}>
        {/* Y axis grid + labels */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yScale(v)} y2={yScale(v)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="2 2" />
            <text x={PAD.left - 5} y={yScale(v) + 3} textAnchor="end" fontSize={10} fill="#64748b">{v}</text>
          </g>
        ))}

        {/* X axis labels */}
        {sorted.map((s, i) => (
          <text key={i} x={PAD.left + i * xStep} y={H - PAD.bottom + 15} textAnchor="middle" fontSize={9} fill="#64748b">
            {new Date(s.timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
          </text>
        ))}

        {/* Lines per dimension */}
        {dimensions.map((dim) => {
          const meta = DIMENSION_LABELS[dim];
          const points = sorted.map((s, i) => `${PAD.left + i * xStep},${yScale(s.dimensionsScores[dim] ?? 0)}`).join(" ");
          return (
            <g key={dim}>
              <polyline points={points} fill="none" stroke={meta.color} strokeWidth={2} strokeLinecap="round" />
              {sorted.map((s, i) => (
                <circle
                  key={i}
                  cx={PAD.left + i * xStep}
                  cy={yScale(s.dimensionsScores[dim] ?? 0)}
                  r={3}
                  fill={meta.color}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-xs">
        {dimensions.map((dim) => {
          const meta = DIMENSION_LABELS[dim];
          return (
            <div key={dim} className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded" style={{ backgroundColor: meta.color }} />
              <span className="text-slate-600">{meta.emoji} {meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
