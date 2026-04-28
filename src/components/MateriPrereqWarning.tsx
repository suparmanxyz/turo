"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type MasterySnapshot = {
  weakPrereqCount: number;
  totalPrereq: number;
  /** Sample 3 sub-materi prereq lemah untuk preview. */
  weakSamples: { kode: string; nama: string }[];
};

/**
 * Soft warning banner di halaman /materi/[slug] — auto-fetch mastery user untuk
 * prereq agregat bab. Kalau ada prereq lemah, tampil warning + tombol cek.
 *
 * Render NOTHING kalau:
 * - User belum login
 * - Tidak ada prereq lemah (mastery semua siap atau belum di-assess)
 * - Loading / error
 *
 * Tujuan: nudge user ke cek kesiapan bab kalau sistem sudah punya data yang
 * indikasi prereq lemah, tanpa memaksa.
 */
export function MateriPrereqWarning({
  materiSlug,
  subKodes,
}: {
  materiSlug: string;
  subKodes: string[];
}) {
  const { user } = useAuth();
  const [snap, setSnap] = useState<MasterySnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || subKodes.length === 0) return;
    setLoading(true);
    let cancelled = false;
    async function check() {
      try {
        const idToken = await user!.getIdToken();
        const res = await fetch("/api/cek-kesiapan-bab/peek", {
          method: "POST",
          headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ materiSlug, subKodes }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSnap(data);
      } catch {
        // Best-effort, jangan blokir page render
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [user, materiSlug, subKodes.join(",")]);

  if (loading || !snap) return null;
  // Hanya tampil kalau ada >0 prereq dengan status remediasi (yang sudah di-assess & lemah)
  if (snap.weakPrereqCount === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 animate-rise">
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0">⚠</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-amber-900">Beberapa prasyarat bab ini terdeteksi lemah</p>
          <p className="text-sm text-amber-800 mt-1">
            Berdasarkan riwayat tes & latihanmu, ada <strong>{snap.weakPrereqCount}</strong> dari {snap.totalPrereq} prasyarat bab yang status-nya perlu remediasi.
            Cek kesiapan bab dulu biar tahu apakah perlu review prereq atau langsung lanjut.
          </p>
          {snap.weakSamples.length > 0 && (
            <ul className="mt-2 text-xs text-amber-700 space-y-0.5">
              {snap.weakSamples.map((s) => (
                <li key={s.kode} className="flex items-center gap-1.5">
                  <span>•</span>
                  <span className="font-mono">{s.kode}</span>
                  <span className="text-amber-600">— {s.nama}</span>
                </li>
              ))}
              {snap.weakPrereqCount > snap.weakSamples.length && (
                <li className="text-amber-500">+ {snap.weakPrereqCount - snap.weakSamples.length} lainnya</li>
              )}
            </ul>
          )}
          <div className="mt-3 flex gap-2 flex-wrap">
            <Link
              href={`/cek-kesiapan-bab/${materiSlug}`}
              className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 text-sm"
            >
              🎯 Cek Kesiapan Bab
            </Link>
            <button
              onClick={() => setSnap(null)}
              className="rounded-lg bg-white hover:bg-amber-100 text-amber-700 font-medium px-4 py-2 text-sm border border-amber-300"
            >
              Lewatin saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
