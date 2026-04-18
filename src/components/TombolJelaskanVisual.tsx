"use client";

import { useState } from "react";
import type { Audiens } from "@/types";

type Hasil = { narasi: string; svg: string };

export function TombolJelaskanVisual({
  konsep,
  konteks,
  audiens,
}: {
  konsep: string;
  konteks?: string;
  audiens: Audiens;
}) {
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function minta() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/jelaskan-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ konsep, konteks, ...audiens }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setHasil(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={minta}
        disabled={loading}
        className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? "Memuat penjelasan visual..." : "🎨 Minta Bantuan Visual"}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {hasil && (
        <div className="mt-3 p-4 bg-purple-50 rounded-lg">
          <div
            className="mb-3"
            dangerouslySetInnerHTML={{ __html: hasil.svg }}
          />
          <p className="text-sm whitespace-pre-wrap">{hasil.narasi}</p>
        </div>
      )}
    </div>
  );
}
