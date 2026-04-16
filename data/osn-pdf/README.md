# Folder PDF OSN SMP

Taruh file PDF resmi OSN/KSN SMP di sini. Penamaan disarankan:

```
osn-smp-2023-kabupaten.pdf
osn-smp-2023-provinsi.pdf
osn-smp-2023-nasional.pdf
osn-smp-2024-kabupaten.pdf
...
```

## Sumber resmi

- **Puspresnas Kemdikbud**: https://puspresnas.kemdikbud.go.id/ (cari arsip OSN/KSN SMP)
- **Website OSN**: https://osnkemendikbud.id/ (kadang pindah domain)
- **Kemdikbud / Pusat Prestasi Nasional YouTube** (soal-soal kadang dipublikasikan via video/dokumen pendamping)

## Jalankan

Setelah PDF ada di folder ini:

```bash
npx tsx scripts/bulk-import-pdf.ts data/osn-pdf
```

Script akan ekstrak semua soal via Claude Sonnet & simpan ke Firestore collection `soalManual`.
