"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";

export default function AdminIndexPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <main className="p-8 text-slate-500">Memuat...</main>;
  }
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-slate-600 mb-4">Login dulu untuk akses admin panel.</p>
        <Link href="/" className="text-brand underline">← Beranda</Link>
      </main>
    );
  }
  if (!isAdminEmail(user.email)) {
    return (
      <main className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-rose-600 mb-2">⛔ Akses ditolak</p>
        <p className="text-sm text-slate-500 mb-4">Akun {user.email} bukan admin.</p>
        <Link href="/" className="text-brand underline">← Beranda</Link>
      </main>
    );
  }

  const tools = [
    { href: "/admin/pricing", emoji: "💰", judul: "Pengaturan Harga", desc: "Edit harga plan (Solo/Family/UTBK), free tier limits, trial config. Live di Firestore — bisa diubah kapan saja." },
    { href: "/admin/labels", emoji: "🏷️", judul: "Label Sub-Materi", desc: "Adjust label per sub: 📘 Inti / 🌉 Pendukung / 🚀 Tantangan / 🎯 UTBK. AI verdict + reasoning sebagai context. (Live di Firestore)" },
    { href: "/admin/granularity", emoji: "🎚️", judul: "Smart Granularity", desc: "Auto-derived Gateway Score + Complexity Score per sub. Klasifikasi: Mandatory Drill / Conditional / Material Level Sufficient." },
    { href: "/admin/item-meta-audit", emoji: "📊", judul: "Item Meta Audit", desc: "Coverage metadata pedagogis per item (foundation untuk Maturity scoring). Per-field stats, per-jenjang breakdown, auto-refresh untuk monitor enrichment progress." },
    { href: "/admin/materi", emoji: "📚", judul: "Materi & Pohon Prasyarat", desc: "Lihat 472 sub-materi resmi & pohon prasyarat dari peta-prasyarat.json." },
    { href: "/admin/item-bank", emoji: "🏦", judul: "Item Bank", desc: "Seed soal MC ke item_bank per sub-materi prioritas (untuk diagnostik IRT)." },
    { href: "/admin/diagnostic-sessions", emoji: "🎯", judul: "Sesi Diagnostik IRT", desc: "Audit sesi onboarding Phase B (Locator/Coverage/Deep): soal, jawaban, kecocokan vs peta." },
    { href: "/admin/klasifikasi-config", emoji: "⚙", judul: "Threshold Klasifikasi", desc: "Tune batas accuracy lemah/cukup/kuat & remediasi/review/siap untuk diagnostik." },
    { href: "/admin/diagnostik", emoji: "📋", judul: "Soal Diagnostik (legacy)", desc: "Validasi soal hasil generate AI dari diagnostik per-bab (pre-IRT)." },
    { href: "/admin/import", emoji: "📥", judul: "Impor Soal PDF", desc: "Upload PDF, ekstrak & klasifikasi otomatis ke materi." },
  ];

  return (
    <main className="mx-auto max-w-5xl p-6 sm:p-10">
      <div className="mb-8 animate-rise">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          admin · {user.email}
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Admin Panel<span className="text-brand">.</span></h1>
        <p className="text-muted mt-2 max-w-xl">Tools untuk manage konten & validasi.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group block rounded-2xl bg-white border border-slate-200 hover:border-brand hover:shadow-lg hover:-translate-y-0.5 transition-all p-5"
          >
            <div className="text-3xl mb-2">{t.emoji}</div>
            <h3 className="font-bold group-hover:text-brand transition">{t.judul}</h3>
            <p className="text-sm text-slate-600 mt-1">{t.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
