"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DAFTAR_MATERI,
  materiOlimpiadePerJenjang,
  materiPerKelas,
  materiSnbt,
} from "@/data/materi";
import { useAuth } from "@/contexts/AuthContext";
import {
  JENJANG_LABEL,
  JENJANG_URUT,
  KATEGORI_UTAMA_DESKRIPSI,
  KATEGORI_UTAMA_LABEL,
  KATEGORI_UTAMA_URUT,
  KELAS_PER_JENJANG,
  type Jenjang,
  type KategoriUtama,
  type Kelas,
  type Materi,
} from "@/types";
import {
  TEMA_JENJANG,
  TEMA_KATEGORI_UTAMA,
  temaKategoriUtama,
  temaJenjang,
} from "@/lib/kategori-tema";

// ============================================================
// Landing — pure marketing, CTA → /login
// ============================================================

function FloatingMath() {
  const items = [
    { t: "x²+y²=r²", c: "top-[12%] left-[6%]", a: "animate-float-slow", s: "text-3xl" },
    { t: "∑", c: "top-[20%] right-[10%]", a: "animate-float-mid", s: "text-6xl" },
    { t: "∫", c: "top-[55%] left-[12%]", a: "animate-float-fast", s: "text-5xl" },
    { t: "π", c: "bottom-[18%] right-[14%]", a: "animate-float-slow", s: "text-7xl" },
    { t: "√n", c: "top-[40%] right-[28%]", a: "animate-float-mid", s: "text-3xl" },
    { t: "∞", c: "bottom-[30%] left-[28%]", a: "animate-float-fast", s: "text-4xl" },
    { t: "θ", c: "top-[70%] right-[6%]", a: "animate-float-slow", s: "text-4xl" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((it, i) => (
        <span
          key={i}
          className={`absolute font-serif italic text-white/15 ${it.c} ${it.a} ${it.s}`}
          style={{ animationDelay: `${i * 0.7}s` }}
        >
          {it.t}
        </span>
      ))}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-400/30 blur-3xl animate-blob" />
      <div className="absolute bottom-[-6rem] right-[-6rem] h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
    </div>
  );
}

function LandingHeader() {
  return (
    <header className="absolute top-0 inset-x-0 z-20">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/30 text-white font-bold shadow-lg">
            t
          </span>
          <span className="font-extrabold text-lg tracking-tight text-white">
            turo<span className="text-teal-300">.</span>
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="text-sm text-white/85 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition font-medium"
          >
            Masuk
          </Link>
          <Link
            href="/login?mode=register"
            className="text-sm bg-white text-teal-700 hover:bg-teal-50 px-4 py-1.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition"
          >
            Daftar gratis
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-900 text-white">
      <div className="bg-grid-dark absolute inset-0 opacity-40" />
      <FloatingMath />
      <LandingHeader />

      <div className="relative mx-auto max-w-6xl px-6 sm:px-10 pt-28 sm:pt-36 pb-20 sm:pb-28">
        <div className="max-w-3xl animate-rise">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-medium text-teal-50 ring-1 ring-white/20 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
            mainmaku.id · belajar matematika adaptif
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Belajar matematika<br />
            dari <span className="text-teal-300">dasar</span> sampai <span className="text-cyan-300">olimpiade</span>.
          </h1>
          <p className="text-lg sm:text-xl text-teal-50/90 mb-8 leading-relaxed max-w-2xl">
            Sekolah reguler, persiapan SNBT, atau latihan olimpiade — semua dalam satu platform.
            Peta prasyarat & bantuan visual AI bantu kamu naik level dari titik yang tepat.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/login?mode=register"
              className="inline-flex items-center gap-2 bg-white text-teal-700 hover:bg-teal-50 px-6 py-3.5 rounded-xl font-semibold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
            >
              Mulai gratis →
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur ring-1 ring-white/30 hover:bg-white/20 text-white px-6 py-3.5 rounded-xl font-semibold transition"
            >
              Sudah punya akun? Masuk
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-teal-50/80">
            <span className="flex items-center gap-1.5">✓ Tanpa biaya</span>
            <span className="flex items-center gap-1.5">✓ Diagnostik adaptif</span>
            <span className="flex items-center gap-1.5">✓ Bantuan AI per soal</span>
            <span className="flex items-center gap-1.5">✓ SD · SMP · SMA · SNBT · Olimpiade</span>
          </div>
        </div>
      </div>

      <div className="relative h-12 sm:h-16 bg-gradient-to-b from-transparent to-background" />
    </section>
  );
}

function JalurSection() {
  const jalur: { ku: KategoriUtama; emoji: string }[] = [
    { ku: "reguler", emoji: "🏫" },
    { ku: "snbt", emoji: "🎓" },
    { ku: "olimpiade", emoji: "🏆" },
  ];
  return (
    <section className="relative mx-auto max-w-6xl px-6 sm:px-10 py-16 sm:py-20">
      <div className="text-center mb-10 sm:mb-12 animate-rise">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          tiga jalur belajar
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Pilih sesuai targetmu<span className="text-brand">.</span>
        </h2>
        <p className="text-muted mt-2 max-w-xl mx-auto">
          Kurikulum sekolah, persiapan SNBT, atau latihan olimpiade — masing-masing punya peta dan soal yang berbeda.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {jalur.map(({ ku, emoji }, idx) => {
          const t = TEMA_KATEGORI_UTAMA[ku];
          const Icon = t.Icon;
          const Orn = t.Ornament;
          return (
            <div
              key={ku}
              style={{ animationDelay: `${idx * 80}ms` }}
              className={`group relative overflow-hidden rounded-2xl p-6 text-white ${t.gradient} ${t.shadow} shadow-lg animate-pop`}
            >
              <div className="absolute inset-0 text-white"><Orn /></div>
              <div className="relative flex items-start justify-between">
                <div className="h-14 w-14 rounded-xl bg-white/20 backdrop-blur p-3 text-white ring-1 ring-white/30">
                  <Icon />
                </div>
                <span className="text-2xl">{emoji}</span>
              </div>
              <h3 className="relative font-bold text-2xl mt-4">{KATEGORI_UTAMA_LABEL[ku]}</h3>
              <p className="relative text-sm text-white/85 mt-1.5 leading-relaxed">
                {KATEGORI_UTAMA_DESKRIPSI[ku]}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FiturSection() {
  const fitur = [
    {
      e: "🎯",
      t: "Soal adaptif",
      d: "Tingkat kesulitan menyesuaikan kemampuanmu lewat sistem IRT. Tidak terlalu mudah, tidak bikin frustrasi.",
    },
    {
      e: "🗺️",
      t: "Peta prasyarat",
      d: "Tahu pasti sub-materi mana yang perlu diperbaiki sebelum lanjut. Tidak ada lagi belajar dari materi yang tidak siap.",
    },
    {
      e: "🤖",
      t: "Bantuan visual AI",
      d: "Penjelasan bertahap dan visual untuk soal yang sulit. AI bantu sampai kamu paham, bukan sekedar kasih jawaban.",
    },
    {
      e: "📊",
      t: "Estimasi skor UTBK",
      d: "Lapis 1.5 cek kesiapan tiap bab dengan estimasi skor SNBT. Targetmu jelas, latihanmu fokus.",
    },
    {
      e: "📚",
      t: "Dual-track kurikulum",
      d: "Pilih mode Strict CP 046 (sesuai sekolah) atau Comprehensive Full untuk pendalaman lebih luas.",
    },
    {
      e: "✨",
      t: "Sepenuhnya gratis",
      d: "Semua fitur tersedia tanpa biaya. Bagian dari ekosistem mainmaku.id untuk pendidikan terbuka.",
    },
  ];
  return (
    <section className="relative bg-white border-y border-slate-200/70">
      <div className="bg-grid absolute inset-0 opacity-50" />
      <div className="relative mx-auto max-w-6xl px-6 sm:px-10 py-16 sm:py-20">
        <div className="text-center mb-10 sm:mb-12 animate-rise">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            kenapa turo
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Bukan sekadar bank soal<span className="text-brand">.</span>
          </h2>
          <p className="text-muted mt-2 max-w-xl mx-auto">
            Sistem yang tahu kamu di mana, mau ke mana, dan jalur tercepatnya seperti apa.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fitur.map((f, i) => (
            <div
              key={f.t}
              style={{ animationDelay: `${i * 60}ms` }}
              className="rounded-2xl bg-white p-6 border border-slate-200 hover:border-brand hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 animate-pop"
            >
              <div className="text-3xl mb-3">{f.e}</div>
              <h3 className="font-semibold text-lg text-foreground">{f.t}</h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CaraKerjaSection() {
  const langkah = [
    { n: "1", t: "Daftar & cek kemampuan", d: "Diagnostik adaptif 3 tahap (~15-30 menit) menentukan level kelas dan area lemah." },
    { n: "2", t: "Ikuti rekomendasi", d: "Sistem kasih sub-materi yang perlu diperbaiki dulu, sesuai peta prasyaratmu." },
    { n: "3", t: "Latihan & naik level", d: "Soal adaptif + bantuan AI per langkah. Cek kesiapan bab sebelum lanjut." },
  ];
  return (
    <section className="relative mx-auto max-w-6xl px-6 sm:px-10 py-16 sm:py-20">
      <div className="text-center mb-10 sm:mb-12 animate-rise">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          cara kerja
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Tiga langkah, kamu mulai.
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {langkah.map((l, i) => (
          <div
            key={l.n}
            style={{ animationDelay: `${i * 80}ms` }}
            className="relative rounded-2xl bg-white p-6 border border-slate-200 animate-pop"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white font-bold shadow-md shadow-teal-300/40 mb-4">
              {l.n}
            </div>
            <h3 className="font-semibold text-lg">{l.t}</h3>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{l.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 sm:px-10 pb-16 sm:pb-24">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-900 p-10 sm:p-14 text-center text-white">
        <div className="bg-grid-dark absolute inset-0 opacity-40" />
        <FloatingMath />
        <div className="relative animate-rise">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Siap mulai dari titik yang tepat?
          </h2>
          <p className="text-teal-50/90 max-w-xl mx-auto mb-7">
            Daftar gratis, ikuti diagnostik singkat, dan dapatkan jalur belajar yang sesuai kemampuanmu hari ini.
          </p>
          <Link
            href="/login?mode=register"
            className="inline-flex items-center gap-2 bg-white text-teal-700 hover:bg-teal-50 px-7 py-4 rounded-xl font-semibold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
          >
            Buat akun gratis →
          </Link>
          <p className="text-sm text-teal-100/70 mt-5">
            Sudah punya akun?{" "}
            <Link href="/login" className="underline underline-offset-2 hover:text-white font-medium">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 sm:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white font-bold text-xs">
            t
          </span>
          <span className="font-semibold text-slate-700">
            turo<span className="text-brand">.</span>
          </span>
          <span className="text-slate-400">·</span>
          <span>bagian dari mainmaku.id</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hover:text-brand transition">Masuk</Link>
          <Link href="/login?mode=register" className="hover:text-brand transition">Daftar</Link>
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  return (
    <main className="flex-1 flex flex-col">
      <HeroSection />
      <JalurSection />
      <FiturSection />
      <CaraKerjaSection />
      <CtaSection />
      <LandingFooter />
    </main>
  );
}

// ============================================================
// Breadcrumb
// ============================================================

function Breadcrumb({ items, onPilih }: { items: { label: string; idx: number }[]; onPilih: (idx: number) => void }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6 flex-wrap">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-slate-300">/</span>}
          {i < items.length - 1 ? (
            <button onClick={() => onPilih(it.idx)} className="hover:text-brand transition underline-offset-2 hover:underline">
              {it.label}
            </button>
          ) : (
            <span className="text-foreground font-semibold">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// ============================================================
// Step 1: Pilih Kategori Utama
// ============================================================

function PilihKategoriUtama({ onPilih }: { onPilih: (k: KategoriUtama) => void }) {
  return (
    <main className="relative mx-auto max-w-6xl p-6 sm:p-10">
      <div className="bg-grid absolute inset-0 -z-10 opacity-60" />
      <div className="flex items-start justify-between mb-8 animate-rise">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            mulai dari sini
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Mau belajar apa<span className="text-brand">?</span>
          </h1>
          <p className="text-muted mt-2 max-w-xl">
            Pilih jalur belajar — sekolah reguler (per kelas), persiapan SNBT, atau latihan olimpiade.
          </p>
        </div>
        <Link href="/admin/import" className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand transition">
          ⚙ Impor soal
        </Link>
      </div>

      {/* CTA Onboarding — diagnostik adaptif */}
      <Link
        href="/onboarding"
        className="block mb-8 rounded-2xl bg-gradient-to-r from-brand to-cyan-600 hover:from-brand-strong hover:to-cyan-700 text-white p-5 sm:p-6 shadow-lg shadow-brand/20 hover:shadow-xl transition-all hover:-translate-y-0.5 group"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-white/80 mb-1">🎯 Belum tau mulai dari mana?</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold">Cek Kemampuan dulu</h2>
            <p className="text-sm text-white/90 mt-1 max-w-md">
              Diagnostik adaptif 3 tahap (~15-30 menit) — kita cari level kelas, area lemah, dan sub-materi yang perlu diperbaiki.
            </p>
          </div>
          <div className="text-3xl group-hover:translate-x-1 transition-transform">→</div>
        </div>
      </Link>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {KATEGORI_UTAMA_URUT.map((k, idx) => {
          const t = TEMA_KATEGORI_UTAMA[k];
          const Icon = t.Icon;
          const Orn = t.Ornament;
          return (
            <button key={k} onClick={() => onPilih(k)} style={{ animationDelay: `${idx * 60}ms` }}
              className={`group relative overflow-hidden text-left rounded-2xl p-6 text-white ${t.gradient} ${t.shadow} shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 ${t.ring} focus:ring-offset-2 animate-pop`}>
              <div className="absolute inset-0 text-white"><Orn /></div>
              <div className="relative flex items-start justify-between">
                <div className="h-14 w-14 rounded-xl bg-white/20 backdrop-blur p-3 text-white ring-1 ring-white/30">
                  <Icon />
                </div>
                <span className="text-2xl">{t.emoji}</span>
              </div>
              <h3 className="relative font-bold text-2xl mt-4">{KATEGORI_UTAMA_LABEL[k]}</h3>
              <p className="relative text-sm text-white/85 mt-1.5 leading-relaxed">{KATEGORI_UTAMA_DESKRIPSI[k]}</p>
              <div className="relative mt-5 flex items-center justify-end text-xs">
                <span className="opacity-0 group-hover:opacity-100 transition translate-x-[-6px] group-hover:translate-x-0 font-medium">
                  Mulai →
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}

// ============================================================
// Step 2: Pilih Jenjang (untuk reguler & olimpiade)
// ============================================================

function PilihJenjang({ ku, onPilih }: { ku: KategoriUtama; onPilih: (j: Jenjang) => void }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {JENJANG_URUT.map((j, idx) => {
        const t = TEMA_JENJANG[j];
        const Icon = t.Icon;
        const Orn = t.Ornament;
        const jumlah = ku === "reguler"
          ? KELAS_PER_JENJANG[j].reduce((acc, k) => acc + materiPerKelas(j, k).length, 0)
          : materiOlimpiadePerJenjang(j).length;
        return (
          <button key={j} onClick={() => onPilih(j)} style={{ animationDelay: `${idx * 60}ms` }}
            className={`group relative overflow-hidden text-left rounded-2xl p-6 text-white ${t.gradient} ${t.shadow} shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 ${t.ring} focus:ring-offset-2 animate-pop`}>
            <div className="absolute inset-0 text-white"><Orn /></div>
            <div className="relative flex items-start justify-between">
              <div className="h-14 w-14 rounded-xl bg-white/20 backdrop-blur p-3 text-white ring-1 ring-white/30">
                <Icon />
              </div>
              <span className="text-2xl">{t.emoji}</span>
            </div>
            <h3 className="relative font-bold text-2xl mt-4">{JENJANG_LABEL[j]}</h3>
            <div className="relative mt-5 flex items-center justify-between text-xs">
              <span className="rounded-full bg-white/20 backdrop-blur px-2.5 py-1 ring-1 ring-white/25">
                {ku === "reguler" ? `${KELAS_PER_JENJANG[j].length} kelas` : `${jumlah} elemen`}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition translate-x-[-6px] group-hover:translate-x-0 font-medium">
                Lanjut →
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Step 3 (reguler): Pilih Kelas
// ============================================================

function PilihKelas({ jenjang, onPilih }: { jenjang: Jenjang; onPilih: (k: Kelas) => void }) {
  const t = TEMA_JENJANG[jenjang];
  const kelasOptions = KELAS_PER_JENJANG[jenjang];
  return (
    <div className={`grid gap-3 ${kelasOptions.length === 6 ? "sm:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-3"}`}>
      {kelasOptions.map((k, i) => (
        <button key={k} onClick={() => onPilih(k)} style={{ animationDelay: `${i * 30}ms` }}
          className={`group rounded-2xl bg-white p-5 border-2 border-slate-200 hover:${t.border} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 animate-pop`}>
          <div className={`h-12 w-12 rounded-xl ${t.bgSoftStrong} ${t.text} grid place-items-center mx-auto mb-3 text-2xl font-bold`}>
            {k}
          </div>
          <p className="text-center font-semibold">Kelas {k}</p>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Step terakhir: Daftar Materi
// ============================================================

function DaftarMateri({ list, jenjangKey }: { list: Materi[]; jenjangKey?: Jenjang | null }) {
  const t = jenjangKey ? TEMA_JENJANG[jenjangKey] : TEMA_KATEGORI_UTAMA.snbt;
  const Icon = t.Icon;

  if (list.length === 0) {
    return (
      <div className={`rounded-2xl border-2 border-dashed ${t.border} ${t.bgSoft} p-10 text-center`}>
        <div className="text-4xl mb-2">{t.emoji}</div>
        <p className={`font-semibold ${t.textStrong}`}>Materi sedang disiapkan</p>
        <p className="text-sm text-slate-500 mt-1">Konten akan segera tersedia.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {list.map((m, i) => (
        <Link key={m.slug} href={`/materi/${m.slug}`} style={{ animationDelay: `${i * 50}ms` }}
          className="group block rounded-2xl bg-white p-5 border border-slate-200 hover:border-brand hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 animate-pop">
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 shrink-0 rounded-lg ${t.bgSoftStrong} ${t.text} p-2`}>
              <Icon />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg group-hover:text-brand transition">{m.nama}</h3>
              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{m.deskripsi}</p>
              <p className="text-xs text-slate-400 mt-2">{m.subMateri.length} sub-materi</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ============================================================
// Container — orchestrate state
// ============================================================

function AppBerlangsung() {
  const [ku, setKu] = useState<KategoriUtama | null>(null);
  const [jenjang, setJenjang] = useState<Jenjang | null>(null);
  const [kelas, setKelas] = useState<Kelas | null>(null);

  function reset(stepIdx: number) {
    if (stepIdx <= 0) { setKu(null); setJenjang(null); setKelas(null); }
    else if (stepIdx === 1) { setJenjang(null); setKelas(null); }
    else if (stepIdx === 2) { setKelas(null); }
  }

  // Step 1: pilih kategori utama
  if (!ku) return <PilihKategoriUtama onPilih={setKu} />;

  // SNBT — langsung daftar materi
  if (ku === "snbt") {
    return (
      <main className="mx-auto max-w-5xl p-6 sm:p-10">
        <Breadcrumb
          items={[{ label: "Mulai", idx: 0 }, { label: KATEGORI_UTAMA_LABEL.snbt, idx: 1 }]}
          onPilih={reset}
        />
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">{KATEGORI_UTAMA_LABEL.snbt}</h1>
        <p className="text-muted mb-6">{KATEGORI_UTAMA_DESKRIPSI.snbt}</p>
        <DaftarMateri list={materiSnbt()} />
      </main>
    );
  }

  // Reguler & Olimpiade — perlu jenjang
  if (!jenjang) {
    return (
      <main className="mx-auto max-w-6xl p-6 sm:p-10">
        <Breadcrumb
          items={[{ label: "Mulai", idx: 0 }, { label: KATEGORI_UTAMA_LABEL[ku], idx: 1 }]}
          onPilih={reset}
        />
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">{KATEGORI_UTAMA_LABEL[ku]}</h1>
        <p className="text-muted mb-6">Pilih jenjang.</p>
        <PilihJenjang ku={ku} onPilih={setJenjang} />
      </main>
    );
  }

  // Olimpiade — sudah cukup jenjang → daftar materi (per elemen)
  if (ku === "olimpiade") {
    return (
      <main className="mx-auto max-w-5xl p-6 sm:p-10">
        <Breadcrumb
          items={[
            { label: "Mulai", idx: 0 },
            { label: KATEGORI_UTAMA_LABEL.olimpiade, idx: 1 },
            { label: JENJANG_LABEL[jenjang], idx: 2 },
          ]}
          onPilih={reset}
        />
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
          Olimpiade · {JENJANG_LABEL[jenjang]}
        </h1>
        <p className="text-muted mb-6">Pilih elemen olimpiade yang ingin dilatih.</p>
        <DaftarMateri list={materiOlimpiadePerJenjang(jenjang)} jenjangKey={jenjang} />
      </main>
    );
  }

  // Reguler — perlu kelas
  if (!kelas) {
    return (
      <main className="mx-auto max-w-5xl p-6 sm:p-10">
        <Breadcrumb
          items={[
            { label: "Mulai", idx: 0 },
            { label: KATEGORI_UTAMA_LABEL.reguler, idx: 1 },
            { label: JENJANG_LABEL[jenjang], idx: 2 },
          ]}
          onPilih={reset}
        />
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
          {JENJANG_LABEL[jenjang]}
        </h1>
        <p className="text-muted mb-6">Pilih kelas.</p>
        <PilihKelas jenjang={jenjang} onPilih={setKelas} />
      </main>
    );
  }

  // Reguler + jenjang + kelas → daftar materi
  return (
    <main className="mx-auto max-w-5xl p-6 sm:p-10">
      <Breadcrumb
        items={[
          { label: "Mulai", idx: 0 },
          { label: KATEGORI_UTAMA_LABEL.reguler, idx: 1 },
          { label: JENJANG_LABEL[jenjang], idx: 2 },
          { label: `Kelas ${kelas}`, idx: 3 },
        ]}
        onPilih={reset}
      />
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
        Matematika Kelas {kelas}
      </h1>
      <p className="text-muted mb-6">{JENJANG_LABEL[jenjang]} · Kurikulum CP 046/2025</p>
      <DaftarMateri list={materiPerKelas(jenjang, kelas)} jenjangKey={jenjang} />
    </main>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-brand animate-pulse" />
          <div className="h-2 w-2 rounded-full bg-brand animate-pulse" style={{ animationDelay: "0.2s" }} />
          <div className="h-2 w-2 rounded-full bg-brand animate-pulse" style={{ animationDelay: "0.4s" }} />
        </div>
      </main>
    );
  }

  return user ? <AppBerlangsung /> : <LandingPage />;
}
