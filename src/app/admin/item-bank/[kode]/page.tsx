"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { MathText } from "@/components/MathText";

type SubInfo = {
  kode: string;
  nama: string;
  jenjang: "SD" | "SMP" | "SMA";
  kelas: number;
  area: string;
  bab_kode: string;
  bab_nama: string;
  penjelasan: string;
  durasi_estimasi: string;
  is_maku: boolean;
  is_entry_point: boolean;
  depth: number;
  dependents_count: number;
  prereq: { kode: string; relation: string; weight: string; reason: string }[];
  strict: boolean;
  label: string;
};

type Dependent = { kode: string; relation: string; weight: string };

type ItemDetail = {
  id: string;
  b: number;
  a: number;
  c: number;
  format: string;
  calibrationN: number;
  source: string;
  aiModel?: string;
  createdAt: number;
  konten: {
    pertanyaan: string;
    opsi: { teks: string; benar: boolean; alasan?: string }[];
    kunci: number;
    pembahasan?: string;
    svg?: string;
  };
};

type FixVisualState = {
  itemId: string;
  instruksi: string;
  loading: boolean;
  result?: { svgBefore: string; svgAfter: string; catatan?: string; modelUsed: string };
  saving?: boolean;
  error?: string;
} | null;

export default function AdminItemBankDetailPage(props: { params: Promise<{ kode: string }> }) {
  const { kode } = use(props.params);
  const decodedKode = decodeURIComponent(kode);
  const { user, loading } = useAuth();
  const [data, setData] = useState<{ sub: SubInfo; dependents: Dependent[]; items: ItemDetail[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [fixModal, setFixModal] = useState<FixVisualState>(null);
  const [fixModel, setFixModel] = useState<"sonnet" | "opus">("sonnet");

  async function load() {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/item-bank/${encodeURIComponent(decodedKode)}`, {
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => { if (user && isAdminEmail(user.email)) load(); /* eslint-disable-next-line */ }, [user, decodedKode]);

  async function deleteItem(itemId: string) {
    if (!confirm(`Hapus item ${itemId.slice(0, 8)}...?`)) return;
    setBusy(itemId);
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch(`/api/admin/item-bank/${encodeURIComponent(decodedKode)}?itemId=${itemId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      alert(`Gagal hapus: ${e}`);
    } finally {
      setBusy(null);
    }
  }

  async function submitFixVisual() {
    if (!fixModal || !user) return;
    setFixModal({ ...fixModal, loading: true, error: undefined });
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/item-bank/${encodeURIComponent(decodedKode)}/fix-visual`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ itemId: fixModal.itemId, instruksi: fixModal.instruksi, model: fixModel }),
      });
      const out = await res.json();
      if (!res.ok) {
        setFixModal({ ...fixModal, loading: false, error: out.error ?? `HTTP ${res.status}` });
        return;
      }
      setFixModal({ ...fixModal, loading: false, result: { svgBefore: out.svgBefore, svgAfter: out.svgAfter, catatan: out.catatan, modelUsed: out.modelUsed } });
    } catch (e) {
      setFixModal({ ...fixModal, loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  async function applyFixVisual() {
    if (!fixModal?.result || !user) return;
    setFixModal({ ...fixModal, saving: true });
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/item-bank/${encodeURIComponent(decodedKode)}/fix-visual`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ itemId: fixModal.itemId, svg: fixModal.result.svgAfter }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFixModal(null);
      await load();
    } catch (e) {
      setFixModal({ ...fixModal, saving: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  async function seedMore() {
    setBusy("seed");
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/admin/seed-item-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ kode: decodedKode, count: (data?.items.length ?? 0) + 3, force: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      await load();
    } catch (e) {
      alert(`Gagal seed: ${e}`);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user || !isAdminEmail(user.email)) {
    return <main className="mx-auto max-w-3xl p-8 text-center"><p className="text-rose-600">⛔ Akses ditolak</p></main>;
  }
  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <Link href="/admin/item-bank" className="text-sm text-slate-500 hover:text-brand">← Item Bank</Link>
        <p className="text-rose-600 mt-4">{error}</p>
      </main>
    );
  }
  if (!data) return <main className="p-8 text-slate-500">Memuat detail...</main>;

  const { sub, dependents, items } = data;

  return (
    <main className="mx-auto max-w-5xl p-6 sm:p-10">
      <Link href="/admin/item-bank" className="text-sm text-slate-500 hover:text-brand">← Item Bank</Link>

      {/* Header sub-materi */}
      <div className="mt-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{sub.kode}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-700">{sub.jenjang} K{sub.kelas}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{sub.area}</span>
          {sub.is_maku && <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">MAKU</span>}
          {sub.is_entry_point && <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">entry</span>}
          <span className={`text-xs px-2 py-0.5 rounded ${
            sub.label === "CP-2025" ? "bg-emerald-100 text-emerald-700" :
            sub.label === "Buku-2025" ? "bg-amber-100 text-amber-800" :
            sub.label === "UTBK" ? "bg-violet-100 text-violet-700" :
            "bg-rose-100 text-rose-700"
          }`}>{sub.label}</span>
          {sub.strict ? (
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Strict CP</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">Full only</span>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{sub.nama}</h1>
        <p className="text-muted mt-1 text-sm">{sub.bab_kode} · {sub.bab_nama} · ⏱ {sub.durasi_estimasi}</p>
        <p className="text-slate-700 mt-3">{sub.penjelasan}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
        <Card title="Items di Bank" value={String(items.length)} />
        <Card title="Prereq" value={String(sub.prereq.length)} />
        <Card title="Dependents" value={String(sub.dependents_count)} />
        <Card title="Depth" value={String(sub.depth)} />
        <Card title="Tot. Calibration" value={String(items.reduce((a, b) => a + b.calibrationN, 0))} />
      </div>

      {/* Prereq & Dependents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <section className="rounded-2xl bg-white border border-slate-200 p-4">
          <h3 className="font-bold text-sm mb-2">Prasyarat ({sub.prereq.length})</h3>
          {sub.prereq.length === 0 ? (
            <p className="text-xs text-slate-400">— foundation, tidak ada prereq</p>
          ) : (
            <ul className="space-y-1.5">
              {sub.prereq.map((p) => (
                <li key={p.kode} className="text-xs flex items-start gap-2">
                  <span className={`font-mono px-1.5 py-0.5 rounded shrink-0 ${
                    p.relation === "STRICT" ? "bg-rose-100 text-rose-700" : p.relation === "SOFT" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                  }`}>{p.relation[0]}{p.weight[0]}</span>
                  <Link href={`/admin/item-bank/${encodeURIComponent(p.kode)}`} className="font-mono hover:text-brand underline">{p.kode}</Link>
                  <span className="text-slate-500">{p.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl bg-white border border-slate-200 p-4">
          <h3 className="font-bold text-sm mb-2">Yang butuh ini ({dependents.length})</h3>
          {dependents.length === 0 ? (
            <p className="text-xs text-slate-400">— tidak ada yang depend</p>
          ) : (
            <ul className="space-y-1.5 max-h-40 overflow-y-auto">
              {dependents.map((d) => (
                <li key={d.kode} className="text-xs flex items-center gap-2">
                  <span className={`font-mono px-1.5 py-0.5 rounded shrink-0 ${
                    d.relation === "STRICT" ? "bg-rose-100 text-rose-700" : d.relation === "SOFT" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                  }`}>{d.relation[0]}{d.weight[0]}</span>
                  <Link href={`/admin/item-bank/${encodeURIComponent(d.kode)}`} className="font-mono hover:text-brand underline">{d.kode}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Action bar */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={seedMore}
          disabled={busy !== null}
          className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy === "seed" ? "Generating..." : "+ Generate 3 soal lagi"}
        </button>
        <button
          onClick={load}
          className="rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Items */}
      <h2 className="text-xl font-bold mb-3">Soal di Item Bank ({items.length})</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500 italic">Belum ada soal di-generate untuk sub-materi ini.</p>
      ) : (
        <div className="space-y-4">
          {items.map((it, idx) => (
            <article key={it.id} className="rounded-2xl bg-white border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-bold text-slate-700">#{idx + 1}</span>
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{it.id.slice(0, 12)}</span>
                  <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700">{it.format}</span>
                  <span className="text-slate-500">b={it.b.toFixed(2)} · a={it.a.toFixed(1)} · c={it.c.toFixed(2)}</span>
                  <span className="text-slate-500">N={it.calibrationN}</span>
                  <span className="text-slate-400">{it.source}</span>
                  {it.aiModel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-mono">
                      {it.aiModel.replace("claude-", "")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {it.konten.svg && (
                    <button
                      onClick={() => setFixModal({ itemId: it.id, instruksi: "", loading: false })}
                      disabled={busy === it.id}
                      className="text-xs text-violet-700 hover:bg-violet-50 px-2 py-1 rounded disabled:opacity-50"
                      title="Perbaiki gambar via AI"
                    >
                      🎨 Fix gambar
                    </button>
                  )}
                  <button
                    onClick={() => deleteItem(it.id)}
                    disabled={busy === it.id}
                    className="text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded disabled:opacity-50"
                  >
                    {busy === it.id ? "..." : "🗑 Hapus"}
                  </button>
                </div>
              </div>

              {it.konten.svg && (
                <div className="mb-3 flex justify-center" dangerouslySetInnerHTML={{ __html: it.konten.svg }} />
              )}

              <div className="text-base mb-3 leading-relaxed">
                <MathText>{it.konten.pertanyaan}</MathText>
              </div>

              <div className="space-y-1.5">
                {it.konten.opsi.map((o, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-2.5 text-sm ${
                      i === it.konten.kunci
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs ${
                        i === it.konten.kunci ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div><MathText>{o.teks}</MathText></div>
                        {o.alasan && (
                          <div className={`text-xs mt-1 ${i === it.konten.kunci ? "text-emerald-700" : "text-rose-600"}`}>
                            {i === it.konten.kunci ? "✓" : "miskonsepsi:"} {o.alasan}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
      {/* Modal: Fix visual via AI */}
      {fixModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setFixModal(null); }}
        >
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">🎨 Perbaiki Gambar (SVG)</h3>
                <p className="text-xs text-slate-500 mt-1">Item {fixModal.itemId.slice(0, 12)}</p>
              </div>
              <button
                onClick={() => setFixModal(null)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {!fixModal.result ? (
              <>
                <label className="block text-sm font-semibold mb-2">Instruksi untuk AI</label>
                <textarea
                  value={fixModal.instruksi}
                  onChange={(e) => setFixModal({ ...fixModal, instruksi: e.target.value })}
                  placeholder="Contoh: viewBox terlalu sempit, perbesar agar semua label kelihatan. Atau: kurangi 2 lingkaran karena soal hanya butuh 12 elemen, bukan 14."
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 p-3 text-sm font-mono"
                  disabled={fixModal.loading}
                />
                <label className="flex items-center gap-2 mt-3 text-sm">
                  Model AI:
                  <select
                    value={fixModel}
                    onChange={(e) => setFixModel(e.target.value as "sonnet" | "opus")}
                    className="rounded-lg border border-slate-200 px-2 py-1"
                    disabled={fixModal.loading}
                  >
                    <option value="sonnet">Sonnet 4.6 (cepat)</option>
                    <option value="opus">Opus 4.7 (presisi visual)</option>
                  </select>
                </label>
                {fixModal.error && (
                  <div className="mt-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 p-3 text-sm">
                    {fixModal.error}
                  </div>
                )}
                <div className="flex gap-2 mt-4 justify-end">
                  <button
                    onClick={() => setFixModal(null)}
                    className="rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm"
                  >
                    Batal
                  </button>
                  <button
                    onClick={submitFixVisual}
                    disabled={fixModal.loading || !fixModal.instruksi.trim()}
                    className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {fixModal.loading ? "Memproses..." : "Generate revisi →"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Sebelum</div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 min-h-[200px] flex items-center justify-center"
                         dangerouslySetInnerHTML={{ __html: fixModal.result.svgBefore || "<p class='text-slate-400 text-sm'>(tidak ada SVG)</p>" }} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-700 uppercase mb-1">Sesudah ({fixModal.result.modelUsed.replace("claude-", "")})</div>
                    <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50/30 p-3 min-h-[200px] flex items-center justify-center"
                         dangerouslySetInnerHTML={{ __html: fixModal.result.svgAfter }} />
                  </div>
                </div>
                {fixModal.result.catatan && (
                  <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-900 mb-3">
                    <strong>Catatan AI:</strong> {fixModal.result.catatan}
                  </div>
                )}
                {fixModal.error && (
                  <div className="rounded-lg bg-rose-50 text-rose-700 border border-rose-200 p-3 text-sm mb-3">
                    {fixModal.error}
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setFixModal({ ...fixModal, result: undefined })}
                    disabled={fixModal.saving}
                    className="rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm disabled:opacity-50"
                  >
                    ← Coba lagi
                  </button>
                  <button
                    onClick={() => setFixModal(null)}
                    disabled={fixModal.saving}
                    className="rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm disabled:opacity-50"
                  >
                    Tolak
                  </button>
                  <button
                    onClick={applyFixVisual}
                    disabled={fixModal.saving}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {fixModal.saving ? "Menyimpan..." : "✓ Pakai revisi ini"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
