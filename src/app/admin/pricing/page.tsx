"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import type { PricingConfig, PlanKey, PlanConfig } from "@/lib/pricing";

const PLAN_KEYS: PlanKey[] = ["solo_monthly", "solo_yearly", "family_monthly", "family_yearly", "utbk_pack"];

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default function AdminPricingPage() {
  const { user, loading } = useAuth();
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [draft, setDraft] = useState<PricingConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/admin/pricing/get", {
          headers: { authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setConfig(data);
        setDraft(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [user]);

  async function save() {
    if (!user || !draft || !config) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/pricing/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          patch: {
            plans: draft.plans,
            freeTier: draft.freeTier,
            trial: draft.trial,
            notes: draft.notes,
          },
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal save");
      setConfig(data);
      setDraft(data);
      setNote("");
      setOkMsg("✓ Pricing berhasil disimpan");
      setTimeout(() => setOkMsg(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (config) setDraft(structuredClone(config));
    setNote("");
    setError(null);
  }

  function updatePlan<K extends keyof PlanConfig>(key: PlanKey, field: K, value: PlanConfig[K]) {
    if (!draft) return;
    setDraft({
      ...draft,
      plans: { ...draft.plans, [key]: { ...draft.plans[key], [field]: value } },
    });
  }

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user) return <main className="p-8"><Link href="/login" className="text-brand underline">Login dulu</Link></main>;
  if (!draft) return <main className="p-8 text-slate-500">Memuat pricing config...</main>;

  const isDirty = JSON.stringify(draft) !== JSON.stringify(config);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-4">
        <Link href="/" className="text-sm text-slate-500 hover:text-brand">← Beranda</Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
          Admin: Pengaturan Harga & Free Tier
        </h1>
        <p className="text-muted text-sm mt-1">
          Edit harga plan, free tier limits, trial config. Disimpan di Firestore — bisa diubah kapan saja tanpa redeploy.
        </p>
      </div>

      {/* Plans */}
      <section className="rounded-2xl bg-white border border-slate-200 p-5 mb-4">
        <h2 className="text-lg font-bold mb-3">📦 Plans (Subscription + Pack)</h2>
        <div className="space-y-3">
          {PLAN_KEYS.map((key) => {
            const p = draft.plans[key];
            const pricePerMonth = p.periodDays > 30 ? Math.round((p.price / p.periodDays) * 30) : p.price;
            return (
              <div key={key} className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <code className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-mono">{key}</code>
                    <input
                      type="text"
                      value={p.label}
                      onChange={(e) => updatePlan(key, "label", e.target.value)}
                      className="ml-2 font-semibold border-b border-transparent focus:border-brand bg-transparent text-base"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) => updatePlan(key, "enabled", e.target.checked)}
                    />
                    {p.enabled ? "Aktif (tampil paywall)" : "Disabled"}
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Harga (Rp)</label>
                    <input
                      type="number"
                      value={p.price}
                      onChange={(e) => updatePlan(key, "price", parseInt(e.target.value, 10) || 0)}
                      className="w-full rounded border border-slate-300 px-2 py-1.5"
                    />
                    <div className="text-[10px] text-slate-500 mt-0.5">{formatRupiah(p.price)}</div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Periode (hari)</label>
                    <input
                      type="number"
                      value={p.periodDays}
                      onChange={(e) => updatePlan(key, "periodDays", parseInt(e.target.value, 10) || 30)}
                      className="w-full rounded border border-slate-300 px-2 py-1.5"
                    />
                    <div className="text-[10px] text-slate-500 mt-0.5">~{formatRupiah(pricePerMonth)}/bulan</div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Max akun (anak)</label>
                    <input
                      type="number"
                      min={1}
                      value={p.maxUsers}
                      onChange={(e) => updatePlan(key, "maxUsers", parseInt(e.target.value, 10) || 1)}
                      className="w-full rounded border border-slate-300 px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Tipe</label>
                    <select
                      value={p.recurring ? "recurring" : "onetime"}
                      onChange={(e) => updatePlan(key, "recurring", e.target.value === "recurring")}
                      className="w-full rounded border border-slate-300 px-2 py-1.5"
                    >
                      <option value="recurring">Subscription</option>
                      <option value="onetime">One-time</option>
                    </select>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-slate-600 mb-1">Deskripsi</label>
                  <input
                    type="text"
                    value={p.description ?? ""}
                    onChange={(e) => updatePlan(key, "description", e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Free tier */}
      <section className="rounded-2xl bg-white border border-slate-200 p-5 mb-4">
        <h2 className="text-lg font-bold mb-3">🆓 Free Tier Limits</h2>
        <p className="text-xs text-slate-500 mb-3">Batasan untuk user yang belum subscribe. Set 0 untuk disable fitur.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Sub-materi/hari</label>
            <input
              type="number"
              min={0}
              value={draft.freeTier.subMateriPerDay}
              onChange={(e) => setDraft({ ...draft, freeTier: { ...draft.freeTier, subMateriPerDay: parseInt(e.target.value, 10) || 0 } })}
              className="w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Soal latihan/hari</label>
            <input
              type="number"
              min={0}
              value={draft.freeTier.soalPerDay}
              onChange={(e) => setDraft({ ...draft, freeTier: { ...draft.freeTier, soalPerDay: parseInt(e.target.value, 10) || 0 } })}
              className="w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">AI tutor query/hari</label>
            <input
              type="number"
              min={0}
              value={draft.freeTier.aiTutorPerDay}
              onChange={(e) => setDraft({ ...draft, freeTier: { ...draft.freeTier, aiTutorPerDay: parseInt(e.target.value, 10) || 0 } })}
              className="w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-3">
            <input
              type="checkbox"
              checked={draft.freeTier.drillingEnabled}
              onChange={(e) => setDraft({ ...draft, freeTier: { ...draft.freeTier, drillingEnabled: e.target.checked } })}
            />
            Phase 2 Drilling adaptif tersedia di free tier
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-3">
            <input
              type="checkbox"
              checked={draft.freeTier.generateSoalEnabled}
              onChange={(e) => setDraft({ ...draft, freeTier: { ...draft.freeTier, generateSoalEnabled: e.target.checked } })}
            />
            Generate soal AI tersedia di free tier
          </label>
        </div>
      </section>

      {/* Trial */}
      <section className="rounded-2xl bg-white border border-slate-200 p-5 mb-4">
        <h2 className="text-lg font-bold mb-3">🎁 Trial Config</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Durasi trial (hari)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={draft.trial.durationDays}
              onChange={(e) => setDraft({ ...draft, trial: { ...draft.trial, durationDays: parseInt(e.target.value, 10) || 7 } })}
              className="w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Plan saat trial</label>
            <select
              value={draft.trial.trialPlan}
              onChange={(e) => setDraft({ ...draft, trial: { ...draft.trial, trialPlan: e.target.value as PlanKey } })}
              className="w-full rounded border border-slate-300 px-2 py-1.5"
            >
              {PLAN_KEYS.map((k) => <option key={k} value={k}>{draft.plans[k].label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.trial.requireCreditCard}
              onChange={(e) => setDraft({ ...draft, trial: { ...draft.trial, requireCreditCard: e.target.checked } })}
            />
            Butuh credit card saat start trial (higher conversion, friction tinggi)
          </label>
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-2xl bg-white border border-slate-200 p-5 mb-4">
        <h2 className="text-lg font-bold mb-3">📝 Notes (catatan internal)</h2>
        <textarea
          value={draft.notes ?? ""}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="Catatan untuk diri sendiri (e.g. 'Naik harga 15 Mei karena UTBK season')..."
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
        />
      </section>

      {/* Save bar */}
      <div className="sticky bottom-2 bg-white border border-slate-200 rounded-xl p-3 shadow-lg flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan perubahan ini (opsional, masuk history)..."
          className="flex-1 min-w-[200px] rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={reset}
          disabled={!isDirty || saving}
          className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-sm disabled:opacity-50"
        >
          Reset
        </button>
        <button
          onClick={save}
          disabled={!isDirty || saving}
          className="px-5 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-brand-strong text-sm disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
        {okMsg && <span className="text-emerald-700 font-medium text-sm">{okMsg}</span>}
        {error && <span className="text-rose-700 font-medium text-sm">{error}</span>}
        {isDirty && !okMsg && <span className="text-amber-700 text-xs">Perubahan belum disimpan</span>}
      </div>

      {/* History */}
      {config?.history && config.history.length > 0 && (
        <section className="rounded-2xl bg-white border border-slate-200 p-5 mt-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-lg font-bold flex items-center gap-2 hover:text-brand"
          >
            🕐 History Perubahan ({config.history.length}) {showHistory ? "▲" : "▼"}
          </button>
          {showHistory && (
            <div className="mt-3 space-y-2 text-xs">
              {config.history.map((h, i) => (
                <details key={i} className="rounded border border-slate-200 p-2">
                  <summary className="cursor-pointer">
                    <strong>{new Date(h.updatedAt).toLocaleString("id-ID")}</strong> — by {h.updatedBy}
                    {h.note && <span className="text-slate-600"> · {h.note}</span>}
                  </summary>
                  <pre className="mt-2 bg-slate-50 p-2 rounded overflow-x-auto text-[10px]">
                    {JSON.stringify(h.snapshot, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Last updated meta */}
      {config && (
        <div className="text-xs text-slate-500 mt-4 text-center">
          Last updated: {new Date(config.updatedAt).toLocaleString("id-ID")} by <code>{config.updatedBy}</code>
        </div>
      )}
    </main>
  );
}
