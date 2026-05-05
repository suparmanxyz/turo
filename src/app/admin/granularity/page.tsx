"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import petaJson from "@/data/peta-prasyarat.json";
import type { PetaPrasyaratResmi } from "@/types";
import { getSmartGranularity, type GranularityClassification } from "@/lib/smart-granularity";

const PETA = petaJson as PetaPrasyaratResmi;

const CLASS_LABEL: Record<GranularityClassification, { emoji: string; text: string; classes: string }> = {
  SUB_DRILLING_MANDATORY: { emoji: "⭐", text: "Mandatory Drill", classes: "bg-rose-100 text-rose-800 border-rose-300" },
  SUB_DRILLING_CONDITIONAL: { emoji: "🔹", text: "Conditional", classes: "bg-amber-100 text-amber-800 border-amber-300" },
  MATERIAL_LEVEL_SUFFICIENT: { emoji: "🔸", text: "Material Level", classes: "bg-slate-100 text-slate-700 border-slate-300" },
};

export default function AdminGranularityPage() {
  const [filterJenjang, setFilterJenjang] = useState<"" | "SD" | "SMP" | "SMA">("");
  const [filterClass, setFilterClass] = useState<"" | GranularityClassification>("");
  const [search, setSearch] = useState("");

  const allWithGranularity = useMemo(() => {
    return PETA.submateri.map((s) => ({
      sub: s,
      granularity: getSmartGranularity(s),
    }));
  }, []);

  const filtered = useMemo(() => {
    return allWithGranularity.filter(({ sub, granularity }) => {
      if (filterJenjang && sub.jenjang !== filterJenjang) return false;
      if (filterClass && granularity.classification !== filterClass) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!sub.kode.toLowerCase().includes(q) && !sub.nama.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      // Sort by composite score descending
      const aComp = a.granularity.gatewayScore * 0.6 + a.granularity.complexityScore * 0.4;
      const bComp = b.granularity.gatewayScore * 0.6 + b.granularity.complexityScore * 0.4;
      return bComp - aComp;
    });
  }, [allWithGranularity, filterJenjang, filterClass, search]);

  const stats = useMemo(() => {
    const counts: Record<GranularityClassification, number> = {
      SUB_DRILLING_MANDATORY: 0,
      SUB_DRILLING_CONDITIONAL: 0,
      MATERIAL_LEVEL_SUFFICIENT: 0,
    };
    for (const { granularity } of allWithGranularity) {
      counts[granularity.classification]++;
    }
    return counts;
  }, [allWithGranularity]);

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <Link href="/" className="text-sm text-slate-500 hover:text-brand">← Beranda</Link>
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
        Smart Granularity — Auto-Derived
      </h1>
      <p className="text-muted text-sm mt-1">
        Per sub-materi: Gateway Score (importance untuk materi lain) + Complexity Score (kompleksitas internal) → klasifikasi drilling need.
        Auto-derived dari <code>peta-prasyarat.json</code>, no manual setting needed.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {(["SUB_DRILLING_MANDATORY", "SUB_DRILLING_CONDITIONAL", "MATERIAL_LEVEL_SUFFICIENT"] as GranularityClassification[]).map((c) => {
          const meta = CLASS_LABEL[c];
          const count = stats[c];
          return (
            <div key={c} className={`rounded-xl border p-3 ${meta.classes}`}>
              <div className="text-xs uppercase tracking-wider opacity-80">{meta.emoji} {meta.text}</div>
              <div className="text-2xl font-bold mt-1">{count}</div>
              <div className="text-[10px] opacity-70 mt-0.5">
                {((count / PETA.submateri.length) * 100).toFixed(1)}% dari {PETA.submateri.length}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 my-4 sticky top-2 z-10 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <select value={filterJenjang} onChange={(e) => setFilterJenjang(e.target.value as "" | "SD" | "SMP" | "SMA")} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">Semua jenjang</option>
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
          </select>
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value as "" | GranularityClassification)} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">Semua classification</option>
            <option value="SUB_DRILLING_MANDATORY">⭐ Mandatory</option>
            <option value="SUB_DRILLING_CONDITIONAL">🔹 Conditional</option>
            <option value="MATERIAL_LEVEL_SUFFICIENT">🔸 Material Level</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode/nama..."
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </div>
        <div className="text-xs text-slate-500 mt-2">
          Tampil: <strong>{filtered.length}</strong> dari {PETA.submateri.length} sub
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.slice(0, 200).map(({ sub, granularity }) => {
          const meta = CLASS_LABEL[granularity.classification];
          const composite = Math.round(granularity.gatewayScore * 0.6 + granularity.complexityScore * 0.4);
          return (
            <div key={sub.kode} className="rounded-xl bg-white border border-slate-200 p-3 hover:border-slate-300 transition">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <code className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{sub.kode}</code>
                    <span className={`text-[10px] border px-2 py-0.5 rounded-full font-semibold uppercase ${meta.classes}`}>
                      {meta.emoji} {meta.text}
                    </span>
                    {sub.is_maku && <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">⭐ MAKU</span>}
                  </div>
                  <div className="font-medium text-sm">{sub.nama}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    <span className="mr-3">Gateway: <strong>{granularity.gatewayScore}</strong></span>
                    <span className="mr-3">Complexity: <strong>{granularity.complexityScore}</strong></span>
                    <span className="mr-3">Composite: <strong>{composite}</strong></span>
                    <span>Recommended items: <strong>{granularity.recommendedItemCount}</strong></span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 italic">{granularity.reason}</div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length > 200 && (
          <div className="text-center text-xs text-slate-500 py-2">
            Tampilan dibatasi 200. Pakai filter untuk narrow down.
          </div>
        )}
      </div>
    </main>
  );
}
