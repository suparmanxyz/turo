"use client";

import { useCallback, useEffect, useState, use, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { PetaPrasyarat, Soal, ModeLatihan, NodePrasyarat } from "@/types";
import { MathText } from "@/components/MathText";
import { PembahasanBertahap } from "@/components/PembahasanBertahap";

type Fase = "awal" | "melihat-soal" | "menjawab" | "hasil";

export default function LatihanPage(props: { params: Promise<{ slug: string; sub: string }> }) {
  return (
    <Suspense fallback={<main className="p-8">Memuat...</main>}>
      <LatihanInner {...props} />
    </Suspense>
  );
}

function LatihanInner({ params }: { params: Promise<{ slug: string; sub: string }> }) {
  const { slug, sub } = use(params);
  const searchParams = useSearchParams();
  const soalIdAwal = searchParams.get("soalId");
  const [mode, setMode] = useState<ModeLatihan>("turun");
  const [mulai, setMulai] = useState(false);

  const [peta, setPeta] = useState<PetaPrasyarat | null>(null);
  const [petaLoading, setPetaLoading] = useState(false);

  const [nodeAktif, setNodeAktif] = useState<string | null>(null);
  const [soal, setSoal] = useState<(Soal & { _sumber?: string; _id?: string; _sumberFile?: string }) | null>(null);
  const [soalLoading, setSoalLoading] = useState(false);
  const [hindariIds, setHindariIds] = useState<string[]>([]);

  const [nodesSelesai, setNodesSelesai] = useState<Set<string>>(new Set());
  const [fase, setFase] = useState<Fase>("awal");
  const [jawaban, setJawaban] = useState("");
  const [feedback, setFeedback] = useState<"benar" | "salah" | null>(null);

  const [hint, setHint] = useState<string[] | null>(null);
  const [hintIdx, setHintIdx] = useState(0);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintTampil, setHintTampil] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function fetchJson(url: string, body: unknown) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const teks = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${teks.slice(0, 300)}`);
    try {
      return JSON.parse(teks);
    } catch {
      throw new Error(`response bukan JSON: ${teks.slice(0, 300)}`);
    }
  }

  const topikAwal = sub.replace(/-/g, " ");

  const generatePeta = useCallback(
    async (soalTarget: string) => {
      setPetaLoading(true);
      try {
        const data: PetaPrasyarat = await fetchJson("/api/peta-prasyarat", {
          subMateri: topikAwal,
          soalTarget,
        });
        setPeta(data);
      } catch (e) {
        setError(`Gagal generate peta: ${e instanceof Error ? e.message : e}`);
      } finally {
        setPetaLoading(false);
      }
    },
    [topikAwal],
  );

  const generateSoalUntukNode = useCallback(
    async (node: NodePrasyarat | null, topikOverride?: string, levelOverride?: number) => {
      setSoalLoading(true);
      setSoal(null);
      setFeedback(null);
      setJawaban("");
      setHint(null);
      setHintIdx(0);
      setHintTampil(false);
      setFase("melihat-soal");
      setError(null);
      try {
        const topik = topikOverride ?? node?.topik ?? topikAwal;
        const level = levelOverride ?? node?.level ?? 0;
        const body: Record<string, unknown> = { topik, level, hindariIds };
        if (!node) {
          body.materiSlug = slug;
          body.subMateriSlug = sub;
        }
        const data = await fetchJson("/api/generate-soal", body);
        const nodeId = node?.id ?? "root";
        setSoal({ id: crypto.randomUUID(), nodeId, level, ...data });
        if (data._id) setHindariIds((prev) => [...prev, data._id]);
        return data as { pertanyaan: string };
      } catch (e) {
        setError(`Gagal generate soal: ${e instanceof Error ? e.message : e}`);
        return null;
      } finally {
        setSoalLoading(false);
      }
    },
    [topikAwal, slug, sub, hindariIds],
  );

  async function mulaiLatihan() {
    setMulai(true);
    setPeta(null);
    setNodesSelesai(new Set());
    setNodeAktif(null);
    const hasil = await generateSoalUntukNode(null, topikAwal, 0);
    if (hasil?.pertanyaan) {
      generatePeta(hasil.pertanyaan);
    }
  }

  const muatSoalById = useCallback(async (id: string) => {
    setSoalLoading(true);
    setMulai(true);
    setError(null);
    try {
      const data = await fetchJson(`/api/soal-by-id?id=${encodeURIComponent(id)}`, undefined as never)
        .catch(async () => {
          const r = await fetch(`/api/soal-by-id?id=${encodeURIComponent(id)}`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        });
      setSoal({ id: crypto.randomUUID(), nodeId: "root", level: 0, ...data });
      setFase("melihat-soal");
      generatePeta(data.pertanyaan);
    } catch (e) {
      setError(`Gagal muat soal: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSoalLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (soalIdAwal) muatSoalById(soalIdAwal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soalIdAwal]);

  function cekJawaban() {
    if (!soal) return;
    const benar = jawaban.trim().toLowerCase() === soal.jawabanBenar.trim().toLowerCase();
    setFeedback(benar ? "benar" : "salah");
    setFase("hasil");
    if (benar) {
      const baru = new Set(nodesSelesai);
      baru.add(soal.nodeId);
      setNodesSelesai(baru);
    }
  }

  async function skipKePrasyarat() {
    if (!peta) {
      setError("Peta prasyarat belum siap, tunggu sebentar...");
      return;
    }
    const next = pilihSkipBerikutnya(peta, soal?.nodeId ?? "root", nodesSelesai, mode);
    if (!next) {
      setError("Tidak ada prasyarat tersisa.");
      return;
    }
    setNodeAktif(next.id);
    await generateSoalUntukNode(next);
  }

  async function lanjutSetelahBenar() {
    if (!peta) {
      await mulaiLatihan();
      return;
    }
    const berikut = pilihBerikutnya(peta, soal?.nodeId ?? "root", new Set(nodesSelesai).add(soal!.nodeId), mode);
    if (!berikut) {
      alert("🎉 Semua node selesai!");
      return;
    }
    setNodeAktif(berikut.id);
    await generateSoalUntukNode(berikut);
  }

  async function cobaSoalLain() {
    if (!soal) return;
    const node = peta?.nodes.find((n) => n.id === soal.nodeId) ?? null;
    await generateSoalUntukNode(node, node ? undefined : topikAwal, node ? undefined : 0);
  }

  async function mintaHint() {
    if (!soal) return;
    setHintTampil(true);
    if (hint) {
      setHintIdx((i) => Math.min(i + 1, hint.length - 1));
      return;
    }
    setHintLoading(true);
    try {
      const data = await fetchJson("/api/hint", { soal: soal.pertanyaan });
      setHint(data.petunjuk);
      setHintIdx(0);
    } catch (e) {
      setError(`Gagal ambil hint: ${e instanceof Error ? e.message : e}`);
    } finally {
      setHintLoading(false);
    }
  }

  const nodeInfo = soal
    ? peta?.nodes.find((n) => n.id === soal.nodeId) ??
      ({ id: "root", topik: topikAwal, level: 0, prasyarat: [] } as NodePrasyarat)
    : null;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href={`/materi/${slug}/${sub}`} className="text-sm text-blue-600 hover:underline">
        ← Kembali ke materi
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-4">Latihan: {topikAwal}</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded text-sm text-red-700">
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)} className="ml-3 underline">Tutup</button>
        </div>
      )}

      {!mulai ? (
        <div className="space-y-4">
          <p className="text-gray-600">Pilih mode latihan:</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "turun"} onChange={() => setMode("turun")} />
              Mulai dari soal olimpiade → kalau belum siap, turun ke prasyarat
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "naik"} onChange={() => setMode("naik")} />
              Mulai dari dasar → naik ke olimpiade
            </label>
          </div>
          <button
            onClick={mulaiLatihan}
            className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Mulai
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 bg-gray-50 rounded text-sm flex flex-wrap gap-3 justify-between">
            <span><strong>Topik:</strong> {nodeInfo?.topik ?? "..."} (level {nodeInfo?.level ?? "-"})</span>
            <span>
              <strong>Progres:</strong> {nodesSelesai.size}/{peta?.nodes.length ?? "?"}
              {petaLoading && <em className="ml-2 text-gray-500">(peta prasyarat di-generate...)</em>}
            </span>
          </div>

          {soalLoading && <p className="p-4">Memuat soal...</p>}

          {soal && !soalLoading && (
            <div className="p-5 border rounded-lg">
              <div className="mb-2 flex items-center gap-2 text-xs">
                {soal._sumber === "manual" ? (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded" title={soal._sumberFile}>
                    📄 Soal asli {soal._sumberFile ? `(${soal._sumberFile})` : ""}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                    🤖 Dibuat AI
                  </span>
                )}
              </div>
              <div className="mb-4 whitespace-pre-wrap leading-relaxed">
                <MathText>{soal.pertanyaan}</MathText>
              </div>

              {soal.opsi && soal.opsi.length > 0 && fase !== "hasil" && (
                <ul className="text-sm mb-4 space-y-1">
                  {soal.opsi.map((o, i) => (
                    <li key={i}>
                      {String.fromCharCode(65 + i)}. <MathText>{o}</MathText>
                    </li>
                  ))}
                </ul>
              )}

              {fase === "melihat-soal" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFase("menjawab")}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    ✍️ Jawab
                  </button>
                  <button
                    onClick={mintaHint}
                    disabled={hintLoading}
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                  >
                    💡 Hint
                  </button>
                  <button
                    onClick={skipKePrasyarat}
                    disabled={petaLoading || !peta}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                    title={!peta ? "Peta prasyarat belum siap" : ""}
                  >
                    ⏭️ Skip → Prasyarat
                  </button>
                </div>
              )}

              {fase === "menjawab" && (
                <div className="space-y-3">
                  <input
                    value={jawaban}
                    onChange={(e) => setJawaban(e.target.value)}
                    placeholder="Tulis jawaban..."
                    className="w-full px-3 py-2 border rounded"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={cekJawaban}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Cek Jawaban
                    </button>
                    <button
                      onClick={() => setFase("melihat-soal")}
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Batal
                    </button>
                    <button
                      onClick={mintaHint}
                      disabled={hintLoading}
                      className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                    >
                      💡 Hint
                    </button>
                  </div>
                </div>
              )}

              {fase === "hasil" && (
                <div>
                  <p className={feedback === "benar" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {feedback === "benar" ? "✓ Benar!" : `✗ Belum tepat. Jawaban: ${soal.jawabanBenar}`}
                  </p>
                  <details className="mt-3 text-sm" open>
                    <summary className="cursor-pointer font-medium">📝 Pembahasan bertahap</summary>
                    <div className="mt-3">
                      <PembahasanBertahap
                        key={soal.id}
                        soal={soal.pertanyaan}
                        pembahasan={soal.pembahasan}
                      />
                    </div>
                  </details>
                  <div className="mt-3 flex gap-2">
                    {feedback === "benar" ? (
                      <button
                        onClick={lanjutSetelahBenar}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Lanjut →
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={cobaSoalLain}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Coba Soal Lain
                        </button>
                        <button
                          onClick={skipKePrasyarat}
                          disabled={petaLoading || !peta}
                          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                        >
                          ⏭️ Turun ke Prasyarat
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {hintTampil && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setHintTampil(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-3">💡 Petunjuk {hint ? `${hintIdx + 1}/${hint.length}` : ""}</h3>
            {hintLoading && <p>Memuat hint...</p>}
            {hint && (
              <div className="text-sm leading-relaxed">
                <MathText>{hint[hintIdx]}</MathText>
              </div>
            )}
            <div className="mt-4 flex justify-between">
              {hint && hintIdx < hint.length - 1 ? (
                <button
                  onClick={() => setHintIdx((i) => i + 1)}
                  className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm"
                >
                  Hint Berikutnya →
                </button>
              ) : <span />}
              <button
                onClick={() => setHintTampil(false)}
                className="px-3 py-1.5 bg-gray-200 rounded text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function pilihBerikutnya(
  peta: PetaPrasyarat,
  sekarang: string,
  selesai: Set<string>,
  mode: ModeLatihan,
): NodePrasyarat | null {
  const nodeSekarang = peta.nodes.find((n) => n.id === sekarang);
  if (!nodeSekarang) return null;

  if (mode === "turun") {
    const parent = peta.nodes.find(
      (n) => n.prasyarat.includes(sekarang) && !selesai.has(n.id)
        && n.prasyarat.every((p) => selesai.has(p)),
    );
    if (parent) return parent;
    const saudara = peta.nodes.find(
      (n) => n.level === nodeSekarang.level && !selesai.has(n.id),
    );
    return saudara ?? null;
  } else {
    const dependent = peta.nodes.find(
      (n) => n.prasyarat.includes(sekarang) && !selesai.has(n.id)
        && n.prasyarat.every((p) => selesai.has(p)),
    );
    if (dependent) return dependent;
    const saudara = peta.nodes.find(
      (n) => n.level === nodeSekarang.level && !selesai.has(n.id),
    );
    return saudara ?? null;
  }
}

function pilihSkipBerikutnya(
  peta: PetaPrasyarat,
  sekarang: string,
  selesai: Set<string>,
  _mode: ModeLatihan,
): NodePrasyarat | null {
  const nodeSekarang = peta.nodes.find((n) => n.id === sekarang);
  if (nodeSekarang) {
    const prasyarat = nodeSekarang.prasyarat
      .map((id) => peta.nodes.find((n) => n.id === id))
      .filter((n): n is NodePrasyarat => !!n && !selesai.has(n.id));
    if (prasyarat.length) return prasyarat[0];
  }
  const terdalam = [...peta.nodes]
    .filter((n) => !selesai.has(n.id) && n.id !== sekarang)
    .sort((a, b) => b.level - a.level)[0];
  return terdalam ?? null;
}
