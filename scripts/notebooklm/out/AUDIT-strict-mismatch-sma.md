# AUDIT: Strict Sub-Level Mismatch — SMA

Sumber: NB CP 046/H/KR/2025 Deep Research
Generated: 2026-05-03

## Summary

| Status | Count | % |
|---|---|---|
| ✓ MATCH kelas sama (valid strict) | 89 | 69.0% |
| ⚠ MATCH kelas LAIN (placement mismatch) | 23 | 17.8% |
| 🚨 NO MATCH (tidak ada di NB CP 046) | 17 | 13.2% |
| **Total Turo strict** | **129** | 100% |

## 🚨 NO MATCH — Tidak ada di NB CP 046 (17 sub)

Sub-materi Turo yang ditandai `strict: true` tapi tidak ditemukan di NB CP 046 manapun. Kandidat kuat untuk untag jadi `bridge`.

### Kelas 10

**Bab 1 — Eksponen dan Fungsi Eksponen** (1 sub):
- `SMA.10.B1.01` — Review pangkat (bulat positif, nol, negatif, pecahan) _(label: CP-2025)_

**Bab 8 — Statistika Data Kelompok** (3 sub):
- `SMA.10.B8.01` — Data kelompok — tabel frekuensi _(label: CP-2025)_
- `SMA.10.B8.04` — Kuartil data kelompok & box plot _(label: CP-2025)_
- `SMA.10.B8.05` — Varians dan standar deviasi _(label: CP-2025)_

### Kelas 11

**Bab 6 — Logika Matematika [Mat TL]** (4 sub):
- `SMA.11.B6.01` — Proposisi — pernyataan benar/salah _(label: CP-2025)_
- `SMA.11.B6.02` — Negasi, konjungsi (∧), disjungsi (∨) _(label: CP-2025)_
- `SMA.11.B6.03` — Implikasi (⇒) dan biimplikasi (⇔) _(label: CP-2025)_
- `SMA.11.B6.05` — Penarikan kesimpulan (modus ponens, tollens, silogisme) _(label: CP-2025)_

**Bab 7 — Induksi Matematika [Mat TL]** (3 sub):
- `SMA.11.B7.01` — Prinsip induksi — base case & induction step _(label: CP-2025)_
- `SMA.11.B7.03` — Pembuktian keterbagian — contoh: 2^n > n _(label: CP-2025)_
- `SMA.11.B7.04` — Keterbatasan induksi _(label: CP-2025)_

### Kelas 12

**Bab 1 — Transformasi Fungsi** (1 sub):
- `SMA.12.B1.01` — Geseran (translasi) vertikal dan horizontal _(label: CP-2025)_

**Bab 5 — Aplikasi Integral [Mat TL]** (4 sub):
- `SMA.12.B5.01` — Luas daerah di bawah kurva _(label: CP-2025)_
- `SMA.12.B5.02` — Luas antara dua kurva _(label: CP-2025)_
- `SMA.12.B5.03` — Volume benda putar — metode cakram _(label: CP-2025)_
- `SMA.12.B5.04` — Volume benda putar — metode kulit silinder _(label: CP-2025)_

**Bab 9 — Peluang Bersyarat dan Distribusi** (1 sub):
- `SMA.12.B9.06` — Skor-Z dan standarisasi _(label: CP-2025)_

## ⚠ MATCH KELAS LAIN — Placement mismatch (23 sub)

Sub-materi Turo strict yang ada di NB CP 046, **tapi NB taruh di kelas berbeda**. Pertimbangkan: pindah kelas, atau untag jadi bridge.

### Turo Kelas 10

**Bab 4 — Barisan dan Deret Lanjutan**:
- `SMA.10.B4.06` Anuitas sederhana
  → NB taruh di **K12**: "Anuitas (Tetap & Menurun)" di bab "Matematika Keuangan" (similarity 100%)

**Bab 9 — Peluang Lanjutan**:
- `SMA.10.B9.04` Frekuensi harapan
  → NB taruh di **K12**: "Nilai Harapan (Ekspektasi)" di bab "Analisis Data dan Peluang Lanjut" (similarity 50%)
- `SMA.10.B9.05` Nilai harapan (ekspektasi)
  → NB taruh di **K12**: "Nilai Harapan (Ekspektasi)" di bab "Analisis Data dan Peluang Lanjut" (similarity 100%)

### Turo Kelas 11

**Bab 10 — Turunan Fungsi Aljabar [Mat TL]**:
- `SMA.11.B10.01` Laju perubahan rata-rata
  → NB taruh di **K12**: "Aplikasi Limit dalam Kecepatan dan Laju Perubahan" di bab "Limit Fungsi" (similarity 67%)
- `SMA.11.B10.02` Turunan sebagai limit — f'(x) = lim (f(x+h)−f(x))/h
  → NB taruh di **K12**: bab "Limit Fungsi" (similarity 50%)
- `SMA.11.B10.03` Aturan turunan pangkat
  → NB taruh di **K10**: "Aturan Penjumlahan" di bab "Peluang" (similarity 50%)
- `SMA.11.B10.04` Aturan penjumlahan, perkalian konstanta
  → NB taruh di **K10**: "Aturan Penjumlahan" di bab "Peluang" (similarity 100%)
- `SMA.11.B10.06` Aturan rantai (chain rule)
  → NB taruh di **K10**: "Aturan Penjumlahan" di bab "Peluang" (similarity 50%)

**Bab 3 — Program Linear**:
- `SMA.11.B3.03` Metode titik pojok (corner point)
  → NB taruh di **K12**: "Titik Ekstrem (Maks/Min)" di bab "Turunan Fungsi (Diferensial)" (similarity 50%)
- `SMA.11.B3.04` Aplikasi — produksi, transportasi, diet
  → NB taruh di **K10**: "Tan \theta dan Aplikasinya" di bab "Trigonometri" (similarity 50%)

**Bab 4 — Trigonometri Lanjutan**:
- `SMA.11.B4.01` Aturan sinus — a/sin A = b/sin B = c/sin C
  → NB taruh di **K10**: "Aturan Penjumlahan" di bab "Peluang" (similarity 50%)
- `SMA.11.B4.02` Aturan cosinus — c² = a² + b² − 2ab cos C
  → NB taruh di **K10**: "Aturan Penjumlahan" di bab "Peluang" (similarity 50%)

**Bab 5 — Lingkaran Analitik**:
- `SMA.11.B5.03` Bentuk umum dan konversi
  → NB taruh di **K10**: "Bentuk Akar" di bab "Eksponen dan Logaritma" (similarity 50%)

**Bab 9 — Limit Fungsi Aljabar [Mat TL]**:
- `SMA.11.B9.01` Konsep limit — mendekati tapi tidak harus sampai
  → NB taruh di **K12**: bab "Limit Fungsi" (similarity 50%)
- `SMA.11.B9.02` Sifat dasar limit
  → NB taruh di **K12**: "Sifat-sifat Limit" di bab "Limit Fungsi" (similarity 100%)
- `SMA.11.B9.03` Limit bentuk tak tentu 0/0
  → NB taruh di **K10**: "Bentuk Akar" di bab "Eksponen dan Logaritma" (similarity 50%)
- `SMA.11.B9.04` Limit di tak hingga
  → NB taruh di **K10**: "Deret Geometri Tak Hingga" di bab "Barisan dan Deret" (similarity 50%)

### Turo Kelas 12

**Bab 1 — Transformasi Fungsi**:
- `SMA.12.B1.02` Refleksi — terhadap sumbu x dan y
  → NB taruh di **K11**: "Refleksi" di bab "Transformasi Geometri" (similarity 100%)
- `SMA.12.B1.03` Dilatasi — perbesaran/pengecilan vertikal & horizontal
  → NB taruh di **K11**: "Dilatasi" di bab "Transformasi Geometri" (similarity 100%)
- `SMA.12.B1.04` Komposisi transformasi
  → NB taruh di **K11**: "Komposisi Transformasi menggunakan Operasi Matriks" di bab "Transformasi Geometri" (similarity 100%)

**Bab 6 — Dimensi Tiga**:
- `SMA.12.B6.05` Sudut antara dua garis, garis-bidang, bidang-bidang
  → NB taruh di **K10**: "Sudut Istimewa" di bab "Trigonometri" (similarity 50%)

**Bab 8 — Kombinatorika**:
- `SMA.12.B8.01` Prinsip perkalian dan penjumlahan
  → NB taruh di **K10**: "Operasi Penjumlahan" di bab "Vektor dan Operasinya" (similarity 50%)
- `SMA.12.B8.02` Faktorial n!
  → NB taruh di **K11**: "Teorema Faktor" di bab "Polinomial (Suku Banyak)" (similarity 100%)

## ✓ Sample MATCH SAME KELAS (sanity check, 10 first)

- `SMA.10.B1.02` Persamaan eksponen — basis sama ↔ NB K10: bab "Eksponen dan Logaritma" (50%)
- `SMA.10.B1.03` Persamaan eksponen — faktorisasi ↔ NB K10: bab "Eksponen dan Logaritma" (50%)
- `SMA.10.B1.04` Fungsi eksponen f(x) = a^x — grafik ↔ NB K10: "Fungsi Eksponen (Pertumbuhan & Peluruhan)" (100%)
- `SMA.10.B1.05` Pertidaksamaan eksponen ↔ NB K10: bab "Eksponen dan Logaritma" (50%)
- `SMA.10.B1.06` Aplikasi — pertumbuhan bunga majemuk ↔ NB K10: "Aplikasi Bunga Tunggal dan Majemuk Dasar" (75%)
- `SMA.10.B4.01` Review barisan & deret aritmetika-geometri (dari K8) ↔ NB K10: bab "Barisan dan Deret" (100%)
- `SMA.10.B4.02` Notasi sigma (Σ) ↔ NB K10: "Notasi dan Terminologi Vektor" (50%)
- `SMA.10.B4.03` Deret geometri tak hingga konvergen ↔ NB K10: "Deret Geometri Tak Hingga" (100%)
- `SMA.10.B4.05` Bunga majemuk (perluasan K7) ↔ NB K10: "Aplikasi Bunga Tunggal dan Majemuk Dasar" (100%)
- `SMA.10.B5.01` Pengertian vektor — besar dan arah ↔ NB K10: "Vektor di R^2 dan R^3" (100%)

## Cara apply

1. Pak ustadz review section 🚨 NO MATCH dulu — itu strong candidate untuk untag.
2. Section ⚠ MATCH KELAS LAIN — keputusan filosofis: ikut NB (pindah/untag) atau pertahankan (Turo lebih granular vertikal).
3. Saya jalankan apply script setelah pak ustadz tandai approve per sub.

**Threshold matching**: similarity ≥ 50% (Jaccard-like keyword overlap). Threshold lebih tinggi = lebih strict (banyak no-match), threshold lebih rendah = lebih lenient.