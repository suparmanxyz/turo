"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { authedFetch } from "@/lib/authed-fetch";
import { DAFTAR_MATERI } from "@/data/materi";
import type { PetaPrasyarat } from "@/types";
import { JENJANG_LABEL, KATEGORI_UTAMA_LABEL } from "@/types";

type SubTopik = { slug: string; nama: string; ringkasan: string };

export default function AdminMateriDetailPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);
  const { user, loading } = useAuth();
  const materi = DAFTAR_MATERI.find((m) => m.slug === slug);

  const [subTopik, setSubTopik] = useState<SubTopik[] | null>(null);
  const [editedByAdmin, setEditedByAdmin] = useState(false);
  const [memuatSub, setMemuatSub] = useState(true);

  const [peta, setPeta] = useState<PetaPrasyarat | null>(null);
  const [memuatPeta, setMemuatPeta] = useState(false);

  const [edit, setEdit] = useState(false);
  const [draftSub, setDraftSub] = useState<SubTopik[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  // Load sub-topik
  useEffect(() => {
    if (!user || !isAdminEmail(user.email)) return;
    setMemuatSub(true);
    authedFetch(`/api/admin/materi-data?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        setSubTopik(d.subTopik ?? null);
        setEditedByAdmin(!!d.editedByAdmin);
      })
      .catch((e) => setPesan(`Gagal load sub-topik: ${e instanceof Error ? e.message : e}`))
      .finally(() => setMemuatSub(false));
  }, [user, slug]);

  // Load peta prasyarat (cache lewat /api/peta-prasyarat — public read)
  async function muatPeta() {
    if (!materi) return;
    setMemuatPeta(true);
    setPesan(null);
    try {
      const r = await fetch("/api/peta-prasyarat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subMateri: materi.nama,
          kategoriUtama: materi.kategoriUtama,
          jenjang: materi.jenjang,
          kelas: materi.kelas,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setPeta(await r.json());
    } catch (e) {
      setPesan(`Gagal muat peta: ${e instanceof Error ? e.message : e}`);
    } finally {
      setMemuatPeta(false);
    }
  }

  function mulaiEdit() {
    setDraftSub((subTopik ?? []).map((s) => ({ ...s })));
    setEdit(true);
    setPesan(null);
  }

  function tambahSub() {
    setDraftSub((d) => [...d, { slug: "", nama: "", ringkasan: "" }]);
  }

  function hapusSub(i: number) {
    setDraftSub((d) => d.filter((_, idx) => idx !== i));
  }

  function setField(i: number, field: keyof SubTopik, value: string) {
    setDraftSub((d) => d.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  async function simpanEdit() {
    if (!materi) return;
    setMenyimpan(true);
    setPesan(null);
    try {
      const r = await authedFetch("/api/admin/materi-data", {
        method: "POST",
        body: JSON.stringify({
          slug,
          subTopik: draftSub,
          materiNama: materi.nama,
          kategoriUtama: materi.kategoriUtama,
          jenjang: materi.jenjang,
          kelas: materi.kelas,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setSubTopik(draftSub);
      setEditedByAdmin(true);
      setEdit(false);
      setPesan("✓ Tersimpan");
    } catch (e) {
      setPesan(`Gagal simpan: ${e instanceof Error ? e.message : e}`);
    } finally {
      setMenyimpan(false);
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
        <div className={`mb-4 p-3 rounded-lg text-sm ${pesan.startsWith("✓") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
          {pesan}
        </div>
      )}

      {/* ── Sub-topik ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">📑 Sub-Topik</h2>
          {!edit && subTopik && (
            <button onClick={mulaiEdit} className="text-sm rounded-lg bg-brand text-white px-3 py-1.5 font-medium hover:bg-brand-strong transition">
              ✏️ Edit
            </button>
          )}
        </div>
        {editedByAdmin && !edit && (
          <p className="text-xs text-emerald-700 mb-3">✓ Sudah dikoreksi admin</p>
        )}

        {memuatSub ? (
          <p className="text-slate-500 text-sm">Memuat...</p>
        ) : !subTopik ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
            Belum ada sub-topik di-cache. Buka halaman <code className="bg-white px-1 rounded">/materi/{slug}</code> dulu untuk trigger AI generate.
          </div>
        ) : edit ? (
          <div className="space-y-3">
            {draftSub.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">#{i + 1}</span>
                  <button onClick={() => hapusSub(i)} className="text-xs text-rose-600 hover:underline">
                    Hapus
                  </button>
                </div>
                <input
                  value={s.slug}
                  onChange={(e) => setField(i, "slug", e.target.value)}
                  placeholder="slug (kebab-case)"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm font-mono"
                />
                <input
                  value={s.nama}
                  onChange={(e) => setField(i, "nama", e.target.value)}
                  placeholder="Nama sub-topik"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm font-medium"
                />
                <textarea
                  value={s.ringkasan}
                  onChange={(e) => setField(i, "ringkasan", e.target.value)}
                  placeholder="Ringkasan (1 kalimat)"
                  rows={2}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm"
                />
              </div>
            ))}
            <button onClick={tambahSub} className="text-sm rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-2 font-medium">
              + Tambah sub-topik
            </button>
            <div className="flex gap-2 pt-2">
              <button
                onClick={simpanEdit}
                disabled={menyimpan}
                className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:bg-brand-strong disabled:opacity-50 transition"
              >
                {menyimpan ? "Menyimpan..." : "💾 Simpan"}
              </button>
              <button
                onClick={() => { setEdit(false); setPesan(null); }}
                className="rounded-lg bg-white border border-slate-200 px-4 py-2 font-medium hover:bg-slate-50 transition"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <ol className="space-y-2 list-decimal list-inside">
            {subTopik.map((s) => (
              <li key={s.slug} className="rounded-lg bg-white border border-slate-200 p-3">
                <div className="font-medium">{s.nama}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.ringkasan}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">{s.slug}</div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── Pohon Prasyarat ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">🧩 Pohon Prasyarat</h2>
          <button
            onClick={muatPeta}
            disabled={memuatPeta}
            className="text-sm rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 font-medium disabled:opacity-50 transition"
          >
            {memuatPeta ? "Memuat..." : peta ? "🔄 Reload" : "📍 Muat Peta"}
          </button>
        </div>
        {!peta ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
            Klik "Muat Peta" untuk fetch dari cache atau generate baru.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 mb-3">
              Root: <code className="bg-slate-100 px-1 rounded">{peta.rootId}</code> · {peta.nodes.length} node total ·{" "}
              <span className="italic">setiap cabang ke bawah = prasyarat yang harus dikuasai dulu</span>
            </p>
            <PohonRender peta={peta} />
            <Yatim peta={peta} />
          </div>
        )}
      </section>
    </main>
  );
}

// ============================================================
// Tree renderer rekursif untuk pohon prasyarat
// ============================================================

function PohonRender({ peta }: { peta: PetaPrasyarat }) {
  return (
    <div className="text-sm">
      <NodeBranch nodeId={peta.rootId} peta={peta} depth={0} visited={new Set()} isLast />
    </div>
  );
}

function NodeBranch({
  nodeId,
  peta,
  depth,
  visited,
  isLast,
}: {
  nodeId: string;
  peta: PetaPrasyarat;
  depth: number;
  visited: Set<string>;
  isLast: boolean;
}) {
  const node = peta.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const sudahPernah = visited.has(nodeId);
  const newVisited = new Set(visited).add(nodeId);

  const anak = sudahPernah ? [] : node.prasyarat;

  return (
    <div className="relative">
      <div className="flex items-start gap-2 py-1">
        <span className="text-xs font-mono text-slate-400 select-none w-8 shrink-0">
          {depth === 0 ? "●" : isLast ? "└─" : "├─"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">L{node.level}</span>
            <strong className={depth === 0 ? "text-brand-strong" : ""}>{node.topik}</strong>
            {sudahPernah && (
              <span className="text-[10px] text-amber-600 italic">↺ sudah ditampilkan di cabang lain</span>
            )}
          </div>
          {!sudahPernah && node.subKonsep && node.subKonsep.length > 0 && (
            <ul className="list-disc list-inside text-xs text-slate-500 mt-0.5 ml-2">
              {node.subKonsep.map((sk, j) => (
                <li key={j}>{sk}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {anak.length > 0 && (
        <div className="ml-3 pl-4 border-l-2 border-slate-200">
          {anak.map((childId, i) => (
            <NodeBranch
              key={`${childId}-${i}`}
              nodeId={childId}
              peta={peta}
              depth={depth + 1}
              visited={newVisited}
              isLast={i === anak.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Tampilkan node yatim (tidak ter-reach dari root) — kalau ada, indikasi peta cacat. */
function Yatim({ peta }: { peta: PetaPrasyarat }) {
  const reachable = new Set<string>();
  function walk(id: string) {
    if (reachable.has(id)) return;
    reachable.add(id);
    const n = peta.nodes.find((x) => x.id === id);
    n?.prasyarat.forEach(walk);
  }
  walk(peta.rootId);
  const yatim = peta.nodes.filter((n) => !reachable.has(n.id));
  if (yatim.length === 0) return null;
  return (
    <div className="mt-4 pt-3 border-t border-slate-200">
      <p className="text-xs font-semibold text-amber-700 mb-2">⚠ {yatim.length} node yatim (tidak ter-link dari root):</p>
      <ul className="text-xs text-slate-600 list-disc list-inside">
        {yatim.map((n) => (
          <li key={n.id}>{n.topik} <span className="text-slate-400 font-mono">(L{n.level}, id: {n.id})</span></li>
        ))}
      </ul>
    </div>
  );
}
