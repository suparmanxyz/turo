"use client";

import Link from "next/link";
import { useState } from "react";
import { DAFTAR_MATERI } from "@/data/materi";
import { useAuth } from "@/contexts/AuthContext";
import { KATEGORI_LABEL, KATEGORI_DESKRIPSI, type Kategori } from "@/types";

const KATEGORI_URUT: Kategori[] = ["sd", "smp", "sma", "snbt", "olimpiade"];

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
      if (msg.includes("invalid-credential") || msg.includes("wrong-password")) {
        setError("Email atau password salah.");
      } else if (msg.includes("email-already-in-use")) {
        setError("Email sudah terdaftar. Silakan masuk.");
      } else if (msg.includes("weak-password")) {
        setError("Password minimal 6 karakter.");
      } else if (msg.includes("invalid-email")) {
        setError("Format email tidak valid.");
      } else {
        setError(msg);
      }
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
      if (!msg.includes("popup-closed")) {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col lg:flex-row">
      {/* Hero */}
      <div className="flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex flex-col justify-center px-8 py-16 lg:px-16">
        <div className="max-w-lg mx-auto lg:mx-0">
          <div className="mb-8">
            <svg viewBox="0 0 400 280" className="w-full max-w-sm mx-auto lg:mx-0" aria-hidden="true">
              <rect x="40" y="30" width="320" height="220" rx="16" fill="rgba(255,255,255,0.1)" />
              <text x="200" y="100" textAnchor="middle" fontSize="48" fill="rgba(255,255,255,0.9)" fontFamily="serif" fontStyle="italic">x² + y² = r²</text>
              <text x="200" y="160" textAnchor="middle" fontSize="32" fill="rgba(255,255,255,0.6)" fontFamily="serif">∑ ∫ π √ ∞</text>
              <circle cx="80" cy="220" r="20" fill="rgba(255,255,255,0.15)" />
              <polygon points="320,200 340,240 300,240" fill="rgba(255,255,255,0.15)" />
              <rect x="180" y="200" width="40" height="40" rx="4" fill="rgba(255,255,255,0.15)" />
            </svg>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">turo</h1>
          <p className="text-lg text-blue-100 mb-6 leading-relaxed">
            Belajar matematika adaptif — dari SD, SMP, SMA, persiapan SNBT, sampai olimpiade.
            Peta prasyarat & bantuan visual AI bantu kamu naik level dari dasar.
          </p>
          <div className="flex gap-6 text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Soal adaptif
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Bantuan visual AI
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Gratis
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 lg:py-0 bg-gray-50">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-center mb-2">
            {isRegister ? "Buat Akun" : "Selamat Datang"}
          </h2>
          <p className="text-gray-500 text-center text-sm mb-8">
            {isRegister ? "Daftar untuk mulai belajar" : "Masuk untuk melanjutkan belajar"}
          </p>

          <button
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-white border rounded-lg px-4 py-2.5 hover:bg-gray-50 transition disabled:opacity-50 mb-4 shadow-sm"
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
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gray-50 px-2 text-gray-400">atau</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <input
                type="text"
                placeholder="Nama lengkap"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                className="w-full bg-white border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-white border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 font-medium hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
            >
              {submitting ? "Memproses..." : isRegister ? "Daftar" : "Masuk"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="text-blue-600 hover:underline font-medium"
            >
              {isRegister ? "Masuk" : "Daftar"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

function PilihKategori({ onPilih }: { onPilih: (k: Kategori) => void }) {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex justify-between items-start mb-2">
        <h1 className="text-3xl font-bold">turo</h1>
        <Link href="/admin/import" className="text-xs text-gray-500 hover:text-blue-600 underline">
          Impor soal (admin)
        </Link>
      </div>
      <p className="text-gray-600 mb-8">
        Pilih jenjang atau kategori yang ingin kamu pelajari.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {KATEGORI_URUT.map((k) => {
          const jumlah = DAFTAR_MATERI.filter((m) => m.kategori === k).length;
          return (
            <button
              key={k}
              onClick={() => onPilih(k)}
              className="text-left block p-5 rounded-lg border hover:border-blue-500 hover:shadow transition"
            >
              <h3 className="font-semibold text-lg">{KATEGORI_LABEL[k]}</h3>
              <p className="text-sm text-gray-600 mt-1">{KATEGORI_DESKRIPSI[k]}</p>
              <p className="text-xs text-gray-400 mt-2">
                {jumlah > 0 ? `${jumlah} materi` : "Segera hadir"}
              </p>
            </button>
          );
        })}
      </div>
    </main>
  );
}

function DaftarMateri({ kategori, onKembali }: { kategori: Kategori; onKembali: () => void }) {
  const materi = DAFTAR_MATERI.filter((m) => m.kategori === kategori);
  return (
    <main className="mx-auto max-w-4xl p-8">
      <button
        onClick={onKembali}
        className="text-sm text-gray-500 hover:text-blue-600 mb-4 inline-flex items-center gap-1"
      >
        ← Ganti kategori
      </button>
      <h1 className="text-3xl font-bold mb-2">{KATEGORI_LABEL[kategori]}</h1>
      <p className="text-gray-600 mb-8">{KATEGORI_DESKRIPSI[kategori]}</p>

      <h2 className="text-xl font-semibold mb-4">Pilih Materi</h2>
      {materi.length === 0 ? (
        <p className="text-gray-500 text-sm">Belum ada materi untuk kategori ini.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {materi.map((m) => (
            <Link
              key={m.slug}
              href={`/materi/${m.slug}`}
              className="block p-5 rounded-lg border hover:border-blue-500 hover:shadow transition"
            >
              <h3 className="font-semibold text-lg">{m.nama}</h3>
              <p className="text-sm text-gray-600 mt-1">{m.deskripsi}</p>
              <p className="text-xs text-gray-400 mt-2">{m.subMateri.length} sub-materi</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function AppBerlangsung() {
  const [kategori, setKategori] = useState<Kategori | null>(null);
  return kategori ? (
    <DaftarMateri kategori={kategori} onKembali={() => setKategori(null)} />
  ) : (
    <PilihKategori onPilih={setKategori} />
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center text-gray-400">
        Memuat...
      </main>
    );
  }

  return user ? <AppBerlangsung /> : <LandingPage />;
}
