import type { NodePrasyarat, PetaPrasyarat } from "@/types";

export type SoalMc = {
  pertanyaan: string;
  opsi: { teks: string; benar: boolean; alasan?: string }[];
};

/** Soal MC + identitas node/sub-konsep yang dia uji.
 * Catatan: tidak punya pohonId — beberapa pohon yang share node prasyarat
 * yang sama akan share soal yang sama. */
export type SoalDiagnostik = SoalMc & {
  id: string;             // unik per soal (uuid)
  nodeId: string;         // node yang di-uji
  subKonsep: string;      // sub-konsep spesifik
};

export type JawabanUser = {
  soalId: string;
  pilihIdx: number;       // 0..3
};

/** Status per pohon selama tes berlangsung. */
export type PohonState = {
  pohonId: string;        // id node level 1
  rootTopik: string;
  status: "aktif" | "selesai-ok" | "selesai-perlu-belajar";
  /** Node yang saat ini sedang diuji (mulai dari node level 1, turun saat user salah). */
  nodeAktifId: string;
  /** Riwayat node yang user gagal (jadi area "perlu dipelajari"). */
  nodeGagalIds: string[];
  /** Riwayat node yang user benar (sudah dikuasai). */
  nodeBenarIds: string[];
};

/** Cari child nodes (prasyarat dari nodeId) di peta. */
export function turunkanPohon(peta: PetaPrasyarat, nodeId: string): NodePrasyarat[] {
  const node = peta.nodes.find((n) => n.id === nodeId);
  if (!node) return [];
  return node.prasyarat
    .map((id) => peta.nodes.find((n) => n.id === id))
    .filter((n): n is NodePrasyarat => !!n);
}

/** Ambil node level 1 (anak langsung dari root). */
export function pohonLevel1(peta: PetaPrasyarat): NodePrasyarat[] {
  return turunkanPohon(peta, peta.rootId);
}

/** Inisialisasi state per pohon dari peta. */
export function initPohonState(peta: PetaPrasyarat): PohonState[] {
  return pohonLevel1(peta).map((n) => ({
    pohonId: n.id,
    rootTopik: n.topik,
    status: "aktif",
    nodeAktifId: n.id,
    nodeGagalIds: [],
    nodeBenarIds: [],
  }));
}

/** Cari node by id. */
export function nodeById(peta: PetaPrasyarat, id: string): NodePrasyarat | undefined {
  return peta.nodes.find((n) => n.id === id);
}

/** Default sub-konsep kalau peta lama tidak punya field subKonsep — pakai topik sebagai 1 sub. */
export function subKonsepUntuk(node: NodePrasyarat): string[] {
  if (node.subKonsep && node.subKonsep.length > 0) return node.subKonsep;
  return [node.topik];
}

/** Total soal yang akan di-generate untuk node ini = 2 × jumlah sub-konsep. */
export function jumlahSoalUntukNode(node: NodePrasyarat): number {
  return subKonsepUntuk(node).length * 2;
}

/**
 * Setelah user submit jawaban tahap, evaluate per pohon:
 * - Semua jawaban di nodeAktif benar → STATUS = selesai-ok
 * - Ada salah:
 *    - Kalau nodeAktif punya prasyarat (bisa turun) → nodeAktifId = prasyarat pertama, STATUS = aktif (lanjut tahap berikut)
 *    - Kalau tidak ada prasyarat (sudah dasar) → STATUS = selesai-perlu-belajar
 */
export function evaluasiTahap(
  peta: PetaPrasyarat,
  pohonStates: PohonState[],
  soalTahap: SoalDiagnostik[],
  jawaban: JawabanUser[],
): PohonState[] {
  // Index jawaban by soalId untuk lookup cepat
  const byId = new Map(jawaban.map((j) => [j.soalId, j]));

  return pohonStates.map((p) => {
    if (p.status !== "aktif") return p;

    // Filter soal di tahap ini yang nodeId = nodeAktif pohon ini
    // (beberapa pohon bisa share node yang sama → share soal)
    const soalNode = soalTahap.filter((s) => s.nodeId === p.nodeAktifId);
    if (soalNode.length === 0) return p; // node ini tidak punya soal di tahap ini, skip

    const adaSalah = soalNode.some((s) => {
      const jw = byId.get(s.id);
      if (!jw) return true; // belum jawab = anggap salah
      return !s.opsi[jw.pilihIdx]?.benar;
    });

    if (!adaSalah) {
      return {
        ...p,
        status: "selesai-ok",
        nodeBenarIds: [...p.nodeBenarIds, p.nodeAktifId],
      };
    }

    // Ada salah — turun ke prasyarat
    const node = nodeById(peta, p.nodeAktifId);
    const anak = node ? turunkanPohon(peta, node.id) : [];
    if (anak.length === 0) {
      // Sudah node terdasar → tandai perlu pelajari
      return {
        ...p,
        status: "selesai-perlu-belajar",
        nodeGagalIds: [...p.nodeGagalIds, p.nodeAktifId],
      };
    }
    // Lanjut ke prasyarat pertama (single-path turun untuk simplisitas)
    return {
      ...p,
      status: "aktif",
      nodeAktifId: anak[0]!.id,
      nodeGagalIds: [...p.nodeGagalIds, p.nodeAktifId],
    };
  });
}

/** True kalau semua pohon sudah selesai (tidak ada yang aktif). */
export function semuaPohonSelesai(states: PohonState[]): boolean {
  return states.every((p) => p.status !== "aktif");
}

/** Daftar node UNIK yang user GAGAL (perlu dipelajari) dari semua pohon.
 * Dedup karena beberapa pohon bisa share node prasyarat yang sama. */
export function nodeIdsPerluBelajar(states: PohonState[]): string[] {
  const set = new Set<string>();
  for (const p of states) for (const id of p.nodeGagalIds) set.add(id);
  return Array.from(set);
}
