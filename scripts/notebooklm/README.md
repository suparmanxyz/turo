# NotebookLM Research → Turo Taxonomy

Pipeline ekstrak taxonomy soal (UTBK / olimpiade / reguler) dari NotebookLM untuk seeding `item_bank` turo.

## Prasyarat

- `notebooklm-py[browser]` terinstall (`pip install "notebooklm-py[browser]"`)
- `playwright install chromium`
- Login: `notebooklm login` (interaktif, butuh ENTER di terminal user)
- Set `$env:PYTHONIOENCODING = "utf-8"` di setiap call (fix bug Rich + cp1252)

## Workflow per domain (mis. UTBK Matematika)

```powershell
$NB = "C:\Users\welcome\AppData\Roaming\Python\Python314\Scripts\notebooklm.exe"
$env:PYTHONIOENCODING = "utf-8"

# 1. Buat notebook
& $NB create "Turo Research: <Domain>"

# 2. Set context (pakai partial ID)
& $NB use <prefix-8-char>

# 3. Fire deep research dengan import-all
& $NB source add-research "<query spesifik>" --mode deep --import-all --no-wait

# 4. Tunggu (5-10 menit untuk deep mode)
& $NB research wait

# 5. Ambil report lengkap (auto-generated, JSON penuh)
& $NB research status --json > research-result.json
```

## Catatan penting & gotcha

1. **`--import-all` tidak benar-benar import sources** ke notebook (per 2026-05-02). Sources hanya muncul di JSON response research, bukan di `source list`. Implikasi: `ask` setelah research **tidak punya konteks** dari sumber.

2. **Solusi**: ambil `report_markdown` dari `research status --json`. Report ini SUDAH berisi sintesis dari semua sumber (puluhan ribu kata, taxonomy lengkap dengan kutipan `[1, 2, 3]`).

3. **`source list` warning** "API structure may have changed" — bug parser library, ignore.

4. **Cookie login volatile** — kalau API call gagal "Authentication expired" walau `auth check` pass, re-login di terminal user (`notebooklm login` + ENTER).

5. **Multi-line prompt ke `ask`** broken di PowerShell — gunakan single-line atau jangan pakai `ask` sama sekali (cukup parse report markdown).

## Output per domain

Folder `out/<domain>-...`:
- `<domain>-report.md` — raw markdown report dari NotebookLM (sumber data utama)
- `<domain>-sources.json` — daftar URL + title sumber yang dirujuk
- `<domain>-taxonomy.json` — taxonomy terstruktur untuk consumer turo (parsed dari report)

## Contoh hasil pertama

`out/utbk-matematika-*` (research 2026-05-02):
- 50 sumber web di-research
- Report 29.9 KB markdown
- Taxonomy: 3 subtes (PU-Kuantitatif, PK, PM) × multi-tipe + 4 domain materi + 3 format soal global

## Roadmap

- [ ] Olimpiade matematika SD (KMNR, OMI, Matnasoa)
- [ ] Olimpiade matematika SMP/SMA (OSN, IMO)
- [ ] Soal reguler kurikulum (CP 046 — per fase)
- [ ] Bandingkan output NotebookLM vs Claude direct (quality benchmark)
- [ ] Otomasi: script reusable yang ambil domain+query → output 3 file
