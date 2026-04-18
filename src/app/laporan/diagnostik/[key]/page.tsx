"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { formatDurasi, loadDiagnostik, type LaporanDiagnostik } from "@/lib/laporan";
import { DAFTAR_MATERI } from "@/data/materi";
import { TEMA_KATEGORI_UTAMA, temaUntukMateri } from "@/lib/kategori-tema";
import { MathText } from "@/components/MathText";
import { JENJANG_LABEL, KATEGORI_UTAMA_LABEL } from "@/types";

function formatTanggal(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts || typeof ts.toDate !== "function") return "—";
  return ts.toDate().toLocaleString("id-ID", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function DetailDiagnostikPage(props: { params: Promise<{ key: string }> }) {
  const { key: rawKey } = use(props.params);
  const key = decodeURIComponent(rawKey);
  const { user, loading } = useAuth();
  const [data, setData] = useState<LaporanDiagnostik | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [tidakAda, setTidakAda] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadDiagnostik(user.uid, key).then((d) => {
      if (!d) setTidakAda(true);
      else setData(d);
      setMemuat(false);
    });
  }, [user, key]);

  if (loading || memuat) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-slate-500 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
        Memuat...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-slate-600 mb-4">Login dulu.</p>
        <Link href="/" className="text-brand underline">← Beranda</Link>
      </main>
    );
  }

  if (tidakAda || !data) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-slate-600 mb-4">Hasil diagnostik tidak ditemukan.</p>
        <Link href="/laporan" className="text-brand underline">← Kembali ke Laporan</Link>
      </main>
    );
  }

  const materi = DAFTAR_MATERI.find((m) => m.slug === data.materiSlug);
  const t = materi ? temaUntukMateri(materi) : TEMA_KATEGORI_UTAMA.reguler;
  const persen = data.skorTotal > 0 ? Math.round((data.skorBenar / data.skorTotal) * 100) : 0;

  const konteksLabel = (() => {
    const a = data.audiens;
    if (a.kategoriUtama === "snbt") return KATEGORI_UTAMA_LABEL.snbt;
    if (a.kategoriUtama === "olimpiade")
      return `${KATEGORI_UTAMA_LABEL.olimpiade}${a.jenjang ? ` · ${JENJANG_LABEL[a.jenjang]}` : ""}`;
    const parts = [KATEGORI_UTAMA_LABEL.reguler];
    if (a.jenjang) parts.push(JENJANG_LABEL[a.jenjang]);
    if (a.kelas) parts.push(`Kelas ${a.kelas}`);
    return parts.join(" · ");
  })();

  const soalSalah = data.jawabanRiwayat.filter((s) => !s.benar);

  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-10">
      <Link href="/laporan" className="text-sm text-slate-500 hover:text-brand inline-flex items-center gap-1 transition">
        ← Laporan
      </Link>

      <div className={`relative overflow-hidden rounded-3xl ${t.gradient} ${t.shadow} shadow-xl text-white p-6 mt-3 mb-6 animate-rise`}>
        <div className="text-xs font-medium text-white/80 uppercase tracking-wider mb-1">
          {data.jenis === "post-test" ? "Post-Test" : "Diagnostik"} · {konteksLabel}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-1">{data.materiNama}</h1>
        <p className="text-white/85 text-sm">{formatTanggal(data.createdAt)}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="rounded-xl bg-white/15 backdrop-blur p-3 ring-1 ring-white/20">
            <div className="text-3xl font-bold">{persen}%</div>
            <div className="text-xs opacity-80">{data.skorBenar}/{data.skorTotal} benar</div>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur p-3 ring-1 ring-white/20">
            <div className="text-3xl font-bold">{data.pohonOk}</div>
            <div className="text-xs opacity-80">cabang dikuasai</div>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur p-3 ring-1 ring-white/20">
            <div className="text-3xl font-bold">{data.perluBelajar.length}</div>
            <div className="text-xs opacity-80">topik perlu dipelajari</div>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur p-3 ring-1 ring-white/20">
            <div className="text-3xl font-bold">{formatDurasi(data.waktuTotalMs)}</div>
            <div className="text-xs opacity-80">total waktu</div>
          </div>
        </div>
      </div>

      {data.perluBelajar.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${t.gradient}`} />
            Rencana Belajar
          </h2>
          <p className="text-sm text-slate-600 mb-4">Mulai dari topik paling dasar (level besar = dasar).</p>
          <div className="space-y-3">
            {data.perluBelajar
              .slice()
              .sort((a, b) => b.level - a.level)
              .map((n, i) => (
                <div key={n.nodeId} className={`rounded-2xl border-2 ${t.border} ${t.bgSoft} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 text-xs flex-wrap">
                        <span className="px-2 py-0.5 bg-white/70 rounded-full font-medium text-slate-600">#{i + 1}</span>
                        <span className="text-slate-500">level {n.level}</span>
                        {n.linkedSlug && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium text-[10px]">
                            🔗 {n.linkedNama ?? "ada bab"}
                          </span>
                        )}
                      </div>
                      <h4 className={`font-bold ${t.textStrong}`}>{n.topik}</h4>
                      {n.subKonsep && n.subKonsep.length > 0 && (
                        <ul className="mt-1 text-xs text-slate-600 list-disc list-inside">
                          {n.subKonsep.map((sk, j) => (<li key={j}>{sk}</li>))}
                        </ul>
                      )}
                    </div>
                    {materi && (
                      <Link
                        href={n.linkedSlug ? `/materi/${n.linkedSlug}` : `/latihan/${materi.slug}/konsep`}
                        className={`shrink-0 rounded-lg ${t.gradient} text-white px-3 py-1.5 text-sm font-medium`}
                      >
                        {n.linkedSlug ? "Buka bab" : "Latihan"} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ) : (
        <section className={`mb-8 rounded-2xl border-2 ${t.border} ${t.bgSoft} p-6 text-center`}>
          <div className="text-4xl mb-2">🎉</div>
          <p className={`font-bold text-lg ${t.textStrong}`}>Semua prasyarat dikuasai</p>
        </section>
      )}

      {soalSalah.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3">Detail Jawaban Salah</h2>
          <p className="text-sm text-slate-600 mb-4">
            Miskonsepsi yang umumnya menyebabkan tiap pilihan salah.
          </p>
          <div className="space-y-3">
            {soalSalah.map((s, i) => {
              const dipilih = s.opsi[s.jawabanIdx];
              const benar = s.opsi.find((o) => o.benar);
              return (
                <details key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer font-medium flex items-start gap-2">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs">✗ {i + 1}</span>
                    <span className="text-slate-700 flex-1"><MathText>{s.pertanyaan}</MathText></span>
                    {s.waktuMs !== undefined && (
                      <span className="text-xs text-slate-500 shrink-0">⏱ {formatDurasi(s.waktuMs)}</span>
                    )}
                  </summary>
                  <div className="mt-3 text-sm space-y-2">
                    {s.nodeTopik && (
                      <p className="text-xs text-slate-500">Topik: {s.nodeTopik}</p>
                    )}
                    <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5">
                      <strong className="text-rose-700">Pilihan kamu ({String.fromCharCode(65 + s.jawabanIdx)}):</strong>{" "}
                      <MathText>{dipilih?.teks ?? ""}</MathText>
                      {dipilih?.alasan && <p className="text-xs text-rose-600 mt-1 italic">⚠ {dipilih.alasan}</p>}
                    </div>
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5">
                      <strong className="text-emerald-700">Jawaban benar:</strong>{" "}
                      <MathText>{benar?.teks ?? ""}</MathText>
                      {benar?.alasan && <p className="text-xs text-emerald-700 mt-1">{benar.alasan}</p>}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
