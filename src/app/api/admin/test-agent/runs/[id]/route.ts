import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { getTestRun, getTestRunEvents } from "@/lib/test-agent/storage";
import { loadItem } from "@/lib/item-bank";

export const runtime = "nodejs";

/**
 * GET /api/admin/test-agent/runs/[id]
 * Return: { run, events, items: { [itemId]: { pertanyaan, opsi[], kunci, svg, meta } } }
 *
 * Items dilampirkan supaya UI bisa tampil pertanyaan + opsi tanpa N+1 fetch.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const { id } = await props.params;
  const run = await getTestRun(id);
  if (!run) return NextResponse.json({ error: "Run tidak ditemukan" }, { status: 404 });
  const events = await getTestRunEvents(id);

  // Load items yang muncul di events (dedup by itemId)
  const itemIds = Array.from(new Set(events.filter((e) => e.itemId).map((e) => e.itemId!)));
  const items: Record<string, { pertanyaan: string; opsi: { teks: string; benar: boolean; alasan?: string }[]; kunci: number; svg?: string; meta?: Record<string, unknown> }> = {};
  await Promise.all(
    itemIds.map(async (id) => {
      const it = await loadItem(id);
      if (it) {
        items[id] = {
          pertanyaan: it.konten.pertanyaan,
          opsi: it.konten.opsi,
          kunci: it.konten.kunci,
          svg: it.konten.svg,
          meta: it.meta as Record<string, unknown> | undefined,
        };
      }
    }),
  );

  return NextResponse.json({ run, events, items });
}
