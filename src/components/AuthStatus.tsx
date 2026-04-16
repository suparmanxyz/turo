"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function AppHeader() {
  const { user, loading, logout } = useAuth();

  if (loading || !user) return null;

  return (
    <header className="flex justify-between items-center px-8 py-3 border-b">
      <a href="/" className="font-bold text-lg">turo</a>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-700">{user.displayName || user.email}</span>
        <button
          onClick={() => logout()}
          className="text-gray-500 hover:text-red-600 transition"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
