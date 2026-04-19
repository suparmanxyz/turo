import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Audiens } from "@/types";

/**
 * Hasil diagnostik tersimpan di /progress/{uid}/diagnostik/{key}.
 * key = `${materiSlug}__${timestampMs}` agar urut by name = urut waktu.
 */
export type LaporanDiagnostik = {
  jenis: "diagnostik" | "post-test";
  materiSlug: string;
  materiNama: string;
  audiens: Audiens;
  skorBenar: number;
  skorTotal: number;
  pohonOk: number;
  /** Total durasi tes dalam ms (dari tahap pertama mulai sampai submit terakhir). */
  waktuTotalMs?: number;
  perluBelajar: {
    nodeId: string;
    topik: string;
    level: number;
    subKonsep?: string[];
    linkedSlug?: string;
    linkedNama?: string;
  }[];
  jawabanRiwayat: {
    pertanyaan: string;
    opsi: { teks: string; benar: boolean; alasan?: string }[];
    jawabanIdx: number;
    benar: boolean;
    nodeTopik?: string;
    nodeId?: string;
    nodeLevel?: number;
    /** Estimasi kelas tempat konsep ini diajarkan (untuk traceability). */
    kelasEstimasi?: number;
    subKonsep?: string;
    jenisTahap?: "initial" | "konfirmasi";
    /** Tahap ke-berapa soal ini muncul di flow tes (1, 2, 3, ...). */
    tahapNo?: number;
    /** Estimasi waktu user mengerjakan soal ini (ms). */
    waktuMs?: number;
    /** SVG inline kalau soal butuh visual. */
    svg?: string;
  }[];
  createdAt?: Timestamp | null;
};

/** Format durasi ms ke string singkat: "1m 23s" / "12s" / "350ms" */
export function formatDurasi(ms: number | undefined | null): string {
  if (ms === undefined || ms === null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalDetik = Math.round(ms / 1000);
  if (totalDetik < 60) return `${totalDetik}s`;
  const m = Math.floor(totalDetik / 60);
  const s = totalDetik % 60;
  return `${m}m ${s}s`;
}

function diagnostikRef(uid: string, key: string) {
  return doc(db, "progress", uid, "diagnostik", key);
}

function diagnostikCol(uid: string) {
  return collection(db, "progress", uid, "diagnostik");
}

export function buatKeyDiagnostik(materiSlug: string, jenis: "diagnostik" | "post-test"): string {
  // Timestamp di-prefix dengan jenis biar bisa filter by name pattern
  return `${materiSlug}__${jenis}__${Date.now()}`;
}

/** Recursively hapus field dengan nilai undefined (Firestore tolak undefined). */
function bersihkanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((v) => bersihkanUndefined(v)) as unknown as T;
  }
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = bersihkanUndefined(v);
    }
    return out as T;
  }
  return obj;
}

export async function saveDiagnostik(
  uid: string,
  key: string,
  data: Omit<LaporanDiagnostik, "createdAt">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const clean = bersihkanUndefined(data);
    // merge:true supaya bisa update partial (incremental save tiap tahap)
    await setDoc(diagnostikRef(uid, key), { ...clean, createdAt: serverTimestamp() }, { merge: true });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("saveDiagnostik gagal:", msg);
    return { ok: false, error: msg };
  }
}

export async function loadDiagnostik(uid: string, key: string): Promise<LaporanDiagnostik | null> {
  try {
    const snap = await getDoc(diagnostikRef(uid, key));
    if (!snap.exists()) return null;
    return snap.data() as LaporanDiagnostik;
  } catch (e) {
    console.warn("loadDiagnostik gagal:", e);
    return null;
  }
}

export type DiagnostikRingkas = LaporanDiagnostik & { key: string };

export async function listDiagnostik(uid: string, max = 50): Promise<DiagnostikRingkas[]> {
  // Tidak try-catch supaya error bubble up ke caller (biar visible di UI)
  const q = query(diagnostikCol(uid), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ key: d.id, ...(d.data() as LaporanDiagnostik) }));
}

// ── Sesi latihan ──

export type SesiLatihanRingkas = {
  key: string;
  materiSlug: string;
  subMateriSlug: string;
  mode: "turun" | "naik";
  jumlahDijawab: number;
  jumlahBenar: number;
  jumlahNodesSelesai: number;
  updatedAt?: Timestamp | null;
};

export async function listSesiLatihan(uid: string, max = 50): Promise<SesiLatihanRingkas[]> {
  const q = query(collection(db, "progress", uid, "sesi"), orderBy("updatedAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      key: d.id,
      materiSlug: data.materiSlug,
      subMateriSlug: data.subMateriSlug,
      mode: data.mode,
      jumlahDijawab: data.jumlahDijawab ?? 0,
      jumlahBenar: data.jumlahBenar ?? 0,
      jumlahNodesSelesai: Array.isArray(data.nodeIdsBenar) ? data.nodeIdsBenar.length : 0,
      updatedAt: data.updatedAt ?? null,
    };
  });
}
