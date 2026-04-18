"use client";

import { useState } from "react";
import type { Audiens } from "@/types";
import { MathText } from "./MathText";
import { ChatTahap } from "./ChatTahap";

const MAX_TIDAK = 3;

export function PembahasanBertahap({
  soal,
  pembahasan,
  audiens,
}: {
  soal: string;
  pembahasan: string[];
  audiens: Audiens;
}) {
  const [tahapIdx, setTahapIdx] = useState(0);
  const [penjelasanPerTahap, setPenjelasanPerTahap] = useState<Record<number, string[]>>({});
  const [tidakCountPerTahap, setTidakCountPerTahap] = useState<Record<number, number>>({});
  const [chatAktif, setChatAktif] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!pembahasan.length) return <p className="text-sm text-gray-500">Tidak ada pembahasan.</p>;

  const tidakCount = tidakCountPerTahap[tahapIdx] ?? 0;
  const penjelasanTambahan = penjelasanPerTahap[tahapIdx] ?? [];
  const langkahAkhir = tahapIdx >= pembahasan.length - 1;

  async function klikTidak() {
    if (tidakCount >= MAX_TIDAK) {
      setChatAktif(true);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/sederhanakan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soal,
          langkahSebelumnya: pembahasan.slice(0, tahapIdx),
          langkahIni: pembahasan[tahapIdx],
          percobaan: tidakCount,
          ...audiens,
        }),
      });
      const data = await r.json();
      setPenjelasanPerTahap((prev) => ({
        ...prev,
        [tahapIdx]: [...(prev[tahapIdx] ?? []), data.penjelasan ?? "(gagal)"],
      }));
      setTidakCountPerTahap((prev) => ({ ...prev, [tahapIdx]: tidakCount + 1 }));
    } catch {
      setPenjelasanPerTahap((prev) => ({
        ...prev,
        [tahapIdx]: [...(prev[tahapIdx] ?? []), "(gagal memuat penjelasan)"],
      }));
    } finally {
      setLoading(false);
    }
  }

  function lanjutTahap() {
    setChatAktif(false);
    if (!langkahAkhir) setTahapIdx(tahapIdx + 1);
  }

  return (
    <div className="space-y-3">
      {pembahasan.slice(0, tahapIdx + 1).map((langkah, i) => (
        <div key={i} className={i === tahapIdx ? "p-3 bg-blue-50 rounded border border-blue-200" : "p-3 bg-gray-50 rounded"}>
          <div className="flex gap-2">
            <span className="font-semibold text-blue-700">Langkah {i + 1}.</span>
            <div className="flex-1">
              <MathText>{langkah}</MathText>
              {(penjelasanPerTahap[i] ?? []).map((penj, j) => (
                <div key={j} className="mt-2 pl-3 border-l-2 border-yellow-400 text-sm text-gray-700">
                  <span className="text-xs font-semibold text-yellow-700">
                    💡 Penjelasan lebih sederhana ({j + 1}):
                  </span>
                  <div className="mt-1">
                    <MathText>{penj}</MathText>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {!langkahAkhir && !chatAktif && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {loading ? (
            <span className="text-sm text-gray-600">Menyederhanakan penjelasan...</span>
          ) : (
            <>
              <button
                onClick={lanjutTahap}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                ✓ Faham, lanjut
              </button>
              <button
                onClick={klikTidak}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                {tidakCount >= MAX_TIDAK ? "💬 Tanya AI" : "❌ Belum Faham"}
              </button>
              {tidakCount > 0 && tidakCount < MAX_TIDAK && (
                <span className="text-xs text-gray-500">
                  Percobaan {tidakCount}/{MAX_TIDAK}
                </span>
              )}
              {tidakCount >= MAX_TIDAK && (
                <span className="text-xs text-blue-600">
                  Sudah 3x penjelasan. Klik "Tanya AI" untuk diskusi langsung.
                </span>
              )}
            </>
          )}
        </div>
      )}

      {chatAktif && !langkahAkhir && (
        <>
          <ChatTahap
            soal={soal}
            langkahSebelumnya={pembahasan.slice(0, tahapIdx)}
            langkahIni={pembahasan[tahapIdx]}
            penjelasanTambahan={penjelasanTambahan}
            audiens={audiens}
            onTutup={() => setChatAktif(false)}
          />
          <div className="mt-3">
            <button
              onClick={lanjutTahap}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              ✓ Sudah Faham, Lanjut ke Langkah Berikutnya
            </button>
          </div>
        </>
      )}

      {langkahAkhir && (
        <div className="mt-2 p-3 bg-green-50 rounded text-sm text-green-700">
          ✓ Semua langkah selesai dijelaskan.
        </div>
      )}
    </div>
  );
}
