"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { DAFTAR_MATERI } from "@/data/materi";
import type { PetaPrasyarat } from "@/types";
import { JENJANG_LABEL, KATEGORI_UTAMA_LABEL } from "@/types";

export default function AdminMateriDetailPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);
  const { user, loading } = useAuth();
  const materi = DAFTAR_MATERI.find((m) => m.slug === slug);

  const [peta, setPeta] = useState<PetaPrasyarat | null>(null);
  const [memuatPeta, setMemuatPeta] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  // Load peta untuk sub-materi pertama (sebagai contoh root)
  async function muatPeta(rootKode: string) {
    setMemuatPeta(true);
    setPesan(null);
    try {
      const r = await fetch("/api/peta-prasyarat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode: rootKode }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
      setPeta(await r.json());
    } catch (e) {
      setPesan(`Gagal muat peta: ${e instanceof Error ? e.message : e}`);
    } finally {
      setMemuatPeta(false);
    }
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
  if (!materi) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-slate-600">Materi tidak ditemukan.</p>
        <Link href="/admin/materi" className="text-brand underline">← List Materi</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6 sm:p-10">
      <Link href="/admin/materi" className="text-sm text-slate-500 hover:text-brand inline-flex items-center gap-1 transition">
        ← List Materi
      </Link>

      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-2">{materi.nama}</h1>
      <p className="text-muted mb-6">
        {KATEGORI_UTAMA_LABEL[materi.kategoriUtama]}
        {materi.jenjang && ` · ${JENJANG_LABEL[materi.jenjang]}`}
        {materi.kelas && ` · Kelas ${materi.kelas}`}
        {" · "}<span className="font-mono text-xs">{materi.slug}</span>
      </p>

      {pesan && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-rose-50 text-rose-700 border border-rose-200">{pesan}</div>
      )}

      {/* ── Sub-materi (dari peta resmi, read-only) ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-xl font-bold">📑 Sub-Materi <span className="text-sm text-slate-400 font-normal">({materi.subMateri.length})</span></h2>
          <span className="text-xs text-slate-500">Sumber: peta-prasyarat.json v2.0.0 (read-only)</span>
        </div>
        <ol className="space-y-2 list-decimal list-inside">
          {materi.subMateri.map((s) => (
            <li key={s.slug} className="rounded-lg bg-white border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{s.nama}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.ringkasan}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">{s.slug}</div>
                </div>
                <button
                  onClick={() => muatPeta(s.slug)}
                  className="shrink-0 text-xs rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 font-medium"
                >
                  📍 Lihat peta
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Pohon Prasyarat ── */}
      <section>
        <h2 className="text-xl font-bold mb-3">🧩 Pohon Prasyarat</h2>
        {!peta ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
            Klik "📍 Lihat peta" pada sub-materi di atas untuk lihat pohon prasyarat-nya.
          </div>
        ) : memuatPeta ? (
          <p className="text-slate-500 text-sm">Memuat...</p>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 mb-3">
              Root: <code className="bg-slate-100 px-1 rounded">{peta.rootId}</code> · {peta.nodes.length} node
            </p>
            <div className="space-y-1.5">
              {peta.nodes
                .slice()
                .sort((a, b) => a.level - b.level)
                .map((n) => (
                  <div key={n.id} className="text-sm border-l-2 border-slate-200 pl-3" style={{ marginLeft: `${n.level * 16}px` }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">L{n.level}</span>
                      {n.kelasEstimasi !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">kelas {n.kelasEstimasi}</span>
                      )}
                      <strong>{n.topik}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">{n.id}</span>
                    </div>
                    {n.prasyarat.length > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        ↑ {n.prasyarat.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
