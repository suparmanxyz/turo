"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";

type Filter = {
  jenjang?: "SD" | "SMP" | "SMA" | "";
  kelasMin?: number | "";
  kelasMax?: number | "";
  subKodePrefix?: string;
  area?: string;
};

type Assignment = {
  uid: string;
  email: string;
  filters: Filter[];
  updatedAt?: { seconds: number } | null;
  updatedBy?: string;
};

export default function AssignReviewerPage() {
  const { user, loading } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newEmail, setNewEmail] = useState("");
  const [newFilters, setNewFilters] = useState<Filter[]>([{ jenjang: "" }]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/reviewer-assignments", {
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAssignments(data.assignments ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => { if (user && isAdminEmail(user.email)) load(); }, [user, load]);

  async function saveAssignment(email: string, filters: Filter[]) {
    if (!user) return;
    setSaving(true);
    try {
      const cleaned = filters
        .map((f) => ({
          jenjang: f.jenjang || undefined,
          kelasMin: typeof f.kelasMin === "number" ? f.kelasMin : undefined,
          kelasMax: typeof f.kelasMax === "number" ? f.kelasMax : undefined,
          subKodePrefix: f.subKodePrefix?.trim() || undefined,
          area: f.area?.trim() || undefined,
        }))
        .filter((f) => f.jenjang || f.kelasMin !== undefined || f.kelasMax !== undefined || f.subKodePrefix || f.area);
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/reviewer-assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ email, filters: cleaned }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      await load();
      // Reset form jika ini new assignment
      if (email === newEmail) {
        setNewEmail("");
        setNewFilters([{ jenjang: "" }]);
      }
    } catch (e) {
      alert(`Save gagal: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssignment(uid: string, email: string) {
    if (!user) return;
    if (!confirm(`Hapus assignment untuk ${email}?`)) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/reviewer-assignments?uid=${encodeURIComponent(uid)}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      alert(`Gagal: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (loading) return <main className="p-8 text-slate-400">Memuat...</main>;
  if (!user) return <main className="p-8"><Link href="/login" className="text-brand">Login dulu</Link></main>;
  if (!isAdminEmail(user.email)) return <main className="p-8 text-rose-600">Bukan admin</main>;

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">👥 Assign Reviewer</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/admin/reviewer-stats" className="text-brand hover:underline">📊 Stats</Link>
          <Link href="/admin" className="text-brand hover:underline">← Admin</Link>
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Set filter untuk tiap reviewer. Reviewer hanya melihat soal yang match dengan filter mereka di <code className="bg-slate-100 px-1">/reviewer/review-soal</code>.
        Beberapa filter = OR (item match salah satu filter saja sudah lolos).
      </p>

      {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded text-sm">{error}</div>}

      {/* New assignment form */}
      <div className="mb-8 rounded-2xl bg-white border border-slate-200 p-5">
        <h2 className="font-semibold mb-3">+ Tambah / Update Assignment</h2>
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email reviewer</label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="reviewer@example.com"
          className="w-full p-2 border border-slate-200 rounded text-sm mb-3"
        />
        <FilterEditor filters={newFilters} onChange={setNewFilters} />
        <button
          onClick={() => saveAssignment(newEmail.trim().toLowerCase(), newFilters)}
          disabled={!newEmail.trim() || saving}
          className="mt-3 text-sm rounded bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-semibold disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "💾 Simpan"}
        </button>
        <p className="mt-2 text-xs text-amber-700">
          ⚠ Email harus sudah terdaftar di Firebase Auth (reviewer harus sign-up dulu).
          Setelah itu tambahkan email tsb ke <code className="bg-slate-100 px-1">REVIEWER_EMAILS</code> di <code className="bg-slate-100 px-1">src/lib/admin.ts</code>.
        </p>
      </div>

      {/* Existing assignments */}
      <h2 className="font-semibold mb-3">Assignment Aktif ({assignments.length})</h2>
      {busy && <div className="text-sm text-slate-500">Memuat...</div>}
      <div className="space-y-3">
        {assignments.map((a) => (
          <AssignmentCard key={a.uid} assignment={a} onSave={saveAssignment} onDelete={deleteAssignment} saving={saving} />
        ))}
        {!busy && assignments.length === 0 && (
          <div className="text-sm text-slate-500 italic">Belum ada reviewer yang di-assign.</div>
        )}
      </div>
    </main>
  );
}

function AssignmentCard({
  assignment,
  onSave,
  onDelete,
  saving,
}: {
  assignment: Assignment;
  onSave: (email: string, filters: Filter[]) => void;
  onDelete: (uid: string, email: string) => void;
  saving: boolean;
}) {
  const [filters, setFilters] = useState<Filter[]>(assignment.filters.length > 0 ? assignment.filters : [{ jenjang: "" }]);
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold">{assignment.email}</div>
          <div className="text-xs text-slate-500 font-mono">{assignment.uid}</div>
          {assignment.updatedAt && (
            <div className="text-xs text-slate-400 mt-1">
              Updated {new Date(assignment.updatedAt.seconds * 1000).toLocaleString("id-ID")}
              {assignment.updatedBy && ` by ${assignment.updatedBy}`}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs rounded bg-slate-100 hover:bg-slate-200 px-3 py-1.5"
          >
            {editing ? "Cancel" : "✏️ Edit"}
          </button>
          <button
            onClick={() => onDelete(assignment.uid, assignment.email)}
            className="text-xs rounded bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-1.5"
          >
            🗑 Delete
          </button>
        </div>
      </div>
      {editing ? (
        <>
          <FilterEditor filters={filters} onChange={setFilters} />
          <button
            onClick={() => { onSave(assignment.email, filters); setEditing(false); }}
            disabled={saving}
            className="mt-3 text-sm rounded bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-semibold disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "💾 Simpan"}
          </button>
        </>
      ) : (
        <FilterSummary filters={assignment.filters} />
      )}
    </div>
  );
}

function FilterSummary({ filters }: { filters: Filter[] }) {
  if (filters.length === 0) return <div className="text-sm text-slate-500 italic">Tidak ada filter → reviewer tidak melihat apa-apa.</div>;
  return (
    <ul className="text-sm space-y-1">
      {filters.map((f, i) => (
        <li key={i} className="text-slate-700">
          <span className="text-slate-400">▸</span>{" "}
          {f.jenjang && <span className="font-mono bg-slate-100 px-1.5 rounded">{f.jenjang}</span>}{" "}
          {(f.kelasMin !== undefined || f.kelasMax !== undefined) && (
            <span>K{f.kelasMin ?? "?"}-K{f.kelasMax ?? "?"}</span>
          )}{" "}
          {f.subKodePrefix && <span className="font-mono">subKode={f.subKodePrefix}*</span>}{" "}
          {f.area && <span className="font-mono">area={f.area}</span>}
        </li>
      ))}
    </ul>
  );
}

function FilterEditor({ filters, onChange }: { filters: Filter[]; onChange: (f: Filter[]) => void }) {
  function update(idx: number, patch: Partial<Filter>) {
    const next = [...filters];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }
  function addFilter() { onChange([...filters, { jenjang: "" }]); }
  function removeFilter(idx: number) { onChange(filters.filter((_, i) => i !== idx)); }

  return (
    <div className="space-y-2">
      {filters.map((f, idx) => (
        <div key={idx} className="flex gap-2 items-center p-2 bg-slate-50 rounded border border-slate-200">
          <select
            value={f.jenjang ?? ""}
            onChange={(e) => update(idx, { jenjang: (e.target.value || "") as Filter["jenjang"] })}
            className="rounded border-slate-200 border px-2 py-1 text-sm"
          >
            <option value="">— Jenjang —</option>
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
          </select>
          <input
            type="number"
            min={1}
            max={12}
            placeholder="K min"
            value={f.kelasMin ?? ""}
            onChange={(e) => update(idx, { kelasMin: e.target.value === "" ? "" : Number(e.target.value) })}
            className="w-20 rounded border-slate-200 border px-2 py-1 text-sm"
          />
          <input
            type="number"
            min={1}
            max={12}
            placeholder="K max"
            value={f.kelasMax ?? ""}
            onChange={(e) => update(idx, { kelasMax: e.target.value === "" ? "" : Number(e.target.value) })}
            className="w-20 rounded border-slate-200 border px-2 py-1 text-sm"
          />
          <input
            type="text"
            placeholder="subKode prefix"
            value={f.subKodePrefix ?? ""}
            onChange={(e) => update(idx, { subKodePrefix: e.target.value })}
            className="flex-1 rounded border-slate-200 border px-2 py-1 text-sm font-mono"
          />
          <input
            type="text"
            placeholder="area"
            value={f.area ?? ""}
            onChange={(e) => update(idx, { area: e.target.value })}
            className="w-16 rounded border-slate-200 border px-2 py-1 text-sm font-mono"
          />
          {filters.length > 1 && (
            <button onClick={() => removeFilter(idx)} className="text-xs text-rose-600 hover:text-rose-800 px-2">✕</button>
          )}
        </div>
      ))}
      <button onClick={addFilter} className="text-xs text-brand hover:underline">+ Tambah filter (OR)</button>
    </div>
  );
}
