"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { MathText } from "@/components/MathText";

type Item = {
  id: string;
  subMateriKode: string;
  jenjang: "SD" | "SMP" | "SMA";
  kelas: number;
  area: string;
  b: number;
  konten: {
    pertanyaan: string;
    opsi: { teks: string; benar: boolean; alasan?: string }[];
    kunci: number;
    pembahasan?: string;
    svg?: string;
  };
  meta?: { difficultyLabel?: string };
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

export default function AdminItemReviewPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<{ jenjang: string; kelas: string; hasSvg: string }>({ jenjang: "", kelas: "", hasSvg: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Edit state per item
  const [edits, setEdits] = useState<Record<string, Partial<Item["konten"]>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  // AI tweak state
  const [aiBox, setAiBox] = useState<Record<string, { instruksi: string; model: "sonnet" | "opus"; status: string; loading: boolean }>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filter.jenjang) params.set("jenjang", filter.jenjang);
      if (filter.kelas) params.set("kelas", filter.kelas);
      if (filter.hasSvg) params.set("hasSvg", filter.hasSvg);
      const res = await fetch(`/api/admin/items-paginated?${params}`, {
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      setItems(data.items);
      setPagination(data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [user, page, filter]);

  useEffect(() => { if (user && isAdminEmail(user.email)) load(); }, [user, page, filter, load]);

  function updateField(itemId: string, field: keyof Item["konten"], value: unknown) {
    setEdits((e) => ({ ...e, [itemId]: { ...e[itemId], [field]: value } }));
  }
  function updateOpsi(itemId: string, idx: number, field: "teks" | "alasan", value: string) {
    const it = items.find((i) => i.id === itemId);
    if (!it) return;
    const currentOpsi = edits[itemId]?.opsi ?? it.konten.opsi;
    const newOpsi = [...currentOpsi];
    newOpsi[idx] = { ...newOpsi[idx], [field]: value };
    updateField(itemId, "opsi", newOpsi);
  }

  async function saveItem(item: Item) {
    if (!user || !edits[item.id]) return;
    setSaving((s) => ({ ...s, [item.id]: true }));
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/item-bank/${encodeURIComponent(item.subMateriKode)}/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ itemId: item.id, fields: { konten: edits[item.id] } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Update local
      setItems((arr) => arr.map((i) => i.id === item.id ? { ...i, konten: { ...i.konten, ...edits[item.id] } } : i));
      setEdits((e) => { const c = { ...e }; delete c[item.id]; return c; });
    } catch (e) {
      alert(`Save gagal: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSaving((s) => ({ ...s, [item.id]: false }));
    }
  }

  async function runAiTweak(item: Item) {
    const ai = aiBox[item.id];
    if (!user || !ai?.instruksi.trim()) return;
    setAiBox((b) => ({ ...b, [item.id]: { ...ai, loading: true, status: "AI sedang revisi..." } }));
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/item-bank/${encodeURIComponent(item.subMateriKode)}/fix-visual`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          itemId: item.id,
          mode: "chat",
          instruksi: ai.instruksi,
          model: ai.model,
          svgInput: edits[item.id]?.svg ?? item.konten.svg ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiBox((b) => ({ ...b, [item.id]: { ...ai, loading: false, status: "✗ " + (data.error ?? res.status) } }));
        return;
      }
      // Save SVG hasil tweak ke edits
      if (data.svgAfter) {
        updateField(item.id, "svg", data.svgAfter);
        setAiBox((b) => ({ ...b, [item.id]: { ...ai, loading: false, status: "✓ " + (data.catatan ?? "updated"), instruksi: "" } }));
      } else {
        setAiBox((b) => ({ ...b, [item.id]: { ...ai, loading: false, status: "✗ AI tidak return SVG" } }));
      }
    } catch (e) {
      setAiBox((b) => ({ ...b, [item.id]: { ...ai, loading: false, status: "✗ " + (e instanceof Error ? e.message : e) } }));
    }
  }

  if (loading) return <main className="p-8 text-slate-400">Memuat...</main>;
  if (!user) return <main className="p-8"><Link href="/login" className="text-brand">Login dulu</Link></main>;
  if (!isAdminEmail(user.email)) return <main className="p-8 text-rose-600">Bukan admin</main>;

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">📚 Review Items</h1>
        <Link href="/admin/item-bank" className="text-sm text-brand hover:underline">← Item-bank index</Link>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2 items-center flex-wrap">
        <select value={filter.jenjang} onChange={(e) => { setFilter((f) => ({ ...f, jenjang: e.target.value, kelas: "" })); setPage(1); }} className="rounded border-slate-200 border px-3 py-1.5 text-sm">
          <option value="">Semua Jenjang</option>
          <option value="SD">SD</option>
          <option value="SMP">SMP</option>
          <option value="SMA">SMA</option>
        </select>
        <select value={filter.kelas} onChange={(e) => { setFilter((f) => ({ ...f, kelas: e.target.value })); setPage(1); }} className="rounded border-slate-200 border px-3 py-1.5 text-sm">
          <option value="">Semua Kelas</option>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map((k) => <option key={k} value={k}>K{k}</option>)}
        </select>
        <select value={filter.hasSvg} onChange={(e) => { setFilter((f) => ({ ...f, hasSvg: e.target.value })); setPage(1); }} className="rounded border-slate-200 border px-3 py-1.5 text-sm">
          <option value="">Semua</option>
          <option value="yes">Hanya yang ada gambar</option>
          <option value="no">Hanya tanpa gambar</option>
        </select>
        <button onClick={load} disabled={busy} className="text-sm rounded bg-slate-100 hover:bg-slate-200 px-3 py-1.5 disabled:opacity-50">
          {busy ? "Memuat..." : "🔄 Refresh"}
        </button>
        {pagination && (
          <span className="text-sm text-slate-600 ml-auto">
            Page {pagination.page} / {pagination.totalPages} · Total {pagination.total} items
          </span>
        )}
      </div>

      {/* Pagination top */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mb-4 flex gap-2 items-center">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || busy} className="text-sm rounded bg-slate-100 hover:bg-slate-200 px-3 py-1 disabled:opacity-50">← Prev</button>
          <input type="number" min={1} max={pagination.totalPages} value={page} onChange={(e) => setPage(Math.max(1, Math.min(pagination.totalPages, Number(e.target.value))))} className="w-16 text-center rounded border-slate-200 border px-2 py-1 text-sm" />
          <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages || busy} className="text-sm rounded bg-slate-100 hover:bg-slate-200 px-3 py-1 disabled:opacity-50">Next →</button>
        </div>
      )}

      {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded text-sm">{error}</div>}

      {/* Items list */}
      <div className="space-y-6">
        {items.map((item, idx) => {
          const edited = edits[item.id] ?? {};
          const hasEdits = Object.keys(edited).length > 0;
          const currentKonten = { ...item.konten, ...edited };
          const ai = aiBox[item.id] ?? { instruksi: "", model: "sonnet" as const, status: "", loading: false };
          const globalIdx = (page - 1) * 50 + idx + 1;

          return (
            <div key={item.id} className="rounded-2xl bg-white border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="text-xs text-slate-500">
                  #{globalIdx} · <span className="font-mono">{item.id.slice(0, 8)}</span> · {item.subMateriKode} · {item.jenjang} K{item.kelas} · {item.area} · b={item.b?.toFixed?.(2)}
                  {item.meta?.difficultyLabel && <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100">{item.meta.difficultyLabel}</span>}
                </div>
                {hasEdits && (
                  <button onClick={() => saveItem(item)} disabled={saving[item.id]} className="text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-semibold disabled:opacity-50">
                    {saving[item.id] ? "Menyimpan..." : "💾 Simpan perubahan"}
                  </button>
                )}
              </div>

              {/* Pertanyaan */}
              <div className="mb-3">
                <label className="text-xs font-semibold text-slate-500 uppercase">Pertanyaan</label>
                <textarea
                  value={currentKonten.pertanyaan}
                  onChange={(e) => updateField(item.id, "pertanyaan", e.target.value)}
                  rows={Math.max(2, Math.ceil(currentKonten.pertanyaan.length / 90))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded text-sm font-mono"
                />
                <div className="mt-1 p-2 bg-slate-50 rounded text-sm">
                  <MathText>{currentKonten.pertanyaan}</MathText>
                </div>
              </div>

              {/* SVG (kalau ada) */}
              {(currentKonten.svg || edited.svg) && (
                <div className="mb-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase">SVG</label>
                  <div className="mt-1 p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-center min-h-[150px]" dangerouslySetInnerHTML={{ __html: currentKonten.svg ?? "" }} />
                </div>
              )}

              {/* Opsi */}
              <div className="mb-3">
                <label className="text-xs font-semibold text-slate-500 uppercase">Opsi (kunci: {String.fromCharCode(65 + currentKonten.kunci)})</label>
                <div className="mt-1 space-y-2">
                  {currentKonten.opsi.map((o, i) => (
                    <div key={i} className={`p-2 rounded border ${i === currentKonten.kunci ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
                      <div className="flex gap-2 items-start">
                        <span className="font-bold w-6">{String.fromCharCode(65 + i)}.</span>
                        <div className="flex-1 space-y-1">
                          <textarea
                            value={o.teks}
                            onChange={(e) => updateOpsi(item.id, i, "teks", e.target.value)}
                            rows={1}
                            className="w-full p-1.5 border border-slate-200 rounded text-sm font-mono"
                          />
                          <div className="text-xs"><MathText>{o.teks}</MathText></div>
                          <textarea
                            value={o.alasan ?? ""}
                            onChange={(e) => updateOpsi(item.id, i, "alasan", e.target.value)}
                            rows={1}
                            placeholder={i === currentKonten.kunci ? "Alasan jawaban benar..." : "Miskonsepsi..."}
                            className="w-full p-1.5 border border-slate-200 rounded text-xs italic text-slate-600"
                          />
                          {o.alasan && (
                            <div className={`text-xs ${i === currentKonten.kunci ? "text-emerald-700" : "text-rose-600"}`}>
                              {i === currentKonten.kunci ? "✓ " : "miskonsepsi: "}
                              <MathText>{o.alasan.replace(/^\s*miskonsepsi\s*:\s*/i, "")}</MathText>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Tweak */}
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                <label className="text-xs font-semibold text-amber-900 uppercase">🤖 AI Tweak (revisi SVG via instruksi)</label>
                <div className="mt-1 flex gap-2 items-start">
                  <textarea
                    value={ai.instruksi}
                    onChange={(e) => setAiBox((b) => ({ ...b, [item.id]: { ...ai, instruksi: e.target.value } }))}
                    placeholder="Contoh: 'pindah label ke kiri', 'tambah arsiran di bawah kurva untuk x∈[0,2]', dll"
                    rows={2}
                    className="flex-1 p-2 border border-amber-200 rounded text-sm"
                  />
                  <div className="flex flex-col gap-1 items-start">
                    <label className="text-xs"><input type="radio" checked={ai.model === "sonnet"} onChange={() => setAiBox((b) => ({ ...b, [item.id]: { ...ai, model: "sonnet" } }))} /> Sonnet</label>
                    <label className="text-xs"><input type="radio" checked={ai.model === "opus"} onChange={() => setAiBox((b) => ({ ...b, [item.id]: { ...ai, model: "opus" } }))} /> Opus</label>
                    <button onClick={() => runAiTweak(item)} disabled={ai.loading || !ai.instruksi.trim()} className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded font-semibold disabled:opacity-50">
                      {ai.loading ? "..." : "⚡ Apply"}
                    </button>
                  </div>
                </div>
                {ai.status && <div className={`mt-1 text-xs ${ai.status.startsWith("✓") ? "text-emerald-700" : ai.status.startsWith("✗") ? "text-rose-700" : "text-slate-600"}`}>{ai.status}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination bottom */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex gap-2 items-center justify-center">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || busy} className="text-sm rounded bg-slate-100 hover:bg-slate-200 px-3 py-1 disabled:opacity-50">← Prev</button>
          <span className="text-sm">Page {page} / {pagination.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages || busy} className="text-sm rounded bg-slate-100 hover:bg-slate-200 px-3 py-1 disabled:opacity-50">Next →</button>
        </div>
      )}
    </main>
  );
}
