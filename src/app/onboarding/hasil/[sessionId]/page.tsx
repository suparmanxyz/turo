"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import type { DiagnosticSessionDoc } from "@/lib/firestore-schema";
import { JALUR_LABEL } from "@/lib/diagnostic-routing";

const CONFIDENCE_KEY = (sid: string) => `turo-confidence-${sid}`;

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
  const drilling = session.hasilDrilling;
  const maturity = session.hasilMaturity;

  // Confidence rating: 1 question, 5 emoji, 3 detik
  // Disubmit ke /api/onboarding/confidence yang re-compute maturity dengan rating itu
  const showConfidenceModal = !!maturity && !maturity.userConfidenceRating &&
    typeof window !== "undefined" && !sessionStorage.getItem(CONFIDENCE_KEY(sessionId));

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

      {showConfidenceModal && (
        <ConfidenceModal
          onSubmit={async (rating) => {
            sessionStorage.setItem(CONFIDENCE_KEY(sessionId), String(rating));
            try {
              const idToken = await user!.getIdToken();
              await fetch(`/api/onboarding/confidence`, {
                method: "POST",
                headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ sessionId, rating }),
              });
              // Refresh session data
              const r = await fetch(`/api/onboarding/result/${sessionId}`, {
                headers: { authorization: `Bearer ${idToken}` },
              });
              if (r.ok) setSession(await r.json());
            } catch (e) {
              console.warn("Confidence submit failed:", e);
            }
          }}
          onSkip={() => sessionStorage.setItem(CONFIDENCE_KEY(sessionId), "skipped")}
        />
      )}

      {/* Peta Spektrum Matematis — 5 dimensi profil kognitif */}
      {maturity && <MaturitySection m={maturity} />}

      {/* Drilling result (Phase 2) — show kalau ada hasilDrilling */}
      {drilling && (
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Hasil Drilling Adaptif (Phase 2)</h2>
          <div className={`rounded-2xl border-2 p-5 ${
            drilling.path === "ADVANCED" ? "bg-emerald-50 border-emerald-300" :
            drilling.path === "STANDARD" ? "bg-sky-50 border-sky-300" :
            drilling.path === "COMPREHENSIVE" ? "bg-amber-50 border-amber-300" :
            "bg-rose-50 border-rose-300"
          }`}>
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Path</div>
                <div className="text-2xl font-extrabold">{drilling.path}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Accuracy keseluruhan</div>
                <div className="text-2xl font-bold">{Math.round(drilling.overallAccuracy * 100)}%</div>
                <div className="text-xs text-slate-500">{drilling.itemsAnswered}/{drilling.itemsTotal} soal</div>
              </div>
            </div>

            {/* Stepper */}
            <div className="space-y-2 mb-4">
              {drilling.steps.map((step, idx) => (
                <div key={idx} className="rounded-xl bg-white border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        step.status === "passed" ? "bg-emerald-500 text-white" :
                        step.status === "weak" ? "bg-rose-500 text-white" :
                        step.status === "skipped" ? "bg-slate-300 text-slate-600" :
                        "bg-slate-200 text-slate-500"
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-medium text-sm truncate">{step.label}</span>
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${
                      step.status === "passed" ? "bg-emerald-100 text-emerald-700" :
                      step.status === "weak" ? "bg-rose-100 text-rose-700" :
                      step.status === "skipped" ? "bg-slate-100 text-slate-500" :
                      "bg-slate-100 text-slate-500"
                    }`}>{step.status}</span>
                  </div>
                  <div className="text-xs text-slate-500 ml-8">
                    {step.itemsAnswered > 0 ? (
                      <>
                        {Math.round((step.accuracy ?? 0) * 100)}% accuracy · {step.itemsAnswered}/{step.itemsTotal} soal · target ≥{Math.round(step.passThreshold * 100)}%
                      </>
                    ) : step.status === "skipped" ? (
                      <>Skip — pool item belum cukup untuk step ini</>
                    ) : (
                      <>Belum dijawab</>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Rekomendasi</div>
              <p className="text-sm text-slate-700">{drilling.recommendation}</p>
            </div>

            {drilling.weakKodes.length > 0 && (
              <div className="mt-3 rounded-xl bg-white border border-rose-200 p-3">
                <div className="text-xs uppercase tracking-wider text-rose-600 mb-2">
                  Sub-materi prioritas perlu dipertajam ({drilling.weakKodes.length})
                </div>
                <ul className="space-y-1 text-xs font-mono text-rose-800">
                  {drilling.weakKodes.slice(0, 8).map((kode) => (
                    <li key={kode}>• {kode}</li>
                  ))}
                  {drilling.weakKodes.length > 8 && (
                    <li className="text-rose-500">+ {drilling.weakKodes.length - 8} lainnya</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Indicator stage progression */}
      {(deep || cov) && (
        <section className="mb-6">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
            <span className="font-semibold">Tahap selesai:</span>{" "}
            {session.hasilLocator ? "✓ Locator" : "○ Locator"}{" · "}
            {cov ? "✓ Coverage" : "○ Coverage"}{" · "}
            {deep ? "✓ Deep" : "○ Deep (item bank kurang)"}{" · "}
            {drilling ? "✓ Drilling" : "○ Drilling (skip)"}
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

      <div className="flex gap-3 mt-8 flex-wrap">
        <Link
          href="/"
          className="flex-1 min-w-[200px] rounded-xl bg-brand hover:bg-brand-strong text-white font-semibold py-3 text-center transition"
        >
          Mulai Belajar →
        </Link>
        {maturity && (
          <Link
            href="/profil/maturity"
            className="rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 font-semibold py-3 px-5 text-center transition"
            title="Lihat trend Peta Spektrum Matematis dari riwayat sesi"
          >
            🌌 Trend Spektrum
          </Link>
        )}
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

// ============================================================
// Confidence Rating Modal — single question, 5 emoji buttons (~3 detik)
// ============================================================

function ConfidenceModal({ onSubmit, onSkip }: { onSubmit: (rating: number) => void; onSkip: () => void }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const options = [
    { rating: 1, emoji: "😟", label: "Tidak yakin" },
    { rating: 2, emoji: "😐", label: "Kurang yakin" },
    { rating: 3, emoji: "🙂", label: "Cukup yakin" },
    { rating: 4, emoji: "😊", label: "Yakin" },
    { rating: 5, emoji: "🤩", label: "Sangat yakin" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
        <h3 className="text-lg font-bold text-center mb-2">Sebelum lihat hasil...</h3>
        <p className="text-sm text-slate-600 text-center mb-5">
          Seberapa yakin kamu dengan jawaban-jawaban tadi?
        </p>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {options.map((opt) => (
            <button
              key={opt.rating}
              onClick={() => setChosen(opt.rating)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition ${
                chosen === opt.rating
                  ? "border-violet-500 bg-violet-50"
                  : "border-slate-200 hover:border-violet-300"
              }`}
            >
              <span className="text-3xl">{opt.emoji}</span>
              <span className="text-[10px] text-slate-600 leading-tight text-center">{opt.label}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            disabled={!chosen || submitting}
            onClick={async () => {
              if (!chosen) return;
              setSubmitting(true);
              await onSubmit(chosen);
              setSubmitting(false);
            }}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-50 hover:bg-violet-700 transition"
          >
            {submitting ? "Memproses..." : "Lanjut"}
          </button>
          <button
            onClick={onSkip}
            className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-sm"
          >
            Lewati
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-3">
          Rating ini bantu sistem nilai akurasi penilaian-diri kamu.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Mathematical Maturity Section — 5 dimensi profil kognitif
// ============================================================

const MATURITY_LABELS: Record<string, string> = {
  abstract_reasoning: "Penalaran Abstrak",
  problem_solving: "Pemecahan Masalah",
  communication: "Komunikasi Matematis",
  persistence: "Ketekunan & Fokus",
  confidence: "Kepercayaan Diri & Regulasi",
  pattern_recognition: "Pengenalan Pola",
  symbolic_manipulation: "Manipulasi Simbolik",
  conceptual_understanding: "Pemahaman Konsep",
  logical_reasoning: "Penalaran Logis",
  multi_step_problems: "Soal Multi-Langkah",
  analytical_consistency: "Konsistensi Analitis",
  strategy_selection: "Pemilihan Strategi",
  solution_efficiency: "Efisiensi Solusi",
  reasoning_quality: "Kualitas Penalaran",
  explanation_clarity: "Kejelasan Penjelasan",
  language_processing: "Pemrosesan Bahasa Matematis",
  logical_flow: "Alur Logis",
  time_consistency: "Konsistensi Waktu",
  completion_rate: "Tingkat Penyelesaian",
  effort_maintenance: "Pemeliharaan Usaha",
  attention_to_detail: "Perhatian Detail",
  performance_consistency: "Konsistensi Performa",
  risk_management: "Manajemen Risiko",
  self_assessment_accuracy: "Akurasi Penilaian Diri",
  adaptive_behavior: "Perilaku Adaptif",
};

const LEVEL_COLOR: Record<string, string> = {
  MASTERY: "bg-emerald-500 text-white",
  PROFICIENT: "bg-emerald-100 text-emerald-700",
  DEVELOPING: "bg-sky-100 text-sky-700",
  EMERGING: "bg-amber-100 text-amber-700",
  BEGINNING: "bg-rose-100 text-rose-700",
};

const DIMENSION_EMOJI: Record<string, string> = {
  abstract_reasoning: "🧠",
  problem_solving: "🎯",
  communication: "💬",
  persistence: "💪",
  confidence: "🎓",
};

type MaturityData = NonNullable<DiagnosticSessionDoc["hasilMaturity"]>;

function MaturitySection({ m }: { m: MaturityData }) {
  return (
    <section className="mb-6">
      <h2 className="text-xl font-bold mb-3">🌌 Peta Spektrum Matematis</h2>
      <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border-2 border-violet-200 p-5">
        {/* Overall summary */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Skor Spektrum</div>
            <div className="text-4xl font-extrabold text-violet-900">{m.overall}</div>
            <div className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold mt-1 ${LEVEL_COLOR[m.level] ?? ""}`}>
              {m.level}
            </div>
          </div>
          <div className="text-xs text-slate-500 max-w-xs">
            5 dimensi dari {m.totalItems} jawaban — bukan <strong>apa</strong> yang kamu tahu, tapi <strong>bagaimana</strong> kamu berpikir matematis.
          </div>
        </div>

        {/* Per dimensi summary */}
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {m.dimensions.map((d) => (
            <div key={d.dimension} className="rounded-xl bg-white border border-violet-200 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl">{DIMENSION_EMOJI[d.dimension] ?? "•"}</span>
                  <span className="font-medium text-sm truncate">{MATURITY_LABELS[d.dimension] ?? d.dimension}</span>
                </div>
                <span className="text-xs text-slate-400">{Math.round(d.weight * 100)}%</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <div className="text-2xl font-bold">{d.overall}</div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${LEVEL_COLOR[d.level] ?? ""}`}>
                  {d.level}
                </span>
              </div>
              {/* Mini progress bar */}
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full ${d.level === "MASTERY" || d.level === "PROFICIENT" ? "bg-emerald-500" : d.level === "DEVELOPING" ? "bg-sky-500" : d.level === "EMERGING" ? "bg-amber-500" : "bg-rose-500"}`}
                  style={{ width: `${d.overall}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Strengths & priorities */}
        <div className="grid sm:grid-cols-2 gap-3">
          {m.strengths.length > 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
              <div className="text-xs uppercase tracking-wider text-emerald-700 font-semibold mb-2">✨ Top Strengths</div>
              <ul className="space-y-1 text-xs text-emerald-900">
                {m.strengths.map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="font-bold">{s.score}</span>
                    <span>{MATURITY_LABELS[s.subDimension] ?? s.subDimension}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {m.priorityAreas.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <div className="text-xs uppercase tracking-wider text-amber-700 font-semibold mb-2">⚠ Priority Areas</div>
              <ul className="space-y-1 text-xs text-amber-900">
                {m.priorityAreas.map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="font-bold">{s.score}</span>
                    <span>{MATURITY_LABELS[s.subDimension] ?? s.subDimension}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Detail per sub-dimensi (collapsible) */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-violet-700 hover:text-violet-900">
            Lihat detail interpretasi & rekomendasi per sub-dimensi
          </summary>
          <div className="mt-3 space-y-3">
            {m.dimensions.map((d) => (
              <div key={d.dimension} className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="font-semibold text-sm mb-2">
                  {DIMENSION_EMOJI[d.dimension]} {MATURITY_LABELS[d.dimension] ?? d.dimension}
                </div>
                <ul className="space-y-2 text-xs">
                  {d.subScores.map((s) => (
                    <li key={s.subDimension} className="border-l-2 border-slate-200 pl-3">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium">{MATURITY_LABELS[s.subDimension] ?? s.subDimension}</span>
                        <span className="font-bold">{s.score}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${LEVEL_COLOR[s.level] ?? ""}`}>
                          {s.level}
                        </span>
                        {s.itemsContributing > 0 && (
                          <span className="text-[10px] text-slate-400">({s.itemsContributing} soal)</span>
                        )}
                      </div>
                      <p className="text-slate-700 italic">{s.interpretation}</p>
                      <p className="text-slate-600 mt-0.5">→ {s.recommendation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
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
