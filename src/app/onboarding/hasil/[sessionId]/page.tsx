"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import type { DiagnosticSessionDoc } from "@/lib/firestore-schema";
import { JALUR_LABEL } from "@/lib/diagnostic-routing";

const AREA_LABEL: Record<string, string> = {
  bilangan: "Bilangan",
  aljabar: "Aljabar",
  geometri: "Geometri",
  statistik: "Statistik & Peluang",
  kalkulus: "Kalkulus",
  trigonometri: "Trigonometri",
  logika: "Logika",
  lain: "Lain-lain",
};

const STATUS_COLOR: Record<string, string> = {
  kuat: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cukup: "bg-amber-100 text-amber-700 border-amber-200",
  lemah: "bg-rose-100 text-rose-700 border-rose-200",
  data_kurang: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function OnboardingHasilPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(props.params);
  const { user, loading } = useAuth();
  const [session, setSession] = useState<DiagnosticSessionDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const idToken = await user!.getIdToken();
        const res = await fetch(`/api/onboarding/result/${sessionId}`, {
          headers: { authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        setSession(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
  }, [user, sessionId]);

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user) return <main className="p-8"><Link href="/login" className="text-brand underline">Login dulu</Link></main>;
  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-rose-600 mb-4">{error}</p>
        <Link href="/" className="text-brand underline">← Beranda</Link>
      </main>
    );
  }
  if (!session) return <main className="p-8 text-slate-500">Memuat hasil...</main>;

  const cov = session.hasilCoverage;
  const deep = session.hasilDeep;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <Link href="/" className="text-sm text-slate-500 hover:text-brand">← Beranda</Link>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-2">
        Hasil Diagnostik<span className="text-brand">.</span>
      </h1>
      <p className="text-muted mb-6">{JALUR_LABEL[session.jalur]}</p>

      {/* Ringkasan */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Card title="Level Kelas" value={session.kelasEstimasi?.toFixed(1) ?? "-"} sub="estimasi" />
        <Card title="Theta Global" value={session.thetaGlobal?.toFixed(2) ?? "-"} sub="-3 sampai +3" />
        <Card title="Total Soal" value={String(session.itemsAnswered)} sub="dijawab" />
      </section>

      {/* Per Area */}
      {cov && cov.perArea.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Profil Per Area</h2>
          <div className="space-y-2">
            {cov.perArea.map((p) => (
              <div key={p.area} className="rounded-xl bg-white border border-slate-200 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{AREA_LABEL[p.area] ?? p.area}</div>
                  <div className="text-xs text-slate-500 mt-0.5">θ={p.theta.toFixed(2)} · SE={p.se === Infinity ? "—" : p.se.toFixed(2)}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLOR[p.status] ?? STATUS_COLOR.data_kurang}`}>
                  {p.status === "data_kurang" ? "data kurang" : p.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sub-materi remediasi */}
      {deep && deep.remediasiKodes.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Perlu Remediasi ({deep.remediasiKodes.length})</h2>
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm">
            <p className="text-rose-800 mb-2 font-medium">Mulai dari sini biar dasar kuat:</p>
            <ul className="space-y-1 list-disc list-inside text-rose-700 font-mono text-xs">
              {deep.remediasiKodes.slice(0, 10).map((kode) => (
                <li key={kode}>{kode}</li>
              ))}
              {deep.remediasiKodes.length > 10 && (
                <li className="text-rose-500">+ {deep.remediasiKodes.length - 10} lainnya</li>
              )}
            </ul>
          </div>
        </section>
      )}

      {/* Mastery summary */}
      {deep && (
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Distribusi Mastery</h2>
          <div className="grid grid-cols-4 gap-2">
            {(["siap", "review", "remediasi", "unknown"] as const).map((s) => (
              <div key={s} className="rounded-xl bg-white border border-slate-200 p-3 text-center">
                <div className="text-2xl font-bold">{deep.masteryCount[s]}</div>
                <div className="text-xs text-slate-500 mt-1 capitalize">{s}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-3 mt-8">
        <Link
          href="/"
          className="flex-1 rounded-xl bg-brand hover:bg-brand-strong text-white font-semibold py-3 text-center transition"
        >
          Mulai Belajar →
        </Link>
        <Link
          href="/onboarding"
          className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-5 text-center transition"
        >
          Ulang
        </Link>
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
