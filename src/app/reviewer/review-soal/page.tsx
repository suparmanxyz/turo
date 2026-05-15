"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminOrReviewerEmail } from "@/lib/admin";
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
  review: {
    approvedBy: string;
    approvedByUid: string;
    approvedAt: { seconds: number } | null;
    isMine: boolean;
  } | null;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };
type Status = "pending" | "mine" | "all";

export default function ReviewSoalPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status>("pending");
  const [hasSvg, setHasSvg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Edit state per item
  const [edits, setEdits] = useState<Record<string, Partial<Item["konten"]>>>({});
  const [editedFieldsMap, setEditedFieldsMap] = useState<Record<string, Set<string>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [usedAiMap, setUsedAiMap] = useState<Record<string, boolean>>({});
  // AI tweak state
  const [aiBox, setAiBox] = useState<Record<string, { instruksi: string; model: "sonnet" | "opus"; status: string; loading: boolean }>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const idToken = await user.getIdToken();
      const params = new URLSearchParams({ page: String(page), limit: "50", status });
      if (hasSvg) params.set("hasSvg", hasSvg);
      const res = await fetch(`/api/reviewer/items-paginated?${params}`, {
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      setItems(data.items);
      setPagination(data.pagination);
      if (data.message) setMessage(data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [user, page, status, hasSvg]);

  useEffect(() => {
    if (user && isAdminOrReviewerEmail(user.email)) load();
  }, [user, page, status, hasSvg, load]);

  function trackEdit(itemId: string, field: string) {
    setEditedFieldsMap((m) => {
      const cur = m[itemId] ?? new Set<string>();
      const next = new Set(cur); next.add(field);
      return { ...m, [itemId]: next };
    });
  }

  function updateField(itemId: string, field: keyof Item["konten"], value: unknown) {
    setEdits((e) => ({ ...e, [itemId]: { ...e[itemId], [field]: value } }));
    trackEdit(itemId, String(field));
  }
  function updateOpsi(itemId: string, idx: number, field: "teks" | "alasan", value: string) {
    const it = items.find((i) => i.id === itemId);
    if (!it) return;
    const currentOpsi = edits[itemId]?.opsi ?? it.konten.opsi;
    const newOpsi = [...currentOpsi];
    newOpsi[idx] = { ...newOpsi[idx], [field]: value };
    updateField(itemId, "opsi", newOpsi);
    trackEdit(itemId, `opsi.${idx}.${field}`);
  }

  async function saveItem(item: Item) {
    if (!user || !edits[item.id]) return;
    setSaving((s) => ({ ...s, [item.id]: true }));
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/reviewer/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ itemId: item.id, fields: { konten: edits[item.id] } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      setItems((arr) => arr.map((i) => i.id === item.id ? { ...i, konten: { ...i.konten, ...edits[item.id] } } : i));
      setEdits((e) => { const c = { ...e }; delete c[item.id]; return c; });
    } catch (e) {
      alert(`Save gagal: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSaving((s) => ({ ...s, [item.id]: false }));
    }
  }

  async function approveItem(item: Item) {
    if (!user) return;
    // Auto-save edits dulu kalau ada
    if (edits[item.id]) await saveItem(item);

    setApproving((a) => ({ ...a, [item.id]: true }));
    try {
      const idToken = await user.getIdToken();
      const editedFields = Array.from(editedFieldsMap[item.id] ?? []);
      const res = await fetch(`/api/reviewer/approve-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          itemId: item.id,
          editedFields,
          usedAiTweak: usedAiMap[item.id] ?? false,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      // Remove dari list (pending mode) atau update review status
      if (status === "pending") {
        setItems((arr) => arr.filter((i) => i.id !== item.id));
      } else {
        setItems((arr) => arr.map((i) => i.id === item.id ? {
          ...i,
          review: {
            approvedBy: user.email ?? "",
            approvedByUid: user.uid,
            approvedAt: { seconds: Math.floor(Date.now() / 1000) },
            isMine: true,
          },
        } : i));
      }
    } catch (e) {
      alert(`Approve gagal: ${e instanceof Error ? e.message : e}`);
    } finally {
      setApproving((a) => ({ ...a, [item.id]: false }));
    }
  }

  async function undoApprove(item: Item) {
    if (!user) return;
    if (!confirm("Yakin undo approve? Item akan kembali ke daftar pending.")) return;
    setApproving((a) => ({ ...a, [item.id]: true }));
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/reviewer/approve-item?itemId=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      setItems((arr) => arr.map((i) => i.id === item.id ? { ...i, review: null } : i));
    } catch (e) {
      alert(`Undo gagal: ${e instanceof Error ? e.message : e}`);
    } finally {
      setApproving((a) => ({ ...a, [item.id]: false }));
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
      if (data.svgAfter) {
        updateField(item.id, "svg", data.svgAfter);
        setUsedAiMap((m) => ({ ...m, [item.id]: true }));
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
  if (!isAdminOrReviewerEmail(user.email)) return <main className="p-8 text-rose-600">Bukan reviewer/admin. Hubungi admin untuk akses.</main>;

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📝 Review Soal</h1>
          <p className="text-xs text-slate-500 mt-1">Login: {user.email}</p>
        </div>
        <Link href="/" className="text-sm text-brand hover:underline">← Home</Link>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2 items-center flex-wrap">
        <div className="flex gap-1 p-1 bg-slate-100 rounded">
          {(["pending", "mine", "all"] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1 text-sm rounded ${status === s ? "bg-white shadow font-semibold" : "text-slate-600"}`}
            >
              {s === "pending" ? "Belum direview" : s === "mine" ? "Saya approve" : "Semua"}
            </button>
          ))}
        </div>
        <select value={hasSvg} onChange={(e) => { setHasSvg(e.target.value); setPage(1); }} className="rounded border-slate-200 border px-3 py-1.5 text-sm">
          <option value="">Semua</option>
          <option value="yes">Hanya ada gambar</option>
          <option value="no">Hanya tanpa gambar</option>
        </select>
        <button onClick={load} disabled={busy} className="text-sm rounded bg-slate-100 hover:bg-slate-200 px-3 py-1.5 disabled:opacity-50">
          {busy ? "Memuat..." : "🔄 Refresh"}
        </button>
        {pagination && (
          <span className="text-sm text-slate-600 ml-auto">
            Page {pagination.page} / {pagination.totalPages} · Total {pagination.total}
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
      {message && <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded text-sm">{message}</div>}

      {/* Items list */}
      <div className="space-y-6">
        {items.map((item, idx) => {
          const edited = edits[item.id] ?? {};
          const hasEdits = Object.keys(edited).length > 0;
          const currentKonten = { ...item.konten, ...edited };
          const ai = aiBox[item.id] ?? { instruksi: "", model: "sonnet" as const, status: "", loading: false };
          const globalIdx = (page - 1) * 50 + idx + 1;
          const isApproved = !!item.review;

          return (
            <div key={item.id} className={`rounded-2xl bg-white border p-5 ${isApproved ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="text-xs text-slate-500">
                  #{globalIdx} · <span className="font-mono">{item.id.slice(0, 8)}</span> · {item.subMateriKode} · {item.jenjang} K{item.kelas} · {item.area} · b={item.b?.toFixed?.(2)}
                  {item.meta?.difficultyLabel && <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100">{item.meta.difficultyLabel}</span>}
                  {isApproved && (
                    <div className="mt-1 text-emerald-700 font-semibold">
                      ✓ Approved by {item.review!.approvedBy}
                      {item.review!.approvedAt && ` · ${new Date(item.review!.approvedAt.seconds * 1000).toLocaleString("id-ID")}`}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-start">
                  {hasEdits && (
                    <button onClick={() => saveItem(item)} disabled={saving[item.id]} className="text-xs rounded bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 font-semibold disabled:opacity-50">
                      {saving[item.id] ? "..." : "💾 Save"}
                    </button>
                  )}
                  {!isApproved && (
                    <button onClick={() => approveItem(item)} disabled={approving[item.id]} className="text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-semibold disabled:opacity-50">
                      {approving[item.id] ? "..." : "✓ Approve"}
                    </button>
                  )}
                  {isApproved && (item.review!.isMine || isAdminOrReviewerEmail(user.email)) && (
                    <button onClick={() => undoApprove(item)} disabled={approving[item.id]} className="text-xs rounded bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 font-semibold disabled:opacity-50">
                      {approving[item.id] ? "..." : "↶ Undo"}
                    </button>
                  )}
                </div>
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

              {/* SVG */}
              {currentKonten.svg && (
                <div className="mb-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase">SVG</label>
                  <div className="mt-1 p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-center min-h-[150px]" dangerouslySetInnerHTML={{ __html: currentKonten.svg }} />
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
        {!busy && items.length === 0 && !message && (
          <div className="text-center text-slate-500 py-12 italic">
            {status === "pending" ? "Tidak ada soal pending. Mantap!" : "Belum ada data."}
          </div>
        )}
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
