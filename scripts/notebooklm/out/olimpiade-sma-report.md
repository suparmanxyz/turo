# Olimpiade Matematika SMA — NotebookLM Fast Mode Result

**⚠️ INCOMPLETE: Fast mode hanya menemukan sumber URL tanpa sintesis report.**

Deep mode rate-limited setelah 3 deep research di hari yang sama (UTBK, SD, SMP). Fast mode dipakai sebagai fallback tapi **tidak generate report markdown** — hanya kumpulan URL.

## Sumber yang ditemukan (10 URL)

Lihat `olimpiade-sma-sources.json` untuk daftar lengkap.

**Highlight sumber kunci:**
- Silabus Olimpiade Matematika SMA (jawapos)
- PEDOMAN OSN SMA/MA 2024 — **resmi Pusat Prestasi Nasional Kemendikdasmen**
- Diktat Pembinaan Olimpiade Matematika Nasional (Slideshare)
- "Langkah Emas Menuju Sukses OSN Matematika"
- **Handout Evan Chen** (pelatih IMO terkenal):
  - "Introduction to Functional Equations"
  - "Orders Modulo A Prime"
- Olympiad Combinatorics Problems Solutions (Berkeley sciphilconf)
- Berita resmi: Kemendikdasmen kirim 6 siswa terbaik ke IMO 2025
- Kompilasi soal OSK/OSP matematika SMA (defantri.com)

## Untuk taxonomy authoritative SMA

**Opsi A — Tunggu deep mode quota reset** (~24 jam):
Re-run dengan `--mode deep --import-all` di hari berikutnya untuk dapat report 30+ KB seperti UTBK/SD/SMP.

**Opsi B — Manual fetch + sintesis dari Claude:**
WebFetch tiap URL kunci, gabung manual ke Claude untuk sintesis taxonomy. Tedious tapi feasible.

**Opsi C — Pakai Claude-direct sebagai primary:**
File `olimpiade-sma-taxonomy.claude-direct.json` sudah lengkap (training knowledge level olimpiade SMA cukup baik untuk topic universal). Diff terhadap Pedoman OSN SMA resmi setelah deep mode tersedia.

## Topic hints dari URL titles

Berdasar judul-judul sumber (bukan content), olimpiade SMA Indonesia mencakup minimal:
- **Pembuktian matematis** (mata kuliah Analisis Real)
- **Persamaan fungsional** (handout Evan Chen) — sering muncul di IMO
- **Order modulo prima** — teori bilangan lanjut
- **Kombinatorika olimpiade** — handout Berkeley
- **Seleksi IMO Indonesia** — 6 siswa terbaik kirim ke IMO 2025

Topic-topic ini **konsisten dengan Claude-direct** (yang memang sudah include functional eq, modular advanced, kombinatorika lanjut, dll).
