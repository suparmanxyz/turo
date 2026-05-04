# AUDIT FINAL: Turo Strict vs CP 046 ASLI — SMP

Sumber referensi: `docs/cp046.txt` (BSKAP No. 046/H/KR/2025) — source primer autoritatif.
Method: Claude Sonnet 4.6 + prompt caching (CP 046 raw text di system prompt).
Generated: 2026-05-03

## Summary

| Status | Count | % |
|---|---|---|
| ✓ MATCH Fase SAMA (valid strict) | 104 | 86.7% |
| ⚠ MATCH Fase LAIN (placement mismatch) | 14 | 11.7% |
| 🚨 NO MATCH (tidak di CP 046) | 2 | 1.7% |
| **Total Turo strict** | **120** | 100% |

## 🚨 NO MATCH — Tidak di CP 046 (2 sub)

Sub-materi yang TIDAK ditemukan dalam teks CP 046 manapun. Strong candidate untag → bridge.

### Kelas 8

**Bab 9 — Transformasi Geometri** (1 sub):
- `SMP.8.B9.05` Komposisi transformasi [high]
  - _Alasan_: CP Fase D Geometri menyebut 'transformasi tunggal (refleksi, translasi, rotasi, dan dilatasi)' — kata kunci 'tunggal' secara eksplisit membatasi cakupan pada satu transformasi saja, bukan komposisi/gabungan transformasi. Komposisi transformasi tidak disebut di fase manapun dalam CP 046.

### Kelas 9

**Bab 7 — Analisis Data Bivariate** (1 sub):
- `SMP.9.B7.03` Korelasi visual — positif, negatif, tidak ada [high]
  - _Alasan_: CP Fase D hanya menyebut analisis data univariat (mean, median, modus, jangkauan, diagram batang, diagram lingkaran) dan tidak menyinggung data bivariate, diagram pencar, maupun korelasi antar dua variabel. Topik korelasi visual (positif, negatif, tidak ada) baru muncul di CP Fase E ('menggunakan diagram pencar untuk menyelidiki dan menjelaskan hubungan antara dua variabel numerik/kuantitatif'), sehingga topik ini tidak memiliki landasan di Fase D.

## ⚠ MATCH FASE LAIN — Placement mismatch (14 sub)

Sub yang ada di CP 046, tapi di Fase BERBEDA dengan placement Turo.

### Turo Kelas 7 (placement: Fase D (Kelas 7-9 SMP))

**Bab 1 — Bilangan Bulat**:
- `SMP.7.B1.06` Faktor, kelipatan, KPK, FPB (review & perluasan) [high]
  → CP taruh di **Fase C** (Bilangan)
  - _Kutipan CP_: "menyelesaikan masalah yang berkaitan dengan KPK dan FPB"
  - _Alasan_: KPK dan FPB secara eksplisit disebut di CP Fase C (Kelas 5-6 SD), bukan Fase D. Di Fase D (SMP), tidak ada penyebutan KPK/FPB — materi bilangan Fase D berfokus pada bilangan bulat, rasional, berpangkat, dan notasi ilmiah. Topik ini merupakan review dari Fase C yang ditempatkan di Kelas 7 Fase D.

### Turo Kelas 8 (placement: Fase D (Kelas 7-9 SMP))

**Bab 10 — Statistika dan Peluang**:
- `SMP.8.B10.02` Jangkauan interkuartil (IQR) [high]
  → CP taruh di **Fase E** (Analisis Data dan Peluang)
  - _Kutipan CP_: "Merepresentasikan dan menginterpretasi data dengan cara menentukan jangkauan kuartil dan interkuartil"
  - _Alasan_: Jangkauan interkuartil (IQR) secara eksplisit disebut di CP Fase E (Kelas 10 SMA), bukan di Fase D (SMP). CP Fase D hanya menyebut mean, median, modus, dan jangkauan (range) — tidak menyebut kuartil atau IQR. Penempatan Turo di Fase D (Kelas 8) tidak sesuai dengan CP asli.
- `SMP.8.B10.03` Diagram box plot [high]
  → CP taruh di **Fase E** (Analisis Data dan Peluang)
  - _Kutipan CP_: "membuat dan menginterpretasi diagram box plot dan menggunakannya untuk membandingkan himpunan data"
  - _Alasan_: Diagram box plot secara eksplisit disebut di CP Fase E (Kelas 10 SMA), bukan Fase D (SMP). CP Fase D tidak menyebut box plot sama sekali — hanya menyebut diagram batang dan diagram lingkaran. Penempatan Turo di Kelas 8 (Fase D) tidak sesuai dengan CP 046.

### Turo Kelas 9 (placement: Fase D (Kelas 7-9 SMP))

**Bab 2 — Persamaan Kuadrat**:
- `SMP.9.B2.01` Pengenalan persamaan kuadrat — ax² + bx + c = 0 [high]
  → CP taruh di **Fase E** (Aljabar dan Fungsi)
  - _Kutipan CP_: "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner)"
  - _Alasan_: CP 046 menempatkan persamaan kuadrat secara eksplisit di Fase E (Kelas 10 SMA), bukan Fase D (SMP). Turo menempatkannya di K9 (Fase D), sehingga terjadi mismatch fase.
- `SMP.9.B2.02` Penyelesaian dengan faktorisasi [high]
  → CP taruh di **Fase E** (Aljabar)
  - _Kutipan CP_: "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner), serta persamaan eksponensial (berbasis/ bilangan pokok sama) dan fungsi eksponensial"
  - _Alasan_: Penyelesaian persamaan kuadrat dengan faktorisasi secara semantik termasuk dalam topik 'persamaan dan fungsi kuadrat' yang disebut di CP Fase E (Kelas 10 SMA), bukan Fase D. Placement Turo di Fase D (K9) tidak sesuai dengan lokasi topik ini di CP 046.
- `SMP.9.B2.03` Melengkapkan kuadrat sempurna [high]
  → CP taruh di **Fase E** (Aljabar)
  - _Kutipan CP_: "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner), serta persamaan eksponensial (berbasis/ bilangan pokok sama) dan fungsi eksponensial"
  - _Alasan_: Melengkapkan kuadrat sempurna adalah metode penyelesaian persamaan kuadrat. CP 046 menyebut persamaan kuadrat secara eksplisit di Fase E (Kelas 10 SMA), bukan Fase D (SMP). Turo menempatkannya di Kelas 9 (Fase D), sehingga ini adalah mismatch fase.
- `SMP.9.B2.04` Rumus abc — x = (−b ± √(b²−4ac))/2a [high]
  → CP taruh di **Fase E** (Aljabar dan Fungsi)
  - _Kutipan CP_: "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner), serta persamaan eksponensial (berbasis/ bilangan pokok sama) dan fungsi eksponensial"
  - _Alasan_: Persamaan kuadrat (termasuk rumus abc/kuadratik) secara eksplisit disebut di CP Fase E (Kelas 10 SMA), bukan di Fase D (Kelas 7-9 SMP). Fase D tidak menyebut persamaan kuadrat sama sekali — hanya mencakup persamaan dan pertidaksamaan linear satu variabel serta sistem persamaan linear dua variabel.
- `SMP.9.B2.05` Jumlah & hasil kali akar-akar [high]
  → CP taruh di **Fase E** (Aljabar)
  - _Kutipan CP_: "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner)"
  - _Alasan_: Jumlah dan hasil kali akar-akar persamaan kuadrat (rumus Vieta) adalah bagian dari topik persamaan kuadrat, yang secara eksplisit disebut di CP Fase E (SMA K10), bukan Fase D. CP Fase D hanya menyebut persamaan linear secara eksplisit.

**Bab 3 — Fungsi Kuadrat dan Parabola**:
- `SMP.9.B3.02` Pengaruh parameter a, b, c terhadap parabola [high]
  → CP taruh di **Fase E** (Aljabar dan Fungsi)
  - _Kutipan CP_: "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner), serta persamaan eksponensial (berbasis/ bilangan pokok sama) dan fungsi eksponensial"
  - _Alasan_: Fungsi kuadrat dan parabola (termasuk analisis pengaruh parameter a, b, c) secara eksplisit disebutkan di CP Fase E (Kelas 10 SMA), bukan di Fase D (SMP). Turo menempatkan topik ini di Kelas 9 Fase D, sehingga terjadi mismatch fase.
- `SMP.9.B3.03` Titik puncak dan sumbu simetri [high]
  → CP taruh di **Fase E** (Aljabar dan Fungsi)
  - _Kutipan CP_: "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner), serta persamaan eksponensial (berbasis/ bilangan pokok sama) dan fungsi eksponensial"
  - _Alasan_: Titik puncak dan sumbu simetri adalah bagian integral dari topik fungsi kuadrat/parabola. Dalam CP 046, fungsi kuadrat secara eksplisit disebutkan di Fase E (Kelas 10 SMA), bukan di Fase D (SMP). CP Fase D hanya menyebut fungsi linear dan relasi/fungsi umum, tidak mencakup fungsi kuadrat atau parabola.
- `SMP.9.B3.04` Akar-akar fungsi kuadrat = titik potong sumbu x [high]
  → CP taruh di **Fase E** (Aljabar dan Fungsi)
  - _Kutipan CP_: "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner)"
  - _Alasan_: Topik fungsi kuadrat dan akar-akarnya secara eksplisit disebut di CP Fase E ('persamaan dan fungsi kuadrat'), bukan di Fase D. Placement Turo di Kelas 9 (Fase D) tidak sesuai dengan CP yang menempatkan materi ini di Fase E.
- `SMP.9.B3.05` Nilai maksimum/minimum fungsi kuadrat [high]
  → CP taruh di **Fase E** (Aljabar dan Fungsi)
  - _Kutipan CP_: "menyelesaikan masalah yang berkaitan dengan persamaan dan fungsi kuadrat (termasuk akar imajiner), serta persamaan eksponensial (berbasis/bilangan pokok sama) dan fungsi eksponensial"
  - _Alasan_: Nilai maksimum/minimum fungsi kuadrat secara eksplisit disebut dalam konteks fungsi kuadrat di Fase E (Kelas 10 SMA). CP Fase D hanya menyebut 'membedakan beberapa fungsi non linear dari fungsi linear secara grafik' tanpa menyebut fungsi kuadrat atau nilai ekstremumnya secara spesifik, sehingga placement Turo di Fase D (Kelas 9) tidak sesuai.

**Bab 7 — Analisis Data Bivariate**:
- `SMP.9.B7.01` Data bivariate — dua variabel numerik [high]
  → CP taruh di **Fase E** (Analisis Data dan Peluang)
  - _Kutipan CP_: "menggunakan diagram pencar untuk menyelidiki dan menjelaskan hubungan antara dua variabel numerik/kuantitatif (termasuk salah satunya variabel bebas berupa waktu)"
  - _Alasan_: Analisis data bivariate (dua variabel numerik) secara eksplisit disebut di CP Fase E (Kelas 10 SMA) melalui diagram pencar dan hubungan dua variabel numerik/kuantitatif. CP Fase D tidak menyebut data bivariate sama sekali — Fase D hanya mencakup mean, median, modus, jangkauan, diagram batang, dan diagram lingkaran untuk data univariat.
- `SMP.9.B7.02` Diagram pencar (scatter plot) [high]
  → CP taruh di **Fase E** (Analisis Data dan Peluang)
  - _Kutipan CP_: "menggunakan diagram pencar untuk menyelidiki dan menjelaskan hubungan antara dua variabel numerik/kuantitatif (termasuk salah satunya variabel bebas berupa waktu)"
  - _Alasan_: Diagram pencar (scatter plot) secara eksplisit disebut di CP 046 pada Fase E (Kelas 10 SMA), bukan Fase D (SMP). Turo menempatkan topik ini di Kelas 9 SMP (Fase D), sehingga terjadi mismatch fase — topik ada di CP tetapi di fase yang berbeda.

## ✓ Sample MATCH FASE SAMA (sanity check, 10 first)

- `SMP.7.B1.01` Review bilangan bulat & garis bilangan ↔ CP Fase D Bilangan [high]
  - "Membaca, menulis, dan membandingkan bilangan bulat, bilangan rasional, bilangan desimal, bilangan berpangkat bulat dan akar, bilangan dalam notasi ilmiah"
- `SMP.7.B1.02` +/− bilangan bulat — aturan tanda dari garis bilangan ↔ CP Fase D Bilangan [high]
  - "Membaca, menulis, dan membandingkan bilangan bulat, bilangan rasional, bilangan desimal, bilangan berpangkat bulat dan akar, bilangan dalam notasi ilmiah; menerapkan operasi aritmatika pada bilangan real"
- `SMP.7.B1.03` Perkalian bilangan bulat — pola untuk (−)×(−) ↔ CP Fase D Bilangan [high]
  - "menerapkan operasi aritmatika pada bilangan real"
- `SMP.7.B1.04` Pembagian bilangan bulat ↔ CP Fase D Bilangan [high]
  - "menerapkan operasi aritmatika pada bilangan real"
- `SMP.7.B1.05` Operasi campuran & urutan operasi (PEMDAS/KABATAKU) ↔ CP Fase D Bilangan [medium]
  - "menerapkan operasi aritmatika pada bilangan real, dan memberikan estimasi/perkiraan dalam menyelesaikan masalah"
- `SMP.7.B10.01` Review mean, median, modus (dari K5) ↔ CP Fase D Analisis Data dan Peluang [high]
  - "menentukan dan menafsirkan rerata (mean), median, modus, dan jangkauan (range) dari data tersebut untuk menyelesaikan masalah"
- `SMP.7.B10.02` Jangkauan (range) data ↔ CP Fase D Analisis Data dan Peluang [high]
  - "menentukan dan menafsirkan rerata (mean), median, modus, dan jangkauan (range) dari data tersebut untuk menyelesaikan masalah"
- `SMP.7.B10.03` Berbagai jenis diagram (review + stem-and-leaf) ↔ CP Fase D Analisis Data dan Peluang [medium]
  - "menggunakan diagram batang dan diagram lingkaran untuk menyajikan dan menginterpretasi data"
- `SMP.7.B10.04` Interpretasi kritis grafik di media ↔ CP Fase D Analisis Data dan Peluang [medium]
  - "Merumuskan pertanyaan, mengumpulkan, menyajikan, dan menganalisis data untuk menjawab pertanyaan dari situasi atau masalah; menggunakan diagram batang dan diagram lingkaran untuk menyajikan dan menginterpretasi data"
- `SMP.7.B2.01` Bilangan rasional — semua yang bisa ditulis p/q ↔ CP Fase D Bilangan [high]
  - "Membaca, menulis, dan membandingkan bilangan bulat, bilangan rasional, bilangan desimal, bilangan berpangkat bulat dan akar, bilangan dalam notasi ilmiah"


## Cara apply

1. Review section 🚨 NO MATCH — sub-materi yang benar-benar tidak ada di CP 046.
2. Review section ⚠ MATCH FASE LAIN — placement-nya salah, perlu pindah Fase atau untag.
3. Saya jalankan apply script setelah pak ustadz approve.

**Source autoritatif**: `docs/cp046.txt` (Lampiran II BSKAP 046/2025) — extracted ke `scripts/notebooklm/out/cp046-truth.json`. Jauh lebih akurat dari NB Deep Research yang sebelumnya.