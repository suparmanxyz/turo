# 3-Way Comparison: SMP CP 046

Source: NotebookLM Deep Research vs Claude-direct vs Peta Turo (strict=true)
Generated: 2026-05-03

## Overview

| Source | Bab | Sub | Coverage |
|---|---|---|---|
| **NotebookLM Deep Research** | 17 | (semantic in markdown) | 100% (authoritative) |
| **Claude-direct** | 24 | 89 | Coverage broad, struktural |
| **Peta Turo strict=true** | 10 unik | 120 sub | granular per node |

## Per Kelas Comparison

### Kelas 7 (Fase D)

| # | NotebookLM (6) | Claude-direct (8) | Peta Turo strict (9 bab, 43 sub) |
|---|---|---|---|
| 1 | Bilangan Bulat | Bilangan Bulat dan Pecahan | Bab 1 Bilangan Bulat |
| 2 | Bilangan Rasional & Irrasional | Himpunan | Bab 10 Penyajian dan Analisis Data |
| 3 | Rasio & Perbandingan | Bentuk Aljabar | Bab 2 Bilangan Rasional dan Irasional |
| 4 | Bentuk Aljabar | Persamaan dan Pertidaksamaan Linear Satu Variabel | Bab 4 Bentuk Aljabar |
| 5 | Kesebangunan | Perbandingan | Bab 5 Persamaan dan Pertidaksamaan Linear Satu Variabel |
| 6 | Data & Diagram | Garis dan Sudut | Bab 6 Perbandingan dan Proporsi |
| 7 |  | Segitiga dan Segiempat | Bab 7 Aritmetika Sosial |
| 8 |  | Statistika & Penyajian Data | Bab 8 Garis dan Sudut |
| 9 |  |  | Bab 9 Segitiga dan Segi Empat |

**⚠ Bab Claude-direct yang BELUM match di NB**: Himpunan, Persamaan dan Pertidaksamaan Linear Satu Variabel, Garis dan Sudut, Segitiga dan Segiempat

**⚠ Bab NB yang BELUM match di Claude-direct**: Kesebangunan

### Kelas 8 (Fase D)

| # | NotebookLM (7) | Claude-direct (10) | Peta Turo strict (10 bab, 41 sub) |
|---|---|---|---|
| 1 | Bilangan Berpangkat (Eksponen) | Pola Bilangan & Barisan | Bab 1 Pola Bilangan dan Barisan |
| 2 | Bentuk Akar | Koordinat Kartesius | Bab 10 Statistika dan Peluang |
| 3 | Teorema Pythagoras | Relasi dan Fungsi | Bab 2 Koordinat Kartesius (Perluasan) |
| 4 | PLSV & PtLSV (Lanjutan) | Persamaan Garis Lurus | Bab 3 Relasi dan Fungsi |
| 5 | Relasi & Fungsi | Sistem Persamaan Linear Dua Variabel (SPLDV) | Bab 4 Persamaan Garis Lurus |
| 6 | Persamaan Garis Lurus (PGL) | Teorema Pythagoras | Bab 5 Sistem Persamaan Linear Dua Variabel (SPLDV) |
| 7 | Statistika (Ukuran Pemusatan) | Lingkaran | Bab 6 Teorema Pythagoras |
| 8 |  | Bangun Ruang Sisi Datar | Bab 7 Lingkaran (Unsur dan Hubungan Sudut) |
| 9 |  | Statistika Lanjut | Bab 8 Bangun Ruang Sisi Datar (Limas dan Prisma) |
| 10 |  | Peluang Empirik & Teoretik | Bab 9 Transformasi Geometri |

**⚠ Bab Claude-direct yang BELUM match di NB**: Koordinat Kartesius, Lingkaran, Bangun Ruang Sisi Datar, Peluang Empirik & Teoretik

**⚠ Bab NB yang BELUM match di Claude-direct**: Bentuk Akar, PLSV & PtLSV (Lanjutan)

### Kelas 9 (Fase D)

| # | NotebookLM (4) | Claude-direct (6) | Peta Turo strict (7 bab, 36 sub) |
|---|---|---|---|
| 1 | Sistem Persamaan Linear Dua Variabel (SPLDV) | Bilangan Berpangkat dan Akar | Bab 1 Bilangan Berpangkat dan Bentuk Akar |
| 2 | Bangun Ruang (Sisi Datar & Lengkung) | Persamaan Kuadrat | Bab 2 Persamaan Kuadrat |
| 3 | Transformasi Geometri | Fungsi Kuadrat | Bab 3 Fungsi Kuadrat dan Parabola |
| 4 | Peluang & Pemilihan Sampel | Kekongruenan dan Kesebangunan | Bab 4 Kekongruenan dan Kesebangunan |
| 5 |  | Bangun Ruang Sisi Lengkung | Bab 5 Bangun Ruang Sisi Lengkung (BRSL) |
| 6 |  | Transformasi Geometri | Bab 6 Lingkaran — Hubungan Sudut dan Garis Singgung |
| 7 |  |  | Bab 7 Analisis Data Bivariate |

**⚠ Bab Claude-direct yang BELUM match di NB**: Bilangan Berpangkat dan Akar, Fungsi Kuadrat, Kekongruenan dan Kesebangunan

**⚠ Bab NB yang BELUM match di Claude-direct**: Peluang & Pemilihan Sampel

## Summary & Recommendation

**Validation strategy untuk peta turo (strict=true SMP):**
1. Untuk setiap bab di NB report (authoritative CP 046), cek apakah ada sub-materi di peta turo yang cover.
2. Bab di NB yang **tidak punya match** di peta turo → potential ADD ke peta-prasyarat.json
3. Sub di peta turo dengan strict=true yang **tidak match nama bab NB** → review tagging strict (mungkin perlu di-untag)

**Bab Tagging Status:**
- 🟢 NB ∩ Claude-direct ∩ Turo = mature, sudah di-cover dengan baik
- 🟡 NB ∩ Claude-direct (tapi tidak di Turo) = ADD candidate untuk peta-prasyarat.json
- 🟠 NB tapi tidak di Claude-direct = NEW concept di CP 046/2025 yang Claude miss (typically konsep baru di kurikulum)
- 🔴 Hanya di Turo strict (tidak di NB/CD) = Review tagging strict (mungkin extras)

**Next action**: Manual review COMPARISON file ini → adjust peta-prasyarat.json strict tagging + add missing sub-materi.