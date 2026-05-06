"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  KATEGORI_UTAMA_LABEL,
  KATEGORI_UTAMA_URUT,
  KELAS_PER_JENJANG,
  JENJANG_URUT,
  JENJANG_LABEL,
  type Jenjang,
  type KategoriUtama,
  type Kelas,
  type ModeKurikulum,
} from "@/types";
import { JALUR_LABEL, JALUR_DURASI_MENIT, pilihJalur } from "@/lib/diagnostic-routing";
import { listBabsForKelas, smartDefaultLastBab, buildBabsExposedMap } from "@/lib/bab-exposure";

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [kategori, setKategori] = useState<KategoriUtama>("reguler");
  const [jenjang, setJenjang] = useState<Jenjang | "">("");
  const [kelas, setKelas] = useState<Kelas | "">("");
  const [modeKurikulum, setModeKurikulum] = useState<ModeKurikulum>("comprehensive");
  const [lastBab, setLastBab] = useState<string>(""); // "not_started" | "B1" | ... | "all_done"
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jalur = jenjang
    ? pilihJalur({ jenjang, kelas: (kelas || undefined) as Kelas | undefined, kategoriUtama: kategori })
    : null;

  // Bab list untuk dropdown (kelas yang dipilih)
  const jenjangResmi = jenjang === "sd" ? "SD" : jenjang === "smp" ? "SMP" : jenjang === "sma" ? "SMA" : null;
  const babList = useMemo(() => {
    if (!jenjangResmi || !kelas) return [];
    return listBabsForKelas(jenjangResmi, Number(kelas));
  }, [jenjangResmi, kelas]);

  // Smart default — bab terakhir yang biasanya sudah dipelajari per bulan ajaran
  const smartDefault = useMemo(() => {
    if (!jenjangResmi || !kelas) return null;
    return smartDefaultLastBab(jenjangResmi, Number(kelas));
  }, [jenjangResmi, kelas]);

  // Auto-set default kalau belum di-set & smartDefault tersedia
  useMemo(() => {
    if (!lastBab && smartDefault) setLastBab(smartDefault.babKode);
  }, [smartDefault, lastBab]);

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-slate-600 mb-4">Login dulu untuk mulai diagnostik onboarding.</p>
        <Link href="/login" className="text-brand underline">→ Login</Link>
      </main>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!jenjang || !kelas) {
      setError("Pilih jenjang & kelas dulu.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const idToken = await user!.getIdToken();
      // Build babsExposed dari pilihan user. "" = treat all exposed (skip filter, backward compat)
      const babsExposed = lastBab && jenjangResmi
        ? buildBabsExposedMap(jenjangResmi, Number(kelas), lastBab as "not_started" | "all_done" | string)
        : undefined;
      const res = await fetch("/api/onboarding/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ jenjang, kelas, kategoriUtama: kategori, modeKurikulum, babsExposed }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }
      const data = await res.json();
      // Persist initial state ke sessionStorage supaya client-side lanjut di /onboarding/test
      sessionStorage.setItem(`onboarding-${data.sessionId}`, JSON.stringify({
        state: data.state,
        nextItem: data.nextItem,
        progress: data.progress,
        startedAt: Date.now(),
      }));
      router.push(`/onboarding/test/${data.sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 sm:p-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-brand">← Beranda</Link>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-2">
        Cek Kemampuan<span className="text-brand">.</span>
      </h1>
      <p className="text-muted mb-8">
        Sebelum mulai belajar, kita cek dulu level matematika kamu lewat 3 tahap singkat:
        cek level kelas, cek per area, lalu cek detail. Total ~15-30 menit.
      </p>

      <form onSubmit={onSubmit} className="space-y-6 rounded-2xl bg-white border border-slate-200 p-6">
        {/* Kategori */}
        <div>
          <label className="block text-sm font-semibold mb-2">1. Pilih kategori belajar</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {KATEGORI_UTAMA_URUT.map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setKategori(k)}
                className={`text-left rounded-xl border-2 p-3 transition ${
                  kategori === k ? "border-brand bg-brand-soft" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="font-medium">{KATEGORI_UTAMA_LABEL[k]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Jenjang */}
        <div>
          <label className="block text-sm font-semibold mb-2">2. Jenjang sekolah kamu</label>
          <div className="grid grid-cols-3 gap-2">
            {JENJANG_URUT.map((j) => (
              <button
                type="button"
                key={j}
                onClick={() => { setJenjang(j); setKelas(""); }}
                className={`rounded-xl border-2 p-3 transition ${
                  jenjang === j ? "border-brand bg-brand-soft" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {JENJANG_LABEL[j]}
              </button>
            ))}
          </div>
        </div>

        {/* Kelas */}
        {jenjang && (
          <div>
            <label className="block text-sm font-semibold mb-2">3. Kelas saat ini</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {KELAS_PER_JENJANG[jenjang].map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setKelas(k)}
                  className={`rounded-xl border-2 py-2 transition ${
                    kelas === k ? "border-brand bg-brand-soft" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  Kelas {k}
                </button>
              ))}
            </div>
          </div>
        )}

        {/*
          Mode kurikulum dihapus dari onboarding (single mode = comprehensive).
          Materi tampil semua dengan label badge per sub: 📘 Inti / 🌉 Pendukung / 🚀 Tantangan.
          Filter optional ada di UI /materi/[slug] untuk power users.
        */}

        {/* Bab terakhir dipelajari */}
        {jenjang && kelas && babList.length > 0 && (
          <div>
            <label className="block text-sm font-semibold mb-2">
              4. Bab terakhir yang sudah kamu pelajari di Kelas {kelas}?
            </label>
            <select
              value={lastBab}
              onChange={(e) => setLastBab(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand outline-none transition"
            >
              <option value="not_started">Belum mulai pelajari Kelas {kelas}</option>
              {babList.map((b) => (
                <option key={b.kode} value={b.kode}>
                  {b.kode}: {b.nama}
                  {smartDefault?.babKode === b.kode ? "  · biasa di bulan ini" : ""}
                </option>
              ))}
              <option value="all_done">Sudah selesai semua bab Kelas {kelas}</option>
            </select>
            <p className="text-xs text-slate-500 mt-2">
              💡 Tes hanya akan menanyakan bab yang sudah kamu pelajari + materi kelas sebelumnya.
              Bab Kelas {kelas} yang belum dipelajari akan di-tes nanti saat kamu mau mulai mempelajarinya.
            </p>
          </div>
        )}

        {/* Preview jalur */}
        {jalur && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm">
            <div className="font-semibold text-slate-700">Jalur diagnostik: {JALUR_LABEL[jalur]}</div>
            <div className="text-slate-500 mt-1">
              Mode: <strong>{modeKurikulum === "strict" ? "Strict CP 046" : "Comprehensive Full"}</strong> · Estimasi waktu: ~{JALUR_DURASI_MENIT[jalur].fast} menit (Fast Test) + {JALUR_DURASI_MENIT[jalur].deep - JALUR_DURASI_MENIT[jalur].fast} menit (Deep Test).
            </div>
          </div>
        )}

        {error && <div className="rounded-lg bg-rose-50 text-rose-700 border border-rose-200 p-3 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={!jenjang || !kelas || submitting}
          className="w-full rounded-xl bg-brand hover:bg-brand-strong text-white font-semibold py-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Memulai..." : "Mulai Diagnostik →"}
        </button>
      </form>
    </main>
  );
}
