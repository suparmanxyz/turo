import type { Jenjang, KategoriUtama, Materi } from "@/types";

export type Tema = {
  gradient: string;
  bgSoft: string;
  bgSoftStrong: string;
  border: string;
  text: string;
  textStrong: string;
  ring: string;
  badge: string;
  shadow: string;
  emoji: string;
  Icon: () => React.ReactElement;
  Ornament: () => React.ReactElement;
};

const Kubus = () => (
  <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
    <path d="M32 6 L56 18 L56 42 L32 54 L8 42 L8 18 Z" fill="currentColor" opacity="0.18" />
    <path d="M32 6 L56 18 L32 30 L8 18 Z" fill="currentColor" opacity="0.4" />
    <path d="M32 30 L56 18 L56 42 L32 54 Z" fill="currentColor" opacity="0.6" />
    <path d="M32 30 L8 18 L8 42 L32 54 Z" fill="currentColor" opacity="0.3" />
  </svg>
);

const Penggaris = () => (
  <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
    <path d="M8 48 L40 8 L56 24 L24 56 Z" fill="currentColor" opacity="0.25" />
    <path d="M8 48 L40 8 L56 24 L24 56 Z" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M16 40 L20 44 M22 34 L28 40 M30 26 L34 30 M36 20 L42 26" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const Parabola = () => (
  <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
    <path d="M6 56 Q32 -4 58 56" stroke="currentColor" strokeWidth="3" fill="none" />
    <path d="M6 32 L58 32" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <path d="M32 6 L32 58" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <circle cx="32" cy="14" r="3.5" fill="currentColor" />
  </svg>
);

const Statistik = () => (
  <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
    <rect x="10" y="36" width="9" height="20" rx="1.5" fill="currentColor" opacity="0.45" />
    <rect x="22" y="22" width="9" height="34" rx="1.5" fill="currentColor" opacity="0.65" />
    <rect x="34" y="14" width="9" height="42" rx="1.5" fill="currentColor" opacity="0.85" />
    <rect x="46" y="28" width="9" height="28" rx="1.5" fill="currentColor" opacity="0.55" />
  </svg>
);

const Bintang = () => (
  <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
    <path
      d="M32 6 L39 24 L58 25 L43 38 L48 56 L32 46 L16 56 L21 38 L6 25 L25 24 Z"
      fill="currentColor"
      opacity="0.85"
    />
    <path
      d="M32 6 L39 24 L58 25 L43 38 L48 56 L32 46 L16 56 L21 38 L6 25 L25 24 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const Buku = () => (
  <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
    <path d="M10 12 L32 16 L32 56 L10 52 Z" fill="currentColor" opacity="0.35" />
    <path d="M54 12 L32 16 L32 56 L54 52 Z" fill="currentColor" opacity="0.6" />
    <path d="M32 16 L32 56" stroke="currentColor" strokeWidth="1" opacity="0.7" />
  </svg>
);

const OrnamentLingkaran = () => (
  <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
    <circle cx="160" cy="40" r="60" fill="currentColor" opacity="0.18" />
    <circle cx="180" cy="180" r="40" fill="currentColor" opacity="0.12" />
  </svg>
);

const OrnamentSimbol = () => (
  <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
    <text x="20" y="80" fontSize="56" fill="currentColor" opacity="0.1" fontFamily="serif" fontStyle="italic">π</text>
    <text x="120" y="170" fontSize="48" fill="currentColor" opacity="0.1" fontFamily="serif">∑</text>
    <text x="140" y="60" fontSize="36" fill="currentColor" opacity="0.12" fontFamily="serif">∞</text>
  </svg>
);

// ============================================================
// Palette per jenjang (sd/smp/sma) — dipakai Reguler & Olimpiade
// ============================================================

export const TEMA_JENJANG: Record<Jenjang, Tema> = {
  sd: {
    gradient: "bg-gradient-to-br from-orange-400 via-pink-500 to-rose-500",
    bgSoft: "bg-orange-50",
    bgSoftStrong: "bg-orange-100",
    border: "border-orange-300",
    text: "text-orange-700",
    textStrong: "text-orange-900",
    ring: "ring-orange-400",
    badge: "bg-orange-100 text-orange-800",
    shadow: "shadow-orange-300/40",
    emoji: "🧮",
    Icon: Kubus,
    Ornament: OrnamentLingkaran,
  },
  smp: {
    gradient: "bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700",
    bgSoft: "bg-sky-50",
    bgSoftStrong: "bg-sky-100",
    border: "border-sky-300",
    text: "text-sky-700",
    textStrong: "text-sky-900",
    ring: "ring-sky-400",
    badge: "bg-sky-100 text-sky-800",
    shadow: "shadow-sky-300/40",
    emoji: "📐",
    Icon: Penggaris,
    Ornament: OrnamentSimbol,
  },
  sma: {
    gradient: "bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-700",
    bgSoft: "bg-violet-50",
    bgSoftStrong: "bg-violet-100",
    border: "border-violet-300",
    text: "text-violet-700",
    textStrong: "text-violet-900",
    ring: "ring-violet-400",
    badge: "bg-violet-100 text-violet-800",
    shadow: "shadow-violet-300/40",
    emoji: "📈",
    Icon: Parabola,
    Ornament: OrnamentSimbol,
  },
};

// ============================================================
// Palette per kategori utama (reguler/snbt/olimpiade)
// ============================================================

export const TEMA_KATEGORI_UTAMA: Record<KategoriUtama, Tema> = {
  reguler: {
    gradient: "bg-gradient-to-br from-teal-500 via-cyan-600 to-sky-700",
    bgSoft: "bg-teal-50",
    bgSoftStrong: "bg-teal-100",
    border: "border-teal-300",
    text: "text-teal-700",
    textStrong: "text-teal-900",
    ring: "ring-teal-400",
    badge: "bg-teal-100 text-teal-800",
    shadow: "shadow-teal-300/40",
    emoji: "📚",
    Icon: Buku,
    Ornament: OrnamentLingkaran,
  },
  snbt: {
    gradient: "bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700",
    bgSoft: "bg-emerald-50",
    bgSoftStrong: "bg-emerald-100",
    border: "border-emerald-300",
    text: "text-emerald-700",
    textStrong: "text-emerald-900",
    ring: "ring-emerald-400",
    badge: "bg-emerald-100 text-emerald-800",
    shadow: "shadow-emerald-300/40",
    emoji: "🎯",
    Icon: Statistik,
    Ornament: OrnamentLingkaran,
  },
  olimpiade: {
    gradient: "bg-gradient-to-br from-amber-400 via-orange-500 to-red-600",
    bgSoft: "bg-amber-50",
    bgSoftStrong: "bg-amber-100",
    border: "border-amber-300",
    text: "text-amber-800",
    textStrong: "text-amber-900",
    ring: "ring-amber-400",
    badge: "bg-amber-100 text-amber-900",
    shadow: "shadow-amber-300/50",
    emoji: "🏅",
    Icon: Bintang,
    Ornament: OrnamentSimbol,
  },
};

export function temaJenjang(j: Jenjang): Tema {
  return TEMA_JENJANG[j];
}

export function temaKategoriUtama(ku: KategoriUtama): Tema {
  return TEMA_KATEGORI_UTAMA[ku];
}

/** Pilih tema otomatis untuk Materi: jenjang kalau ada, fallback ke kategori utama. */
export function temaUntukMateri(m: Materi): Tema {
  if (m.kategoriUtama === "snbt") return TEMA_KATEGORI_UTAMA.snbt;
  if (m.kategoriUtama === "olimpiade") return TEMA_KATEGORI_UTAMA.olimpiade;
  if (m.jenjang) return TEMA_JENJANG[m.jenjang];
  return TEMA_KATEGORI_UTAMA.reguler;
}
