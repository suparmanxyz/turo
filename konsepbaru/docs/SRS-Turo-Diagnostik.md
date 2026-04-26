# SRS — Sistem Diagnostik Turo

**Software Requirements Specification**
**Three-Layer Adaptive Assessment Engine**

Versi 1.0 — 25 April 2026
Disusun untuk Pak Suparman, Direktur As-Syifa Learning Center

---

## 1. Ringkasan Eksekutif

### 1.1 Tujuan Dokumen

Dokumen ini adalah spesifikasi teknis lengkap untuk sistem diagnostik adaptif aplikasi Turo. Diagnostik adalah kekhasan dan keunggulan kompetitif utama Turo dibanding aplikasi pembelajaran matematika lainnya — sistem ini didesain untuk mengukur kesiapan siswa terhadap materi yang akan dipelajari dengan akurasi tinggi, lalu mengarahkan jalur belajar personal.

SRS ini dirancang untuk menjadi prompt utama bagi tim development (manusia maupun Claude Code) dalam membangun engine diagnostik. Setiap section memberikan spesifikasi yang cukup detail untuk diimplementasikan tanpa ambiguitas, namun cukup ringkas agar mudah dirujuk selama coding.

### 1.2 Filosofi Desain

Sistem diagnostik Turo dibangun di atas tiga prinsip filosofis:

- **Akurasi sebagai keunggulan utama.** Karena diagnostik adalah USP, sistem mengutamakan ketelitian profil siswa di atas kecepatan tes. Jumlah soal generous (50% lebih banyak dari standar industri) untuk memastikan profil yang dihasilkan benar-benar dapat dipercaya untuk panduan belajar.

- **Autopilot dengan informed consent.** Sistem berjalan otomatis — siswa tidak perlu memilih parameter teknis (kedalaman, threshold, dll). Tapi sistem transparan tentang konsekuensi (estimasi waktu) sehingga siswa membuat satu keputusan informed di awal: Fast Test atau Deep Test.

- **Tiga lapis assessment yang berbeda.** Onboarding diagnostic (sekali per user) untuk profil dasar, Cek Kesiapan (saat mau mulai materi baru) sebagai pemanasan ringan, dan Post-Test (setelah belajar) sebagai evaluasi formatif. Masing-masing berbeda strategi dan UX.

### 1.3 Scope Implementasi

SRS ini mencakup spesifikasi untuk:

- Engine diagnostik core (algoritma adaptive testing dan multistage)
- Lima jalur diagnostik (SD K1-3, SD K4-6, SMP, SMA reguler, SMA UTBK/SNBT)
- Tiga lapis assessment (Onboarding, Cek Kesiapan, Post-Test)
- Sistem profil siswa dan data tracking
- UI flow dari onboarding sampai output rekomendasi
- Stopping rules, skip mechanism, dan safety nets
- Format output diagnostik dan integrasi dengan kurikulum belajar

### 1.4 Keluar dari Scope

Dokumen ini TIDAK mencakup:

- Konten soal aktual (database soal disiapkan terpisah oleh tim Turo)
- Algoritma rekomendasi materi pembelajaran (modul terpisah)
- Sistem pembayaran dan account management
- Modul belajar dan latihan (engine pembelajaran inti aplikasi)

---

## 2. Arsitektur Tiga Lapis Assessment

### 2.1 Overview

Sistem assessment Turo terdiri dari tiga lapis yang aktif di momen berbeda dalam journey siswa. Pemisahan ini penting karena setiap momen memiliki tujuan, ekspektasi user, dan kebutuhan akurasi yang berbeda.

### 2.2 Lapis 1 — Onboarding Diagnostic

**Definisi**: Tes diagnostik komprehensif yang dijalankan saat siswa pertama kali masuk aplikasi atau saat siswa eksplisit minta re-calibration profil (misal setelah lebih dari 6 bulan tidak menggunakan aplikasi).

**Tujuan**: Membangun profil kemampuan matematika siswa yang lengkap — meliputi level kelas saat ini, area kuat dan lemah, dan rekomendasi jalur belajar awal.

**Karakteristik**:

- Dijalankan sekali atau dua kali dalam life-cycle user di aplikasi.
- Durasi panjang (15-110 menit tergantung mode dan jenjang) — diterima karena konteks user adalah committed onboarding.
- Output: profil siswa permanen yang menjadi referensi untuk semua interaksi selanjutnya.
- Dua mode: Fast Test (adaptive sampling) dan Deep Test (multistage).

### 2.3 Lapis 2 — Cek Kesiapan

**Definisi**: Pemanasan ringan yang muncul saat siswa hendak mulai materi baru, namun profil tidak punya data cukup untuk menilai kesiapannya secara presisi (blind spot prasyarat).

**Tujuan**: Mengisi blind spot data prasyarat materi target tanpa memaksa siswa kembali ke mode tes panjang. Hasil instan terintegrasi ke flow belajar.

**Karakteristik**:

- Framing pemanasan, bukan tes — wording UI menggunakan istilah seperti "yuk pemanasan sebentar" bukan "silakan kerjakan tes prasyarat".
- Durasi pendek (3-7 menit), 3-8 soal.
- Hanya cek prasyarat yang BLIND SPOT — prasyarat yang sudah pernah diukur via Onboarding atau latihan tidak diuji ulang.
- Hasil instan: lulus → langsung mulai materi target; gagal → suggest review materi prasyarat 3-5 menit lalu auto-resume.
- Tidak ada layar hasil yang terpisah — semuanya blend dengan flow belajar.

### 2.4 Lapis 3 — Post-Test Evaluasi

**Definisi**: Assessment formatif setelah siswa menyelesaikan suatu materi pembelajaran — bukan diagnostik prasyarat lagi, tapi evaluasi penguasaan.

**Tujuan**: Menilai apakah siswa menguasai materi yang baru dipelajari dengan baik, dan update profil siswa dengan data progres.

**Karakteristik**:

- Dijalankan setiap kali siswa selesai sebuah materi.
- Strategi dan UI berbeda dari diagnostik (detail di section terpisah — out of scope SRS ini).
- Hasil di-feed kembali ke profil siswa untuk update kontinyu.

> **Catatan**: SRS ini fokus pada Lapis 1 (Onboarding) dan Lapis 2 (Cek Kesiapan). Lapis 3 (Post-Test) memerlukan dokumen spesifikasi terpisah karena strategi dan algoritmanya berbeda dengan diagnostik.

---

## 3. Lima Jalur Diagnostik per Jenjang

### 3.1 Mengapa Dipisah per Jenjang

Sistem diagnostik Turo dipisah menjadi lima jalur berdasarkan jenjang dan tujuan, bukan satu sistem dengan parameter berbeda. Pemisahan ini didasari tiga alasan:

- **Cognitive stamina berbeda.** Anak SD K1-3 mulai kelelahan setelah 10-15 menit fokus. SMP bisa 25-30 menit. SMA bisa 45+ menit. Memaksakan durasi yang sama akan merusak validitas tes untuk anak yang stamina-nya lebih pendek.

- **Reading load dan UX berbeda.** SD K1-3 butuh soal visual heavy dengan narasi audio dan interaksi tap atau drag. SMA bisa pakai soal teks standar dengan ilustrasi pendukung.

- **Tujuan diagnostik berbeda.** SD/SMP/SMA reguler fokus pada penguasaan kurikulum sekolah. SMA UTBK fokus pada literasi numerik dan penalaran matematis untuk SNBT. Konten dan tipe soal berbeda fundamental.

### 3.2 Spesifikasi Lima Jalur

| Jalur | Range Kelas | Detik per Soal | Ciri Khas |
|-------|-------------|----------------|-----------|
| SD K1-3 | K1, K2, K3 | 75 dtk | Visual heavy, audio narasi, gamifikasi, interaksi tap/drag |
| SD K4-6 | K4, K5, K6 | 60 dtk | Visual support kuat, soal cerita pendek, mulai textual |
| SMP | K7, K8, K9 | 50 dtk | Standar pilihan ganda dengan ilustrasi pendukung |
| SMA Reguler | K10, K11, K12 | 45 dtk | Standar PG dengan soal kontekstual dan aplikatif |
| SMA UTBK | K10-K12 fokus SNBT | 60 dtk | Format mirip SNBT — penalaran numerik, kuantitatif, literasi |

### 3.3 Logika Penentuan Jalur

Saat siswa pertama kali masuk aplikasi, sistem perlu menentukan jalur diagnostik mana yang dijalankan. Logikanya:

1. Tanya jenjang sekolah saat ini (SD / SMP / SMA / Lulus SMA siap UTBK).
2. Untuk SD: tanya kelas spesifik. Jika K1-3 → jalur SD-low. Jika K4-6 → jalur SD-high.
3. Untuk SMP: langsung jalur SMP.
4. Untuk SMA: tanya tujuan — "persiapan SNBT/UTBK" atau "belajar materi sekolah saja".
5. Tujuan SNBT → jalur SMA-UTBK. Tujuan sekolah → jalur SMA-reguler.
6. Lulus SMA siap UTBK: langsung jalur SMA-UTBK tanpa pertanyaan tambahan.

> **Penting**: Pemilihan jalur SMA-reguler vs SMA-UTBK dapat diubah user di settings setelah onboarding. Re-diagnostic akan disuggest jika user pindah jalur, karena coverage konten berbeda.

---

## 4. Fast Test — Adaptive Sampling

### 4.1 Konsep

Fast Test menggunakan strategi adaptive sampling untuk menghasilkan profil siswa dengan resolusi sedang dalam waktu yang relatif singkat. Output: estimasi level kelas siswa plus heatmap kelemahan di lima area utama matematika.

### 4.2 Algoritma Dua Tahap

#### 4.2.1 Tahap A — Locator (Binary Search Kelas)

Tujuan: menemukan level kelas siswa secara efisien dengan binary search.

1. Tentukan range kelas siswa berdasarkan jalur. Misal SMA reguler: range K1-K12 (12 kelas).
2. Mulai dari kelas tengah range (untuk SMA: K6 SD).
3. Berikan 3-5 soal milestone di kelas tersebut. Soal milestone adalah sub-materi MAKU dengan dependents tertinggi di kelas itu.
4. Hitung skor: jika lulus ≥ 60% (3 dari 5) → siswa kemungkinan di level kelas ini atau lebih tinggi → naik ke kelas tengah dari range atas.
5. Jika gagal < 60% → siswa kemungkinan di kelas lebih rendah → turun ke kelas tengah dari range bawah.
6. Iterasi maksimal 4 test points (log2 dari 12 kelas).
7. Locator berhenti saat ditemukan kelas batas (siswa lulus di kelas X tapi gagal di kelas X+1).

#### 4.2.2 Tahap B — Area Coverage

Tujuan: setelah level kelas teridentifikasi, sample kemampuan di setiap area matematika utama untuk membentuk heatmap.

Lima area matematika utama:

- Bilangan dan operasi (number sense, aritmatika)
- Aljabar (variabel, persamaan, sistem persamaan)
- Geometri dan pengukuran (bangun, koordinat, transformasi)
- Statistik dan peluang (data, probabilitas)
- Fungsi dan kalkulus (untuk SMP-SMA, untuk SD: pre-aljabar)

Logika:

1. Untuk setiap dari 5 area, ambil 3-5 soal dari level kelas yang ditemukan di Tahap A.
2. Soal dipilih dari sub-materi MAKU yang merepresentasikan area tersebut.
3. Hitung skor per area (persentase benar).
4. Klasifikasi area: Kuat (≥80%), Sedang (50-79%), Lemah (<50%).

#### 4.2.3 Adaptive Sampling — Jumlah Soal Dinamis

Jumlah soal di tiap tahap menyesuaikan konsistensi jawaban siswa. Sistem menggunakan confidence interval untuk memutuskan kapan stop.

1. Inisialisasi: target soal per kelas/area = 3.
2. Setelah setiap soal, hitung confidence interval estimasi kemampuan siswa.
3. Jika confidence interval < threshold (misal ±0.5 kelas), stop di kelas/area ini.
4. Jika confidence interval masih tinggi setelah 3 soal, tambah 1-2 soal lagi (max 5 total).
5. Jika setelah 5 soal masih inconsistent, terima ketidakpastian dan lanjut ke tahap berikutnya.

### 4.3 Spesifikasi Jumlah Soal Fast Test

Tabel jumlah soal dan estimasi waktu Fast Test untuk berbagai jenjang dan kondisi konsistensi siswa. Jumlah soal sudah ditambah 50% dari baseline industri untuk meningkatkan akurasi diagnostik (sesuai prinsip USP Turo).

| Jenjang | Konsisten | Average | Inconsistent | Hard Cap |
|---------|-----------|---------|--------------|----------|
| SD K1-3 | 12-15 soal / 15-19 mnt | 18-22 soal / 22-28 mnt | 27-33 soal / 34-41 mnt | 45 mnt |
| SD K4-6 | 15-20 soal / 15-20 mnt | 22-27 soal / 22-27 mnt | 33-42 soal / 33-42 mnt | 50 mnt |
| SMP | 18-22 soal / 15-18 mnt | 27-33 soal / 22-28 mnt | 38-45 soal / 32-38 mnt | 45 mnt |
| SMA Reguler | 22-27 soal / 16-20 mnt | 33-42 soal / 25-32 mnt | 45-52 soal / 34-39 mnt | 45 mnt |
| SMA UTBK | 27-33 soal / 27-33 mnt | 38-45 soal / 38-45 mnt | 48-57 soal / 48-57 mnt | 60 mnt |

### 4.4 Output Fast Test

Output Fast Test adalah profil siswa dengan struktur berikut:

**4.4.1 Estimasi Level Kelas**: Estimasi numerik level kemampuan siswa, misal "Setara K8 SMP" atau "Setara K10 SMA". Disertai confidence interval (misal ±0.5 kelas).

**4.4.2 Heatmap Lima Area**: Klasifikasi Kuat/Sedang/Lemah untuk setiap dari 5 area matematika utama. Visualisasi sebagai bar chart atau grid warna.

**4.4.3 Rekomendasi Awal**: Rekomendasi paket bimbel atau jalur belajar — misal "Persiapan UTBK Fondasi" atau "Penguatan Materi K8". Rekomendasi disusun berdasarkan kombinasi level kelas dan heatmap kelemahan.

**4.4.4 Disclaimer Akurasi**: Karena Fast Test adalah sampling, output disertai disclaimer: "Profil ini adalah gambaran umum. Untuk peta belajar yang lebih detail, ambil Deep Test."

---

## 5. Deep Test — Multistage

### 5.1 Konsep

Deep Test menghasilkan profil siswa dengan resolusi tinggi melalui tiga tahap berurutan. Output: roadmap belajar personal dengan daftar 20-40 sub-materi spesifik yang dikategorikan (siap, perlu review, perlu remediasi).

### 5.2 Tiga Tahap Deep Test

**5.2.1 Stage 1 — Placement (Sama dengan Fast Test)**: Stage 1 identik dengan Fast Test: locator binary search + area coverage. Output sementara: estimasi level kelas dan heatmap lima area.

**5.2.2 Optional Break 2-3 menit**: Setelah Stage 1, sistem menawarkan break opsional. UI: "Stage 1 selesai. Anda boleh istirahat 2-3 menit sebelum lanjut. [Lanjut sekarang] [Istirahat dulu]". Selama break, layar menampilkan progress positif dan info ringkas tentang stage berikutnya. Bukan layar kosong.

**5.2.3 Stage 2 — Drill di Area Lemah**: Tujuan: untuk setiap area yang teridentifikasi Lemah atau Sedang di Stage 1, telusuri pohon prasyarat secara adaptif sampai akar masalah teridentifikasi.

1. Identifikasi 2-4 area target dari Stage 1 (yang Lemah atau Sedang).
2. Untuk setiap area target, mulai dari level kelas yang ditemukan di Stage 1.
3. Berikan 3-5 soal dari sub-materi MAKU di kelas tersebut yang merepresentasikan area itu.
4. Jika siswa gagal, telusuri prasyarat sub-materi tersebut dengan adaptive BFS — turun ke level prasyarat dan tes.
5. Jika siswa lulus, sub-materi dikategorikan Siap. Jika gagal sampai foundation, dikategorikan Remediasi Prioritas.
6. Branching pruning aktif: cabang yang lulus tidak ditelusuri lagi.
7. Maksimal 25-35 soal per area, tergantung jenjang.

**5.2.4 Optional Break 2-3 menit**: Sama dengan break sebelumnya — opsional, dengan progress feedback positif.

**5.2.5 Stage 3 — Foundation Confirmation**: Tujuan: untuk area yang lulus di Stage 1, konfirmasi dengan 1-2 soal pengecekan agar tidak ada false positive.

1. Untuk setiap area Kuat di Stage 1, ambil 1-2 soal dari sub-materi yang lebih dalam (turun 1-2 kelas dari level Stage 1).
2. Jika lulus → konfirmasi Kuat.
3. Jika gagal → re-classify menjadi Sedang dan tambah 2-3 soal drill di area itu.
4. Total soal Stage 3: 9-15 soal (tergantung jenjang).

### 5.3 Spesifikasi Jumlah Soal Deep Test

| Jenjang | Konsisten | Average | Inconsistent | Hard Cap | Stages |
|---------|-----------|---------|--------------|----------|--------|
| SD K1-3 | 22-27 soal / 28-34 mnt | 33-42 soal / 41-52 mnt | 48-60 soal / 60-75 mnt | 60 mnt | 2 |
| SD K4-6 | 27-33 soal / 27-33 mnt | 42-52 soal / 42-52 mnt | 60-75 soal / 60-75 mnt | 65 mnt | 2 |
| SMP | 38-45 soal / 32-38 mnt | 57-68 soal / 48-57 mnt | 82-98 soal / 68-82 mnt | 75 mnt | 3 |
| SMA Reguler | 45-52 soal / 34-39 mnt | 68-82 soal / 51-62 mnt | 98-120 soal / 74-90 mnt | 75 mnt | 3 |
| SMA UTBK | 52-63 soal / 52-63 mnt | 75-90 soal / 75-90 mnt | 105-128 soal / 105-128 mnt | 90 mnt | 3 |

> **Catatan penting tentang SD K1-3**: meskipun spec menunjukkan max 75 menit, sistem WAJIB memecah Deep Test menjadi 2 sesi dengan break minimal 5 menit (atau split ke hari berbeda) untuk anak SD K1-3 karena cognitive stamina mereka tidak cukup untuk 60+ menit kontinyu.

### 5.4 Output Deep Test

**5.4.1 Profil Detail**: Estimasi level kelas yang lebih presisi (confidence ±0.3 kelas) plus narasi level: "Anda di K8 SMP, dengan kekuatan di Bilangan dan Aljabar, kelemahan di Geometri dan Fungsi."

**5.4.2 Daftar Sub-Materi Terkategorisasi**: 12-40 sub-materi spesifik dikategorikan dalam 3 bucket:

- **Siap.** Sub-materi yang sudah dikuasai. Tidak perlu review.
- **Perlu Review.** Sub-materi yang sebagian dikuasai tapi perlu refresh sebelum lanjut.
- **Remediasi Prioritas.** Sub-materi yang belum dikuasai, harus dipelajari ulang sebelum ke materi lebih lanjut.

**5.4.3 Roadmap Belajar**: Urutan rekomendasi sub-materi yang harus dipelajari, mempertimbangkan dependency tree dari peta prasyarat. Dengan estimasi durasi total (misal "3-4 bulan untuk siap UTBK").

**5.4.4 Visualisasi**: Output Deep Test ditampilkan dengan visualisasi peta prasyarat — node-node yang Siap berwarna hijau, Review kuning, Remediasi merah.

---

## 6. Cek Kesiapan — Lapis 2

### 6.1 Kapan Cek Kesiapan Aktif

Cek Kesiapan tidak selalu muncul saat siswa mau mulai materi baru. Sistem memutuskan apakah perlu Cek Kesiapan dengan logika berikut:

1. Saat siswa pilih materi target X, sistem ambil daftar prasyarat langsung X dari peta prasyarat.
2. Untuk setiap prasyarat, cek apakah profil siswa punya data tentang prasyarat itu (dari Onboarding atau latihan sebelumnya).
3. Identifikasi blind spots: prasyarat yang TIDAK ada datanya, atau datanya sudah outdated (>3 bulan).
4. Jika blind spot kosong (semua prasyarat sudah punya data fresh) → langsung mulai materi target tanpa Cek Kesiapan.
5. Jika ada blind spot 1-3 prasyarat → trigger Cek Kesiapan.
6. Jika blind spot lebih dari 3 prasyarat → suggest "Re-Diagnostic Recommended" karena profil terlalu kosong untuk materi ini.

### 6.2 Format Cek Kesiapan

**6.2.1 Framing**: UI menggunakan istilah "pemanasan" bukan "tes". Contoh wording:

> "Sebelum mulai belajar SPLDV, yuk pemanasan sebentar dengan beberapa soal dasar. Ini cuma 3-5 menit, tidak ada nilai."

**6.2.2 Spesifikasi Teknis**:

- Jumlah soal: 3-8 (1-2 soal per blind spot prasyarat, +50% buffer).
- Durasi: 3-7 menit.
- Skip button aktif (sama dengan tes lain).
- Tidak ada break karena durasi pendek.

**6.2.3 Hasil Instan**: Setelah selesai, sistem langsung memutuskan tanpa layar hasil terpisah:

- **Lulus semua →** Animasi singkat "Kamu siap!" → langsung masuk materi target. Tidak ada layar hasil.
- **Gagal sebagian →** Pesan halus: "Yuk review [nama materi] dulu sebentar (3-5 menit) sebelum lanjut." → Auto-navigate ke materi review → setelah selesai → kembali ke materi target original.
- **Gagal banyak (≥50%) →** Pesan: "Sepertinya kamu butuh review beberapa materi dasar dulu. Yuk mulai dari [materi paling fundamental]." → arahkan ke jalur belajar yang mundur lebih jauh.

---

## 7. Algoritma Adaptif Inti

### 7.1 Item Response Theory (IRT) Model

Engine adaptif Turo menggunakan model IRT 2-parameter (2PL) sebagai dasar estimasi kemampuan siswa. Model ini cukup robust untuk diagnostik dengan jumlah soal moderate (di bawah 100) dan tidak memerlukan kalibrasi sebanyak 3PL.

**7.1.1 Persamaan 2PL**:

```
P(θ) = 1 / (1 + exp(-a · (θ - b)))
```

Dimana θ (theta) adalah estimasi kemampuan siswa, a adalah parameter discrimination soal (seberapa baik soal membedakan kemampuan tinggi vs rendah), dan b adalah parameter difficulty soal.

**7.1.2 Estimasi Theta — EAP (Expected A Posteriori)**: Setelah setiap soal dijawab, theta di-update menggunakan Bayesian EAP untuk hasil yang lebih stabil di awal tes (saat data sedikit). **Rekomendasi: gunakan EAP dengan prior normal N(0, 1).**

**7.1.3 Confidence Interval**: Confidence interval theta dihitung dari Standard Error (SE):

```
SE(θ) = 1 / sqrt(Σ a_i² · P_i · (1 - P_i))
```

Stop criterion: tes berhenti saat SE(θ) < 0.3 (95% CI sekitar ±0.6) atau jumlah soal mencapai max.

### 7.2 Item Selection — Maximum Information

Pemilihan soal berikutnya menggunakan kriteria Maximum Information at Current θ. Soal yang dipilih adalah yang memberikan informasi paling banyak tentang kemampuan siswa di estimasi current theta.

```
I(θ) = a² · P(θ) · (1 - P(θ))
```

Untuk Turo, Maximum Information disesuaikan dengan content balancing — sistem memastikan soal yang dipilih juga merepresentasikan area target sesuai distribusi yang dibutuhkan, bukan hanya soal dengan info tertinggi.

### 7.3 Skip Mechanism

Tombol skip aktif sepanjang tes dengan aturan berikut:

1. Tombol "Saya butuh review ini" muncul setelah 10 detik soal ditampilkan. Sebelum 10 detik, tombol disabled — memaksa siswa minimal membaca soal.
2. Saat di-skip, sistem treat sebagai jawaban salah dengan response time = 10 detik (untuk tracking pattern).
3. Sistem deteksi skip pattern mencurigakan: jika user skip 5 soal berturut-turut dengan total < 30 detik, tampilkan dialog: "Sepertinya kamu mau cepat selesai. Tes ini untuk membantumu — yuk coba minimal baca soal sebelum skip."
4. Skip rate maksimum: 60% dari total soal. Jika lewat threshold ini, sistem stop tes dan tampilkan pesan: "Sepertinya kamu kurang fit untuk tes saat ini. Yuk coba lagi nanti saat lebih siap."
5. Wording: "Saya butuh review ini" — bukan "Skip" atau "Tidak bisa". Framing pengakuan diri yang produktif, bukan kegagalan.

### 7.4 Stopping Rules

Tes dapat berhenti karena beberapa kondisi:

**7.4.1 Normal Completion**: Confidence interval theta sudah memenuhi threshold (SE < 0.3) DAN minimum soal sudah tercapai DAN content balancing sudah terpenuhi. Ini kondisi ideal.

**7.4.2 Maximum Items Reached**: Jumlah soal mencapai upper limit. Tes berhenti meskipun confidence belum ideal — kasih hasil parsial dengan disclaimer.

**7.4.3 Time Hard Cap**: Total waktu mencapai hard cap. Tes stop dan beri hasil parsial.

**7.4.4 Fatigue Detection**: Sistem deteksi pola fatigue dengan dua metrik:

- Average response time naik signifikan (>50% dari baseline awal tes).
- Accuracy turun drastis di 5 soal terakhir (dari 70%+ ke <40%).

Saat terdeteksi, sistem suggest stop: "Kamu sepertinya mulai lelah. Yuk istirahat dulu — kamu bisa lanjut besok dari titik ini."

**7.4.5 Skip Threshold Exceeded**: Skip rate >60% dari soal yang diberikan — tes stop seperti dijelaskan di section 7.3.

---

## 8. UI Flow Lengkap

### 8.1 Onboarding Flow

**Step 1: Welcome Screen**: Layar sambutan singkat (10-15 detik max), brand intro Turo, tombol "Mulai".

**Step 2: Profile Setup**: Tanya nama, jenjang sekolah saat ini, kelas spesifik (untuk SD), tujuan (untuk SMA — sekolah vs UTBK).

**Step 3: Diagnostic Mode Selection**: Tampilkan dua opsi: Fast Test atau Deep Test. Default rekomendasi berdasarkan logika di section 8.4. Wording:

> Tes Cepat — sekitar [X-Y menit]. Kami akan menilai kemampuan dasarmu untuk memberi rekomendasi belajar awal. Hasil cukup baik untuk memulai.
>
> Tes Mendalam — sekitar [X-Y menit] **[DIREKOMENDASIKAN]**. Kami akan memetakan kemampuanmu secara detail untuk membuat rencana belajar yang tepat. Pilih ini kalau kamu mau benar-benar siap.
>
> Kamu bisa skip soal yang kamu tahu pasti tidak bisa di tes manapun.

**Step 4: Tes Berjalan**: Layout layar tes:

- Header: progress bar adaptif ("Sistem sedang menilai kemampuanmu...") — TIDAK menunjukkan "Soal X dari Y" karena Y dinamis.
- Body: soal di tengah layar, opsi jawaban di bawah.
- Footer: tombol "Saya butuh review ini" (muncul setelah 10 detik), timer total tes (untuk transparency).
- Untuk Deep Test: indikator stage saat ini (Stage 1 of 3, Stage 2 of 3, dst).

**Step 5: Break Antara Stage (Deep Test only)**: Layar transisi positif: "Bagus, kamu sudah selesai Stage 1." Tombol "Lanjut sekarang" dan "Istirahat 2-3 menit". Jika user pilih istirahat, countdown 2 menit dengan info ringkas tentang stage berikutnya.

**Step 6: Hasil**: Layar hasil dengan visualisasi profil siswa (heatmap untuk Fast, peta prasyarat untuk Deep). Tombol utama: "Mulai Belajar".

### 8.2 Cek Kesiapan Flow

Cek Kesiapan masuk seamless ke flow belajar — bukan layar tes terpisah:

1. User pilih materi target dari katalog.
2. Sistem cek profil. Jika ada blind spots, tampilkan card singkat: "Sebelum mulai [Nama Materi], yuk pemanasan 3-5 menit dulu." Tombol [Pemanasan] dan [Lewati].
3. Jika user pilih Lewati, langsung ke materi target dengan disclaimer: "Kalau merasa kesulitan, kembali ke sini untuk review."
4. Jika user pilih Pemanasan, layar tes muncul dengan UI minimalis (3-8 soal saja, tanpa header berat).
5. Setelah selesai, hasil instan ditampilkan inline dan navigate sesuai aturan section 6.2.3.

### 8.3 Re-Diagnostic Flow

Sistem suggest re-diagnostic di kondisi:

- Profil sudah lebih dari 6 bulan tidak di-update via diagnostik formal.
- Banyak data latihan (>20 soal) menunjukkan ketidaksesuaian dengan profil tersimpan.
- User eksplisit pindah jalur (SMA reguler ↔ SMA UTBK).
- User eksplisit minta re-test dari settings.

### 8.4 Default Rekomendasi Mode

| Kondisi User | Default | Boleh Override |
|--------------|---------|----------------|
| Baru daftar aplikasi | Deep Test | Ya, ke Fast |
| Mau persiapan SNBT/UTBK | Deep Test | Ya, ke Fast (warning) |
| Profil baru (<1 minggu) | Fast Test | Ya, ke Deep |
| Profil lama (>3 bulan) | Deep Test | Ya, ke Fast |
| Re-test berkala (3-6 bulan) | Fast Test | Ya, ke Deep |
| Setelah 3x Fast Test berturut-turut | Deep Test (forced) | Tidak — wajib |

---

## 9. Data Model dan Database Schema

### 9.1 Entitas Utama

#### 9.1.1 user_profile

```typescript
{
  user_id: UUID  // primary key
  nama: string
  jenjang: 'SD' | 'SMP' | 'SMA'
  kelas: number  // 1-12
  jalur_diagnostik: 'SD-low' | 'SD-high' | 'SMP' | 'SMA-reguler' | 'SMA-UTBK'
  tanggal_daftar: timestamp
  last_diagnostic_at: timestamp
  last_diagnostic_mode: 'fast' | 'deep'
  current_theta: number  // -3 to +3
  current_kelas_estimate: number  // 1.0-12.9
  area_scores: {
    bilangan: number
    aljabar: number
    geometri: number
    statistik: number
    fungsi: number
  }
}
```

#### 9.1.2 diagnostic_session

```typescript
{
  session_id: UUID
  user_id: UUID  // FK to user_profile
  mode: 'fast' | 'deep' | 'cek_kesiapan'
  layer: 'onboarding' | 'cek_kesiapan' | 'post_test'
  jalur: string
  started_at: timestamp
  completed_at: timestamp
  status: 'in_progress' | 'completed' | 'abandoned' | 'hard_cap_reached'
  total_items: number
  total_skipped: number
  total_duration_seconds: number
  final_theta: number
  final_se: number
  stage_data: object[]  // for Deep Test
}
```

#### 9.1.3 item_response

```typescript
{
  response_id: UUID
  session_id: UUID  // FK
  item_id: UUID  // FK to item_bank
  presented_at: timestamp
  response_at: timestamp
  response_time_ms: number
  user_answer: string
  is_correct: boolean
  is_skipped: boolean
  theta_before: number
  theta_after: number
  area: string
}
```

#### 9.1.4 sub_materi_mastery

```typescript
{
  user_id: UUID
  sub_materi_kode: string  // e.g. "SMP.8.B5.01"
  mastery_status: 'siap' | 'review' | 'remediasi' | 'unknown'
  confidence: number  // 0-1
  last_assessed_at: timestamp
  last_assessment_source: 'diagnostic' | 'latihan' | 'post_test' | 'cek_kesiapan'
}
```

### 9.2 Item Bank Structure

```typescript
{
  item_id: UUID
  sub_materi_kode: string
  jalur: string[]  // multi-jalur
  area: 'bilangan' | 'aljabar' | 'geometri' | 'statistik' | 'fungsi'
  difficulty_b: number  // -3 to +3, IRT param
  discrimination_a: number  // 0.5-2.5, IRT param
  pseudo_guessing_c: number  // 0-0.3, optional 3PL param
  konten: {
    soal_html: string
    opsi: string[]
    kunci: string
    pembahasan: string
  }
  format: 'text' | 'visual_heavy' | 'audio' | 'drag_drop'
  estimated_time_seconds: number
  variant_group: UUID  // group of equivalent items
  calibration_n: number  // number of responses used for calibration
  is_milestone: boolean
  is_maku: boolean
}
```

### 9.3 Catatan Kalibrasi Item

Untuk soal baru yang belum ada data kalibrasinya, gunakan parameter default:

- `difficulty_b`: estimasi dari content expert (level kelas konten)
- `discrimination_a`: 1.0 (default)
- `pseudo_guessing_c`: 0.25 untuk soal pilihan ganda 4 opsi (chance level)

Setelah 100+ respons terkumpul untuk soal tersebut, kalibrasi ulang dengan algoritma BILOG-MG atau pyirt library.

---

## 10. Safety Nets dan Edge Cases

### 10.1 Anak dengan Gap Sangat Besar

Skenario: SMA K12 dengan kemampuan setara K5 SD.

1. Setelah Stage 1 selesai, hitung gap antara level kelas estimasi siswa dan target jenjang.
2. Jika gap > 4 jenjang (misal K12 vs K5), SKIP Stage 2 dan 3.
3. Tampilkan output langsung: "Berdasarkan tes, kemampuan kamu setara K5 SD. Sebelum siap UTBK, kamu butuh fondasi K6-K11 dulu. Mau mulai dari [materi paling dasar]?"
4. Tidak ada drill mendalam karena hasilnya sudah jelas — yang dibutuhkan adalah remediasi panjang, bukan diagnosis presisi.

### 10.2 Anak dengan Kemampuan Lebih Tinggi dari Jenjang

Skenario: anak K8 ternyata kemampuan setara K10.

1. Locator binary search akan terus naik — sampai kelas tertinggi di jalur.
2. Jika di kelas tertinggi siswa masih lulus, berhenti dengan note: "Kemampuan kamu di atas jenjang sekarang. Pertimbangkan jalur lebih advanced."
3. Suggest pindah ke jalur yang lebih tinggi.

### 10.3 Mid-Test Abandonment

User keluar di tengah tes:

1. Auto-save state setiap 30 detik.
2. Saat user buka aplikasi lagi, jika ada session in-progress, tawarkan: "Tes diagnostik kamu belum selesai. Lanjutkan dari mana kamu berhenti?" [Lanjut] [Mulai Ulang] [Batal].
3. Session di-tag abandoned setelah 7 hari tidak dilanjutkan.
4. Hasil parsial dari abandoned session bisa dipakai untuk profil dengan disclaimer.

### 10.4 Network Issues

- Mode offline: pre-load 10 soal di cache. User bisa kerjakan offline, sync saat online.
- Auto-retry submission jawaban 3x sebelum mark as failed.
- Save state lokal di device storage.

### 10.5 Multiple Devices

- Session terikat user_id, bukan device.
- Saat user login di device B, sistem detect ada session aktif di device A. Tawarkan: "Lanjut di device ini atau tetap di device sebelumnya?"

---

## 11. Stack Teknologi

### Frontend

- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- State: Zustand
- Charts: Recharts atau visx
- Auth: Supabase Auth client

### Backend

- Python 3.11 + FastAPI
- pyirt atau girth untuk IRT engine
- Pydantic v2 untuk validation
- Async support penuh

### Database

- Supabase (PostgreSQL fully managed)
- Row Level Security
- Real-time subscriptions kalau perlu

### Hosting

- Frontend: Vercel
- Backend: Railway atau Fly.io
- CDN: Cloudflare untuk static assets

---

## 12. Roadmap Implementasi

### Phase 1 — MVP (Bulan 1-3)

- Setup database schema dan API skeleton
- Implement IRT 2PL engine
- Build UI flow Onboarding → Fast Test → Hasil
- Item bank starter: 30-50 soal SMP terkalibrasi manual
- Testing internal dengan 10-20 siswa ALC

### Phase 2 — Multi-Jalur (Bulan 4-6)

- Tambah jalur SD-low, SD-high, SMA-reguler, SMA-UTBK
- Implement Deep Test multistage logic
- Build UI khusus untuk SD K1-3
- Item bank scaling: 1000+ soal across jalur
- Beta testing dengan 100+ siswa

### Phase 3 — Lapis 2 dan Refinement (Bulan 7-9)

- Implement Cek Kesiapan flow
- Refine algoritma berdasarkan data dari beta
- Re-calibration item parameters
- Performance optimization
- Soft launch ke ALC dan beberapa sekolah mitra

### Phase 4 — Production (Bulan 10-12)

- Stress testing 10K concurrent users
- Monitoring dashboard
- Documentation lengkap
- Public launch

---

## 13. Success Metrics

### Akurasi Diagnostik

- Test-retest reliability ≥ 0.85
- Predictive validity (correlation dengan post-test) ≥ 0.7
- Item fit statistics: 90%+ soal dengan infit/outfit 0.5-1.5

### User Experience

- Completion rate Fast Test ≥ 85%
- Completion rate Deep Test ≥ 70%
- Skip rate <30% rata-rata
- User satisfaction ≥ 4.0/5
- Re-diagnostic uptake >40% dalam 6 bulan

### Engagement

- ≥70% user mulai belajar dalam 7 hari setelah diagnostik
- ≥50% selesaikan minimal 3 materi dari roadmap dalam 30 hari
- Drop-off antara diagnostik dan first lesson <20%

### Operational

- Diagnostic completion time match estimasi (±20%)
- API response time p95 < 500ms
- Engine uptime ≥ 99.5%

---

## 14. Penutup

SRS ini adalah blueprint teknis untuk membangun sistem diagnostik Turo sebagai keunggulan kompetitif inti. Setiap section dirancang agar bisa dirujuk langsung selama implementasi — baik oleh developer manusia maupun oleh Claude Code dalam mode agentic.

Prinsip utama yang harus dipertahankan: **akurasi diagnostik adalah USP** — jangan kompromi jumlah soal demi kecepatan. Tetapi UX harus tetap dijaga dengan break opsional, skip mechanism, dan stopping rules yang manusiawi.

Untuk pertanyaan klarifikasi atau update SRS, hubungi Pak Suparman selaku product owner.

---

*— akhir dokumen —*
