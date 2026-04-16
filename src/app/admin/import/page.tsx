"use client";

import { useState } from "react";
import Link from "next/link";
import { MathText } from "@/components/MathText";
import { DAFTAR_MATERI } from "@/data/materi";

type SoalEkstrak = {
  pertanyaan: string;
  jawabanBenar?: string;
  pembahasan?: string[];
  opsi?: string[];
  materiSlug: string;
  subMateriSlug: string;
  topik?: string;
  level?: number;
  sumber?: string;
};

type HasilPerFile = { file: string; soal: SoalEkstrak[]; error?: string };

type Response = {
  hasil: HasilPerFile[];
  total: number;
  disimpan: number;
  ringkasanPer: Record<string, number>;
  error?: string;
};

const NAMA_MATERI: Record<string, string> = Object.fromEntries(
  DAFTAR_MATERI.flatMap((m) =>
    m.subMateri.map((s) => [`${m.slug}/${s.slug}`, `${m.nama} → ${s.nama}`]),
  ),
);

export default function ImportSoalPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(simpan: boolean) {
    if (files.length === 0) { setError("Pilih minimal 1 PDF"); return; }
    setLoading(true);
    setError(null);
    setHasil(null);
    try {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      form.append("catatan", catatan);
      form.append("simpan", simpan ? "true" : "false");
      const r = await fetch("/api/import-soal", { method: "POST", body: form });
      const data: Response = await r.json();
      if (!r.ok && !data.hasil) throw new Error(data.error ?? `HTTP ${r.status}`);
      setHasil(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <Link href="/" className="text-sm text-blue-600 hover:underline">← Beranda</Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">Impor Soal Massal dari PDF</h1>
      <p className="text-sm text-gray-600 mb-6">
        Upload banyak PDF sekaligus. Claude auto-ekstrak + klasifikasi ke materi/sub-materi yang tepat.
      </p>

      <div className="space-y-4 p-5 border rounded-lg">
        <div>
          <label className="block text-sm font-medium mb-1">File PDF (boleh banyak, max 30MB/file)</label>
          <label className="inline-flex items-center gap-3 px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 text-sm">
            <span>📄 Pilih File PDF</span>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="hidden"
            />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 text-sm space-y-1">
              {files.map((f, i) => (
                <li key={i}>
                  ✓ <strong>{f.name}</strong> ({(f.size / 1024 / 1024).toFixed(2)} MB)
                </li>
              ))}
              <li>
                <button onClick={() => setFiles([])} className="text-red-600 underline text-xs">
                  Hapus semua ({files.length})
                </button>
              </li>
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Catatan untuk Claude (opsional)</label>
          <input
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Misal: 'ambil hanya soal isian, bukan essay', 'abaikan halaman sampul'"
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => submit(false)}
            disabled={loading || files.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Preview Ekstraksi"}
          </button>
          <button
            onClick={() => submit(true)}
            disabled={loading || files.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Memproses..." : `Ekstrak + Simpan ${files.length} file`}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">✗ {error}</p>}
      </div>

      {hasil && (
        <section className="mt-8 space-y-6">
          <div className="p-4 bg-green-50 border border-green-300 rounded">
            <h2 className="text-lg font-semibold mb-2">
              {hasil.total} soal diekstrak {hasil.disimpan > 0 && `· ✓ ${hasil.disimpan} disimpan`}
            </h2>
            {hasil.error && <p className="text-red-600 text-sm">⚠ {hasil.error}</p>}

            <h3 className="text-sm font-semibold mt-3 mb-1">Distribusi per materi:</h3>
            <ul className="text-sm space-y-0.5">
              {Object.entries(hasil.ringkasanPer)
                .sort((a, b) => b[1] - a[1])
                .map(([key, n]) => (
                  <li key={key}>
                    <span className="inline-block w-8 text-right font-mono">{n}</span>{" "}
                    <span className="text-gray-700">{NAMA_MATERI[key] ?? key}</span>
                  </li>
                ))}
            </ul>
          </div>

          {hasil.hasil.map((h) => (
            <details key={h.file} className="border rounded-lg">
              <summary className="cursor-pointer p-3 bg-gray-50 font-medium">
                📄 {h.file} — {h.soal.length} soal {h.error && <span className="text-red-600">({h.error})</span>}
              </summary>
              <div className="p-4 space-y-3">
                {h.soal.map((s, i) => (
                  <div key={i} className="p-3 border rounded">
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                      <span className="px-2 py-0.5 bg-blue-100 rounded">
                        {NAMA_MATERI[`${s.materiSlug}/${s.subMateriSlug}`] ?? `${s.materiSlug}/${s.subMateriSlug}`}
                      </span>
                      {s.topik && <span>· {s.topik}</span>}
                      <span>· level {s.level}</span>
                    </div>
                    <div className="mb-1"><MathText>{s.pertanyaan}</MathText></div>
                    {s.jawabanBenar && (
                      <p className="text-xs"><strong>Jawaban:</strong> <MathText>{s.jawabanBenar}</MathText></p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </section>
      )}
    </main>
  );
}
