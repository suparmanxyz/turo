# Comparison: NotebookLM-research vs Claude-direct

Domain: **Olimpiade Matematika SMA Indonesia**
Tanggal: 2026-05-02

## ⚠️ ASYMMETRIC COMPARISON

Berbeda dengan UTBK/SD/SMP, **comparison ini tidak apple-to-apple** karena NotebookLM mengalami rate limit deep mode setelah 3 deep research di hari sama. SMA terpaksa pakai `--mode fast` yang ternyata **tidak generate report markdown** — hanya kumpulan URL.

| Aspek | NotebookLM (fast mode FALLBACK) | Claude-direct |
|---|---|---|
| Total URL ditemukan | 10 | tidak ada |
| Synthesized report | ❌ TIDAK ADA | n/a |
| Total tipe soal | n/a (cuma topic hints dari URL titles) | ~17 tipe + 9 teknik pembuktian |
| Citation | 10 URL | 0 |
| Authoritative? | ❌ TIDAK | ✅ structured tapi unverified |

## Yang bisa dipelajari dari URL titles NotebookLM

Walau tanpa report sintesis, judul URL kasih sinyal kuat tentang topic-topic yang **dikonfirmasi muncul** di olimpiade SMA Indonesia:

| Topic dari URL | Status di Claude-direct |
|---|---|
| Pembuktian Matematis (Analisis Real-style) | ✅ ada (Teknik pembuktian: induksi, kontradiksi, dll) |
| Persamaan Fungsional (Cauchy, Evan Chen handout) | ✅ ada (Aljabar > Persamaan Fungsional, 4 subtipe) |
| Order Modulo Prima (Evan Chen) | ✅ ada (Teori Bilangan > Modular Lanjut, Fermat-Euler) |
| Kombinatorika Olimpiade (Berkeley handout) | ✅ ada (Counting Lanjut, Pigeonhole, Burnside, Ramsey) |
| Seleksi IMO Indonesia (Pelatnas → 6 siswa IMO 2025) | ✅ ada (Tingkat Kompetisi: Pelatnas IMO, IMO international) |

**5/5 topic NotebookLM ada di Claude-direct.** Ini **strong signal** Claude-direct olimpiade SMA berkualitas baik untuk **topic universal** (yang memang dekat dengan corpus IMO global).

## Sumber resmi yang ditemukan NotebookLM

NotebookLM kasih 2 sumber **resmi authoritative** yang Claude tidak akan tahu langsung:

1. **PEDOMAN OSN SMA/MA 2024** (Kemendikdasmen) — silabus + format ujian resmi
2. **Silabus Olimpiade Matematika SMA** (jawapos)

🔍 **Action item**: WebFetch dua URL ini untuk verify Claude-direct taxonomy → bisa identifikasi gap khusus Indonesia (mis. integrasi KSM/OMI MA, format CBT spesifik, dll yang biasanya niche lokal).

## Verdict tentatif (perlu retry deep mode)

**Sementara tidak bisa konfirmasi gap NotebookLM vs Claude untuk SMA** — comparison perlu deep mode untuk fair.

**Hipotesis berdasar pattern 3 case sebelumnya:**

| Domain | Gap NotebookLM > Claude | Alasan |
|---|---|---|
| UTBK Matematika | sedang | topic universal-nasional |
| Olimpiade SD | besar (telak) | niche lokal Indonesia |
| Olimpiade SMP | signifikan | niche lokal + KSM/OMI |
| **Olimpiade SMA (predicted)** | **kecil-sedang** | topic global IMO, less Indonesia-specific |

**Expected gap untuk SMA** lebih kecil karena:
- Olimpiade SMA materi konvergen ke standar IMO global
- Evan Chen, Berkeley combinatorics — sumber **internasional**
- Claude-direct dilatih dengan corpus olimpiade global

**Yang masih akan jadi gap (prediksi):**
- Format spesifik OSN-K/P SMA Indonesia
- KSM MA / OMI MA (madrasah aliyah) — integrasi Islam (sangat mungkin missing di Claude)
- Filosofi/struktur Pelatnas TOMI Indonesia

## Rekomendasi action

1. **Tomorrow**: Re-run `notebooklm source add-research ... --mode deep --import-all` saat quota reset. Akan dapat report 30+ KB seperti UTBK/SD/SMP.
2. **Sementara**: Gunakan `olimpiade-sma-taxonomy.claude-direct.json` sebagai working draft.
3. **Bonus**: Pakai sumber resmi PEDOMAN OSN SMA 2024 (URL ada di sources.json) untuk validasi Claude-direct.

## File terkait

- `olimpiade-sma-taxonomy.json` — **fallback meta-only** (tanpa report sintesis)
- `olimpiade-sma-taxonomy.claude-direct.json` — versi lengkap Claude-direct (PRIMARY untuk sekarang)
- `olimpiade-sma-report.md` — placeholder explaining fast mode limitation
- `olimpiade-sma-sources.json` — 10 URL termasuk 2 sumber resmi Kemendikdasmen + 2 handout Evan Chen
