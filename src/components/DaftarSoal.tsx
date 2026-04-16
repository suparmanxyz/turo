"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MathText } from "./MathText";

type SoalItem = {
  id: string;
  pertanyaan: string;
  topik: string;
  level: number;
  sumberJenis: string;
  sumberFile: string;
  variasi: SoalItem[];
  originalId?: string | null;
};

export function DaftarSoal({ materiSlug, subMateriSlug }: { materiSlug: string; subMateriSlug: string }) {
  const [list, setList] = useState<SoalItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  async function muat() {
    setLoading(true);
    try {
      const r = await fetch(`/api/daftar-soal?materiSlug=${materiSlug}&subMateriSlug=${subMateriSlug}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setList(data.original);
    } catch (e) {
      setError(e instanceof Error ? e.message : "gagal");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiSlug, subMateriSlug]);

  async function buatVariasi(soalId: string) {
    setGenerating((p) => ({ ...p, [soalId]: true }));
    try {
      const r = await fetch("/api/variasi-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soalId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      await muat();
    } catch (e) {
      alert(`Gagal: ${e instanceof Error ? e.message : e}`);
    } finally {
      setGenerating((p) => ({ ...p, [soalId]: false }));
    }
  }

  if (loading) return <p className="text-gray-500">Memuat daftar soal...</p>;
  if (error) return <p className="text-red-600">✗ {error}</p>;
  if (!list || list.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 rounded text-sm text-yellow-800">
        Belum ada soal asli untuk sub-materi ini. Kamu bisa{" "}
        <Link href="/admin/import" className="underline">impor PDF</Link> dulu, atau{" "}
        <Link href={`/latihan/${materiSlug}/${subMateriSlug}`} className="underline">
          mulai latihan dengan soal AI
        </Link>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{list.length} Soal Asli Tersedia</h2>
        <Link
          href={`/latihan/${materiSlug}/${subMateriSlug}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Atau mulai random →
        </Link>
      </div>

      {list.map((s, i) => (
        <div key={s.id} className="p-4 border rounded-lg">
          <div className="flex justify-between items-start gap-3 mb-2">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 text-xs mb-1">
                <span className="px-2 py-0.5 bg-gray-100 rounded">#{i + 1}</span>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">📄 Asli</span>
                {s.topik && <span className="text-gray-600">· {s.topik}</span>}
                <span className="text-gray-500">· level {s.level}</span>
                {s.sumberFile && <span className="text-gray-500">· {s.sumberFile}</span>}
              </div>
              <div className="text-sm leading-relaxed line-clamp-3">
                <MathText>{s.pertanyaan}</MathText>
              </div>
            </div>
            <Link
              href={`/latihan/${materiSlug}/${subMateriSlug}?soalId=${s.id}`}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 whitespace-nowrap"
            >
              Kerjakan →
            </Link>
          </div>

          <div className="mt-3 pl-4 border-l-2 border-purple-200">
            {s.variasi.length === 0 ? (
              <button
                onClick={() => buatVariasi(s.id)}
                disabled={generating[s.id]}
                className="text-sm text-purple-700 hover:underline disabled:opacity-50"
              >
                {generating[s.id] ? "Membuat 2 variasi..." : "✨ Buat 2 variasi AI"}
              </button>
            ) : (
              <div className="space-y-2">
                {s.variasi.map((v, j) => (
                  <div key={v.id} className="flex justify-between items-start gap-3 text-sm">
                    <div className="flex-1">
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded mr-2">
                        🤖 Variasi {j + 1}
                      </span>
                      <span className="line-clamp-2"><MathText>{v.pertanyaan}</MathText></span>
                    </div>
                    <Link
                      href={`/latihan/${materiSlug}/${subMateriSlug}?soalId=${v.id}`}
                      className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 whitespace-nowrap"
                    >
                      Kerjakan →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
