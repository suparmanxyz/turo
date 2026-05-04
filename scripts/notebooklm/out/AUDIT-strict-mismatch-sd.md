# AUDIT: Strict Sub-Level Mismatch — SD

Sumber: NB CP 046/H/KR/2025 Deep Research
Generated: 2026-05-03

## Summary

| Status | Count | % |
|---|---|---|
| ✓ MATCH kelas sama (valid strict) | 122 | 64.6% |
| ⚠ MATCH kelas LAIN (placement mismatch) | 56 | 29.6% |
| 🚨 NO MATCH (tidak ada di NB CP 046) | 11 | 5.8% |
| **Total Turo strict** | **189** | 100% |

## 🚨 NO MATCH — Tidak ada di NB CP 046 (11 sub)

Sub-materi Turo yang ditandai `strict: true` tapi tidak ditemukan di NB CP 046 manapun. Kandidat kuat untuk untag jadi `bridge`.

### Kelas 1

**Bab 2 — Penjumlahan Bilangan Cacah** (1 sub):
- `SD.1.B2.03` — Doubles (penjumlahan sama) 1+1, 2+2, ..., 5+5 _(label: CP-2025)_

### Kelas 2

**Bab 2 — Penjumlahan dan Pengurangan Bersusun** (1 sub):
- `SD.2.B2.05` — Soal cerita +/- dengan konteks nyata _(label: CP-2025)_

**Bab 7 — Waktu — Jam, Hari, Kalender** (1 sub):
- `SD.2.B7.03` — Hari, minggu, bulan, tahun _(label: CP-2025)_

### Kelas 3

**Bab 5 — Mata Uang Rupiah** (1 sub):
- `SD.3.B5.02` — Kesetaraan nominal _(label: CP-2025)_

### Kelas 4

**Bab 2 — KPK dan FPB** (2 sub):
- `SD.4.B2.01` — FPB (Faktor Persekutuan Terbesar) _(label: CP-2025)_
- `SD.4.B2.02` — KPK (Kelipatan Persekutuan Terkecil) _(label: CP-2025)_

### Kelas 5

**Bab 5 — Volume Kubus dan Balok** (1 sub):
- `SD.5.B5.02` — Rumus volume balok V = p × l × t _(label: CP-2025)_

**Bab 6 — Mean, Median, Modus** (2 sub):
- `SD.5.B6.03` — Modus — yang paling sering muncul _(label: CP-2025)_
- `SD.5.B6.04` — Kapan pakai mean vs median? _(label: CP-2025)_

### Kelas 6

**Bab 5 — Koordinat Kartesius** (1 sub):
- `SD.6.B5.01` — Bidang koordinat — sumbu x dan y _(label: CP-2025)_

**Bab 6 — Pola Bilangan & Generalisasi** (1 sub):
- `SD.6.B6.02` — Suku ke-n dari barisan aritmetika _(label: CP-2025)_

## ⚠ MATCH KELAS LAIN — Placement mismatch (56 sub)

Sub-materi Turo strict yang ada di NB CP 046, **tapi NB taruh di kelas berbeda**. Pertimbangkan: pindah kelas, atau untag jadi bridge.

### Turo Kelas 1

**Bab 2 — Penjumlahan Bilangan Cacah**:
- `SD.1.B2.04` Strategi 'teman sepuluh' (make 10)
  → NB taruh di **K4**: "Desimal persepuluhan" di bab "Pecahan, Desimal, dan Persen" (similarity 50%)

**Bab 6 — Penjumlahan & Pengurangan sampai 20**:
- `SD.1.B6.04` Soal cerita campuran +/− s.d. 20
  → NB taruh di **K4**: "Operasi campuran" di bab "Bilangan Cacah sampai dengan 10.000" (similarity 100%)

**Bab 7 — Pengukuran Panjang & Berat dengan Satuan Tidak Baku**:
- `SD.1.B7.04` Membandingkan durasi waktu
  → NB taruh di **K2**: "Membaca jam analog & durasi waktu" di bab "Pengukuran Baku: Panjang, Berat, dan Waktu" (similarity 67%)

**Bab 8 — Data dan Piktogram**:
- `SD.1.B8.02` Turus (tally marks) — menghitung sambil mencatat
  → NB taruh di **K6**: "Menghitung debit air" di bab "Pengukuran: Kecepatan dan Debit (NEW di CP 046)" (similarity 50%)

### Turo Kelas 2

**Bab 1 — Bilangan Cacah sampai 1.000**:
- `SD.2.B1.01` Subitasi puluhan & ratusan — '10 sepuluhan = 100'
  → NB taruh di **K4**: "Desimal persepuluhan" di bab "Pecahan, Desimal, dan Persen" (similarity 100%)

**Bab 2 — Penjumlahan dan Pengurangan Bersusun**:
- `SD.2.B2.01` Strategi mental +/- dengan dekomposisi
  → NB taruh di **K1**: "Posisi benda (atas-bawah, depan-belakang, kanan-kiri)" di bab "Mengenal Bentuk Geometri dan Posisi" (similarity 50%)

**Bab 3 — Perkalian Dasar**:
- `SD.2.B3.01` Perkalian sebagai array (baris × kolom)
  → NB taruh di **K3**: bab "Perkalian dan Pembagian Dasar" (similarity 50%)
- `SD.2.B3.02` Perkalian sebagai penjumlahan berulang
  → NB taruh di **K1**: "Konsep penjumlahan sebagai penggabungan" di bab "Penjumlahan dan Pengurangan Dasar" (similarity 67%)
- `SD.2.B3.03` Sifat komutatif perkalian
  → NB taruh di **K5**: "Sifat komutatif, asosiatif, distributif" di bab "Bilangan Cacah sampai dengan 100.000" (similarity 67%)
- `SD.2.B3.04` Tabel perkalian 1-5 dengan pola
  → NB taruh di **K3**: "Tabel perkalian 1-10" di bab "Perkalian dan Pembagian Dasar" (similarity 100%)
- `SD.2.B3.05` Tabel perkalian 6-9 — strategi
  → NB taruh di **K3**: "Tabel perkalian 1-10" di bab "Perkalian dan Pembagian Dasar" (similarity 100%)

**Bab 4 — Pembagian Dasar**:
- `SD.2.B4.01` Pembagian sebagai berbagi adil (partition)
  → NB taruh di **K3**: bab "Perkalian dan Pembagian Dasar" (similarity 50%)
- `SD.2.B4.02` Pembagian sebagai pengukuran (quotition)
  → NB taruh di **K3**: "Pembagian sebagai pengurangan berulang" di bab "Perkalian dan Pembagian Dasar" (similarity 67%)
- `SD.2.B4.03` Hubungan perkalian & pembagian (fact family)
  → NB taruh di **K3**: bab "Perkalian dan Pembagian Dasar" (similarity 100%)

**Bab 6 — Pengukuran dengan Satuan Baku**:
- `SD.2.B6.02` Hubungan cm dan m (100 cm = 1 m)
  → NB taruh di **K1**: "Hubungan antara penjumlahan dan pengurangan" di bab "Penjumlahan dan Pengurangan Dasar" (similarity 100%)
- `SD.2.B6.03` Timbangan dan gram
  → NB taruh di **K1**: "Membaca piktogram dan turus sederhana" di bab "Analisis Data Sederhana" (similarity 50%)
- `SD.2.B6.04` Hubungan g dan kg (1000 g = 1 kg)
  → NB taruh di **K1**: "Hubungan antara penjumlahan dan pengurangan" di bab "Penjumlahan dan Pengurangan Dasar" (similarity 100%)

**Bab 8 — Bangun Datar dan Ruang — Sifat**:
- `SD.2.B8.02` Simetri lipat
  → NB taruh di **K6**: "Simetri lipat & putar" di bab "Simetri dan Mozaik (Pengayaan)" (similarity 100%)
- `SD.2.B8.04` Sifat bangun ruang — muka dan rusuk
  → NB taruh di **K1**: "Bangun ruang sederhana (kubus, balok, bola, kerucut)" di bab "Mengenal Bentuk Geometri dan Posisi" (similarity 100%)

**Bab 9 — Data dan Diagram Batang**:
- `SD.2.B9.01` Tabel data dari survei sederhana
  → NB taruh di **K5**: "Konsep kepadatan" di bab "Pengukuran per Unit Kuantitas (NEW di CP 046)" (similarity 100%)
- `SD.2.B9.02` Diagram batang — 1 kotak = 1 benda
  → NB taruh di **K4**: bab "Piktogram dan Diagram Batang" (similarity 67%)
- `SD.2.B9.03` Membaca & menginterpretasi diagram batang
  → NB taruh di **K4**: bab "Piktogram dan Diagram Batang" (similarity 67%)

### Turo Kelas 3

**Bab 1 — Bilangan Cacah sampai 10.000**:
- `SD.3.B1.04` Membandingkan dan mengurutkan bilangan 4-digit
  → NB taruh di **K2**: "Membandingkan & mengurutkan bilangan" di bab "Bilangan Cacah sampai dengan 1.000" (similarity 100%)

**Bab 2 — Operasi Hitung Campuran**:
- `SD.3.B2.01` +/− bersusun bilangan 3-4 digit
  → NB taruh di **K5**: "KPK & FPB dari 3 bilangan" di bab "KPK dan FPB Lanjutan" (similarity 100%)
- `SD.3.B2.05` Operasi campuran dengan urutan
  → NB taruh di **K4**: "Operasi campuran" di bab "Bilangan Cacah sampai dengan 10.000" (similarity 100%)

**Bab 3 — Pecahan Biasa dan Pecahan Senilai**:
- `SD.3.B3.01` Pecahan biasa — 2/3, 3/4, 5/8
  → NB taruh di **K2**: bab "Pecahan Sederhana" (similarity 100%)
- `SD.3.B3.02` Pecahan campuran (mixed number)
  → NB taruh di **K2**: bab "Pecahan Sederhana" (similarity 100%)
- `SD.3.B3.04` Membandingkan pecahan dengan penyebut sama
  → NB taruh di **K2**: bab "Pecahan Sederhana" (similarity 100%)

**Bab 4 — Pengenalan Desimal Sederhana**:
- `SD.3.B4.01` Persepuluhan sebagai pecahan 1/10
  → NB taruh di **K2**: bab "Pecahan Sederhana" (similarity 100%)
- `SD.3.B4.02` Notasi desimal 0,1 — 0,9
  → NB taruh di **K4**: bab "Pecahan, Desimal, dan Persen" (similarity 50%)
- `SD.3.B4.03` Membandingkan desimal 1-angka
  → NB taruh di **K4**: "Desimal persepuluhan" di bab "Pecahan, Desimal, dan Persen" (similarity 50%)

**Bab 5 — Mata Uang Rupiah**:
- `SD.3.B5.01` Mengenal nominal uang (Rp500, Rp1.000, Rp5.000, Rp10.000)
  → NB taruh di **K1**: "Bangun ruang sederhana (kubus, balok, bola, kerucut)" di bab "Mengenal Bentuk Geometri dan Posisi" (similarity 50%)
- `SD.3.B5.03` Belanja dan menghitung total
  → NB taruh di **K6**: "Menghitung debit air" di bab "Pengukuran: Kecepatan dan Debit (NEW di CP 046)" (similarity 50%)
- `SD.3.B5.04` Kembalian dari transaksi
  → NB taruh di **K6**: "Masalah uang & transaksi" di bab "Bilangan Cacah sampai dengan 1.000.000" (similarity 50%)

**Bab 6 — Konversi Satuan Panjang, Berat, dan Waktu**:
- `SD.3.B6.04` Konversi waktu (jam-menit-detik)
  → NB taruh di **K2**: bab "Pengukuran Baku: Panjang, Berat, dan Waktu" (similarity 50%)

**Bab 7 — Kalimat Matematika dengan Kotak Kosong**:
- `SD.3.B7.03` Pola bilangan tingkat lanjut
  → NB taruh di **K5**: "KPK & FPB dari 3 bilangan" di bab "KPK dan FPB Lanjutan" (similarity 100%)

### Turo Kelas 4

**Bab 2 — KPK dan FPB**:
- `SD.4.B2.04` Aplikasi KPK & FPB (jadwal, pembagian)
  → NB taruh di **K5**: "Aplikasi masalah jadwal & pembagian paket" di bab "KPK dan FPB Lanjutan" (similarity 100%)

**Bab 3 — Operasi Pecahan**:
- `SD.4.B3.05` Aturan 'balik & kalikan' (dari mana asalnya)
  → NB taruh di **K6**: "Bilangan kebalikan" di bab "Perkalian dan Pembagian Pecahan" (similarity 50%)

**Bab 6 — Sudut — Pengenalan dan Pengukuran**:
- `SD.4.B6.01` Sudut sebagai rotasi (bukan dua garis)
  → NB taruh di **K3**: "Jenis sudut (lancip, siku-siku, tumpul)" di bab "Geometri: Bangun Datar dan Sudut" (similarity 50%)

### Turo Kelas 5

**Bab 1 — Bilangan Cacah Besar & Operasi**:
- `SD.5.B1.04` Perkalian 3-digit × 2-digit
  → NB taruh di **K3**: bab "Perkalian dan Pembagian Dasar" (similarity 50%)

**Bab 4 — Keliling dan Luas Bangun Datar Lanjutan**:
- `SD.5.B4.03` Hubungan keliling & luas
  → NB taruh di **K4**: "Hubungan keliling & luas" di bab "Pengukuran Luas dan Volume" (similarity 100%)

**Bab 5 — Volume Kubus dan Balok**:
- `SD.5.B5.01` Volume kubus satuan (counting)
  → NB taruh di **K4**: "Volume satuan baku (l, ml)" di bab "Pengukuran Luas dan Volume" (similarity 67%)
- `SD.5.B5.03` Volume kubus V = s³
  → NB taruh di **K4**: bab "Pengukuran Luas dan Volume" (similarity 50%)
- `SD.5.B5.05` Jaring-jaring kubus dan balok
  → NB taruh di **K6**: bab "Bangun Ruang: Kubus, Balok, dan Tabung" (similarity 67%)
- `SD.5.B5.06` Luas permukaan kubus dan balok
  → NB taruh di **K4**: "Konsep luas daerah" di bab "Pengukuran Luas dan Volume" (similarity 50%)

**Bab 6 — Mean, Median, Modus**:
- `SD.5.B6.02` Median — nilai tengah
  → NB taruh di **K2**: "Konsep setengah (½)" di bab "Pecahan Sederhana" (similarity 100%)

**Bab 7 — Pengukuran Sudut pada Bangun**:
- `SD.5.B7.03` Mencari sudut tidak diketahui
  → NB taruh di **K3**: "Mencari nilai tidak diketahui dalam operasi" di bab "Kalimat Matematika" (similarity 75%)

**Bab 8 — Diagram Lingkaran**:
- `SD.5.B8.01` Membaca diagram lingkaran
  → NB taruh di **K6**: "Diagram lingkaran" di bab "Statistika dan Peluang" (similarity 100%)
- `SD.5.B8.02` Membuat diagram lingkaran dengan busur derajat
  → NB taruh di **K6**: "Diagram lingkaran" di bab "Statistika dan Peluang" (similarity 100%)

**Bab 9 — Kecepatan dan Debit**:
- `SD.5.B9.01` Kecepatan sebagai rasio jarak/waktu
  → NB taruh di **K6**: "Konsep rasio sederhana" di bab "Rasio dan Proporsi (NEW di CP 046 K6)" (similarity 100%)
- `SD.5.B9.02` Mencari jarak dan waktu
  → NB taruh di **K6**: "Hubungan jarak, waktu, kecepatan" di bab "Pengukuran: Kecepatan dan Debit (NEW di CP 046)" (similarity 67%)
- `SD.5.B9.03` Debit sebagai rasio volume/waktu
  → NB taruh di **K6**: "Konsep rasio sederhana" di bab "Rasio dan Proporsi (NEW di CP 046 K6)" (similarity 100%)

### Turo Kelas 6

**Bab 3 — Lingkaran — π, Keliling, Luas**:
- `SD.6.B3.02` Menemukan π — eksperimen pengukuran
  → NB taruh di **K1**: bab "Pengukuran dan Pola Sederhana" (similarity 50%)

**Bab 4 — Prisma dan Tabung**:
- `SD.6.B4.01` Volume prisma — V = Luas alas × tinggi
  → NB taruh di **K4**: bab "Pengukuran Luas dan Volume" (similarity 67%)
- `SD.6.B4.03` Luas permukaan prisma
  → NB taruh di **K4**: "Konsep luas daerah" di bab "Pengukuran Luas dan Volume" (similarity 50%)
- `SD.6.B4.04` Luas permukaan tabung
  → NB taruh di **K4**: "Konsep luas daerah" di bab "Pengukuran Luas dan Volume" (similarity 50%)

## ✓ Sample MATCH SAME KELAS (sanity check, 10 first)

- `SD.1.B1.01` Subitasi — mengenali jumlah 1-5 sekilas tanpa menghitung ↔ NB K1: bab "Penjumlahan dan Pengurangan Dasar" (50%)
- `SD.1.B1.02` Membilang dengan korespondensi 1-1 ↔ NB K1: "Membilang benda konkret" (50%)
- `SD.1.B1.03` Membaca dan menulis lambang 1-10 ↔ NB K1: "Membaca dan menulis lambang bilangan" (100%)
- `SD.1.B1.04` Membandingkan jumlah: lebih banyak, lebih sedikit, sama banyak ↔ NB K1: "Membandingkan jumlah benda (lebih banyak/sedikit/sama)" (67%)
- `SD.1.B1.05` Mengurutkan bilangan 1-10 di garis bilangan ↔ NB K1: "Pasangan bilangan (number bonds)" (50%)
- `SD.1.B1.06` Pasangan bilangan (number bond) — dekomposisi 1-10 ↔ NB K1: "Pasangan bilangan (number bonds)" (100%)
- `SD.1.B2.01` Makna penjumlahan — menggabungkan 2 kelompok ↔ NB K1: bab "Penjumlahan dan Pengurangan Dasar" (50%)
- `SD.1.B2.02` Penjumlahan s.d. 10 dengan ten-frame (bingkai 10) ↔ NB K1: "Membandingkan jumlah benda (lebih banyak/sedikit/sama)" (50%)
- `SD.1.B2.05` Soal cerita penjumlahan ↔ NB K1: "Membandingkan jumlah benda (lebih banyak/sedikit/sama)" (100%)
- `SD.1.B3.01` Makna pengurangan — dua cara: mengambil & selisih ↔ NB K1: bab "Penjumlahan dan Pengurangan Dasar" (50%)

## Cara apply

1. Pak ustadz review section 🚨 NO MATCH dulu — itu strong candidate untuk untag.
2. Section ⚠ MATCH KELAS LAIN — keputusan filosofis: ikut NB (pindah/untag) atau pertahankan (Turo lebih granular vertikal).
3. Saya jalankan apply script setelah pak ustadz tandai approve per sub.

**Threshold matching**: similarity ≥ 50% (Jaccard-like keyword overlap). Threshold lebih tinggi = lebih strict (banyak no-match), threshold lebih rendah = lebih lenient.