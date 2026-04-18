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

  // Timing: waktu mulai tahap, timestamp tiap klik per soal, waktu per soal akumulasi
  const [tahapMulaiMs, setTahapMulaiMs] = useState<number>(0);
  const [klikTimestamp, setKlikTimestamp] = useState<Record<string, number>>({});
  const [waktuPerSoal, setWaktuPerSoal] = useState<Record<string, number>>({});
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

    type SoalGenJob = { nodeId: string; subKonsep: string; level: number; topik: string };
    // Dedup: 1 job per (nodeId, subKonsep) — batch generate 2 soal beda di 1 panggilan.
    // Pohon kembar yang share nodeAktif tetap pakai job yang sama.
    const jobMap = new Map<string, SoalGenJob>();
    for (const p of pohonStates) {
      if (p.status !== "aktif") continue;
      const node = nodeById(peta, p.nodeAktifId);
      if (!node) continue;
      const subs = subKonsepUntuk(node);
      for (const sk of subs) {
        const key = `${node.id}__${sk}`;
        if (!jobMap.has(key)) {
          jobMap.set(key, { nodeId: node.id, subKonsep: sk, level: node.level, topik: node.topik });
        }
      }
    }
    const jobs = Array.from(jobMap.values());

    if (jobs.length === 0) {
      // Tidak ada pohon aktif lagi → langsung hasil
      setFase("hasil");
      return;
    }

    try {
      const hasilNested = await Promise.all(
        jobs.map(async (job): Promise<SoalDiagnostik[]> => {
          const r = await fetch("/api/generate-soal-mc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topik: job.topik,
              subKonsep: job.subKonsep,
              level: job.level,
              n: 2,
              ...audiens,
            }),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
          const data: { soal: SoalMc[] } = await r.json();
          return data.soal.map((mc) => ({
            id: crypto.randomUUID(),
            nodeId: job.nodeId,
            subKonsep: job.subKonsep,
            ...mc,
          }));
        }),
      );
      const hasil = hasilNested.flat();
      setSoalTahap(hasil);
      setTahapNo((n) => n + 1);
      setFase("menjawab");
      setTahapMulaiMs(Date.now());
      setKlikTimestamp({});
    } catch (e) {
      setError(`Gagal generate soal: ${e instanceof Error ? e.message : e}`);
      setFase("error");
    }
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
          waktuMs: waktuPerSoal[s.id],
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
    setKlikTimestamp((k) => ({ ...k, [soalId]: Date.now() }));
  }

  const semuaTerjawab = soalTahap.length > 0 && soalTahap.every((s) => jawaban[s.id] !== undefined);

  function submitTahap() {
    if (!peta || !semuaTerjawab) return;
    setFase("evaluasi");
    const jawabanArr: JawabanUser[] = Object.entries(jawaban).map(([soalId, pilihIdx]) => ({ soalId, pilihIdx }));
    const stateBaru = evaluasiTahap(peta, pohonStates, soalTahap, jawabanArr);
    setPohonStates(stateBaru);
    // Hitung waktu per soal di tahap ini berdasar urutan klik
    const klikSorted = soalTahap
      .map((s) => ({ id: s.id, ts: klikTimestamp[s.id] ?? Date.now() }))
      .sort((a, b) => a.ts - b.ts);
    const waktuTahap: Record<string, number> = {};
    let prev = tahapMulaiMs;
    for (const k of klikSorted) {
      waktuTahap[k.id] = Math.max(0, k.ts - prev);
      prev = k.ts;
    }
    // Akumulasi riwayat
    setRiwayatSoal((r) => [...r, ...soalTahap]);
    setRiwayatJawaban((r) => ({ ...r, ...jawaban }));
    setWaktuPerSoal((w) => ({ ...w, ...waktuTahap }));
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

  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-10">
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
            {pohonStates.filter((p) => p.status === "aktif").length} cabang materi aktif, sedang
            di-generate soal pilihan ganda dengan distractor analitis.
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" style={{ animationDelay: "0.2s" }} />
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      )}

      {fase === "menjawab" && (
        <div>
          <div className={`mb-5 p-3 rounded-xl ${t.bgSoft} border ${t.border} text-sm`}>
            <strong className={t.textStrong}>Tahap {tahapNo}</strong> · {soalTahap.length} soal · jawab semua lalu Submit
          </div>

          <div className="space-y-5">
            {soalTahap.map((s, i) => (
              <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-medium">#{i + 1}</span>
                  <span className="text-slate-500">{nodeById(peta!, s.nodeId)?.topik ?? s.nodeId}</span>
                </div>
                <div className="mb-4 leading-relaxed">
                  <MathText>{s.pertanyaan}</MathText>
                </div>
                <ul className="space-y-2">
                  {s.opsi.map((o, idx) => {
                    const dipilih = jawaban[s.id] === idx;
                    return (
                      <li key={idx}>
                        <button
                          onClick={() => pilihJawaban(s.id, idx)}
                          className={`group w-full text-left rounded-xl border-2 px-4 py-3 transition ${
                            dipilih
                              ? `${t.border} ${t.bgSoft} ${t.textStrong} font-semibold`
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <span className="inline-flex items-center gap-3">
                            <span className={`grid h-7 w-7 place-items-center rounded-md text-xs font-bold ${
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
            ))}
          </div>

          <div className="sticky bottom-4 mt-6">
            <button
              onClick={submitTahap}
              disabled={!semuaTerjawab}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl ${t.gradient} text-white px-6 py-3 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl active:scale-[0.98] transition-all`}
            >
              {semuaTerjawab
                ? `Submit Tahap ${tahapNo}`
                : `Jawab semua dulu (${Object.keys(jawaban).length}/${soalTahap.length})`}
            </button>
          </div>
        </div>
      )}

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
                        <p className="text-xs text-rose-600 mt-1 italic">⚠ {dipilih.alasan}</p>
                      )}
                    </div>
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5">
                      <strong className="text-emerald-700">Jawaban benar:</strong>{" "}
                      <MathText>{benar?.teks ?? ""}</MathText>
                      {benar?.alasan && (
                        <p className="text-xs text-emerald-700 mt-1">{benar.alasan}</p>
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
