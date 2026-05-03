# Comparison: NotebookLM-research vs Claude-direct

Domain: **UTBK Matematika SNBT 2024-2025**
Tanggal: 2026-05-02

| Aspek | NotebookLM (research, 50 sumber) | Claude-direct (training knowledge) |
|---|---|---|
| Total subtes | 3 | 3 |
| Total tipe | **13** | **11** |
| Total subtipe | ~50 | ~38 |
| Sumber dirujuk | 50 URL spesifik | tidak ada |
| Detail kuantitatif (jumlah soal, durasi) | ✅ akurat (PM=42.5 min) | ✅ akurat (PM=42.5 min) |
| Format soal global | 3 (PG, PG kompleks, isian) | 3 (sama) |

## Diff per subtes

### PU-Kuantitatif

| | NotebookLM | Claude-direct |
|---|---|---|
| Tipe | 2 (Aritmetika Dasar, Hubungan Sederhana) | **3** (Logika Aritmetika, Pola & Deret, Inferensi Data) |
| Catatan | Konservatif, fokus pada deskripsi resmi | Lebih luas — masukkan "Inferensi Data" yang sebenarnya tipe overlap dengan PM |

**Verdict:** Claude over-include. PU-K resmi cuma "kuantitas, hubungan matematika sederhana, operasi aritmetika dasar" — visualisasi data lebih ke PM/PK.

### PK (Pengetahuan Kuantitatif)

| | NotebookLM | Claude-direct |
|---|---|---|
| Tipe | **6** | 5 |
| Materi domain | Bilangan, Aljabar/Fungsi, Geometri, Statistika/Peluang | sama |
| HOTS specific | ✅ **Analisis Kecukupan Data** + Perbandingan P vs Q | hanya P vs Q (lupa Sufficiency Data) |
| Tingkat kesulitan Bilangan | medium | easy |

**Verdict:** NotebookLM **menang signifikan** — Claude melewatkan tipe "Analisis Kecukupan Data" yang merupakan ciri khas PK (mirip GMAT Data Sufficiency). Ini tipe yang harus ada di item bank turo.

### PM (Penalaran Matematika)

| | NotebookLM | Claude-direct |
|---|---|---|
| Tipe | **5** (Cerita Pribadi/Sosial/Saintifik dipisah + Interpretasi + Pemodelan) | 3 (Cerita kontekstual digabung + Interpretasi + Pemodelan) |
| Granularitas konteks | per kategori (pribadi/sosial/saintifik dengan subtipe spesifik) | generic ("Konteks personal/sosial/pekerjaan/ilmiah" sebagai subtipe) |

**Verdict:** NotebookLM lebih granular per konteks. Untuk seeding item bank, level granularitas NotebookLM lebih useful (bisa generate batch per konteks).

## Spesifisitas contoh

| | NotebookLM | Claude-direct |
|---|---|---|
| Style | Sangat spesifik dari sumber asli ("waktu dekomposisi sampah anorganik", "skema gaji asisten privat dua opsi gaji pokok") | Generic ("belanja optimal", "biaya proyek", "minimum biaya") |
| Validasi | Bisa di-trace ke sumber URL [n] | Tidak ada anchor |

**Verdict:** NotebookLM **menang telak** untuk seeding generation — contoh spesifik bisa langsung jadi seed prompt untuk Claude generate variasi.

## Kesimpulan

**Quality NotebookLM > Claude-direct** untuk use case ini, dengan margin signifikan. Alasan:

1. **Coverage** — NotebookLM nemu "Analisis Kecukupan Data" yang Claude lupa
2. **Granularitas** — pembagian konteks PM lebih dalam
3. **Spesifisitas** — contoh dari sumber asli, bukan generic
4. **Trazabilitas** — tiap klaim ada citation [n]
5. **Up-to-date** — research paling baru (per Mei 2026), Claude limited ke training data Jan 2026

Tapi Claude-direct **bukan tidak berguna**:
- Lebih cepat (1 detik vs 5-10 menit research)
- Tidak butuh auth setup
- Berguna sebagai **first draft** atau **sanity check** sebelum research
- Bisa identify gap setelah research (mis. Claude over-include "Pola & Deret" di PU-K → pertanyaan: apakah ini benar-benar PU atau PK?)

## Rekomendasi workflow ke depan (untuk olimpiade & reguler)

1. **NotebookLM research dulu** — generate raw report
2. **Claude-direct paralel** — generate baseline tanpa lihat NotebookLM output
3. **Diff + manual reconciliation** — Claude jadi reviewer NotebookLM, vice versa
4. **Final taxonomy.json** — gabungan terbaik dari keduanya, dengan citation NotebookLM

## File terkait

- `utbk-matematika-taxonomy.json` — versi NotebookLM-research
- `utbk-matematika-taxonomy.claude-direct.json` — versi Claude-direct
- `utbk-matematika-report.md` — raw markdown dari NotebookLM
- `utbk-matematika-sources.json` — 50 URL sumber
