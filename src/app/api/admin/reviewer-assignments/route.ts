import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { getAdminAuth } from "@/lib/firebase-admin";
import {
  listReviewerAssignments,
  setReviewerAssignment,
  deleteReviewerAssignment,
  type ReviewerFilter,
} from "@/lib/reviewer-assignment";

export const runtime = "nodejs";

/** GET /api/admin/reviewer-assignments — list semua assignment. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const all = await listReviewerAssignments();
  return NextResponse.json({ assignments: all });
}

/** PUT /api/admin/reviewer-assignments — upsert assignment untuk email tertentu. */
export async function PUT(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const filters = (Array.isArray(body.filters) ? body.filters : []) as ReviewerFilter[];
  if (!email) return NextResponse.json({ error: "email wajib" }, { status: 400 });

  let uid: string;
  try {
    const user = await getAdminAuth().getUserByEmail(email);
    uid = user.uid;
  } catch {
    return NextResponse.json({ error: `User dengan email ${email} belum terdaftar di Firebase Auth` }, { status: 404 });
  }

  await setReviewerAssignment(uid, email, filters, admin.email);
  return NextResponse.json({ ok: true, uid, email, filters });
}

/** DELETE /api/admin/reviewer-assignments?uid=... — hapus assignment. */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  if (!uid) return NextResponse.json({ error: "uid wajib" }, { status: 400 });
  await deleteReviewerAssignment(uid);
  return NextResponse.json({ ok: true });
}
