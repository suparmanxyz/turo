import type { Elemen, Kelas } from "@/types";

/**
 * Daftar bab Matematika per kelas, struktur tipikal Kurikulum Merdeka
 * (mengacu pada CP 046/2025 + pola buku Kemendikbud Kurmer 2022/2023).
 *
 * STATUS: DRAFT — disusun berdasarkan pola umum, perlu di-cross-check
 * dengan buku resmi Kemendikbud per kelas. Pak ustadz boleh koreksi
 * langsung di file ini.
 */

export type Bab = {
  slug: string;
  nama: string;
  ringkasan: string;
  elemen: Elemen;
};

export const BAB_PER_KELAS: Record<Kelas, Bab[]> = {
  // --- SD Fase A ---
  1: [
    { slug: "bilangan-1-10", nama: "Bilangan sampai 10", ringkasan: "Mengenal, menulis, dan mengurutkan bilangan 0–10.", elemen: "bilangan" },
    { slug: "bilangan-1-20-penjumlahan", nama: "Bilangan sampai 20 dan Penjumlahan", ringkasan: "Bilangan 11–20, penjumlahan dengan benda konkret.", elemen: "bilangan" },
    { slug: "pengurangan", nama: "Pengurangan Bilangan", ringkasan: "Konsep pengurangan dan kalimat matematika 'sisa'.", elemen: "bilangan" },
    { slug: "pola-bukan-bilangan", nama: "Pola Bukan Bilangan", ringkasan: "Mengenali, meniru, dan melanjutkan pola gambar/warna/bunyi.", elemen: "aljabar" },
    { slug: "pengukuran-langsung", nama: "Pengukuran Panjang dan Berat", ringkasan: "Membandingkan panjang/berat secara langsung dan dengan satuan tidak baku.", elemen: "pengukuran" },
    { slug: "bangun-datar-dan-ruang", nama: "Bangun Datar dan Bangun Ruang", ringkasan: "Mengenal segitiga, segiempat, lingkaran, kubus, balok, kerucut, bola.", elemen: "geometri" },
    { slug: "posisi-benda", nama: "Posisi Benda", ringkasan: "Kanan, kiri, depan, belakang, atas, bawah.", elemen: "geometri" },
    { slug: "data-turus-piktogram", nama: "Data dengan Turus dan Piktogram", ringkasan: "Mengelompokkan dan menyajikan data sederhana.", elemen: "analisis-data-peluang" },
  ],

  2: [
    { slug: "bilangan-1-100", nama: "Bilangan sampai 100", ringkasan: "Membaca, menulis, nilai tempat puluhan/satuan, mengurutkan bilangan 1–100.", elemen: "bilangan" },
    { slug: "penjumlahan-pengurangan-2-digit", nama: "Penjumlahan dan Pengurangan", ringkasan: "Operasi +/− bilangan 2 angka dengan dan tanpa teknik menyimpan/meminjam.", elemen: "bilangan" },
    { slug: "pecahan-pengantar", nama: "Pecahan Sederhana", ringkasan: "Mengenal ½ dan ¼ melalui konteks membagi benda.", elemen: "bilangan" },
    { slug: "simbol-sama-dengan", nama: "Simbol Sama dengan (=)", ringkasan: 'Memahami makna "=" dalam kalimat matematika.', elemen: "aljabar" },
    { slug: "pengukuran-tidak-baku", nama: "Pengukuran Panjang & Berat (Lanjutan)", ringkasan: "Estimasi panjang dan berat dengan satuan tidak baku.", elemen: "pengukuran" },
    { slug: "durasi-waktu", nama: "Durasi Waktu", ringkasan: "Membandingkan durasi waktu kegiatan sehari-hari.", elemen: "pengukuran" },
    { slug: "komposisi-dekomposisi-bangun", nama: "Komposisi & Dekomposisi Bangun Datar", ringkasan: "Menyusun dan mengurai bangun datar sederhana.", elemen: "geometri" },
    { slug: "data-piktogram-lanjut", nama: "Penyajian Data Lanjutan", ringkasan: "Turus dan piktogram sampai 4 kategori.", elemen: "analisis-data-peluang" },
  ],

  // --- SD Fase B ---
  3: [
    { slug: "bilangan-cacah-10000", nama: "Bilangan Cacah sampai 10.000", ringkasan: "Membaca, menulis, nilai tempat sampai puluhan ribu.", elemen: "bilangan" },
    { slug: "operasi-penjumlahan-pengurangan", nama: "Penjumlahan & Pengurangan ≤1.000", ringkasan: "Menyelesaikan masalah +/− bilangan cacah sampai 1.000.", elemen: "bilangan" },
    { slug: "perkalian-pembagian", nama: "Perkalian dan Pembagian", ringkasan: "×÷ bilangan cacah sampai 100 dengan benda konkret/gambar.", elemen: "bilangan" },
    { slug: "kelipatan-faktor", nama: "Kelipatan dan Faktor", ringkasan: "Konsep kelipatan dan faktor bilangan cacah.", elemen: "bilangan" },
    { slug: "pecahan-senilai", nama: "Pecahan Senilai", ringkasan: "Membandingkan, mengurutkan pecahan; pecahan senilai.", elemen: "bilangan" },
    { slug: "nilai-tidak-diketahui", nama: "Nilai Tidak Diketahui (+/−)", ringkasan: "Mencari nilai yang belum diketahui dalam kalimat matematika.", elemen: "aljabar" },
    { slug: "pola-bilangan", nama: "Pola Bilangan", ringkasan: "Pola bilangan membesar dan mengecil.", elemen: "aljabar" },
    { slug: "satuan-baku-panjang-berat", nama: "Satuan Baku Panjang & Berat", ringkasan: "Hubungan antar-satuan cm-m dan g-kg.", elemen: "pengukuran" },
    { slug: "diagram-batang", nama: "Diagram Batang", ringkasan: "Menyajikan data dengan diagram batang skala satu satuan.", elemen: "analisis-data-peluang" },
  ],

  4: [
    { slug: "bilangan-besar", nama: "Bilangan Cacah Besar", ringkasan: "Operasi pada bilangan cacah lebih besar dengan teknik menyimpan/meminjam lanjutan.", elemen: "bilangan" },
    { slug: "pecahan-desimal-persen", nama: "Pecahan, Desimal, dan Persen", ringkasan: "Konversi antar pecahan, desimal, dan persen.", elemen: "bilangan" },
    { slug: "luas-volume-tidak-baku", nama: "Pengukuran Luas dan Volume", ringkasan: "Estimasi luas dan volume dengan satuan tidak baku & baku.", elemen: "pengukuran" },
    { slug: "pola-objek", nama: "Pola Gambar dan Objek", ringkasan: "Mengembangkan pola gambar/objek sederhana.", elemen: "aljabar" },
    { slug: "ciri-bangun-datar", nama: "Ciri Bangun Datar", ringkasan: "Deskripsi ciri segiempat, segitiga, segi banyak.", elemen: "geometri" },
    { slug: "tabel-piktogram", nama: "Tabel, Piktogram, Diagram Gambar", ringkasan: "Menganalisis dan menginterpretasi data dalam berbagai bentuk.", elemen: "analisis-data-peluang" },
  ],

  // --- SD Fase C ---
  5: [
    { slug: "bilangan-jutaan", nama: "Bilangan Cacah sampai 1.000.000", ringkasan: "Membaca, menulis, nilai tempat sampai jutaan; operasi sampai 100.000.", elemen: "bilangan" },
    { slug: "kpk-fpb", nama: "KPK dan FPB", ringkasan: "Menyelesaikan masalah dengan KPK dan FPB.", elemen: "bilangan" },
    { slug: "operasi-pecahan", nama: "Operasi Pecahan", ringkasan: "+−×÷ pecahan, pecahan campuran, dan konversi.", elemen: "bilangan" },
    { slug: "bilangan-desimal-1-koma", nama: "Bilangan Desimal", ringkasan: "Membandingkan dan mengurutkan bilangan desimal (1 angka koma).", elemen: "bilangan" },
    { slug: "rasio-proporsi-sd", nama: "Rasio Satuan dan Proporsi", ringkasan: "Bernalar proporsional sehari-hari dengan rasio satuan.", elemen: "aljabar" },
    { slug: "keliling-luas", nama: "Keliling dan Luas Bangun Datar", ringkasan: "Keliling & luas segitiga, segiempat, segi banyak, dan gabungannya.", elemen: "pengukuran" },
    { slug: "pengukuran-sudut", nama: "Pengukuran Sudut", ringkasan: "Mengukur besar sudut pada bangun datar / dua garis berpotongan.", elemen: "pengukuran" },
    { slug: "bangun-ruang-kubus-balok", nama: "Bangun Ruang: Kubus dan Balok", ringkasan: "Konstruksi & dekomposisi kubus, balok, dan gabungannya.", elemen: "geometri" },
    { slug: "tabel-frekuensi", nama: "Tabel Frekuensi", ringkasan: "Diagram batang dan tabel frekuensi untuk analisis data.", elemen: "analisis-data-peluang" },
  ],

  6: [
    { slug: "bilangan-bulat-pengantar", nama: "Bilangan Bulat (Pengantar)", ringkasan: "Bilangan negatif, garis bilangan, +/− bilangan bulat sederhana.", elemen: "bilangan" },
    { slug: "operasi-pecahan-lanjut", nama: "Operasi Pecahan Lanjutan", ringkasan: "×÷ pecahan dengan bilangan asli; bentuk pecahan lain.", elemen: "bilangan" },
    { slug: "uang-literasi-finansial-sd", nama: "Uang dan Literasi Finansial Dasar", ringkasan: "Menyelesaikan masalah yang berkaitan dengan uang.", elemen: "bilangan" },
    { slug: "lokasi-sistem-berpetak", nama: "Lokasi pada Peta Berpetak", ringkasan: "Menentukan lokasi dan posisi pada peta sistem koordinat sederhana.", elemen: "geometri" },
    { slug: "visualisasi-spasial", nama: "Visualisasi Spasial Bangun Ruang", ringkasan: "Pandangan depan, atas, samping bangun ruang.", elemen: "geometri" },
    { slug: "durasi-waktu-lanjut", nama: "Durasi Waktu Lanjutan", ringkasan: "Menghitung durasi waktu antar peristiwa.", elemen: "pengukuran" },
    { slug: "kemungkinan-kejadian", nama: "Kemungkinan Kejadian", ringkasan: "Menentukan kemungkinan lebih besar/kecil dalam percobaan acak.", elemen: "analisis-data-peluang" },
  ],

  // --- SMP Fase D ---
  7: [
    { slug: "bilangan-bulat", nama: "Bilangan Bulat", ringkasan: "Bilangan positif/negatif, garis bilangan, operasi +−×÷ bilangan bulat.", elemen: "bilangan" },
    { slug: "bilangan-rasional", nama: "Bilangan Rasional", ringkasan: "Pecahan, desimal, operasi pada bilangan rasional, estimasi.", elemen: "bilangan" },
    { slug: "rasio-proporsi", nama: "Rasio dan Proporsi", ringkasan: "Skala, proporsi, laju perubahan, literasi finansial.", elemen: "bilangan" },
    { slug: "bentuk-aljabar", nama: "Bentuk Aljabar", ringkasan: "Menyatakan situasi ke bentuk aljabar; sifat komutatif/asosiatif/distributif.", elemen: "aljabar" },
    { slug: "persamaan-pertidaksamaan-linear-1v", nama: "Persamaan & Pertidaksamaan Linear Satu Variabel", ringkasan: "Penyelesaian PLSV dan PtLSV beserta penerapannya.", elemen: "aljabar" },
    { slug: "segiempat-segitiga", nama: "Segiempat dan Segitiga", ringkasan: "Sifat-sifat dan keliling/luas segiempat & segitiga.", elemen: "geometri" },
    { slug: "data-statistik-pengantar", nama: "Statistika: Penyajian Data", ringkasan: "Diagram batang, lingkaran, dan interpretasi data.", elemen: "analisis-data-peluang" },
    { slug: "peluang-pengantar", nama: "Peluang Sederhana", ringkasan: "Pengertian peluang dan frekuensi relatif.", elemen: "analisis-data-peluang" },
  ],

  8: [
    { slug: "bilangan-berpangkat-akar", nama: "Bilangan Berpangkat dan Bentuk Akar", ringkasan: "Pangkat bulat, akar, notasi ilmiah.", elemen: "bilangan" },
    { slug: "pola-barisan", nama: "Pola Bilangan dan Barisan", ringkasan: "Menggeneralisasi pola bilangan & susunan benda.", elemen: "aljabar" },
    { slug: "koordinat-kartesius", nama: "Sistem Koordinat Kartesius", ringkasan: "Titik, jarak antar titik, kuadran.", elemen: "geometri" },
    { slug: "relasi-fungsi", nama: "Relasi dan Fungsi", ringkasan: "Domain, kodomain, range; representasi fungsi.", elemen: "aljabar" },
    { slug: "persamaan-garis", nama: "Persamaan Garis Lurus", ringkasan: "Gradien, persamaan garis melalui satu/dua titik, fungsi linear.", elemen: "aljabar" },
    { slug: "spldv", nama: "Sistem Persamaan Linear Dua Variabel", ringkasan: "Substitusi, eliminasi, grafik untuk SPLDV.", elemen: "aljabar" },
    { slug: "pythagoras", nama: "Teorema Pythagoras", ringkasan: "Pembuktian dan penerapan; bilangan irasional & jarak titik.", elemen: "geometri" },
    { slug: "statistika-mean-median-modus", nama: "Statistika: Pemusatan Data", ringkasan: "Mean, median, modus, jangkauan; sampel populasi.", elemen: "analisis-data-peluang" },
  ],

  9: [
    { slug: "persamaan-kuadrat-pengantar", nama: "Persamaan Kuadrat (Pengantar)", ringkasan: "Bentuk persamaan kuadrat sederhana dan akar-akarnya.", elemen: "aljabar" },
    { slug: "fungsi-kuadrat-pengantar", nama: "Fungsi Kuadrat (Pengantar)", ringkasan: "Grafik parabola sederhana, titik puncak.", elemen: "aljabar" },
    { slug: "transformasi-geometri", nama: "Transformasi Geometri", ringkasan: "Refleksi, translasi, rotasi, dilatasi pada bidang Kartesius.", elemen: "geometri" },
    { slug: "kongruensi-kesebangunan", nama: "Kekongruenan dan Kesebangunan", ringkasan: "Sifat kongruen & sebangun pada segitiga & segiempat.", elemen: "geometri" },
    { slug: "lingkaran-pengantar", nama: "Lingkaran", ringkasan: "Keliling, luas, panjang busur, sudut & luas juring.", elemen: "pengukuran" },
    { slug: "bangun-ruang-sisi-lengkung", nama: "Bangun Ruang Sisi Lengkung", ringkasan: "Tabung, kerucut, bola — luas permukaan & volume.", elemen: "pengukuran" },
    { slug: "jaring-jaring-prisma-limas", nama: "Prisma & Limas", ringkasan: "Jaring-jaring, luas permukaan, volume.", elemen: "pengukuran" },
    { slug: "peluang-frekuensi-harapan", nama: "Peluang & Frekuensi Harapan", ringkasan: "Peluang kejadian sederhana; frekuensi harapan.", elemen: "analisis-data-peluang" },
  ],

  // --- SMA Fase E ---
  10: [
    { slug: "eksponen-pangkat-pecahan", nama: "Eksponen dan Bilangan Berpangkat Pecahan", ringkasan: "Generalisasi sifat-sifat pangkat termasuk pangkat pecahan.", elemen: "bilangan" },
    { slug: "fungsi-eksponensial", nama: "Fungsi Eksponensial", ringkasan: "Persamaan eksponensial (basis sama) dan grafik fungsi eksponensial.", elemen: "aljabar-dan-fungsi" },
    { slug: "sptldv", nama: "Sistem Pertidaksamaan Linear Dua Variabel", ringkasan: "Penyelesaian SPtLDV secara grafik dan aplikasi.", elemen: "aljabar-dan-fungsi" },
    { slug: "persamaan-fungsi-kuadrat", nama: "Persamaan & Fungsi Kuadrat", ringkasan: "Akar-akar (termasuk imajiner), grafik parabola, aplikasi.", elemen: "aljabar-dan-fungsi" },
    { slug: "trigonometri-sudut-lancip", nama: "Trigonometri Sudut Lancip", ringkasan: "Perbandingan sin, cos, tan dari sudut lancip dalam segitiga siku-siku.", elemen: "geometri" },
    { slug: "statistika-kuartil-boxplot", nama: "Statistika: Kuartil & Box Plot", ringkasan: "Jangkauan kuartil, interkuartil, box plot, histogram, dot plot.", elemen: "analisis-data-peluang" },
    { slug: "diagram-pencar", nama: "Diagram Pencar", ringkasan: "Hubungan dua variabel numerik, evaluasi laporan statistika.", elemen: "analisis-data-peluang" },
  ],

  // --- SMA Fase F ---
  11: [
    { slug: "fungsi-invers-komposisi", nama: "Fungsi Invers dan Komposisi", ringkasan: "Menentukan invers dan komposisi fungsi (linear, kuadrat, eksponensial).", elemen: "aljabar-dan-fungsi" },
    { slug: "transformasi-fungsi", nama: "Transformasi Fungsi", ringkasan: "Translasi, dilatasi, refleksi grafik fungsi untuk modeling.", elemen: "aljabar-dan-fungsi" },
    { slug: "lingkaran-sma", nama: "Lingkaran (Lanjutan)", ringkasan: "Hubungan antar unsur lingkaran untuk menyelesaikan masalah.", elemen: "geometri" },
    { slug: "barisan-deret-bunga", nama: "Barisan, Deret, dan Bunga", ringkasan: "Barisan & deret aritmetika/geometri; bunga tunggal & majemuk; anuitas.", elemen: "bilangan" },
    { slug: "asosiasi-variabel", nama: "Asosiasi Antar Variabel", ringkasan: "Asosiasi 2 variabel kategorikal & numerikal; best-fit linear.", elemen: "analisis-data-peluang" },
  ],

  12: [
    { slug: "sebab-akibat-vs-asosiasi", nama: "Sebab-Akibat vs Asosiasi", ringkasan: "Membedakan hubungan sebab-akibat dengan asosiasi statistik.", elemen: "analisis-data-peluang" },
    { slug: "peluang-kejadian-majemuk", nama: "Peluang Kejadian Majemuk", ringkasan: "Peluang gabungan/irisan; frekuensi harapan kejadian majemuk.", elemen: "analisis-data-peluang" },
    { slug: "peluang-bersyarat", nama: "Peluang Bersyarat", ringkasan: "Konsep peluang bersyarat, kejadian saling bebas dan saling lepas.", elemen: "analisis-data-peluang" },
    { slug: "permutasi-kombinasi", nama: "Permutasi dan Kombinasi", ringkasan: "Konsep permutasi & kombinasi untuk menghitung peluang.", elemen: "analisis-data-peluang" },
    { slug: "pemodelan-fungsi-lanjut", nama: "Pemodelan Fungsi Lanjutan", ringkasan: "Aplikasi fungsi (linear, kuadrat, eksponensial) untuk pemodelan dunia nyata.", elemen: "aljabar-dan-fungsi" },
  ],
};
