import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "turo — Belajar Matematika Adaptif dari SD sampai Olimpiade",
  description:
    "Platform diagnostik & belajar matematika berbasis IRT. 472 sub-materi terkurasi, 5 jalur diagnostik, peta prasyarat, bantuan AI per soal.",
};

export default function LandingPage() {
  return (
    <main className="bg-slate-950 text-white min-h-screen">
      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-teal-500/15">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3.5">
          <Link href="/landing" className="flex items-center gap-2.5">
            <LogoSvg />
            <span className="font-extrabold text-xl tracking-tight">
              turo<span className="text-teal-400">.</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm">
            <a href="#fitur" className="text-slate-300 hover:text-teal-300 transition">Fitur</a>
            <a href="#diagnostik" className="text-slate-300 hover:text-teal-300 transition">Diagnostik</a>
            <a href="#jalur" className="text-slate-300 hover:text-teal-300 transition">Jalur Belajar</a>
            <a href="#showcase" className="text-slate-300 hover:text-teal-300 transition">Tampilan</a>
            <a href="#untuk-siapa" className="text-slate-300 hover:text-teal-300 transition">Untuk Siapa</a>
            <Link
              href="/login"
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-1.5 rounded-lg font-bold text-sm transition"
            >
              Masuk Aplikasi
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden pt-32 pb-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />

        {/* Floating math symbols background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          {[
            { t: "∫", c: "top-[15%] left-[8%]", s: "text-6xl" },
            { t: "π", c: "top-[25%] right-[12%]", s: "text-5xl" },
            { t: "x²", c: "top-[55%] left-[15%]", s: "text-4xl" },
            { t: "√n", c: "bottom-[25%] right-[18%]", s: "text-5xl" },
            { t: "θ", c: "top-[40%] right-[8%]", s: "text-4xl" },
            { t: "Σ", c: "bottom-[15%] left-[10%]", s: "text-6xl" },
          ].map((m, i) => (
            <span key={i} className={`absolute font-serif italic text-teal-400/40 ${m.c} ${m.s}`}>
              {m.t}
            </span>
          ))}
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 ring-1 ring-teal-500/20 px-3 py-1 text-xs font-medium text-teal-300 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            mainmaku.id · diagnostik adaptif berbasis IRT
          </div>

          <div className="flex items-center justify-center gap-4 mb-3">
            <LogoSvg size={56} />
            <span className="text-5xl sm:text-6xl font-extrabold tracking-tight">
              turo<span className="text-teal-400">.</span>
            </span>
          </div>
          <p className="text-sm font-semibold tracking-[0.3em] uppercase text-teal-300/70 mb-6">
            Adaptive Math Learning Platform
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Belajar matematika dari{" "}
            <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
              dasar sampai olimpiade
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Diagnostik adaptif IRT 2PL untuk mapping kemampuan presisi, peta prasyarat 472
            sub-materi terkurasi, dan rekomendasi jalur belajar otomatis—sekolah reguler, SNBT,
            sampai olimpiade.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap mb-12">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 px-7 py-3.5 rounded-xl font-bold transition shadow-lg shadow-teal-500/30 hover:shadow-teal-400/40 hover:-translate-y-0.5"
            >
              🎯 Cek Kemampuan Gratis
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white/5 ring-1 ring-white/15 hover:bg-white/10 text-white px-7 py-3.5 rounded-xl font-bold transition"
            >
              Sudah Punya Akun? Masuk →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto mb-12">
            {[
              { num: "472", label: "Sub-materi terkurasi" },
              { num: "5", label: "Jalur diagnostik" },
              { num: "3", label: "Tahap IRT adaptif" },
              { num: "100%", label: "Gratis dipakai" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-teal-300">{s.num}</div>
                <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Hero showcase — preview screenshot soal */}
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute inset-x-0 -inset-y-6 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-teal-500/20 blur-2xl rounded-3xl" />
            <div className="relative rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-teal-400/30">
              <Image
                src="/landing/screenshot-soal-sd.png"
                alt="Screenshot soal diagnostik turo"
                width={1200}
                height={700}
                className="rounded-xl w-full h-auto"
                priority
              />
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Contoh: soal MC level SD dengan visual interaktif
            </p>
          </div>
        </div>
      </section>

      {/* ===== FITUR UNGGULAN — 3 PILAR ===== */}
      <section id="fitur" className="py-20 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-3">3 Pilar Utama</h2>
          <p className="text-center text-slate-400 max-w-2xl mx-auto mb-14">
            Diagnostik ⟶ Rekomendasi Jalur ⟶ Belajar Terarah — semua dalam satu platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<IconTarget />}
              title="Diagnostik IRT 2PL"
              desc="Algoritma Item Response Theory pilih soal yang paling informatif di kemampuan kamu sekarang. 30 soal cukup untuk profil presisi—jauh lebih efisien dari tes biasa."
              color="teal"
            />
            <FeatureCard
              icon={<IconTree />}
              title="Peta Prasyarat 472 Sub"
              desc="Konsep matematika dipetakan dari SD K1 sampai SMA K12 dengan relasi prasyarat eksplisit. Sistem tahu mana yang harus dikuasai dulu sebelum lanjut."
              color="cyan"
            />
            <FeatureCard
              icon={<IconRoad />}
              title="Path Routing 4-Tier"
              desc="Hasil diagnostik klasifikasi siswa ke 4 jalur: Advanced, Standard, Comprehensive, atau Intensive — dengan estimasi waktu & strategi belajar konkret."
              color="emerald"
            />
          </div>
        </div>
      </section>

      {/* ===== DIAGNOSTIK 3 LAPIS ===== */}
      <section id="diagnostik" className="py-20 px-6 bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-3">3 Lapis Diagnostik</h2>
          <p className="text-center text-slate-400 max-w-2xl mx-auto mb-14">
            Tes adaptif yang skala dari general (per area) sampai detail (per sub-materi).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LapisCard
              num="1"
              label="Onboarding"
              title="Cek Kemampuan Awal"
              desc="3-stage IRT: Locator (cari level kelas) → Coverage (profil per area) → Deep (drill sub-materi suspect). 15-30 menit."
              color="teal"
            />
            <LapisCard
              num="1.5"
              label="Cek Kesiapan Bab"
              title="Sebelum Buka Bab"
              desc="5-10 soal warmup cek prereq agregat sebelum mulai bab baru. Soft warning kalau prereq lemah."
              color="cyan"
            />
            <LapisCard
              num="2"
              label="Cek Kesiapan Sub"
              title="Per Sub-Materi"
              desc="Mini-warmup blind spot detection sebelum buka sub-materi spesifik. Auto-skip kalau sudah dikuasai."
              color="emerald"
            />
          </div>
        </div>
      </section>

      {/* ===== JALUR BELAJAR ===== */}
      <section id="jalur" className="py-20 px-6 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-3">3 Jalur Belajar</h2>
          <p className="text-center text-slate-400 max-w-2xl mx-auto mb-14">
            Pilih sesuai targetmu. Tiap jalur punya peta, soal, dan rekomendasi yang berbeda.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <JalurCard
              emoji="🏫"
              title="Sekolah Reguler"
              jenjang="SD · SMP · SMA"
              desc="Mengikuti Kurikulum Merdeka CP 046/2025. Per kelas, per bab, per sub-materi. Dual-track: Strict CP atau Comprehensive."
              tag="438 sub strict / 472 full"
              color="teal"
            />
            <JalurCard
              emoji="🎓"
              title="Persiapan SNBT"
              jenjang="Kelas 12 / Lulusan"
              desc="Estimasi skor UTBK 200-1000 (mirroring LTMPT). Profil per area: penalaran kuantitatif, pengetahuan kuantitatif, literasi data."
              tag="Mapping LTMPT scaled score"
              color="cyan"
            />
            <JalurCard
              emoji="🏆"
              title="Olimpiade Matematika"
              jenjang="KSN · OSN · Tingkat Lanjut"
              desc="Latihan teknik olimpiade tingkat kabupaten/provinsi/nasional. Drill konsep advanced & problem solving kreatif."
              tag="Phase D — coming soon"
              color="amber"
            />
          </div>
        </div>
      </section>

      {/* ===== SHOWCASE — PREVIEW APLIKASI ===== */}
      <section id="showcase" className="py-20 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-3">Lihat Lebih Dekat</h2>
          <p className="text-center text-slate-400 max-w-2xl mx-auto mb-14">
            Tampilan nyata dari aplikasi turo — soal interaktif, hasil diagnostik, dashboard admin.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ShowcaseItem
              src="/landing/screenshot-soal-sd.png"
              label="Soal Diagnostik SD"
              desc="Visual interaktif untuk anak SD K1-K2 — bintang yang bisa dihitung."
            />
            <ShowcaseItem
              src="/landing/screenshot-soal-smp.png"
              label="Soal Diagnostik SMP"
              desc="Soal MC dengan SVG inline untuk garis bilangan & geometri."
            />
            <ShowcaseItem
              src="/landing/screenshot-admin.png"
              label="Dashboard Admin"
              desc="Monitor seluruh hasil tes user, audit kualitas soal, kelola item bank."
            />
          </div>
        </div>
      </section>

      {/* ===== FITUR DETAIL ===== */}
      <section className="py-20 px-6 bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-3">Lebih Lengkap</h2>
          <p className="text-center text-slate-400 max-w-2xl mx-auto mb-14">
            Fitur pendukung untuk pengalaman belajar yang lebih dalam.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {detailFeatures.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-white/5 ring-1 ring-teal-500/15 hover:ring-teal-400/30 hover:-translate-y-1 transition-all p-6"
              >
                <div className="text-3xl mb-3">{f.emoji}</div>
                <h3 className="text-base font-bold text-teal-300 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== UNTUK SIAPA ===== */}
      <section id="untuk-siapa" className="py-20 px-6 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-3">Untuk Siapa?</h2>
          <p className="text-center text-slate-400 max-w-2xl mx-auto mb-14">
            turo dirancang untuk semua kalangan yang serius belajar matematika.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AudienceCard
              emoji="🧒"
              title="Siswa SD–SMA"
              desc="Belajar mengikuti kurikulum sekolah dengan diagnostik adaptif. Tahu materi mana yang harus diperkuat dulu sebelum lanjut bab berikutnya."
            />
            <AudienceCard
              emoji="🎓"
              title="Calon Mahasiswa PTN"
              desc="Persiapan SNBT dengan estimasi skor UTBK + identifikasi area lemah. Fokus latihan terarah, bukan asal hajar semua materi."
            />
            <AudienceCard
              emoji="👨‍🏫"
              title="Guru & Orang Tua"
              desc="Monitor mastery anak per sub-materi. Dashboard admin untuk audit hasil tes & rekomendasi belajar siswa."
            />
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 px-6 bg-gradient-to-br from-teal-900 to-slate-950">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-3xl bg-teal-500/10 ring-2 ring-teal-400/30 p-8 sm:p-12 text-center backdrop-blur">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-teal-300 mb-3">
              Mulai Sekarang — Gratis!
            </h2>
            <p className="text-slate-300 mb-8 max-w-md mx-auto">
              Tidak perlu daftar lama. Klik &quot;Cek Kemampuan&quot; → diagnostik 15 menit →
              dapat rekomendasi jalur belajar personal.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-teal-500/40 transition hover:-translate-y-0.5"
              >
                🎯 Cek Kemampuan Gratis
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white/5 ring-1 ring-white/15 hover:bg-white/10 text-white px-8 py-3.5 rounded-xl font-bold transition"
              >
                Masuk Aplikasi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-8 px-6 bg-slate-950 border-t border-teal-500/15 text-center text-sm text-slate-500">
        <p>
          © 2026 turo · part of{" "}
          <a href="https://mainmaku.id" className="text-teal-400 hover:underline">
            mainmaku.id
          </a>{" "}
          · by Blink Mathematic Therapy
        </p>
      </footer>
    </main>
  );
}

// ============================================================
// Sub-components
// ============================================================

function LogoSvg({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className="shrink-0">
      <rect width="36" height="36" rx="8" fill="#14b8a6" />
      <text
        x="18"
        y="26"
        fontSize="22"
        fontWeight="900"
        fontFamily="system-ui, sans-serif"
        textAnchor="middle"
        fill="#0f172a"
      >
        t
      </text>
      <circle cx="29" cy="27" r="2.5" fill="#67e8f9" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12 text-teal-400">
      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <circle cx="32" cy="32" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="32" cy="32" r="3.5" fill="currentColor" />
      <path d="M48 16 L52 12 M48 16 L44 12 M48 16 L52 20 M48 16 L44 20" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="32" x2="48" y2="16" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 3" />
    </svg>
  );
}

function IconTree() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12 text-cyan-400">
      <circle cx="32" cy="14" r="6" fill="currentColor" />
      <circle cx="14" cy="32" r="5" fill="currentColor" opacity="0.85" />
      <circle cx="32" cy="32" r="5" fill="currentColor" opacity="0.85" />
      <circle cx="50" cy="32" r="5" fill="currentColor" opacity="0.85" />
      <circle cx="8" cy="50" r="4" fill="currentColor" opacity="0.6" />
      <circle cx="20" cy="50" r="4" fill="currentColor" opacity="0.6" />
      <circle cx="32" cy="50" r="4" fill="currentColor" opacity="0.6" />
      <circle cx="44" cy="50" r="4" fill="currentColor" opacity="0.6" />
      <circle cx="56" cy="50" r="4" fill="currentColor" opacity="0.6" />
      <line x1="32" y1="20" x2="14" y2="27" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="32" y1="20" x2="32" y2="27" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="32" y1="20" x2="50" y2="27" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="14" y1="37" x2="8" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="14" y1="37" x2="20" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="32" y1="37" x2="32" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="50" y1="37" x2="44" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="50" y1="37" x2="56" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function IconRoad() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12 text-emerald-400">
      <path d="M16 56 L26 8 L38 8 L48 56 Z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2" />
      <line x1="32" y1="14" x2="32" y2="20" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="26" x2="32" y2="32" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="38" x2="32" y2="44" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="50" x2="32" y2="56" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="10" r="3" fill="#fbbf24" />
    </svg>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: "teal" | "cyan" | "emerald" }) {
  const ringColor = { teal: "ring-teal-500/20 hover:ring-teal-400/40", cyan: "ring-cyan-500/20 hover:ring-cyan-400/40", emerald: "ring-emerald-500/20 hover:ring-emerald-400/40" }[color];
  const textColor = { teal: "text-teal-300", cyan: "text-cyan-300", emerald: "text-emerald-300" }[color];
  return (
    <div className={`rounded-3xl bg-white/5 ring-2 ${ringColor} hover:-translate-y-1 transition-all p-7`}>
      <div className="mb-4">{icon}</div>
      <h3 className={`text-xl font-bold ${textColor} mb-3`}>{title}</h3>
      <p className="text-sm text-slate-300 leading-relaxed">{desc}</p>
    </div>
  );
}

function LapisCard({ num, label, title, desc, color }: { num: string; label: string; title: string; desc: string; color: "teal" | "cyan" | "emerald" }) {
  const bgColor = { teal: "bg-teal-500", cyan: "bg-cyan-500", emerald: "bg-emerald-500" }[color];
  const textColor = { teal: "text-teal-300", cyan: "text-cyan-300", emerald: "text-emerald-300" }[color];
  return (
    <div className="relative rounded-3xl bg-white/5 ring-1 ring-teal-500/15 p-7 hover:-translate-y-1 transition-all">
      <div className={`absolute -top-5 left-7 ${bgColor} text-slate-950 font-extrabold rounded-full h-12 w-12 grid place-items-center text-lg shadow-xl`}>
        {num}
      </div>
      <div className="pt-3">
        <p className={`text-xs uppercase tracking-widest font-semibold ${textColor} mb-2`}>Lapis {label}</p>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function JalurCard({ emoji, title, jenjang, desc, tag, color }: { emoji: string; title: string; jenjang: string; desc: string; tag: string; color: "teal" | "cyan" | "amber" }) {
  const bgGradient = {
    teal: "from-teal-500/20 to-cyan-500/10",
    cyan: "from-cyan-500/20 to-blue-500/10",
    amber: "from-amber-500/20 to-orange-500/10",
  }[color];
  const textColor = { teal: "text-teal-300", cyan: "text-cyan-300", amber: "text-amber-300" }[color];
  const tagBg = { teal: "bg-teal-500/15 text-teal-300", cyan: "bg-cyan-500/15 text-cyan-300", amber: "bg-amber-500/15 text-amber-300" }[color];
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${bgGradient} ring-1 ring-white/10 p-7 hover:-translate-y-1 transition-all`}>
      <div className="text-5xl mb-3">{emoji}</div>
      <h3 className={`text-xl font-bold ${textColor} mb-1`}>{title}</h3>
      <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">{jenjang}</p>
      <p className="text-sm text-slate-300 leading-relaxed mb-4">{desc}</p>
      <span className={`inline-block ${tagBg} text-xs font-semibold rounded-full px-3 py-1`}>
        {tag}
      </span>
    </div>
  );
}

function AudienceCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-teal-500/15 hover:ring-teal-400/30 hover:-translate-y-1 transition-all p-7 text-center">
      <div className="text-5xl mb-4">{emoji}</div>
      <h3 className="text-lg font-bold text-teal-300 mb-3">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function ShowcaseItem({ src, label, desc }: { src: string; label: string; desc: string }) {
  return (
    <div className="group">
      <div className="relative rounded-2xl overflow-hidden ring-1 ring-teal-500/20 group-hover:ring-teal-400/50 transition-all bg-white shadow-xl">
        <Image src={src} alt={label} width={800} height={500} className="w-full h-auto" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
      </div>
      <h4 className="text-sm font-bold text-teal-300 mt-4 mb-1">{label}</h4>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

const detailFeatures = [
  {
    emoji: "🌳",
    title: "Dual-Track Curriculum",
    desc: "Mode Strict CP 046 (438 sub kurikulum resmi) atau Comprehensive Full (472 sub termasuk Buku-K2013, UTBK, Pengayaan).",
  },
  {
    emoji: "🧠",
    title: "Foundation Set Adaptive",
    desc: "5 set foundation per jenjang user (sd-low/mid/high, smp, sma) dengan threshold mastery yang menyesuaikan.",
  },
  {
    emoji: "🤖",
    title: "AI Generate Soal",
    desc: "Soal di-generate via Anthropic Claude dengan distractor analitis (miskonsepsi spesifik per opsi salah).",
  },
  {
    emoji: "📊",
    title: "Path Routing 4-Tier",
    desc: "Advanced / Standard / Comprehensive / Intensive — auto-classify dengan estimasi waktu & strategi.",
  },
  {
    emoji: "🎨",
    title: "Plot Fungsi Akurat",
    desc: "Server-side function plotter untuk grafik sin/cos/parabola/eksponen — koordinat exact, bukan approximation.",
  },
  {
    emoji: "🔄",
    title: "Bridge Mastery",
    desc: "Hasil diagnostik & latihan auto-sync ke profil mastery user. Cek-Kesiapan tidak minta cek prereq yang sudah dikuasai.",
  },
];
