"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { user, loading: authLoading, loginEmail, registerEmail, loginGoogle } = useAuth();
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading || user) {
    return (
      <main className="mx-auto max-w-sm p-8 mt-16 text-center text-gray-500">
        {user ? "Mengalihkan..." : "Memuat..."}
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
      router.push("/");
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
    <main className="mx-auto max-w-sm p-8 mt-16">
      <h1 className="text-2xl font-bold text-center mb-6">
        {isRegister ? "Daftar" : "Masuk"} ke turo
      </h1>

      <button
        onClick={handleGoogle}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 border rounded-lg px-4 py-2.5 hover:bg-gray-50 transition disabled:opacity-50 mb-6"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Masuk dengan Google
      </button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">atau</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <input
            type="text"
            placeholder="Nama lengkap"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {submitting ? "Memproses..." : isRegister ? "Daftar" : "Masuk"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-6">
        {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
        <button
          onClick={() => { setIsRegister(!isRegister); setError(""); }}
          className="text-blue-600 hover:underline font-medium"
        >
          {isRegister ? "Masuk" : "Daftar"}
        </button>
      </p>
    </main>
  );
}
