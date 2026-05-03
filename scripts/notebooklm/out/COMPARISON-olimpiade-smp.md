# Comparison: NotebookLM-research vs Claude-direct

Domain: **Olimpiade Matematika SMP/MTs Indonesia**
Tanggal: 2026-05-02

| Aspek | NotebookLM (research, 35 sumber) | Claude-direct |
|---|---|---|
| Format soal | **4** (PG/Isian CBT, Uraian, Pembuktian, **Eksplorasi**) | 4 (PG, Isian, Uraian, Pembuktian) |
| Detail format per tahap | ✅ OSN-K=CBT 20-25 isian, OSP=Bagian A+B, OSN nasional=2 hari 4-4.5 jam | ❌ generic |
| Profile per kompetisi | ✅ 3 lengkap (OSN, KSM/OMI, KMNR) + filosofi | ❌ tidak ada |
| Integrasi Islam (KSM/OMI) | ✅ tabel parameter (Al-Qur'an, Fiqh, Sejarah, Tajwid) | ❌ tidak ada sama sekali |
| Total kategori materi | 4 + statistika gabung | 4 |
| Total tipe | ~22 + 7 teknik pembuktian | ~16 + 7 strategi |
| Citation | 35 URL | 0 |

## Critical errors / gaps Claude-direct

### 🚫 5 yang missing telak

#### 1. Format "Eksplorasi" (untuk OSN nasional)
**NotebookLM**: Format soal eksplorasi di OSN nasional 2-hari, 4-4.5 jam — definisi/pola baru, cari sifat umum/generalisasi.
**Claude-direct**: Tidak masukkan. Hanya 4 format dengan "Pembuktian" sebagai paling tinggi.

#### 2. KSM/OMI integrasi Islam (TELAK MISS)
**NotebookLM**: Detail tabel parameter:
- Al-Qur'an: jumlah ayat (Al-Baqarah=286), nomor surat
- Fiqh: kadar zakat 2.5%, **rakaat shalat wajib total 17** (Subuh 2 + Dzuhur 4 + Ashar 4 + Maghrib 3 + Isya 4)
- Sejarah Islam: tahun peristiwa, anggota keluarga Nabi
- Tajwid: jumlah hukum bacaan (ikhfa, idgham) sebagai data statistik

**Claude-direct**: Tidak menyebut KSM/OMI sama sekali. Identitas integrasi Islam di soal matematika hilang.
**Implikasi:** Item bank turo perlu support tipe soal "Matematika Terintegrasi Islam" — substansial 1/3 ekosistem olimpiade SMP.

#### 3. Reduksi Derajat Polinomial (TEKNIK KUNCI)
**NotebookLM**: Eksplisit identifikasi sebagai teknik kunci olimpiade. Contoh: dari `3x²+x=1` cari `6x³-x²-3x+2010` → manipulasi → 2009. Tanpa cari akar irrasional.
**Claude-direct**: Hanya sebut "substitusi cerdas" sebagai strategi umum. Tidak detail teknik reduksi derajat.

#### 4. Basis Bilangan
**NotebookLM**: Tipe terpisah — konversi basis 10 ↔ basis N, operasi aritmatika di basis non-standar.
**Claude-direct**: Tidak disebut sama sekali.

#### 5. Teorema Ceva / Menelaus / Pick
**NotebookLM**: Eksplisit sebut sebagai teorema lanjut yang sering muncul OSN SMP, dirujuk via Mathcyber1997.
**Claude-direct**: Tidak disebut. Hanya "Pythagoras + triple, kesebangunan AA/SAS/SSS".

### ⚠️ 3 detail yang kurang presisi di Claude-direct

1. **KMNR penalti**: NotebookLM spesifik "+4/-1/0"; Claude generic
2. **Aturan keterbagian**: NotebookLM detail aturan 8 (3 digit terakhir), 9 (jumlah digit), 11 (selang-seling), komposit; Claude generic
3. **Filosofi MNR & KPM**: NotebookLM detail "suprarasional" + Sistem Metode Seikhlasnya; Claude tidak

## Where Claude-direct adds value

### ✅ 4 area Claude lebih granular

#### 1. Pertidaksamaan
Claude-direct: 4 tipe (linear, kuadrat, rasional, AM-GM); NotebookLM: 1 tipe gabungan.

#### 2. Persamaan Diophantine
Claude-direct: 4 subtipe (linear ax+by=c, persamaan dengan variabel bilangan bulat, x²-y²=k, faktorisasi solusi); NotebookLM: gabung jadi 1.

#### 3. Bilangan Spesial
Claude-direct: tipe terpisah (kuadrat sempurna, kubik, palindrom, sempurna); NotebookLM: gabung di "sifat keterbagian".

#### 4. Graph Theory dasar
Claude-direct: bipartit, pewarnaan, Hamiltonian, jabat tangan, lintasan dalam grid; NotebookLM: tidak masuk untuk SMP (mungkin lebih ke SMA).

## Diff per kategori materi

| Kategori | NotebookLM | Claude-direct | Notes |
|---|---|---|---|
| Teori Bilangan | 5 tipe (+ basis bilangan ⭐, + aturan keterbagian detail ⭐) | 4 tipe (+ bilangan spesial ⭐) | NotebookLM menang detail aturan |
| Aljabar | 5 tipe (+ identitas aljabar khusus ⭐, + reduksi derajat polinomial ⭐) | 4 tipe (+ pertidaksamaan detail ⭐) | NotebookLM menang teknik |
| Geometri | 5 tipe (+ rasio luas pembuktian ⭐, + Ceva/Menelaus/Pick ⭐) | 5 tipe (+ transformasi simetri ⭐) | NotebookLM menang teorema lanjut |
| Kombinatorika & Stat | 5 tipe (+ eksklusi-inklusi terpisah ⭐) | 4 tipe (+ graph theory ⭐) | Claude graph theory lanjut |

⭐ = unique strength

## Verdict

**NotebookLM menang signifikan**, terutama karena 2 area:

1. **KSM/OMI integrasi Islam** — corpus soal madrasah hilang total di Claude. Ini ~1/3 ekosistem olimpiade SMP yang Claude tidak tahu.
2. **Teknik kunci olimpiade** — reduksi derajat polinomial, aturan keterbagian komposit, teorema lanjut (Ceva/Menelaus/Pick) — Claude generic.

Tapi gap **lebih kecil dibanding olimpiade SD case** karena:
- Materi olimpiade SMP lebih universal (dekat dengan kurikulum internasional)
- Claude punya knowledge global olimpiade matematika SMP
- Yang missing terutama context lokal Indonesia (KSM, OMI, KMNR)

## Rekomendasi final taxonomy untuk turo

Gabung kekuatan:

```
Olimpiade SMP final:
├── Format soal (NotebookLM 4: CBT/Uraian/Pembuktian/Eksplorasi)
├── Profile kompetisi (NotebookLM: OSN/KSM-OMI/KMNR + filosofi + tahapan)
├── Soal Terintegrasi Madrasah ⭐ (NotebookLM: 4 komponen Islam)
├── Kategori materi:
│   ├── Teori Bilangan (NotebookLM 5: keterbagian/prima-FPB/modular/diophantine/basis ⭐)
│   ├── Aljabar (NotebookLM 5 + Claude pertidaksamaan detail)
│   ├── Geometri (NotebookLM 5: bidang/lingkaran/ruang/rasio-luas ⭐/teorema-lanjut ⭐)
│   └── Kombinatorika (NotebookLM 5 + Claude graph theory dasar)
├── Teknik Pembuktian (NotebookLM 7: termasuk reduksi derajat ⭐, Pigeonhole, dll)
└── Referensi belajar (NotebookLM: MatikZone, Mathcyber1997)
```

## File terkait

- `olimpiade-smp-taxonomy.json` — versi NotebookLM-research (12 KB+ struktur)
- `olimpiade-smp-taxonomy.claude-direct.json` — versi Claude-direct
- `olimpiade-smp-report.md` — raw 31 KB (filosofi + 5 contoh soal lengkap dengan pembahasan)
- `olimpiade-smp-sources.json` — 35 URL referensi
