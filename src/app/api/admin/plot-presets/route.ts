import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { PLOT_PRESETS } from "@/lib/svg-plotter";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  return NextResponse.json({ presets: PLOT_PRESETS });
}
