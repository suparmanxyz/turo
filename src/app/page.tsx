"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./landing-v3.css";
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
// Pricing types (preserved)
// ============================================================
type PublicPlan = {
  key: string;
  label: string;
  price: number;
  periodDays: number;
  maxUsers: number;
  recurring: boolean;
  description: string | null;
};

type PublicPricing = {
  plans: PublicPlan[];
  currency: string;
  trial: { durationDays: number; requireCreditCard: boolean };
  freeTier: { subMateriPerDay: number; soalPerDay: number };
};

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

// ============================================================
// LANDING V3 — color block per section, AI-generated illustrations
// ============================================================

function PricingV3({ pricing }: { pricing: PublicPricing }) {
  const trialDays = pricing.trial.durationDays;
  const recurring = pricing.plans.filter((p) => p.recurring);
  const oneTime = pricing.plans.filter((p) => !p.recurring);

  // Featured = first family (maxUsers > 1) plan, or first plan
  const featuredKey = recurring.find((p) => p.maxUsers > 1)?.key ?? recurring[0]?.key;

  return (
    <section className="lv-section lv-pricing-section" id="harga">
      <div className="lv-container">
        <div className="lv-section-header">
          <span className="lv-section-label">Harga</span>
          <h2 className="lv-section-title">
            Trial {trialDays} hari gratis.<br />Tanpa kartu kredit.
          </h2>
          <p className="lv-section-sub">
            Mulai diagnosa dulu. Kalau cocok, lanjut. Kalau tidak, tinggalkan tanpa biaya apapun.
          </p>
        </div>

        <div className="lv-pricing-grid">
          {recurring.map((plan) => {
            const isFamily = plan.maxUsers > 1;
            const isFeatured = plan.key === featuredKey;
            const periodLabel =
              plan.periodDays === 30 ? "/bulan" : plan.periodDays === 365 ? "/tahun" : `/${plan.periodDays} hari`;
            return (
              <div key={plan.key} className={`lv-price-card ${isFeatured ? "lv-featured" : ""}`}>
                {isFeatured && <span className="lv-price-badge">PALING POPULER</span>}
                <div className="lv-price-name">{plan.label}</div>
                <div className="lv-price-tagline">{plan.description ?? (isFamily ? `Untuk ${plan.maxUsers} anak` : "Untuk 1 anak")}</div>
                <div className="lv-price-amount">
                  <span className="lv-num">{formatRupiah(plan.price)}</span>
                  <span className="lv-period"> {periodLabel}</span>
                </div>
                <ul className="lv-price-features">
                  <li>Diagnosa lengkap + Peta Spektrum</li>
                  <li>Program Belajar Personal</li>
                  <li>Soal & latihan unlimited</li>
                  <li>Tes Kesiapan Bab on-demand</li>
                  <li>{plan.maxUsers === 1 ? "1 akun siswa" : `${plan.maxUsers} akun anak + dashboard ortu`}</li>
                </ul>
                <Link
                  href="/login?mode=register"
                  className={`lv-btn ${isFeatured ? "lv-btn-primary" : "lv-btn-outline"} lv-price-cta`}
                >
                  Pilih {plan.label}
                </Link>
              </div>
            );
          })}

          {oneTime.map((plan) => (
            <div key={plan.key} className="lv-price-card">
              <div className="lv-price-name">{plan.label}</div>
              <div className="lv-price-tagline">{plan.description ?? `${Math.round(plan.periodDays / 30)} bulan akses`}</div>
              <div className="lv-price-amount">
                <span className="lv-num">{formatRupiah(plan.price)}</span>
                <span className="lv-period"> one-time</span>
              </div>
              <ul className="lv-price-features">
                <li>Akses {Math.round(plan.periodDays / 30)} bulan penuh</li>
                <li>Fokus Materi Kunci UTBK (MAKU)</li>
                <li>Mode intensif drilling</li>
                <li>Untuk siswa kelas 12 / gap year</li>
              </ul>
              <Link href="/login?mode=register" className="lv-btn lv-btn-outline lv-price-cta">
                Pilih {plan.label}
              </Link>
            </div>
          ))}
        </div>

        <div className="lv-pricing-note">
          Trial habis? Tetap bisa pakai <strong>free tier</strong> ({pricing.freeTier.subMateriPerDay} sub-materi + {pricing.freeTier.soalPerDay} soal per hari) atau upgrade.
        </div>
      </div>
    </section>
  );
}

function LandingPage() {
  const [pricing, setPricing] = useState<PublicPricing | null>(null);

  useEffect(() => {
    fetch("/api/pricing/public")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return; // silent fail — landing tetap usable
        setPricing(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="landing-v3">
      {/* ========== HEADER ========== */}
      <header className="lv-nav">
        <div className="lv-nav-inner">
          <div className="lv-logo">
            <span className="lv-logo-mark">t</span>
            turo<span className="lv-logo-dot">.</span>
          </div>
          <nav className="lv-nav-links">
            <a href="#beda">Prinsip Turo</a>
            <a href="#cara">Cara Kerja</a>
            <a href="#spektrum">Spektrum</a>
            <a href="#harga">Harga</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/login" className="lv-btn lv-btn-outline">Masuk</Link>
            <Link href="/login?mode=register" className="lv-btn lv-btn-primary">Coba 7 Hari Gratis</Link>
          </div>
        </div>
      </header>

      {/* ========== HERO ========== */}
      <section className="lv-hero">
        <div className="lv-container">
          <div className="lv-hero-grid">
            <div>
              <span className="lv-hero-pill">🎯 Diagnostik Matematika Adaptif</span>
              <h1>
                Setiap anak<br />punya<br />
                <span className="lv-gradient">jalur belajar</span>
                <br />matematikanya sendiri.
              </h1>
              <p className="lv-hero-sub">
                Turo kenali cara berpikirmu dulu. Lalu susun{" "}
                <strong>program belajar khusus</strong> untukmu —{" "}
                <strong>bab apa</strong>, <strong>urut bagaimana</strong>, dan{" "}
                <strong>cara belajar yang cocok</strong> dengan levelmu.
              </p>
              <div className="lv-hero-cta">
                <Link href="/onboarding" className="lv-btn lv-btn-primary lv-btn-lg">
                  Mulai Diagnosa →
                </Link>
                <a href="#cara" className="lv-btn lv-btn-outline lv-btn-lg">
                  Lihat Cara Kerja
                </a>
              </div>
              <div className="lv-hero-trust">
                <span style={{ fontSize: "1.1em" }}>🎓</span>
                <div>SD · SMP · SMA · UTBK · Olimpiade — sesuai Kurikulum Merdeka</div>
              </div>
            </div>
            <div className="lv-hero-visual">
              <img src="/illustrations/hero-doctor-math.png" alt="Diagnostik Matematika Turo" className="lv-hero-illust" />
              <div className="lv-floating-chip lv-chip-1">
                <span style={{ color: "var(--lv-emerald)" }}>✓</span> Kelas estimasi: 7
              </div>
              <div className="lv-floating-chip lv-chip-2">
                <span style={{ color: "var(--lv-violet)" }}>🌌</span> Kuat: Penalaran Abstrak
              </div>
              <div className="lv-floating-chip lv-chip-3">
                <span style={{ color: "var(--lv-amber)" }}>⚡</span> Perlu: Pemecahan Masalah
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== TRUST STRIP ========== */}
      <div className="lv-trust-strip">
        <div className="lv-container">
          <div className="lv-trust-row">
            <div className="lv-trust-stat">
              <div className="lv-trust-stat-num">3</div>
              <div className="lv-trust-stat-label">Jenjang (SD–SMA)</div>
            </div>
            <div className="lv-trust-stat">
              <div className="lv-trust-stat-num">12</div>
              <div className="lv-trust-stat-label">Kelas (K1–K12)</div>
            </div>
            <div className="lv-trust-stat">
              <div className="lv-trust-stat-num">3</div>
              <div className="lv-trust-stat-label">Jalur Belajar</div>
            </div>
            <div className="lv-trust-stat">
              <div className="lv-trust-stat-num">106</div>
              <div className="lv-trust-stat-label">Bab</div>
            </div>
            <div className="lv-trust-stat">
              <div className="lv-trust-stat-num">472</div>
              <div className="lv-trust-stat-label">Sub-Bab</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== 3 SELLING POINTS ========== */}
      <section className="lv-section lv-selling-section" id="beda">
        <div className="lv-container">
          <div className="lv-section-header">
            <span className="lv-section-label">Prinsip Inti</span>
            <h2 className="lv-section-title">
              Tiga prinsip yang membuat turo<br />bekerja{" "}
              <span style={{ color: "var(--lv-amber)" }}>personal</span> untukmu.
            </h2>
            <p className="lv-section-sub">
              Mengerti cara berpikir, mendiagnosa kondisi, lalu menuntaskan bab demi bab — sesuai jalur masing-masing anak.
            </p>
          </div>

          <div className="lv-selling-grid">
            <div className="lv-selling-card lv-card-1">
              <img src="/illustrations/selling-1-understanding.png" alt="Mengerti cara berpikir" className="lv-selling-illust" />
              <span className="lv-selling-num">1</span>
              <h3>Mengerti cara berpikirmu, bukan cuma jawabanmu.</h3>
              <p>
                Turo mengukur <strong>5 dimensi cara berpikir matematis</strong> kamu:
                penalaran abstrak, pemecahan masalah, komunikasi, ketekunan, dan
                percaya diri. Hasilnya: pemahaman utuh tentang <em>bagaimana</em> otakmu memproses soal.
              </p>
              <div className="lv-selling-quote">
                "Anak saya tahu rumus, tapi gugup di soal HOTS. Turo bilang dia lemah di 'pemecahan masalah'. Bener banget!" — Bu Lina, ortu SMP
              </div>
            </div>

            <div className="lv-selling-card lv-card-2">
              <img src="/illustrations/selling-2-diagnosis.png" alt="Diagnosa personal" className="lv-selling-illust" />
              <span className="lv-selling-num">2</span>
              <h3>Diagnosa seperti dokter — obat mujarab, bukan generik.</h3>
              <p>
                Setiap user punya <strong>program belajar berbeda</strong>. Hasil diagnostik
                bukan template. Sub-materi yang harus dikuasai, urutan, level kesulitan —
                semua disesuaikan dengan <em>kondisi spesifik</em> kamu, hasil tes 30 menit.
              </p>
              <div className="lv-selling-quote">
                "Kayak ke dokter yang ngasih resep. Bukan 'minum vitamin general' tapi 'kamu butuh ini, ini, dan ini.'" — Pak Joko, ortu SMA
              </div>
            </div>

            <div className="lv-selling-card lv-card-3">
              <img src="/illustrations/selling-3-complete.png" alt="Tuntas sampai bab terkuasai" className="lv-selling-illust" />
              <span className="lv-selling-num">3</span>
              <h3>Tuntas sampai bab terkuasai. Adaptif sama level kamu.</h3>
              <p>
                Bukan kerjain soal asal banyak. Turo tunjukkan <strong>bab demi bab yang
                wajib dikuasai</strong>, urut dari pondasi paling lemah. Cara belajarnya
                juga <em>menyesuaikan level kemampuan</em> — anak kuat dapat tantangan,
                anak lemah dapat penjelasan dasar dulu.
              </p>
              <div className="lv-selling-quote">
                "Akhirnya jelas urutannya. Bukan loncat-loncat. Anak saya naik dari bingung ke percaya diri." — Bu Sari, ortu SD
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CARA KERJA ========== */}
      <section className="lv-section lv-how-section" id="cara">
        <div className="lv-container">
          <div className="lv-section-header">
            <span className="lv-section-label">Cara Kerja</span>
            <h2 className="lv-section-title">
              3 langkah, dari diagnosa<br />sampai program belajar.
            </h2>
            <p className="lv-section-sub">
              Semua dalam satu sesi 30 menit. Tidak ada drama, tidak ada tebak-tebakan.
            </p>
          </div>
          <div className="lv-how-grid">
            <div className="lv-how-step">
              <div className="lv-how-step-number">1</div>
              <img src="/illustrations/how-1-diagnostik.png" alt="Diagnostik" className="lv-how-illust" />
              <h3>Diagnostik 30 Menit</h3>
              <p>Anak kerjakan ~30-40 soal adaptif. Engine identifikasi level kelas, area lemah, dan cara berpikir.</p>
            </div>
            <div className="lv-how-step">
              <div className="lv-how-step-number">2</div>
              <img src="/illustrations/how-2-spektrum.png" alt="Peta Spektrum" className="lv-how-illust" />
              <h3>Peta Spektrum + Bab Wajib</h3>
              <p>Hasil: 5 dimensi cara berpikir + daftar bab yang harus dikuasai, urut dari pondasi terlemah.</p>
            </div>
            <div className="lv-how-step">
              <div className="lv-how-step-number">3</div>
              <img src="/illustrations/how-3-program.png" alt="Program Belajar" className="lv-how-illust" />
              <h3>Program Belajar Adaptif</h3>
              <p>Anak kerjakan sesi belajar harian. Cara penyajian soal & bantuan menyesuaikan level kemampuan.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SPEKTRUM ========== */}
      <section className="lv-section lv-spektrum-section" id="spektrum">
        <div className="lv-container">
          <div className="lv-section-header">
            <span className="lv-section-label">🌌 Signature Feature</span>
            <h2 className="lv-section-title">Peta Spektrum Matematis</h2>
            <p className="lv-section-sub">
              5 dimensi cara berpikir matematis. Bukan tahu APA, tapi <strong>BAGAIMANA</strong> anak berpikir.
            </p>
          </div>
          <div className="lv-spektrum-grid">
            <div className="lv-spek-card">
              <div className="lv-spek-icon">🧠</div>
              <h4>Penalaran Abstrak</h4>
              <div className="lv-spek-weight">30%</div>
            </div>
            <div className="lv-spek-card">
              <div className="lv-spek-icon">🧩</div>
              <h4>Pemecahan Masalah</h4>
              <div className="lv-spek-weight">25%</div>
            </div>
            <div className="lv-spek-card">
              <div className="lv-spek-icon">💬</div>
              <h4>Komunikasi Matematis</h4>
              <div className="lv-spek-weight">20%</div>
            </div>
            <div className="lv-spek-card">
              <div className="lv-spek-icon">🎯</div>
              <h4>Ketekunan & Fokus</h4>
              <div className="lv-spek-weight">15%</div>
            </div>
            <div className="lv-spek-card">
              <div className="lv-spek-icon">💪</div>
              <h4>Percaya Diri</h4>
              <div className="lv-spek-weight">10%</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      {pricing && <PricingV3 pricing={pricing} />}

      {/* ========== FAQ ========== */}
      <section className="lv-section lv-faq-section" id="faq">
        <div className="lv-container">
          <div className="lv-section-header">
            <span className="lv-section-label">FAQ</span>
            <h2 className="lv-section-title">Pertanyaan yang sering ditanyakan</h2>
          </div>
          <div className="lv-faq-list">
            <details className="lv-faq-item">
              <summary>Berapa lama diagnostik awalnya?</summary>
              <div className="lv-faq-body">
                30-40 menit. Anak kerjakan ~30-40 soal adaptif yang menyesuaikan kemampuan secara real-time. Tidak perlu sekali duduk — bisa dipause dan dilanjut.
              </div>
            </details>
            <details className="lv-faq-item">
              <summary>Bagaimana cara turo mendiagnosa kemampuan matematika anak?</summary>
              <div className="lv-faq-body">
                Turo pakai <strong>tes adaptif</strong> yang menyesuaikan kesulitan soal real-time. Engine identifikasi 3 hal: (1) level kelas estimasi, (2) area lemah per bab, dan (3) 5 dimensi cara berpikir matematis. Hasilnya peta lengkap kondisi anak — siap dijadikan dasar program belajar personal.
              </div>
            </details>
            <details className="lv-faq-item">
              <summary>Untuk jenjang apa saja?</summary>
              <div className="lv-faq-body">
                SD kelas 1-6, SMP kelas 7-9, SMA kelas 10-12 (termasuk persiapan UTBK). Total 472 sub-materi terkurasi sesuai Kurikulum Merdeka.
              </div>
            </details>
            <details className="lv-faq-item">
              <summary>Apakah ada trial gratis?</summary>
              <div className="lv-faq-body">
                Ya, 7 hari gratis tanpa kartu kredit. Setelah trial, kalau tidak cocok, tinggal stop — tidak ada biaya. Trial mencakup semua fitur.
              </div>
            </details>
            <details className="lv-faq-item">
              <summary>Pembayaran via apa?</summary>
              <div className="lv-faq-body">
                Transfer bank (semua bank Indonesia), e-wallet (OVO, GoPay, DANA, ShopeePay), QRIS, dan kartu kredit. Aman lewat Xendit.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="lv-cta-section">
        <div className="lv-container">
          <h2>
            Mulai dengan diagnosa.<br />Lanjutkan dengan program yang cocok.
          </h2>
          <p>Trial 7 hari gratis. Tanpa kartu kredit. Tinggalkan kapan saja.</p>
          <Link href="/onboarding" className="lv-btn lv-btn-primary lv-btn-lg">
            Mulai Diagnosa Gratis →
          </Link>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="lv-footer">
        <div className="lv-container">
          <div className="lv-footer-grid">
            <div className="lv-footer-brand">
              <div className="lv-logo">
                <span className="lv-logo-mark">t</span>
                turo<span className="lv-logo-dot">.</span>
              </div>
              <p>Diagnostik Matematika Adaptif. Mengerti cara berpikir setiap anak, lalu menyusun jalur belajar yang sesuai.</p>
            </div>
            <div className="lv-footer-col">
              <h4>Produk</h4>
              <a href="#cara">Cara Kerja</a>
              <a href="#spektrum">Peta Spektrum</a>
              <a href="#harga">Harga</a>
              <Link href="/onboarding">Mulai Diagnosa</Link>
            </div>
            <div className="lv-footer-col">
              <h4>Akun</h4>
              <Link href="/login">Masuk</Link>
              <Link href="/login?mode=register">Daftar</Link>
            </div>
            <div className="lv-footer-col">
              <h4>Bantuan</h4>
              <a href="#faq">FAQ</a>
              <a href="mailto:hello@mainmaku.id">Kontak</a>
            </div>
          </div>
          <div className="lv-footer-bottom">
            © 2026 Turo · bagian dari mainmaku.id · Made in Indonesia
          </div>
        </div>
      </footer>
    </div>
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
