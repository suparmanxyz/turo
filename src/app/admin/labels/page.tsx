"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import petaJson from "@/data/peta-prasyarat.json";
import auditCache from "@/data/audit-cache.json";
import type { PetaPrasyaratResmi, SubMateriResmi, LabelKurikulum } from "@/types";

type AuditEntry = {
  verdict?: "MATCH_FASE_SAMA" | "MATCH_FASE_LAIN" | "NO_MATCH";
  matched_fase?: string | null;
  matched_elemen?: string | null;
  kutipan_cp?: string | null;
  reasoning?: string;
  confidence?: "high" | "medium" | "low";
  _expected_fase?: string;
};

const PETA = petaJson as PetaPrasyaratResmi;
const AUDIT: Record<string, AuditEntry> = auditCache as Record<string, AuditEntry>;

const LABELS: LabelKurikulum[] = ["CP-2025", "Buku-2025", "Pengayaan", "UTBK"];

const LABEL_META: Record<LabelKurikulum, { emoji: string; text: string; classes: string; desc: string }> = {
  "CP-2025": { emoji: "📘", text: "Inti", classes: "bg-emerald-100 text-emerald-800 border-emerald-300", desc: "Sesuai standar Kemdikbud (CP 046)" },
  "Buku-2025": { emoji: "🌉", text: "Pendukung", classes: "bg-sky-100 text-sky-800 border-sky-300", desc: "Diajarkan banyak sekolah, walau bukan CP 046 placement" },
  "Pengayaan": { emoji: "🚀", text: "Tantangan", classes: "bg-violet-100 text-violet-800 border-violet-300", desc: "Tambahan untuk olimpiade / extra" },
  "UTBK": { emoji: "🎯", text: "UTBK", classes: "bg-amber-100 text-amber-800 border-amber-300", desc: "Topik untuk persiapan SNBT/UTBK" },
};

const VERDICT_BADGE: Record<string, { icon: string; classes: string; label: string }> = {
  MATCH_FASE_SAMA: { icon: "✓", classes: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "AI: Match Fase Sama" },
  MATCH_FASE_LAIN: { icon: "⚠", classes: "bg-amber-50 text-amber-700 border-amber-200", label: "AI: Fase Lain" },
  NO_MATCH: { icon: "🚨", classes: "bg-rose-50 text-rose-700 border-rose-200", label: "AI: Tidak di CP 046" },
};

export default function AdminLabelsPage() {
  const { user, loading } = useAuth();
  const [filterJenjang, setFilterJenjang] = useState<"" | "SD" | "SMP" | "SMA">("");
  const [filterKelas, setFilterKelas] = useState<string>("");
  const [filterLabel, setFilterLabel] = useState<"" | LabelKurikulum>("");
  const [filterArea, setFilterArea] = useState<string>("");
  const [filterVerdict, setFilterVerdict] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [savingKode, setSavingKode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  // Local override map for instant UI feedback (sebelum reload page)
  const [localLabel, setLocalLabel] = useState<Record<string, LabelKurikulum>>({});

  const allKelas = useMemo(() => {
    const s = new Set<number>();
    for (const sub of PETA.submateri) s.add(sub.kelas);
    return [...s].sort((a, b) => a - b);
  }, []);

  const allArea = useMemo(() => {
    const s = new Set<string>();
    for (const sub of PETA.submateri) s.add(sub.area);
    return [...s].sort();
  }, []);

  const filtered = useMemo(() => {
    return PETA.submateri.filter((s) => {
      if (filterJenjang && s.jenjang !== filterJenjang) return false;
      if (filterKelas && String(s.kelas) !== filterKelas) return false;
      const currentLabel = localLabel[s.kode] ?? s.label;
      if (filterLabel && currentLabel !== filterLabel) return false;
      if (filterArea && s.area !== filterArea) return false;
      if (filterVerdict) {
        const a = AUDIT[s.kode];
        if (filterVerdict === "none") {
          if (a?.verdict) return false;
        } else if (a?.verdict !== filterVerdict) {
          return false;
        }
      }
      if (search) {
        const q = search.toLowerCase();
        if (!s.kode.toLowerCase().includes(q) && !s.nama.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [filterJenjang, filterKelas, filterLabel, filterArea, filterVerdict, search, localLabel]);

  // Stats
  const stats = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of PETA.submateri) {
      const lbl = localLabel[s.kode] ?? s.label;
      c[lbl] = (c[lbl] ?? 0) + 1;
    }
    return c;
  }, [localLabel]);

  async function updateLabel(kode: string, newLabel: LabelKurikulum) {
    if (!user) return;
    setSavingKode(kode);
    setError(null);
    setOkMsg(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/labels/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ kode, label: newLabel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal update");
      setLocalLabel((prev) => ({ ...prev, [kode]: newLabel }));
      setOkMsg(`✓ ${kode} → ${newLabel}`);
      setTimeout(() => setOkMsg(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingKode(null);
    }
  }

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user) return <main className="p-8"><Link href="/login" className="text-brand underline">Login dulu</Link></main>;

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-4">
        <Link href="/" className="text-sm text-slate-500 hover:text-brand">← Beranda</Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
          Admin: Adjust Label Sub-Materi
        </h1>
        <p className="text-muted text-sm mt-1">
          Edit label kurikulum per sub. Perubahan langsung tersimpan ke <code>peta-prasyarat.json</code> (dev-only — production read-only).
        </p>
      </div>

      {/* Stats current */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {LABELS.map((lbl) => {
          const m = LABEL_META[lbl];
          return (
            <div key={lbl} className={`rounded-xl border p-3 ${m.classes}`}>
              <div className="text-xs uppercase tracking-wider opacity-80">{m.emoji} {m.text}</div>
              <div className="text-2xl font-bold mt-1">{stats[lbl] ?? 0}</div>
              <div className="text-[10px] opacity-70 mt-0.5 leading-tight">{m.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 mb-4 sticky top-2 z-10 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-sm">
          <select value={filterJenjang} onChange={(e) => setFilterJenjang(e.target.value as "" | "SD" | "SMP" | "SMA")} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">Semua jenjang</option>
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
          </select>
          <select value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">Semua kelas</option>
            {allKelas.map((k) => <option key={k} value={String(k)}>Kelas {k}</option>)}
          </select>
          <select value={filterLabel} onChange={(e) => setFilterLabel(e.target.value as "" | LabelKurikulum)} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">Semua label</option>
            {LABELS.map((l) => <option key={l} value={l}>{LABEL_META[l].emoji} {l}</option>)}
          </select>
          <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">Semua area</option>
            {allArea.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterVerdict} onChange={(e) => setFilterVerdict(e.target.value)} className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">Semua AI verdict</option>
            <option value="MATCH_FASE_SAMA">✓ Same Fase</option>
            <option value="MATCH_FASE_LAIN">⚠ Fase Lain</option>
            <option value="NO_MATCH">🚨 No Match</option>
            <option value="none">- Belum diaudit</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode/nama..."
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </div>
        <div className="text-xs text-slate-500 mt-2 flex justify-between">
          <span>Tampil: <strong>{filtered.length}</strong> dari {PETA.submateri.length} sub</span>
          {okMsg && <span className="text-emerald-700 font-medium">{okMsg}</span>}
          {error && <span className="text-rose-700 font-medium">{error}</span>}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.slice(0, 200).map((s) => {
          const audit = AUDIT[s.kode];
          const currentLabel = (localLabel[s.kode] ?? s.label) as LabelKurikulum;
          const verdictBadge = audit?.verdict ? VERDICT_BADGE[audit.verdict] : null;
          return (
            <div key={s.kode} className="rounded-xl bg-white border border-slate-200 p-3 hover:border-slate-300 transition">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <code className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{s.kode}</code>
                    <span className="text-[10px] text-slate-500">{s.area}</span>
                    {s.is_maku && <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">⭐ MAKU</span>}
                    {verdictBadge && (
                      <span className={`text-[10px] border px-1.5 py-0.5 rounded ${verdictBadge.classes}`}>
                        {verdictBadge.icon} {audit.confidence?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-sm">{s.nama}</div>
                  {audit && (
                    <details className="mt-1 text-xs text-slate-600">
                      <summary className="cursor-pointer hover:text-brand">AI reasoning</summary>
                      <div className="mt-1 p-2 bg-slate-50 rounded border border-slate-200 space-y-1">
                        <div><strong>Placement Turo:</strong> {audit._expected_fase ?? "-"}</div>
                        {audit.matched_fase && <div><strong>CP taruh di:</strong> {audit.matched_fase} ({audit.matched_elemen})</div>}
                        {audit.kutipan_cp && <div className="italic text-emerald-800 border-l-2 border-emerald-300 pl-2">"{audit.kutipan_cp}"</div>}
                        {audit.reasoning && <div className="text-slate-700">{audit.reasoning}</div>}
                      </div>
                    </details>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {LABELS.map((lbl) => {
                    const m = LABEL_META[lbl];
                    const active = currentLabel === lbl;
                    return (
                      <button
                        key={lbl}
                        onClick={() => updateLabel(s.kode, lbl)}
                        disabled={savingKode === s.kode || active}
                        className={`text-xs px-2 py-1 rounded border transition ${
                          active ? `${m.classes} font-bold ring-1 ring-offset-1 ring-current` : "bg-white border-slate-300 hover:bg-slate-50 text-slate-600"
                        } ${savingKode === s.kode ? "opacity-50 cursor-wait" : ""}`}
                        title={m.desc}
                      >
                        {m.emoji} {m.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length > 200 && (
          <div className="text-center text-xs text-slate-500 py-2">
            Tampilan dibatasi 200 sub pertama. Pakai filter untuk narrow down.
          </div>
        )}
      </div>
    </main>
  );
}
