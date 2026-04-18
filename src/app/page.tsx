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
// Landing
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

function LandingPage() {
  const { loginEmail, registerEmail, loginGoogle } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isRegister) {
        await registerEmail(email, password, nama);
      } else {
        await loginEmail(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password")) setError("Email atau password salah.");
      else if (msg.includes("email-already-in-use")) setError("Email sudah terdaftar. Silakan masuk.");
      else if (msg.includes("weak-password")) setError("Password minimal 6 karakter.");
      else if (msg.includes("invalid-email")) setError("Format email tidak valid.");
      else setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setSubmitting(true);
    try {
      await loginGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      if (!msg.includes("popup-closed")) setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col lg:flex-row">
      <div className="relative flex-1 overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-900 text-white flex flex-col justify-center px-8 py-16 lg:px-16">
        <div className="bg-grid-dark absolute inset-0 opacity-40" />
        <FloatingMath />
        <div className="relative max-w-lg mx-auto lg:mx-0 animate-rise">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-medium text-teal-50 ring-1 ring-white/20 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
            mainmaku.id · belajar matematika adaptif
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
            turo<span className="text-teal-300">.</span>
          </h1>
          <p className="text-lg text-teal-50/90 mb-8 leading-relaxed">
            Sekolah, SNBT, atau Olimpiade — semua dalam satu platform. Peta prasyarat & bantuan visual AI bantu kamu naik level dari dasar.
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { e: "🎯", t: "Soal adaptif" },
              { e: "🤖", t: "Bantuan AI" },
              { e: "✨", t: "Gratis" },
            ].map((x) => (
              <div key={x.t} className="rounded-xl bg-white/10 backdrop-blur p-3 ring-1 ring-white/15 text-center">
                <div className="text-2xl mb-1">{x.e}</div>
                <div className="text-xs text-teal-50/90">{x.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-8 py-12 lg:py-0 bg-background">
        <div className="w-full max-w-sm animate-rise">
          <h2 className="text-3xl font-bold text-center mb-2 text-foreground">
            {isRegister ? "Buat Akun" : "Selamat Datang"}
          </h2>
          <p className="text-muted text-center text-sm mb-8">
            {isRegister ? "Daftar untuk mulai belajar" : "Masuk untuk melanjutkan belajar"}
          </p>

          <button
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50 mb-4 shadow-sm font-medium text-slate-700"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isRegister ? "Daftar" : "Masuk"} dengan Google
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-slate-400 uppercase tracking-wider">atau</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <input type="text" placeholder="Nama lengkap" value={nama} onChange={(e) => setNama(e.target.value)} required
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition shadow-sm" />
            )}
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition shadow-sm" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition shadow-sm" />
            {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl px-4 py-3 font-semibold transition disabled:opacity-50 shadow-md shadow-teal-500/30 active:scale-[0.98]">
              {submitting ? "Memproses..." : isRegister ? "Daftar" : "Masuk"}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <button onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="text-brand hover:text-brand-strong font-semibold underline-offset-2 hover:underline">
              {isRegister ? "Masuk" : "Daftar"}
            </button>
          </p>
        </div>
      </div>
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
