import { NextRequest, NextResponse } from "next/server";
import { startOnboarding } from "@/lib/onboarding-orchestrator";
import { pilihJalur } from "@/lib/diagnostic-routing";
import { upsertUserProfile, createDiagnosticSession } from "@/lib/firestore-schema";
import { getAdminAuth } from "@/lib/firebase-admin";
import type { Jenjang, Kelas, KategoriUtama, ModeKurikulum } from "@/types";
import type { JenjangResmi } from "@/types";

export const runtime = "nodejs";

const JENJANG_MAP: Record<Jenjang, JenjangResmi> = { sd: "SD", smp: "SMP", sma: "SMA" };

export async function POST(req: NextRequest) {
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Auth token wajib" }, { status: 401 });
  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const body = await req.json();
  const rawJenjang = body.jenjang as string | undefined;
  // Validate jenjang format — frontend convention is lowercase. Reject invalid
  // value supaya tidak silent-fallback ke jalur="smp" (bug yang ke-detect pakai
  // test agent di kasus weak_foundation_sma_11 → jalur jadi smp default).
  if (rawJenjang && !["sd", "smp", "sma"].includes(rawJenjang)) {
    return NextResponse.json(
      { error: `jenjang invalid: "${rawJenjang}" — harus "sd"|"smp"|"sma" (lowercase)` },
      { status: 400 },
    );
  }
  const jenjang = rawJenjang as Jenjang | undefined;
  const kelas = body.kelas as Kelas | undefined;
  // INVARIANT: jenjang & kelas wajib untuk Diagnostik Awal. Tanpa keduanya,
  // engine tidak bisa filter cluster A/B/C (silent bypass quota check),
  // bug yang ke-detect di session OqvlLxz... — Cluster A cuma 2 items.
  if (!jenjang || kelas === undefined) {
    return NextResponse.json(
      { error: "jenjang dan kelas wajib di-set sebelum memulai Diagnostik Awal" },
      { status: 400 },
    );
  }
  const kategoriUtama = (body.kategoriUtama ?? "reguler") as KategoriUtama;
  const modePersiapan = body.modePersiapan as "sekolah" | "utbk" | "olimpiade" | undefined;
  const rawMode = body.modeKurikulum;
  const modeKurikulum: ModeKurikulum =
    rawMode === "strict" || rawMode === "comprehensive" || rawMode === "accelerated"
      ? rawMode
      : "comprehensive"; // legacy "full" / undefined → comprehensive

  const jalur = pilihJalur({ jenjang, kelas, kategoriUtama, modePersiapan });
  const jenjangResmi: JenjangResmi = jenjang ? JENJANG_MAP[jenjang] : (jalur.startsWith("sd") ? "SD" : jalur.startsWith("smp") ? "SMP" : "SMA");

  // Bab exposure user — scoping cluster A supaya engine tidak misclassify "belum
  // dipelajari" sebagai "lemah". Kalau tidak dikirim (legacy client), engine treat
  // all exposed (backward compat).
  const babsExposed = body.babsExposed as import("@/lib/bab-exposure").BabsExposedMap | undefined;

  await upsertUserProfile(uid, {
    jenjang,
    kelas,
    kategoriUtama,
    modePersiapan,
    jalurAktif: jalur,
    modeKurikulum,
    babsExposedPerKelas: babsExposed,
    onboardingStatus: "belum",
  });

  const sessionId = await createDiagnosticSession(uid, jalur, jenjangResmi, kelas);
  const step = await startOnboarding(jalur, jenjangResmi, modeKurikulum, kelas, babsExposed);

  return NextResponse.json({
    sessionId,
    state: step.state,
    nextItem: step.nextItem ? sanitize(step.nextItem) : null,
    done: step.done,
    progress: step.progress,
  });
}

/** Strip kunci dari item sebelum kirim ke client (anti-cheat). */
function sanitize(item: { id: string; subMateriKode: string; konten: { pertanyaan: string; opsi: { teks: string; benar: boolean; alasan?: string }[]; svg?: string } }) {
  return {
    id: item.id,
    subMateriKode: item.subMateriKode,
    pertanyaan: item.konten.pertanyaan,
    opsi: item.konten.opsi.map((o) => ({ teks: o.teks })),
    svg: item.konten.svg,
  };
}
