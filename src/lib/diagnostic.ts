import type { NodePrasyarat, PetaPrasyarat } from "@/types";

export type SoalMc = {
  pertanyaan: string;
  opsi: { teks: string; benar: boolean; alasan?: string }[];
  /** SVG inline opsional untuk soal yang butuh visual (geometri, grafik). */
  svg?: string;
};

/** Soal MC + identitas node/sub-konsep yang dia uji.
 * Catatan: tidak punya pohonId — beberapa pohon yang share node prasyarat
 * yang sama akan share soal yang sama. */
export type SoalDiagnostik = SoalMc & {
  id: string;             // unik per soal (uuid)
  nodeId: string;         // node yang di-uji
  subKonsep: string;      // sub-konsep spesifik
  /** "initial" = soal awal (1 per sub). "konfirmasi" = soal kedua untuk sub yang salah di initial. */
  jenisTahap: "initial" | "konfirmasi";
  /** Tahap ke-berapa di flow tes (1, 2, 3, ...). */
  tahapNo: number;
};

export type JawabanUser = {
  soalId: string;
  pilihIdx: number;       // 0..3
};

/** Status per pohon selama tes berlangsung. */
export type PohonState = {
  pohonId: string;        // id node level 1
  rootTopik: string;
  status: "aktif-initial" | "aktif-konfirmasi" | "selesai-ok" | "selesai-perlu-belajar";
  /** Node yang saat ini sedang diuji (mulai dari node level 1, turun saat user salah). */
  nodeAktifId: string;
  /** Sub-konsep di nodeAktif yang user salah di tahap initial — perlu konfirmasi. */
  subKonsepPerluKonfirmasi: string[];
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
    status: "aktif-initial",
    nodeAktifId: n.id,
    subKonsepPerluKonfirmasi: [],
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

/**
 * Evaluasi 1 tahap:
 * - aktif-initial: 1 soal per sub-konsep. Sub yang salah → masuk konfirmasi tahap berikut.
 *   Kalau semua sub benar → selesai-ok.
 * - aktif-konfirmasi: 1 soal per sub yang perlu konfirmasi.
 *   Kalau semua benar → selesai-ok (eliminate luck).
 *   Kalau ada salah → turun ke prasyarat (status aktif-initial dengan node baru).
 */
export function evaluasiTahap(
  peta: PetaPrasyarat,
  pohonStates: PohonState[],
  soalTahap: SoalDiagnostik[],
  jawaban: JawabanUser[],
): PohonState[] {
  const byId = new Map(jawaban.map((j) => [j.soalId, j]));

  return pohonStates.map((p) => {
    if (p.status !== "aktif-initial" && p.status !== "aktif-konfirmasi") return p;

    // Filter soal yang nodeId = nodeAktif pohon ini DAN jenisTahap sesuai status pohon
    const targetJenis = p.status === "aktif-initial" ? "initial" : "konfirmasi";
    const soalNode = soalTahap.filter((s) => s.nodeId === p.nodeAktifId && s.jenisTahap === targetJenis);
    if (soalNode.length === 0) return p; // belum di-generate untuk pohon ini di tahap ini, skip

    // Per soal cek benar/salah, group by subKonsep
    const subSalah: string[] = [];
    for (const s of soalNode) {
      const jw = byId.get(s.id);
      const benar = jw ? !!s.opsi[jw.pilihIdx]?.benar : false;
      if (!benar && !subSalah.includes(s.subKonsep)) {
        subSalah.push(s.subKonsep);
      }
    }

    if (p.status === "aktif-initial") {
      if (subSalah.length === 0) {
        // Semua benar di initial → langsung mahir
        return {
          ...p,
          status: "selesai-ok",
          nodeBenarIds: [...p.nodeBenarIds, p.nodeAktifId],
        };
      }
      // Ada salah → masuk konfirmasi tahap berikut
      return {
        ...p,
        status: "aktif-konfirmasi",
        subKonsepPerluKonfirmasi: subSalah,
      };
    }

    // p.status === "aktif-konfirmasi"
    if (subSalah.length === 0) {
      // Konfirmasi semua benar → eliminate luck, anggap mahir
      return {
        ...p,
        status: "selesai-ok",
        subKonsepPerluKonfirmasi: [],
        nodeBenarIds: [...p.nodeBenarIds, p.nodeAktifId],
      };
    }
    // Konfirmasi ada salah → benar-benar tidak paham, turun ke prasyarat
    const node = nodeById(peta, p.nodeAktifId);
    const anak = node ? turunkanPohon(peta, node.id) : [];
    if (anak.length === 0) {
      // Sudah node terdasar → tandai perlu pelajari
      return {
        ...p,
        status: "selesai-perlu-belajar",
        subKonsepPerluKonfirmasi: [],
        nodeGagalIds: [...p.nodeGagalIds, p.nodeAktifId],
      };
    }
    return {
      ...p,
      status: "aktif-initial",
      nodeAktifId: anak[0]!.id,
      subKonsepPerluKonfirmasi: [],
      nodeGagalIds: [...p.nodeGagalIds, p.nodeAktifId],
    };
  });
}

/** True kalau semua pohon sudah selesai (tidak ada yang aktif). */
export function semuaPohonSelesai(states: PohonState[]): boolean {
  return states.every((p) => p.status === "selesai-ok" || p.status === "selesai-perlu-belajar");
}

/** Daftar node UNIK yang user GAGAL (perlu dipelajari) dari semua pohon. */
export function nodeIdsPerluBelajar(states: PohonState[]): string[] {
  const set = new Set<string>();
  for (const p of states) for (const id of p.nodeGagalIds) set.add(id);
  return Array.from(set);
}

/** Cap maksimum soal per diagnostik. Kalau hit, force ke hasil walau ada pohon belum tuntas. */
export const MAX_SOAL_DIAGNOSTIK = 25;
