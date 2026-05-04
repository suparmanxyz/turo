"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

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

function LoginForm() {
  const { user, loading: authLoading, loginEmail, registerEmail, loginGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "register";

  const [isRegister, setIsRegister] = useState(initialMode);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  if (authLoading || user) {
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
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password")) setError("Email atau password salah.");
      else if (msg.includes("email-already-in-use")) setError("Email sudah terdaftar. Silakan masuk.");
      else if (msg.includes("weak-password")) setError("Password minimal 6 karakter.");
      else if (msg.includes("invalid-email")) setError("Format email tidak valid.");
      else if (msg.includes("user-not-found")) setError("Akun tidak ditemukan. Silakan daftar dulu.");
      else if (msg.includes("too-many-requests")) setError("Terlalu banyak percobaan. Coba lagi sebentar.");
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
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      if (!msg.includes("popup-closed")) setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col lg:flex-row">
      {/* Kiri: brand panel */}
      <aside className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-900 text-white flex flex-col justify-between px-8 py-10 lg:px-16 lg:py-12 lg:w-[44%] lg:min-h-screen">
        <div className="bg-grid-dark absolute inset-0 opacity-40" />
        <FloatingMath />

        <Link href="/" className="relative z-10 flex items-center gap-2 group w-fit">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/30 text-white font-bold shadow-lg group-hover:scale-105 transition">
            t
          </span>
          <span className="font-extrabold text-lg tracking-tight text-white">
            turo<span className="text-teal-300">.</span>
          </span>
        </Link>

        <div className="relative z-10 max-w-md animate-rise py-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-medium text-teal-50 ring-1 ring-white/20 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
            mainmaku.id · belajar matematika adaptif
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            {isRegister ? "Mulai dari titik yang tepat." : "Lanjutkan belajar dari pause terakhir."}
          </h1>
          <p className="text-base text-teal-50/90 leading-relaxed mb-8">
            {isRegister
              ? "Diagnostik adaptif menentukan level kelas dan area lemahmu — tidak perlu nebak harus mulai dari mana."
              : "Progresmu, peta prasyarat, dan rekomendasi sub-materi menunggu di dashboard."}
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-sm">
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

        <Link
          href="/"
          className="relative z-10 inline-flex items-center gap-1.5 text-sm text-teal-50/80 hover:text-white transition w-fit"
        >
          ← Kembali ke beranda
        </Link>
      </aside>

      {/* Kanan: form */}
      <section className="flex-1 flex items-center justify-center px-6 py-12 lg:px-8 bg-background">
        <div className="w-full max-w-sm animate-rise">
          {/* tab switcher */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-7">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(""); }}
              className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition ${
                !isRegister ? "bg-white text-foreground shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(""); }}
              className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition ${
                isRegister ? "bg-white text-foreground shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Daftar
            </button>
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-1">
            {isRegister ? "Buat akun" : "Selamat datang kembali"}
          </h2>
          <p className="text-muted text-sm mb-7">
            {isRegister ? "Hanya butuh 1 menit. Gratis selamanya." : "Masuk untuk melanjutkan belajar."}
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
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nama lengkap</label>
                <input
                  type="text"
                  placeholder="cth. Budi Santoso"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                  autoComplete="name"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition shadow-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="kamu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Password
                {isRegister && <span className="ml-1 text-slate-400 font-normal">(min. 6 karakter)</span>}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition shadow-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl px-4 py-3 font-semibold transition disabled:opacity-50 shadow-md shadow-teal-500/30 active:scale-[0.98]"
            >
              {submitting ? "Memproses..." : isRegister ? "Buat akun" : "Masuk"}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="text-brand hover:text-brand-strong font-semibold underline-offset-2 hover:underline"
            >
              {isRegister ? "Masuk" : "Daftar gratis"}
            </button>
          </p>

          {isRegister && (
            <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
              Dengan mendaftar kamu menyetujui penggunaan turo untuk keperluan belajar.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function LoginFallback() {
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
