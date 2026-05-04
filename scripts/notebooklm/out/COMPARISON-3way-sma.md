# 3-Way Comparison: SMA CP 046

Source: NotebookLM Deep Research vs Claude-direct vs Peta Turo (strict=true)
NB extraction: `structured-json`
Generated: 2026-05-03

## Overview

| Source | Bab | Sub | Coverage |
|---|---|---|---|
| **NotebookLM Deep Research** | 24 | (semantic in markdown) | 100% (authoritative) |
| **Claude-direct** | 21 | 84 | Coverage broad, struktural |
| **Peta Turo strict=true** | 11 unik | 129 sub | granular per node |

## Per Kelas Comparison

### Kelas 10 (Fase E)

| # | NotebookLM (8) | Claude-direct (8) | Peta Turo strict (7 bab, 39 sub) |
|---|---|---|---|
| 1 | Eksponen dan Logaritma [Wajib (Umum)] | Eksponen dan Logaritma | Bab 1 Eksponen dan Fungsi Eksponen |
| 2 | Barisan dan Deret [Wajib (Umum)] | Sistem Persamaan Linear Tiga Variabel (SPLTV) | Bab 4 Barisan dan Deret Lanjutan |
| 3 | Vektor dan Operasinya [Wajib (Umum)] | Pertidaksamaan Linear & Nilai Mutlak | Bab 5 Vektor |
| 4 | Trigonometri [Wajib (Umum)] | Fungsi Kuadrat & Komposisi Fungsi | Bab 6 Fungsi Kuadrat (Lanjutan) |
| 5 | Sistem Persamaan dan Pertidaksamaan Linear [Wajib (Umum)] | Trigonometri Dasar | Bab 7 Trigonometri Dasar |
| 6 | Fungsi Kuadrat [Wajib (Umum)] | Vektor di Bidang | Bab 8 Statistika Data Kelompok |
| 7 | Statistika [Wajib (Umum)] | Statistika Lanjut | Bab 9 Peluang Lanjutan |
| 8 | Peluang [Wajib (Umum)] | Peluang & Kombinatorik |  |

**⚠ Bab NB yang BELUM match di Claude-direct**: Barisan dan Deret [Wajib (Umum)]

### Kelas 11 (Fase F)

| # | NotebookLM (8) | Claude-direct (7) | Peta Turo strict (11 bab, 54 sub) |
|---|---|---|---|
| 1 | Komposisi Fungsi dan Fungsi Invers [Wajib] | Polinomial | Bab 1 Fungsi Komposisi dan Invers |
| 2 | Lingkaran [Wajib] | Trigonometri Lanjut | Bab 10 Turunan Fungsi Aljabar [Mat TL] |
| 3 | Statistika dan Regresi Linear [Wajib] | Lingkaran (Geometri Analitik) | Bab 11 Regresi Linear dan Korelasi [Mat TL] |
| 4 | Bilangan Kompleks [Lanjut] | Limit Fungsi | Bab 2 Matriks |
| 5 | Polinomial (Suku Banyak) [Lanjut] | Turunan (Diferensial) | Bab 3 Program Linear |
| 6 | Matriks [Lanjut] | Logika Matematika | Bab 4 Trigonometri Lanjutan |
| 7 | Transformasi Geometri [Lanjut] | Geometri Ruang (Dimensi 3) | Bab 5 Lingkaran Analitik |
| 8 | Fungsi dan Pemodelan [Lanjut] |  | Bab 6 Logika Matematika [Mat TL] |
| 9 |  |  | Bab 7 Induksi Matematika [Mat TL] |
| 10 |  |  | Bab 8 Polinomial dan Bilangan Kompleks [Mat TL] |
| 11 |  |  | Bab 9 Limit Fungsi Aljabar [Mat TL] |

**⚠ Bab Claude-direct yang BELUM match di NB**: Turunan (Diferensial), Logika Matematika

**⚠ Bab NB yang BELUM match di Claude-direct**: Statistika dan Regresi Linear [Wajib], Bilangan Kompleks [Lanjut], Matriks [Lanjut]

### Kelas 12 (Fase F)

| # | NotebookLM (8) | Claude-direct (6) | Peta Turo strict (9 bab, 36 sub) |
|---|---|---|---|
| 1 | Matematika Keuangan [Wajib] | Integral | Bab 1 Transformasi Fungsi |
| 2 | Geometri Lingkaran (Lanjutan) [Wajib] | Matriks | Bab 2 Aplikasi Turunan [Mat TL] |
| 3 | Kombinatorik dan Peluang [Wajib] | Vektor di Ruang (R³) | Bab 3 Integral Tak Tentu dan Tentu [Mat TL] |
| 4 | Geometri Analitik (Irisan Kerucut) [Lanjut] | Transformasi Geometri Lanjut | Bab 4 Teknik Integrasi [Mat TL] |
| 5 | Limit Fungsi [Lanjut] | Statistika Inferensial | Bab 5 Aplikasi Integral [Mat TL] |
| 6 | Turunan Fungsi (Diferensial) [Lanjut] | Limit Fungsi Trigonometri & L'Hopital | Bab 6 Dimensi Tiga |
| 7 | Integral Fungsi [Lanjut] |  | Bab 7 Irisan Kerucut [Mat TL] |
| 8 | Analisis Data dan Peluang Lanjut [Lanjut] |  | Bab 8 Kombinatorika |
| 9 |  |  | Bab 9 Peluang Bersyarat dan Distribusi |

**⚠ Bab Claude-direct yang BELUM match di NB**: Matriks, Vektor di Ruang (R³), Statistika Inferensial

**⚠ Bab NB yang BELUM match di Claude-direct**: Matematika Keuangan [Wajib], Kombinatorik dan Peluang [Wajib]

## Summary & Recommendation

**Validation strategy untuk peta turo (strict=true SMA):**
1. Untuk setiap bab di NB report (authoritative CP 046), cek apakah ada sub-materi di peta turo yang cover.
2. Bab di NB yang **tidak punya match** di peta turo → potential ADD ke peta-prasyarat.json
3. Sub di peta turo dengan strict=true yang **tidak match nama bab NB** → review tagging strict (mungkin perlu di-untag)

**Bab Tagging Status:**
- 🟢 NB ∩ Claude-direct ∩ Turo = mature, sudah di-cover dengan baik
- 🟡 NB ∩ Claude-direct (tapi tidak di Turo) = ADD candidate untuk peta-prasyarat.json
- 🟠 NB tapi tidak di Claude-direct = NEW concept di CP 046/2025 yang Claude miss (typically konsep baru di kurikulum)
- 🔴 Hanya di Turo strict (tidak di NB/CD) = Review tagging strict (mungkin extras)

**Next action**: Manual review COMPARISON file ini → adjust peta-prasyarat.json strict tagging + add missing sub-materi.