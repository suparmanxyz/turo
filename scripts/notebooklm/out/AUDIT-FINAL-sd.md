# AUDIT FINAL: Turo Strict vs CP 046 ASLI — SD

Sumber referensi: `docs/cp046.txt` (BSKAP No. 046/H/KR/2025) — source primer autoritatif.
Method: Claude Sonnet 4.6 + prompt caching (CP 046 raw text di system prompt).
Generated: 2026-05-03

## Summary

| Status | Count | % |
|---|---|---|
| ✓ MATCH Fase SAMA (valid strict) | 120 | 63.5% |
| ⚠ MATCH Fase LAIN (placement mismatch) | 53 | 28.0% |
| 🚨 NO MATCH (tidak di CP 046) | 14 | 7.4% |
| ✗ ERROR | 2 | 1.1% |
| **Total Turo strict** | **189** | 100% |

## 🚨 NO MATCH — Tidak di CP 046 (14 sub)

Sub-materi yang TIDAK ditemukan dalam teks CP 046 manapun. Strong candidate untag → bridge.

### Kelas 2

**Bab 8 — Bangun Datar dan Ruang — Sifat** (1 sub):
- `SD.2.B8.02` Simetri lipat [high]
  - _Alasan_: CP Fase A hanya menyebut mengenal bangun datar dan ruang, melakukan komposisi/dekomposisi bangun datar, dan menentukan posisi benda — tidak ada penyebutan simetri lipat sama sekali. Simetri lipat tidak muncul secara eksplisit maupun implisit di CP 046 manapun (Fase A hingga F).

### Kelas 3

**Bab 8 — Diagram Garis dan Tabel Frekuensi** (1 sub):
- `SD.3.B8.03` Memilih jenis diagram (batang vs garis vs piktogram) [medium]
  - _Alasan_: CP Fase B menyebut piktogram dan diagram batang sebagai bentuk penyajian data, tetapi TIDAK menyebut diagram garis, dan tidak menyebut kemampuan 'memilih jenis diagram' secara eksplisit maupun implisit. Kompetensi meta-kognitif memilih antar jenis diagram (batang vs garis vs piktogram) adalah level yang lebih tinggi dari sekadar menyajikan data; diagram garis sendiri baru muncul secara implisit di Fase C/D. Topik ini melampaui cakupan CP Fase B.

### Kelas 4

**Bab 1 — Bilangan Cacah Besar dan Faktor** (1 sub):
- `SD.4.B1.03` Bilangan prima — Saringan Eratosthenes [high]
  - _Alasan_: CP Fase B menyebut 'mengenal kelipatan dan faktor' tetapi tidak menyebut bilangan prima maupun Saringan Eratosthenes secara eksplisit maupun implisit. Konsep bilangan prima dan metode Saringan Eratosthenes tidak tercantum di manapun dalam CP 046.

**Bab 3 — Operasi Pecahan** (2 sub):
- `SD.4.B3.03` × pecahan — model luas (area model) [high]
  - _Alasan_: Fase B (K3-4) hanya menyebut 'perkalian dan pembagian bilangan cacah sampai 100', sedangkan perkalian pecahan (× pecahan) baru muncul di Fase C: 'melakukan operasi perkalian dan pembagian pecahan dengan bilangan asli'. Selain itu, model luas (area model) sebagai pendekatan geometri untuk perkalian pecahan tidak disebut sama sekali di CP manapun.
- `SD.4.B3.05` Aturan 'balik & kalikan' (dari mana asalnya) [high]
  - _Alasan_: Aturan 'balik & kalikan' adalah penjelasan konseptual/derivasi dari prosedur pembagian pecahan. CP Fase B (Kelas 3-4) hanya menyebut 'perkalian dan pembagian bilangan cacah sampai 100', sedangkan operasi pembagian pecahan baru muncul di Fase C ('melakukan operasi perkalian dan pembagian pecahan dengan bilangan asli'). Bahkan di Fase C pun, 'pembagian antar pecahan' (yang memerlukan aturan balik & kalikan) tidak disebut eksplisit. Topik derivasi/pembuktian aturan ini tidak disebut di CP manapun.

**Bab 6 — Sudut — Pengenalan dan Pengukuran** (1 sub):
- `SD.4.B6.02` Jenis sudut (lancip, siku-siku, tumpul, lurus) [medium]
  - _Alasan_: CP Fase B (Kelas 3-4 SD) pada elemen Geometri hanya menyebut pendeskripsian ciri bangun datar (segiempat, segitiga, segi banyak) serta komposisi/dekomposisi bangun datar — tidak menyebut pengenalan jenis sudut (lancip, siku-siku, tumpul, lurus). Pengukuran sudut baru muncul di Fase C (Kelas 5-6 SD) dalam elemen Pengukuran ('menghitung durasi waktu dan mengukur besar sudut pada bangun datar'), namun jenis-jenis sudut secara eksplisit pun tidak disebutkan di sana.

**Bab 7 — Segitiga — Jenis dan Sifat** (1 sub):
- `SD.4.B7.03` Jumlah sudut dalam segitiga = 180° [medium]
  - _Alasan_: CP Fase B (Kelas 3-4 SD) hanya menyebut 'mendeskripsikan ciri berbagai bentuk bangun datar (segiempat, segitiga, segi banyak); menyusun dan mengurai berbagai bangun datar' — tidak menyebut sifat jumlah sudut dalam segitiga = 180°. Konsep jumlah sudut dalam segitiga tidak disebut eksplisit maupun implisit di Fase B, C, maupun fase lain dalam CP 046; Fase D hanya menyebut 'menentukan besar sudut yang belum diketahui pada sebuah segitiga' dalam konteks hubungan sudut dari garis transversal, bukan sebagai pengenalan sifat jumlah sudut segitiga secara mandiri.

**Bab 8 — Segi Empat — Jenis dan Luas** (1 sub):
- `SD.4.B8.01` Hierarki segi empat (dari trapesium ke persegi) [medium]
  - _Alasan_: CP Fase B untuk Geometri hanya menyebut 'mendeskripsikan ciri berbagai bentuk bangun datar (segiempat, segitiga, segi banyak)' dan komposisi/dekomposisi bangun datar — tidak mencakup hierarki/klasifikasi hubungan antar segi empat (misal trapesium → jajar genjang → persegi panjang → persegi). Konsep hierarki/taksonomi segi empat tidak disebut secara eksplisit maupun implisit di CP manapun dalam CP 046.

### Kelas 5

**Bab 3 — Operasi Desimal** (1 sub):
- `SD.5.B3.02` × desimal dengan desimal [medium]
  - _Alasan_: CP Fase C menyebut 'membandingkan dan mengurutkan bilangan desimal (satu angka di belakang koma)' tetapi tidak menyebut operasi perkalian antar desimal dengan desimal. Operasi pecahan desimal di Fase C hanya mencakup membandingkan dan mengurutkan, sedangkan perkalian desimal×desimal tidak disebutkan secara eksplisit maupun implisit di Fase C maupun Fase lainnya.

**Bab 8 — Diagram Lingkaran** (1 sub):
- `SD.5.B8.02` Membuat diagram lingkaran dengan busur derajat [high]
  - _Alasan_: Fase C (Kelas 5-6 SD) mencakup penyajian data dalam bentuk gambar, piktogram, diagram batang, dan tabel frekuensi — tidak menyebut diagram lingkaran. Diagram lingkaran baru disebut di Fase D: 'menggunakan diagram batang dan diagram lingkaran untuk menyajikan dan menginterpretasi data'. Karena topiknya adalah membuat diagram lingkaran (termasuk teknis menggunakan busur derajat), topik ini tidak cocok dengan CP Fase C maupun Fase D secara placement, dan elemen Pengukuran/Geometri Fase C pun tidak mencakup ini dalam konteks statistik.

**Bab 9 — Kecepatan dan Debit** (1 sub):
- `SD.5.B9.03` Debit sebagai rasio volume/waktu [high]
  - _Alasan_: CP 046 Fase C (Kelas 5-6 SD) pada elemen Pengukuran hanya menyebut keliling, luas bangun datar, durasi waktu, dan besar sudut — tidak menyebut debit maupun rasio volume/waktu sama sekali. Topik debit tidak muncul di fase manapun dalam CP 046.

### Kelas 6

**Bab 3 — Lingkaran — π, Keliling, Luas** (2 sub):
- `SD.6.B3.01` Unsur-unsur lingkaran (pusat, jari-jari, diameter) [high]
  - _Alasan_: CP Fase C (Geometri) hanya menyebut konstruksi/penguraian bangun ruang dan perbandingan karakteristik bangun datar/ruang — tidak menyebut lingkaran maupun unsur-unsurnya (pusat, jari-jari, diameter). CP Fase D menyebut lingkaran dalam konteks 'keliling, luas, panjang busur, sudut dan luas juring', bukan pengenalan unsur-unsur dasarnya. Pengenalan unsur lingkaran tidak disebut di fase manapun dalam CP 046.
- `SD.6.B3.02` Menemukan π — eksperimen pengukuran [high]
  - _Alasan_: CP Fase C (Kelas 5-6 SD) menyebut 'menentukan keliling dan luas berbagai bentuk bangun datar (segitiga, segiempat, dan segi banyak)' di elemen Pengukuran, namun lingkaran tidak termasuk dalam daftarnya. Eksperimen menemukan π (phi) melalui pengukuran keliling/diameter lingkaran tidak disebut di Fase C maupun fase lainnya secara eksplisit atau implisit; lingkaran dengan keliling, luas, dan π baru muncul di Fase D (SMP).

**Bab 4 — Prisma dan Tabung** (1 sub):
- `SD.6.B4.01` Volume prisma — V = Luas alas × tinggi [high]
  - _Alasan_: Volume prisma secara eksplisit disebut di CP 046 pada Fase D (SMP), bukan Fase C (SD). CP Fase C hanya mencakup keliling dan luas bangun datar serta konstruksi/urai bangun ruang tanpa menyebut perhitungan volume. Penempatan Turo di Fase C tidak sesuai dengan CP 046.

## ⚠ MATCH FASE LAIN — Placement mismatch (53 sub)

Sub yang ada di CP 046, tapi di Fase BERBEDA dengan placement Turo.

### Turo Kelas 2 (placement: Fase A (Kelas 1-2 SD))

**Bab 1 — Bilangan Cacah sampai 1.000**:
- `SD.2.B1.02` Nilai tempat ratusan dengan papan nilai tempat [high]
  → CP taruh di **Fase B** (Bilangan)
  - _Kutipan CP_: "Memiliki pemahaman dan intuisi bilangan (number sense) pada bilangan cacah sampai 10.000; membaca, menulis, membandingkan, dan mengurutkan bilangan; menentukan dan menggunakan nilai tempat"
  - _Alasan_: Nilai tempat ratusan (bagian dari bilangan cacah sampai 1.000) secara eksplisit disebut di Fase B (Kelas 3-4) yang membahas nilai tempat pada bilangan cacah sampai 10.000. Fase A hanya mencakup bilangan cacah sampai 100, sehingga nilai tempat ratusan berada di luar cakupan Fase A.
- `SD.2.B1.03` Membaca dan menulis bilangan 100-999 [high]
  → CP taruh di **Fase B** (Bilangan)
  - _Kutipan CP_: "Memiliki pemahaman dan intuisi bilangan (number sense) pada bilangan cacah sampai 10.000; membaca, menulis, membandingkan, dan mengurutkan bilangan"
  - _Alasan_: CP Fase A hanya mencakup bilangan cacah sampai 100, sedangkan membaca dan menulis bilangan 100–999 berada di rentang yang secara eksplisit dicakup Fase B (bilangan cacah sampai 10.000). Meskipun Turo menempatkan ini di Kelas 2 (Fase A), CP 046 menempatkan kemampuan membaca/menulis bilangan di atas 100 pada Fase B.
- `SD.2.B1.04` Membandingkan dan mengurutkan bilangan 3-digit [high]
  → CP taruh di **Fase B** (Bilangan)
  - _Kutipan CP_: "Memiliki pemahaman dan intuisi bilangan (number sense) pada bilangan cacah sampai 10.000; membaca, menulis, membandingkan, dan mengurutkan bilangan"
  - _Alasan_: Membandingkan dan mengurutkan bilangan 3-digit (sampai 1.000) secara eksplisit disebut di Fase B (Kelas 3-4), yang mencakup bilangan cacah sampai 10.000. Fase A hanya mencakup bilangan cacah sampai 100, sehingga bilangan 3-digit (100–999) melampaui cakupan Fase A.
- `SD.2.B1.05` Komposisi-dekomposisi bilangan 3-digit [high]
  → CP taruh di **Fase B** (Bilangan)
  - _Kutipan CP_: "melakukan komposisi dan dekomposisi bilangan cacah sampai 10.000"
  - _Alasan_: Komposisi-dekomposisi bilangan 3-digit (sampai 1.000) secara eksplisit disebut di CP Fase B ('melakukan komposisi dan dekomposisi bilangan cacah sampai 10.000'), sedangkan Fase A hanya mencakup komposisi dan dekomposisi bilangan cacah sampai 100. Turo menempatkan topik ini di Fase A (Kelas 2), padahal CP menempatkan operasi pada rentang bilangan tersebut di Fase B.

**Bab 3 — Perkalian Dasar**:
- `SD.2.B3.01` Perkalian sebagai array (baris × kolom) [high]
  → CP taruh di **Fase B** (Bilangan)
  - _Kutipan CP_: "melakukan dan menyelesaikan masalah operasi perkalian dan pembagian bilangan cacah sampai 100 dengan bantuan benda konkret, gambar dan simbol"
  - _Alasan_: Operasi perkalian (termasuk konsep array baris×kolom) disebut eksplisit di CP Fase B (Kelas 3-4 SD), bukan Fase A (Kelas 1-2 SD). CP Fase A hanya menyebut penjumlahan dan pengurangan hingga 20, tanpa menyinggung perkalian.
- `SD.2.B3.02` Perkalian sebagai penjumlahan berulang [high]
  → CP taruh di **Fase B** (Bilangan)
  - _Kutipan CP_: "melakukan dan menyelesaikan masalah operasi perkalian dan pembagian bilangan cacah sampai 100 dengan bantuan benda konkret, gambar dan simbol"
  - _Alasan_: Perkalian sebagai penjumlahan berulang adalah konsep dasar perkalian, yang di CP 046 hanya disebut secara eksplisit di Fase B (Kelas 3-4). Fase A hanya mencakup operasi penjumlahan dan pengurangan (benda-benda konkret banyaknya sampai 20), tidak menyebut perkalian sama sekali. Turo menempatkan topik ini di Fase A (Kelas 2), sehingga terjadi mismatch fase.
- `SD.2.B3.03` Sifat komutatif perkalian [high]
  → CP taruh di **Fase B** (Aljabar)
  - _Kutipan CP_: "Menemukan nilai yang tidak diketahui dalam kalimat matematika yang melibatkan penjumlahan dan pengurangan pada bilangan cacah sampai 100, dengan menggunakan sifat-sifat bilangan dan operasinya."
  - _Alasan_: Sifat komutatif perkalian adalah bagian dari 'sifat-sifat bilangan dan operasinya', yang di CP 046 baru disebut pada Fase B (Kelas 3-4). Fase A hanya mencakup operasi penjumlahan dan pengurangan sampai 20, tanpa menyebut perkalian maupun sifat-sifatnya.
- `SD.2.B3.04` Tabel perkalian 1-5 dengan pola [high]
  → CP taruh di **Fase B** (Bilangan)
  - _Kutipan CP_: "melakukan dan menyelesaikan masalah operasi perkalian dan pembagian bilangan cacah sampai 100 dengan bantuan benda konkret, gambar dan simbol"
  - _Alasan_: Perkalian dasar (tabel perkalian 1-5) secara eksplisit disebutkan di Fase B (Kelas 3-4 SD) sebagai operasi perkalian bilangan cacah. Fase A hanya mencakup operasi penjumlahan dan pengurangan hingga 20, tidak menyebut perkalian sama sekali. Placement Turo di Fase A (Kelas 2) tidak sesuai dengan CP 046.
- `SD.2.B3.05` Tabel perkalian 6-9 — strategi [high]
  → CP taruh di **Fase B** (Bilangan)
  - _Kutipan CP_: "melakukan dan menyelesaikan masalah operasi perkalian dan pembagian bilangan cacah sampai 100 dengan bantuan benda konkret, gambar dan simbol"
  - _Alasan_: Perkalian dasar (tabel perkalian 6-9) secara eksplisit disebutkan di CP Fase B (Kelas 3-4 SD) sebagai operasi perkalian bilangan cacah sampai 100. Fase A hanya mencakup penjumlahan dan pengurangan sampai 20, tanpa menyebut perkalian sama sekali. Turo menempatkan topik ini di Kelas 2 (Fase A), padahal CP menempatkannya di Fase B.

**Bab 4 — Pembagian Dasar**:
- `SD.2.B4.03` Hubungan perkalian & pembagian (fact family) [high]
  → CP taruh di **Fase B** (Bilangan)
  - _Kutipan CP_: "melakukan dan menyelesaikan masalah operasi perkalian dan pembagian bilangan cacah sampai 100 dengan bantuan benda konkret, gambar dan simbol"
  - _Alasan_: Operasi perkalian dan pembagian (termasuk hubungan keduanya / fact family) secara eksplisit disebutkan di CP Fase B (Kelas 3-4), bukan Fase A (Kelas 1-2). CP Fase A hanya mencakup penjumlahan dan pengurangan sampai 20.
- `SD.2.B4.04` Pembagian dengan sisa (pengantar) [high]
  → CP taruh di **Fase B** (Bilangan)
  - _Kutipan CP_: "melakukan dan menyelesaikan masalah operasi perkalian dan pembagian bilangan cacah sampai 100 dengan bantuan benda konkret, gambar dan simbol"
  - _Alasan_: Operasi pembagian bilangan cacah disebut di CP Fase B (Kelas 3-4), bukan Fase A. Fase A hanya mencakup penjumlahan dan pengurangan sampai 20; pembagian (termasuk pembagian dengan sisa) baru muncul di Fase B.

**Bab 5 — Pecahan Sederhana (Pecahan Satuan)**:
- `SD.2.B5.03` Membandingkan pecahan satuan (konter-intuitif) [high]
  → CP taruh di **Fase B** (Bilangan)
  - _Kutipan CP_: "melakukan perbandingan dan pengurutan pecahan dengan pembilang satu dan antar pecahan dengan penyebut yang sama"
  - _Alasan_: Membandingkan pecahan satuan (pembilang satu) secara eksplisit disebut di CP Fase B (Kelas 3-4 SD), bukan Fase A (Kelas 1-2 SD). CP Fase A hanya memperkenalkan pecahan sebagai 'bagian dari keseluruhan' terbatas pada setengah dan seperempat, tanpa menyebut perbandingan antar pecahan satuan.

**Bab 6 — Pengukuran dengan Satuan Baku**:
- `SD.2.B6.01` Mistar dan cm — satuan baku panjang [high]
  → CP taruh di **Fase B** (Pengukuran)
  - _Kutipan CP_: "Mengukur panjang dan berat benda menggunakan satuan baku; menentukan hubungan antar-satuan baku panjang (cm, m) dan antar-satuan berat (g, kg)"
  - _Alasan_: Penggunaan satuan baku panjang (cm) dengan mistar secara eksplisit disebut di CP Fase B (Kelas 3-4), bukan Fase A. CP Fase A hanya menyebut 'mengukur dan mengestimasi panjang dan berat benda menggunakan satuan tidak baku', sehingga pengenalan satuan baku cm di Kelas 2 (Fase A) tidak sesuai dengan CP.
- `SD.2.B6.02` Hubungan cm dan m (100 cm = 1 m) [high]
  → CP taruh di **Fase B** (Pengukuran)
  - _Kutipan CP_: "Mengukur panjang dan berat benda menggunakan satuan baku; menentukan hubungan antar-satuan baku panjang (cm, m) dan antar-satuan berat (g, kg)"
  - _Alasan_: Hubungan antar-satuan baku panjang (cm dan m) secara eksplisit disebut di CP Fase B (Kelas 3-4), bukan Fase A (Kelas 1-2). CP Fase A hanya menyebut pengukuran menggunakan satuan tidak baku, belum satuan baku.
- `SD.2.B6.03` Timbangan dan gram [high]
  → CP taruh di **Fase B** (Pengukuran)
  - _Kutipan CP_: "Mengukur panjang dan berat benda menggunakan satuan baku; menentukan hubungan antar-satuan baku panjang (cm, m) dan antar-satuan berat (g, kg)"
  - _Alasan_: Pengukuran berat dengan satuan baku (gram/kg) secara eksplisit disebutkan di CP Fase B (Kelas 3-4), bukan Fase A. Fase A hanya mencakup pengukuran berat menggunakan satuan tidak baku dan perbandingan langsung, tanpa menyebut satuan baku seperti gram.
- `SD.2.B6.04` Hubungan g dan kg (1000 g = 1 kg) [high]
  → CP taruh di **Fase B** (Pengukuran)
  - _Kutipan CP_: "mengukur panjang dan berat benda menggunakan satuan baku; menentukan hubungan antar-satuan baku panjang (cm, m) dan antar-satuan berat (g, kg)"
  - _Alasan_: Hubungan antar-satuan berat (g dan kg) secara eksplisit disebut di CP Fase B (Kelas 3-4 SD), bukan Fase A. Turo menempatkan topik ini di Kelas 2 (Fase A), sehingga terjadi mismatch fase.

**Bab 7 — Waktu — Jam, Hari, Kalender**:
- `SD.2.B7.03` Hari, minggu, bulan, tahun [medium]
  → CP taruh di **Fase B** (Pengukuran)
  - _Kutipan CP_: "Mengukur panjang dan berat benda menggunakan satuan baku; menentukan hubungan antar-satuan baku panjang (cm, m) dan antar-satuan berat (g, kg); serta mengukur dan mengestimasi luas dan volume menggunakan satuan tidak baku dan satuan baku berupa bilangan cacah."
  - _Alasan_: Konsep durasi waktu (hari, minggu, bulan, tahun) sebagai satuan pengukuran waktu paling dekat dengan elemen Pengukuran. Fase A hanya menyebut 'membandingkan durasi waktu' secara umum tanpa menyebut satuan kalender (hari, minggu, bulan, tahun), sementara Fase B menyebut satuan baku pengukuran. Namun bahkan Fase B tidak secara eksplisit menyebut satuan waktu kalender — Fase A hanya menyebut 'membandingkan durasi waktu' tanpa detail satuan kalender spesifik. Topik ini tersirat di Fase A ('membandingkan durasi waktu') namun pengenalan satuan kalender formal (hari, minggu, bulan, tahun) lebih cocok Fase B.

**Bab 9 — Data dan Diagram Batang**:
- `SD.2.B9.01` Tabel data dari survei sederhana [high]
  → CP taruh di **Fase B** (Analisis Data dan Peluang)
  - _Kutipan CP_: "Mengurutkan, membandingkan, menyajikan, menganalisis dan menginterpretasi data dalam bentuk tabel, diagram gambar, piktogram, dan diagram batang (skala satu satuan)."
  - _Alasan_: Penyajian data dalam bentuk tabel secara eksplisit disebut di CP Fase B (Kelas 3-4), bukan Fase A. CP Fase A hanya menyebut turus dan piktogram (maksimal 4 kategori), tidak mencakup tabel data. Turo menempatkan topik ini di Kelas 2 (Fase A), sehingga ada mismatch fase.
- `SD.2.B9.02` Diagram batang — 1 kotak = 1 benda [high]
  → CP taruh di **Fase B** (Analisis Data dan Peluang)
  - _Kutipan CP_: "Mengurutkan, membandingkan, menyajikan, menganalisis dan menginterpretasi data dalam bentuk tabel, diagram gambar, piktogram, dan diagram batang (skala satu satuan)."
  - _Alasan_: Diagram batang secara eksplisit disebut di CP Fase B (Kelas 3-4), bukan Fase A (Kelas 1-2). CP Fase A hanya menyebut turus dan piktogram (maks 4 kategori), tidak mencakup diagram batang. Turo menempatkan topik ini di Kelas 2 (Fase A), padahal CP menempatkannya di Fase B.
- `SD.2.B9.03` Membaca & menginterpretasi diagram batang [high]
  → CP taruh di **Fase B** (Analisis Data dan Peluang)
  - _Kutipan CP_: "Mengurutkan, membandingkan, menyajikan, menganalisis dan menginterpretasi data dalam bentuk tabel, diagram gambar, piktogram, dan diagram batang (skala satu satuan)."
  - _Alasan_: Diagram batang disebut secara eksplisit di CP Fase B (Kelas 3-4), bukan Fase A (Kelas 1-2). CP Fase A hanya menyebut turus dan piktogram (maks 4 kategori), tidak menyebut diagram batang sama sekali. Placement Turo di Kelas 2 (Fase A) tidak sesuai dengan CP yang menempatkan diagram batang di Fase B.

### Turo Kelas 3 (placement: Fase B (Kelas 3-4 SD))

**Bab 2 — Operasi Hitung Campuran**:
- `SD.3.B2.03` Perkalian bersusun 2-digit × 2-digit [high]
  → CP taruh di **Fase C** (Bilangan)
  - _Kutipan CP_: "melakukan operasi penjumlahan, pengurangan, perkalian, dan pembagian bilangan cacah sampai 100.000"
  - _Alasan_: Fase B hanya menyebut 'perkalian dan pembagian bilangan cacah sampai 100 dengan bantuan benda konkret, gambar dan simbol'. Perkalian 2-digit × 2-digit (hingga 99×99=9801) melampaui batas 100 yang disebut Fase B, dan lebih sesuai dengan Fase C yang mencakup operasi perkalian bilangan cacah sampai 100.000.

**Bab 3 — Pecahan Biasa dan Pecahan Senilai**:
- `SD.3.B3.02` Pecahan campuran (mixed number) [high]
  → CP taruh di **Fase C** (Bilangan)
  - _Kutipan CP_: "membandingkan dan mengurutkan berbagai pecahan termasuk pecahan campuran, melakukan operasi penjumlahan dan pengurangan pecahan"
  - _Alasan_: Pecahan campuran (mixed number) secara eksplisit disebut di CP Fase C (Kelas 5-6 SD), bukan Fase B (Kelas 3-4 SD). CP Fase B hanya menyebut 'pecahan dengan pembilang satu dan antar pecahan dengan penyebut yang sama' serta 'pecahan senilai', tanpa menyebut pecahan campuran.

**Bab 4 — Pengenalan Desimal Sederhana**:
- `SD.3.B4.01` Persepuluhan sebagai pecahan 1/10 [medium]
  → CP taruh di **Fase C** (Bilangan)
  - _Kutipan CP_: "membandingkan dan mengurutkan bilangan desimal (satu angka di belakang koma)"
  - _Alasan_: Konsep persepuluhan (1/10) sebagai pengenalan desimal lebih eksplisit disebut di Fase C (K5-6), di mana CP menyebut konversi pecahan ke desimal dan pembandingan bilangan desimal. Fase B hanya menyebut 'memiliki intuisi pecahan dan desimal' secara sangat umum, namun konteks pengenalan 1/10 sebagai desimal (persepuluhan) lebih kuat penjangkarannya di Fase C. Meski ada frasa 'intuisi pecahan dan desimal' di Fase B, pendalaman persepuluhan sebagai 1/10 secara eksplisit baru muncul di Fase C.
- `SD.3.B4.02` Notasi desimal 0,1 — 0,9 [high]
  → CP taruh di **Fase C** (Bilangan)
  - _Kutipan CP_: "membandingkan dan mengurutkan bilangan desimal (satu angka di belakang koma)"
  - _Alasan_: Notasi desimal 0,1–0,9 (satu angka di belakang koma) secara eksplisit disebut di Fase C (Kelas 5-6), bukan Fase B (Kelas 3-4). Fase B hanya menyebut 'memiliki intuisi pecahan dan desimal' serta 'menentukan pecahan sebagai desimal dan persen' secara umum tanpa menyebut notasi desimal spesifik, sedangkan Fase C secara eksplisit memuat bilangan desimal satu angka di belakang koma.
- `SD.3.B4.03` Membandingkan desimal 1-angka [high]
  → CP taruh di **Fase C** (Bilangan)
  - _Kutipan CP_: "membandingkan dan mengurutkan bilangan desimal (satu angka di belakang koma)"
  - _Alasan_: Membandingkan desimal 1-angka (satu angka di belakang koma) secara eksplisit disebut di CP Fase C (Kelas 5-6 SD), bukan Fase B (Kelas 3-4 SD). Turo menempatkan topik ini di Kelas 3 (Fase B), sehingga terjadi mismatch fase.

**Bab 8 — Diagram Garis dan Tabel Frekuensi**:
- `SD.3.B8.02` Diagram garis (data berubah waktu) [high]
  → CP taruh di **Fase C** (Analisis Data dan Peluang)
  - _Kutipan CP_: "Mengurutkan, membandingkan, menyajikan, dan menganalisis data banyak benda dan data hasil pengukuran dalam bentuk gambar, piktogram, diagram batang, dan tabel frekuensi untuk mendapatkan informasi"
  - _Alasan_: CP Fase B hanya menyebut tabel, diagram gambar, piktogram, dan diagram batang — tidak menyebut diagram garis sama sekali. Diagram garis pun tidak muncul di Fase C secara eksplisit (Fase C menyebut diagram batang dan tabel frekuensi), dan tabel frekuensi baru muncul di Fase C. Diagram garis sebagai representasi data perubahan waktu tidak disebutkan di Fase B manapun dalam CP 046; representasi paling dekat (tabel frekuensi) baru ada di Fase C, sehingga placement di Fase B (Kelas 3) tidak memiliki dukungan CP yang memadai.

### Turo Kelas 4 (placement: Fase B (Kelas 3-4 SD))

**Bab 1 — Bilangan Cacah Besar dan Faktor**:
- `SD.4.B1.01` Bilangan cacah sampai 1.000.000 [high]
  → CP taruh di **Fase C** (Bilangan)
  - _Kutipan CP_: "Menunjukkan pemahaman dan intuisi bilangan (number sense) pada bilangan cacah sampai 1.000.000; membaca, menulis, menentukan nilai tempat, membandingkan, mengurutkan, melakukan komposisi dan dekomposisi bilangan"
  - _Alasan_: CP 046 menyebut 'bilangan cacah sampai 1.000.000' secara eksplisit di Fase C (Kelas 5-6 SD), bukan Fase B (Kelas 3-4 SD). Fase B hanya mencakup bilangan cacah sampai 10.000, sehingga placement Turo di Kelas 4 (Fase B) tidak sesuai dengan CP asli.

**Bab 2 — KPK dan FPB**:
- `SD.4.B2.02` KPK (Kelipatan Persekutuan Terkecil) [high]
  → CP taruh di **Fase C** (Bilangan)
  - _Kutipan CP_: "menyelesaikan masalah yang berkaitan dengan KPK dan FPB"
  - _Alasan_: KPK dan FPB secara eksplisit disebut di CP Fase C (Kelas 5-6 SD), bukan Fase B (Kelas 3-4 SD). Turo menempatkan topik ini di Kelas 4 (Fase B), sehingga terjadi mismatch fase.
- `SD.4.B2.03` KPK & FPB dengan faktorisasi prima [high]
  → CP taruh di **Fase C** (Bilangan)
  - _Kutipan CP_: "menyelesaikan masalah yang berkaitan dengan KPK dan FPB"
  - _Alasan_: KPK dan FPB secara eksplisit disebut di CP Fase C (Kelas 5-6 SD), bukan Fase B (Kelas 3-4 SD). Turo menempatkan topik ini di Kelas 4 (Fase B), sehingga terjadi mismatch fase — topik ini seharusnya baru muncul di Fase C.
- `SD.4.B2.04` Aplikasi KPK & FPB (jadwal, pembagian) [high]
  → CP taruh di **Fase C** (Bilangan)
  - _Kutipan CP_: "menyelesaikan masalah yang berkaitan dengan KPK dan FPB"
  - _Alasan_: KPK dan FPB beserta aplikasinya (jadwal, pembagian) secara eksplisit disebut di CP Fase C (Kelas 5-6), bukan Fase B (Kelas 3-4). Placement Turo di Fase B tidak sesuai dengan teks CP 046.

**Bab 3 — Operasi Pecahan**:
- `SD.4.B3.02` +/− pecahan penyebut BEDA (samakan penyebut) [high]
  → CP taruh di **Fase C** (Bilangan)
  - _Kutipan CP_: "melakukan operasi penjumlahan dan pengurangan pecahan"
  - _Alasan_: Operasi penjumlahan dan pengurangan pecahan (termasuk menyamakan penyebut berbeda) secara eksplisit disebut di CP Fase C (Kelas 5-6), bukan Fase B (Kelas 3-4). CP Fase B hanya menyebut 'perbandingan dan pengurutan pecahan dengan pembilang satu dan antar pecahan dengan penyebut yang sama' — belum sampai operasi penjumlahan/pengurangan pecahan beda penyebut.
- `SD.4.B3.04` ÷ pecahan — model pengukuran [high]
  → CP taruh di **Fase C** (Bilangan)
  - _Kutipan CP_: "melakukan operasi perkalian dan pembagian pecahan dengan bilangan asli"
  - _Alasan_: Pembagian pecahan (÷ pecahan) paling dekat dengan operasi pada pecahan yang disebut di Fase C (Kelas 5-6). Fase B hanya mencakup operasi penjumlahan dan pengurangan bilangan cacah serta perbandingan/pengurutan pecahan sederhana — tidak ada pembagian pecahan. Bahkan di Fase C pun, yang disebutkan adalah pembagian pecahan dengan bilangan asli, bukan pecahan dibagi pecahan; sehingga 'model pengukuran' untuk ÷ pecahan di Kelas 4 (Fase B) tidak memiliki dasar di CP Fase B.

**Bab 5 — Persen**:
- `SD.4.B5.01` Persen — pecahan per seratus [medium]
  → CP taruh di **Fase C** (Bilangan)
  - _Kutipan CP_: "mengubah pecahan menjadi berbagai bentuk pecahan lain, serta membandingkan dan mengurutkan bilangan desimal (satu angka di belakang koma)"
  - _Alasan_: Konsep persen sebagai pecahan per seratus (dan konversi antar bentuk pecahan) di CP 046 disebut dalam Fase C (Kelas 5-6), bukan Fase B. Fase B hanya menyebut 'menentukan pecahan sebagai desimal dan persen' dalam konteks intuisi, namun frasa itu tidak secara eksplisit ada di teks CP Fase B — yang ada adalah 'memiliki intuisi pecahan dan desimal'. Sementara Fase C secara eksplisit menyebut mengubah pecahan ke berbagai bentuk termasuk persen.

**Bab 6 — Sudut — Pengenalan dan Pengukuran**:
- `SD.4.B6.03` Mengukur sudut dengan busur derajat [high]
  → CP taruh di **Fase C** (Pengukuran)
  - _Kutipan CP_: "menghitung durasi waktu dan mengukur besar sudut pada bangun datar atau yang dibentuk dari dua garis berpotongan"
  - _Alasan_: Pengukuran sudut (termasuk menggunakan busur derajat) secara eksplisit disebut di CP Fase C (Kelas 5-6 SD) dalam elemen Pengukuran, bukan di Fase B (Kelas 3-4 SD). Turo menempatkan topik ini di Kelas 4 (Fase B), sehingga terjadi mismatch fase.

**Bab 8 — Segi Empat — Jenis dan Luas**:
- `SD.4.B8.04` Luas segitiga — setengah jajargenjang [high]
  → CP taruh di **Fase C** (Pengukuran)
  - _Kutipan CP_: "Menentukan keliling dan luas berbagai bentuk bangun datar (segitiga, segiempat, dan segi banyak) serta gabungannya"
  - _Alasan_: Luas segitiga secara eksplisit disebut di CP Fase C (Kelas 5-6 SD) dalam elemen Pengukuran. CP Fase B hanya menyebut 'mengukur dan mengestimasi luas dan volume menggunakan satuan tidak baku dan satuan baku' tanpa menyebut rumus luas bangun datar spesifik seperti segitiga. Turo menempatkan topik ini di Fase B (K4), padahal CP menaruhnya di Fase C.
- `SD.4.B8.05` Luas trapesium dan layang-layang [high]
  → CP taruh di **Fase C** (Pengukuran)
  - _Kutipan CP_: "Menentukan keliling dan luas berbagai bentuk bangun datar (segitiga, segiempat, dan segi banyak) serta gabungannya"
  - _Alasan_: Luas trapesium dan layang-layang termasuk luas segiempat, yang di CP 046 secara eksplisit disebut di Fase C (Kelas 5-6 SD) pada elemen Pengukuran. Fase B (Kelas 3-4 SD) hanya menyebut estimasi luas menggunakan satuan tidak baku dan satuan baku, tanpa menyebut rumus luas bangun datar spesifik seperti trapesium atau layang-layang.

### Turo Kelas 5 (placement: Fase C (Kelas 5-6 SD))

**Bab 5 — Volume Kubus dan Balok**:
- `SD.5.B5.05` Jaring-jaring kubus dan balok [high]
  → CP taruh di **Fase D** (Geometri)
  - _Kutipan CP_: "Membuat jaring-jaring bangun ruang (prisma, tabung, limas dan kerucut) dan membuat bangun ruang dari jaring-jaringnya."
  - _Alasan_: Jaring-jaring bangun ruang (termasuk kubus dan balok sebagai kasus khusus prisma) secara eksplisit disebut di CP Fase D (SMP), bukan Fase C (SD). CP Fase C hanya menyebut 'mengkonstruksi dan mengurai bangun ruang (kubus, balok, dan gabungannya)' dalam konteks visualisasi spasial, bukan jaring-jaring secara spesifik.
- `SD.5.B5.06` Luas permukaan kubus dan balok [high]
  → CP taruh di **Fase D** (Pengukuran)
  - _Kutipan CP_: "menjelaskan cara untuk menentukan luas permukaan dan volume bangun ruang (prisma, tabung, bola, limas dan kerucut) dan menyelesaikan masalah yang terkait"
  - _Alasan_: Luas permukaan bangun ruang (termasuk kubus dan balok sebagai kasus khusus prisma) secara eksplisit disebutkan di CP Fase D (SMP), bukan Fase C. CP Fase C hanya menyebut keliling dan luas bangun datar serta mengkonstruksi/mengurai bangun ruang, tidak menyebut luas permukaan bangun ruang.

**Bab 6 — Mean, Median, Modus**:
- `SD.5.B6.01` Mean (rata-rata) — 'meratakan' [high]
  → CP taruh di **Fase D** (Analisis Data dan Peluang)
  - _Kutipan CP_: "menentukan dan menafsirkan rerata (mean), median, modus, dan jangkauan (range) dari data tersebut untuk menyelesaikan masalah"
  - _Alasan_: Mean (rata-rata) secara eksplisit disebut di CP Fase D (SMP K7-9), bukan di Fase C (SD K5-6). CP Fase C hanya menyebut penyajian dan analisis data dalam bentuk gambar, piktogram, diagram batang, dan tabel frekuensi — tanpa menyebut mean/median/modus.
- `SD.5.B6.02` Median — nilai tengah [high]
  → CP taruh di **Fase D** (Analisis Data dan Peluang)
  - _Kutipan CP_: "menentukan dan menafsirkan rerata (mean), median, modus, dan jangkauan (range) dari data tersebut untuk menyelesaikan masalah"
  - _Alasan_: Median secara eksplisit disebut di CP 046 pada Fase D (SMP K7-9), bukan Fase C (SD K5-6). CP Fase C hanya menyebut penyajian dan analisis data dalam bentuk gambar, piktogram, diagram batang, dan tabel frekuensi — tidak menyebut mean/median/modus. Placement Turo di Fase C (K5) tidak sesuai dengan CP.
- `SD.5.B6.03` Modus — yang paling sering muncul [high]
  → CP taruh di **Fase D** (Analisis Data dan Peluang)
  - _Kutipan CP_: "menentukan dan menafsirkan rerata (mean), median, modus, dan jangkauan (range) dari data tersebut untuk menyelesaikan masalah"
  - _Alasan_: Modus secara eksplisit disebut di CP Fase D (SMP K7-9), bukan di Fase C (SD K5-6). CP Fase C hanya menyebut penyajian dan analisis data dalam bentuk gambar, piktogram, diagram batang, dan tabel frekuensi — tidak menyebut mean, median, maupun modus.
- `SD.5.B6.04` Kapan pakai mean vs median? [high]
  → CP taruh di **Fase D** (Analisis Data dan Peluang)
  - _Kutipan CP_: "menentukan dan menafsirkan rerata (mean), median, modus, dan jangkauan (range) dari data tersebut untuk menyelesaikan masalah (termasuk membandingkan suatu data terhadap kelompoknya, membandingkan dua kelompok data, memprediksi, membuat keputusan)"
  - _Alasan_: Konsep mean dan median (serta perbandingan kapan menggunakan keduanya) secara eksplisit disebut di CP Fase D (SMP K7-9), bukan Fase C (SD K5-6). CP Fase C hanya menyebut penyajian dan analisis data dalam bentuk diagram/tabel, tanpa menyinggung mean/median/modus.

### Turo Kelas 6 (placement: Fase C (Kelas 5-6 SD))

**Bab 1 — Bilangan Bulat — Pengenalan Negatif**:
- `SD.6.B1.04` +/− bilangan bulat sederhana [high]
  → CP taruh di **Fase D** (Bilangan)
  - _Kutipan CP_: "Membaca, menulis, dan membandingkan bilangan bulat, bilangan rasional, bilangan desimal, bilangan berpangkat bulat dan akar, bilangan dalam notasi ilmiah; menerapkan operasi aritmatika pada bilangan real"
  - _Alasan_: Operasi +/− bilangan bulat (termasuk bilangan negatif) secara eksplisit baru masuk di CP Fase D (SMP K7-9). CP Fase C hanya mencakup bilangan cacah, pecahan, dan desimal — tidak menyebut bilangan bulat negatif sama sekali. Placement Turo di Fase C (K6) tidak sesuai dengan CP 046.

**Bab 3 — Lingkaran — π, Keliling, Luas**:
- `SD.6.B3.03` Keliling lingkaran K = π × d [high]
  → CP taruh di **Fase D** (Pengukuran)
  - _Kutipan CP_: "Menentukan keliling, luas, panjang busur, sudut dan luas juring lingkaran, serta menyelesaikan masalah yang terkait"
  - _Alasan_: Keliling lingkaran (K = π × d) secara eksplisit disebut di CP Fase D (SMP/Kelas 7-9), bukan di Fase C. CP Fase C (Kelas 5-6 SD) hanya menyebut 'keliling dan luas berbagai bentuk bangun datar (segitiga, segiempat, dan segi banyak)' — lingkaran tidak termasuk di Fase C.
- `SD.6.B3.04` Luas lingkaran — dari juring ke jajar genjang [high]
  → CP taruh di **Fase D** (Pengukuran)
  - _Kutipan CP_: "Menentukan keliling, luas, panjang busur, sudut dan luas juring lingkaran, serta menyelesaikan masalah yang terkait"
  - _Alasan_: Luas lingkaran (termasuk pendekatan via juring ke jajar genjang) secara eksplisit disebut di CP Fase D (SMP), bukan Fase C. CP Fase C hanya menyebut keliling dan luas bangun datar berupa segitiga, segiempat, dan segi banyak — lingkaran tidak termasuk.

**Bab 4 — Prisma dan Tabung**:
- `SD.6.B4.02` Volume tabung — prisma dengan alas lingkaran [high]
  → CP taruh di **Fase D** (Pengukuran)
  - _Kutipan CP_: "menjelaskan cara untuk menentukan luas permukaan dan volume bangun ruang (prisma, tabung, bola, limas dan kerucut) dan menyelesaikan masalah yang terkait"
  - _Alasan_: Volume tabung dan prisma secara eksplisit disebutkan di CP Fase D (SMP K7-9), bukan Fase C (SD K5-6). CP Fase C hanya mencakup kubus, balok, dan gabungannya — tidak menyebut prisma atau tabung.
- `SD.6.B4.03` Luas permukaan prisma [high]
  → CP taruh di **Fase D** (Pengukuran)
  - _Kutipan CP_: "menjelaskan cara untuk menentukan luas permukaan dan volume bangun ruang (prisma, tabung, bola, limas dan kerucut) dan menyelesaikan masalah yang terkait"
  - _Alasan_: Luas permukaan prisma secara eksplisit disebut di CP Fase D (SMP), bukan Fase C (SD). CP Fase C hanya mencakup luas bangun datar (segitiga, segiempat, segi banyak) dan konstruksi bangun ruang kubus/balok, tidak menyebut luas permukaan prisma sama sekali.
- `SD.6.B4.04` Luas permukaan tabung [high]
  → CP taruh di **Fase D** (Pengukuran)
  - _Kutipan CP_: "menjelaskan cara untuk menentukan luas permukaan dan volume bangun ruang (prisma, tabung, bola, limas dan kerucut) dan menyelesaikan masalah yang terkait"
  - _Alasan_: Luas permukaan tabung secara eksplisit disebut di CP Fase D (SMP) elemen Pengukuran. CP Fase C (SD) hanya mencakup keliling dan luas bangun datar serta konstruksi/urai bangun ruang (kubus, balok), tidak menyebut luas permukaan tabung.

**Bab 5 — Koordinat Kartesius**:
- `SD.6.B5.01` Bidang koordinat — sumbu x dan y [high]
  → CP taruh di **Fase D** (Geometri)
  - _Kutipan CP_: "menunjukkan kebenaran teorema Pythagoras dan menggunakannya dalam menyelesaikan masalah (termasuk pengenalan bilangan irasional dan jarak antara dua titik pada bidang koordinat Kartesius). Murid dapat melakukan transformasi tunggal (refleksi, translasi, rotasi, dan dilatasi) titik, garis, dan bangun datar pada bidang koordinat Kartesius"
  - _Alasan_: Bidang koordinat Kartesius (sumbu x dan y) disebut secara eksplisit di CP Fase D (SMP K7-9), bukan di Fase C (SD K5-6). CP Fase C hanya menyebut 'menentukan lokasi pada peta yang menggunakan sistem berpetak', yang berbeda dengan sistem koordinat Kartesius formal.
- `SD.6.B5.03` Bangun datar di bidang koordinat [high]
  → CP taruh di **Fase D** (Geometri)
  - _Kutipan CP_: "melakukan transformasi tunggal (refleksi, translasi, rotasi, dan dilatasi) titik, garis, dan bangun datar pada bidang koordinat Kartesius dan menggunakannya untuk menyelesaikan masalah"
  - _Alasan_: Bangun datar di bidang koordinat Kartesius secara eksplisit disebut di CP Fase D (SMP K7-9) dalam elemen Geometri, bukan di Fase C (SD K5-6). CP Fase C hanya menyebut 'menentukan lokasi pada peta yang menggunakan sistem berpetak', bukan sistem koordinat Kartesius formal.

**Bab 6 — Pola Bilangan & Generalisasi**:
- `SD.6.B6.02` Suku ke-n dari barisan aritmetika [high]
  → CP taruh di **Fase F** (Bilangan)
  - _Kutipan CP_: "Menjelaskan barisan dan deret (aritmetika dan geometri), menerapkannya pada beragam masalah"
  - _Alasan_: Barisan aritmetika dan penentuan suku ke-n secara eksplisit disebutkan di CP Fase F (Kelas 11-12 SMA). Fase C hanya menyebut 'pola bilangan membesar dan mengecil yang melibatkan perkalian dan pembagian', tidak mencakup generalisasi rumus suku ke-n barisan aritmetika.

**Bab 7 — Peluang Sederhana**:
- `SD.6.B7.01` Peluang teoretik (teori) [high]
  → CP taruh di **Fase D** (Analisis Data dan Peluang)
  - _Kutipan CP_: "menjelaskan dan menggunakan pengertian peluang dan frekuensi relatif untuk menentukan frekuensi harapan satu kejadian pada suatu percobaan sederhana (semua hasil percobaan dapat muncul secara merata)"
  - _Alasan_: Peluang teoretik (konsep/teori peluang) secara eksplisit baru muncul di CP 046 pada Fase D (SMP K7-9), bukan Fase C. Fase C hanya menyebut 'menentukan kejadian dengan kemungkinan yang lebih besar atau lebih kecil dalam suatu percobaan acak' — ini adalah konsep perbandingan kemungkinan kualitatif, bukan peluang teoretik formal dengan nilai numerik. Placement Turo di K6 (Fase C) tidak sesuai dengan CP yang menempatkan peluang teoretik di Fase D.
- `SD.6.B7.02` Peluang empirik (eksperimen) [high]
  → CP taruh di **Fase D** (Analisis Data dan Peluang)
  - _Kutipan CP_: "menjelaskan dan menggunakan pengertian peluang dan frekuensi relatif untuk menentukan frekuensi harapan satu kejadian pada suatu percobaan sederhana (semua hasil percobaan dapat muncul secara merata)"
  - _Alasan_: Peluang empirik (berbasis eksperimen/frekuensi relatif) secara eksplisit disebut di CP Fase D (SMP), bukan Fase C. Fase C hanya menyebut 'menentukan kejadian dengan kemungkinan yang lebih besar atau lebih kecil dalam suatu percobaan acak' — yang bersifat kualitatif/intuitif, belum menyentuh konsep frekuensi relatif/empirik secara formal.

## ✓ Sample MATCH FASE SAMA (sanity check, 10 first)

- `SD.1.B1.01` Subitasi — mengenali jumlah 1-5 sekilas tanpa menghitung ↔ CP Fase A Bilangan [medium]
  - "Menunjukkan pemahaman dan memiliki intuisi bilangan (number sense) pada bilangan cacah sampai 100"
- `SD.1.B1.02` Membilang dengan korespondensi 1-1 ↔ CP Fase A Bilangan [high]
  - "Menunjukkan pemahaman dan memiliki intuisi bilangan (number sense) pada bilangan cacah sampai 100; membaca, menulis, menentukan nilai tempat, membandingkan, mengurutkan, serta melakukan komposisi (menyusun) dan dekomposisi (mengurai) bilangan"
- `SD.1.B1.03` Membaca dan menulis lambang 1-10 ↔ CP Fase A Bilangan [high]
  - "membaca, menulis, menentukan nilai tempat, membandingkan, mengurutkan, serta melakukan komposisi (menyusun) dan dekomposisi (mengurai) bilangan"
- `SD.1.B1.04` Membandingkan jumlah: lebih banyak, lebih sedikit, sama banyak ↔ CP Fase A Bilangan [high]
  - "membandingkan, mengurutkan, serta melakukan komposisi (menyusun) dan dekomposisi (mengurai) bilangan"
- `SD.1.B1.05` Mengurutkan bilangan 1-10 di garis bilangan ↔ CP Fase A Bilangan [high]
  - "membaca, menulis, menentukan nilai tempat, membandingkan, mengurutkan, serta melakukan komposisi (menyusun) dan dekomposisi (mengurai) bilangan"
- `SD.1.B1.06` Pasangan bilangan (number bond) — dekomposisi 1-10 ↔ CP Fase A Bilangan [high]
  - "melakukan komposisi (menyusun) dan dekomposisi (mengurai) bilangan"
- `SD.1.B2.01` Makna penjumlahan — menggabungkan 2 kelompok ↔ CP Fase A Bilangan [high]
  - "melakukan operasi penjumlahan dan pengurangan menggunakan benda-benda konkret yang banyaknya sampai 20"
- `SD.1.B2.02` Penjumlahan s.d. 10 dengan ten-frame (bingkai 10) ↔ CP Fase A Bilangan [high]
  - "melakukan operasi penjumlahan dan pengurangan menggunakan benda-benda konkret yang banyaknya sampai 20"
- `SD.1.B2.03` Doubles (penjumlahan sama) 1+1, 2+2, ..., 5+5 ↔ CP Fase A Bilangan [high]
  - "melakukan operasi penjumlahan dan pengurangan menggunakan benda-benda konkret yang banyaknya sampai 20"
- `SD.1.B2.04` Strategi 'teman sepuluh' (make 10) ↔ CP Fase A Bilangan [medium]
  - "melakukan operasi penjumlahan dan pengurangan menggunakan benda-benda konkret yang banyaknya sampai 20"


## ✗ ERROR

- `SD.1.B9.02` Pola ABB, AAB, ABC — pola lebih kompleks — Expected ',' or '}' after property value in JSON at position 156 (line 5 column 64)
- `SD.1.B9.03` Menciptakan pola sendiri — Expected ',' or '}' after property value in JSON at position 156 (line 5 column 64)

## Cara apply

1. Review section 🚨 NO MATCH — sub-materi yang benar-benar tidak ada di CP 046.
2. Review section ⚠ MATCH FASE LAIN — placement-nya salah, perlu pindah Fase atau untag.
3. Saya jalankan apply script setelah pak ustadz approve.

**Source autoritatif**: `docs/cp046.txt` (Lampiran II BSKAP 046/2025) — extracted ke `scripts/notebooklm/out/cp046-truth.json`. Jauh lebih akurat dari NB Deep Research yang sebelumnya.