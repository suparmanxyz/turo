# turo

Platform belajar matematika adaptif — dari SD, SMP, SMA, persiapan SNBT, sampai olimpiade.
Menggunakan peta prasyarat otomatis + bantuan visual AI.

## Stack
- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Firebase** (Firestore, Auth) — auth & progress user
- **Claude API** via `@anthropic-ai/sdk` — dipanggil server-side di route `/api/*`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy env:
   ```bash
   cp .env.local.example .env.local
   ```
   Isi `ANTHROPIC_API_KEY` + kredensial Firebase project `turo-math`.

3. Jalankan dev server:
   ```bash
   npm run dev
   ```
   Buka http://localhost:3000

## Struktur

```
src/
  app/
    page.tsx                       Landing + pilih kategori → pilih materi
    materi/[slug]/page.tsx         Daftar sub-materi
    materi/[slug]/[sub]/page.tsx   Materi + contoh soal + tombol visual
    latihan/[slug]/[sub]/page.tsx  Latihan adaptif (turun/naik)
    api/                           Route Claude (peta-prasyarat, generate-soal, dsb.)
  components/
  contexts/AuthContext.tsx         Firebase Auth wrapper
  data/materi.ts                   Daftar materi per kategori
  lib/{claude,firebase,firebase-admin}.ts
  types/index.ts
```

## Kategori yang didukung
- `sd` — SD
- `smp` — SMP
- `sma` — SMA
- `snbt` — Persiapan SNBT
- `olimpiade` — Matematika olimpiade
