# Peta Prasyarat Turo — Dokumentasi

**Versi**: 2.0.0
**Tanggal**: 25 April 2026
**Total sub-materi**: 472
**Total relasi prasyarat**: 663

Dokumen ini adalah panduan baca untuk peta prasyarat aplikasi Turo. Untuk parsing programatis, gunakan file `turo-peta-prasyarat.json`. Dokumen markdown ini cocok untuk dibaca manusia dan dipakai sebagai konteks oleh LLM seperti Claude Code.

## Skema relasi prasyarat

Setiap relasi prasyarat memiliki dua atribut: jenis relasi dan weight.

### Jenis relasi

- **STRICT** — Prasyarat wajib dikuasai sebelum sub-materi target dapat dipelajari. Gating prereq. Algoritma Cek Kesiapan akan memblokir akses ke materi target jika STRICT prereq belum lulus.
- **SOFT** — Prasyarat membantu pemahaman tapi tidak wajib. Tidak gating. Sistem mungkin tampilkan saran review tapi tidak memblokir.
- **ALTERNATIVE** — Salah satu dari beberapa prereq sudah cukup. Lulus salah satu = pass. Berguna untuk sub-materi yang punya multiple paths.

### Weight

- **CRITICAL** — Prereq paling penting. Cek Kesiapan: threshold pass minimal 80 persen, soal banyak.
- **IMPORTANT** — Prereq penting. Cek Kesiapan: threshold pass minimal 70 persen, soal cukup.
- **HELPER** — Prereq pelengkap. Cek Kesiapan: threshold pass minimal 60 persen, 1 soal cukup.

## Skema kode sub-materi

Format: `{JENJANG}.{KELAS}.B{NOMOR_BAB}.{NOMOR_URUT}`

Contoh:
- `SD.1.B1.01` — SD Kelas 1, Bab 1, Sub-materi nomor 1
- `SMP.8.B5.01` — SMP Kelas 8, Bab 5, Sub-materi nomor 1
- `SMA.12.B3.04` — SMA Kelas 12, Bab 3, Sub-materi nomor 4

## Distribusi per jenjang dan area

| Jenjang | Bilangan | Aljabar | Geometri | Statistik | Kalkulus | Trigonometri | Logika | Lain |
|---------|----------|---------|----------|-----------|----------|--------------|--------|------|
| SD K1-3 | 62 | - | 25 | 18 | - | - | - | - |
| SD K4-6 | 40 | 2 | 36 | 12 | - | - | - | - |
| SMP | 21 | 44 | 44 | 18 | - | - | - | 3 |
| SMA | 1 | 57 | 8 | 21 | 26 | 12 | 5 | 17 |

## Entry points (sub-materi tanpa prasyarat)

Total 10 sub-materi adalah entry points — sub-materi yang valid dimulai tanpa prereq.

- `SD.1.B1.01` — **Subitasi — mengenali jumlah 1-5 sekilas tanpa menghitung** (SD K1, bilangan)
- `SD.1.B4.01` — **Mengenal bangun datar — lingkaran, segitiga, persegi, persegi panjang** (SD K1, statistik)
- `SD.1.B4.04` — **Mengenal bangun ruang — kubus, balok, bola, tabung** (SD K1, statistik)
- `SD.1.B4.05` — **Posisi benda — kanan, kiri, depan, belakang, atas, bawah** (SD K1, statistik)
- `SD.1.B7.01` — **Membandingkan panjang secara langsung** (SD K1, geometri)
- `SD.1.B7.03` — **Membandingkan berat — lebih berat, lebih ringan** (SD K1, geometri)
- `SD.1.B7.04` — **Membandingkan durasi waktu** (SD K1, geometri)
- `SD.1.B9.01` — **Pola AB — dua elemen berulang** (SD K1, bilangan)
- `SMP.7.B3.01` — **Konsep himpunan & notasi** (SMP K7, lain)
- `SMA.11.B6.01` — **Proposisi — pernyataan benar/salah** (SMA K11, logika)

## Struktur data sub-materi

Setiap sub-materi memiliki struktur berikut:

```json
{
  "kode": "SMP.8.B5.01",
  "nama": "Konsep SPLDV — dua persamaan, dua variabel",
  "jenjang": "SMP",
  "kelas": 8,
  "bab_kode": "B5",
  "bab_nama": "Sistem Persamaan Linear Dua Variabel",
  "area": "aljabar",
  "is_maku": true,
  "is_entry_point": false,
  "durasi_estimasi": "60 menit",
  "penjelasan": "MAKU SIGNATURE: Timbangan 2 variabel...",
  "depth": 8,
  "dependents_count": 12,
  "prereq": [
    {
      "kode": "SMP.8.B4.02",
      "relation": "STRICT",
      "weight": "CRITICAL",
      "reason": "prasyarat utama dari kurikulum"
    },
    {
      "kode": "SMP.7.B5.02",
      "relation": "STRICT",
      "weight": "CRITICAL",
      "reason": "SPLDV adalah ekstensi PLSV ke 2 variabel"
    },
    {
      "kode": "SD.6.B5.01",
      "relation": "STRICT",
      "weight": "IMPORTANT",
      "reason": "metode grafik SPLDV butuh sistem koordinat kartesius"
    }
  ]
}
```

### Field reference

| Field | Tipe | Keterangan |
|-------|------|-----------|
| `kode` | string | Identifier unik sub-materi |
| `nama` | string | Nama lengkap sub-materi |
| `jenjang` | enum | SD / SMP / SMA |
| `kelas` | int | 1-12 |
| `bab_kode` | string | Kode bab (B1, B2, ...) |
| `bab_nama` | string | Nama lengkap bab |
| `area` | enum | bilangan / aljabar / geometri / statistik / kalkulus / trigonometri / logika / lain |
| `is_maku` | bool | Apakah ini sub-materi MAKU (Matematika Bisu, milestone visual) |
| `is_entry_point` | bool | Apakah valid tanpa prereq (foundation) |
| `durasi_estimasi` | string | Estimasi durasi pembelajaran |
| `penjelasan` | string | Tooltip atau deskripsi pedagogis |
| `depth` | int | Kedalaman dari root di pohon prasyarat |
| `dependents_count` | int | Berapa sub-materi yang punya ini sebagai prereq |
| `prereq` | array | Daftar prasyarat dengan relation dan weight |

## Index files

File `turo-peta-prasyarat-index.json` berisi quick lookup indexes:

- `by_jenjang_kelas["SMP.8"]` → daftar kode di SMP K8
- `by_area["aljabar"]` → daftar kode di area aljabar
- `by_bab["SMP.8.B5"]` → daftar kode di SMP K8 Bab 5
- `entry_points` → daftar kode entry points
- `maku_codes` → daftar kode MAKU (untuk milestone selection di diagnostik)
- `dependents[<kode>]` → daftar sub-materi yang punya kode tersebut sebagai prereq

## Cara pakai untuk Claude Code

### Skenario 1: Build prereq tree untuk Cek Kesiapan

```typescript
function getStrictPrereqs(kode: string, peta: PetaPrasyaratData): string[] {
  const node = peta.submateri.find(s => s.kode === kode);
  if (!node) return [];
  return node.prereq
    .filter(p => p.relation === 'STRICT')
    .map(p => p.kode);
}
```

### Skenario 2: Identifikasi blind spot untuk Cek Kesiapan

```typescript
function identifyBlindSpots(
  targetKode: string, 
  userProfile: UserProfile,
  peta: PetaPrasyaratData
): BlindSpot[] {
  const target = peta.submateri.find(s => s.kode === targetKode);
  if (!target) return [];
  
  const blindSpots: BlindSpot[] = [];
  const THREE_MONTHS = 90 * 24 * 60 * 60 * 1000;
  
  for (const prereq of target.prereq) {
    const mastery = userProfile.subMateriMastery[prereq.kode];
    const isFresh = mastery && (Date.now() - mastery.lastAssessedAt) < THREE_MONTHS;
    
    // Hanya STRICT yang gating
    if (!isFresh && prereq.relation === 'STRICT') {
      blindSpots.push({
        kode: prereq.kode,
        weight: prereq.weight,
        reason: prereq.reason
      });
    }
  }
  return blindSpots;
}
```

### Skenario 3: Pilih milestone untuk binary search locator

```typescript
function getMilestoneCandidates(
  jenjang: string, 
  kelas: number,
  index: PetaPrasyaratIndex,
  peta: PetaPrasyaratData
): SubMateri[] {
  const codes = index.by_jenjang_kelas[`${jenjang}.${kelas}`] || [];
  const subMateris = codes
    .map(c => peta.submateri.find(s => s.kode === c))
    .filter((s): s is SubMateri => s !== undefined);
  
  // Prioritas: MAKU dengan dependents tertinggi
  return subMateris
    .filter(s => s.is_maku)
    .sort((a, b) => b.dependents_count - a.dependents_count)
    .slice(0, 5);
}
```

### Skenario 4: Hitung jumlah soal Cek Kesiapan berdasarkan weight

```typescript
function calculateCekKesiapanItems(blindSpots: BlindSpot[]): number {
  let total = 0;
  for (const bs of blindSpots) {
    if (bs.weight === 'CRITICAL') total += 2;       // 2 soal per CRITICAL
    else if (bs.weight === 'IMPORTANT') total += 1; // 1 soal per IMPORTANT
    else total += 1;                                // 1 soal per HELPER
  }
  // Plus 50% buffer (sesuai SRS - diagnostik adalah USP)
  return Math.ceil(total * 1.5);
}
```

## Catatan tentang revisi V2

Dibanding versi awal, V2 mengubah:

1. **Multi-prereq**: 165 sub-materi sekarang punya lebih dari 1 prereq (sebelumnya hanya 38). Ini lebih realistis pedagogis.
2. **Jenis relasi**: STRICT vs SOFT vs ALTERNATIVE — sebelumnya semua dianggap STRICT.
3. **Weight**: CRITICAL vs IMPORTANT vs HELPER — untuk fine-tuning Cek Kesiapan.
4. **Reason**: setiap prereq punya field `reason` yang menjelaskan kenapa ini prereq.
5. **Area**: 8 area (bilangan, aljabar, dst) untuk content balancing di adaptive testing.
6. **Entry points**: 10 sub-materi tanpa prereq di-flag eksplisit `is_entry_point: true`.
7. **Cycle-free**: validasi memastikan tidak ada circular dependency.
8. **No forward refs**: prereq selalu di kelas/bab lebih awal dari sub-materi target.

## Limitasi yang perlu diketahui

- **Inferensi otomatis**: Banyak prereq di V2 dihasilkan oleh aturan pedagogis otomatis. Sampling validasi oleh ahli matematika direkomendasikan sebelum dipakai produksi.
- **Reason quality**: Field `reason` cukup baik tapi belum mencakup nuansa pedagogis terdalam.
- **ALTERNATIVE relation**: Saat ini belum digunakan di V2 (semua STRICT atau SOFT). Untuk multi-path materi, perlu manual annotation.
