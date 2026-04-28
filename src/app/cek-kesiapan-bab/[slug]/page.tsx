"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { MathText } from "@/components/MathText";

type SanitizedItem = {
  id: string;
  subMateriKode: string;
  pertanyaan: string;
  opsi: { teks: string }[];
  svg?: string;
};

type WarmupItem = {
  blindSpotKode: string;
  blindSpotNama?: string;
  blindSpotKelas?: number;
  blindSpotJenjang?: "SD" | "SMP" | "SMA";
  item: SanitizedItem;
};

type BlindSpot = {
  kode: string;
  nama?: string;
  jenjang?: "SD" | "SMP" | "SMA";
  kelas?: number;
  area?: string;
  weight: string;
  reason: string;
};

type Decision =
  | { action: "lanjut"; targetKode: string; alasan: string }
  | { action: "remediasi"; targetKode: string; remediasiKodes: string[]; alasan: string }
  | { action: "diagnostik"; targetKode: string; alasan: string };

type StartResp = {
  materiSlug: string;
  materiNama: string;
  jumlahSubMateri: number;
  blindSpots: BlindSpot[];
  warmupQueue: WarmupItem[];
  shortCircuit?: Decision;
};

type Phase = "loading" | "intro" | "warmup" | "finishing" | "decision" | "error";

export default function CekKesiapanBabPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<StartResp | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<{ itemId: string; blindSpotKode: string; pilihIdx: number; responseTimeMs: number }[]>([]);
  const [pilihIdx, setPilihIdx] = useState<number | null>(null);
  const itemStart = useRef(Date.now());

  useEffect(() => {
    if (!user) return;
    async function load() {
      setPhase("loading");
      try {
        const idToken = await user!.getIdToken();
        const res = await fetch("/api/cek-kesiapan-bab/start", {
          method: "POST",
          headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ materiSlug: slug }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const d: StartResp = await res.json();
        setData(d);
        if (d.shortCircuit) {
          setDecision(d.shortCircuit);
          setPhase("decision");
        } else {
          setPhase("intro");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    }
    load();
  }, [user, slug]);

  async function submitAll(allAnswers: typeof answers) {
    setPhase("finishing");
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/cek-kesiapan-bab/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ materiSlug: slug, answers: allAnswers }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const d = await res.json();
      setDecision(d.decision);
      setPhase("decision");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  function lanjutSoal() {
    if (pilihIdx === null || !data) return;
    const cur = data.warmupQueue[idx]!;
    const newAnswer = {
      itemId: cur.item.id,
      blindSpotKode: cur.blindSpotKode,
      pilihIdx,
      responseTimeMs: Date.now() - itemStart.current,
    };
    const allAnswers = [...answers, newAnswer];
    setAnswers(allAnswers);
    setPilihIdx(null);
    if (idx + 1 >= data.warmupQueue.length) {
      submitAll(allAnswers);
    } else {
      setIdx(idx + 1);
      itemStart.current = Date.now();
    }
  }

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user) return <main className="p-8"><Link href="/login" className="text-brand underline">Login dulu</Link></main>;

  if (phase === "error") {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-rose-600 mb-4">{error}</p>
        <Link href={`/materi/${slug}`} className="text-brand underline">← Kembali ke bab</Link>
      </main>
    );
  }

  if (phase === "loading") return <main className="p-8 text-slate-500">Cek prasyarat bab...</main>;
  if (phase === "finishing") return <main className="p-8 text-slate-500">Menyimpan hasil...</main>;

  // INTRO
  if (phase === "intro" && data) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:p-10">
        <Link href={`/materi/${slug}`} className="text-sm text-slate-500 hover:text-brand">← Kembali ke bab</Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-2">
          Cek Kesiapan Bab<span className="text-brand">.</span>
        </h1>
        <p className="text-muted mb-6">
          Sebelum mulai bab <strong>{data.materiNama}</strong> ({data.jumlahSubMateri} sub-materi), kita cek dulu {data.blindSpots.length} prasyarat penting yang akan kepakai sepanjang bab.
        </p>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 mb-4">
          <div className="text-sm font-semibold mb-3">Yang akan dicek ({data.warmupQueue.length} soal cover {data.blindSpots.length} prasyarat agregat):</div>
          <ul className="space-y-2.5 text-sm">
            {data.blindSpots.slice(0, 10).map((bs) => (
              <li key={bs.kode} className="border-l-2 border-amber-300 pl-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{bs.nama ?? bs.kode}</span>
                  {bs.jenjang && bs.kelas !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">{bs.jenjang} K{bs.kelas}</span>
                  )}
                  {bs.area && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{bs.area}</span>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  <code className="font-mono">{bs.kode}</code> · {bs.reason}
                </div>
              </li>
            ))}
            {data.blindSpots.length > 10 && (
              <li className="text-xs text-slate-400">+ {data.blindSpots.length - 10} prasyarat lain dicek dengan sample soal</li>
            )}
          </ul>
        </div>

        <button
          onClick={() => { setPhase("warmup"); itemStart.current = Date.now(); }}
          className="w-full rounded-xl bg-brand hover:bg-brand-strong text-white font-semibold py-3 transition"
        >
          Mulai ({data.warmupQueue.length} soal · ~{Math.ceil(data.warmupQueue.length * 1.5)} menit) →
        </button>
      </main>
    );
  }

  // WARMUP
  if (phase === "warmup" && data) {
    const cur = data.warmupQueue[idx]!;
    const item = cur.item;
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-700">Cek Prasyarat Bab:</span>
              <span className="font-semibold">{cur.blindSpotNama ?? cur.blindSpotKode}</span>
              {cur.blindSpotJenjang && cur.blindSpotKelas !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">{cur.blindSpotJenjang} K{cur.blindSpotKelas}</span>
              )}
              <code className="text-[10px] text-slate-400 font-mono">{cur.blindSpotKode}</code>
            </div>
            <span className="text-slate-500">{idx + 1} / {data.warmupQueue.length}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-brand transition-all" style={{ width: `${(idx / data.warmupQueue.length) * 100}%` }} />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 mb-4">
          {item.svg && (
            <div className="mb-4 flex justify-center" dangerouslySetInnerHTML={{ __html: item.svg }} />
          )}
          <div className="text-base sm:text-lg leading-relaxed mb-5">
            <MathText>{item.pertanyaan}</MathText>
          </div>
          <div className="space-y-2">
            {item.opsi.map((o, i) => (
              <button
                key={i}
                onClick={() => setPilihIdx(i)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 transition flex items-start gap-3 ${
                  pilihIdx === i ? "border-brand bg-brand-soft" : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <span className={`shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs ${
                  pilihIdx === i ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1"><MathText>{o.teks}</MathText></span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={lanjutSoal}
          disabled={pilihIdx === null}
          className="w-full rounded-xl bg-brand hover:bg-brand-strong text-white font-semibold py-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {idx + 1 >= data.warmupQueue.length ? "Selesai →" : "Lanjut →"}
        </button>
      </main>
    );
  }

  // DECISION
  if (phase === "decision" && decision) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:p-10">
        <Link href={`/materi/${slug}`} className="text-sm text-slate-500 hover:text-brand">← Kembali ke bab</Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-2">
          Hasil Cek Bab<span className="text-brand">.</span>
        </h1>

        {decision.action === "lanjut" && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 mb-4">
            <div className="text-2xl mb-2">✅ Siap mulai bab ini!</div>
            <p className="text-sm text-emerald-800">{decision.alasan}</p>
          </div>
        )}
        {decision.action === "remediasi" && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 mb-4">
            <div className="text-2xl mb-2">⚠️ Sebagian prereq lemah</div>
            <p className="text-sm text-amber-900 mb-3">{decision.alasan}</p>
            <p className="text-xs text-amber-700 mb-2">Sub-materi yang sebaiknya di-review dulu:</p>
            <ul className="space-y-1 font-mono text-xs">
              {decision.remediasiKodes.map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <span className="text-amber-500">•</span>
                  <Link href={`/cek-kesiapan/${encodeURIComponent(k)}`} className="hover:text-brand underline">{k}</Link>
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-700 mt-3">Boleh tetap lanjut bab — tapi siap-siap kalau ada bagian yang sulit, mungkin butuh review prereq di atas.</p>
          </div>
        )}
        {decision.action === "diagnostik" && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 mb-4">
            <div className="text-2xl mb-2">🔍 Banyak fondasi belum siap</div>
            <p className="text-sm text-rose-800 mb-3">{decision.alasan}</p>
            <p className="text-xs text-rose-700">Sebaiknya jalankan diagnostik menyeluruh dulu di onboarding untuk tahu kemampuan kamu di mana.</p>
          </div>
        )}

        <div className="flex gap-3 mt-6 flex-wrap">
          {(decision.action === "lanjut" || decision.action === "remediasi") && (
            <Link
              href={`/materi/${slug}`}
              className="flex-1 text-center rounded-xl bg-brand hover:bg-brand-strong text-white font-semibold py-3 transition"
            >
              {decision.action === "lanjut" ? "Mulai bab →" : "Tetap lanjut bab"}
            </Link>
          )}
          {decision.action === "diagnostik" && (
            <Link
              href="/onboarding"
              className="flex-1 text-center rounded-xl bg-brand hover:bg-brand-strong text-white font-semibold py-3 transition"
            >
              Mulai Diagnostik →
            </Link>
          )}
          <Link
            href="/"
            className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-5 text-center transition"
          >
            Beranda
          </Link>
        </div>
      </main>
    );
  }

  return null;
}
