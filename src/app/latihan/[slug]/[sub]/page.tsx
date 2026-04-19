"use client";

import { useCallback, useEffect, useState, use, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Audiens, PetaPrasyarat, Soal, ModeLatihan, NodePrasyarat } from "@/types";
import { MathText } from "@/components/MathText";
import { PembahasanBertahap } from "@/components/PembahasanBertahap";
import { DAFTAR_MATERI } from "@/data/materi";
import { temaUntukMateri, TEMA_KATEGORI_UTAMA } from "@/lib/kategori-tema";
import { useAuth } from "@/contexts/AuthContext";
import { loadSesi, saveSesi } from "@/lib/progress";

type Fase = "awal" | "melihat-soal" | "menjawab" | "hasil";

export default function LatihanPage(props: { params: Promise<{ slug: string; sub: string }> }) {
  return (
    <Suspense fallback={
      <main className="p-8 text-slate-400 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
        Memuat...
      </main>
    }>
      <LatihanInner {...props} />
    </Suspense>
  );
}

function LatihanInner({ params }: { params: Promise<{ slug: string; sub: string }> }) {
  const { slug, sub } = use(params);
  const searchParams = useSearchParams();
  const soalIdAwal = searchParams.get("soalId");
  const { user } = useAuth();

  const materi = DAFTAR_MATERI.find((m) => m.slug === slug);
  const audiens: Audiens = materi
    ? { kategoriUtama: materi.kategoriUtama, jenjang: materi.jenjang, kelas: materi.kelas }
    : { kategoriUtama: "reguler", jenjang: "smp" };
  const t = materi ? temaUntukMateri(materi) : TEMA_KATEGORI_UTAMA.reguler;

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

  // ── Progress tracking ──
  const [jumlahDijawab, setJumlahDijawab] = useState(0);
  const [jumlahBenar, setJumlahBenar] = useState(0);
  const [sesiDipulihkan, setSesiDipulihkan] = useState(false);

  const persist = useCallback(
    (override: Partial<{ nodesSelesai: Set<string>; jumlahDijawab: number; jumlahBenar: number; nodeIdSekarang: string | null; mode: ModeLatihan }> = {}) => {
      if (!user) return;
      saveSesi(user.uid, {
        materiSlug: slug,
        subMateriSlug: sub,
        mode: override.mode ?? mode,
        nodeIdsBenar: Array.from(override.nodesSelesai ?? nodesSelesai),
        nodeIdSekarang: override.nodeIdSekarang ?? soal?.nodeId ?? null,
        jumlahDijawab: override.jumlahDijawab ?? jumlahDijawab,
        jumlahBenar: override.jumlahBenar ?? jumlahBenar,
      });
    },
    [user, slug, sub, mode, nodesSelesai, soal, jumlahDijawab, jumlahBenar],
  );

  // Load sesi tersimpan saat mount (skip kalau anonymous atau soal-by-id mode)
  useEffect(() => {
    if (!user || soalIdAwal) return;
    loadSesi(user.uid, slug, sub).then((s) => {
      if (s && s.jumlahDijawab > 0) {
        setMode(s.mode);
        setNodesSelesai(new Set(s.nodeIdsBenar));
        setJumlahDijawab(s.jumlahDijawab);
        setJumlahBenar(s.jumlahBenar);
        setSesiDipulihkan(true);
      }
    });
  }, [user, slug, sub, soalIdAwal]);

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
          ...audiens,
        });
        setPeta(data);
      } catch (e) {
        setError(`Gagal generate peta: ${e instanceof Error ? e.message : e}`);
      } finally {
        setPetaLoading(false);
      }
    },
    [topikAwal, audiens],
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
        const body: Record<string, unknown> = { topik, level, hindariIds, ...audiens };
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
    [topikAwal, slug, sub, hindariIds, audiens],
  );

  async function mulaiLatihan() {
    setMulai(true);
    setPeta(null);
    setNodesSelesai(new Set());
    setNodeAktif(null);
    setJumlahDijawab(0);
    setJumlahBenar(0);
    setSesiDipulihkan(false);
    const hasil = await generateSoalUntukNode(null, topikAwal, 0);
    if (hasil?.pertanyaan) {
      generatePeta(hasil.pertanyaan);
    }
  }

  /** Lanjutkan dari sesi yang dipulihkan — preserve nodesSelesai, jumlah counter, mode. */
  async function lanjutkanSesi() {
    setMulai(true);
    setPeta(null);
    setNodeAktif(null);
    setSesiDipulihkan(false);
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
    const dijawabBaru = jumlahDijawab + 1;
    const benarBaru = jumlahBenar + (benar ? 1 : 0);
    setJumlahDijawab(dijawabBaru);
    setJumlahBenar(benarBaru);
    if (benar) {
      const baru = new Set(nodesSelesai);
      baru.add(soal.nodeId);
      setNodesSelesai(baru);
      persist({ nodesSelesai: baru, jumlahDijawab: dijawabBaru, jumlahBenar: benarBaru, nodeIdSekarang: soal.nodeId });
    } else {
      persist({ jumlahDijawab: dijawabBaru, jumlahBenar: benarBaru, nodeIdSekarang: soal.nodeId });
    }
  }

  async function skipKePrasyarat() {
    if (!peta) {
      setError("Peta prasyarat belum siap, tunggu sebentar...");
      return;
    }
    const nodeIdSekarang = soal?.nodeId === "root" ? peta.rootId : (soal?.nodeId ?? peta.rootId);
    const next = pilihSkipBerikutnya(peta, nodeIdSekarang, nodesSelesai, mode);
    if (!next) {
      setError("Tidak ada prasyarat tersisa.");
      return;
    }
    setNodeAktif(next.id);
    await generateSoalUntukNode(next);
  }

  async function lanjutSetelahBenar() {
    if (!peta) {
      // Peta belum siap — info ke user, jangan restart latihan
      setError("Peta prasyarat masih di-generate, tunggu sebentar lalu klik lagi…");
      return;
    }
    // Soal pertama hardcode nodeId="root", tapi peta.rootId beda (e.g. "kpk-fpb-aplikasi").
    // Map "root" ke peta.rootId supaya pilihBerikutnya bisa find nodeSekarang.
    const nodeIdSekarang = soal?.nodeId === "root" ? peta.rootId : (soal?.nodeId ?? peta.rootId);
    const berikut = pilihBerikutnya(peta, nodeIdSekarang, new Set(nodesSelesai).add(nodeIdSekarang), mode);
    if (!berikut) {
      alert("🎉 Semua node prasyarat selesai!");
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
      const data = await fetchJson("/api/hint", { soal: soal.pertanyaan, ...audiens });
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

  const totalNodes = peta?.nodes.length ?? 0;
  const persen = totalNodes > 0 ? Math.round((nodesSelesai.size / totalNodes) * 100) : 0;

  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-10">
      <Link
        href={`/materi/${slug}/${sub}`}
        className="text-sm text-slate-500 hover:text-brand inline-flex items-center gap-1 transition"
      >
        ← Kembali ke materi
      </Link>

      <div className="mt-3 mb-6 animate-rise">
        <span className={`inline-flex items-center gap-1.5 rounded-full ${t.badge} px-2.5 py-1 text-xs font-medium`}>
          {t.emoji} Latihan
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold mt-3 capitalize">{topikAwal}</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-start justify-between gap-3 animate-rise">
          <div><strong>Error:</strong> {error}</div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 underline shrink-0">
            Tutup
          </button>
        </div>
      )}

      {sesiDipulihkan && !mulai && (
        <div className={`mb-4 p-4 rounded-xl border-2 ${t.border} ${t.bgSoft} animate-rise`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="text-sm">
              <strong className={t.textStrong}>📌 Sesi sebelumnya dipulihkan</strong>
              <p className="text-slate-600 mt-1">
                {jumlahBenar}/{jumlahDijawab} soal benar · {nodesSelesai.size} prasyarat dikuasai · mode <em>{mode === "turun" ? "turun" : "naik"}</em>.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={lanjutkanSesi}
              className={`inline-flex items-center gap-1.5 rounded-xl ${t.gradient} text-white px-4 py-2 font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all`}
            >
              ▶ Lanjutkan
            </button>
            <button
              onClick={() => {
                setNodesSelesai(new Set());
                setJumlahDijawab(0);
                setJumlahBenar(0);
                setSesiDipulihkan(false);
                persist({ nodesSelesai: new Set(), jumlahDijawab: 0, jumlahBenar: 0, nodeIdSekarang: null });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 px-4 py-2 font-medium hover:bg-slate-50 transition"
            >
              Mulai dari awal
            </button>
          </div>
        </div>
      )}

      {!mulai ? (
        <div className="space-y-5 animate-rise">
          <p className="text-slate-600">Pilih mode latihan:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`group cursor-pointer rounded-2xl border-2 p-5 transition ${mode === "turun" ? `${t.border} ${t.bgSoft}` : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <input type="radio" checked={mode === "turun"} onChange={() => setMode("turun")} className="sr-only" />
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⬇️</span>
                <span className={`font-bold ${mode === "turun" ? t.textStrong : "text-slate-900"}`}>Mode Turun</span>
              </div>
              <p className="text-sm text-slate-600">Mulai dari soal target → kalau belum siap, turun ke prasyarat lebih dasar.</p>
            </label>
            <label className={`group cursor-pointer rounded-2xl border-2 p-5 transition ${mode === "naik" ? `${t.border} ${t.bgSoft}` : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <input type="radio" checked={mode === "naik"} onChange={() => setMode("naik")} className="sr-only" />
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⬆️</span>
                <span className={`font-bold ${mode === "naik" ? t.textStrong : "text-slate-900"}`}>Mode Naik</span>
              </div>
              <p className="text-sm text-slate-600">Mulai dari konsep dasar → naik bertahap menuju soal target.</p>
            </label>
          </div>
          <button
            onClick={mulaiLatihan}
            className={`inline-flex items-center gap-2 rounded-xl ${t.gradient} ${t.shadow} text-white px-6 py-3 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all`}
          >
            ▶ Mulai
          </button>
        </div>
      ) : (
        <>
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-3 justify-between text-sm mb-3">
              <span className="text-slate-700">
                <strong>Topik:</strong> {nodeInfo?.topik ?? "..."}{" "}
                <span className={`ml-1 inline-flex items-center rounded-full ${t.badge} px-2 py-0.5 text-xs font-medium`}>
                  level {nodeInfo?.level ?? "-"}
                </span>
              </span>
              <span className="text-slate-700">
                <strong>Progres:</strong> {nodesSelesai.size}/{totalNodes || "?"}
                {petaLoading && <em className="ml-2 text-slate-500">(peta di-generate...)</em>}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full ${t.gradient} transition-all duration-500`}
                style={{ width: `${persen}%` }}
              />
            </div>
          </div>

          {soalLoading && (
            <div className="p-6 rounded-2xl border border-slate-200 bg-white text-center text-slate-500">
              <div className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-brand animate-pulse" style={{ animationDelay: "0.2s" }} />
                <span className="h-2 w-2 rounded-full bg-brand animate-pulse" style={{ animationDelay: "0.4s" }} />
                <span className="ml-2">Memuat soal...</span>
              </div>
            </div>
          )}

          {soal && !soalLoading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm animate-rise">
              <div className="mb-3 flex items-center gap-2 text-xs">
                {soal._sumber === "manual" ? (
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium" title={soal._sumberFile}>
                    📄 Soal asli {soal._sumberFile ? `(${soal._sumberFile})` : ""}
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full font-medium">
                    🤖 Dibuat AI
                  </span>
                )}
              </div>
              <div className="mb-5 whitespace-pre-wrap leading-relaxed text-lg">
                <MathText>{soal.pertanyaan}</MathText>
              </div>

              {soal.opsi && soal.opsi.length > 0 && fase !== "hasil" && (
                <ul className="text-sm mb-5 space-y-2">
                  {soal.opsi.map((o, i) => (
                    <li key={i} className="flex gap-2">
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${t.bgSoftStrong} ${t.text} text-xs font-bold`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <MathText>{o}</MathText>
                    </li>
                  ))}
                </ul>
              )}

              {fase === "melihat-soal" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFase("menjawab")}
                    className={`inline-flex items-center gap-1.5 rounded-xl ${t.gradient} text-white px-4 py-2 font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all`}
                  >
                    ✍️ Jawab
                  </button>
                  <button
                    onClick={mintaHint}
                    disabled={hintLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 px-4 py-2 font-medium hover:bg-amber-200 disabled:opacity-50 transition"
                  >
                    💡 Hint
                  </button>
                  <button
                    onClick={skipKePrasyarat}
                    disabled={petaLoading || !peta}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 font-medium hover:bg-slate-200 disabled:opacity-50 transition"
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
                    className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 ${t.ring} focus:border-transparent transition`}
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={cekJawaban}
                      className={`inline-flex items-center gap-1.5 rounded-xl ${t.gradient} text-white px-4 py-2 font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all`}
                    >
                      Cek Jawaban
                    </button>
                    <button
                      onClick={() => setFase("melihat-soal")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 font-medium hover:bg-slate-200 transition"
                    >
                      Batal
                    </button>
                    <button
                      onClick={mintaHint}
                      disabled={hintLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 px-4 py-2 font-medium hover:bg-amber-200 disabled:opacity-50 transition"
                    >
                      💡 Hint
                    </button>
                  </div>
                </div>
              )}

              {fase === "hasil" && (
                <div>
                  <div className={`rounded-xl p-4 mb-4 font-semibold flex items-center gap-2 ${
                    feedback === "benar"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}>
                    {feedback === "benar" ? (
                      <><span className="text-2xl">🎉</span> Benar!</>
                    ) : (
                      <><span className="text-2xl">😅</span> Belum tepat. Jawaban: <span className="font-mono">{soal.jawabanBenar}</span></>
                    )}
                  </div>
                  <details className="text-sm rounded-xl border border-slate-200 bg-slate-50 p-4" open>
                    <summary className="cursor-pointer font-semibold text-slate-700">📝 Pembahasan bertahap</summary>
                    <div className="mt-3">
                      <PembahasanBertahap
                        key={soal.id}
                        soal={soal.pertanyaan}
                        pembahasan={soal.pembahasan}
                        audiens={audiens}
                      />
                    </div>
                  </details>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {feedback === "benar" ? (
                      <button
                        onClick={lanjutSetelahBenar}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white px-5 py-2.5 font-semibold shadow-md shadow-emerald-300/40 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                      >
                        Lanjut →
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={cobaSoalLain}
                          className={`inline-flex items-center gap-1.5 rounded-xl ${t.gradient} text-white px-4 py-2 font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all`}
                        >
                          Coba Soal Lain
                        </button>
                        <button
                          onClick={skipKePrasyarat}
                          disabled={petaLoading || !peta}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 font-medium hover:bg-slate-200 disabled:opacity-50 transition"
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
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-rise"
          onClick={() => setHintTampil(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              Petunjuk {hint ? `${hintIdx + 1}/${hint.length}` : ""}
            </h3>
            {hintLoading && <p className="text-slate-500">Memuat hint...</p>}
            {hint && (
              <div className="text-sm leading-relaxed text-slate-700">
                <MathText>{hint[hintIdx]}</MathText>
              </div>
            )}
            <div className="mt-5 flex justify-between">
              {hint && hintIdx < hint.length - 1 ? (
                <button
                  onClick={() => setHintIdx((i) => i + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-sm font-medium transition"
                >
                  Hint Berikutnya →
                </button>
              ) : <span />}
              <button
                onClick={() => setHintTampil(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium transition"
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
