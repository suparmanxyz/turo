# PROPOSAL: Strict Tagging Adjustments — SMA

Sumber autoritatif: NotebookLM Deep Research CP 046/H/KR/2025
Generated: 2026-05-03

**Status saat ini:**
- Total SMA sub: 147 (strict: 129, non-strict: 18)

## Kelas 10 (Fase E)

- NB CP 046 bab: 8
- Turo strict sub: 39 (dari 50 total)

### 🔴 UNTAG Candidates: NONE — semua bab strict Turo di K10 match NB ✓

### 🟢 ADD Candidates: NONE — semua bab NB sudah ada di Turo ✓

## Kelas 11 (Fase F)

- NB CP 046 bab: 8
- Turo strict sub: 54 (dari 57 total)

### 🔴 UNTAG Candidates (Turo strict yang TIDAK ada di CP 046 NB) — 3 bab

Action: ubah `strict: true` → `strict: false` untuk sub-materi di bab ini. Akan otomatis tampil sebagai 🌉 Bridge di mode comprehensive.

- **Bab 4 Trigonometri Lanjutan** (6 sub):
  - `SMA.11.B4.01` Aturan sinus — a/sin A = b/sin B = c/sin C
  - `SMA.11.B4.02` Aturan cosinus — c² = a² + b² − 2ab cos C
  - `SMA.11.B4.03` Luas segitiga L = (1/2)ab sin C
  - `SMA.11.B4.04` Identitas trigonometri dasar (sin² + cos² = 1)
  - `SMA.11.B4.05` Identitas sudut jumlah dan selisih
  - `SMA.11.B4.06` Fungsi sinusoida y = A sin(Bx + C) + D
- **Bab 6 Logika Matematika [Mat TL]** (5 sub):
  - `SMA.11.B6.01` Proposisi — pernyataan benar/salah
  - `SMA.11.B6.02` Negasi, konjungsi (∧), disjungsi (∨)
  - `SMA.11.B6.03` Implikasi (⇒) dan biimplikasi (⇔)
  - `SMA.11.B6.04` Konvers, invers, kontrapositif
  - `SMA.11.B6.05` Penarikan kesimpulan (modus ponens, tollens, silogisme)
- **Bab 7 Induksi Matematika [Mat TL]** (4 sub):
  - `SMA.11.B7.01` Prinsip induksi — base case & induction step
  - `SMA.11.B7.02` Pembuktian identitas aritmetika — 1+2+...+n = n(n+1)/2
  - `SMA.11.B7.03` Pembuktian keterbagian — contoh: 2^n > n
  - `SMA.11.B7.04` Keterbatasan induksi

### 🟢 ADD Candidates (NB CP 046 bab yang BELUM ADA di Turo) — 1 bab

Action: pertimbangkan tambah sub-materi baru di peta-prasyarat.json untuk topik ini.

- **K11.B7 Transformasi Geometri** [Lanjut] (6 sub-bab NB):
  - Translasi
  - Refleksi
  - Rotasi
  - Dilatasi
  - Kaitan Matriks dengan Transformasi
  - Komposisi Transformasi menggunakan Operasi Matriks

## Kelas 12 (Fase F)

- NB CP 046 bab: 8
- Turo strict sub: 36 (dari 40 total)

### 🔴 UNTAG Candidates (Turo strict yang TIDAK ada di CP 046 NB) — 3 bab

Action: ubah `strict: true` → `strict: false` untuk sub-materi di bab ini. Akan otomatis tampil sebagai 🌉 Bridge di mode comprehensive.

- **Bab 4 Teknik Integrasi [Mat TL]** (2 sub):
  - `SMA.12.B4.01` Integral substitusi (u-substitution)
  - `SMA.12.B4.03` Integral fungsi trigonometri dasar
- **Bab 6 Dimensi Tiga** (2 sub):
  - `SMA.12.B6.01` Titik, garis, bidang dalam ruang
  - `SMA.12.B6.05` Sudut antara dua garis, garis-bidang, bidang-bidang
- **Bab 7 Irisan Kerucut [Mat TL]** (4 sub):
  - `SMA.12.B7.01` Irisan kerucut — asal geometri
  - `SMA.12.B7.02` Parabola analitik — persamaan dan fokus-direktris
  - `SMA.12.B7.03` Elips analitik — persamaan dan fokus
  - `SMA.12.B7.04` Hiperbola analitik — persamaan dan asimtot

### 🟢 ADD Candidates (NB CP 046 bab yang BELUM ADA di Turo) — 3 bab

Action: pertimbangkan tambah sub-materi baru di peta-prasyarat.json untuk topik ini.

- **K12.B1 Matematika Keuangan** [Wajib] (5 sub-bab NB):
  - Bunga Tunggal dan Majemuk
  - Pinjaman dan Investasi
  - Anuitas (Tetap & Menurun)
  - Cicilan dan Kredit
  - Simulasi Tabungan/Deposito
- **K12.B2 Geometri Lingkaran (Lanjutan)** [Wajib] (4 sub-bab NB):
  - Busur dan Juring Lingkaran
  - Hubungan Panjang Busur dan Luas Juring
  - Teorema Lingkaran
  - Aplikasi Geometri pada Lokasi di Permukaan Bumi
- **K12.B4 Geometri Analitik (Irisan Kerucut)** [Lanjut] (4 sub-bab NB):
  - Persamaan Lingkaran dan Garis Singgung
  - Persamaan Parabola
  - Elips, dan Hiperbola
  - Kedudukan Titik/Garis terhadap Kurva

## Summary

| Metric | Count |
|---|---|
| Strict sub yang propose UNTAG | 23 |
| Sub-bab NB yang propose ADD | 19 |

## Cara apply

1. Pak ustadz review proposal di atas (per kelas).
2. Tandai approve/reject per item.
3. Saya jalankan `apply-strict-adjustments.mjs --untag <kode1,kode2,...>` untuk batch update.
4. Re-generate index + foundation set + commit.

**Catatan**: matching berbasis keyword overlap (heuristik). Beberapa "UNTAG candidate" mungkin sebenarnya valid CP 046 dengan nama bab beda (e.g. "Aritmetika Sosial" K7 mungkin sub dari "Rasio & Perbandingan" di NB). Manual review penting.