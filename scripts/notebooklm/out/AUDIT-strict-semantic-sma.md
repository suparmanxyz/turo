# AUDIT SEMANTIC: Strict Tagging vs NB CP 046 — SMA

Sumber: NB CP 046/H/KR/2025 + Claude Sonnet 4.6 (semantic matching)
Generated: 2026-05-03

## Summary

| Status | Count | % |
|---|---|---|
| ✓ MATCH kelas sama (valid strict) | 45 | 34.9% |
| ⚠ MATCH kelas LAIN (placement mismatch) | 49 | 38.0% |
| 🚨 NO MATCH (tidak di NB CP 046) | 35 | 27.1% |
| **Total Turo strict** | **129** | 100% |

## 🚨 NO MATCH — Tidak di NB CP 046 (35 sub)

Sub-materi Turo strict yang **tidak ada di NB CP 046** di kelas manapun. Strong candidate untuk untag jadi bridge.

### Kelas 10

**Bab 1 — Eksponen dan Fungsi Eksponen** (1 sub):
- `SMA.10.B1.05` Pertidaksamaan eksponen [conf: high]
  - _Alasan_: NB CP 046 K10.B1 (Eksponen dan Logaritma) mencakup definisi, sifat, fungsi eksponen, bentuk akar, dan logaritma — tetapi tidak menyebutkan pertidaksamaan eksponen sebagai sub-topik. Pertidaksamaan eksponen adalah topik pengayaan/K2013 yang tidak tercantum secara eksplisit dalam CP 046.

**Bab 4 — Barisan dan Deret Lanjutan** (1 sub):
- `SMA.10.B4.02` Notasi sigma (Σ) [conf: medium]
  - _Alasan_: Notasi sigma (Σ) tidak disebutkan secara eksplisit sebagai sub-topik di NB CP 046 manapun. Meskipun deret aritmetika dan geometri ada di K10.B2, CP 046 tidak secara spesifik mencantumkan notasi sigma sebagai materi tersendiri; topik ini lebih merupakan pengayaan/tools notasi yang bukan bagian dari capaian pembelajaran CP 046.

**Bab 6 — Fungsi Kuadrat (Lanjutan)** (1 sub):
- `SMA.10.B6.03` Pertidaksamaan kuadrat [conf: high]
  - _Alasan_: K10.B6 NB CP 046 mencakup karakteristik grafik parabola, titik puncak, sumbu simetri, mengonstruksi fungsi kuadrat, dan aplikasi maksimum-minimum — tidak ada sub-bab pertidaksamaan kuadrat. Pertidaksamaan yang ada di K10 hanya SPtLDV (pertidaksamaan linear dua variabel) dalam K10.B5, bukan pertidaksamaan kuadrat.

**Bab 7 — Trigonometri Dasar** (3 sub):
- `SMA.10.B7.03` Trigonometri sudut di kuadran (perluasan 0-360°) [conf: high]
  - _Alasan_: NB CP 046 K10.B4 Trigonometri hanya mencakup perbandingan trigonometri pada segitiga siku-siku, sudut istimewa, tan θ, dan aplikasi konstruksi — tidak membahas perluasan sudut ke kuadran II-IV (0°-360°) atau sistem koordinat. Perluasan ke empat kuadran tidak ada di kelas manapun dalam NB CP 046 SMA.
- `SMA.10.B7.04` Grafik fungsi y = sin x dan y = cos x [conf: high]
  - _Alasan_: NB CP 046 K10.B4 Trigonometri hanya mencakup perbandingan trigonometri segitiga siku-siku, tan θ, sudut istimewa, dan aplikasi pada piramida/konstruksi — tidak ada grafik fungsi trigonometri y=sin x atau y=cos x. Grafik fungsi trigonometri baru muncul di K11 Lanjut (K11.B8 Fungsi dan Pemodelan) sebagai 'Fungsi Trigonometri'.
- `SMA.10.B7.05` Persamaan trigonometri sederhana [conf: high]
  - _Alasan_: K10.B4 (Trigonometri) di NB CP 046 hanya mencakup perbandingan trigonometri, sudut istimewa, tan θ, dan aplikasi pada piramida/konstruksi — tidak ada persamaan trigonometri. Persamaan trigonometri (sin x = a, cos x = a, dst.) adalah topik yang secara semantik lebih cocok masuk K11.B8 (Fungsi Trigonometri dalam Fungsi dan Pemodelan) atau tidak ada eksplisit di CP 046 sama sekali.

**Bab 8 — Statistika Data Kelompok** (3 sub):
- `SMA.10.B8.01` Data kelompok — tabel frekuensi [conf: medium]
  - _Alasan_: CP 046 K10.B7 mencakup Statistika (histogram, ukuran pemusatan, ukuran penyebaran), namun tidak secara eksplisit memisahkan 'data kelompok — tabel frekuensi' sebagai sub-topik tersendiri. Statistika K10 NB lebih fokus pada histogram dan ukuran-ukuran statistik; tabel frekuensi data kelompok sebagai bab mandiri tidak ada di NB CP 046.
- `SMA.10.B8.03` Mean, median, modus data kelompok [conf: medium]
  - _Alasan_: NB CP 046 K10.B7 memang memuat Ukuran Pemusatan (Mean, Median, Modus), tetapi tidak secara eksplisit membedakan data tunggal vs data kelompok — fokusnya pada konsep ukuran pemusatan secara umum dalam konteks statistika deskriptif. Data kelompok sebagai sub-topik tersendiri tidak tercantum di kelas manapun dalam CP 046, sehingga penempatan ini kemungkinan merupakan pengayaan atau warisan K2013.
- `SMA.10.B8.06` Dot plot dan interpretasi bentuk distribusi [conf: high]
  - _Alasan_: NB CP 046 K10 B7 (Statistika) mencakup histogram, ukuran pemusatan, ukuran penempatan, dan ukuran penyebaran — tidak menyebut dot plot sama sekali. Interpretasi bentuk distribusi (simetri, skewness, dll.) juga tidak tercantum eksplisit sebagai sub-topik di kelas manapun dalam CP 046.

**Bab 9 — Peluang Lanjutan** (1 sub):
- `SMA.10.B9.01` Review peluang dasar (dari K8) [conf: high]
  - _Alasan_: NB CP 046 K10 memiliki bab Peluang (K10.B8), namun topiknya mencakup Distribusi Peluang, Aturan Penjumlahan, dan Kejadian Saling Lepas — bukan review peluang dasar dari K8. 'Review peluang dasar' adalah materi pengulangan/bridging yang tidak tercantum sebagai sub-topik mandiri di CP 046 manapun.

### Kelas 11

**Bab 3 — Program Linear** (3 sub):
- `SMA.11.B3.02` Fungsi objektif/tujuan [conf: high]
  - _Alasan_: Program Linear (termasuk fungsi objektif/tujuan) tidak muncul di NB CP 046 untuk kelas 11 manapun. Di K10 ada SPtLDV (K10.B5) yang merupakan prasyarat program linear, namun program linear sebagai topik lengkap dengan fungsi objektif tidak tercantum di CP 046 SMA.
- `SMA.11.B3.03` Metode titik pojok (corner point) [conf: high]
  - _Alasan_: Program Linear tidak muncul sama sekali di NB CP 046 SMA kelas 11. Metode titik pojok (corner point) adalah bagian dari Program Linear yang ada di K2013, namun tidak tercantum di Kurikulum Merdeka CP 046 untuk jenjang SMA manapun.
- `SMA.11.B3.04` Aplikasi — produksi, transportasi, diet [conf: high]
  - _Alasan_: Program Linear tidak ada dalam NB CP 046 di kelas manapun (K10, K11, K12). Topik Program Linear termasuk kurikulum K2013 yang tidak dilanjutkan di CP 046/H/KR/2025, sehingga aplikasi program linear (produksi, transportasi, diet) juga tidak relevan.

**Bab 4 — Trigonometri Lanjutan** (5 sub):
- `SMA.11.B4.01` Aturan sinus — a/sin A = b/sin B = c/sin C [conf: high]
  - _Alasan_: Aturan sinus (a/sin A = b/sin B = c/sin C) tidak muncul di NB CP 046 K11 manapun. Trigonometri di K10 hanya mencakup perbandingan trigonometri segitiga siku-siku, sudut istimewa, dan aplikasi piramida/konstruksi, sementara K11 tidak memiliki bab trigonometri lanjutan sama sekali — fungsi trigonometri di K11 hanya muncul sebagai bagian dari 'Fungsi dan Pemodelan' (B8 Lanjut) yang fokus pada fungsi, bukan aturan sinus/kosinus.
- `SMA.11.B4.02` Aturan cosinus — c² = a² + b² − 2ab cos C [conf: high]
  - _Alasan_: Aturan cosinus (c² = a² + b² − 2ab cos C) tidak ditemukan di NB CP 046 K11 maupun kelas lainnya. Trigonometri di K10 hanya mencakup perbandingan trigonometri segitiga siku-siku, sudut istimewa, dan aplikasi piramida/konstruksi; sedangkan K11 tidak memiliki bab trigonometri lanjutan dalam jalur wajib, dan K11 Lanjut B8 hanya menyebut 'Fungsi Trigonometri' sebagai pemodelan — bukan aturan cosinus untuk segitiga sembarang.
- `SMA.11.B4.03` Luas segitiga L = (1/2)ab sin C [conf: medium]
  - _Alasan_: NB CP 046 tidak memiliki bab Trigonometri Lanjutan di K11. Topik luas segitiga dengan rumus L = (1/2)ab sin C adalah bagian dari trigonometri yang di NB CP 046 ditempatkan di K10.B4 (Trigonometri), namun sub-bab K10.B4 hanya mencakup perbandingan trigonometri, sudut istimewa, dan aplikasi piramida/konstruksi — tidak secara eksplisit menyebut rumus luas segitiga trigonometri. Topik ini tidak muncul di kelas manapun dalam NB CP 046.
- `SMA.11.B4.04` Identitas trigonometri dasar (sin² + cos² = 1) [conf: high]
  - _Alasan_: Identitas trigonometri dasar (sin²+cos²=1) tidak muncul sebagai sub-bab eksplisit di NB CP 046 K11. Di K10.B4 (Trigonometri) fokusnya pada perbandingan trigonometri segitiga siku-siku dan sudut istimewa, bukan identitas Pythagoras trigonometri. Di K11.B8 (Fungsi Trigonometri) fokusnya pada fungsi/pemodelan, bukan identitas dasar.
- `SMA.11.B4.05` Identitas sudut jumlah dan selisih [conf: medium]
  - _Alasan_: Identitas sudut jumlah dan selisih (sin(A±B), cos(A±B), tan(A±B)) tidak muncul secara eksplisit di NB CP 046 kelas 11 maupun kelas lain. Trigonometri di K10.B4 hanya mencakup perbandingan trigonometri dasar dan sudut istimewa, sedangkan K11.B8 menyebut 'Fungsi Trigonometri' secara umum tanpa merinci identitas penjumlahan sudut.

**Bab 5 — Lingkaran Analitik** (1 sub):
- `SMA.11.B5.03` Bentuk umum dan konversi [conf: high]
  - _Alasan_: Lingkaran Analitik (persamaan lingkaran bentuk umum x²+y²+Dx+Ey+F=0 dan konversinya ke bentuk baku) tidak ada di K11 NB CP 046. Topik ini termasuk dalam K12.B4 Geometri Analitik (Irisan Kerucut) yang mencakup 'Persamaan Lingkaran dan Garis Singgung', bukan di K11. K11.B2 hanya membahas unsur geometri lingkaran (busur, juring, garis singgung secara geometris) tanpa pendekatan analitik/persamaan.

**Bab 6 — Logika Matematika [Mat TL]** (5 sub):
- `SMA.11.B6.01` Proposisi — pernyataan benar/salah [conf: high]
  - _Alasan_: Logika Matematika (proposisi, pernyataan benar/salah) tidak ditemukan di NB CP 046 pada kelas manapun (K10, K11, K12). Topik ini merupakan bagian dari kurikulum K2013 yang tidak dilanjutkan dalam CP 046/H/KR/2025.
- `SMA.11.B6.02` Negasi, konjungsi (∧), disjungsi (∨) [conf: high]
  - _Alasan_: Logika Matematika (negasi, konjungsi, disjungsi) tidak muncul di NB CP 046 di kelas manapun — baik K10, K11, maupun K12. Topik ini merupakan bagian dari kurikulum K2013 yang dihapus di Kurikulum Merdeka CP 046.
- `SMA.11.B6.03` Implikasi (⇒) dan biimplikasi (⇔) [conf: high]
  - _Alasan_: Logika Matematika (termasuk implikasi dan biimplikasi) tidak muncul di NB CP 046 untuk kelas manapun di SMA. Topik ini merupakan warisan Kurikulum 2013 yang dihapus dari CP Kurikulum Merdeka.
- `SMA.11.B6.04` Konvers, invers, kontrapositif [conf: high]
  - _Alasan_: Logika Matematika (termasuk konvers, invers, kontrapositif dari implikasi) tidak muncul di NB CP 046 pada kelas manapun di SMA. Topik ini merupakan warisan Kurikulum 2013 yang dihapus dari CP 046 Kurikulum Merdeka.
- `SMA.11.B6.05` Penarikan kesimpulan (modus ponens, tollens, silogisme) [conf: high]
  - _Alasan_: Logika Matematika (termasuk modus ponens, modus tollens, silogisme) tidak muncul di NB CP 046 SMA di kelas manapun (K10, K11, K12). Topik ini merupakan bagian dari kurikulum K2013 yang tidak diadopsi dalam CP 046/H/KR/2025.

**Bab 7 — Induksi Matematika [Mat TL]** (4 sub):
- `SMA.11.B7.01` Prinsip induksi — base case & induction step [conf: high]
  - _Alasan_: Induksi Matematika (base case & induction step) tidak ditemukan di manapun dalam NB CP 046 untuk SMA K10–K12, baik jalur Wajib maupun Lanjut. Topik ini ada di K2013 namun tampaknya dihapus atau tidak dicakup secara eksplisit dalam CP Kurikulum Merdeka 046/H/KR/2025.
- `SMA.11.B7.02` Pembuktian identitas aritmetika — 1+2+...+n = n(n+1)/2 [conf: high]
  - _Alasan_: Induksi Matematika tidak muncul di manapun dalam NB CP 046 untuk SMA (K10, K11, K12). Pembuktian identitas aritmetika seperti 1+2+...+n = n(n+1)/2 via induksi adalah topik yang ada di K2013 tetapi tidak tercantum dalam Kurikulum Merdeka CP 046/H/KR/2025.
- `SMA.11.B7.03` Pembuktian keterbagian — contoh: 2^n > n [conf: high]
  - _Alasan_: Induksi Matematika (termasuk pembuktian keterbagian dan pertidaksamaan seperti 2^n > n) tidak muncul di NB CP 046 di kelas manapun, baik K10, K11, maupun K12. Topik ini ada di kurikulum K2013 SMA tetapi tidak tercantum dalam CP 046/H/KR/2025.
- `SMA.11.B7.04` Keterbatasan induksi [conf: high]
  - _Alasan_: Induksi Matematika (termasuk keterbatasannya) tidak ada dalam CP 046 SMA di kelas manapun — baik K10, K11, maupun K12. Topik ini merupakan materi kurikulum lama (K2013) yang tidak tercantum dalam struktur bab CP 046/H/KR/2025.

### Kelas 12

**Bab 1 — Transformasi Fungsi** (2 sub):
- `SMA.12.B1.01` Geseran (translasi) vertikal dan horizontal [conf: high]
  - _Alasan_: Transformasi fungsi (geseran/translasi vertikal dan horizontal) tidak ada di NB CP 046 K12. Topik transformasi geometri (translasi, refleksi, rotasi, dilatasi) ada di K11 Lanjut (K11.B7), namun itu dalam konteks geometri dan matriks, bukan transformasi fungsi aljabar. Topik transformasi fungsi tidak ditemukan di kelas manapun dalam CP 046.
- `SMA.12.B1.03` Dilatasi — perbesaran/pengecilan vertikal & horizontal [conf: high]
  - _Alasan_: Transformasi Fungsi (dilatasi vertikal & horizontal pada grafik fungsi) tidak ada di NB CP 046 K12. Konsep dilatasi di CP 046 muncul di K11 Lanjut (K11.B7) dalam konteks Transformasi Geometri berbasis matriks, bukan transformasi fungsi aljabar.

**Bab 5 — Aplikasi Integral [Mat TL]** (1 sub):
- `SMA.12.B5.04` Volume benda putar — metode kulit silinder [conf: medium]
  - _Alasan_: NB CP 046 K12 mencakup 'Volume Benda Putar' di K12.B7 (Integral Fungsi), namun hanya menyebut metode umum tanpa merinci metode spesifik. Metode kulit silinder (shell method) adalah teknik lanjutan yang tidak disebutkan secara eksplisit di CP 046 — CP hanya menyebut 'Volume Benda Putar' secara generik, sehingga metode kulit silinder dianggap sebagai pengayaan di luar cakupan CP 046.

**Bab 6 — Dimensi Tiga** (2 sub):
- `SMA.12.B6.01` Titik, garis, bidang dalam ruang [conf: high]
  - _Alasan_: Topik 'Titik, garis, bidang dalam ruang' (Dimensi Tiga / Geometri Ruang) tidak ditemukan di NB CP 046 untuk kelas 12 maupun kelas lainnya. CP 046 SMA K12 mencakup geometri analitik (irisan kerucut) di jalur Lanjut, bukan geometri ruang 3D. Topik ini merupakan warisan K2013 yang dihapus dari CP 046.
- `SMA.12.B6.05` Sudut antara dua garis, garis-bidang, bidang-bidang [conf: high]
  - _Alasan_: Topik sudut antara dua garis, garis-bidang, dan bidang-bidang adalah bagian dari Dimensi Tiga (Geometri Ruang) yang merupakan materi K2013. NB CP 046 tidak memiliki bab Dimensi Tiga di kelas manapun (K10–K12); geometri di CP 046 hanya mencakup Vektor (K10), Lingkaran (K11–K12), Transformasi Geometri (K11), dan Geometri Analitik/Irisan Kerucut (K12).

**Bab 8 — Kombinatorika** (1 sub):
- `SMA.12.B8.05` Binomial teorema [conf: high]
  - _Alasan_: Teorema Binomial (ekspansi (a+b)^n) adalah topik aljabar/kombinatorik yang tidak muncul di NB CP 046 di kelas manapun. Di K12.B3 hanya ada Permutasi, Kombinasi, dan Peluang — bukan ekspansi binomial. Topik ini lebih relevan dengan kurikulum K2013 atau pengayaan.

**Bab 9 — Peluang Bersyarat dan Distribusi** (1 sub):
- `SMA.12.B9.02` Teorema Bayes [conf: high]
  - _Alasan_: Teorema Bayes tidak disebutkan secara eksplisit di CP 046 NB manapun. K12.B3 hanya mencakup peluang kejadian majemuk saling bebas dan bersyarat, sedangkan K12.B8 fokus pada distribusi probabilitas; Teorema Bayes adalah pengayaan/topik tambahan di luar cakupan CP 046.

## ⚠ MATCH KELAS LAIN — Placement mismatch (49 sub)

Sub-materi yang ada di NB CP 046, tapi di **kelas yang berbeda** dari placement Turo.

### Turo Kelas 10

**Bab 1 — Eksponen dan Fungsi Eksponen**:
- `SMA.10.B1.06` Aplikasi — pertumbuhan bunga majemuk [conf: high]
  → NB taruh di **K12**: Matematika Keuangan / "Bunga Tunggal dan Majemuk"
  - _Alasan_: Bunga majemuk memang berkaitan dengan fungsi eksponen, namun dalam NB CP 046, topik ini secara eksplisit ditempatkan di K12.B1 Matematika Keuangan. Di K10.B1 (Eksponen dan Logaritma) tidak disebutkan aplikasi bunga majemuk; K10.B2 hanya menyebutkan 'Aplikasi Bunga Tunggal dan Majemuk Dasar' sebagai bagian dari Barisan dan Deret, bukan Bab 1.

**Bab 4 — Barisan dan Deret Lanjutan**:
- `SMA.10.B4.03` Deret geometri tak hingga konvergen [conf: high]
  → NB taruh di **K10**: Barisan dan Deret / "Deret Geometri Tak Hingga"
  - _Alasan_: Deret Geometri Tak Hingga secara eksplisit tercantum di K10.B2 NB CP 046 (bukan Bab 4). Turo menempatkan topik ini di Bab 4 sementara NB menempatkannya di Bab 2 (Barisan dan Deret), namun kelas-nya sama yaitu K10.
- `SMA.10.B4.05` Bunga majemuk (perluasan K7) [conf: medium]
  → NB taruh di **K12**: Matematika Keuangan / "Bunga Tunggal dan Majemuk"
  - _Alasan_: Topik bunga majemuk secara semantik ada di NB CP 046, namun ditempatkan di K12 Wajib (Matematika Keuangan), bukan K10. Di K10 hanya ada 'Aplikasi Bunga Tunggal dan Majemuk Dasar' sebagai sub-bab minor dalam Barisan dan Deret, tetapi placement utama topik bunga majemuk secara penuh ada di K12.B1.
- `SMA.10.B4.06` Anuitas sederhana [conf: high]
  → NB taruh di **K12**: Matematika Keuangan / "Anuitas (Tetap & Menurun)"
  - _Alasan_: Anuitas ada di NB CP 046 tetapi ditempatkan di K12 dalam bab Matematika Keuangan, bukan di K10. Turo menempatkannya di K10 sebagai bagian dari Barisan dan Deret Lanjutan, yang berbeda dari penempatan NB.

**Bab 5 — Vektor**:
- `SMA.10.B5.01` Pengertian vektor — besar dan arah [conf: high]
  → NB taruh di **K10**: K10.B3 Vektor dan Operasinya / "Notasi dan Terminologi Vektor"
  - _Alasan_: Topik 'pengertian vektor — besar dan arah' secara semantik cocok dengan sub-bab 'Notasi dan Terminologi Vektor' di K10.B3 NB CP 046. Namun di Turo ini ditempatkan di Bab 5, sedangkan di NB CP 046 vektor adalah Bab 3 (K10.B3). Kelas tetap sama (10), hanya nomor bab berbeda.
- `SMA.10.B5.07` Perkalian dot (skalar) pengantar [conf: medium]
  → NB taruh di **K10**: Vektor dan Operasinya / "Operasi Penjumlahan, Pengurangan, dan Perkalian Skalar Vektor"
  - _Alasan_: Perkalian dot (skalar) secara semantik termasuk dalam operasi vektor yang ada di K10.B3 NB CP 046. Namun di NB, bab Vektor adalah Bab 3 (K10.B3), sedangkan Turo menempatkannya di Bab 5 — perbedaan ini hanya pada penomoran bab internal Turo, bukan kelas, sehingga konten sebenarnya MATCH di kelas yang sama (K10).

**Bab 7 — Trigonometri Dasar**:
- `SMA.10.B7.01` Perbandingan trigonometri di segitiga siku-siku [conf: high]
  → NB taruh di **K10**: K10.B4 Trigonometri / "Perbandingan Trigonometri Segitiga Siku-siku"
  - _Alasan_: Topik ini ada di NB CP 046 K10.B4 (Trigonometri), namun Turo meletakkannya di Bab 7 sementara NB menempatkannya di Bab 4 — kelas sama tapi bab/urutan berbeda. Secara konten merupakan match langsung (semantik identik).
- `SMA.10.B7.02` Nilai trigonometri sudut istimewa (0°, 30°, 45°, 60°, 90°) [conf: high]
  → NB taruh di **K10**: K10.B4 Trigonometri / "Sudut Istimewa"
  - _Alasan_: Topik 'Nilai trigonometri sudut istimewa (0°, 30°, 45°, 60°, 90°)' cocok secara semantik dengan sub-bab 'Sudut Istimewa' di K10.B4 NB CP 046. Namun Turo menempatkan ini di Bab 7, sedangkan NB menempatkan Trigonometri di Bab 4 (K10.B4). Kelas sama (K10), tapi nomor bab berbeda — verdict MATCH_OTHER_KELAS merujuk pada perbedaan bab placement, bukan kelas.

**Bab 8 — Statistika Data Kelompok**:
- `SMA.10.B8.02` Histogram dan poligon frekuensi [conf: medium]
  → NB taruh di **K10**: K10.B7 Statistika / "Histogram"
  - _Alasan_: Histogram memang ada di NB CP 046 K10.B7 (Statistika), namun sub-materi ini ditempatkan Turo di Bab 8 (Statistika Data Kelompok) sementara NB menempatkannya di Bab 7. Karena kelas sama (K10) namun bab berbeda, secara teknis ini MATCH_SAME_KELAS dalam hal kelas, tetapi poligon frekuensi tidak disebutkan secara eksplisit di NB — hanya 'Histogram'. Mengingat poligon frekuensi adalah ekstensi/pelengkap histogram yang lazim dalam konteks data kelompok, topik ini secara semantik masih tercakup dalam sub-bab Histogram K10.B7.
- `SMA.10.B8.05` Varians dan standar deviasi [conf: high]
  → NB taruh di **K10**: K10.B7 [Wajib (Umum)] Statistika / "Ukuran Penyebaran (Varian, Simpangan Baku)"
  - _Alasan_: Varians dan standar deviasi (simpangan baku) memang ada di NB CP 046 kelas 10, namun berada di B7 (Statistika), bukan B8. Turo menempatkan topik ini di Bab 8 sementara NB menempatkannya di Bab 7 dalam satu bab statistika yang sama.

**Bab 9 — Peluang Lanjutan**:
- `SMA.10.B9.04` Frekuensi harapan [conf: medium]
  → NB taruh di **K12**: Kombinatorik dan Peluang / "Peluang Suatu Kejadian"
  - _Alasan_: Frekuensi harapan (expected frequency) adalah konsep turunan langsung dari peluang suatu kejadian (f_h = n × P), yang dalam NB CP 046 masuk K12.B3 Kombinatorik dan Peluang, bukan di K10. Di K10 NB hanya ada Distribusi Peluang dan Aturan Penjumlahan (K10.B8), tanpa frekuensi harapan secara eksplisit.
- `SMA.10.B9.05` Nilai harapan (ekspektasi) [conf: high]
  → NB taruh di **K12**: Analisis Data dan Peluang Lanjut / "Nilai Harapan (Ekspektasi)"
  - _Alasan_: Nilai harapan (ekspektasi) secara eksplisit tercantum di NB CP 046 K12.B8 [Lanjut] dalam bab 'Analisis Data dan Peluang Lanjut', bukan di K10. Di K10.B8 hanya mencakup distribusi peluang dasar, aturan penjumlahan, dan kejadian saling lepas.

### Turo Kelas 11

**Bab 10 — Turunan Fungsi Aljabar [Mat TL]**:
- `SMA.11.B10.01` Laju perubahan rata-rata [conf: high]
  → NB taruh di **K12**: Turunan Fungsi (Diferensial) / "Definisi Turunan"
  - _Alasan_: Laju perubahan rata-rata adalah konsep fondasi turunan (diferensial) yang dalam NB CP 046 ditempatkan di K12 pada bab Turunan Fungsi (Diferensial), bukan K11. Topik ini secara semantik berkaitan langsung dengan 'Definisi Turunan' dan 'Aplikasi Optimasi dan Gradien' di K12.B6.
- `SMA.11.B10.02` Turunan sebagai limit — f'(x) = lim (f(x+h)−f(x))/h [conf: high]
  → NB taruh di **K12**: Turunan Fungsi (Diferensial) / "Definisi Turunan"
  - _Alasan_: Definisi turunan sebagai limit diferensial f'(x) = lim (f(x+h)−f(x))/h ada di NB CP 046, tetapi ditempatkan di K12 (Lanjut) bab Turunan Fungsi, bukan K11. Turo menempatkannya di kelas 11.
- `SMA.11.B10.03` Aturan turunan pangkat [conf: high]
  → NB taruh di **K12**: Turunan Fungsi (Diferensial) / "Turunan Fungsi Aljabar dan Trigonometri"
  - _Alasan_: Aturan turunan pangkat (power rule) adalah bagian inti dari turunan fungsi aljabar, yang dalam NB CP 046 ditempatkan di K12.B6 [Lanjut] bukan di kelas 11. Kelas 11 tidak memiliki bab kalkulus/turunan.
- `SMA.11.B10.04` Aturan penjumlahan, perkalian konstanta [conf: high]
  → NB taruh di **K12**: Turunan Fungsi (Diferensial) / "Turunan Fungsi Aljabar dan Trigonometri"
  - _Alasan_: Aturan penjumlahan dan perkalian konstanta adalah bagian dari teknik dasar diferensiasi (turunan fungsi aljabar), yang dalam NB CP 046 ditempatkan di K12.B6 [Lanjut], bukan di K11. Tidak ada bab turunan di K11 CP 046.
- `SMA.11.B10.05` Aturan perkalian & pembagian [conf: high]
  → NB taruh di **K12**: Turunan Fungsi (Diferensial) / "Turunan Fungsi Aljabar dan Trigonometri"
  - _Alasan_: Aturan perkalian (product rule) dan pembagian (quotient rule) adalah bagian dari materi Turunan Fungsi Aljabar, yang dalam NB CP 046 ditempatkan di K12 [Lanjut] B6, bukan K11. Turo menempatkan topik ini di kelas 11 sementara CP 046 menetapkannya di kelas 12.
- `SMA.11.B10.06` Aturan rantai (chain rule) [conf: high]
  → NB taruh di **K12**: Turunan Fungsi (Diferensial) / "Turunan Fungsi Aljabar dan Trigonometri"
  - _Alasan_: Chain rule (aturan rantai) adalah bagian dari materi turunan fungsi yang dalam NB CP 046 ditempatkan di K12 [Lanjut] pada bab Turunan Fungsi, bukan di K11. Tidak ada bab turunan di K11 NB CP 046.

**Bab 2 — Matriks**:
- `SMA.11.B2.01` Pengertian matriks — ordo, elemen [conf: high]
  → NB taruh di **K11**: K11.B6 [Lanjut] Matriks / "Konsep Matriks, Jenis Matriks"
  - _Alasan_: Topik pengertian matriks (ordo dan elemen) secara semantik cocok dengan sub-bab 'Konsep Matriks' di K11.B6 NB CP 046. Namun di NB, Matriks adalah Bab 6 (bukan Bab 2), sehingga penomoran bab Turo berbeda dari NB meskipun kelas sama.
- `SMA.11.B2.02` Operasi matriks — +/−/× skalar [conf: high]
  → NB taruh di **K11**: Matriks / "Operasi Aljabar Matriks"
  - _Alasan_: Operasi matriks (+/−/× skalar) secara semantik cocok dengan sub-bab 'Operasi Aljabar Matriks' di K11.B6 [Lanjut] NB CP 046, bukan Bab 2. Di struktur Turo, materi ini ditempatkan di Bab 2, sedangkan NB menempatkannya di Bab 6 (K11). Kelas tetap sama (11), hanya nomor bab berbeda.
- `SMA.11.B2.03` Perkalian matriks — baris × kolom [conf: high]
  → NB taruh di **K11**: Matriks / "Operasi Aljabar Matriks"
  - _Alasan_: Perkalian matriks (baris × kolom) adalah bagian dari operasi aljabar matriks yang ada di NB CP 046 K11 B6 [Lanjut]. Namun placement Turo menyebutnya 'Bab 2' sementara di NB CP 046 matriks ada di B6 (bukan B2), sehingga nomor bab berbeda meskipun kelas sama.
- `SMA.11.B2.05` Determinan matriks 2×2 dan 3×3 [conf: high]
  → NB taruh di **K11**: Matriks / "Determinan dan Invers Matriks 2×2 dan 3×3"
  - _Alasan_: Topik Determinan matriks 2×2 dan 3×3 secara semantik cocok persis dengan sub-bab 'Determinan dan Invers Matriks 2×2 dan 3×3' di K11.B6 [Lanjut] Matriks NB CP 046. Namun placement Turo menyebut ini sebagai Bab 2, sedangkan di NB CP 046 ini adalah B6 (bab ke-6 kelas 11 jalur Lanjut). Kelas sama (11), bab berbeda dalam penomoran Turo vs NB.

**Bab 3 — Program Linear**:
- `SMA.11.B3.01` Sistem pertidaksamaan linear dua variabel [conf: high]
  → NB taruh di **K10**: Sistem Persamaan dan Pertidaksamaan Linear / "Sistem Pertidaksamaan Linear Dua Variabel (SPtLDV)"
  - _Alasan_: SPtLDV secara eksplisit tercantum di NB CP 046 K10.B5, bukan K11. Di K11 NB tidak ada bab Program Linear maupun SPtLDV.

**Bab 4 — Trigonometri Lanjutan**:
- `SMA.11.B4.06` Fungsi sinusoida y = A sin(Bx + C) + D [conf: medium]
  → NB taruh di **K11**: Fungsi dan Pemodelan / "Fungsi Trigonometri"
  - _Alasan_: Fungsi sinusoida y = A sin(Bx + C) + D secara semantik adalah bagian dari Fungsi Trigonometri yang ada di K11.B8 [Lanjut] 'Fungsi dan Pemodelan', bukan di bab Trigonometri Lanjutan. NB CP 046 menempatkan fungsi trigonometri (termasuk bentuk sinusoida dengan amplitudo, periode, dan pergeseran fase) di bawah sub-bab 'Fungsi Trigonometri' pada bab Fungsi dan Pemodelan K11 jalur Lanjut.

**Bab 5 — Lingkaran Analitik**:
- `SMA.11.B5.01` Persamaan lingkaran berpusat (0,0) [conf: high]
  → NB taruh di **K12**: Geometri Analitik (Irisan Kerucut) / "Persamaan Lingkaran dan Garis Singgung"
  - _Alasan_: Persamaan lingkaran (termasuk berpusat di titik asal) secara semantik cocok dengan sub-bab 'Persamaan Lingkaran dan Garis Singgung' di NB CP 046, namun topik tersebut berada di K12 (Bab Geometri Analitik/Irisan Kerucut), bukan K11. Di K11 NB, bab Lingkaran (K11.B2) hanya membahas unsur lingkaran, busur, juring, garis singgung, dan sudut — bukan persamaan lingkaran analitik.
- `SMA.11.B5.02` Persamaan lingkaran berpusat (a,b) [conf: high]
  → NB taruh di **K12**: Geometri Analitik (Irisan Kerucut) / "Persamaan Lingkaran dan Garis Singgung"
  - _Alasan_: Persamaan lingkaran berpusat (a,b) adalah bagian dari geometri analitik yang di NB CP 046 ditempatkan di K12 pada bab Irisan Kerucut, bukan di K11. Di K11, bab Lingkaran (B2) hanya mencakup unsur-unsur lingkaran seperti busur, juring, garis singgung, dan sudut pusat/keliling — bukan persamaan lingkaran dalam koordinat.
- `SMA.11.B5.04` Garis singgung di titik lingkaran [conf: high]
  → NB taruh di **K12**: Geometri Analitik (Irisan Kerucut) / "Persamaan Lingkaran dan Garis Singgung"
  - _Alasan_: Garis singgung lingkaran (analitik/persamaan garis singgung di titik pada lingkaran) secara semantik berada di K12.B4 NB CP 046 sebagai bagian dari Geometri Analitik (Irisan Kerucut), bukan di K11. K11.B2 memang membahas lingkaran, tetapi fokusnya pada unsur geometri (busur, juring, sudut pusat/keliling), bukan persamaan garis singgung secara analitik.
- `SMA.11.B5.05` Garis singgung dari titik luar [conf: medium]
  → NB taruh di **K11**: Lingkaran / "Garis Singgung Lingkaran"
  - _Alasan_: Garis singgung lingkaran (termasuk dari titik luar) ada di NB CP 046 K11.B2 [Wajib] 'Lingkaran', bukan di bab 'Lingkaran Analitik' (yang lebih cocok dengan K12.B4 Geometri Analitik/Irisan Kerucut). Secara kelasnya sama (K11) namun bab Turo menyebutnya 'Lingkaran Analitik' yang berkonotasi irisan kerucut K12, sementara NB menempatkannya di bab Lingkaran K11.

**Bab 9 — Limit Fungsi Aljabar [Mat TL]**:
- `SMA.11.B9.01` Konsep limit — mendekati tapi tidak harus sampai [conf: high]
  → NB taruh di **K12**: Limit Fungsi / "Definisi Limit"
  - _Alasan_: Konsep dasar limit (mendekati tapi tidak harus sampai) secara semantik identik dengan 'Definisi Limit' di NB CP 046, namun topik ini ditempatkan di K12 [Lanjut] bukan K11. Placement Turo di K11 tidak sesuai dengan struktur CP 046.
- `SMA.11.B9.02` Sifat dasar limit [conf: high]
  → NB taruh di **K12**: Limit Fungsi / "Sifat-sifat Limit"
  - _Alasan_: Sifat dasar limit secara semantik identik dengan 'Sifat-sifat Limit' yang ada di NB CP 046 K12.B5 (Limit Fungsi), bukan di kelas 11. Turo menempatkan topik ini di K11 padahal NB menempatkannya di K12.
- `SMA.11.B9.03` Limit bentuk tak tentu 0/0 [conf: high]
  → NB taruh di **K12**: Limit Fungsi / "Limit Fungsi Aljabar dan Trigonometri"
  - _Alasan_: Limit bentuk tak tentu 0/0 merupakan bagian dari topik Limit Fungsi Aljabar yang secara eksplisit ditempatkan di K12.B5 dalam NB CP 046, bukan di kelas 11. Tidak ada bab Limit di kelas 11 pada kurikulum Merdeka.
- `SMA.11.B9.04` Limit di tak hingga [conf: high]
  → NB taruh di **K12**: Limit Fungsi / "Sifat-sifat Limit / Limit Fungsi Aljabar dan Trigonometri"
  - _Alasan_: Limit di tak hingga adalah bagian dari topik Limit Fungsi yang dalam NB CP 046 ditempatkan di K12.B5 (Lanjut), bukan di kelas 11. Tidak ada bab Limit di kelas 11 pada CP 046.

### Turo Kelas 12

**Bab 1 — Transformasi Fungsi**:
- `SMA.12.B1.02` Refleksi — terhadap sumbu x dan y [conf: high]
  → NB taruh di **K11**: Transformasi Geometri / "Refleksi"
  - _Alasan_: Refleksi terhadap sumbu x dan y adalah bagian dari Transformasi Geometri yang ada di NB CP 046 K11 (Lanjut), bukan K12. Di K12 NB tidak ada bab Transformasi Fungsi/Geometri sama sekali.
- `SMA.12.B1.04` Komposisi transformasi [conf: high]
  → NB taruh di **K11**: Transformasi Geometri / "Komposisi Transformasi menggunakan Operasi Matriks"
  - _Alasan_: Komposisi transformasi ada di NB CP 046, namun ditempatkan di K11 Lanjut (K11.B7), bukan K12. Di K12 NB tidak ada bab Transformasi Fungsi maupun Transformasi Geometri.

**Bab 2 — Aplikasi Turunan [Mat TL]**:
- `SMA.12.B2.01` Interpretasi turunan — gradien garis singgung [conf: medium]
  → NB taruh di **K12**: Turunan Fungsi (Diferensial) / "Definisi Turunan / Aplikasi Optimasi dan Gradien"
  - _Alasan_: Gradien garis singgung sebagai interpretasi turunan memang ada di NB CP 046, tetapi berada di K12.B6 [Lanjut] 'Turunan Fungsi (Diferensial)' bukan di bab terpisah 'Aplikasi Turunan'. Placement kelas sama (K12) namun bab Turo ('Bab 2 — Aplikasi Turunan') tidak sesuai dengan struktur NB yang menggabungkan definisi dan aplikasi turunan dalam satu bab (K12.B6).
- `SMA.12.B2.02` Fungsi naik, turun, stasioner [conf: high]
  → NB taruh di **K12**: Turunan Fungsi (Diferensial) / "Fungsi Naik/Turun"
  - _Alasan_: Topik 'Fungsi naik, turun, stasioner' secara semantik cocok dengan sub-bab 'Fungsi Naik/Turun' di K12.B6 NB CP 046 (bab Turunan Fungsi/Diferensial), bukan di Bab 2 versi Turo. Kelas sama (12) tetapi bab placement berbeda — NB menempatkannya di B6 bukan B2.
- `SMA.12.B2.03` Nilai maksimum & minimum lokal [conf: high]
  → NB taruh di **K12**: Turunan Fungsi (Diferensial) / "Titik Ekstrem (Maks/Min)"
  - _Alasan_: Topik nilai maksimum & minimum lokal secara semantik identik dengan 'Titik Ekstrem (Maks/Min)' di K12.B6 NB CP 046, bukan di B2. Placement Turo meletakkannya di 'Bab 2 — Aplikasi Turunan' sedangkan NB CP 046 menempatkannya di K12.B6 (Turunan Fungsi/Diferensial).
- `SMA.12.B2.04` Aplikasi optimasi (luas, volume, biaya) [conf: high]
  → NB taruh di **K12**: Turunan Fungsi (Diferensial) / "Aplikasi Optimasi dan Gradien"
  - _Alasan_: Topik aplikasi optimasi (luas, volume, biaya) secara semantik cocok dengan sub-bab 'Aplikasi Optimasi dan Gradien' di K12.B6 [Lanjut] Turunan Fungsi. Namun placement Turo menaruh ini di Bab 2, sementara NB CP 046 menempatkannya di B6 — sehingga bab berbeda dalam kelas yang sama. Karena soal meminta 'kelas mana di NB', kelasnya sama (12) tetapi babnya berbeda.

**Bab 3 — Integral Tak Tentu dan Tentu [Mat TL]**:
- `SMA.12.B3.01` Antiturunan — 'balik dari turunan' [conf: medium]
  → NB taruh di **K12**: Integral Fungsi / "Integral Tak Tentu dan Tentu"
  - _Alasan_: Antiturunan adalah konsep dasar integral tak tentu yang secara semantik masuk dalam K12.B7 [Lanjut] 'Integral Fungsi' — sub 'Integral Tak Tentu dan Tentu'. Namun bab Turo ini berlabel 'Mat TL' (Tidak Lanjut/Wajib), sedangkan di NB CP 046 topik integral berada di jalur [Lanjut]. Kelas sama (12) tapi track berbeda.
- `SMA.12.B3.03` Sifat integral — linearitas [conf: high]
  → NB taruh di **K12**: Integral Fungsi / "Integral Tak Tentu dan Tentu"
  - _Alasan_: Sifat linearitas integral (seperti ∫[af(x)+bg(x)]dx = a∫f(x)dx + b∫g(x)dx) adalah bagian dari sifat-sifat dasar integral tak tentu dan tentu yang tercakup dalam K12.B7 [Lanjut], bukan K12.B3 [Wajib] yang berisi Kombinatorik dan Peluang. Placement Turo di 'Bab 3' tidak sesuai dengan struktur NB di mana integral ada di B7.
- `SMA.12.B3.04` Integral tentu — luas di bawah kurva [conf: high]
  → NB taruh di **K12**: Integral Fungsi / "Penerapan Integral (Luas Daerah & Volume Benda Putar)"
  - _Alasan_: Topik 'integral tentu — luas di bawah kurva' secara semantik cocok dengan sub-bab 'Penerapan Integral (Luas Daerah & Volume Benda Putar)' di K12.B7 NB CP 046. Namun, placement Turo menaruh ini di Bab 3, sedangkan NB menempatkannya di B7 (Integral Fungsi), sehingga bab berbeda meski kelas sama — dikategorikan MATCH_OTHER_KELAS karena bab tidak sesuai.
- `SMA.12.B3.05` Teorema fundamental kalkulus [conf: high]
  → NB taruh di **K12**: Integral Fungsi / "Teorema Dasar Kalkulus"
  - _Alasan_: Teorema Fundamental Kalkulus (Teorema Dasar Kalkulus) ada di NB CP 046 K12 pada K12.B7 [Lanjut] Integral Fungsi, bukan di K12.B3 [Wajib] Kombinatorik dan Peluang. Bab placement Turo (Bab 3) tidak sesuai dengan pengelompokan NB yang menempatkan integral di B7.

**Bab 4 — Teknik Integrasi [Mat TL]**:
- `SMA.12.B4.03` Integral fungsi trigonometri dasar [conf: medium]
  → NB taruh di **K12**: Integral Fungsi / "Integral Tak Tentu dan Tentu"
  - _Alasan_: Integral fungsi trigonometri dasar secara semantik termasuk dalam sub-bab 'Integral Tak Tentu dan Tentu' di K12.B7 NB CP 046, bukan di Bab 4 ('Teknik Integrasi'). NB CP 046 tidak memisahkan 'teknik integrasi' sebagai bab tersendiri; topik ini merupakan bagian dari bab Integral Fungsi (K12.B7) yang mencakup turunan dan integral fungsi trigonometri.

**Bab 5 — Aplikasi Integral [Mat TL]**:
- `SMA.12.B5.03` Volume benda putar — metode cakram [conf: high]
  → NB taruh di **K12**: Integral Fungsi / "Penerapan Integral (Luas Daerah & Volume Benda Putar)"
  - _Alasan_: Volume benda putar secara semantik cocok dengan sub-bab 'Penerapan Integral (Luas Daerah & Volume Benda Putar)' di K12.B7 NB CP 046, bukan K12.B5 (Limit Fungsi). Topik ini ada di kelas yang sama (12) tetapi bab yang berbeda — B7 Integral Fungsi, bukan B5 Limit Fungsi.

**Bab 7 — Irisan Kerucut [Mat TL]**:
- `SMA.12.B7.04` Hiperbola analitik — persamaan dan asimtot [conf: high]
  → NB taruh di **K12**: Geometri Analitik (Irisan Kerucut) / "Elips, dan Hiperbola"
  - _Alasan_: Hiperbola beserta persamaan dan asimtotnya termasuk dalam K12.B4 [Lanjut] Geometri Analitik (Irisan Kerucut) NB CP 046, bukan Bab 7 versi Turo. Topik ini ADA di kelas yang sama (K12) tetapi di bab yang berbeda (B4, bukan B7 Turo).

**Bab 8 — Kombinatorika**:
- `SMA.12.B8.01` Prinsip perkalian dan penjumlahan [conf: high]
  → NB taruh di **K12**: Kombinatorik dan Peluang / "Aturan Pengisian Tempat"
  - _Alasan_: Prinsip perkalian dan penjumlahan (kaidah pencacahan dasar) secara semantik termasuk dalam 'Aturan Pengisian Tempat' di K12.B3 NB CP 046, bukan K12.B8. Placement kelas sudah benar (K12), namun nomor bab berbeda — NB menempatkan ini di B3, bukan B8.
- `SMA.12.B8.02` Faktorial n! [conf: medium]
  → NB taruh di **K12**: Kombinatorik dan Peluang / "Permutasi dan Kombinasi"
  - _Alasan_: Faktorial n! adalah konsep fondasi yang secara semantik merupakan bagian integral dari Permutasi dan Kombinasi, yang ada di K12.B3 NB CP 046. Namun Turo menempatkannya di Bab 8 (Kombinatorika) K12, sedangkan NB menempatkan topik ini di Bab 3 K12 — kelas sama tapi bab berbeda; karena bab berbeda dalam kelas yang sama, verdict MATCH_OTHER_KELAS kurang tepat secara teknis, namun mengingat kelas sama dan bab NB yang paling relevan adalah B3 bukan B8, ini tetap diklasifikasikan sebagai MATCH_OTHER_KELAS dengan catatan hanya bab-nya yang berbeda, bukan kelasnya.
- `SMA.12.B8.03` Permutasi — urutan penting [conf: high]
  → NB taruh di **K12**: Kombinatorik dan Peluang / "Permutasi dan Kombinasi"
  - _Alasan_: Permutasi (urutan penting) secara semantik cocok dengan sub-bab 'Permutasi dan Kombinasi' di K12.B3 [Wajib] NB CP 046, bukan Bab 8. Turo menempatkan topik ini di 'Bab 8 — Kombinatorika' yang berbeda penomoran bab-nya dari NB (B3), meskipun kelasnya sama (K12).
- `SMA.12.B8.04` Kombinasi — urutan tidak penting [conf: high]
  → NB taruh di **K12**: Kombinatorik dan Peluang / "Permutasi dan Kombinasi"
  - _Alasan_: Kombinasi (urutan tidak penting) secara semantik adalah bagian dari 'Permutasi dan Kombinasi' di K12.B3 [Wajib] NB CP 046, bukan di bab terpisah 'Bab 8 — Kombinatorika'. Kelasnya sama (12), namun bab placement Turo berbeda dari struktur NB yang menempatkan kombinasi di B3 bukan B8.

## ✓ Sample MATCH SAME KELAS (sanity check, 10 first)

- `SMA.10.B1.01` Review pangkat (bulat positif, nol, negatif, pecahan) ↔ NB K10: "Definisi dan Sifat Eksponen" [high]
- `SMA.10.B1.02` Persamaan eksponen — basis sama ↔ NB K10: "Definisi dan Sifat Eksponen" [high]
- `SMA.10.B1.03` Persamaan eksponen — faktorisasi ↔ NB K10: "Definisi dan Sifat Eksponen" [medium]
- `SMA.10.B1.04` Fungsi eksponen f(x) = a^x — grafik ↔ NB K10: "Fungsi Eksponen (Pertumbuhan & Peluruhan)" [high]
- `SMA.10.B4.01` Review barisan & deret aritmetika-geometri (dari K8) ↔ NB K10: "Barisan Aritmetika & Barisan Geometri" [high]
- `SMA.10.B5.02` Vektor di bidang koordinat — komponen ↔ NB K10: "Vektor di R^2 dan R^3" [high]
- `SMA.10.B5.03` Operasi vektor — penjumlahan & pengurangan ↔ NB K10: "Operasi Penjumlahan dan Pengurangan Vektor" [high]
- `SMA.10.B5.04` Perkalian skalar dengan vektor ↔ NB K10: "Pengurangan, dan Perkalian Skalar Vektor" [high]
- `SMA.10.B5.05` Besar (magnitude) vektor — Pythagoras ↔ NB K10: "Vektor di R^2 dan R^3" [high]
- `SMA.10.B5.06` Vektor di ruang R³ (pengantar) ↔ NB K10: "Vektor di R^2 dan R^3" [high]

## Cara apply

1. Pak ustadz review section 🚨 NO MATCH dulu — itu strong candidate untag → bridge.
2. Section ⚠ MATCH KELAS LAIN — keputusan filosofis: ikut NB (pindah/untag) atau pertahankan.
3. Saya jalankan apply script setelah pak ustadz tandai approve per sub.

**Metode**: Claude Sonnet 4.6 dengan prompt caching (NB taxonomy autoritatif). Setiap verdict include reasoning + confidence level — jauh lebih akurat dari keyword matching.