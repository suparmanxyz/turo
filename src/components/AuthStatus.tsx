"use client";

import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";

export default function AppHeader() {
  const { user, loading, logout } = useAuth();

  if (loading || !user) return null;

  const inisial = (user.displayName || user.email || "?").trim().charAt(0).toUpperCase();
  const admin = isAdminEmail(user.email);

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-slate-200/80">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 sm:px-10 py-3">
        <a href="/" className="group flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white font-bold shadow-md shadow-teal-300/40 group-hover:scale-105 transition">
            t
          </span>
          <span className="font-extrabold text-lg tracking-tight">
            turo<span className="text-brand">.</span>
          </span>
        </a>
        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          <a
            href="/laporan"
            className="text-slate-600 hover:text-brand hover:bg-brand-soft px-2.5 py-1.5 rounded-lg transition font-medium"
          >
            📊 <span className="hidden sm:inline">Laporan</span>
          </a>
          {admin && (
            <a
              href="/admin"
              className="text-amber-700 hover:text-amber-900 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg transition font-medium"
            >
              ⚙ <span className="hidden sm:inline">Admin</span>
            </a>
          )}
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-brand-strong text-xs font-bold ring-2 ring-white">
              {inisial}
            </span>
            <span className="hidden sm:inline text-slate-700 font-medium">
              {user.displayName || user.email}
            </span>
          </div>
          <button
            onClick={() => logout()}
            className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
