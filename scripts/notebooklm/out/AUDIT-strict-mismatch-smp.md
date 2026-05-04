# AUDIT: Strict Sub-Level Mismatch — SMP

Sumber: NB CP 046/H/KR/2025 Deep Research
Generated: 2026-05-03

## Summary

| Status | Count | % |
|---|---|---|
| ✓ MATCH kelas sama (valid strict) | 49 | 40.8% |
| ⚠ MATCH kelas LAIN (placement mismatch) | 45 | 37.5% |
| 🚨 NO MATCH (tidak ada di NB CP 046) | 26 | 21.7% |
| **Total Turo strict** | **120** | 100% |

## 🚨 NO MATCH — Tidak ada di NB CP 046 (26 sub)

Sub-materi Turo yang ditandai `strict: true` tapi tidak ditemukan di NB CP 046 manapun. Kandidat kuat untuk untag jadi `bridge`.

### Kelas 7

**Bab 1 — Bilangan Bulat** (1 sub):
- `SMP.7.B1.06` — Faktor, kelipatan, KPK, FPB (review & perluasan) _(label: CP-2025)_

**Bab 2 — Bilangan Rasional dan Irasional** (1 sub):
- `SMP.7.B2.02` — Desimal tak berhingga berulang _(label: CP-2025)_

**Bab 4 — Bentuk Aljabar** (2 sub):
- `SMP.7.B4.01` — Variabel, konstanta, koefisien, suku _(label: CP-2025)_
- `SMP.7.B4.02` — Suku sejenis dan tidak sejenis _(label: CP-2025)_

**Bab 5 — Persamaan dan Pertidaksamaan Linear Satu Variabel** (1 sub):
- `SMP.7.B5.01` — Kalimat terbuka vs kalimat tertutup _(label: CP-2025)_

**Bab 7 — Aritmetika Sosial** (3 sub):
- `SMP.7.B7.01` — Harga beli, harga jual, untung, rugi _(label: CP-2025)_
- `SMP.7.B7.02` — Persentase untung-rugi _(label: CP-2025)_
- `SMP.7.B7.03` — Diskon, rabat, pajak, bruto-netto-tara _(label: CP-2025)_

**Bab 8 — Garis dan Sudut** (1 sub):
- `SMP.7.B8.02` — Sudut berpelurus (180°) dan sudut bertolak belakang _(label: CP-2025)_

**Bab 9 — Segitiga dan Segi Empat** (2 sub):
- `SMP.7.B9.01` — Review jenis segitiga & jumlah sudut (dari K4) _(label: CP-2025)_
- `SMP.7.B9.02` — Sudut luar segitiga = jumlah 2 sudut dalam tidak bersebelahan _(label: CP-2025)_

### Kelas 8

**Bab 10 — Statistika dan Peluang** (3 sub):
- `SMP.8.B10.01` — Kuartil (Q1, Q2, Q3) _(label: CP-2025)_
- `SMP.8.B10.02` — Jangkauan interkuartil (IQR) _(label: CP-2025)_
- `SMP.8.B10.06` — Peluang kejadian saling lepas dan tidak _(label: CP-2025)_

**Bab 2 — Koordinat Kartesius (Perluasan)** (1 sub):
- `SMP.8.B2.01` — Review 4 kuadran (dari K6) _(label: CP-2025)_

**Bab 7 — Lingkaran (Unsur dan Hubungan Sudut)** (1 sub):
- `SMP.8.B7.03` — Sudut pusat dan sudut keliling _(label: CP-2025)_

**Bab 8 — Bangun Ruang Sisi Datar (Limas dan Prisma)** (2 sub):
- `SMP.8.B8.01` — Prisma (review & perluasan ke prisma segi-n) _(label: CP-2025)_
- `SMP.8.B8.02` — Limas — V = 1/3 × alas × tinggi _(label: CP-2025)_

### Kelas 9

**Bab 2 — Persamaan Kuadrat** (1 sub):
- `SMP.9.B2.03` — Melengkapkan kuadrat sempurna _(label: CP-2025)_

**Bab 3 — Fungsi Kuadrat dan Parabola** (2 sub):
- `SMP.9.B3.02` — Pengaruh parameter a, b, c terhadap parabola _(label: CP-2025)_
- `SMP.9.B3.03` — Titik puncak dan sumbu simetri _(label: CP-2025)_

**Bab 5 — Bangun Ruang Sisi Lengkung (BRSL)** (3 sub):
- `SMP.9.B5.01` — Tabung (review K6 + perluasan) _(label: CP-2025)_
- `SMP.9.B5.02` — Kerucut — V = (1/3)πr²t _(label: CP-2025)_
- `SMP.9.B5.05` — Bola — V = (4/3)πr³ dan Lp = 4πr² _(label: CP-2025)_

**Bab 6 — Lingkaran — Hubungan Sudut dan Garis Singgung** (2 sub):
- `SMP.9.B6.02` — Panjang garis singgung dari titik luar _(label: CP-2025)_
- `SMP.9.B6.03` — Dua garis singgung dari satu titik luar _(label: CP-2025)_

## ⚠ MATCH KELAS LAIN — Placement mismatch (45 sub)

Sub-materi Turo strict yang ada di NB CP 046, **tapi NB taruh di kelas berbeda**. Pertimbangkan: pindah kelas, atau untag jadi bridge.

### Turo Kelas 7

**Bab 10 — Penyajian dan Analisis Data**:
- `SMP.7.B10.01` Review mean, median, modus (dari K5)
  → NB taruh di **K8**: "Mean (Rata-rata)" di bab "Statistika (Ukuran Pemusatan)" (similarity 100%)
- `SMP.7.B10.04` Interpretasi kritis grafik di media
  → NB taruh di **K8**: "Median (Nilai Tengah)" di bab "Statistika (Ukuran Pemusatan)" (similarity 100%)

**Bab 5 — Persamaan dan Pertidaksamaan Linear Satu Variabel**:
- `SMP.7.B5.02` PLSV — timbangan & keseimbangan
  → NB taruh di **K8**: bab "PLSV & PtLSV (Lanjutan)" (similarity 50%)
- `SMP.7.B5.03` PLSV dengan × dan ÷
  → NB taruh di **K8**: bab "PLSV & PtLSV (Lanjutan)" (similarity 100%)
- `SMP.7.B5.04` PLSV dengan variabel di kedua sisi
  → NB taruh di **K8**: bab "PLSV & PtLSV (Lanjutan)" (similarity 50%)
- `SMP.7.B5.05` Pertidaksamaan linear (PtLSV)
  → NB taruh di **K8**: "Penyelesaian Pertidaksamaan Linear" di bab "PLSV & PtLSV (Lanjutan)" (similarity 100%)
- `SMP.7.B5.06` Soal cerita PLSV
  → NB taruh di **K8**: bab "PLSV & PtLSV (Lanjutan)" (similarity 100%)

**Bab 7 — Aritmetika Sosial**:
- `SMP.7.B7.04` Bunga tunggal
  → NB taruh di **K8**: "Hubungan Garis Sejajar & Tegak Lurus" di bab "Persamaan Garis Lurus (PGL)" (similarity 50%)

**Bab 8 — Garis dan Sudut**:
- `SMP.7.B8.03` Sudut pada dua garis sejajar + transversal
  → NB taruh di **K8**: "Hubungan Garis Sejajar & Tegak Lurus" di bab "Persamaan Garis Lurus (PGL)" (similarity 50%)

**Bab 9 — Segitiga dan Segi Empat**:
- `SMP.7.B9.03` Keliling & luas segitiga (perluasan K4)
  → NB taruh di **K9**: "Luas Permukaan (Prisma, Limas, Tabung, Kerucut, Bola)" di bab "Bangun Ruang (Sisi Datar & Lengkung)" (similarity 50%)

### Turo Kelas 8

**Bab 10 — Statistika dan Peluang**:
- `SMP.8.B10.03` Diagram box plot
  → NB taruh di **K7**: bab "Data & Diagram" (similarity 50%)
- `SMP.8.B10.04` Peluang — review & frekuensi harapan
  → NB taruh di **K9**: "Frekuensi Harapan" di bab "Peluang & Pemilihan Sampel" (similarity 100%)
- `SMP.8.B10.05` Kejadian majemuk — diagram pohon
  → NB taruh di **K7**: bab "Data & Diagram" (similarity 50%)

**Bab 2 — Koordinat Kartesius (Perluasan)**:
- `SMP.8.B2.03` Bangun datar pada bidang koordinat
  → NB taruh di **K7**: bab "Kesebangunan" (similarity 100%)

**Bab 5 — Sistem Persamaan Linear Dua Variabel (SPLDV)**:
- `SMP.8.B5.01` Konsep SPLDV — dua persamaan, dua variabel
  → NB taruh di **K9**: bab "Sistem Persamaan Linear Dua Variabel (SPLDV)" (similarity 67%)
- `SMP.8.B5.02` Metode grafik — titik potong 2 garis
  → NB taruh di **K9**: "Metode Grafik" di bab "Sistem Persamaan Linear Dua Variabel (SPLDV)" (similarity 100%)
- `SMP.8.B5.03` Metode substitusi
  → NB taruh di **K9**: "Metode Substitusi & Eliminasi" di bab "Sistem Persamaan Linear Dua Variabel (SPLDV)" (similarity 100%)
- `SMP.8.B5.04` Metode eliminasi
  → NB taruh di **K9**: "Metode Substitusi & Eliminasi" di bab "Sistem Persamaan Linear Dua Variabel (SPLDV)" (similarity 100%)
- `SMP.8.B5.05` Soal cerita SPLDV
  → NB taruh di **K9**: "Aplikasi SPLDV Kontekstual" di bab "Sistem Persamaan Linear Dua Variabel (SPLDV)" (similarity 100%)

**Bab 7 — Lingkaran (Unsur dan Hubungan Sudut)**:
- `SMP.8.B7.01` Review unsur lingkaran (titik pusat, jari-jari, diameter, busur, tali busur, juring)
  → NB taruh di **K7**: "Diagram Lingkaran" di bab "Data & Diagram" (similarity 50%)
- `SMP.8.B7.02` Keliling dan luas lingkaran (perluasan K6)
  → NB taruh di **K7**: "Diagram Lingkaran" di bab "Data & Diagram" (similarity 50%)
- `SMP.8.B7.04` Panjang busur dan luas juring
  → NB taruh di **K9**: "Luas Permukaan (Prisma, Limas, Tabung, Kerucut, Bola)" di bab "Bangun Ruang (Sisi Datar & Lengkung)" (similarity 50%)

**Bab 8 — Bangun Ruang Sisi Datar (Limas dan Prisma)**:
- `SMP.8.B8.03` Luas permukaan prisma & limas
  → NB taruh di **K9**: "Luas Permukaan (Prisma, Limas, Tabung, Kerucut, Bola)" di bab "Bangun Ruang (Sisi Datar & Lengkung)" (similarity 100%)
- `SMP.8.B8.04` Bangun gabungan (prisma + limas)
  → NB taruh di **K7**: bab "Kesebangunan" (similarity 100%)

**Bab 9 — Transformasi Geometri**:
- `SMP.8.B9.01` Translasi (pergeseran) — (x, y) → (x+a, y+b)
  → NB taruh di **K9**: "Translasi (Pergeseran)" di bab "Transformasi Geometri" (similarity 100%)
- `SMP.8.B9.02` Refleksi (pencerminan) — terhadap sumbu/garis
  → NB taruh di **K9**: "Refleksi (Pencerminan)" di bab "Transformasi Geometri" (similarity 100%)
- `SMP.8.B9.03` Rotasi — putaran 90°, 180°, 270°
  → NB taruh di **K9**: "Rotasi (Perputaran)" di bab "Transformasi Geometri" (similarity 100%)
- `SMP.8.B9.04` Dilatasi — perbesaran/pengecilan dengan faktor skala
  → NB taruh di **K9**: "Dilatasi (Perkalian)" di bab "Transformasi Geometri" (similarity 100%)

### Turo Kelas 9

**Bab 1 — Bilangan Berpangkat dan Bentuk Akar**:
- `SMP.9.B1.01` Pangkat bulat positif — review & sifat
  → NB taruh di **K8**: "Konsep Pangkat Bulat Positif/Negatif" di bab "Bilangan Berpangkat (Eksponen)" (similarity 75%)
- `SMP.9.B1.02` Pangkat nol dan pangkat negatif
  → NB taruh di **K8**: "Konsep Pangkat Bulat Positif/Negatif" di bab "Bilangan Berpangkat (Eksponen)" (similarity 100%)
- `SMP.9.B1.03` Pangkat pecahan — akar
  → NB taruh di **K8**: bab "Bilangan Berpangkat (Eksponen)" (similarity 50%)
- `SMP.9.B1.04` Operasi bentuk akar (menyederhanakan)
  → NB taruh di **K8**: bab "Bentuk Akar" (similarity 100%)
- `SMP.9.B1.05` Merasionalkan pecahan dengan akar
  → NB taruh di **K7**: bab "Rasio & Perbandingan" (similarity 50%)
- `SMP.9.B1.06` Notasi ilmiah (scientific notation)
  → NB taruh di **K8**: "Notasi Ilmiah (Bentuk Baku)" di bab "Bilangan Berpangkat (Eksponen)" (similarity 100%)

**Bab 2 — Persamaan Kuadrat**:
- `SMP.9.B2.02` Penyelesaian dengan faktorisasi
  → NB taruh di **K8**: "Penyelesaian Persamaan Linear" di bab "PLSV & PtLSV (Lanjutan)" (similarity 50%)
- `SMP.9.B2.04` Rumus abc — x = (−b ± √(b²−4ac))/2a
  → NB taruh di **K8**: "Notasi & Rumus Fungsi" di bab "Relasi & Fungsi" (similarity 100%)
- `SMP.9.B2.05` Jumlah & hasil kali akar-akar
  → NB taruh di **K8**: bab "Bentuk Akar" (similarity 50%)

**Bab 3 — Fungsi Kuadrat dan Parabola**:
- `SMP.9.B3.04` Akar-akar fungsi kuadrat = titik potong sumbu x
  → NB taruh di **K8**: "Pengertian Akar Kuadrat" di bab "Bentuk Akar" (similarity 67%)
- `SMP.9.B3.05` Nilai maksimum/minimum fungsi kuadrat
  → NB taruh di **K7**: "Perbandingan Senilai" di bab "Rasio & Perbandingan" (similarity 50%)

**Bab 4 — Kekongruenan dan Kesebangunan**:
- `SMP.9.B4.06` Teorema dasar segitiga (garis sejajar memotong proporsional)
  → NB taruh di **K8**: bab "Teorema Pythagoras" (similarity 50%)

**Bab 6 — Lingkaran — Hubungan Sudut dan Garis Singgung**:
- `SMP.9.B6.01` Garis singgung lingkaran
  → NB taruh di **K7**: "Diagram Lingkaran" di bab "Data & Diagram" (similarity 50%)
- `SMP.9.B6.04` Garis singgung persekutuan dua lingkaran
  → NB taruh di **K7**: "Diagram Lingkaran" di bab "Data & Diagram" (similarity 50%)

**Bab 7 — Analisis Data Bivariate**:
- `SMP.9.B7.01` Data bivariate — dua variabel numerik
  → NB taruh di **K7**: bab "Data & Diagram" (similarity 50%)
- `SMP.9.B7.02` Diagram pencar (scatter plot)
  → NB taruh di **K7**: bab "Data & Diagram" (similarity 50%)
- `SMP.9.B7.03` Korelasi visual — positif, negatif, tidak ada
  → NB taruh di **K8**: "Konsep Pangkat Bulat Positif/Negatif" di bab "Bilangan Berpangkat (Eksponen)" (similarity 50%)

## ✓ Sample MATCH SAME KELAS (sanity check, 10 first)

- `SMP.7.B1.01` Review bilangan bulat & garis bilangan ↔ NB K7: bab "Bilangan Bulat" (100%)
- `SMP.7.B1.02` +/− bilangan bulat — aturan tanda dari garis bilangan ↔ NB K7: bab "Bilangan Bulat" (100%)
- `SMP.7.B1.03` Perkalian bilangan bulat — pola untuk (−)×(−) ↔ NB K7: bab "Bilangan Bulat" (100%)
- `SMP.7.B1.04` Pembagian bilangan bulat ↔ NB K7: bab "Bilangan Bulat" (100%)
- `SMP.7.B1.05` Operasi campuran & urutan operasi (PEMDAS/KABATAKU) ↔ NB K7: "Operasi Hitung ( +, -, \times, : )" (50%)
- `SMP.7.B10.02` Jangkauan (range) data ↔ NB K7: "Identifikasi Bangun Datar Sebangun" (50%)
- `SMP.7.B10.03` Berbagai jenis diagram (review + stem-and-leaf) ↔ NB K7: bab "Data & Diagram" (50%)
- `SMP.7.B2.01` Bilangan rasional — semua yang bisa ditulis p/q ↔ NB K7: "Konsep Bilangan Irrasional Dasar" (100%)
- `SMP.7.B2.03` Bilangan irasional — π, √2 ↔ NB K7: bab "Bilangan Rasional & Irrasional" (100%)
- `SMP.7.B2.04` Operasi bilangan rasional — pecahan & desimal campuran ↔ NB K7: "Konsep Bilangan Irrasional Dasar" (100%)

## Cara apply

1. Pak ustadz review section 🚨 NO MATCH dulu — itu strong candidate untuk untag.
2. Section ⚠ MATCH KELAS LAIN — keputusan filosofis: ikut NB (pindah/untag) atau pertahankan (Turo lebih granular vertikal).
3. Saya jalankan apply script setelah pak ustadz tandai approve per sub.

**Threshold matching**: similarity ≥ 50% (Jaccard-like keyword overlap). Threshold lebih tinggi = lebih strict (banyak no-match), threshold lebih rendah = lebih lenient.