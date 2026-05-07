/**
 * POST /api/admin/import-item-bank/save
 * Body: { soal: ApprovedSoal[] }
 *
 * Save approved soal ke item_bank Firestore via seedItemFromSoalMc helper.
 * Skip duplicate via variantGroup hash.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { seedItemFromSoalMc, itemsForSubMateri, type ItemPedagogyMetadata } from "@/lib/item-bank";
import { z } from "zod";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

const OpsiSchema = z.object({
  teks: z.string(),
  benar: z.boolean(),
  alasan: z.string().optional(),
});

const SoalSchema = z.object({
  pertanyaan: z.string(),
  opsi: z.array(OpsiSchema).length(4),
  pembahasan: z.string().optional(),
  svg: z.string().optional(),
  subMateriKode: z.string(),
  meta: z.record(z.string(), z.unknown()),
});

const Body = z.object({ soal: z.array(SoalSchema) });

function contentHash(soal: { pertanyaan: string; opsi: { teks: string }[] }): string {
  const sig = [soal.pertanyaan.trim(), ...soal.opsi.map((o) => o.teks.trim())].join("|");
  return createHash("sha256").update(sig).digest("hex").slice(0, 16);
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(req); } catch (e) { if (e instanceof Response) return e; throw e; }

  const body = await req.json();
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Schema invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const db = getAdminDb();
  let saved = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  // Group by subMateriKode supaya dedup check 1× per sub
  const bySub = new Map<string, typeof parsed.data.soal>();
  for (const s of parsed.data.soal) {
    if (!bySub.has(s.subMateriKode)) bySub.set(s.subMateriKode, []);
    bySub.get(s.subMateriKode)!.push(s);
  }

  for (const [kode, soalList] of bySub) {
    try {
      // Load existing variantGroups untuk dedup
      const existing = await itemsForSubMateri(kode);
      const existingHashes = new Set(existing.map((it) => it.variantGroup).filter(Boolean));

      const batch = db.batch();
      let batchCount = 0;
      for (const s of soalList) {
        const variantGroup = `${kode}-${contentHash(s)}`;
        if (existingHashes.has(variantGroup)) {
          skipped++;
          continue;
        }
        try {
          const entry = seedItemFromSoalMc(
            { pertanyaan: s.pertanyaan, opsi: s.opsi, svg: s.svg },
            { subMateriKode: kode, source: "imported", aiModel: "manual-pdf-import", meta: s.meta as ItemPedagogyMetadata },
          );
          batch.set(db.collection("item_bank").doc(entry.id), entry);
          batchCount++;
          existingHashes.add(variantGroup);
        } catch (e) {
          failed++;
          errors.push(`${kode}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if (batchCount > 0) {
        await batch.commit();
        saved += batchCount;
      }
    } catch (e) {
      failed += soalList.length;
      errors.push(`${kode} batch: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ saved, skipped, failed, errors: errors.slice(0, 10) });
}
