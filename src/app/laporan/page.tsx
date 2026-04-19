"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatDurasi,
  listDiagnostik,
  listSesiLatihan,
  type DiagnostikRingkas,
  type SesiLatihanRingkas,
} from "@/lib/laporan";
import { DAFTAR_MATERI, cariSubMateri } from "@/data/materi";
import { TEMA_KATEGORI_UTAMA, temaUntukMateri } from "@/lib/kategori-tema";

function formatTanggal(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts || typeof ts.toDate !== "function") return "—";
  const d = ts.toDate();
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LaporanPage() {
  const { user, loading } = useAuth();
  const [diagnostik, setDiagnostik] = useState<DiagnostikRingkas[]>([]);
  const [sesi, setSesi] = useState<SesiLatihanRingkas[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Reset state SEBELUM fetch — biar tidak ada residu data dari user sebelumnya
    setDiagnostik([]);
    setSesi([]);
    setMemuat(true);
    setError(null);
    const uidSnapshot = user.uid; // capture untuk validasi race condition
    Promise.allSettled([listDiagnostik(uidSnapshot), listSesiLatihan(uidSnapshot)]).then((results) => {
      // Kalau user sudah ganti sebelum fetch selesai, abaikan hasilnya
      if (uidSnapshot !== user.uid) return;
      const errors: string[] = [];
      if (results[0].status === "fulfilled") setDiagnostik(results[0].value);
      else errors.push(`Diagnostik: ${results[0].reason instanceof Error ? results[0].reason.message : results[0].reason}`);
      if (results[1].status === "fulfilled") setSesi(results[1].value);
      else errors.push(`Sesi latihan: ${results[1].reason instanceof Error ? results[1].reason.message : results[1].reason}`);
      if (errors.length > 0) setError(errors.join("\n"));
      setMemuat(false);
    });
  }, [user]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-8 text-slate-500">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
          Memuat...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-slate-600 mb-4">Login dulu untuk melihat laporan belajar kamu.</p>
        <Link href="/" className="text-brand underline">← Beranda</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6 sm:p-10">
      <div className="mb-8 animate-rise">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          riwayat & progres
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Laporan Belajar<span className="text-brand">.</span>
        </h1>
        <p className="text-muted mt-2 max-w-xl">
          Ringkasan diagnostik, latihan, dan post-test kamu.
        </p>
        <p className="text-[10px] text-slate-400 mt-1 font-mono">
          akun: {user.email} · uid: {user.uid.slice(0, 12)}…
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 whitespace-pre-wrap">
          <strong>Gagal memuat data:</strong>
          <div className="mt-1 font-mono text-xs">{error}</div>
          <p className="mt-2 text-xs">Kemungkinan: missing index Firestore atau permission rules. Cek browser console untuk detail.</p>
        </div>
      )}

      {/* ── Statistik ringkas ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <Stat label="Diagnostik" value={diagnostik.length} />
        <Stat label="Sesi Latihan" value={sesi.length} />
        <Stat
          label="Total Soal Dijawab"
          value={sesi.reduce((s, x) => s + x.jumlahDijawab, 0) +
            diagnostik.reduce((s, x) => s + x.skorTotal, 0)}
        />
        <Stat
          label="Total Benar"
          value={sesi.reduce((s, x) => s + x.jumlahBenar, 0) +
            diagnostik.reduce((s, x) => s + x.skorBenar, 0)}
        />
      </div>

      {/* ── Diagnostik ── */}
      <Section judul="🎯 Hasil Diagnostik" memuat={memuat} kosong={diagnostik.length === 0}>
        <div className="grid gap-3 md:grid-cols-2">
          {diagnostik.map((d) => {
            const materi = DAFTAR_MATERI.find((m) => m.slug === d.materiSlug);
            const t = materi ? temaUntukMateri(materi) : TEMA_KATEGORI_UTAMA.reguler;
            const persen = d.skorTotal > 0 ? Math.round((d.skorBenar / d.skorTotal) * 100) : 0;
            return (
              <Link
                key={d.key}
                href={`/laporan/diagnostik/${encodeURIComponent(d.key)}`}
                className="group block rounded-2xl bg-white border border-slate-200 hover:border-brand hover:shadow-lg hover:-translate-y-0.5 transition-all p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className={`inline-flex items-center gap-1.5 rounded-full ${t.badge} px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium mb-1`}>
                      {d.jenis === "post-test" ? "Post-test" : "Diagnostik"}
                    </div>
                    <h3 className="font-semibold group-hover:text-brand transition truncate">
                      {d.materiNama}
                    </h3>
                  </div>
                  <span className={`shrink-0 grid place-items-center rounded-xl ${t.bgSoftStrong} ${t.text} h-12 w-12 font-bold text-sm`}>
                    {persen}%
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  <span>📝 {d.skorBenar}/{d.skorTotal} benar</span>
                  <span>✅ {d.pohonOk} cabang dikuasai</span>
                  <span>📚 {d.perluBelajar.length} perlu dipelajari</span>
                  {d.waktuTotalMs !== undefined && <span>⏱ {formatDurasi(d.waktuTotalMs)}</span>}
                </div>
                <div className="text-[11px] text-slate-400 mt-2">{formatTanggal(d.createdAt)}</div>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* ── Sesi latihan ── */}
      <Section judul="📝 Sesi Latihan" memuat={memuat} kosong={sesi.length === 0}>
        <div className="grid gap-3 md:grid-cols-2">
          {sesi.map((s) => {
            const materi = DAFTAR_MATERI.find((m) => m.slug === s.materiSlug);
            const sub = cariSubMateri(s.materiSlug, s.subMateriSlug);
            const t = materi ? temaUntukMateri(materi) : TEMA_KATEGORI_UTAMA.reguler;
            const persen = s.jumlahDijawab > 0 ? Math.round((s.jumlahBenar / s.jumlahDijawab) * 100) : 0;
            return (
              <Link
                key={s.key}
                href={`/latihan/${s.materiSlug}/${s.subMateriSlug}`}
                className="group block rounded-2xl bg-white border border-slate-200 hover:border-brand hover:shadow-lg hover:-translate-y-0.5 transition-all p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className={`inline-flex items-center gap-1.5 rounded-full ${t.badge} px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium mb-1`}>
                      Latihan · mode {s.mode}
                    </div>
                    <h3 className="font-semibold group-hover:text-brand transition truncate">
                      {materi?.nama ?? s.materiSlug}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{sub?.nama ?? s.subMateriSlug}</p>
                  </div>
                  <span className={`shrink-0 grid place-items-center rounded-xl ${t.bgSoftStrong} ${t.text} h-12 w-12 font-bold text-sm`}>
                    {persen}%
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  <span>📝 {s.jumlahBenar}/{s.jumlahDijawab} benar</span>
                  <span>✅ {s.jumlahNodesSelesai} prasyarat dikuasai</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">{formatTanggal(s.updatedAt)}</div>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* ── Post-test placeholder ── */}
      <Section judul="🎓 Post-Test (segera hadir)" memuat={false} kosong={true}>
        <p className="text-sm text-slate-500">
          Setelah selesai mempelajari satu materi, kamu bisa ambil post-test untuk mengukur peningkatan.
          Fitur ini sedang disiapkan.
        </p>
      </Section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="text-3xl font-extrabold text-brand">{value}</div>
      <div className="text-xs text-slate-600 mt-1">{label}</div>
    </div>
  );
}

function Section({
  judul,
  memuat,
  kosong,
  children,
}: {
  judul: string;
  memuat: boolean;
  kosong: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-4">{judul}</h2>
      {memuat ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-400">Memuat...</div>
      ) : kosong ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          {children ?? <p className="text-slate-500 text-sm">Belum ada data.</p>}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
