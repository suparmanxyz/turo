"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { DAFTAR_MATERI } from "@/data/materi";
import { JENJANG_LABEL, KATEGORI_UTAMA_LABEL, KATEGORI_UTAMA_URUT, type KategoriUtama, type Jenjang } from "@/types";

type Status = "pending" | "running" | "subtopik-ok" | "peta-ok" | "selesai" | "error";

type Item = {
  slug: string;
  nama: string;
  kategoriUtama: KategoriUtama;
  jenjang?: Jenjang;
  kelas?: number;
  status: Status;
  subTopikCount?: number;
  petaNodeCount?: number;
  error?: string;
};

const CONCURRENCY = 3;

export default function PrecomputePage() {
  const { user, loading } = useAuth();
  const [filterKu, setFilterKu] = useState<KategoriUtama | "all">("all");
  const [filterJ, setFilterJ] = useState<Jenjang | "all">("all");
  const [force, setForce] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [berjalan, setBerjalan] = useState(false);
  const [logTeks, setLogTeks] = useState<string[]>([]);

  const target = useMemo(() => {
    return DAFTAR_MATERI.filter((m) => {
      if (filterKu !== "all" && m.kategoriUtama !== filterKu) return false;
      if (filterJ !== "all" && m.jenjang !== filterJ) return false;
      return true;
    });
  }, [filterKu, filterJ]);

  function tambahLog(s: string) {
    setLogTeks((l) => [...l.slice(-200), s]);
  }

  function updateItem(slug: string, patch: Partial<Item>) {
    setItems((arr) => arr.map((it) => (it.slug === slug ? { ...it, ...patch } : it)));
  }

  async function generateSatu(it: Item): Promise<void> {
    updateItem(it.slug, { status: "running" });
    try {
      // 1. Sub-topik
      const r1 = await fetch("/api/generate-sub-topik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materiSlug: it.slug,
          materiNama: it.nama,
          kategoriUtama: it.kategoriUtama,
          jenjang: it.jenjang,
          kelas: it.kelas,
          force,
        }),
      });
      if (!r1.ok) throw new Error(`sub-topik HTTP ${r1.status}`);
      const d1 = await r1.json();
      const subCount = d1.subTopik?.length ?? 0;
      updateItem(it.slug, { status: "subtopik-ok", subTopikCount: subCount });
      tambahLog(`✓ ${it.slug} sub-topik (${subCount}${d1._cached ? " cache" : " baru"})`);

      // 2. Peta prasyarat
      const r2 = await fetch("/api/peta-prasyarat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subMateri: it.nama,
          kategoriUtama: it.kategoriUtama,
          jenjang: it.jenjang,
          kelas: it.kelas,
          force,
        }),
      });
      if (!r2.ok) throw new Error(`peta HTTP ${r2.status}`);
      const d2 = await r2.json();
      const petaCount = Array.isArray(d2.nodes) ? d2.nodes.length : 0;
      updateItem(it.slug, { status: "selesai", petaNodeCount: petaCount });
      tambahLog(`✓ ${it.slug} peta (${petaCount} node${d2._cached ? " cache" : " baru"})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      updateItem(it.slug, { status: "error", error: msg });
      tambahLog(`✗ ${it.slug} ERROR: ${msg}`);
    }
  }

  async function jalankan() {
    if (target.length === 0) return;
    const fresh: Item[] = target.map((m) => ({
      slug: m.slug,
      nama: m.nama,
      kategoriUtama: m.kategoriUtama,
      jenjang: m.jenjang,
      kelas: m.kelas,
      status: "pending",
    }));
    setItems(fresh);
    setLogTeks([]);
    setBerjalan(true);
    tambahLog(`Mulai batch: ${fresh.length} materi · concurrency ${CONCURRENCY} · force=${force}`);

    // Pool: jalankan dengan concurrency limit
    const queue = [...fresh];
    async function worker() {
      while (queue.length > 0) {
        const it = queue.shift();
        if (!it) break;
        await generateSatu(it);
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    setBerjalan(false);
    tambahLog(`Selesai semua.`);
  }

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user || !isAdminEmail(user.email)) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-rose-600">⛔ Akses ditolak</p>
        <Link href="/" className="text-brand underline">← Beranda</Link>
      </main>
    );
  }

  const summary = items.reduce(
    (acc, it) => {
      acc[it.status] = (acc[it.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<Status, number>,
  );

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-brand inline-flex items-center gap-1 transition">← Admin</Link>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-2">Pre-compute Cache</h1>
      <p className="text-muted mb-6">
        Generate sub-topik AI + pohon prasyarat untuk semua materi dalam scope. Hasil di-cache; user akhir tinggal pakai.
      </p>

      <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-2xl border border-slate-200 bg-white">
        <select
          value={filterKu}
          onChange={(e) => setFilterKu(e.target.value as KategoriUtama | "all")}
          disabled={berjalan}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">Semua kategori</option>
          {KATEGORI_UTAMA_URUT.map((k) => (
            <option key={k} value={k}>{KATEGORI_UTAMA_LABEL[k]}</option>
          ))}
        </select>
        <select
          value={filterJ}
          onChange={(e) => setFilterJ(e.target.value as Jenjang | "all")}
          disabled={berjalan}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">Semua jenjang</option>
          <option value="sd">{JENJANG_LABEL.sd}</option>
          <option value="smp">{JENJANG_LABEL.smp}</option>
          <option value="sma">{JENJANG_LABEL.sma}</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} disabled={berjalan} />
          Force regenerate (override cache)
        </label>
        <div className="ml-auto text-sm text-slate-600">
          Scope: <strong>{target.length}</strong> materi · est. {Math.round(target.length * 2 * 7 / CONCURRENCY / 60)} menit
        </div>
        <button
          onClick={jalankan}
          disabled={berjalan || target.length === 0}
          className="rounded-lg bg-brand text-white px-5 py-2 font-semibold hover:bg-brand-strong disabled:opacity-50 transition"
        >
          {berjalan ? "Berjalan..." : `▶ Generate ${target.length} materi`}
        </button>
      </div>

      {items.length > 0 && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
          <Stat label="Pending" value={summary.pending ?? 0} color="text-slate-500" />
          <Stat label="Running" value={summary.running ?? 0} color="text-amber-600" />
          <Stat label="Sub-topik OK" value={summary["subtopik-ok"] ?? 0} color="text-blue-600" />
          <Stat label="Selesai" value={summary.selesai ?? 0} color="text-emerald-600" />
          <Stat label="Error" value={summary.error ?? 0} color="text-rose-600" />
        </div>
      )}

      {items.length > 0 && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white overflow-hidden max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-left uppercase tracking-wider text-slate-500 sticky top-0">
              <tr>
                <th className="px-3 py-2">Materi</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Sub</th>
                <th className="px-3 py-2">Peta</th>
                <th className="px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.slug} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 font-medium">{it.nama}</td>
                  <td className="px-3 py-1.5">
                    <StatusBadge status={it.status} />
                  </td>
                  <td className="px-3 py-1.5 text-slate-600">{it.subTopikCount ?? "—"}</td>
                  <td className="px-3 py-1.5 text-slate-600">{it.petaNodeCount ?? "—"}</td>
                  <td className="px-3 py-1.5 text-rose-600 text-[10px] truncate max-w-[200px]">{it.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logTeks.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-900 text-emerald-300 p-4 font-mono text-xs max-h-[300px] overflow-y-auto">
          {logTeks.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    pending: { label: "pending", cls: "bg-slate-100 text-slate-600" },
    running: { label: "running", cls: "bg-amber-100 text-amber-700" },
    "subtopik-ok": { label: "sub OK", cls: "bg-blue-100 text-blue-700" },
    "peta-ok": { label: "peta OK", cls: "bg-blue-100 text-blue-700" },
    selesai: { label: "✓ selesai", cls: "bg-emerald-100 text-emerald-700" },
    error: { label: "✗ error", cls: "bg-rose-100 text-rose-700" },
  };
  const x = map[status];
  return <span className={`px-2 py-0.5 rounded-full font-medium ${x.cls}`}>{x.label}</span>;
}
