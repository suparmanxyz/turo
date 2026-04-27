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

type Progress = {
  stage: "locator" | "coverage" | "deep" | "selesai";
  itemsAnswered: number;
  estimatedTotal: number;
  label: string;
};

type StoredState = {
  state: unknown;
  nextItem: SanitizedItem | null;
  progress: Progress;
  startedAt: number;
};

export default function OnboardingTestPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(props.params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stored, setStored] = useState<StoredState | null>(null);
  const [pilihIdx, setPilihIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemStartTime = useRef<number>(Date.now());

  useEffect(() => {
    const raw = sessionStorage.getItem(`onboarding-${sessionId}`);
    if (!raw) {
      setError("Session tidak ditemukan. Mulai ulang dari /onboarding.");
      return;
    }
    setStored(JSON.parse(raw));
    itemStartTime.current = Date.now();
  }, [sessionId]);

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user) return <main className="p-8"><Link href="/login" className="text-brand underline">Login dulu</Link></main>;
  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-rose-600 mb-4">{error}</p>
        <Link href="/onboarding" className="text-brand underline">← Mulai ulang</Link>
      </main>
    );
  }
  if (!stored) return <main className="p-8 text-slate-500">Memuat sesi...</main>;
  if (!stored.nextItem) {
    // Should redirect to result
    router.replace(`/onboarding/hasil/${sessionId}`);
    return <main className="p-8 text-slate-500">Mengarahkan ke hasil...</main>;
  }

  const item = stored.nextItem;
  const progress = stored.progress;
  const progressPct = Math.min(100, (progress.itemsAnswered / Math.max(1, progress.estimatedTotal)) * 100);

  async function submit() {
    if (pilihIdx === null || !user || !stored) return;
    setSubmitting(true);
    setError(null);
    try {
      const responseTimeMs = Date.now() - itemStartTime.current;
      const idToken = await user.getIdToken();
      const res = await fetch("/api/onboarding/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          sessionId,
          state: stored.state,
          itemId: item.id,
          pilihIdx,
          responseTimeMs,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }
      const data = await res.json();
      const newStored: StoredState = {
        state: data.state,
        nextItem: data.nextItem,
        progress: data.progress,
        startedAt: stored.startedAt,
      };
      sessionStorage.setItem(`onboarding-${sessionId}`, JSON.stringify(newStored));
      setStored(newStored);
      setPilihIdx(null);
      itemStartTime.current = Date.now();
      if (data.done) {
        router.push(`/onboarding/hasil/${sessionId}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-slate-700">{progress.label}</span>
          <span className="text-slate-500">{progress.itemsAnswered} / ~{progress.estimatedTotal}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-brand transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Soal */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 mb-4">
        <div className="text-xs text-slate-400 mb-3 font-mono">{item.subMateriKode}</div>
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
              disabled={submitting}
              className={`w-full text-left rounded-xl border-2 px-4 py-3 transition flex items-start gap-3 ${
                pilihIdx === i
                  ? "border-brand bg-brand-soft"
                  : "border-slate-200 hover:border-slate-300 bg-white"
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

      {error && <div className="rounded-lg bg-rose-50 text-rose-700 border border-rose-200 p-3 text-sm mb-4">{error}</div>}

      <button
        onClick={submit}
        disabled={pilihIdx === null || submitting}
        className="w-full rounded-xl bg-brand hover:bg-brand-strong text-white font-semibold py-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Memproses..." : "Lanjut →"}
      </button>
    </main>
  );
}
