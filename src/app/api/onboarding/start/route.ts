import { NextRequest, NextResponse } from "next/server";
import { startOnboarding } from "@/lib/onboarding-orchestrator";
import { pilihJalur } from "@/lib/diagnostic-routing";
import { upsertUserProfile, createDiagnosticSession } from "@/lib/firestore-schema";
import { getAdminAuth } from "@/lib/firebase-admin";
import type { Jenjang, Kelas, KategoriUtama } from "@/types";
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
  const jenjang = body.jenjang as Jenjang | undefined;
  const kelas = body.kelas as Kelas | undefined;
  const kategoriUtama = (body.kategoriUtama ?? "reguler") as KategoriUtama;
  const modePersiapan = body.modePersiapan as "sekolah" | "utbk" | "olimpiade" | undefined;

  const jalur = pilihJalur({ jenjang, kelas, kategoriUtama, modePersiapan });
  const jenjangResmi: JenjangResmi = jenjang ? JENJANG_MAP[jenjang] : (jalur.startsWith("sd") ? "SD" : jalur.startsWith("smp") ? "SMP" : "SMA");

  await upsertUserProfile(uid, {
    jenjang,
    kelas,
    kategoriUtama,
    modePersiapan,
    jalurAktif: jalur,
    onboardingStatus: "belum",
  });

  const sessionId = await createDiagnosticSession(uid, jalur);
  const step = await startOnboarding(jalur, jenjangResmi);

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
