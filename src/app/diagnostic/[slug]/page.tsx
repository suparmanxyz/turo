"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Audiens, PetaPrasyarat } from "@/types";
import { DAFTAR_MATERI } from "@/data/materi";
import { temaUntukMateri, TEMA_KATEGORI_UTAMA } from "@/lib/kategori-tema";
import { MathText } from "@/components/MathText";
import { useAuth } from "@/contexts/AuthContext";
import { buatKeyDiagnostik, saveDiagnostik, type LaporanDiagnostik } from "@/lib/laporan";
import { cekMasteryBab, sudahMastery, MASTERY_THRESHOLD } from "@/lib/mastery";
import {
  evaluasiTahap,
  initPohonState,
  MAX_SOAL_DIAGNOSTIK,
  nodeById,
  nodeIdsPerluBelajar,
  semuaPohonSelesai,
  subKonsepUntuk,
  type JawabanUser,
  type PohonState,
  type SoalDiagnostik,
  type SoalMc,
} from "@/lib/diagnostic";

type Fase =
  | "loading-peta"
  | "generate-soal"
  | "menjawab"
  | "evaluasi"
  | "hasil"
  | "error";

export default function DiagnosticPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);
  const { user } = useAuth();

  const materi = DAFTAR_MATERI.find((m) => m.slug === slug);
  const audiens: Audiens = materi
    ? { kategoriUtama: materi.kategoriUtama, jenjang: materi.jenjang, kelas: materi.kelas }
    : { kategoriUtama: "reguler", jenjang: "smp" };
  const t = materi ? temaUntukMateri(materi) : TEMA_KATEGORI_UTAMA.reguler;

  const [fase, setFase] = useState<Fase>("loading-peta");
  const [error, setError] = useState<string | null>(null);
  const [peta, setPeta] = useState<PetaPrasyarat | null>(null);
  const [pohonStates, setPohonStates] = useState<PohonState[]>([]);
  const [tahapNo, setTahapNo] = useState(0);
  const [soalTahap, setSoalTahap] = useState<SoalDiagnostik[]>([]);
  const [jawaban, setJawaban] = useState<Record<string, number>>({});
  // Skip-known-mastery: nodeId yang otomatis dianggap dikuasai berdasar riwayat user
  const [autoMasteryNodes, setAutoMasteryNodes] = useState<Map<string, { skor: number; sumber: string }>>(new Map());
  // Akumulasi semua soal & jawaban dari semua tahap (untuk laporan hasil)
  const [riwayatSoal, setRiwayatSoal] = useState<SoalDiagnostik[]>([]);
  const [riwayatJawaban, setRiwayatJawaban] = useState<Record<string, number>>({});
  const [tersimpan, setTersimpan] = useState(false);

  // Navigation: 1 soal per layar
  const [idxSoal, setIdxSoal] = useState(0);
  const [lihatRingkasan, setLihatRingkasan] = useState(false);

  // Timing per soal: track waktu masuk vs keluar untuk akumulasi (mendukung back-and-forth)
  const [waktuPerSoal, setWaktuPerSoal] = useState<Record<string, number>>({});
  const [soalEnterMs, setSoalEnterMs] = useState<number>(0);
  const [tesMulaiMs] = useState<number>(() => Date.now());

  // ============================================================
  // 1. Load peta prasyarat (cache hit kalau sudah ada)
  // ============================================================
  useEffect(() => {
    if (!materi) {
      setError("Materi tidak ditemukan.");
      setFase("error");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/peta-prasyarat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subMateri: materi.nama,
            // Tidak kirim soalTarget → peta general untuk seluruh bab
            ...audiens,
          }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
        const data: PetaPrasyarat = await r.json();
        if (cancelled) return;
        setPeta(data);

        // Init pohon
        let states = initPohonState(data);

        // Skip-known-mastery: untuk pohon level 1 yang nodenya punya linkedSlug
        // dan user sudah mastery di bab itu → tandai "selesai-ok" otomatis.
        const autoMastery = new Map<string, { skor: number; sumber: string }>();
        if (user) {
          const cekJobs = states.map(async (p) => {
            const node = data.nodes.find((n) => n.id === p.pohonId);
            if (!node?.linkedSlug) return null;
            const info = await cekMasteryBab(user.uid, node.linkedSlug);
            if (sudahMastery(info)) {
              autoMastery.set(p.pohonId, { skor: info.skor!, sumber: info.sumber });
              return p.pohonId;
            }
            return null;
          });
          const skipIds = (await Promise.all(cekJobs)).filter((x): x is string => x !== null);
          if (skipIds.length > 0) {
            states = states.map((p) =>
              skipIds.includes(p.pohonId)
                ? { ...p, status: "selesai-ok" as const, nodeBenarIds: [...p.nodeBenarIds, p.pohonId] }
                : p,
            );
          }
        }
        setAutoMasteryNodes(autoMastery);
        setPohonStates(states);

        if (states.length === 0) {
          setError("Tidak ada prasyarat untuk materi ini — mungkin sudah materi paling dasar.");
          setFase("error");
          return;
        }
        setFase("generate-soal");
      } catch (e) {
        if (!cancelled) {
          setError(`Gagal memuat peta prasyarat: ${e instanceof Error ? e.message : e}`);
          setFase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ============================================================
  // 2. Generate batch soal untuk tahap saat ini (parallel)
  // ============================================================
  const generateSoalTahap = useCallback(async () => {
    if (!peta) return;
    setFase("generate-soal");
    setError(null);
    setJawaban({});

    type SoalGenJob = {
      nodeId: string;
      subKonsep: string;
      level: number;
      topik: string;
      jenisTahap: "initial" | "konfirmasi";
    };
    // Dedup per (nodeId, sub, jenisTahap). Pohon kembar yang share nodeAktif share soal.
    const jobMap = new Map<string, SoalGenJob>();
    for (const p of pohonStates) {
      if (p.status !== "aktif-initial" && p.status !== "aktif-konfirmasi") continue;
      const node = nodeById(peta, p.nodeAktifId);
      if (!node) continue;
      const subs =
        p.status === "aktif-konfirmasi"
          ? p.subKonsepPerluKonfirmasi
          : subKonsepUntuk(node);
      const jenis: "initial" | "konfirmasi" = p.status === "aktif-konfirmasi" ? "konfirmasi" : "initial";
      for (const sk of subs) {
        const key = `${node.id}__${sk}__${jenis}`;
        if (!jobMap.has(key)) {
          jobMap.set(key, {
            nodeId: node.id,
            subKonsep: sk,
            level: node.level,
            topik: node.topik,
            jenisTahap: jenis,
          });
        }
      }
    }
    let jobs = Array.from(jobMap.values());

    if (jobs.length === 0) {
      // Tidak ada pohon aktif lagi → langsung hasil
      setFase("hasil");
      return;
    }

    // Cap total soal: jangan generate kalau riwayat + jobs > MAX
    const totalSudah = riwayatSoal.length;
    if (totalSudah >= MAX_SOAL_DIAGNOSTIK) {
      setFase("hasil");
      return;
    }
    const sisaBudget = MAX_SOAL_DIAGNOSTIK - totalSudah;
    if (jobs.length > sisaBudget) {
      jobs = jobs.slice(0, sisaBudget);
    }

    // 1 soal per job (BUKAN n=2). Confirmation pattern menggantikan kebutuhan duplikasi.
    // Pakai allSettled biar 1 fail tidak gagal seluruh tahap — drop yang fail.
    const settled = await Promise.allSettled(
      jobs.map(async (job): Promise<SoalDiagnostik> => {
        const r = await fetch("/api/generate-soal-mc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topik: job.topik,
            subKonsep: job.subKonsep,
            level: job.level,
            n: 1,
            ...audiens,
          }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
        const data: { soal: SoalMc[] } = await r.json();
        const mc = data.soal[0];
        if (!mc) throw new Error("response kosong");
        return {
          id: crypto.randomUUID(),
          nodeId: job.nodeId,
          subKonsep: job.subKonsep,
          jenisTahap: job.jenisTahap,
          ...mc,
        };
      }),
    );
    const hasil: SoalDiagnostik[] = [];
    const gagal: string[] = [];
    for (let i = 0; i < settled.length; i++) {
      const res = settled[i];
      if (res.status === "fulfilled") hasil.push(res.value);
      else gagal.push(`${jobs[i].topik}/${jobs[i].subKonsep}: ${res.reason instanceof Error ? res.reason.message : res.reason}`);
    }

    if (hasil.length === 0) {
      // Semua fail — fatal
      setError(`Gagal generate semua soal di tahap ini:\n${gagal.slice(0, 3).join("\n")}`);
      setFase("error");
      return;
    }
    if (gagal.length > 0) {
      // Sebagian fail — log warning tapi lanjut
      console.warn(`Tahap berikut gagal: ${gagal.length}/${jobs.length} soal`, gagal);
    }
    setSoalTahap(hasil);
    setTahapNo((n) => n + 1);
    setFase("menjawab");
    setIdxSoal(0);
    setLihatRingkasan(false);
    setSoalEnterMs(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peta, pohonStates]);

  // Trigger generate setelah peta loaded / setelah evaluasi tahap
  useEffect(() => {
    if (fase === "generate-soal") {
      generateSoalTahap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  // Save hasil diagnostik ke Firestore saat fase=hasil (sekali saja)
  useEffect(() => {
    if (fase !== "hasil" || !user || !materi || !peta || tersimpan) return;
    const perluBelajarIds = nodeIdsPerluBelajar(pohonStates);
    const perluBelajar = perluBelajarIds
      .map((id) => nodeById(peta, id))
      .filter((n): n is NonNullable<typeof n> => !!n)
      .map((n) => {
        const linkedNama = n.linkedSlug
          ? DAFTAR_MATERI.find((m) => m.slug === n.linkedSlug)?.nama
          : undefined;
        return {
          nodeId: n.id,
          topik: n.topik,
          level: n.level,
          subKonsep: n.subKonsep,
          linkedSlug: n.linkedSlug,
          linkedNama,
        };
      });
    const totalSoal = riwayatSoal.length;
    const totalBenar = riwayatSoal.filter((s) => s.opsi[riwayatJawaban[s.id]]?.benar).length;
    const okPohon = pohonStates.filter((p) => p.status === "selesai-ok").length;
    const data: Omit<LaporanDiagnostik, "createdAt"> = {
      jenis: "diagnostik",
      materiSlug: materi.slug,
      materiNama: materi.nama,
      audiens,
      skorBenar: totalBenar,
      skorTotal: totalSoal,
      pohonOk: okPohon,
      waktuTotalMs: Date.now() - tesMulaiMs,
      perluBelajar,
      jawabanRiwayat: riwayatSoal.map((s) => {
        const jw = riwayatJawaban[s.id] ?? -1;
        const node = nodeById(peta, s.nodeId);
        return {
          pertanyaan: s.pertanyaan,
          opsi: s.opsi,
          jawabanIdx: jw,
          benar: jw >= 0 ? !!s.opsi[jw]?.benar : false,
          nodeTopik: node?.topik,
          nodeId: s.nodeId,
          nodeLevel: node?.level,
          subKonsep: s.subKonsep,
          jenisTahap: s.jenisTahap,
          waktuMs: waktuPerSoal[s.id],
          ...(s.svg ? { svg: s.svg } : {}),
        };
      }),
    };
    const key = buatKeyDiagnostik(materi.slug, "diagnostik");
    saveDiagnostik(user.uid, key, data).then(() => setTersimpan(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, user, materi, peta, tersimpan]);

  // ============================================================
  // 3. Submit jawaban tahap → evaluasi → loop atau hasil
  // ============================================================
  function pilihJawaban(soalId: string, idx: number) {
    setJawaban((j) => ({ ...j, [soalId]: idx }));
  }

  /** Catat akumulasi waktu di soal saat ini sebelum pindah. */
  function catatWaktuSoalAktif() {
    const s = soalTahap[idxSoal];
    if (!s || soalEnterMs === 0) return;
    const delta = Math.max(0, Date.now() - soalEnterMs);
    setWaktuPerSoal((w) => ({ ...w, [s.id]: (w[s.id] ?? 0) + delta }));
  }

  function gotoSoal(idx: number) {
    catatWaktuSoalAktif();
    setIdxSoal(idx);
    setSoalEnterMs(Date.now());
  }

  function gotoRingkasan() {
    catatWaktuSoalAktif();
    setLihatRingkasan(true);
  }

  function kembaliKeSoal(idx: number) {
    setLihatRingkasan(false);
    setIdxSoal(idx);
    setSoalEnterMs(Date.now());
  }

  const semuaTerjawab = soalTahap.length > 0 && soalTahap.every((s) => jawaban[s.id] !== undefined);

  // Keyboard shortcuts saat fase menjawab
  useEffect(() => {
    if (fase !== "menjawab") return;
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      // Skip kalau user sedang ngetik di input/textarea
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (lihatRingkasan) {
        if (e.key === "Escape") {
          e.preventDefault();
          kembaliKeSoal(idxSoal);
        } else if (e.key === "Enter" && semuaTerjawab) {
          e.preventDefault();
          submitTahap();
        }
        return;
      }

      const sAktif = soalTahap[idxSoal];
      if (!sAktif) return;

      // 1-4 atau A-D pilih opsi
      if (/^[1-4]$/.test(e.key)) {
        e.preventDefault();
        pilihJawaban(sAktif.id, parseInt(e.key) - 1);
        return;
      }
      if (/^[a-dA-D]$/.test(e.key)) {
        e.preventDefault();
        pilihJawaban(sAktif.id, e.key.toLowerCase().charCodeAt(0) - 97);
        return;
      }
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (idxSoal < soalTahap.length - 1) gotoSoal(idxSoal + 1);
        else gotoRingkasan();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (idxSoal > 0) gotoSoal(idxSoal - 1);
        return;
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, lihatRingkasan, idxSoal, soalTahap, semuaTerjawab]);

  function submitTahap() {
    if (!peta || !semuaTerjawab) return;
    // Catat waktu untuk soal terakhir yang dilihat
    catatWaktuSoalAktif();
    setFase("evaluasi");
    const jawabanArr: JawabanUser[] = Object.entries(jawaban).map(([soalId, pilihIdx]) => ({ soalId, pilihIdx }));
    const stateBaru = evaluasiTahap(peta, pohonStates, soalTahap, jawabanArr);
    setPohonStates(stateBaru);
    // Akumulasi riwayat
    setRiwayatSoal((r) => [...r, ...soalTahap]);
    setRiwayatJawaban((r) => ({ ...r, ...jawaban }));
    if (semuaPohonSelesai(stateBaru)) {
      setFase("hasil");
    } else {
      // Lanjut tahap berikut
      setFase("generate-soal");
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  if (!materi) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-rose-600">Materi tidak ditemukan.</p>
        <Link href="/" className="text-brand underline">← Kembali</Link>
      </main>
    );
  }

  // Mode menjawab: layout fit-viewport (no scroll halaman). Lainnya: layout normal.
  const fitViewport = fase === "menjawab";

  return (
    <main className={fitViewport
      ? "flex-1 flex flex-col h-[calc(100dvh-3.5rem)] overflow-hidden"
      : "mx-auto max-w-3xl p-6 sm:p-10"}
    >
      {!fitViewport && (
        <>
          <Link
            href={`/materi/${materi.slug}`}
            className="text-sm text-slate-500 hover:text-brand inline-flex items-center gap-1 transition"
          >
            ← {materi.nama}
          </Link>

          <div className="mt-3 mb-6 animate-rise">
            <span className={`inline-flex items-center gap-1.5 rounded-full ${t.badge} px-2.5 py-1 text-xs font-medium`}>
              🎯 Cek Kesiapan
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-3">
              Apakah kamu siap mempelajari{" "}
              <span className={t.text}>{materi.nama}</span>?
            </h1>
            <p className="text-slate-600 mt-2">
              Kami akan mengetes prasyarat materi ini secara adaptif.
              Kalau kamu kesulitan di satu konsep, soal akan turun ke prasyarat yang lebih dasar.
            </p>
          </div>
        </>
      )}

      {error && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
          <strong>Error:</strong> {error}
          <div className="mt-2">
            <Link href={`/materi/${materi.slug}`} className="underline text-rose-600">← Kembali ke materi</Link>
          </div>
        </div>
      )}

      {fase === "loading-peta" && (
        <div className={`rounded-2xl border ${t.border} ${t.bgSoft} p-6`}>
          <p className={`font-semibold ${t.textStrong} mb-2`}>📍 Membangun peta prasyarat materi…</p>
          <p className="text-sm text-slate-600">
            Pertama kali untuk materi ini akan agak lama (~10 detik). Selanjutnya cepat (cache).
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" style={{ animationDelay: "0.2s" }} />
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      )}

      {fase === "generate-soal" && peta && (
        <div className={`rounded-2xl border ${t.border} ${t.bgSoft} p-6`}>
          <p className={`font-semibold ${t.textStrong} mb-2`}>🧩 Menyusun soal Tahap {tahapNo + 1}…</p>
          <p className="text-sm text-slate-600">
            {pohonStates.filter((p) => p.status === "aktif-initial" || p.status === "aktif-konfirmasi").length} cabang materi aktif, sedang
            di-generate soal pilihan ganda dengan distractor analitis.
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" style={{ animationDelay: "0.2s" }} />
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      )}

      {fase === "menjawab" && (() => {
        const adaKonfirmasi = soalTahap.some((s) => s.jenisTahap === "konfirmasi");
        const semuaKonfirmasi = soalTahap.every((s) => s.jenisTahap === "konfirmasi");
        const sAktif = soalTahap[idxSoal];
        const terjawabCount = soalTahap.filter((s) => jawaban[s.id] !== undefined).length;
        const persen = soalTahap.length > 0 ? Math.round((terjawabCount / soalTahap.length) * 100) : 0;

        return (
          <>
            {/* Header compact (shrink-0) */}
            <div className={`shrink-0 px-4 sm:px-6 py-2.5 ${t.bgSoft} border-b ${t.border} text-sm`}>
              <div className="mx-auto max-w-3xl">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/materi/${materi.slug}`} className="text-xs text-slate-500 hover:text-brand">
                      ← keluar
                    </Link>
                    <span className="text-slate-300">·</span>
                    <strong className={t.textStrong}>Tahap {tahapNo}</strong>
                    {semuaKonfirmasi && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px]">🔁 konfirmasi</span>}
                    {adaKonfirmasi && !semuaKonfirmasi && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px]">campuran</span>}
                  </div>
                  <div className="text-xs text-slate-600">
                    Soal <strong>{idxSoal + 1}</strong>/{soalTahap.length} · {terjawabCount} terjawab
                  </div>
                </div>
                <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${t.gradient} transition-all duration-300`} style={{ width: `${persen}%` }} />
                </div>
              </div>
            </div>

            {/* Body soal — flex-1, scroll internal kalau perlu */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <div className="mx-auto max-w-3xl">
                {!lihatRingkasan && sAktif && (
                  <div key={sAktif.id} className="animate-rise">
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <span className={`px-2 py-0.5 ${t.badge} rounded-full font-medium`}>#{idxSoal + 1}</span>
                      <span className="text-slate-500 truncate">{nodeById(peta!, sAktif.nodeId)?.topik ?? sAktif.nodeId}</span>
                      {sAktif.jenisTahap === "konfirmasi" && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] shrink-0">🔁 konfirmasi</span>
                      )}
                    </div>
                    <div className="mb-3 leading-relaxed">
                      <MathText>{sAktif.pertanyaan}</MathText>
                    </div>
                    {sAktif.svg && (
                      <div
                        className="mb-3 flex justify-center bg-slate-50 rounded-lg p-2 [&_svg]:max-w-full [&_svg]:max-h-[35vh] [&_svg]:h-auto"
                        dangerouslySetInnerHTML={{ __html: sAktif.svg }}
                      />
                    )}
                    <ul className="space-y-1.5">
                      {sAktif.opsi.map((o, idx) => {
                        const dipilih = jawaban[sAktif.id] === idx;
                        return (
                          <li key={idx}>
                            <button
                              onClick={() => pilihJawaban(sAktif.id, idx)}
                              className={`group w-full text-left rounded-xl border-2 px-3 py-2.5 transition ${
                                dipilih
                                  ? `${t.border} ${t.bgSoft} ${t.textStrong} font-semibold`
                                  : "border-slate-200 hover:border-slate-300 bg-white"
                              }`}
                            >
                              <span className="inline-flex items-center gap-2.5">
                                <span className={`grid h-6 w-6 place-items-center rounded-md text-xs font-bold shrink-0 ${
                                  dipilih ? `${t.bgSoftStrong} ${t.text}` : "bg-slate-100 text-slate-600"
                                }`}>
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <MathText>{o.teks}</MathText>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {lihatRingkasan && (
                  <div className="animate-rise">
                    <h3 className="font-bold text-lg mb-2">Ringkasan Jawaban</h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Periksa jawaban kamu sebelum submit. Klik nomor untuk koreksi.
                    </p>
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 mb-4">
                      {soalTahap.map((s, i) => {
                        const sudahJawab = jawaban[s.id] !== undefined;
                        return (
                          <button
                            key={s.id}
                            onClick={() => kembaliKeSoal(i)}
                            className={`rounded-lg p-2 text-sm font-medium border transition ${
                              sudahJawab
                                ? `${t.bgSoftStrong} ${t.text} border-transparent hover:opacity-80`
                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            }`}
                            title={sudahJawab ? "Terjawab" : "Belum dijawab — klik untuk jawab"}
                          >
                            #{i + 1} {sudahJawab ? "✓" : "○"}
                          </button>
                        );
                      })}
                    </div>
                    {!semuaTerjawab && (
                      <p className="text-sm text-rose-600 mb-2">
                        ⚠ Masih ada {soalTahap.length - terjawabCount} soal belum dijawab.
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      💡 Keyboard: <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Enter</kbd> untuk submit, <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Esc</kbd> untuk kembali.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky bottom navigation (shrink-0) */}
            <div className="shrink-0 bg-white border-t border-slate-200 shadow-lg px-3 py-2.5">
              <div className="mx-auto max-w-3xl flex items-center gap-2">
                {!lihatRingkasan ? (
                  <>
                    <button
                      onClick={() => gotoSoal(idxSoal - 1)}
                      disabled={idxSoal === 0}
                      className="rounded-xl bg-white border border-slate-200 text-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      ← <span className="hidden sm:inline">Sebelumnya</span>
                    </button>
                    <div className="flex-1 text-center text-[11px] text-slate-500">
                      <kbd className="px-1 bg-slate-100 rounded text-[9px]">1-4</kbd>/<kbd className="px-1 bg-slate-100 rounded text-[9px]">A-D</kbd> pilih · <kbd className="px-1 bg-slate-100 rounded text-[9px]">←/→</kbd> nav
                      {jawaban[sAktif?.id ?? ""] === undefined && (
                        <div className="text-amber-600">belum dijawab</div>
                      )}
                    </div>
                    {idxSoal < soalTahap.length - 1 ? (
                      <button
                        onClick={() => gotoSoal(idxSoal + 1)}
                        className={`rounded-xl ${t.gradient} text-white px-4 py-2 text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.98] transition-all`}
                      >
                        <span className="hidden sm:inline">Berikutnya </span>→
                      </button>
                    ) : (
                      <button
                        onClick={gotoRingkasan}
                        className={`rounded-xl ${t.gradient} text-white px-4 py-2 text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.98] transition-all`}
                      >
                        Ringkasan →
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => kembaliKeSoal(idxSoal)}
                      className="rounded-xl bg-white border border-slate-200 text-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-50 transition"
                    >
                      ← Kembali
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={submitTahap}
                      disabled={!semuaTerjawab}
                      className={`rounded-xl ${t.gradient} text-white px-5 py-2 text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all`}
                    >
                      Submit Tahap {tahapNo}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {fase === "evaluasi" && (
        <div className={`rounded-2xl border ${t.border} ${t.bgSoft} p-6 text-center`}>
          <p className={`font-semibold ${t.textStrong}`}>⏳ Mengevaluasi jawaban…</p>
        </div>
      )}

      {fase === "hasil" && peta && (
        <DiagnostikHasil
          peta={peta}
          pohonStates={pohonStates}
          soalRiwayat={riwayatSoal}
          jawaban={riwayatJawaban}
          materiSlug={materi.slug}
          autoMasteryNodes={autoMasteryNodes}
          temaText={t.text}
          temaTextStrong={t.textStrong}
          temaGradient={t.gradient}
          temaBgSoft={t.bgSoft}
          temaBorder={t.border}
        />
      )}
    </main>
  );
}

// ============================================================
// Hasil + Rencana Belajar
// ============================================================

function DiagnostikHasil({
  peta,
  pohonStates,
  soalRiwayat,
  jawaban,
  materiSlug,
  autoMasteryNodes,
  temaText,
  temaTextStrong,
  temaGradient,
  temaBgSoft,
  temaBorder,
}: {
  peta: PetaPrasyarat;
  pohonStates: PohonState[];
  soalRiwayat: SoalDiagnostik[];
  jawaban: Record<string, number>;
  materiSlug: string;
  autoMasteryNodes: Map<string, { skor: number; sumber: string }>;
  temaText: string;
  temaTextStrong: string;
  temaGradient: string;
  temaBgSoft: string;
  temaBorder: string;
}) {
  const perluBelajarIds = nodeIdsPerluBelajar(pohonStates);
  const perluBelajarNodes = perluBelajarIds
    .map((id) => nodeById(peta, id))
    .filter((n): n is NonNullable<typeof n> => !!n);

  const okPohon = pohonStates.filter((p) => p.status === "selesai-ok");
  const autoOkCount = autoMasteryNodes.size;

  const totalSoal = soalRiwayat.length;
  const totalBenar = soalRiwayat.filter((s) => s.opsi[jawaban[s.id]]?.benar).length;

  const soalSalah = soalRiwayat.filter((s) => {
    const jw = jawaban[s.id];
    if (jw === undefined) return false;
    return !s.opsi[jw]?.benar;
  });

  return (
    <div className="space-y-6 animate-rise">
      <div className={`rounded-2xl ${temaGradient} text-white p-6 shadow-xl`}>
        <h2 className="text-2xl font-bold mb-1">Hasil Diagnostik</h2>
        <p className="text-white/85 mb-4">Skor: {totalBenar} / {totalSoal} benar</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/15 backdrop-blur p-3 ring-1 ring-white/20">
            <div className="text-3xl font-bold">{okPohon.length}</div>
            <div className="opacity-80">cabang dikuasai{autoOkCount > 0 ? ` (${autoOkCount} otomatis)` : ""}</div>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur p-3 ring-1 ring-white/20">
            <div className="text-3xl font-bold">{perluBelajarNodes.length}</div>
            <div className="opacity-80">topik perlu dipelajari</div>
          </div>
        </div>
        {autoOkCount > 0 && (
          <p className="mt-3 text-xs text-white/80">
            ⚡ {autoOkCount} cabang di-skip otomatis karena kamu sudah mahir di bab terkait dari sesi sebelumnya.
          </p>
        )}
      </div>

      {perluBelajarNodes.length > 0 ? (
        <section>
          <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${temaGradient}`} />
            Rencana Belajar
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Mulai dari topik paling dasar dulu — kuasai pondasinya, baru naik.
          </p>
          <div className="space-y-3">
            {perluBelajarNodes
              .sort((a, b) => b.level - a.level) // level besar = dasar, dahulukan
              .map((n, i) => {
                const linkSlug = n.linkedSlug ?? materiSlug;
                const labelLatihan = n.linkedSlug ? "Buka bab" : "Latihan";
                return (
                  <div key={n.id} className={`rounded-2xl border-2 ${temaBorder} ${temaBgSoft} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 text-xs flex-wrap">
                          <span className="px-2 py-0.5 bg-white/70 rounded-full font-medium text-slate-600">#{i + 1}</span>
                          <span className="text-slate-500">level {n.level}</span>
                          {n.linkedSlug && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium text-[10px]">
                              🔗 ada bab
                            </span>
                          )}
                        </div>
                        <h4 className={`font-bold ${temaTextStrong}`}>{n.topik}</h4>
                        {n.subKonsep && n.subKonsep.length > 0 && (
                          <ul className="mt-1 text-xs text-slate-600 list-disc list-inside">
                            {n.subKonsep.map((sk, j) => (
                              <li key={j}>{sk}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <Link
                        href={n.linkedSlug ? `/materi/${linkSlug}` : `/latihan/${materiSlug}/konsep`}
                        className={`shrink-0 rounded-lg ${temaGradient} text-white px-3 py-1.5 text-sm font-medium`}
                      >
                        {labelLatihan} →
                      </Link>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      ) : (
        <section className={`rounded-2xl border-2 ${temaBorder} ${temaBgSoft} p-6 text-center`}>
          <div className="text-4xl mb-2">🎉</div>
          <p className={`font-bold text-lg ${temaTextStrong}`}>Kamu siap mempelajari materi ini!</p>
          <p className="text-sm text-slate-600 mt-1">Semua prasyarat sudah dikuasai.</p>
          <Link
            href={`/materi/${materiSlug}`}
            className={`mt-4 inline-flex items-center gap-1.5 rounded-xl ${temaGradient} text-white px-4 py-2 font-semibold shadow-md`}
          >
            Lanjut ke Materi →
          </Link>
        </section>
      )}

      {soalSalah.length > 0 && (
        <section>
          <h3 className="text-xl font-bold mb-3">Detail Jawaban Salah</h3>
          <p className="text-sm text-slate-600 mb-4">
            Untuk tiap soal yang kamu jawab salah, kami tampilkan miskonsepsi yang umumnya menyebabkan pilihan itu.
          </p>
          <div className="space-y-3">
            {soalSalah.map((s, i) => {
              const jw = jawaban[s.id];
              const dipilih = s.opsi[jw];
              const benar = s.opsi.find((o) => o.benar);
              return (
                <details key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <summary className="cursor-pointer font-medium flex items-start gap-2">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs">✗ Salah {i + 1}</span>
                    <span className="text-slate-700"><MathText>{s.pertanyaan}</MathText></span>
                  </summary>
                  <div className="mt-3 text-sm space-y-2">
                    <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5">
                      <strong className="text-rose-700">Pilihan kamu ({String.fromCharCode(65 + jw)}):</strong>{" "}
                      <MathText>{dipilih?.teks ?? ""}</MathText>
                      {dipilih?.alasan && (
                        <div className="text-xs text-rose-600 mt-1 italic">⚠ <MathText>{dipilih.alasan}</MathText></div>
                      )}
                    </div>
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5">
                      <strong className="text-emerald-700">Jawaban benar:</strong>{" "}
                      <MathText>{benar?.teks ?? ""}</MathText>
                      {benar?.alasan && (
                        <div className="text-xs text-emerald-700 mt-1"><MathText>{benar.alasan}</MathText></div>
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
