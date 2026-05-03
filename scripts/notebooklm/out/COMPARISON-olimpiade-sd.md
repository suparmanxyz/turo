# Comparison: NotebookLM-research vs Claude-direct

Domain: **Olimpiade Matematika SD Indonesia**
Tanggal: 2026-05-02

| Aspek | NotebookLM (research, 31 sumber) | Claude-direct (training knowledge) |
|---|---|---|
| Total tipe soal | 12 (per kategori materi) + 3 eksplorasi khas | 20 (per kategori materi) |
| Total kategori materi | 5 | 6 |
| Profile per kompetisi | ✅ 4 (OSN-K, KMNR, OMI, Matnas/OMITS) dengan detail filosofi | ❌ tidak ada |
| Format soal | **4: PG, Isian, Uraian, Eksplorasi** | 4: PG, Isian, Uraian, **Esai/Pembuktian (salah)** |
| Soal-contoh konkret | ✅ 3 dengan angka spesifik per kompetisi | ❌ generic |
| Citation | 31 URL | 0 |

## Critical errors Claude-direct

🚫 **4 kesalahan/kelewatan signifikan di Claude-direct:**

### 1. Format "Eksplorasi" (CRITICAL MISS)

**NotebookLM:** Format ke-4 yang khas SD = **Eksplorasi** (investigasi non-rutin, banyak solusi, rubrik gradasi mis. 21 titik = 6 poin, 15-17 titik = 1 poin).
**Claude-direct:** Salah identifikasi sebagai **"Esai/Pembuktian"** — yang sebenarnya sangat jarang di SD.
**Implikasi:** Item bank turo perlu support tipe Eksplorasi dengan rubrik penilaian, bukan binary correct/incorrect.

### 2. OMITS adalah kompetisi TIM (MISS)

**NotebookLM:** OMITS (ITS) format **beregu/tim**, kolaborasi & strategi. Data: OMITS 2022 SD = 75 tim → 10 semifinal → 5 final.
**Claude-direct:** Tidak menyebut Matnas/OMITS sebagai kompetisi tim sama sekali.
**Implikasi:** Kalau turo target users mau ikut OMITS, perlu tipe latihan kolaborasi/team-based.

### 3. Pigeonhole Principle (MISS)

**NotebookLM:** Eksplisit identifikasi **Prinsip Sarang Merpati** sebagai materi olimpiade SD penting (kombinatorika).
**Claude-direct:** Tidak menyebut sama sekali, padahal ini standar olimpiade.
**Implikasi:** Item bank harus include tipe pembuktian eksistensi.

### 4. Filosofi MNR & SMS KPM (MISS)

**NotebookLM:** Detail filosofi Matematika Nalaria Realistik (Raden Ridwan Hasan Saputra), Sistem Metode Seikhlasnya, struktur "masalah nyata → konsep → komunikasi matematis".
**Claude-direct:** Hanya sebut "Nalaria Realistik" sebagai label tanpa kedalaman filosofi.
**Implikasi:** Kalau turo positioning mirror MNR, framing pembelajaran harus konsisten dengan filosofinya.

## Where Claude-direct adds value

✅ **5 area Claude lebih detail/granular:**

### 1. Aritmetika Sosial spesifik
Claude-direct: untung-rugi, diskon berlapis, bunga sederhana, pajak — sebagai tipe terpisah dengan subtipe.
NotebookLM: cuma sentuh permukaan dalam konteks "soal cerita".

### 2. Aritmetika Usia
Claude-direct: tipe khusus dengan 4 subtipe (selisih tetap, jumlah, kelipatan, masa lalu/depan).
NotebookLM: tidak terpisah.

### 3. Kecepatan-Jarak-Waktu
Claude-direct: subtipe spesifik (berpapasan, susul-menyusul, rata-rata, pulang-pergi).
NotebookLM: hanya "kecepatan v=s/t".

### 4. Bilangan Spesial
Claude-direct: palindrom, kuadrat sempurna, bilangan bersusun sebagai tipe.
NotebookLM: tidak khusus.

### 5. Konteks Soal Cerita
Claude-direct: 3 konteks (ekonomi, sehari-hari, pertanian-lingkungan) dengan subtipe.
NotebookLM: implicit, tidak strukturkan per konteks.

## Diff per kategori materi

| Kategori | NotebookLM | Claude-direct |
|---|---|---|
| Teori Bilangan | 4 tipe (sistem dasar, FPB-KPK, manipulasi cerdas, modular) | 3 tipe (sifat, FPB-KPK, sisa, bilangan spesial) |
| Aljabar | 2 tipe (persamaan, deret) | 1 (di kategori "Pola & Logika" yang campuran) |
| Geometri | 4 tipe (datar, ruang, sudut/transformasi, **Pythagoras-kesebangunan**) | 4 tipe (luas-keliling, volume, sudut, pengukuran) |
| Statistika | 2 tipe (data manipulation, besaran turunan) | tergabung di Geometri "pengukuran" |
| Kombinatorika | 3 tipe (counting, P-K intuitif, **Pigeonhole**) | 3 tipe (counting, P-K intuitif, peluang) |
| Aritmetika Sosial | gabung di teori bilangan | **5 tipe terpisah** (sosial, usia, KJW, dll) ⭐ |
| Pola & Logika | sebagian di "deret" | 3 tipe (pola bilangan, gambar, logika silogisme) ⭐ |
| Soal Cerita Kontekstual | implicit per kompetisi | **3 tipe konteks** (ekonomi, sehari-hari, pertanian) ⭐ |

⭐ = unique strength

## Verdict

**NotebookLM wins lebih telak dibanding UTBK case** karena:
1. Domain olimpiade lebih niche → training data Claude kurang detail
2. Konteks lokal Indonesia (KMNR, OMI, OMITS) kurang represented di global training data
3. Eksplorasi sebagai format SD-specific susah di-recall tanpa data lokal
4. Filosofi MNR (penemu, metodologi) butuh sumber primer

**Tapi Claude-direct strong di:**
- Tipe soal cerita konvensional (aritmetika sosial/usia/KJW) yang **familiar lintas kurikulum**
- Granularitas struktur (lebih banyak subtipe per tipe)

## Rekomendasi final taxonomy untuk turo

**Gabung kekuatan keduanya:**

```
Olimpiade SD final taxonomy:
├── Format soal (NotebookLM correct: PG/Isian/Uraian/Eksplorasi)
├── Profile kompetisi (NotebookLM: 4 kompetisi + filosofi)
├── Kategori materi (NotebookLM 5 + Claude tambahan):
│   ├── Teori Bilangan & Aritmetika Kompleks (NotebookLM)
│   ├── Aljabar & Pola Penalaran (NotebookLM)
│   ├── Geometri & Visualisasi Spasial (NotebookLM, +Pythagoras)
│   ├── Statistika, Pengukuran & Peluang (NotebookLM)
│   ├── Kombinatorika & Logika Pencacahan (NotebookLM, +Pigeonhole)
│   ├── Aritmetika Sosial & Aplikasi ⭐ (Claude — usia, KJW, sosial)
│   └── Soal Cerita Kontekstual ⭐ (Claude — 3 konteks)
├── Tipe Eksplorasi Khas (NotebookLM: 3 pattern)
└── Strategi Penyelesaian (NotebookLM: 6 strategi)
```

## File terkait

- `olimpiade-sd-taxonomy.json` — versi NotebookLM-research
- `olimpiade-sd-taxonomy.claude-direct.json` — versi Claude-direct
- `olimpiade-sd-report.md` — raw markdown 27.8 KB (filosofi MNR, profil 4 kompetisi, contoh soal lengkap)
- `olimpiade-sd-sources.json` — 31 URL referensi

## Pelajaran untuk pipeline

**Untuk domain niche/lokal**: NotebookLM jauh lebih unggul karena akses sumber lokal up-to-date.
**Untuk topik universal**: Claude-direct cukup baik sebagai baseline, NotebookLM tetap kasih spesifisitas + citation.
**Best practice**: pakai keduanya untuk cross-validation; NotebookLM authoritative + Claude reviewer.
