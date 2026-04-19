"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { authedFetch } from "@/lib/authed-fetch";
import { formatDurasi } from "@/lib/laporan";
import { MathText } from "@/components/MathText";

type JawabanRiwayat = {
  pertanyaan: string;
  opsi: { teks: string; benar: boolean; alasan?: string }[];
  jawabanIdx: number;
  benar: boolean;
  nodeTopik?: string;
  waktuMs?: number;
  svg?: string;
};

type Detail = {
  jenis: string;
  materiSlug: string;
  materiNama: string;
  skorBenar: number;
  skorTotal: number;
  waktuTotalMs?: number;
  jawabanRiwayat: JawabanRiwayat[];
  perluBelajar?: { nodeId: string; topik: string; level: number; subKonsep?: string[] }[];
};

export default function AdminDiagnostikDetailPage(props: { params: Promise<{ uid: string; key: string }> }) {
  const { uid: rawUid, key: rawKey } = use(props.params);
  const uid = decodeURIComponent(rawUid);
  const key = decodeURIComponent(rawKey);

  const { user, loading } = useAuth();
  const [data, setData] = useState<Detail | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdminEmail(user.email)) return;
    setMemuat(true);
    authedFetch(`/api/admin/diagnostik-detail?uid=${encodeURIComponent(uid)}&key=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "gagal"))
      .finally(() => setMemuat(false));
  }, [user, uid, key]);

  if (loading || memuat) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user || !isAdminEmail(user.email)) {
    return <main className="mx-auto max-w-3xl p-8 text-center"><p className="text-rose-600">⛔ Akses ditolak</p></main>;
  }
  if (error || !data) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-rose-600">{error ?? "Tidak ditemukan"}</p>
        <Link href="/admin/diagnostik" className="text-brand underline">← List Diagnostik</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6 sm:p-10">
      <Link href="/admin/diagnostik" className="text-sm text-slate-500 hover:text-brand inline-flex items-center gap-1 transition">
        ← List Diagnostik
      </Link>

      <h1 className="text-3xl font-extrabold tracking-tight mt-3 mb-1">{data.materiNama}</h1>
      <p className="text-muted text-sm mb-6">
        {data.jenis} · skor {data.skorBenar}/{data.skorTotal} · {data.jawabanRiwayat.length} soal · ⏱ total {formatDurasi(data.waktuTotalMs)} · UID <code className="text-[10px]">{uid.slice(0, 12)}…</code>
      </p>

      <h2 className="text-xl font-bold mb-3">Soal-soal Hasil Generate AI</h2>
      <p className="text-sm text-slate-600 mb-4">
        Periksa validitas tiap soal: pertanyaan, jawaban benar, dan distractor analitis (miskonsepsi).
      </p>

      <div className="space-y-4">
        {data.jawabanRiwayat.map((s, i) => {
          const dipilih = s.opsi[s.jawabanIdx];
          return (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
                <span className={`px-2 py-0.5 rounded-full font-medium ${s.benar ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {s.benar ? "✓ User benar" : "✗ User salah"}
                </span>
                {s.nodeTopik && <span className="text-slate-500">{s.nodeTopik}</span>}
                {s.waktuMs !== undefined && <span className="text-slate-500">⏱ {formatDurasi(s.waktuMs)}</span>}
                <span className="text-slate-400 ml-auto">#{i + 1}</span>
              </div>
              <div className="font-medium mb-3 leading-relaxed">
                <MathText>{s.pertanyaan}</MathText>
              </div>
              {s.svg && (
                <div
                  className="mb-3 flex justify-center bg-slate-50 rounded-lg p-3 [&_svg]:max-w-full [&_svg]:h-auto"
                  dangerouslySetInnerHTML={{ __html: s.svg }}
                />
              )}
              <ul className="space-y-2 text-sm">
                {s.opsi.map((o, idx) => {
                  const userPilih = idx === s.jawabanIdx;
                  return (
                    <li
                      key={idx}
                      className={`rounded-lg border p-2.5 ${
                        o.benar
                          ? "border-emerald-300 bg-emerald-50"
                          : userPilih
                          ? "border-rose-300 bg-rose-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-bold w-5 shrink-0">{String.fromCharCode(65 + idx)}.</span>
                        <div className="flex-1">
                          <div><MathText>{o.teks}</MathText></div>
                          {o.alasan && (
                            <div className="text-xs italic mt-1 text-slate-600">
                              {o.benar ? "✓ " : "⚠ "} <MathText>{o.alasan}</MathText>
                            </div>
                          )}
                        </div>
                        {o.benar && <span className="text-xs text-emerald-700 font-bold">BENAR</span>}
                        {userPilih && !o.benar && <span className="text-xs text-rose-700 font-bold">DIPILIH</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </main>
  );
}
