"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type AuditData = {
  total: number;
  withAnyMeta: number;
  fullyTagged: number;
  coverage: { anyMeta: string; fullyTagged: string };
  fieldCounts: Record<string, number>;
  fieldCoverage: Record<string, string>;
  perJenjang: Record<string, { total: number; withMeta: number }>;
  needEnrichment: { total: number; sampleKodes: [string, number][] };
};

const FIELD_LABELS: Record<string, string> = {
  difficultyLabel: "Difficulty Label (E/M/H)",
  microskill: "Microskill",
  multiStep: "Multi-Step Flag",
  analyticalSteps: "Analytical Steps",
  reasoningQualityRequired: "Reasoning Quality (1-4)",
  requiresManipulation: "Requires Manipulation",
  abstractQuestion: "Abstract Question",
  readingHeavy: "Reading Heavy",
  strongDistractor: "Strong Distractor",
  expectedResponseTimeSec: "Expected Response Time",
  questionCondition: "Question Condition Count",
  intuitiveLeap: "Intuitive Leap",
  subConcept: "Sub-Concept",
  patternType: "Pattern Type",
  transferType: "Transfer Type",
  scorePerOption: "Score per Option",
};

const REQUIRED_FIELDS = new Set(["difficultyLabel", "microskill", "multiStep", "reasoningQualityRequired"]);

export default function AdminItemMetaAuditPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<AuditData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchAudit = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/item-meta-audit", {
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchAudit();
  }, [user, fetchAudit]);

  // Auto-refresh setiap 15 detik kalau toggle aktif (untuk monitor batch enrichment)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAudit, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAudit]);

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user) return <main className="p-8"><Link href="/login" className="text-brand underline">Login dulu</Link></main>;

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      <Link href="/" className="text-sm text-slate-500 hover:text-brand">← Beranda</Link>
      <div className="flex items-start justify-between gap-3 flex-wrap mt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Item Bank Metadata Audit</h1>
          <p className="text-muted text-sm mt-1">
            Coverage metadata pedagogis per item — fondasi untuk Mathematical Maturity scoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4"
            />
            Auto-refresh 15s
          </label>
          <button
            onClick={fetchAudit}
            disabled={refreshing}
            className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-strong disabled:opacity-50"
          >
            {refreshing ? "..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!data && !error && <div className="mt-8 text-slate-500">Memuat audit...</div>}

      {data && (
        <div className="space-y-6 mt-6">
          {/* Top stats */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard title="Total Items" value={data.total.toLocaleString()} sub="di item_bank" color="slate" />
            <StatCard
              title="With Any Meta"
              value={data.withAnyMeta.toLocaleString()}
              sub={data.coverage.anyMeta}
              color="sky"
            />
            <StatCard
              title="Fully Tagged"
              value={data.fullyTagged.toLocaleString()}
              sub={data.coverage.fullyTagged}
              color={
                parseFloat(data.coverage.fullyTagged) >= 80
                  ? "emerald"
                  : parseFloat(data.coverage.fullyTagged) >= 50
                  ? "amber"
                  : "rose"
              }
            />
            <StatCard
              title="Need Enrichment"
              value={data.needEnrichment.total.toLocaleString()}
              sub={`${((data.needEnrichment.total / data.total) * 100).toFixed(1)}% sub-materi`}
              color="rose"
            />
          </section>

          {/* Field coverage */}
          <section>
            <h2 className="text-lg font-bold mb-3">Per-Field Coverage</h2>
            <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left p-3">Field</th>
                    <th className="text-right p-3 w-32">Count</th>
                    <th className="text-left p-3 w-72">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.fieldCounts)
                    .sort((a, b) => {
                      // Required fields dulu, lalu by coverage desc
                      const aReq = REQUIRED_FIELDS.has(a[0]) ? 0 : 1;
                      const bReq = REQUIRED_FIELDS.has(b[0]) ? 0 : 1;
                      if (aReq !== bReq) return aReq - bReq;
                      return b[1] - a[1];
                    })
                    .map(([field, count]) => {
                      const pct = data.total > 0 ? (count / data.total) * 100 : 0;
                      const isRequired = REQUIRED_FIELDS.has(field);
                      return (
                        <tr key={field} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="p-3">
                            <span className="font-mono text-xs text-slate-500 mr-2">{field}</span>
                            <span className="text-xs text-slate-700">{FIELD_LABELS[field] ?? field}</span>
                            {isRequired && (
                              <span className="ml-2 text-[9px] uppercase font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                                required
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono text-xs">{count.toLocaleString()}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold w-12 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Per-jenjang */}
          <section>
            <h2 className="text-lg font-bold mb-3">Per-Jenjang Coverage (Required Fields)</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {Object.entries(data.perJenjang)
                .filter(([, v]) => v.total > 0)
                .map(([jenjang, v]) => {
                  const pct = (v.withMeta / v.total) * 100;
                  return (
                    <div key={jenjang} className="rounded-xl bg-white border border-slate-200 p-4">
                      <div className="text-xs uppercase tracking-wider text-slate-500">{jenjang}</div>
                      <div className="text-2xl font-bold mt-1">
                        {v.withMeta} <span className="text-sm text-slate-400">/ {v.total}</span>
                      </div>
                      <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{pct.toFixed(1)}% fully tagged</div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* Sample need enrichment */}
          {data.needEnrichment.sampleKodes.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-3">
                Top 20 Sub-Materi Need Enrichment
                <span className="text-sm font-normal text-slate-500 ml-2">
                  (item count incomplete metadata)
                </span>
              </h2>
              <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="text-left p-3">Sub-Materi Kode</th>
                      <th className="text-right p-3 w-32">Items Missing Meta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.needEnrichment.sampleKodes.map(([kode, count]) => (
                      <tr key={kode} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-3">
                          <Link
                            href={`/admin/item-bank/${encodeURIComponent(kode)}`}
                            className="font-mono text-xs text-brand hover:underline"
                          >
                            {kode}
                          </Link>
                        </td>
                        <td className="p-3 text-right font-mono text-xs">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Help section */}
          <section className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
            <h3 className="font-semibold mb-2">💡 Cara enrich metadata items</h3>
            <p className="mb-2">Run dari local dev terminal:</p>
            <pre className="bg-blue-100 p-2 rounded text-xs overflow-x-auto">
{`# Test 5 items dulu (dry-run, no Firestore write)
node scripts/enrich-item-metadata.mjs --dry-run --limit 5

# Batch process all items missing required fields (~$4 untuk 700+ items)
node scripts/enrich-item-metadata.mjs

# Filter by kode prefix
node scripts/enrich-item-metadata.mjs --kode SD.6`}
            </pre>
            <p className="mt-3 text-xs">
              Auto-refresh toggle di atas untuk monitor progress real-time saat batch jalan.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}

function StatCard({
  title,
  value,
  sub,
  color,
}: {
  title: string;
  value: string;
  sub?: string;
  color: "slate" | "sky" | "emerald" | "amber" | "rose";
}) {
  const colorClasses = {
    slate: "bg-slate-100 text-slate-700",
    sky: "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="text-xs uppercase tracking-wider opacity-80">{title}</div>
      <div className="text-2xl sm:text-3xl font-extrabold mt-1">{value}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  );
}
