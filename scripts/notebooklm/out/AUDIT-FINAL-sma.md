# AUDIT FINAL: Turo Strict vs CP 046 ASLI — SMA

Sumber referensi: `docs/cp046.txt` (BSKAP No. 046/H/KR/2025) — source primer autoritatif.
Method: Claude Sonnet 4.6 + prompt caching (CP 046 raw text di system prompt).
Generated: 2026-05-03

## Summary

| Status | Count | % |
|---|---|---|
| ✓ MATCH Fase SAMA (valid strict) | 84 | 65.1% |
| ⚠ MATCH Fase LAIN (placement mismatch) | 28 | 21.7% |
| 🚨 NO MATCH (tidak di CP 046) | 17 | 13.2% |
| **Total Turo strict** | **129** | 100% |

## 🚨 NO MATCH — Tidak di CP 046 (17 sub)

Sub-materi yang TIDAK ditemukan dalam teks CP 046 manapun. Strong candidate untag → bridge.

### Kelas 10

**Bab 8 — Statistika Data Kelompok** (2 sub):
- `SMA.10.B8.03` Mean, median, modus data kelompok [high]
  - _Alasan_: CP 046 Fase E (Analisis Data dan Peluang) hanya menyebut jangkauan kuartil, interkuartil, box plot, histogram, dot plot, diagram pencar, dan evaluasi laporan statistika — tidak menyebut mean, median, modus, apalagi spesifik untuk data kelompok. Mean/median/modus data kelompok ada di Fase D (SMP) sebagai 'menentukan dan menafsirkan rerata (mean), median, modus, dan jangkauan (range)', bukan di Fase E.
- `SMA.10.B8.05` Varians dan standar deviasi [high]
  - _Alasan_: CP Fase E (Kelas 10) hanya menyebut jangkauan kuartil, interkuartil, box plot, histogram, dot plot, diagram pencar — tidak ada penyebutan varians atau standar deviasi. Topik varians dan standar deviasi tidak muncul di CP 046 manapun, baik Reguler maupun Tingkat Lanjut.

### Kelas 11

**Bab 3 — Program Linear** (3 sub):
- `SMA.11.B3.02` Fungsi objektif/tujuan [high]
  - _Alasan_: Program Linear (termasuk fungsi objektif/tujuan) tidak disebutkan sama sekali di CP 046 Fase F maupun Fase F TL. Fase E menyebut 'sistem pertidaksamaan linear dua variabel' tetapi tidak menyebut program linear, fungsi objektif, atau optimasi LP. Tidak ada kutipan CP yang relevan.
- `SMA.11.B3.03` Metode titik pojok (corner point) [high]
  - _Alasan_: Metode titik pojok (corner point) adalah teknik penyelesaian program linear dengan mengevaluasi fungsi tujuan pada titik-titik pojok daerah feasibel. CP 046 Fase F Wajib maupun Fase F TL (Lanjut) tidak menyebut program linear sama sekali — topik ini tidak ada di bagian manapun dari CP 046/H/KR/2025.
- `SMA.11.B3.04` Aplikasi — produksi, transportasi, diet [high]
  - _Alasan_: Program Linear (termasuk aplikasinya seperti masalah produksi, transportasi, dan diet) tidak disebut sama sekali di CP 046 Fase F Wajib maupun Fase F TL. CP Fase E hanya menyebut 'sistem pertidaksamaan linear dua variabel' tanpa menyinggung program linear atau optimasi LP. Topik ini tidak tercantum di bagian manapun dalam CP 046.

**Bab 6 — Logika Matematika [Mat TL]** (5 sub):
- `SMA.11.B6.01` Proposisi — pernyataan benar/salah [high]
  - _Alasan_: Logika matematika (proposisi, nilai kebenaran pernyataan) tidak disebut sama sekali di CP 046 baik di bagian Matematika Reguler (Fase A–F) maupun Matematika Tingkat Lanjut (Fase F TL). Tidak ada elemen Aljabar, Bilangan, Geometri, maupun Analisis Data yang mencakup topik logika proposisional.
- `SMA.11.B6.02` Negasi, konjungsi (∧), disjungsi (∨) [high]
  - _Alasan_: Logika matematika (negasi, konjungsi, disjungsi) tidak disebut sama sekali di CP 046/H/KR/2025, baik di bagian Matematika Reguler (Fase A–F) maupun Matematika Tingkat Lanjut (Fase F TL). Topik ini merupakan materi kurikulum lama (KTSP/K13) yang tidak lagi tercantum dalam CP 046.
- `SMA.11.B6.03` Implikasi (⇒) dan biimplikasi (⇔) [high]
  - _Alasan_: Logika matematika (implikasi, biimplikasi) tidak disebut sama sekali di CP 046 — baik di Fase F Wajib maupun Fase F TL (Tingkat Lanjut). CP 046 Fase F dan Fase F TL tidak mencakup topik logika proposisional.
- `SMA.11.B6.04` Konvers, invers, kontrapositif [high]
  - _Alasan_: Logika Matematika (konvers, invers, kontrapositif) tidak disebut sama sekali di CP 046, baik di Fase F Wajib maupun Fase F TL (Tingkat Lanjut). CP 046 tidak mencakup topik logika proposisional, implikasi, dan variannya di elemen manapun.
- `SMA.11.B6.05` Penarikan kesimpulan (modus ponens, tollens, silogisme) [high]
  - _Alasan_: Logika matematika (modus ponens, modus tollens, silogisme) tidak disebut sama sekali di CP 046/H/KR/2025, baik di PART A (Reguler Fase A–F) maupun PART B (Tingkat Lanjut Fase F TL). Topik ini adalah warisan kurikulum lama (K13) yang tidak diadopsi ke CP Merdeka 2025.

**Bab 7 — Induksi Matematika [Mat TL]** (4 sub):
- `SMA.11.B7.01` Prinsip induksi — base case & induction step [high]
  - _Alasan_: Induksi matematika (prinsip induksi, base case, induction step) tidak disebut secara eksplisit maupun implisit di CP 046, baik di Fase F Wajib maupun Fase F TL (Tingkat Lanjut). Tidak ada elemen Aljabar, Bilangan, maupun elemen lain di CP yang menyinggung metode pembuktian induksi matematika.
- `SMA.11.B7.02` Pembuktian identitas aritmetika — 1+2+...+n = n(n+1)/2 [high]
  - _Alasan_: Induksi Matematika sebagai metode pembuktian (termasuk pembuktian rumus deret seperti 1+2+...+n = n(n+1)/2) tidak disebutkan secara eksplisit maupun implisit di CP 046 manapun — baik Fase F Wajib maupun Fase F TL (Lanjut). CP Fase F TL menyebut polinomial, matriks, trigonometri, vektor, kalkulus, dan statistik, tetapi tidak menyebut induksi matematika sebagai topik tersendiri.
- `SMA.11.B7.03` Pembuktian keterbagian — contoh: 2^n > n [high]
  - _Alasan_: Induksi Matematika (termasuk pembuktian keterbagian seperti 2^n > n) tidak disebutkan secara eksplisit maupun implisit di CP 046 manapun, baik Fase F Wajib maupun Fase F TL. CP Fase F TL membahas polinomial, matriks, trigonometri, vektor, kalkulus, dan distribusi peluang — tidak ada elemen pembuktian formal/induksi matematika.
- `SMA.11.B7.04` Keterbatasan induksi [high]
  - _Alasan_: Induksi matematika (termasuk keterbatasannya) tidak disebut sama sekali di CP 046 — baik di Fase F Wajib maupun Fase F TL (Tingkat Lanjut). CP 046 Fase F TL menyebut polinomial, matriks, trigonometri, vektor, kalkulus, dan peluang, namun tidak menyinggung induksi matematika sama sekali.

### Kelas 12

**Bab 6 — Dimensi Tiga** (2 sub):
- `SMA.12.B6.01` Titik, garis, bidang dalam ruang [high]
  - _Alasan_: Topik 'titik, garis, bidang dalam ruang' (geometri dimensi tiga) tidak disebut secara eksplisit maupun implisit di CP 046 Fase F Wajib (yang hanya mencakup lingkaran, barisan/deret, fungsi invers/komposisi, dan statistika/peluang) maupun di Fase F TL (yang mencakup vektor bidang datar, lingkaran/elips, polinomial, trigonometri, kalkulus). Tidak ada elemen yang membahas relasi titik-garis-bidang dalam ruang 3D.
- `SMA.12.B6.05` Sudut antara dua garis, garis-bidang, bidang-bidang [high]
  - _Alasan_: Topik 'sudut antara dua garis, garis-bidang, dan bidang-bidang' (dimensi tiga/geometri ruang) tidak disebut eksplisit maupun implisit di CP 046 Fase F Wajib maupun Fase F TL. Fase F Wajib Geometri hanya menyebut 'hubungan antara unsur-unsur lingkaran', sedangkan Fase F TL Geometri mencakup vektor, pembuktian geometris dengan vektor, dan persamaan lingkaran/elips — tidak ada pembahasan sudut dalam dimensi tiga.

**Bab 7 — Irisan Kerucut [Mat TL]** (1 sub):
- `SMA.12.B7.02` Parabola analitik — persamaan dan fokus-direktris [high]
  - _Alasan_: Parabola analitik (irisan kerucut — persamaan, fokus, direktris) tidak disebut di mana pun dalam CP 046, baik di Fase F Reguler/Wajib maupun di Fase F TL (Tingkat Lanjut). CP Fase F TL hanya menyebut lingkaran dan elips ('sifat-sifat geometri dari persamaan lingkaran, elips dan persamaan garis singgung') tanpa menyebut parabola atau hiperbola sebagai irisan kerucut.

## ⚠ MATCH FASE LAIN — Placement mismatch (28 sub)

Sub yang ada di CP 046, tapi di Fase BERBEDA dengan placement Turo.

### Turo Kelas 10 (placement: Fase E (Kelas 10 SMA))

**Bab 1 — Eksponen dan Fungsi Eksponen**:
- `SMA.10.B1.06` Aplikasi — pertumbuhan bunga majemuk [high]
  → CP taruh di **Fase F** (Bilangan)
  - _Kutipan CP_: "menjelaskan barisan dan deret (aritmetika dan geometri), menerapkannya pada beragam masalah terutama masalah bunga tunggal dan majemuk, memodelkan pinjaman dan investasi dengan bunga majemuk dan anuitas"
  - _Alasan_: Bunga majemuk secara eksplisit disebut di CP Fase F (Kelas 11-12), bukan Fase E (Kelas 10). Meskipun topik ini diajarkan dalam konteks eksponen di K10, CP 046 menempatkan bunga majemuk di Fase F elemen Bilangan (barisan/deret dan literasi finansial).

**Bab 4 — Barisan dan Deret Lanjutan**:
- `SMA.10.B4.01` Review barisan & deret aritmetika-geometri (dari K8) [high]
  → CP taruh di **Fase F** (Bilangan)
  - _Kutipan CP_: "Menjelaskan barisan dan deret (aritmetika dan geometri), menerapkannya pada beragam masalah terutama masalah bunga tunggal dan majemuk..."
  - _Alasan_: Barisan dan deret aritmetika-geometri secara eksplisit disebutkan di CP Fase F (Kelas 11-12), bukan Fase E (Kelas 10). Turo menempatkan topik ini di Kelas 10 (Fase E), padahal CP 046 menaruhnya di Fase F — mismatch fase.
- `SMA.10.B4.02` Notasi sigma (Σ) [medium]
  → CP taruh di **Fase F** (Bilangan)
  - _Kutipan CP_: "Menjelaskan barisan dan deret (aritmetika dan geometri), menerapkannya pada beragam masalah terutama masalah bunga tunggal dan majemuk"
  - _Alasan_: Notasi sigma (Σ) adalah notasi formal untuk penulisan deret, yang secara semantik berkaitan dengan topik barisan dan deret. CP 046 menempatkan barisan dan deret di Fase F (Kelas 11-12), bukan Fase E (Kelas 10). Turo menempatkan topik ini di Kelas 10 (Fase E), sehingga terjadi mismatch fase.
- `SMA.10.B4.03` Deret geometri tak hingga konvergen [high]
  → CP taruh di **Fase F** (Bilangan)
  - _Kutipan CP_: "Menjelaskan barisan dan deret (aritmetika dan geometri), menerapkannya pada beragam masalah terutama masalah bunga tunggal dan majemuk..."
  - _Alasan_: Deret geometri (termasuk deret tak hingga konvergen) secara eksplisit disebutkan di CP Fase F (Kelas 11-12 SMA Wajib) elemen Bilangan, bukan di Fase E (Kelas 10). Turo menempatkan topik ini di Kelas 10 (Fase E), sehingga terjadi mismatch fase.
- `SMA.10.B4.05` Bunga majemuk (perluasan K7) [high]
  → CP taruh di **Fase F** (Bilangan)
  - _Kutipan CP_: "memodelkan pinjaman dan investasi dengan bunga majemuk dan anuitas, serta menyelidiki (secara numerik atau grafis) pengaruh masing-masing parameter (suku bunga, periode pembayaran) dalam model tersebut"
  - _Alasan_: Bunga majemuk secara eksplisit disebutkan di CP Fase F (Kelas 11-12 SMA Wajib) pada elemen Bilangan dalam konteks barisan/deret geometri dan pemodelan finansial, bukan di Fase E (Kelas 10). Penempatan Turo di Fase E (K10) tidak sesuai dengan CP yang menempatkan topik ini di Fase F.
- `SMA.10.B4.06` Anuitas sederhana [high]
  → CP taruh di **Fase F** (Bilangan)
  - _Kutipan CP_: "memodelkan pinjaman dan investasi dengan bunga majemuk dan anuitas, serta menyelidiki (secara numerik atau grafis) pengaruh masing-masing parameter (suku bunga, periode pembayaran) dalam model tersebut"
  - _Alasan_: Anuitas secara eksplisit disebut di CP Fase F (Kelas 11-12 SMA Wajib) dalam elemen Bilangan, bukan di Fase E (Kelas 10). Turo menempatkan topik ini di Fase E (K10), sehingga terjadi mismatch fase.

**Bab 5 — Vektor**:
- `SMA.10.B5.01` Pengertian vektor — besar dan arah [high]
  → CP taruh di **Fase F TL** (Geometri [Lanjut])
  - _Kutipan CP_: "Menyatakan vektor pada bidang datar, dan melakukan operasi aljabar pada vektor"
  - _Alasan_: Vektor dalam CP 046 hanya disebut di Fase F TL (Matematika Tingkat Lanjut/Peminatan, Kelas 11-12), bukan di Fase E (Kelas 10). Placement Turo di Fase E tidak sesuai dengan CP yang menempatkan topik vektor di Fase F TL.
- `SMA.10.B5.02` Vektor di bidang koordinat — komponen [high]
  → CP taruh di **Fase F TL** (Geometri [Lanjut])
  - _Kutipan CP_: "Menyatakan vektor pada bidang datar, dan melakukan operasi aljabar pada vektor"
  - _Alasan_: Topik vektor di bidang koordinat (komponen vektor) secara eksplisit disebut di CP 046 Fase F TL (Geometri Lanjut/Peminatan, K11-12), bukan di Fase E (K10). CP Fase E sama sekali tidak menyebut vektor. Placement Turo di Kelas 10 (Fase E) tidak sesuai dengan CP.
- `SMA.10.B5.03` Operasi vektor — penjumlahan & pengurangan [high]
  → CP taruh di **Fase F TL** (Geometri [Lanjut])
  - _Kutipan CP_: "Menyatakan vektor pada bidang datar, dan melakukan operasi aljabar pada vektor"
  - _Alasan_: Operasi vektor (penjumlahan & pengurangan) ada di CP 046, namun hanya di Fase F TL (Matematika Tingkat Lanjut Kelas 11-12), bukan di Fase E (Kelas 10). CP Fase E sama sekali tidak menyebut vektor.
- `SMA.10.B5.04` Perkalian skalar dengan vektor [high]
  → CP taruh di **Fase F TL** (Geometri [Lanjut])
  - _Kutipan CP_: "Menyatakan vektor pada bidang datar, dan melakukan operasi aljabar pada vektor"
  - _Alasan_: Topik vektor (termasuk perkalian skalar dengan vektor) secara eksplisit disebutkan di CP Fase F TL (Matematika Tingkat Lanjut, K11-12), bukan di Fase E (K10). CP Fase E tidak menyebut vektor sama sekali, sehingga placement Turo di Fase E (K10) tidak sesuai dengan CP asli.
- `SMA.10.B5.05` Besar (magnitude) vektor — Pythagoras [high]
  → CP taruh di **Fase F TL** (Geometri [Lanjut])
  - _Kutipan CP_: "Menyatakan vektor pada bidang datar, dan melakukan operasi aljabar pada vektor"
  - _Alasan_: Topik vektor (termasuk besar/magnitude vektor) di CP 046 hanya muncul di Fase F TL (Kelas 11-12 SMA Lanjut/Peminatan), bukan di Fase E (Kelas 10). CP Fase E tidak menyebut vektor sama sekali. Placement Turo di Fase E (K10) tidak sesuai dengan posisi CP asli.
- `SMA.10.B5.06` Vektor di ruang R³ (pengantar) [high]
  → CP taruh di **Fase F TL** (Geometri [Lanjut])
  - _Kutipan CP_: "Menyatakan vektor pada bidang datar, dan melakukan operasi aljabar pada vektor; melakukan pembuktian geometris menggunakan vektor; serta menyatakan sifat-sifat geometri dari persamaan lingkaran, elips dan persamaan garis singgung."
  - _Alasan_: Vektor dalam CP 046 hanya disebutkan di Fase F TL (Matematika Tingkat Lanjut, K11-12), bukan di Fase E (K10). Meskipun hanya disebut 'vektor pada bidang datar' (R²), vektor R³ termasuk dalam cakupan lanjutan dari elemen yang sama. Placement Turo di Fase E (K10) tidak memiliki padanan vektor sama sekali di CP 046.
- `SMA.10.B5.07` Perkalian dot (skalar) pengantar [high]
  → CP taruh di **Fase F TL** (Geometri [Lanjut])
  - _Kutipan CP_: "Menyatakan vektor pada bidang datar, dan melakukan operasi aljabar pada vektor"
  - _Alasan_: Topik vektor (termasuk perkalian dot/skalar) hanya disebut di CP Fase F TL (Matematika Tingkat Lanjut K11-12), bukan di Fase E (K10). CP Fase E sama sekali tidak menyebut vektor; Turo menempatkan topik ini di Kelas 10 (Fase E) yang tidak sesuai dengan CP.

**Bab 7 — Trigonometri Dasar**:
- `SMA.10.B7.04` Grafik fungsi y = sin x dan y = cos x [high]
  → CP taruh di **Fase F TL** (Aljabar dan Fungsi [Lanjut])
  - _Kutipan CP_: "menyatakan fungsi trigonometri menggunakan lingkaran satuan, memodelkan fenomena periodik dengan fungsi trigonometri, dan membuktikan serta menerapkan identitas trigonometri dan aturan cosinus dan sinus"
  - _Alasan_: Grafik fungsi y = sin x dan y = cos x (sebagai fungsi periodik kontinu) secara eksplisit ada di CP Fase F TL (Matematika Tingkat Lanjut K11-12) dalam konteks 'memodelkan fenomena periodik dengan fungsi trigonometri'. CP Fase E (K10) hanya menyebut 'perbandingan trigonometri (sinus, cosinus, tangen) dari sudut lancip' — yakni perbandingan trigonometri statis pada segitiga siku-siku, bukan grafik fungsi trigonometri. Placement Turo di Fase E tidak sesuai dengan letak materi di CP.
- `SMA.10.B7.05` Persamaan trigonometri sederhana [high]
  → CP taruh di **Fase F TL** (Aljabar dan Fungsi)
  - _Kutipan CP_: "menyatakan fungsi trigonometri menggunakan lingkaran satuan, memodelkan fenomena periodik dengan fungsi trigonometri, dan membuktikan serta menerapkan identitas trigonometri dan aturan cosinus dan sinus"
  - _Alasan_: CP Fase E hanya menyebut 'perbandingan trigonometri (sinus, cosinus, tangen) dari sudut lancip' di elemen Geometri — tidak mencakup persamaan trigonometri. Persamaan trigonometri baru muncul di Fase F TL (Matematika Tingkat Lanjut) dalam konteks fungsi trigonometri dan identitas trigonometri. Placement Turo di Fase E tidak sesuai.

**Bab 9 — Peluang Lanjutan**:
- `SMA.10.B9.01` Review peluang dasar (dari K8) [high]
  → CP taruh di **Fase D** (Analisis Data dan Peluang)
  - _Kutipan CP_: "menjelaskan dan menggunakan pengertian peluang dan frekuensi relatif untuk menentukan frekuensi harapan satu kejadian pada suatu percobaan sederhana (semua hasil percobaan dapat muncul secara merata)"
  - _Alasan_: Peluang dasar (percobaan sederhana, frekuensi relatif, frekuensi harapan) secara eksplisit disebut di CP Fase D (SMP K7-K9), bukan di Fase E (K10). Fase E tidak memuat peluang dasar — hanya Fase F wajib dan Fase F TL yang membahas peluang lanjutan (kejadian majemuk, permutasi/kombinasi, distribusi). Konten ini adalah review dari Fase D, sehingga placement di Fase E adalah mismatch fase.
- `SMA.10.B9.02` Kejadian saling lepas vs tidak saling lepas [high]
  → CP taruh di **Fase F** (Analisis Data dan Peluang)
  - _Kutipan CP_: "menyelidiki konsep dari kejadian saling bebas dan saling lepas, dan menentukan peluangnya"
  - _Alasan_: Konsep kejadian saling lepas secara eksplisit disebutkan di CP Fase F (Kelas 11-12 SMA Wajib), bukan Fase E (Kelas 10). Turo menempatkan topik ini di Kelas 10 (Fase E), sehingga terjadi mismatch fase.
- `SMA.10.B9.03` Kejadian saling bebas vs tidak (dependent/independent) [high]
  → CP taruh di **Fase F** (Analisis Data dan Peluang)
  - _Kutipan CP_: "menyelidiki konsep dari kejadian saling bebas dan saling lepas, dan menentukan peluangnya"
  - _Alasan_: Konsep kejadian saling bebas (independent events) secara eksplisit disebut di CP Fase F (Kelas 11-12 SMA Wajib), bukan Fase E (Kelas 10). Turo menempatkan topik ini di Fase E/Kelas 10, sehingga terjadi mismatch fase.
- `SMA.10.B9.04` Frekuensi harapan [high]
  → CP taruh di **Fase D** (Analisis Data dan Peluang)
  - _Kutipan CP_: "menjelaskan dan menggunakan pengertian peluang dan frekuensi relatif untuk menentukan frekuensi harapan satu kejadian pada suatu percobaan sederhana (semua hasil percobaan dapat muncul secara merata)"
  - _Alasan_: Frekuensi harapan secara eksplisit disebut di CP Fase D (SMP K7-9), bukan Fase E (SMA K10). Turo menempatkan topik ini di Kelas 10 (Fase E), tetapi CP Fase E tidak menyebut frekuensi harapan sama sekali; yang ada di Fase E hanya jangkauan kuartil, box plot, histogram, dot plot, dan diagram pencar.
- `SMA.10.B9.05` Nilai harapan (ekspektasi) [high]
  → CP taruh di **Fase F** (Analisis Data dan Peluang)
  - _Kutipan CP_: "menjelaskan peluang dan menentukan frekuensi harapan dari kejadian majemuk"
  - _Alasan_: Nilai harapan (ekspektasi) dalam konteks peluang lanjutan ada di CP Fase F (K11-12) pada elemen Analisis Data dan Peluang, bukan di Fase E (K10). Di Fase E, CP hanya menyebut peluang dalam konteks statistika deskriptif (box plot, histogram, dll) tanpa menyebut nilai harapan/frekuensi harapan kejadian majemuk.

### Turo Kelas 11 (placement: Fase F (Kelas 11-12 SMA Wajib))

**Bab 10 — Turunan Fungsi Aljabar [Mat TL]**:
- `SMA.11.B10.02` Turunan sebagai limit — f'(x) = lim (f(x+h)−f(x))/h [high]
  → CP taruh di **Fase F TL** (Kalkulus)
  - _Kutipan CP_: "Memahami laju perubahan dan laju perubahan rata-rata, serta laju perubahan sesaat sebagai konsep kunci derivatif (turunan), baik secara geometris maupun aljabar; menentukan turunan dari fungsi polinomial, eksponensial, dan trigonometri..."
  - _Alasan_: Topik turunan sebagai limit (definisi formal f'(x) = lim (f(x+h)−f(x))/h) berada di elemen Kalkulus yang hanya ada di PART B — Matematika Tingkat Lanjut (Fase F TL), bukan di Fase F Wajib (PART A). Placement Turo menyatakan 'Fase F (Kelas 11-12 SMA Wajib)' yang merujuk PART A, padahal topik ini hanya tercantum di PART B (Fase F TL/Peminatan).

**Bab 3 — Program Linear**:
- `SMA.11.B3.01` Sistem pertidaksamaan linear dua variabel [high]
  → CP taruh di **Fase E** (Aljabar dan Fungsi)
  - _Kutipan CP_: "Menyelesaikan masalah yang berkaitan dengan sistem pertidaksamaan linear dua variabel"
  - _Alasan_: Sistem pertidaksamaan linear dua variabel secara eksplisit disebut di CP Fase E (Kelas 10), bukan Fase F (Kelas 11-12). Turo menempatkan topik ini di Kelas 11 (Fase F), padahal CP 046 menempatkannya di Fase E.

**Bab 4 — Trigonometri Lanjutan**:
- `SMA.11.B4.02` Aturan cosinus — c² = a² + b² − 2ab cos C [high]
  → CP taruh di **Fase F TL** (Aljabar dan Fungsi)
  - _Kutipan CP_: "membuktikan serta menerapkan identitas trigonometri dan aturan cosinus dan sinus"
  - _Alasan_: Aturan cosinus disebut eksplisit di CP Fase F TL (Tingkat Lanjut/Peminatan), bukan di Fase F Reguler/Wajib. Placement Turo adalah Fase F Wajib (K11-12), sehingga topik ini berada di fase yang berbeda (TL vs Reguler).
- `SMA.11.B4.05` Identitas sudut jumlah dan selisih [high]
  → CP taruh di **Fase F TL** (Aljabar dan Fungsi [Lanjut])
  - _Kutipan CP_: "membuktikan serta menerapkan identitas trigonometri dan aturan cosinus dan sinus"
  - _Alasan_: Identitas sudut jumlah dan selisih adalah bagian dari identitas trigonometri yang secara eksplisit disebut di Fase F TL (Matematika Tingkat Lanjut/Peminatan), bukan di Fase F Wajib. Placement Turo di Fase F (Wajib) tidak sesuai karena CP Fase F Wajib tidak menyebut identitas trigonometri; topik ini ada di PART B Lanjut.

**Bab 9 — Limit Fungsi Aljabar [Mat TL]**:
- `SMA.11.B9.01` Konsep limit — mendekati tapi tidak harus sampai [high]
  → CP taruh di **Fase F TL** (Kalkulus)
  - _Kutipan CP_: "Memahami laju perubahan dan laju perubahan rata-rata, serta laju perubahan sesaat sebagai konsep kunci derivatif (turunan), baik secara geometris maupun aljabar"
  - _Alasan_: Konsep limit fungsi aljabar (mendekati tapi tidak harus sampai) adalah fondasi kalkulus yang secara implisit tercakup dalam elemen Kalkulus CP Fase F TL (Matematika Tingkat Lanjut/Peminatan), bukan di Fase F Wajib. Placement Turo menyebut 'Fase F (Kelas 11-12 SMA Wajib)' dan label bab sendiri sudah mencantumkan '[Mat TL]', sehingga seharusnya ditempatkan di Fase F TL, bukan Fase F reguler wajib.
- `SMA.11.B9.04` Limit di tak hingga [high]
  → CP taruh di **Fase F TL** (Kalkulus)
  - _Kutipan CP_: "Memahami laju perubahan dan laju perubahan rata-rata, serta laju perubahan sesaat sebagai konsep kunci derivatif (turunan), baik secara geometris maupun aljabar; menentukan turunan dari fungsi polinomial, eksponensial, dan trigonometri..."
  - _Alasan_: Limit fungsi (termasuk limit di tak hingga) adalah konsep kalkulus yang secara eksplisit ada di CP Fase F TL (Matematika Tingkat Lanjut/Peminatan) pada elemen Kalkulus, bukan di Fase F Wajib. Placement Turo menyebutkan 'Fase F (Kelas 11-12 SMA Wajib)', namun label bab '[Mat TL]' mengindikasikan ini materi Tingkat Lanjut — sehingga terjadi mismatch fase antara placement (Wajib) dan CP yang sesuai (Fase F TL).

### Turo Kelas 12 (placement: Fase F (Kelas 11-12 SMA Wajib))

**Bab 2 — Aplikasi Turunan [Mat TL]**:
- `SMA.12.B2.02` Fungsi naik, turun, stasioner [high]
  → CP taruh di **Fase F TL** (Kalkulus)
  - _Kutipan CP_: "menentukan turunan dari fungsi polinomial, eksponensial, dan trigonometri, dan menerapkan derivatif untuk membuat sketsa kurva, menghitung gradien dan menentukan persamaan garis singgung, menentukan kecepatan sesaat dan menyelesaikan soal optimasi"
  - _Alasan_: Fungsi naik, turun, dan stasioner adalah konsep inti dalam aplikasi turunan (derivatif) yang tercakup di Fase F TL (Matematika Tingkat Lanjut/Peminatan) pada elemen Kalkulus, bukan di Fase F Wajib. Placement Turo menyebut 'Fase F (Kelas 11-12 SMA Wajib)', padahal topik ini hanya ada di PART B (Lanjut/Peminatan), sehingga terjadi mismatch fase.

**Bab 8 — Kombinatorika**:
- `SMA.12.B8.05` Binomial teorema [medium]
  → CP taruh di **Fase F TL** (Aljabar dan Fungsi [Lanjut])
  - _Kutipan CP_: "Melakukan operasi aritmetika pada polinomial (suku banyak), menentukan faktor polinomial, dan menggunakan identitas polinomial untuk menyelesaikan masalah"
  - _Alasan_: Teorema Binomial berkaitan erat dengan ekspansi polinomial dan identitas polinomial, yang secara eksplisit ada di Fase F TL (Matematika Tingkat Lanjut/Peminatan), bukan di Fase F Wajib. CP Fase F Wajib mencakup barisan/deret, fungsi invers/komposisi, lingkaran, dan statistika — tidak menyebut binomial teorema maupun polinomial. Placement Turo di Fase F (Wajib) tidak tepat; konten ini berada di jalur Lanjut.

## ✓ Sample MATCH FASE SAMA (sanity check, 10 first)

- `SMA.10.B1.01` Review pangkat (bulat positif, nol, negatif, pecahan) ↔ CP Fase E Bilangan [high]
  - "Menggeneralisasi sifat-sifat bilangan berpangkat (termasuk bilangan pangkat pecahan), dan menggunakannya untuk menyelesaikan masalah."
- `SMA.10.B1.02` Persamaan eksponen — basis sama ↔ CP Fase E Aljabar dan Fungsi [high]
  - "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner), serta persamaan eksponensial (berbasis/ bilangan pokok sama) dan fungsi eksponensial"
- `SMA.10.B1.03` Persamaan eksponen — faktorisasi ↔ CP Fase E Aljabar dan Fungsi [high]
  - "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner), serta persamaan eksponensial (berbasis/ bilangan pokok sama) dan fungsi eksponensial"
- `SMA.10.B1.04` Fungsi eksponen f(x) = a^x — grafik ↔ CP Fase E Aljabar dan Fungsi [high]
  - "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner), serta persamaan eksponensial (berbasis/ bilangan pokok sama) dan fungsi eksponensial"
- `SMA.10.B1.05` Pertidaksamaan eksponen ↔ CP Fase E Aljabar dan Fungsi [medium]
  - "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner), serta persamaan eksponensial (berbasis/ bilangan pokok sama) dan fungsi eksponensial"
- `SMA.10.B6.01` Review fungsi kuadrat (dari K9) ↔ CP Fase E Aljabar dan Fungsi [high]
  - "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner)"
- `SMA.10.B6.02` Bentuk kanonik — y = a(x − h)² + k ↔ CP Fase E Aljabar dan Fungsi [high]
  - "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner)"
- `SMA.10.B6.03` Pertidaksamaan kuadrat ↔ CP Fase E Aljabar dan Fungsi [medium]
  - "Menyelesaikan masalah yang berkaitan dengan sistem pertidaksamaan linear dua variabel; menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner)"
- `SMA.10.B6.04` Aplikasi optimasi (luas maksimum, tinggi lemparan) ↔ CP Fase E Aljabar dan Fungsi [high]
  - "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner)"
- `SMA.10.B7.01` Perbandingan trigonometri di segitiga siku-siku ↔ CP Fase E Geometri [high]
  - "Mengaplikasikan perbandingan trigonometri (sinus, cosinus, tangen) dari sudut lancip."


## Cara apply

1. Review section 🚨 NO MATCH — sub-materi yang benar-benar tidak ada di CP 046.
2. Review section ⚠ MATCH FASE LAIN — placement-nya salah, perlu pindah Fase atau untag.
3. Saya jalankan apply script setelah pak ustadz approve.

**Source autoritatif**: `docs/cp046.txt` (Lampiran II BSKAP 046/2025) — extracted ke `scripts/notebooklm/out/cp046-truth.json`. Jauh lebih akurat dari NB Deep Research yang sebelumnya.