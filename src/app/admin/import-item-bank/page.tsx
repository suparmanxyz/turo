"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";
import { MathText } from "@/components/MathText";

type ExtractedSoal = {
  pertanyaan: string;
  opsi: { teks: string; benar: boolean; alasan?: string }[];
  pembahasan?: string;
  svg?: string;
  subMateriKode: string;
  meta: {
    difficultyLabel: "easy" | "medium" | "hard";
    microskill?: string;
    subConcept?: string;
    [k: string]: unknown;
  };
};

type ExtractResult = {
  hasil: { file: string; soal: ExtractedSoal[]; rejected?: number; error?: string }[];
  totalSoal: number;
  totalRejected: number;
};

const DIFF_BADGE: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  hard: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function ImportItemBankPage() {
  const { user, loading } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [filterJenjang, setFilterJenjang] = useState<"" | "SD" | "SMP" | "SMA">("");
  const [filterKelas, setFilterKelas] = useState<string>("");
  const [catatan, setCatatan] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedSoal[]>([]);
  const [files2result, setFiles2result] = useState<{ file: string; rejected?: number; error?: string }[]>([]);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [skippedCount, setSkippedCount] = useState<number | null>(null);

  if (loading) return <main className="p-8 text-slate-500">Memuat...</main>;
  if (!user || !isAdminEmail(user.email)) {
    return <main className="mx-auto max-w-3xl p-8 text-center"><p className="text-rose-600">⛔ Akses ditolak</p></main>;
  }

  async function handleExtract() {
    if (files.length === 0) { setError("Pilih minimal 1 PDF"); return; }
    if (!user) return;
    setExtracting(true);
    setError(null);
    setExtracted([]);
    setApproved(new Set());
    setSavedCount(null);
    try {
      const idToken = await user.getIdToken();
      const form = new FormData();
      for (const f of files) form.append("files", f);
      if (filterJenjang) form.append("filterJenjang", filterJenjang);
      if (filterKelas) form.append("filterKelas", filterKelas);
      if (catatan) form.append("catatan", catatan);
      const res = await fetch("/api/admin/import-item-bank/extract", {
        method: "POST",
        headers: { authorization: `Bearer ${idToken}` },
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
      }
      const data: ExtractResult = await res.json();
      const allSoal = data.hasil.flatMap((h) => h.soal);
      setExtracted(allSoal);
      setFiles2result(data.hasil.map((h) => ({ file: h.file, rejected: h.rejected, error: h.error })));
      // Auto-approve all initially
      setApproved(new Set(allSoal.map((_, i) => i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    if (!user || extracted.length === 0) return;
    const toSave = extracted.filter((_, i) => approved.has(i));
    if (toSave.length === 0) { setError("Tidak ada soal terpilih"); return; }
    setSaving(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/import-item-bank/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ soal: toSave }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
      }
      const data = await res.json();
      setSavedCount(data.saved);
      setSkippedCount(data.skipped);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function toggleApproval(idx: number) {
    const next = new Set(approved);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setApproved(next);
  }

  function updateSubKode(idx: number, kode: string) {
    const next = [...extracted];
    next[idx] = { ...next[idx], subMateriKode: kode };
    setExtracted(next);
  }

  function updateDifficulty(idx: number, diff: "easy" | "medium" | "hard") {
    const next = [...extracted];
    next[idx] = { ...next[idx], meta: { ...next[idx].meta, difficultyLabel: diff } };
    setExtracted(next);
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-brand">← Admin</Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">📥 Import Soal PDF → Item Bank</h1>
      <p className="text-sm text-slate-500 mb-6">
        Upload PDF soal, AI auto-tag ke peta-prasyarat sub-materi + difficulty + meta pedagogis.
        Review hasil, lalu save ke item_bank diagnostic.
      </p>

      {/* Form upload */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold mb-3">1. Upload PDF</h2>
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-sm mb-3"
          disabled={extracting || saving}
        />
        {files.length > 0 && (
          <p className="text-xs text-slate-500 mb-3">{files.length} file dipilih: {files.map((f) => f.name).join(", ")}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Filter jenjang (opsional)</label>
            <select
              value={filterJenjang}
              onChange={(e) => setFilterJenjang(e.target.value as "" | "SD" | "SMP" | "SMA")}
              disabled={extracting || saving}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">Semua</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Filter kelas (opsional)</label>
            <input
              type="number"
              min="1"
              max="12"
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              placeholder="kosongkan = semua"
              disabled={extracting || saving}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-3">💡 Filter persempit pilihan sub-materi → hasil tagging lebih akurat</p>

        <input
          type="text"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Catatan untuk AI (opsional, mis. 'soal SNBT 2023')"
          disabled={extracting || saving}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3"
        />

        <button
          onClick={handleExtract}
          disabled={extracting || files.length === 0 || saving}
          className="rounded-xl bg-brand hover:bg-brand-strong text-white font-semibold px-5 py-2.5 transition disabled:opacity-50"
        >
          {extracting ? "⏳ Extracting (~30-90s/PDF)..." : "🔍 Extract & Auto-tag"}
        </button>

        {error && <div className="mt-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 p-3 text-sm">{error}</div>}
      </div>

      {/* Per-file result info */}
      {files2result.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 mb-6 text-sm">
          <h3 className="font-semibold mb-2">Per file:</h3>
          {files2result.map((f, i) => (
            <div key={i} className="text-xs text-slate-600 mb-1">
              📄 {f.file}{f.rejected ? ` · ${f.rejected} soal rejected (sub kode tidak valid)` : ""}
              {f.error && <span className="text-amber-600"> · ⚠ {f.error}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Preview soal */}
      {extracted.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">2. Review {extracted.length} soal hasil ekstrak</h2>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setApproved(new Set(extracted.map((_, i) => i)))}
                className="text-brand hover:underline"
              >
                ✓ Centang semua
              </button>
              <span className="text-slate-300">·</span>
              <button
                onClick={() => setApproved(new Set())}
                className="text-rose-600 hover:underline"
              >
                ✗ Uncheck semua
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {extracted.map((s, i) => {
              const isApproved = approved.has(i);
              return (
                <div key={i} className={`rounded-xl border p-4 transition ${
                  isApproved ? "border-brand bg-brand-soft/30" : "border-slate-200 bg-slate-50/50"
                }`}>
                  <div className="flex items-start gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={isApproved}
                      onChange={() => toggleApproval(i)}
                      className="mt-1 h-5 w-5 cursor-pointer accent-brand"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 text-xs">
                        <input
                          type="text"
                          value={s.subMateriKode}
                          onChange={(e) => updateSubKode(i, e.target.value)}
                          className="font-mono px-2 py-0.5 rounded border border-slate-300 text-xs w-36"
                          placeholder="SMP.8.B5.01"
                        />
                        <select
                          value={s.meta.difficultyLabel}
                          onChange={(e) => updateDifficulty(i, e.target.value as "easy" | "medium" | "hard")}
                          className={`px-2 py-0.5 rounded border text-xs font-semibold uppercase ${DIFF_BADGE[s.meta.difficultyLabel]}`}
                        >
                          <option value="easy">EASY</option>
                          <option value="medium">MEDIUM</option>
                          <option value="hard">HARD</option>
                        </select>
                        {s.meta.microskill && <span className="text-slate-500">microskill: {s.meta.microskill}</span>}
                      </div>
                      {s.svg && <div className="mb-2 flex justify-center" dangerouslySetInnerHTML={{ __html: s.svg }} />}
                      <div className="text-sm mb-2"><MathText>{s.pertanyaan}</MathText></div>
                      <div className="space-y-1 ml-2">
                        {s.opsi.map((o, oi) => (
                          <div key={oi} className={`text-xs flex items-start gap-2 ${o.benar ? "text-emerald-700 font-semibold" : "text-slate-600"}`}>
                            <span className="font-mono w-4">{String.fromCharCode(65 + oi)}.</span>
                            <span className="flex-1"><MathText>{o.teks}</MathText></span>
                            {o.benar && <span>✓ kunci</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="text-sm text-slate-500">{approved.size} dari {extracted.length} dipilih</span>
            <button
              onClick={handleSave}
              disabled={saving || approved.size === 0}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 transition disabled:opacity-50"
            >
              {saving ? "⏳ Saving..." : `💾 Save ${approved.size} soal ke item_bank`}
            </button>
          </div>

          {savedCount !== null && (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
              ✅ Saved <strong>{savedCount}</strong> soal{skippedCount ? `, skipped ${skippedCount} (duplikat)` : ""}.
              Soal sekarang tersedia di item_bank diagnostic.
            </div>
          )}
        </div>
      )}
    </main>
  );
}
