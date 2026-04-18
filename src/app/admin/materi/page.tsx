"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { DAFTAR_MATERI } from "@/data/materi";
import { JENJANG_LABEL, KATEGORI_UTAMA_LABEL, KATEGORI_UTAMA_URUT, type KategoriUtama } from "@/types";

export default function AdminMateriListPage() {
  const { user, loading } = useAuth();
  const [filterKu, setFilterKu] = useState<KategoriUtama | "all">("all");
  const [search, setSearch] = useState("");

  const items = useMemo(() => {
    return DAFTAR_MATERI.filter((m) => {
      if (filterKu !== "all" && m.kategoriUtama !== filterKu) return false;
      if (search && !m.nama.toLowerCase().includes(search.toLowerCase()) && !m.slug.includes(search.toLowerCase())) return false;
      return true;
    });
  }, [filterKu, search]);

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
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-2">Materi & Pohon Prasyarat</h1>
      <p className="text-muted mb-6">{items.length} materi · klik untuk lihat pohon & sub-topik.</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterKu}
          onChange={(e) => setFilterKu(e.target.value as KategoriUtama | "all")}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">Semua kategori</option>
          {KATEGORI_UTAMA_URUT.map((k) => (
            <option key={k} value={k}>{KATEGORI_UTAMA_LABEL[k]}</option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Cari nama atau slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Materi</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Jenjang</th>
              <th className="px-4 py-3">Kelas</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.slug} className="border-t border-slate-100 hover:bg-brand-soft/30 transition">
                <td className="px-4 py-3 font-medium">{m.nama}</td>
                <td className="px-4 py-3 text-slate-600">{KATEGORI_UTAMA_LABEL[m.kategoriUtama]}</td>
                <td className="px-4 py-3 text-slate-600">{m.jenjang ? JENJANG_LABEL[m.jenjang] : "—"}</td>
                <td className="px-4 py-3 text-slate-600">{m.kelas ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-400 font-mono">{m.slug}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/materi/${m.slug}`} className="text-brand hover:underline font-medium">
                    Detail →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
