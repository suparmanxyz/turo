import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { getAdminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const VALID_LABELS = new Set(["CP-2025", "Buku-2025", "UTBK", "Pengayaan"]);

const PETA_PATH = resolve(process.cwd(), "src/data/peta-prasyarat.json");

/**
 * POST { kode, label } → update label di peta-prasyarat.json.
 * DEV-ONLY: production (Vercel) filesystem read-only — akan return 403.
 */
export async function POST(req: NextRequest) {
  // Auth check
  const idToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!idToken) return NextResponse.json({ error: "Auth wajib" }, { status: 401 });
  try {
    await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  // Block production (file system read-only)
  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL === "1") {
    return NextResponse.json(
      { error: "Edit label hanya di local dev. Production filesystem read-only — edit JSON manual + git push." },
      { status: 403 },
    );
  }

  const body = await req.json();
  const kode = String(body.kode ?? "").trim();
  const label = String(body.label ?? "").trim();
  if (!kode || !VALID_LABELS.has(label)) {
    return NextResponse.json({ error: "Field kode + label wajib. Label valid: CP-2025, Buku-2025, UTBK, Pengayaan." }, { status: 400 });
  }

  // Read, modify, write
  const content = await fs.readFile(PETA_PATH, "utf8");
  const peta = JSON.parse(content);
  const sub = peta.submateri.find((s: { kode: string }) => s.kode === kode);
  if (!sub) return NextResponse.json({ error: `Sub ${kode} tidak ditemukan` }, { status: 404 });

  const oldLabel = sub.label;
  if (oldLabel === label) return NextResponse.json({ ok: true, kode, label, unchanged: true });
  sub.label = label;

  // Recompute label_counts
  const counts: Record<string, number> = {};
  for (const s of peta.submateri) counts[s.label] = (counts[s.label] ?? 0) + 1;
  peta.stats.label_counts = counts;

  await fs.writeFile(PETA_PATH, JSON.stringify(peta, null, 2), "utf8");

  return NextResponse.json({ ok: true, kode, oldLabel, newLabel: label, label_counts: counts });
}
