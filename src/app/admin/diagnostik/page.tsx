"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { authedFetch } from "@/lib/authed-fetch";

type Item = {
  uid: string;
  key: string;
  materiSlug: string;
  materiNama: string;
  jenis: "diagnostik" | "post-test";
  skorBenar: number;
  skorTotal: number;
  pohonOk: number;
  perluBelajarCount: number;
  soalCount: number;
  createdAt?: { _seconds: number } | null;
};

function formatTanggal(ts: Item["createdAt"]): string {
  if (!ts || typeof ts._seconds !== "number") return "—";
  return new Date(ts._seconds * 1000).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminDiagnostikListPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdminEmail(user.email)) return;
    setMemuat(true);
    authedFetch("/api/admin/list-diagnostik")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setItems(d.items ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "gagal"))
      .finally(() => setMemuat(false));
  }, [user]);

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user || !isAdminEmail(user.email)) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-rose-600">⛔ Akses ditolak</p>
        <Link href="/" className="text-brand underline">← Beranda</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-brand inline-flex items-center gap-1 transition">← Admin</Link>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-2">Soal Diagnostik (Validasi)</h1>
      <p className="text-muted mb-6">{items.length} hasil tes diagnostik · klik untuk inspeksi soal & jawaban.</p>

      {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-sm">{error}</div>}

      {memuat ? (
        <p className="text-slate-500 text-sm">Memuat...</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Belum ada hasil diagnostik tersimpan.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Materi</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">Skor</th>
                <th className="px-4 py-3">Soal</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">UID</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const persen = it.skorTotal > 0 ? Math.round((it.skorBenar / it.skorTotal) * 100) : 0;
                return (
                  <tr key={`${it.uid}__${it.key}`} className="border-t border-slate-100 hover:bg-brand-soft/30 transition">
                    <td className="px-4 py-3 font-medium">{it.materiNama}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${it.jenis === "post-test" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}`}>
                        {it.jenis}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{it.skorBenar}/{it.skorTotal} <span className="text-xs text-slate-400">({persen}%)</span></td>
                    <td className="px-4 py-3 text-slate-600">{it.soalCount}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatTanggal(it.createdAt)}</td>
                    <td className="px-4 py-3 text-[10px] font-mono text-slate-400 truncate max-w-[120px]">{it.uid.slice(0, 12)}…</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/diagnostik/${encodeURIComponent(it.uid)}/${encodeURIComponent(it.key)}`}
                        className="text-brand hover:underline font-medium text-sm"
                      >
                        Lihat →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
