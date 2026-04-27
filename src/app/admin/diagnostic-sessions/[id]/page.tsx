"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { MathText } from "@/components/MathText";

type SessionDoc = {
  id: string;
  uid: string;
  jalur: string;
  stage: string;
  thetaGlobal?: number;
  seGlobal?: number;
  kelasEstimasi?: number;
  hasilLocator?: { theta: number; se: number; kelasEstimasi: number; itemsUsed: number };
  hasilCoverage?: {
    thetaGlobal: number;
    seGlobal: number;
    itemsUsed: number;
    perArea: { area: string; theta: number; se: number; status: string }[];
    areaSuspect: string[];
  };
  hasilDeep?: {
    itemsUsed: number;
    masteryCount: { siap: number; review: number; remediasi: number; unknown: number };
    remediasiKodes: string[];
  };
  itemsAnswered: number;
  itemsSkipped: number;
  startedAt: number;
  finishedAt?: number;
};

type EnrichedResponse = {
  id: string;
  itemId: string;
  subMateriKode: string;
  area: string;
  stage: string;
  correct: boolean;
  pilihIdx?: number;
  responseTimeMs: number;
  thetaAfter?: number;
  seAfter?: number;
  createdAt: number;
  sub?: {
    kode: string;
    nama: string;
    jenjang: string;
    kelas: number;
    area: string;
    bab_nama: string;
    is_maku: boolean;
    label: string;
    strict: boolean;
  };
  item?: {
    id: string;
    b: number;
    a: number;
    c: number;
    format: string;
    calibrationN: number;
    konten: {
      pertanyaan: string;
      opsi: { teks: string; benar: boolean; alasan?: string }[];
      kunci: number;
      svg?: string;
    };
  };
};

const STAGE_COLOR: Record<string, string> = {
  "fast-locator": "bg-sky-100 text-sky-700",
  "fast-coverage": "bg-violet-100 text-violet-700",
  deep: "bg-amber-100 text-amber-700",
  selesai: "bg-emerald-100 text-emerald-700",
};

export default function AdminDiagnosticSessionDetail(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const { user, loading } = useAuth();
  const [data, setData] = useState<{ session: SessionDoc; responses: EnrichedResponse[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdminEmail(user.email)) return;
    async function load() {
      try {
        const idToken = await user!.getIdToken();
        const res = await fetch(`/api/admin/diagnostic-sessions/${id}`, {
          headers: { authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
  }, [user, id]);

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user || !isAdminEmail(user.email)) {
    return <main className="mx-auto max-w-3xl p-8 text-center"><p className="text-rose-600">⛔ Akses ditolak</p></main>;
  }
  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <Link href="/admin/diagnostic-sessions" className="text-sm text-slate-500 hover:text-brand">← Sesi Diagnostik</Link>
        <p className="text-rose-600 mt-4">{error}</p>
      </main>
    );
  }
  if (!data) return <main className="p-8 text-slate-500">Memuat detail...</main>;

  const { session, responses } = data;
  // Group responses by stage untuk audit
  const byStage = new Map<string, EnrichedResponse[]>();
  for (const r of responses) {
    if (!byStage.has(r.stage)) byStage.set(r.stage, []);
    byStage.get(r.stage)!.push(r);
  }

  return (
    <main className="mx-auto max-w-5xl p-6 sm:p-10">
      <Link href="/admin/diagnostic-sessions" className="text-sm text-slate-500 hover:text-brand">← Sesi Diagnostik</Link>

      {/* Header */}
      <div className="mt-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2 text-xs">
          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{session.id}</span>
          <span className={`px-1.5 py-0.5 rounded ${STAGE_COLOR[session.stage] ?? "bg-slate-100"}`}>{session.stage}</span>
          <span className="text-slate-500">{session.jalur}</span>
          <span className="font-mono text-slate-500" title={session.uid}>uid:{session.uid.slice(0, 10)}...</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Sesi Diagnostik</h1>
        <p className="text-muted text-sm mt-1">
          Mulai: {new Date(session.startedAt).toLocaleString("id-ID")}
          {session.finishedAt && <> · Selesai: {new Date(session.finishedAt).toLocaleString("id-ID")} · Durasi: {Math.round((session.finishedAt - session.startedAt) / 60000)} menit</>}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card title="Items Dijawab" value={String(session.itemsAnswered)} />
        <Card title="Items Skip" value={String(session.itemsSkipped)} />
        <Card title="θ Global" value={session.thetaGlobal !== undefined ? session.thetaGlobal.toFixed(2) : "—"} />
        <Card title="Kelas Estimasi" value={session.kelasEstimasi !== undefined ? session.kelasEstimasi.toFixed(1) : "—"} />
      </div>

      {/* Hasil per stage */}
      {session.hasilCoverage && session.hasilCoverage.perArea.length > 0 && (
        <section className="mb-6">
          <h3 className="font-bold text-sm mb-2">Profil Per Area (Coverage)</h3>
          <div className="rounded-2xl bg-white border border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {session.hasilCoverage.perArea.map((p) => (
              <div key={p.area} className="flex items-center justify-between gap-2 p-2 rounded bg-slate-50">
                <span className="font-medium">{p.area}</span>
                <span className="font-mono text-slate-500">θ={p.theta.toFixed(2)}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  p.status === "kuat" ? "bg-emerald-100 text-emerald-700" :
                  p.status === "cukup" ? "bg-amber-100 text-amber-700" :
                  p.status === "lemah" ? "bg-rose-100 text-rose-700" :
                  "bg-slate-100 text-slate-500"
                }`}>{p.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {session.hasilDeep && (
        <section className="mb-6">
          <h3 className="font-bold text-sm mb-2">Mastery Distribution (Deep)</h3>
          <div className="rounded-2xl bg-white border border-slate-200 p-4 grid grid-cols-4 gap-2 text-center text-xs">
            {(["siap", "review", "remediasi", "unknown"] as const).map((s) => (
              <div key={s} className="p-2 rounded bg-slate-50">
                <div className="text-2xl font-bold">{session.hasilDeep!.masteryCount[s]}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">{s}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Responses per stage */}
      <h2 className="text-xl font-bold mb-3">Soal & Jawaban ({responses.length})</h2>
      {Array.from(byStage.entries()).map(([stage, rs]) => (
        <section key={stage} className="mb-6">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs ${STAGE_COLOR[stage] ?? "bg-slate-100"}`}>{stage}</span>
            <span className="text-slate-400 text-xs">({rs.length} soal)</span>
          </h3>
          <div className="space-y-3">
            {rs.map((r, idx) => (
              <article
                key={r.id}
                className={`rounded-2xl border-2 p-4 ${r.correct ? "border-emerald-200 bg-emerald-50/30" : "border-rose-200 bg-rose-50/30"}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-700">#{idx + 1}</span>
                    {r.sub && (
                      <>
                        <span className="font-medium">{r.sub.nama}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">{r.sub.jenjang} K{r.sub.kelas}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{r.sub.area}</span>
                        {r.sub.is_maku && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">MAKU</span>}
                        {!r.sub.strict && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700" title={r.sub.label}>non-strict</span>}
                      </>
                    )}
                    <code className="font-mono text-[10px] text-slate-400">{r.subMateriKode}</code>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    {r.item && <span className="font-mono text-slate-500">b={r.item.b.toFixed(2)} · a={r.item.a.toFixed(1)}</span>}
                    <span className="text-slate-500">⏱ {(r.responseTimeMs / 1000).toFixed(1)}s</span>
                    {r.thetaAfter !== undefined && <span className="font-mono text-violet-600">→ θ={r.thetaAfter.toFixed(2)}</span>}
                  </div>
                </div>

                {r.item ? (
                  <>
                    {r.item.konten.svg && (
                      <div className="mb-3 flex justify-center" dangerouslySetInnerHTML={{ __html: r.item.konten.svg }} />
                    )}
                    <div className="text-sm mb-3">
                      <MathText>{r.item.konten.pertanyaan}</MathText>
                    </div>
                    <div className="space-y-1.5">
                      {r.item.konten.opsi.map((o, i) => {
                        const isKunci = i === r.item!.konten.kunci;
                        const isPilih = i === r.pilihIdx;
                        return (
                          <div
                            key={i}
                            className={`rounded-lg border p-2 text-xs flex items-start gap-2 ${
                              isKunci && isPilih ? "border-emerald-400 bg-emerald-100" :
                              isKunci ? "border-emerald-300 bg-emerald-50" :
                              isPilih ? "border-rose-400 bg-rose-100" :
                              "border-slate-200 bg-white"
                            }`}
                          >
                            <span className={`shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] ${
                              isKunci ? "bg-emerald-600 text-white" : isPilih ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"
                            }`}>{String.fromCharCode(65 + i)}</span>
                            <div className="flex-1 min-w-0">
                              <div><MathText>{o.teks}</MathText></div>
                              {o.alasan && (
                                <div className={`text-[10px] mt-0.5 ${isKunci ? "text-emerald-700" : "text-rose-600"}`}>
                                  {isKunci ? "✓" : "miskonsepsi:"} {o.alasan}
                                </div>
                              )}
                              <div className="text-[9px] text-slate-400 mt-0.5">
                                {isKunci && "← kunci"}
                                {isPilih && !isKunci && "← user pilih"}
                                {isPilih && isKunci && "← pilihan user (BENAR)"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-400 italic">Item {r.itemId.slice(0, 12)} tidak ditemukan di item bank (mungkin dihapus).</div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-3">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{title}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
}
