"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";

type Config = {
  coverageLemahMaxAcc: number;
  coverageKuatMinAcc: number;
  coverageCukupMinAcc: number;
  coverageKuatThetaGap: number;
  coverageKuatThetaGapAlt: number;
  deepRemediasiMaxAcc: number;
  deepSiapMinAcc: number;
  deepSiapThetaGap: number;
  deepRemediasiThetaGap: number;
};

const FIELD_META: Record<keyof Config, { label: string; desc: string; group: "coverage" | "deep"; unit?: string }> = {
  coverageLemahMaxAcc: { label: "Lemah max accuracy", desc: "Accuracy ≤ ini → 'lemah' (default 0.4 = 40%)", group: "coverage" },
  coverageKuatMinAcc: { label: "Kuat min accuracy", desc: "Accuracy ≥ ini + theta tinggi → 'kuat' (default 0.8)", group: "coverage" },
  coverageCukupMinAcc: { label: "Cukup→Kuat min accuracy", desc: "Accuracy ≥ ini + gap besar → 'kuat', else 'cukup' (default 0.65)", group: "coverage" },
  coverageKuatThetaGap: { label: "Kuat theta gap", desc: "Theta gap ≥ ini → bonus 'kuat' (default 0.5)", group: "coverage" },
  coverageKuatThetaGapAlt: { label: "Kuat theta gap (alt)", desc: "Theta gap toleransi untuk path accuracy tinggi (default 0.3)", group: "coverage" },
  deepRemediasiMaxAcc: { label: "Remediasi max accuracy", desc: "Accuracy ≤ ini → 'remediasi' (default 0.4)", group: "deep" },
  deepSiapMinAcc: { label: "Siap min accuracy", desc: "Accuracy ≥ ini + theta tinggi → 'siap' (default 0.7)", group: "deep" },
  deepSiapThetaGap: { label: "Siap theta gap", desc: "Theta lokal ≥ global + ini → 'siap' eligible (default -0.3, makin tinggi makin ketat)", group: "deep" },
  deepRemediasiThetaGap: { label: "Remediasi theta gap", desc: "Theta lokal < global + ini → fallback 'remediasi' (default -1.0)", group: "deep" },
};

export default function AdminKlasifikasiConfigPage() {
  const { user, loading } = useAuth();
  const [current, setCurrent] = useState<Config | null>(null);
  const [defaults, setDefaults] = useState<Config | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/klasifikasi-config", {
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCurrent(data.current);
      setDefaults(data.default);
      const f: Record<string, string> = {};
      for (const k of Object.keys(data.current)) f[k] = String(data.current[k]);
      setForm(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => { if (user && isAdminEmail(user.email)) load(); /* eslint-disable-next-line */ }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/klasifikasi-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      setCurrent(data.current);
      setSuccess("✓ Disimpan. Berlaku untuk diagnostik berikutnya (cache server 60s).");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function resetDefault() {
    if (!user || !confirm("Reset semua threshold ke nilai default?")) return;
    setSaving(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/klasifikasi-config", {
        method: "DELETE",
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCurrent(data.current);
      const f: Record<string, string> = {};
      for (const k of Object.keys(data.current)) f[k] = String(data.current[k]);
      setForm(f);
      setSuccess("✓ Reset ke default.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user || !isAdminEmail(user.email)) {
    return <main className="mx-auto max-w-3xl p-8 text-center"><p className="text-rose-600">⛔ Akses ditolak</p></main>;
  }
  if (!current || !defaults) return <main className="p-8 text-slate-500">Memuat config...</main>;

  const coverageKeys = (Object.keys(FIELD_META) as (keyof Config)[]).filter((k) => FIELD_META[k].group === "coverage");
  const deepKeys = (Object.keys(FIELD_META) as (keyof Config)[]).filter((k) => FIELD_META[k].group === "deep");

  return (
    <main className="mx-auto max-w-4xl p-6 sm:p-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-brand">← Admin</Link>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-2">
        Threshold Klasifikasi<span className="text-brand">.</span>
      </h1>
      <p className="text-muted mb-6">
        Tune threshold untuk klasifikasi diagnostik (lemah/cukup/kuat & remediasi/review/siap).
        Berlaku untuk diagnostik berikutnya — sesi yang sudah selesai TIDAK ter-reclassify.
      </p>

      {success && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 text-sm">{success}</div>}
      {error && <div className="mb-4 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 p-3 text-sm">{error}</div>}

      {/* Coverage */}
      <section className="mb-6">
        <h2 className="text-lg font-bold mb-3 text-slate-700">📊 Coverage (Tahap 2 — Profil Per Area)</h2>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
          {coverageKeys.map((k) => (
            <FieldRow
              key={k}
              fieldKey={k}
              meta={FIELD_META[k]}
              value={form[k] ?? ""}
              defaultValue={defaults[k]}
              onChange={(v) => setForm((f) => ({ ...f, [k]: v }))}
              disabled={saving}
            />
          ))}
        </div>
      </section>

      {/* Deep */}
      <section className="mb-6">
        <h2 className="text-lg font-bold mb-3 text-slate-700">🎯 Deep (Tahap 3 — Mastery Per Sub-Materi)</h2>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
          {deepKeys.map((k) => (
            <FieldRow
              key={k}
              fieldKey={k}
              meta={FIELD_META[k]}
              value={form[k] ?? ""}
              defaultValue={defaults[k]}
              onChange={(v) => setForm((f) => ({ ...f, [k]: v }))}
              disabled={saving}
            />
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={resetDefault}
          disabled={saving}
          className="rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm disabled:opacity-50"
        >
          Reset ke Default
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand hover:bg-brand-strong text-white font-medium px-6 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      {/* Info */}
      <details className="mt-8 rounded-xl bg-slate-50 border border-slate-200 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-600">📖 Cara kerja klasifikasi</summary>
        <div className="mt-3 text-xs text-slate-600 space-y-2">
          <p>
            <strong>Coverage classifyArea</strong> (per area di Tahap 2):
          </p>
          <pre className="bg-white p-2 rounded text-[11px] overflow-x-auto">{`if (accuracy <= coverageLemahMaxAcc) → "lemah"
if (accuracy >= coverageKuatMinAcc && theta >= global - coverageKuatThetaGapAlt) → "kuat"
if (accuracy >= coverageCukupMinAcc) {
  return (theta - global) >= coverageKuatThetaGap ? "kuat" : "cukup"
}
else → "cukup"`}</pre>
          <p>
            <strong>Deep classifyMastery</strong> (per sub-materi di Tahap 3):
          </p>
          <pre className="bg-white p-2 rounded text-[11px] overflow-x-auto">{`if (accuracy <= deepRemediasiMaxAcc) → "remediasi"
if (accuracy >= deepSiapMinAcc && theta >= global + deepSiapThetaGap) → "siap"
if (theta < global + deepRemediasiThetaGap) → "remediasi"
else → "review"`}</pre>
        </div>
      </details>
    </main>
  );
}

function FieldRow({
  fieldKey, meta, value, defaultValue, onChange, disabled,
}: {
  fieldKey: string;
  meta: { label: string; desc: string };
  value: string;
  defaultValue: number;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const isCustom = String(defaultValue) !== value;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
      <div className="sm:col-span-7">
        <div className="font-medium text-sm flex items-center gap-2">
          {meta.label}
          {isCustom && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">custom</span>}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{meta.desc}</div>
        <code className="text-[10px] text-slate-400">{fieldKey}</code>
      </div>
      <div className="sm:col-span-3">
        <input
          type="number"
          step="0.05"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-mono"
        />
      </div>
      <div className="sm:col-span-2 text-xs text-slate-400 pt-2">
        default: <span className="font-mono">{defaultValue}</span>
      </div>
    </div>
  );
}
