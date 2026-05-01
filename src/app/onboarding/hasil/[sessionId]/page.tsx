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

      {/* Disclaimer: sesi lama mungkin pakai logic klasifikasi pre-fix */}
      {session.startedAt < new Date("2026-05-01T00:00:00Z").getTime() && (
        <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
          ℹ Sesi ini dibuat sebelum update klasifikasi. Status &quot;cukup/lemah&quot; di bawah mungkin tidak akurat — disarankan
          {" "}
          <Link href="/onboarding" className="underline font-semibold">jalankan diagnostik ulang</Link>
          {" "}
          dengan logic terbaru.
        </div>
      )}

      {/* Ringkasan */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Card title="Level Kelas" value={session.kelasEstimasi?.toFixed(1) ?? "-"} sub="estimasi" />
        <Card title="Theta Global" value={session.thetaGlobal?.toFixed(2) ?? "-"} sub="-3 sampai +3" />
        <Card title="Total Soal" value={String(session.itemsAnswered)} sub="dijawab" />
      </section>

      {/* Path Routing 4-tier (dari Foundation Set / Integral spec) */}
      {cov?.pathRoute && cov?.clusterScores && (
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Rekomendasi Jalur</h2>
          <div className={`rounded-2xl p-5 sm:p-6 border-2 ${
            cov.pathRoute.path === "ADVANCED" ? "bg-emerald-50 border-emerald-300" :
            cov.pathRoute.path === "STANDARD" ? "bg-amber-50 border-amber-300" :
            cov.pathRoute.path === "COMPREHENSIVE" ? "bg-orange-50 border-orange-300" :
            "bg-rose-50 border-rose-300"
          }`}>
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Path</div>
                <h3 className={`text-2xl sm:text-3xl font-extrabold ${
                  cov.pathRoute.path === "ADVANCED" ? "text-emerald-700" :
                  cov.pathRoute.path === "STANDARD" ? "text-amber-700" :
                  cov.pathRoute.path === "COMPREHENSIVE" ? "text-orange-700" :
                  "text-rose-700"
                }`}>
                  {cov.pathRoute.path === "ADVANCED" ? "🟢 ADVANCED" :
                   cov.pathRoute.path === "STANDARD" ? "🟡 STANDARD" :
                   cov.pathRoute.path === "COMPREHENSIVE" ? "🟠 COMPREHENSIVE" :
                   "🔴 INTENSIVE"}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">Estimasi tes lanjutan</div>
                <div className="text-sm font-semibold">{cov.pathRoute.duration}</div>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-4">
              <strong>Fokus:</strong> {cov.pathRoute.fokus}
            </p>

            {/* Breakdown 3 cluster */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {cov.clusterScores.map((cs) => (
                <div key={cs.cluster} className="rounded-xl bg-white border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">Cluster {cs.cluster}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                      cs.status === "siap" ? "bg-emerald-100 text-emerald-700" :
                      cs.status === "review" ? "bg-amber-100 text-amber-700" :
                      "bg-rose-100 text-rose-700"
                    }`}>{cs.status}</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {cs.itemsAnswered > 0 ? `${Math.round(cs.accuracy * 100)}%` : "—"}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {cs.itemsCorrect}/{cs.itemsAnswered} · target ≥{Math.round(cs.threshold * 100)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {cs.cluster === "A" ? "Direct prereq" :
                     cs.cluster === "B" ? "Supporting" :
                     "Foundation"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* UTBK Estimate — hanya muncul untuk jalur sma-utbk */}
      {session.jalur === "sma-utbk" && session.thetaGlobal !== undefined && (
        <section className="mb-6">
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white p-5 sm:p-6 shadow-lg">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-wider text-white/80 mb-1">📊 Estimasi Skor UTBK</div>
                <h3 className="text-3xl sm:text-4xl font-extrabold">
                  {Math.round(thetaToUtbkScore(session.thetaGlobal))}
                  <span className="text-lg font-normal text-white/70 ml-2">/ 1000</span>
                </h3>
                <p className="text-sm text-white/85 mt-2">
                  Estimasi kasar berdasarkan kemampuan {session.itemsAnswered} soal yang dijawab.
                  Rentang: 200-1000 (mirroring skala LTMPT).
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/70 mb-1">Klasifikasi</div>
                <div className={`inline-block px-3 py-1 rounded-full font-semibold text-sm ${utbkClassification(thetaToUtbkScore(session.thetaGlobal)).color}`}>
                  {utbkClassification(thetaToUtbkScore(session.thetaGlobal)).label}
                </div>
              </div>
            </div>
            <p className="text-xs text-white/70 mt-3 italic">
              ⚠ Estimasi kasar dari diagnostik internal — bukan prediksi resmi LTMPT. Untuk skor akurat, ikuti tryout simulasi UTBK.
            </p>
          </div>
        </section>
      )}

      {/* Per Area */}
      {cov && cov.perArea.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Profil Per Area</h2>
          <div className="space-y-2">
            {cov.perArea.map((p) => {
              const acc = p.accuracy;
              const ans = p.itemsAnswered ?? 0;
              const cor = p.itemsCorrect ?? 0;
              return (
                <div key={p.area} className="rounded-xl bg-white border border-slate-200 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{AREA_LABEL[p.area] ?? p.area}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {ans > 0 && (
                        <>Benar {cor}/{ans} ({acc !== undefined ? Math.round(acc * 100) : Math.round((cor / Math.max(1, ans)) * 100)}%) · </>
                      )}
                      θ={p.theta.toFixed(2)}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLOR[p.status] ?? STATUS_COLOR.data_kurang}`}>
                    {p.status === "data_kurang" ? "data kurang" : p.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sub-materi remediasi (Deep stage) */}
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

      {/* REKOMENDASI: SELALU render kalau ada area lemah ATAU theta rendah ATAU low overall accuracy */}
      {!deep && (() => {
        // Hitung overall accuracy dari per-area data (kalau ada)
        const totalAns = cov?.perArea.reduce((s, p) => s + (p.itemsAnswered ?? 0), 0) ?? 0;
        const totalCor = cov?.perArea.reduce((s, p) => s + (p.itemsCorrect ?? 0), 0) ?? 0;
        const overallAcc = totalAns > 0 ? totalCor / totalAns : null;
        const lemahAreas = cov?.perArea.filter((p) => p.status === "lemah") ?? [];
        const cukupAreas = cov?.perArea.filter((p) => p.status === "cukup") ?? [];
        const tetabRendah = session.thetaGlobal !== undefined && session.thetaGlobal < -0.5;
        const accRendah = overallAcc !== null && overallAcc <= 0.4;

        if (lemahAreas.length > 0) {
          return (
            <section className="mb-6">
              <h2 className="text-xl font-bold mb-3">Area Perlu Diperdalam ({lemahAreas.length})</h2>
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm">
                <p className="text-rose-900 mb-2 font-medium">Berdasarkan jawabanmu, fokuskan latihan di area berikut:</p>
                <ul className="space-y-1 mt-2">
                  {lemahAreas.map((p) => (
                    <li key={p.area} className="flex items-center gap-2 text-rose-800">
                      <span className="text-rose-500">•</span>
                      <span className="font-medium">{AREA_LABEL[p.area] ?? p.area}</span>
                      {p.itemsAnswered !== undefined && p.itemsCorrect !== undefined && (
                        <span className="text-xs text-rose-600">— {p.itemsCorrect}/{p.itemsAnswered} benar ({Math.round((p.accuracy ?? 0) * 100)}%)</span>
                      )}
                    </li>
                  ))}
                </ul>
                {cukupAreas.length > 0 && (
                  <p className="text-xs text-rose-700 mt-3">
                    Area lain ({cukupAreas.map((p) => AREA_LABEL[p.area] ?? p.area).join(", ")}) status "cukup" — bisa lanjut tapi tetap perlu latihan.
                  </p>
                )}
                <p className="text-xs text-rose-700 mt-2">
                  Untuk rekomendasi sub-materi spesifik, jalankan diagnostik ulang setelah item bank lebih lengkap (saat ini Deep stage skip karena pool kecil).
                </p>
              </div>
            </section>
          );
        }
        if (accRendah || tetabRendah) {
          return (
            <section className="mb-6">
              <h2 className="text-xl font-bold mb-3">Perlu Banyak Latihan</h2>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm">
                <p className="text-amber-900 font-medium">
                  ⚠ {accRendah && overallAcc !== null && `Accuracy ${Math.round(overallAcc * 100)}% (${totalCor}/${totalAns} benar). `}
                  {tetabRendah && `θ global ${session.thetaGlobal!.toFixed(2)} di bawah median.`}
                </p>
                <p className="text-amber-800 mt-2">
                  Banyak jawaban salah terdeteksi — sistem belum bisa drill detail per sub-materi karena item bank masih tipis. Sebaiknya:
                </p>
                <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Mulai dari foundation: latihan dasar SD/SMP terlebih dulu</li>
                  <li>Buka materi per bab dan klik &quot;Cek Kesiapan Bab&quot;</li>
                  <li>Jalankan diagnostik ulang setelah item bank lebih lengkap</li>
                </ul>
              </div>
            </section>
          );
        }
        return null;
      })()}

      {/* Indicator stage progression */}
      {(deep || cov) && (
        <section className="mb-6">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
            <span className="font-semibold">Tahap selesai:</span>{" "}
            {session.hasilLocator ? "✓ Locator" : "○ Locator"}{" · "}
            {cov ? "✓ Coverage" : "○ Coverage"}{" · "}
            {deep ? "✓ Deep" : "○ Deep (item bank kurang)"}
          </div>
        </section>
      )}

      {/* Mastery summary — Deep stage (per sub-materi) */}
      {deep && (
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Distribusi Mastery (per sub-materi · Deep)</h2>
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

      {/* FALLBACK Mastery: kalau Deep tidak ada, tampilkan distribusi area dari Coverage */}
      {!deep && cov && cov.perArea.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Distribusi Status (per area · Coverage)</h2>
          <div className="grid grid-cols-4 gap-2">
            {(["kuat", "cukup", "lemah", "data_kurang"] as const).map((s) => {
              const count = cov.perArea.filter((p) => p.status === s).length;
              const colorMap: Record<string, string> = {
                kuat: "text-emerald-700",
                cukup: "text-amber-700",
                lemah: "text-rose-700",
                data_kurang: "text-slate-500",
              };
              return (
                <div key={s} className="rounded-xl bg-white border border-slate-200 p-3 text-center">
                  <div className={`text-2xl font-bold ${colorMap[s]}`}>{count}</div>
                  <div className="text-xs text-slate-500 mt-1 capitalize">{s === "data_kurang" ? "data kurang" : s}</div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Tahap Deep skip karena item bank belum cukup. Distribusi di atas adalah agregat per AREA dari Tahap 2 Coverage.
          </p>
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

/**
 * Map theta IRT (-3 to +3) ke skala UTBK 200-1000 (mirroring LTMPT scaled score).
 * Linear approx — theta 0 = 500 (median), theta +3 = 1000, theta -3 = 200.
 * Catatan: ini estimasi kasar saja, bukan model resmi LTMPT.
 */
function thetaToUtbkScore(theta: number): number {
  const score = 500 + theta * 133.33; // (1000-200)/(3-(-3)) ≈ 133.33
  return Math.max(200, Math.min(1000, score));
}

function utbkClassification(score: number): { label: string; color: string } {
  if (score >= 700) return { label: "Sangat Baik", color: "bg-emerald-200 text-emerald-900" };
  if (score >= 600) return { label: "Baik", color: "bg-sky-200 text-sky-900" };
  if (score >= 500) return { label: "Cukup", color: "bg-amber-200 text-amber-900" };
  if (score >= 400) return { label: "Perlu Persiapan", color: "bg-orange-200 text-orange-900" };
  return { label: "Butuh Banyak Latihan", color: "bg-rose-200 text-rose-900" };
}
