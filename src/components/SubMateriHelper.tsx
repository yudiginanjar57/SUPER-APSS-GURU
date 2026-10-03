import React, { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown, Check, X, Search, Plus, Layers, Sparkles } from "lucide-react";

/**
 * Dataset komprehensif pemetaan Sub-Materi untuk Kurikulum Merdeka (BSKAP 046/2025).
 * Mendukung pencarian berbasis keyword, ekstraksi otomatis dari tanda kurung / koma,
 * serta fallback cerdas berbasis nama materi pokok.
 */
const SUB_MATERI_DATABASE: Record<string, string[]> = {
  // === MATEMATIKA ===
  "eksponen": [
    "Konsep Dasar & Sifat-Sifat Bilangan Berpangkat (Eksponen)",
    "Pangkat Bulat Positif, Negatif, dan Nol",
    "Pangkat Pecahan dan Hubungannya dengan Bentuk Akar",
    "Persamaan Eksponensial Sederhana",
    "Penerapan Eksponen dalam Pertumbuhan (Bakteri/Populasi)",
    "Penerapan Eksponen dalam Peluruhan Radioaktif"
  ],
  "akar": [
    "Konsep dan Definisi Bentuk Akar",
    "Operasi Aljabar Bentuk Akar (Penjumlahan & Pengurangan)",
    "Operasi Perkalian dan Pembagian Bentuk Akar",
    "Merasionalkan Penyebut Pecahan Bentuk Akar Tunggal",
    "Merasionalkan Penyebut Pecahan Bentuk Sekawan",
    "Aplikasi Bentuk Akar dalam Teorema Pythagoras dan Geometri"
  ],
  "logaritma": [
    "Definisi & Konsep Dasar Logaritma sebagai Invers Eksponen",
    "Sifat-Sifat Dasar Operasi Logaritma",
    "Sifat Logaritma Perkalian, Pembagian, dan Perpangkatan",
    "Persamaan Logaritma Sederhana",
    "Penerapan Logaritma pada Skala Richter (Gempa Bumi)",
    "Penerapan Logaritma pada Derajat Keasaman (pH) & Desibel Bunyi"
  ],
  "aritmetika": [
    "Pola Bilangan dan Konsep Beda (b) Barisan Aritmetika",
    "Menentukan Suku ke-n (Un) Barisan Aritmetika",
    "Rumus Jumlah n Suku Pertama (Sn) Deret Aritmetika",
    "Suku Tengah dan Sisipan pada Barisan Aritmetika",
    "Pemodelan Masalah Nyata Berbasis Deret Aritmetika",
    "Analisis Pertumbuhan Tabungan dan Produksi Konstan"
  ],
  "geometri": [
    "Rasio (r) dan Rumus Suku ke-n (Un) Barisan Geometri",
    "Rumus Jumlah n Suku Pertama (Sn) Deret Geometri",
    "Deret Geometri Tak Hingga Konvergen dan Divergen",
    "Penerapan Geometri pada Bunga Majemuk Perbankan",
    "Penerapan Deret Geometri pada Anuitas dan Penyusutan Aset",
    "Pantulan Bola dan Lintasan Gerak Berulang"
  ],
  "spltv": [
    "Bentuk Baku Sistem Persamaan Linear Tiga Variabel (SPLTV)",
    "Penyelesaian SPLTV Metode Eliminasi-Substitusi (Campuran)",
    "Penyelesaian SPLTV Metode Determinan (Aturan Cramer)",
    "Analisis Banyaknya Penyelesaian (Tepat Satu, Tak Hingga, Tidak Ada)",
    "Pemodelan Matematika Masalah Kontekstual dengan SPLTV",
    "Interpretasi Geometris SPLTV sebagai Titik Potong Tiga Bidang"
  ],
  "sptldv": [
    "Pertidaksamaan Linear Dua Variabel dan Garis Pembatas",
    "Uji Titik Selidik Daerah Himpunan Penyelesaian (DHP)",
    "Sistem Pertidaksamaan Gabungan Dua atau Lebih Pertidaksamaan",
    "Menentukan Model Pertidaksamaan dari Grafik DHP yang Diketahui",
    "Penerapan Awal Program Linear dalam Masalah Nyata"
  ],
  "kuadrat": [
    "Bentuk Umum Fungsi Kuadrat f(x) = ax² + bx + c",
    "Titik Potong Sumbu X (Akar-akar) dan Sumbu Y",
    "Nilai Diskriminan (D) dan Karakteristik Grafik Parabola",
    "Sumbu Simetri dan Titik Puncak (Ekstrim) Maksimum/Minimum",
    "Menggambar Sketsa Grafik Fungsi Kuadrat",
    "Masalah Optimasi Kontekstual (Lintasan Roket, Luas Maksimum)"
  ],
  "trigonometri": [
    "Perbandingan Trigonometri pada Segitiga Siku-Siku (Sin, Cos, Tan)",
    "Perbandingan Kebalikan (Kosekan, Sekan, Kotangen)",
    "Nilai Sudut Istimewa (0°, 30°, 45°, 60°, 90°)",
    "Sudut Berelasi di Berbagai Kuadran (I, II, III, IV)",
    "Pengukuran Sudut Elevasi dan Depresi Menggunakan Klinometer",
    "Aturan Sinus dan Aturan Kosinus pada Segitiga Sembarang"
  ],
  "statistika": [
    "Penyajian Data dalam Tabel Distribusi Frekuensi & Histogram",
    "Ukuran Pemusatan Data Tunggal & Kelompok (Mean, Median, Modus)",
    "Ukuran Penempatan Data (Kuartil Bawah, Kuartil Tengah, Kuartil Atas)",
    "Desil dan Persentil Data Terdistribusi",
    "Ukuran Penyebaran: Jangkauan (Range) & Jangkauan Antarkuartil (IQR)",
    "Varians (Ragam) dan Simpangan Baku (Standar Deviasi)",
    "Diagram Kotak Garis (Boxplot) dan Identifikasi Pencilan (Outlier)"
  ],
  "peluang": [
    "Ruang Sampel, Titik Sampel, dan Kejadian",
    "Peluang Teoretik dan Frekuensi Harapan",
    "Peluang Kejadian Saling Lepas dan Tidak Saling Lepas",
    "Peluang Kejadian Saling Bebas dan Bersyarat",
    "Distribusi Peluang Diskrit dan Peluang Binomial",
    "Penerapan Peluang dalam Mitigasi Risiko dan Asuransi"
  ],
  "matriks": [
    "Pengertian, Notasi, Ordo, dan Jenis-Jenis Matriks",
    "Operasi Penjumlahan dan Pengurangan Matriks serta Sifatnya",
    "Perkalian Skalar dan Perkalian Matriks dengan Matriks",
    "Transpos Matriks dan Sifat Kesamaan Dua Matriks",
    "Determinan Matriks Ordo 2x2 dan Ordo 3x3 (Metode Sarrus)",
    "Invers Matriks Ordo 2x2 dan Penyelesaian Sistem Persamaan Linear"
  ],
  "lingkaran": [
    "Persamaan Lingkaran Pusat (0,0) dan Pusat (a,b)",
    "Bentuk Umum Persamaan Lingkaran x² + y² + Ax + By + C = 0",
    "Kedudukan Titik dan Garis terhadap Lingkaran",
    "Persamaan Garis Singgung Melalui Titik pada Lingkaran",
    "Persamaan Garis Singgung dengan Gradien Tertentu (m)",
    "Sudut Pusat, Sudut Keliling, Panjang Busur, dan Luas Juring"
  ],
  "polinomial": [
    "Pengertian Suku Banyak (Polinomial) dan Derajat Polinomial",
    "Operasi Aljabar Polinomial (Penjumlahan, Pengurangan, Perkalian)",
    "Pembagian Polinomial dengan Cara Bersusun dan Metode Horner",
    "Teorema Sisa dan Teorema Faktor",
    "Menentukan Akar-Akar Rasional Persamaan Polinomial"
  ],
  "limit": [
    "Konsep Intuitif Limit Fungsi di Suatu Titik",
    "Sifat-Sifat dan Teorema Aljabar Limit",
    "Metode Penyelesaian Limit Aljabar (Substitusi & Pemfaktoran)",
    "Metode Merasionalkan Bentuk Akar pada Pecahan Limit",
    "Limit Menuju Tak Hingga Bentuk Pecahan dan Pengurangan Akar",
    "Limit Fungsi Trigonometri Dasar"
  ],
  "turunan": [
    "Konsep Turunan sebagai Laju Perubahan Nilai Sesaat",
    "Rumus Dasar dan Sifat-Sifat Turunan Fungsi Aljabar",
    "Aturan Rantai (Chain Rule) untuk Turunan Fungsi Komposisi",
    "Persamaan Garis Singgung dan Garis Normal Kurva",
    "Fungsi Naik, Fungsi Turun, dan Titik Stasioner",
    "Nilai Maksimum, Minimum, dan Masalah Optimasi Nyata",
    "Turunan Fungsi Trigonometri"
  ],
  "integral": [
    "Konsep Antiturunan dan Integral Tak Tentu",
    "Rumus Dasar Integral Tak Tentu Fungsi Aljabar",
    "Teknik Pengintegralan Metode Substitusi",
    "Teknik Pengintegralan Parsial Sederhana",
    "Integral Tentu dan Teorema Dasar Kalkulus",
    "Penerapan Integral Menghitung Luas Daerah di Bawah Kurva",
    "Penerapan Integral Menghitung Volume Benda Putar"
  ],
  "dimensi tiga": [
    "Kedudukan Titik, Garis, dan Bidang pada Bangun Ruang",
    "Menentukan Jarak Titik ke Titik pada Kubus dan Balok",
    "Menentukan Jarak Titik ke Garis dengan Proyeksi",
    "Menentukan Jarak Titik ke Bidang",
    "Sudut Antara Garis dengan Garis dan Garis dengan Bidang",
    "Sudut Antara Dua Bidang (Diedral)"
  ],

  // === BAHASA INDONESIA ===
  "lho": [
    "Ciri-Ciri, Fungsi Sosial, dan Tujuan Teks Laporan Hasil Observasi",
    "Struktur Teks LHO (Pernyataan Umum, Deskripsi Bagian, Deskripsi Manfaat)",
    "Kaidah Kebahasaan LHO (Verba Material, Nomina, Kalimat Definisi & Deskripsi)",
    "Memilah Fakta Objektif vs Opini Subjektif dalam Laporan",
    "Menyusun Kerangka dan Menulis Teks LHO Berdasarkan Pengamatan Lingkungan",
    "Menyunting Teks LHO Berdasarkan Ejaan (EYD) dan Tanda Baca"
  ],
  "anekdot": [
    "Karakteristik Anekdot: Kelucuan/Humor yang Memuat Kritik Sosial",
    "Struktur Teks Anekdot (Abstraksi, Orientasi, Krisis, Reaksi, Koda)",
    "Kaidah Kebahasaan (Kalimat Retoris, Majas Ironi/Sinisme, Konjungsi Temporal)",
    "Menganalisis Makna Tersirat di Balik Dialog Humor Anekdot",
    "Mengubah Teks Anekdot ke Bentuk Komik Strip atau Naskah Lawakan Tunggal",
    "Etika Menyampaikan Kritik Konstruktif melalui Anekdot"
  ],
  "negosiasi": [
    "Faktor Pemicu dan Tujuan Negosiasi untuk Kesepakatan Bersama",
    "Struktur Teks Negosiasi (Orientasi, Pengajuan, Penawaran, Persetujuan)",
    "Kaidah Kebahasaan Negosiasi (Kalimat Persuasif, Tuturan Santun, Pronomina)",
    "Taktik dan Seni Negosiasi Win-Win Solution",
    "Praktik Bermain Peran (Role Play) Negosiasi Formal dan Informal",
    "Menulis Surat Penawaran dan Pesanan dalam Korespondensi Bisnis"
  ],
  "biografi": [
    "Keteladanan Karakter Tokoh dalam Teks Biografi Inspiratif",
    "Struktur Teks Biografi (Orientasi, Urutan Peristiwa/Masalah, Reorientasi)",
    "Kaidah Kebahasaan (Pronomina Persona, Pilihan Diksi Penilaian, Kata Kerja Tindakan)",
    "Menganalisis Nilai Perjuangan dan Kontribusi Tokoh Bangsa",
    "Menulis Teks Biografi Singkat Tokoh Inspiratif di Lingkungan Sekitar"
  ],
  "puisi": [
    "Unsur Batin Puisi (Tema, Rasa, Nada, Amanat)",
    "Unsur Fisik Puisi (Diksi, Imaji/Citraan, Kata Konkret, Majas, Rima/Ritme, Tipografi)",
    "Menganalisis Makna Konotatif dan Simbolik dalam Puisi",
    "Menulis Puisi dengan Memadukan Citraan Indrawi dan Gaya Bahasa",
    "Praktik Musikalisasi Puisi dan Deklamasi dengan Vokal & Ekspresi Tepat"
  ],
  "argumentasi": [
    "Ciri dan Tujuan Teks Argumentasi dalam Mempengaruhi Opini Pembaca",
    "Struktur Teks Argumentasi (Pernyataan Pendapat/Tesis, Argumen Pendukung, Penegasan Ulang)",
    "Kaidah Kebahasaan (Konjungsi Kausalitas, Kata Denotatif, Kalimat Fakta)",
    "Menilai Kekuatan Argumen Berdasarkan Data Faktual dan Bukti Logis",
    "Menulis Esai Argumentatif Bertema Isu Sosial / Ketahanan Pangan Lokal"
  ],
  "editorial": [
    "Karakteristik Teks Editorial / Tajuk Rencana Surat Kabar",
    "Struktur Teks Editorial (Pengenalan Isu, Penyampaian Pendapat/Argumen, Saran/Rekomendasi)",
    "Kaidah Bahasa (Verba Mental, Adverbia Frekuensi, Konjungsi Pertentangan)",
    "Menganalisis Sudut Pandang Redaksi terhadap Isu Terkini",
    "Menulis Teks Editorial yang Tajam, Berimbang, dan Solutif"
  ],

  // === FISIKA ===
  "pengukuran": [
    "Besaran Pokok, Besaran Turunan, dan Analisis Dimensi",
    "Penggunaan Alat Ukur Panjang (Mistar, Jangka Sorong, Mikrometer Sekrup)",
    "Aturan Angka Penting dan Notasi Ilmiah",
    "Ketidakpastian Pengukuran Tunggal dan Pengukuran Berulang",
    "Pengolahan Data Eksperimen Ilmiah dan Penyajian Grafik"
  ],
  "vektor": [
    "Pengertian Besaran Skalar vs Besaran Vektor",
    "Penggambaran dan Notasi Vektor Satuan (i, j, k)",
    "Penjumlahan Vektor Metode Geometris (Poligon & Jajar Genjang)",
    "Penjumlahan Vektor Metode Analitis (Uraian Komponen Sumbu X dan Y)",
    "Perkalian Titik (Dot Product) dan Perkalian Silang (Cross Product)"
  ],
  "gerak": [
    "Besaran-Besaran Gerak (Posisi, Jarak, Perpindahan, Kelajuan, Kecepatan, Percepatan)",
    "Gerak Lurus Beraturan (GLB) dan Analisis Grafik v-t serta s-t",
    "Gerak Lurus Berubah Beraturan (GLBB) Dipercepat dan Diperlambat",
    "Gerak Vertikal ke Atas dan Gerak Jatuh Bebas",
    "Gerak Parabola: Analisis Komponen Horizontal dan Vertikal",
    "Gerak Melingkar Beraturan (GMB): Kecepatan Sudut dan Percepatan Sentripetal"
  ],
  "hukum newton": [
    "Hukum I Newton tentang Inersia / Kelembaman Benda",
    "Hukum II Newton tentang Gaya dan Percepatan (F = m.a)",
    "Hukum III Newton tentang Aksi dan Reaksi",
    "Diagram Bebas Gaya (Gaya Normal, Gaya Berat, Gaya Tegangan Tali)",
    "Gaya Gesekan Statis dan Gaya Gesekan Kinetis",
    "Aplikasi Hukum Newton pada Bidang Miring dan Sistem Katrol"
  ],
  "usaha dan energi": [
    "Konsep Usaha oleh Gaya Konstan dan Gaya yang Membentuk Sudut",
    "Hubungan Usaha dengan Perubahan Energi Kinetik (Teorema Usaha-Energi)",
    "Energi Potensial Gravitasi dan Energi Potensial Pegas",
    "Hukum Kekekalan Energi Mekanik pada Sistem Terisolasi",
    "Konsep Daya (Power) dan Perhitungan Efisiensi Energi",
    "Sumber Energi Terbarukan dan Penghematan Energi"
  ],
  "termodinamika": [
    "Konsep Suhu, Kalor, Kalor Jenis, dan Kapasitas Kalor",
    "Asas Black dalam Pencampuran Dua Zat Berbeda Suhu",
    "Perubahan Wujud Zat dan Kalor Laten",
    "Perpindahan Kalor: Konduksi, Konveksi, dan Radiasi",
    "Hukum Ke-0 dan Hukum I Termodinamika (Usaha Luar & Energi Dalam)",
    "Siklus Carnot, Mesin Kalor, dan Efisiensi Termal",
    "Hukum II Termodinamika dan Konsep Entropi"
  ],

  // === KIMIA ===
  "atom": [
    "Perkembangan Model Atom (Dalton, Thomson, Rutherford, Bohr, Mekanika Kuantum)",
    "Partikel Dasar Penyusun Atom (Proton, Elektron, Neutron)",
    "Nomor Atom, Nomor Massa, Isotop, Isobar, dan Isoton",
    "Konfigurasi Elektron Model Bohr dan Prinsip Aufbau / Kaidah Hund",
    "Bilangan Kuantum (Utama, Azimut, Magnetik, Spin)",
    "Sistem Periodik Unsur (Golongan, Periode) dan Sifat Keperiodikan (Jari-jari, Afinitas, Elektronegativitas)"
  ],
  "ikatan kimia": [
    "Kaidah Duplet dan Oktet Kestabilan Unsur",
    "Pembentukan Ikatan Ion (Transfer Elektron Logam-Nonlogam)",
    "Pembentukan Ikatan Kovalen Tunggal, Rangkap, dan Koordinasi",
    "Ikatan Kovalen Polar dan Nonpolar Berdasarkan Momen Dipol",
    "Bentuk Geometri Molekul Berdasarkan Teori VSEPR dan Domain Elektron",
    "Gaya Antarmolekul (Gaya Van der Waals, Gaya London, Ikatan Hidrogen)"
  ],
  "stoikiometri": [
    "Konsep Mol, Massa Molar (Mr), dan Tetapan Avogadro",
    "Hukum-Hukum Dasar Kimia (Lavoisier, Proust, Dalton, Gay-Lussac, Avogadro)",
    "Menyetarakan Persamaan Reaksi Kimia",
    "Perhitungan Massa, Mol, dan Volume Gas dalam Kondisi STP/RTP",
    "Penentuan Rumus Empiris dan Rumus Molekul",
    "Penentuan Pereaksi Pembatas dan Persentase Hasil Reaksi"
  ],
  "asam basa": [
    "Teori Asam Basa (Arrhenius, Brønsted-Lowry, Lewis)",
    "Identifikasi Asam-Basa Menggunakan Indikator Alami dan Lakmus",
    "Derajat Keasaman (pH dan pOH) Asam Kuat dan Basa Kuat",
    "Derajat Disosiasi dan pH Asam Lemah serta Basa Lemah",
    "Titrasi Asam Basa dan Penentuan Konsentrasi Larutan Sampel",
    "Larutan Penyangga (Buffer) dan Peranannya dalam Darah/Tubuh Manusia",
    "Hidrolisis Garam (Asam, Basa, Netral)"
  ],

  // === BIOLOGI ===
  "sel": [
    "Teori Sel dan Perbedaan Sel Prokariotik vs Sel Eukariotik",
    "Struktur dan Fungsi Organel Sel (Nukleus, Mitokondria, Ribosom, RE, Golgi, Lisosom, Kloroplas)",
    "Perbedaan Karakteristik Sel Hewan dan Sel Tumbuhan",
    "Mekanisme Transpor Pasif Membran (Difusi dan Osmosis)",
    "Mekanisme Transpor Aktif (Pompa Natrium-Kalium, Endositosis, Eksositosis)",
    "Pengamatan Preparat Sel Menggunakan Mikroskop Cahaya"
  ],
  "keanekaragaman hayati": [
    "Tingkat Keanekaragaman Hayati (Gen, Spesies, Ekosistem)",
    "Sebaran Flora dan Fauna Indonesia (Garis Wallace dan Weber)",
    "Manfaat Keanekaragaman Hayati bagi Pangan, Obat, dan Keseimbangan Ekologis",
    "Ancaman terhadap Biodiversitas (Deforestasi, Spesies Invasif, Perubahan Iklim)",
    "Upaya Konservasi Keanekaragaman Hayati secara In Situ dan Ex Situ"
  ],
  "metabolisme": [
    "Struktur Enzim, Komponen (Apoenzim, Kofaktor), dan Sifat Enzim",
    "Mekanisme Kerja Enzim (Lock and Key vs Induced Fit)",
    "Faktor-Faktor yang Mempengaruhi Kerja Enzim (Suhu, pH, Konsentrasi, Inhibitor)",
    "Katabolisme: Tahapan Respirasi Aerob (Glikolisis, Dekarboksilasi, Siklus Krebs, Transpor Elektron)",
    "Respirasi Anaerob / Fermentasi (Asam Laktat dan Alkohol)",
    "Anabolisme: Reaksi Terang dan Reaksi Gelap (Siklus Calvin) Fotosintesis"
  ],
  "genetika": [
    "Struktur dan Komponen Asam Nukleat (DNA dan RNA)",
    "Struktur Kromosom, Gen, dan Alel",
    "Proses Sintesis Protein: Transkripsi DNA Menjadi mRNA",
    "Proses Sintesis Protein: Translasi mRNA Menjadi Polipeptida / Protein",
    "Kode Genetik (Kodon) dan Peran tRNA"
  ],
  "hereditas": [
    "Hukum Mendel I (Segregasi Bebas) pada Persilangan Monohibrid",
    "Hukum Mendel II (Asortasi Bebas) pada Persilangan Dihibrid",
    "Penyimpangan Semu Hukum Mendel (Kriptomeri, Epistasis-Hipostasis, Polimeri)",
    "Tautan dan Pindah Silang (Crossing Over)",
    "Pewarisan Sifat Golongan Darah (ABO, Rhesus) pada Manusia",
    "Kelainan Genetika Tertaut Kromosom Seks (Hemofilia, Buta Warna)"
  ],

  // === EKONOMI ===
  "konsep dasar ilmu ekonomi": [
    "Pengertian Kelangkaan (Scarcity) dan Faktor Penyebabnya",
    "Kebutuhan Manusia vs Keinginan serta Skala Prioritas",
    "Konsep Biaya Peluang (Opportunity Cost) dalam Pengambilan Keputusan",
    "Prinsip, Motif, dan Tindakan Ekonomi",
    "Masalah Pokok Ekonomi Klasik dan Modern (What, How, for Whom)",
    "Sistem Perekonomian Dunia (Tradisional, Komando, Pasar, Campuran)"
  ],
  "biaya peluang": [
    "Definisi dan Konsep Biaya Peluang (Opportunity Cost)",
    "Analisis Pilihan Alternatif Terbaik yang Dikorbankan",
    "Penerapan Skala Prioritas dalam Pengambilan Keputusan",
    "Literasi dan Perencanaan Keuangan Pribadi Siswa"
  ],
  "pelaku dan kegiatan ekonomi": [
    "Kegiatan Pokok Ekonomi: Produksi, Distribusi, dan Konsumsi",
    "Peran Rumah Tangga Konsumen (RTK) dan Faktor Produksi",
    "Peran Rumah Tangga Produsen (RTP) dan Arus Barang/Jasa",
    "Peran Rumah Tangga Pemerintah (RTG) dan Masyarakat Luar Negeri (RTLN)",
    "Diagram Alir Melingkar (Circular Flow Diagram 4 Sektor)"
  ],
  "keseimbangan pasar": [
    "Hukum Permintaan, Kurva Permintaan, dan Faktor yang Memengaruhinya",
    "Hukum Penawaran, Kurva Penawaran, dan Faktor yang Memengaruhinya",
    "Terbentuknya Keseimbangan Harga dan Kuantitas Pasar (Equilibrium)",
    "Pergeseran Kurva Keseimbangan Pasar",
    "Elastisitas Permintaan dan Elastisitas Penawaran (Koefisien Ed & Es)",
    "Peran Pemerintah dalam Penentuan Harga (Ceiling Price & Floor Price)"
  ],
  "struktur pasar": [
    "Karakteristik Pasar Persaingan Sempurna",
    "Pasar Monopoli: Ciri, Penyebab, Kelebihan, dan Kelemahan",
    "Pasar Oligopoli dan Hambatan Masuk Pasar",
    "Pasar Monopolistik dan Diferensiasi Produk",
    "Peran Struktur Pasar bagi Perekonomian Nasional"
  ],
  "uang dan perbankan": [
    "Sejarah, Pengertian, Syarat, dan Fungsi Uang (Asli & Turunan)",
    "Teori Permintaan dan Penawaran Uang",
    "Peran dan Tugas Bank Sentral (Bank Indonesia)",
    "Jenis dan Produk Layanan Bank Umum serta BPR",
    "Lembaga Penjamin Simpanan (LPS)"
  ],
  "sistem pembayaran": [
    "Evolusi Sistem Pembayaran: Tunai hingga Digital",
    "Alat Pembayaran Non-Tunai (Cek, Bilyet Giro, Kartu Debit/Kredit)",
    "Sistem Pembayaran Digital Terkini (QRIS, E-Wallet, BI-FAST)",
    "Peran Otoritas Jasa Keuangan (OJK) dalam Mengawasi Industri Finansial",
    "Literasi Keuangan dan Perlindungan dari Investasi Ilegal"
  ],
  "badan usaha": [
    "Badan Usaha Milik Negara (BUMN: Perum & Persero)",
    "Badan Usaha Milik Daerah (BUMD)",
    "Badan Usaha Milik Swasta (BUMS: PT, CV, Firma, Perseorangan)",
    "Koperasi: Asas, Landasan, Prinsip, dan Perhitungan SHU",
    "Peran Strategis Badan Usaha bagi Perekonomian Nasional"
  ],
  "manajemen badan usaha": [
    "Pengertian dan Unsur-Unsur Manajemen (6M)",
    "Fungsi Manajemen POAC (Planning, Organizing, Actuating, Controlling)",
    "Tingkatan Manajemen (Top, Middle, Lower Management)",
    "Bidang-Bidang Manajemen (Produksi, Pemasaran, Keuangan, Personalia, Administrasi)"
  ],
  "ketenagakerjaan": [
    "Konsep Angkatan Kerja, Kesempatan Kerja, dan Pengangguran",
    "Jenis-Jenis Pengangguran (Friksional, Struktural, Siklis, Musiman)",
    "Upaya dan Kebijakan Mengatasi Pengangguran",
    "Sistem Pengupahan di Indonesia (Upah Minimum Provinsi / UMP)",
    "Peningkatan Kualitas dan Produktivitas Tenaga Kerja"
  ],
  "pendapatan nasional": [
    "Konsep Dasar Pendapatan Nasional (PDB/GDP, PNB/GNP, NNP, NNI, PI, DI)",
    "Metode Perhitungan Pendapatan Nasional (Pendekatan Produksi, Pendapatan, Pengeluaran)",
    "Pendapatan Per Kapita dan Klasifikasi Kesejahteraan Negara",
    "Distribusi Pendapatan Nasional dan Kurva Lorenz serta Koefisien Gini"
  ],
  "indeks harga dan inflasi": [
    "Metode Perhitungan Indeks Harga Konsumen (IHK)",
    "Pengertian Inflasi, Penyebab (Demand Pull vs Cost Push)",
    "Tingkat Keparahan Inflasi (Ringan, Sedang, Berat, Hiperinflasi)",
    "Dampak Inflasi terhadap Daya Beli, Konsumen, dan Perekonomian",
    "Kebijakan Mengatasi Inflasi (Moneter, Fiskal, dan Riil)"
  ],
  "kebijakan moneter": [
    "Tujuan dan Instrumen Kebijakan Moneter Bank Sentral",
    "Operasi Pasar Terbuka (Open Market Operation)",
    "Politik Diskonto (Discount Rate)",
    "Rasio Cadangan Wajib Minimum (Cash Reserve Ratio)",
    "Kebijakan Fiskal: Instrumen Perpajakan dan Pengeluaran Pemerintah (APBN)",
    "Pengaruh Bauran Kebijakan Moneter dan Fiskal terhadap Stabilitas Ekonomi"
  ],
  "pengantar akuntansi": [
    "Pengertian, Peran & Pemakai Informasi Akuntansi",
    "Karakteristik Kualitas Informasi Akuntansi",
    "Prinsip Dasar & Konsep Entitas Akuntansi",
    "Bidang-Bidang Spesialisasi Akuntansi & Etika Profesi Akuntan",
    "Penggolongan Akun & Aturan Saldo Normal"
  ],
  "perdagangan internasional": [
    "Konsep Dasar, Manfaat & Faktor Pendorong Perdagangan Internasional",
    "Teori Keunggulan Mutlak (Adam Smith) & Keunggulan Komparatif (David Ricardo)",
    "Kebijakan Perdagangan Internasional (Tarif, Kuota, Subsidi, Larangan Impor, Dumping)",
    "Alat dan Cara Pembayaran Internasional (Letter of Credit, Valas, Transfer Telegrafis)",
    "Kurs Valuta Asing dan Faktor-Faktor yang Memengaruhinya"
  ],
  "neraca pembayaran": [
    "Konsep dan Struktur Neraca Pembayaran (Transaksi Berjalan, Modal, Finansial)",
    "Analisis Posisi Neraca Pembayaran (Defisit, Surplus, Seimbang)",
    "Pengertian, Sumber Perolehan, dan Fungsi Devisa bagi Negara",
    "Dampak Neraca Pembayaran terhadap Kurs Valuta Asing dan Perekonomian Nasional"
  ],
  "kerjasama ekonomi": [
    "Bentuk-Bentuk Kerjasama Ekonomi (Bilateral, Regional, Multilateral)",
    "Lembaga Kerjasama Ekonomi Regional (ASEAN, AFTA, APEC)",
    "Lembaga Kerjasama Ekonomi Internasional (WTO, IMF, World Bank, OPEC, OECD)",
    "Peran Aktif dan Manfaat Kerjasama Ekonomi Internasional bagi Indonesia"
  ],
  "akuntansi": [
    "Persamaan Dasar Akuntansi (Harta = Utang + Modal)",
    "Bukti Transaksi (Kuitansi, Faktur, Nota, Memo)",
    "Jurnal Umum (Aturan Debit & Kredit)",
    "Buku Besar (Posting Akun)",
    "Neraca Saldo",
    "Jurnal Penyesuaian (AJP)",
    "Kertas Kerja / Neraca Lajur (10 Kolom)",
    "Laporan Keuangan (Laba Rugi, Perubahan Modal, Neraca)",
    "Jurnal Penutup & Neraca Saldo Setelah Penutupan",
    "Jurnal Pembalik (Reversing Entries)"
  ],
  "persamaan dasar akuntansi": [
    "Konsep Dasar Keseimbangan Harta, Utang, dan Modal (Aktiva = Pasiva)",
    "Klasifikasi dan Karakteristik Akun (Aset, Kewajiban, Ekuitas)",
    "Analisis Transaksi Finansial terhadap Perubahan Harta dan Utang",
    "Analisis Transaksi Finansial terhadap Perubahan Modal (Pendapatan, Beban, Prive)",
    "Pencatatan Transaksi ke dalam Format Tabel Persamaan Dasar Akuntansi",
    "Penyusunan Laporan Keuangan Sederhana dari Persamaan Dasar Akuntansi"
  ],
  "perusahaan jasa": [
    "Bukti Transaksi Keuangan",
    "Jurnal Umum Perusahaan Jasa",
    "Buku Besar & Prosedur Posting",
    "Neraca Saldo",
    "Jurnal Penyesuaian (AJP)",
    "Kertas Kerja / Neraca Lajur (10 Kolom)",
    "Laporan Keuangan (Laba Rugi, Perubahan Modal, Neraca)",
    "Jurnal Penutup & Neraca Saldo Setelah Penutupan",
    "Jurnal Pembalik (Reversing Entries)"
  ],
  "perusahaan dagang": [
    "Karakteristik & Transaksi Perusahaan Dagang",
    "Bukti Transaksi Perusahaan Dagang",
    "Jurnal Khusus (Pembelian, Penjualan, Penerimaan Kas, Pengeluaran Kas)",
    "Buku Besar Pembantu Piutang dan Utang",
    "Neraca Saldo Perusahaan Dagang",
    "Harga Pokok Penjualan (HPP)",
    "Jurnal Penyesuaian Perusahaan Dagang (Metode Ikhtisar L/R & HPP)",
    "Kertas Kerja (Neraca Lajur) Perusahaan Dagang",
    "Laporan Keuangan Perusahaan Dagang",
    "Jurnal Penutup & Penutupan Buku"
  ],
  "bukti transaksi": [
    "Pengertian & Fungsi Bukti Transaksi",
    "Bukti Transaksi Internal (Memo, Bukti Kas Masuk, Bukti Kas Keluar)",
    "Bukti Transaksi Eksternal (Kuitansi, Faktur, Nota Kontan, Nota Debet, Nota Kredit, Cek, Bilyet Giro)",
    "Analisis Keabsahan dan Verifikasi Otentisitas Bukti Transaksi",
    "Pencatatan Dokumen Transaksi ke Lembar Rekapitulasi"
  ],
  "jurnal umum": [
    "Pengertian, Fungsi, dan Format Jurnal Umum",
    "Mekanisme Debit dan Kredit serta Aturan Saldo Normal Akun",
    "Analisis Transaksi Finansial dan Pencatatan Jurnal Dua Sisi (Double-Entry)",
    "Pencatatan Transaksi Setoran Modal, Pinjaman, dan Pendapatan Jasa",
    "Pencatatan Transaksi Pembayaran Beban, Pembelian Tunai & Kredit",
    "Pencatatan Transaksi Prive (Penarikan Pribadi)",
    "Koreksi Kesalahan Pencatatan Jurnal Umum"
  ],
  "buku besar": [
    "Pengertian dan Fungsi Buku Besar dalam Siklus Akuntansi",
    "Bentuk-Bentuk Akun Buku Besar (Bentuk T, Skontro 2 Kolom, Saldo Tunggal 3 Kolom, Saldo Rangkap 4 Kolom)",
    "Prosedur dan Langkah Pemindahbukuan (Posting) dari Jurnal Umum ke Buku Besar",
    "Penyusunan Kode Akun (Chart of Accounts / Bagan Akun)",
    "Penghitungan dan Penyusunan Rekapitulasi Saldo Akhir Akun Buku Besar"
  ],
  "neraca saldo": [
    "Pengertian, Fungsi, dan Keterbatasan Neraca Saldo",
    "Prosedur Pengutipan Saldo Buku Besar ke Lembar Neraca Saldo",
    "Pemeriksaan Keseimbangan Jumlah Total Debit dan Kredit",
    "Identifikasi & Penelusuran Kesalahan Neraca Saldo Tidak Seimbang"
  ],
  "jurnal penyesuaian": [
    "Tujuan & Urgensi Pembuatan Ayat Jurnal Penyesuaian (AJP)",
    "Penyesuaian Beban Dibayar di Muka (Pendekatan Neraca / Harta vs Pendekatan Laba Rugi / Beban)",
    "Penyesuaian Pendapatan Diterima di Muka (Pendekatan Neraca / Utang vs Pendekatan Laba Rugi / Pendapatan)",
    "Penyesuaian Beban yang Masih Harus Dibayar (Accrued Expense / Utang Beban)",
    "Penyesuaian Pendapatan yang Masih Harus Diterima (Accrued Revenue / Piutang Pendapatan)",
    "Penyesuaian Penyusutan Aset Tetap (Depresiasi) dan Akumulasi Penyusutan",
    "Penyesuaian Pemakaian Perlengkapan Usaha",
    "Penyesuaian Cadangan Kerugian Piutang Tak Tertagih"
  ],
  "kertas kerja": [
    "Pengertian, Fungsi, dan Format Kertas Kerja / Neraca Lajur 10 Kolom",
    "Pemindahan Kolom Neraca Saldo dan Kolom Ayat Jurnal Penyesuaian (AJP)",
    "Penyusunan Kolom Neraca Saldo Disesuaikan (NSD)",
    "Pemilahan Akun Nominal ke Kolom Laba/Rugi dan Akun Riil ke Kolom Neraca",
    "Penentuan Laba Bersih atau Rugi Bersih Usaha dan Keseimbangan Kolom Akhir"
  ],
  "neraca lajur": [
    "Format Neraca Lajur 10 Kolom dan 12 Kolom",
    "Penyusunan Kolom Neraca Saldo Disesuaikan (NSD)",
    "Distribusi Akun Nominal (Pendapatan & Beban) ke Laba Rugi",
    "Distribusi Akun Riil (Harta, Utang, Modal) ke Kolom Neraca",
    "Perhitungan Laba/Rugi Bersih Usaha"
  ],
  "laporan keuangan": [
    "Laporan Laba Rugi (Income Statement: Single Step & Multiple Step)",
    "Laporan Perubahan Modal / Ekuitas (Statement of Changes in Equity)",
    "Neraca / Laporan Posisi Keuangan (Balance Sheet: Bentuk Skontro & Staffel)",
    "Laporan Arus Kas Sederhana (Aktivitas Operasi, Investasi, Pendanaan)",
    "Catatan Atas Laporan Keuangan (CALK)"
  ],
  "jurnal penutup": [
    "Fungsi dan Tujuan Pembuatan Jurnal Penutup pada Akhir Periode",
    "Menutup Akun Nominal Pendapatan ke Akun Ikhtisar Laba Rugi",
    "Menutup Akun Nominal Beban ke Akun Ikhtisar Laba Rugi",
    "Menutup Saldo Akun Ikhtisar Laba Rugi ke Akun Modal",
    "Menutup Saldo Akun Prive (Penarikan Pribadi) ke Akun Modal",
    "Penyusunan Neraca Saldo Setelah Penutupan (Post-Closing Trial Balance)"
  ],
  "jurnal pembalik": [
    "Tujuan dan Manfaat Praktis Jurnal Pembalik (Reversing Entries)",
    "Kriteria Akun yang Memerlukan Jurnal Pembalik",
    "Pembalikan Beban yang Masih Harus Dibayar dan Pendapatan yang Masih Harus Diterima",
    "Pembalikan Beban Dibayar di Muka (yang Dicatat sebagai Beban)",
    "Pembalikan Pendapatan Diterima di Muka (yang Dicatat sebagai Pendapatan)"
  ],
  "jurnal khusus": [
    "Karakteristik & Urgensi Jurnal Khusus pada Perusahaan Dagang",
    "Jurnal Pembelian (Purchases Journal) untuk Pembelian Kredit Barang Dagang",
    "Jurnal Penjualan (Sales Journal) untuk Penjualan Kredit Barang Dagang",
    "Jurnal Penerimaan Kas (Cash Receipts Journal)",
    "Jurnal Pengeluaran Kas (Cash Disbursements Journal)",
    "Jurnal Umum Memorial untuk Retur dan Transaksi Lainnya",
    "Rekapitulasi Jurnal Khusus dan Pemindahbukuan (Posting) ke Buku Besar Utama"
  ],
  "buku besar pembantu": [
    "Pengertian dan Fungsi Buku Besar Pembantu (Subsidiary Ledger)",
    "Buku Besar Pembantu Piutang Usaha (Accounts Receivable Ledger)",
    "Buku Besar Pembantu Utang Usaha (Accounts Payable Ledger)",
    "Buku Besar Pembantu Persediaan Barang Dagang",
    "Penyusunan Daftar Rekapitulasi Saldo Piutang dan Utang"
  ],
  "harga pokok penjualan": [
    "Konsep dan Komponen Utama Harga Pokok Penjualan (HPP)",
    "Perhitungan Pembelian Bersih (Pembelian + Biaya Angkut - Retur - Potongan)",
    "Perhitungan Barang yang Tersedia untuk Dijual (BTUD)",
    "Perhitungan HPP Akhir Metode Periodik / Fisik",
    "Pencatatan Penyesuaian Akun Persediaan Barang Dagang Metode HPP"
  ],
  "siklus akuntansi": [
    "Tahap Pencatatan: Bukti Transaksi, Jurnal Umum, dan Buku Besar",
    "Tahap Pengikhtisaran: Neraca Saldo, Jurnal Penyesuaian, dan Kertas Kerja",
    "Tahap Pelaporan: Laporan Laba Rugi, Perubahan Modal, dan Neraca",
    "Tahap Penutupan: Jurnal Penutup dan Neraca Saldo Pasca Penutupan"
  ],

  // === SOSIOLOGI ===
  "sosiologi sebagai ilmu": [
    "Pengertian, Objek Kajian, dan Karakteristik Sosiologi",
    "Sifat Hakikat dan Fungsi Sosiologi dalam Masyarakat",
    "Perkembangan Sosiologi dan Tokoh Perintis (Auguste Comte, Emile Durkheim, Max Weber)",
    "Paradigma Sosiologi (Fakta Sosial, Definisi Sosial, Perilaku Sosial)",
    "Peran Sosiolog dalam Pembangunan dan Pembuatan Kebijakan Publik"
  ],
  "identitas diri": [
    "Pembentukan Identitas Diri dan Proses Sosialisasi",
    "Faktor-Faktor Pembentuk Identitas (Biologis, Kelompok, Kebudayaan)",
    "Tindakan Sosial (Rasional Instrumental, Berorientasi Nilai, Tradisional, Afektif)",
    "Hubungan Sosial dan Asosiasi Antarindividu dalam Masyarakat"
  ],
  "lembaga sosial": [
    "Pengertian, Ciri-Ciri, dan Proses Pembentukan Lembaga Sosial",
    "Fungsi Manifes dan Fungsi Laten Lembaga Sosial",
    "Lembaga Keluarga, Agama, Pendidikan, Ekonomi, dan Politik",
    "Peran Lembaga Sosial dalam Menjaga Ketertiban Masyarakat"
  ],
  "metode penelitian sosial": [
    "Rancangan Penelitian Sosial dan Perumusan Masalah",
    "Pendekatan Penelitian Kuantitatif vs Kualitatif",
    "Teknik Pengumpulan Data (Observasi, Wawancara, Angket/Kuesioner)",
    "Pengolahan, Analisis Data, dan Etika Penelitian Lapangan",
    "Penyusunan Laporan Hasil Penelitian Sosial"
  ],
  "interaksi sosial": [
    "Syarat Terjadinya Interaksi Sosial (Kontak Sosial dan Komunikasi)",
    "Faktor Pendorong Interaksi Sosial (Imitasi, Sugesti, Identifikasi, Simpati, Empati)",
    "Bentuk Interaksi Asosiatif (Kerjasama, Akomodasi, Asimilasi, Akulturasi)",
    "Bentuk Interaksi Disosiatif (Persaingan/Kompetisi, Kontravensi, Konflik)",
    "Dinamika Interaksi Sosial di Era Digital dan Media Sosial"
  ],
  "kelompok sosial": [
    "Syarat dan Ciri-Ciri Kelompok Sosial",
    "Klasifikasi Kelompok Sosial: Paguyuban (Gemeinschaft) vs Patembayan (Gesellschaft)",
    "Kelompok Primer vs Kelompok Sekunder",
    "In-Group dan Out-Group serta Membership Group vs Reference Group",
    "Konformitas, Partikularisme, dan Eksklusivisme Kelompok"
  ],
  "konflik": [
    "Akar Penyebab Konflik Sosial (Perbedaan Individu, Budaya, Kepentingan, Perubahan Cepat)",
    "Bentuk-Bentuk Konflik Sosial (Antarkelas, Antarras, Antaragama, Politik)",
    "Dampak Positif dan Negatif Konflik Sosial",
    "Bentuk Resolusi dan Manajemen Konflik (Mediation, Arbitrase, Kompromi, Rekonsiliasi)",
    "Integrasi Sosial dan Faktor Pembentuk Kohesi Sosial"
  ],
  "perubahan sosial": [
    "Teori dan Bentuk Perubahan Sosial (Evolusi, Revolusi, Siklus, Linier)",
    "Faktor Pendorong dan Penghambat Perubahan Sosial",
    "Modernisasi, Globalisasi, dan Transformasi Sosio-Kultural",
    "Dampak Perubahan Sosial terhadap Disorganisasi & Anomi Sosial"
  ],

  // === GEOGRAFI ===
  "konsep geografi": [
    "10 Konsep Esensial Geografi (Lokasi, Jarak, Keterjangkauan, Pola, Morfologi, Aglomerasi, Nilai Guna, Interaksi, Diferensiasi Area, Keterkaitan Keruangan)",
    "4 Prinsip Geografi (Distribusi, Interrelasi, Deskripsi, Korologi)",
    "3 Pendekatan Geografi (Spasial/Keruangan, Ekologis/Kelingkungan, Kompleks Wilayah)",
    "Objek Formal dan Objek Material Ilmu Geografi"
  ],
  "pengantar geografi": [
    "Ruang Lingkup dan Sejarah Perkembangan Ilmu Geografi",
    "10 Konsep Esensial Geografi dalam Fenomena Keruangan",
    "Prinsip-Prinsip Geografi dan Aplikasinya",
    "Pendekatan Keruangan, Kelingkungan, dan Kompleks Wilayah"
  ],
  "peta": [
    "Komponen-Komponen Peta Standar (Judul, Skala, Legenda, Orientasi, Inset, Sumber)",
    "Perhitungan Skala Peta dan Konversi Skala Angka ke Skala Grafis",
    "Penginderaan Jauh: Komponen Sumber Tenaga, Sensor, Wahana, dan Citra",
    "Interpretasi Citra Penginderaan Jauh (Rona, Warna, Bentuk, Ukuran, Tekstur, Pola)",
    "Sistem Informasi Geografis (SIG): Subsistem Input, Manipulasi/Analisis, dan Output"
  ],
  "litosfer": [
    "Struktur Lapisan Bumi (Kerak, Mantel, Inti Luar, Inti Dalam)",
    "Tenaga Endogen: Tektonisme (Epirogenesa & Orogenesa) serta Sesar/Lipatan",
    "Vulkanisme: Tipe Letusan Gunung Api, Bentuk Intrusi & Ekstrusi Magma",
    "Seisme (Gempa Bumi): Episenter, Hiposenter, dan Skala Richter",
    "Tenaga Eksogen: Pelapukan, Erosi, Mass Wasting, dan Sedimentasi",
    "Mitigasi Bencana Geologi di Kawasan Rawan Gempa & Gunung Api"
  ],
  "atmosfer": [
    "Struktur Lapisan Atmosfer (Troposfer, Stratosfer, Mesosfer, Termosfer, Eksosfer)",
    "Unsur-Unsur Cuaca dan Iklim (Suhu, Tekanan, Angin, Kelembapan, Awan, Curah Hujan)",
    "Klasifikasi Iklim (Koppen, Junghuhn, Schmidt-Ferguson)",
    "Pemanasan Global, El Nino, La Nina, dan Dampak Perubahan Iklim Global"
  ],
  "hidrosfer": [
    "Siklus Hidrologi (Pendek, Sedang, Panjang)",
    "Perairan Darat: Sungai, Danau, Rawa, dan Air Tanah",
    "Perairan Laut: Zonasi Laut, Gelombang, Arus, dan Keanekaragaman Laut",
    "Pengelolaan Sumber Daya Air dan Konservasi Daerah Aliran Sungai (DAS)"
  ],

  // === SEJARAH ===
  "ilmu sejarah": [
    "Pengertian, Manfaat, dan Objek Kajian Sejarah",
    "Konsep Manusia, Ruang, dan Waktu dalam Sejarah",
    "Berpikir Diakronis (Kronologis) vs Sinkronis dalam Analisis Peristiwa",
    "Konsep Perubahan dan Keberlanjutan dalam Sejarah",
    "Sumber Sejarah (Lisan, Tertulis, Benda) dan Metodologi Penelitian Sejarah"
  ],
  "jalur rempah": [
    "Sejarah Jalur Rempah Nusantara dan Komoditas Unggulan",
    "Teori Asal-Usul Nenek Moyang Bangsa Indonesia",
    "Interaksi Budaya dan Perdagangan Bahari Nusantara",
    "Peran Jalur Rempah dalam Poros Maritim Dunia"
  ],
  "hindu-buddha": [
    "Teori Masuknya Agama dan Kebudayaan Hindu-Buddha ke Nusantara",
    "Kerajaan-Kerajaan Hindu-Buddha di Sumatra, Jawa, dan Kalimantan (Kutai, Tarumanagara, Sriwijaya, Mataram Kuno, Singasari, Majapahit)",
    "Akulturasi Kebudayaan Hindu-Buddha dengan Budaya Lokal Nusantara",
    "Runtuhnya Kerajaan Hindu-Buddha dan Warisan Budayanya"
  ],
  "islam di nusantara": [
    "Teori Masuk dan Berkembangnya Agama Islam di Nusantara",
    "Kerajaan-Kerajaan Islam di Sumatra, Jawa, Maluku, dan Sulawesi (Samudera Pasai, Aceh, Demak, Mataram Islam, Ternate-Tidore, Gowa-Tallo)",
    "Saluran Islamisasi (Perdagangan, Perkawinan, Tasawuf, Pendidikan, Seni Budaya)",
    "Akulturasi Budaya Islam dengan Tradisi Nusantara"
  ],
  "kolonialisme": [
    "Latar Belakang Kedatangan Bangsa Barat ke Nusantara",
    "Kebijakan VOC, Hak Oktroai, dan Tanam Paksa (Cultuurstelsel)",
    "Sistem Politik Etis dan Perkembangan Pendidikan Kolonial",
    "Dampak Kolonialisme di Bidang Politik, Ekonomi, dan Sosial Budaya"
  ],
  "pergerakan nasional": [
    "Latar Belakang Lahirnya Pergerakan Nasional Indonesia",
    "Organisasi Pergerakan Kebangsaan (Budi Utomo, Sarekat Islam, Indische Partij, PNI)",
    "Peran Pemuda dan Kongres Pemuda II (Sumpah Pemuda 1928)",
    "Strategi Perjuangan Radiak dan Kooperatif terhadap Kolonial Belanda"
  ],

  // === INFORMATIKA ===
  "berpikir komputasional": [
    "Konsep 4 Pilar Berpikir Komputasional (Dekomposisi, Pola, Abstraksi, Algoritma)",
    "Pencarian Data (Searching: Linear Search & Binary Search)",
    "Pengurutan Data (Sorting: Bubble Sort, Selection Sort, Insertion Sort)",
    "Struktur Data Tumpukan (Stack: LIFO)",
    "Struktur Data Antrean (Queue: FIFO)",
    "Pemodelan Masalah Komputasi Kontekstual"
  ],
  "teknologi informasi dan komunikasi": [
    "Integrasi Aplikasi Perkantoran (Pengolah Kata, Spreadsheet, Presentasi)",
    "Fitur Lanjutan Mail Merge dan Pembuatan Dokumen Massal",
    "Pembuatan Infografis dan Visualisasi Informasi Digital",
    "Penyimpanan Awan (Cloud Storage) dan Kolaborasi Kerja Daring",
    "Pencarian Informasi Lanjutan dengan Mesin Pencari (Search Engine)"
  ],
  "sistem komputer": [
    "Komponen Perangkat Keras Komputer (Input, Pemrosesan, Output, Storage)",
    "Perangkat Lunak Sistem Operasi vs Aplikasi",
    "Mekanisme Interaksi Hardware, Software, dan Pengguna (Brainware)",
    "Manajemen Memori, File, dan Multitasking Sistem Operasi",
    "Prinsip Kerja Gerbang Logika dan Representasi Data Biner"
  ],
  "jaringan komputer": [
    "Topologi Jaringan Komputer (Bus, Star, Ring, Mesh, Tree)",
    "Model Komunikasi Data dan Protokol Jaringan (OSI Layer & TCP/IP)",
    "Jaringan Kabel (LAN) vs Nirkabel (WLAN / Wi-Fi / Bluetooth)",
    "Pengalamatan IP (IP Address IPv4 & Subnetting Dasar)",
    "Konsep Dasar Enkripsi dan Keamanan Akses Jaringan"
  ],
  "analisis data": [
    "Teknik Pengumpulan dan Pengambilan Data (Data Scraping & Form)",
    "Pembersihan Data (Data Cleaning) dan Validasi Data",
    "Pengolahan Data Menggunakan Rumus & Fungsi Spreadsheet (LOOKUP, IF, Statistik)",
    "Visualisasi Data (Diagram Batang, Garis, Lingkaran, Scatter Plot)",
    "Interpretasi Data dan Penarikan Kesimpulan Ilmiah"
  ],
  "algoritma dan pemrograman": [
    "Pengenalan Bahasa Pemrograman Tekstual (Python / C / C++)",
    "Variabel, Tipe Data, dan Operator Matematika/Logika",
    "Struktur Kontrol Keputusan / Percabangan (If - Else)",
    "Struktur Kontrol Perulangan (For Loop & While Loop)",
    "Struktur Data Larik (Array / List)",
    "Pembuatan Fungsi (Function) dan Prosedur Modular",
    "Pelacakan Kode (Tracing) dan Penanganan Error (Debugging)"
  ],
  "dampak sosial informatika": [
    "Sejarah Perkembangan Teknologi Komputasi dan Tokoh Perintis",
    "Etika Berkomunikasi di Jagat Siber dan Media Sosial",
    "Aspek Hukum Informasi dan Transaksi Elektronik (UU ITE)",
    "Hak Kekayaan Intelektual (HAKI) dan Lisensi Perangkat Lunak",
    "Keamanan Data Pribadi dan Ancaman Kejahatan Siber (Cyberbullying, Phishing)"
  ],
  "praktik lintas bidang": [
    "Identifikasi Masalah Lingkungan Sekitar yang Membutuhkan Solusi Digital",
    "Perancangan Solusi Komputasi Terpadu (Computational Project)",
    "Kolaborasi Tim dalam Pembagian Peran dan Manajemen Proyek",
    "Pengujian dan Dokumentasi Produk Komputasi",
    "Presentasi dan Evaluasi Solusi kepada Pemangku Kepentingan"
  ],
  "algoritma": [
    "Konsep Berpikir Komputasional (Dekomposisi, Pengenalan Pola, Abstraksi, Algoritma)",
    "Penyajian Algoritma dengan Pseudocode dan Flowchart Standar",
    "Struktur Kontrol Sekuensial (Runtunan)",
    "Struktur Kontrol Percabangan (If-Else, Switch-Case)",
    "Struktur Kontrol Perulangan (For, While, Do-While)",
    "Analisis Kompleksitas Algoritma Sederhana"
  ],
  "jaringan": [
    "Konsep Jaringan Komputer dan Model Referensi OSI / TCP-IP",
    "Topologi Jaringan (Bintang/Star, Bus, Cincin/Ring, Mesh, Pohon/Tree)",
    "Pengalamatan IP (IPv4 vs IPv6), Subnet Mask, dan Gateway",
    "Perangkat Keras Jaringan (Router, Switch, Hub, Access Point, Modem)",
    "Keamanan Jaringan, Enkripsi Data, Firewall, dan Ancaman Siber"
  ]
};

/**
 * Resolves mapel terpadu (integrated subjects) to specific sub-discipline field if element mentions it
 */
export function resolveBidangMapel(mapel: string = "", elemen: string = ""): string {
  const mLower = mapel ? mapel.toLowerCase() : "";
  const eLower = elemen ? elemen.toLowerCase() : "";

  if (mLower.includes("ips")) {
    if (eLower.includes("ekonomi")) return "Ekonomi";
    if (eLower.includes("sosiologi")) return "Sosiologi";
    if (eLower.includes("geografi")) return "Geografi";
    if (eLower.includes("sejarah")) return "Sejarah";
  }
  if (mLower.includes("ipa") && !mLower.includes("ipas")) {
    if (eLower.includes("fisika")) return "Fisika";
    if (eLower.includes("kimia")) return "Kimia";
    if (eLower.includes("biologi")) return "Biologi";
  }
  return mapel;
}

/**
 * Menghasilkan daftar sub-materi yang terstruktur untuk suatu materi pokok.
 */
export function getSubMateriList(
  materi: string,
  mapel: string = "",
  kelas: string = "",
  elemen: string = ""
): string[] {
  if (!materi || materi.trim() === "") {
    return [
      "Konsep Kunci & Definisi Esensial",
      "Karakteristik, Klasifikasi & Struktur Materi",
      "Prinsip Kerja & Mekanisme Konseptual",
      "Aplikasi & Contoh Kontekstual Dunia Nyata",
      "Studi Kasus & Pemecahan Masalah",
      "Evaluasi & Latihan Pemahaman Mendalam"
    ];
  }

  const cleanMateri = materi.trim();
  const lowerMateri = cleanMateri.toLowerCase();

  // Helper untuk membersihkan dan merapikan teks sub-materi
  const sanitizeItem = (str: string): string => {
    return str
      .trim()
      .replace(/^[\s\d.-]+/, "")
      .replace(/^[,\s;:]+|[,\s;:]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // 1. Cek jika materi mengandung titik dua (":") yang memisahkan bab/topik utama dengan rincian sub-materinya
  // Contoh: "Siklus Akuntansi Perusahaan Jasa: Bukti Transaksi, Jurnal Umum, Buku Besar, Neraca Saldo, Jurnal Penyesuaian, Kertas Kerja, dan Laporan Keuangan"
  if (cleanMateri.includes(":")) {
    const colonParts = cleanMateri.split(":");
    const afterColon = colonParts.slice(1).join(":").trim();
    if (afterColon) {
      const splitItems = afterColon
        .split(/[,;•\n]|\s+dan\s+|\s+serta\s+/i)
        .map(sanitizeItem)
        .filter(s => s.length > 1 && !s.toLowerCase().startsWith("dan ") && !s.toLowerCase().startsWith("serta "));

      if (splitItems.length >= 2) {
        if (lowerMateri.includes("perusahaan jasa") && !splitItems.some(s => s.toLowerCase().includes("penutup"))) {
          return [...splitItems, "Jurnal Penutup & Pembalik"];
        }
        return splitItems;
      }
    }
  }

  // 2. Cek kecocokan kata kunci di kamus komprehensif (Prioritas kata kunci terpanjang & paling spesifik terlebih dahulu)
  const sortedEntries = Object.entries(SUB_MATERI_DATABASE).sort((a, b) => b[0].length - a[0].length);
  for (const [key, subList] of sortedEntries) {
    if (lowerMateri.includes(key)) {
      return subList;
    }
  }

  // 3. Cek apakah ada materi yang memuat tanda kurung berisi rincian (misal: "Ukuran Pemusatan (Mean, Median, Modus)")
  const parenMatch = cleanMateri.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    const rawInner = parenMatch[1];
    const extracted = rawInner
      .split(/[,;•]|\s+dan\s+|\s+serta\s+/i)
      .map(sanitizeItem)
      .filter(s => s.length > 1 && !s.toLowerCase().startsWith("dan ") && !s.toLowerCase().startsWith("serta "));
    if (extracted.length >= 2) {
      return extracted;
    }
  }

  // 4. Cek apakah judul materi itu sendiri adalah gabungan beberapa sub-materi berkoma atau 'dan'
  // Contoh: "Kaidah Pencacahan, Permutasi, dan Kombinasi"
  if (cleanMateri.includes(",") || /\s+dan\s+|\s+serta\s+/i.test(cleanMateri)) {
    const commaSplit = cleanMateri
      .split(/[,;•]|\s+dan\s+|\s+serta\s+/i)
      .map(sanitizeItem)
      .filter(s => s.length > 2 && !s.toLowerCase().startsWith("dan ") && !s.toLowerCase().startsWith("serta "));
    if (commaSplit.length >= 2 && commaSplit.length <= 8) {
      return commaSplit;
    }
  }

  // 5. Cek mapel terpadu spesifik jika belum cocok
  if (mapel.includes("IPS") || mapel.includes("Ilmu Pengetahuan Sosial")) {
    const shortTitle = cleanMateri.split(/[:(]/)[0].trim();
    return [
      `Konsep Dasar & Ruang Lingkup: ${shortTitle}`,
      `Dimensi Sosiologis & Interaksi Sosial`,
      `Dimensi Geografis & Lingkungan Wilayah`,
      `Dimensi Ekonomi & Kebutuhan Hidup`,
      `Dimensi Historis & Nilai Sejarah`,
      `Studi Kasus Kontekstual & Solusi Terpadu`
    ];
  }

  if (mapel.includes("IPA") || mapel.includes("Ilmu Pengetahuan Alam") || mapel.includes("IPAS")) {
    const shortTitle = cleanMateri.split(/[:(]/)[0].trim();
    return [
      `Konsep Ilmiah Dasar: ${shortTitle}`,
      `Karakteristik Fisik & Fenomena Pengamatan`,
      `Interaksi Zat / Reaksi Kimiawi`,
      `Keterkaitan Biologis & Ekosistem`,
      `Eksperimen / Kerja Ilmiah & Pengujian`,
      `Penerapan Teknologi Ramah Lingkungan`
    ];
  }

  // 6. Fallback pedagogis cerdas & terstruktur berbasis nama topik ringkas
  const shortTitle = cleanMateri.split(/[:(]/)[0].trim();
  return [
    `Pengertian & Karakteristik ${shortTitle}`,
    `Struktur, Komponen & Elemen Kunci ${shortTitle}`,
    `Prinsip Kerja & Mekanisme ${shortTitle}`,
    `Analisis Data & Contoh Kontekstual ${shortTitle}`,
    `Studi Kasus Riil & Pemecahan Masalah`,
    `Tantangan Evaluasi Kritis & Refleksi`
  ];
}

/**
 * Pilihan Variasi Stimulus Kaya untuk Generator LKPD AI
 */
export const LKPD_VARIASI_STIMULUS_LIST = [
  {
    id: "Multi-Stimulus Lengkap (Kasus Narasi + Bukti Dokumen/Data + Dialog Dilema)",
    label: "Multi-Stimulus Lengkap (Kasus Narasi + Bukti Dokumen/Data + Dialog Dilema)",
    badge: "Paling Populer & Kaya",
    desc: "Memadukan narasi riil, lampiran bukti faktual (tabel/nota/faktur), dan percakapan silang pendapat multi-pihak."
  },
  {
    id: "Paket Bukti Transaksi Keuangan Otentik Lengkap (Kuitansi, Faktur, Nota, Memo)",
    label: "Paket Bukti Transaksi Otentik (Faktur, Kuitansi, Nota, Memo)",
    badge: "Praktikum Akuntansi Lengkap",
    desc: "Menyajikan simulasi berkas bukti transaksi bisnis realistis lengkap (Kuitansi, Faktur 2/10 n/30, Nota Kontan/Debet/Kredit, Memo Internal) untuk siklus akuntansi penuh."
  },
  {
    id: "Ragam Kasus Kontekstual Multisektor (3 Kasus Berbeda Sektor/Skala)",
    label: "Ragam Kasus Kontekstual Multisektor (3 Sektor/Skala Berbeda)",
    badge: "Multiperspektif",
    desc: "Menyajikan 3 kasus berbeda sektor (skala mikro/UMKM, industri menengah, dan layanan publik)."
  },
  {
    id: "Analisis Dokumen Riil, Faktur & Rekam Data Otentik Lapangan",
    label: "Analisis Dokumen Riil & Rekam Data Otentik",
    badge: "Faktual Lapangan",
    desc: "Fokus pada telaah bukti fisik konkret: arsip transaksi, kwitansi, resep formulasi, atau log aktivitas."
  },
  {
    id: "Tabel Data Statistik, Tren Numerik & Observasi Lapangan",
    label: "Tabel Data Statistik, Tren Numerik & Observasi",
    badge: "Kuantitatif / Data",
    desc: "Sajian tabel numerik perbandingan, frekuensi data, dan tren berkala untuk memancing nalar analisis."
  },
  {
    id: "Grafik / Diagram Alir (Flowchart) & Visualisasi Proses Dinamis",
    label: "Grafik / Diagram Alir (Flowchart) & Skema Proses",
    badge: "Visual Proses",
    desc: "Skema diagram alir sistem, rantai proses, atau grafik komparatif yang dianalisis oleh peserta didik."
  },
  {
    id: "Dialog Dilematis & Polemik Silang Pendapat Tokoh Kritis",
    label: "Dialog Dilematis & Silang Pendapat Tokoh",
    badge: "Nalar Kritis",
    desc: "Kutipan percakapan perdebatan argumentatif antara 2-3 tokoh dengan sudut pandang kontradiktif."
  },
  {
    id: "Artikel Berita Investigatif & Fenomena Isu Kontemporer Terkini",
    label: "Artikel Berita Investigatif & Fenomena Terkini",
    badge: "Aktual Terkini",
    desc: "Petikan warta berita aktual, liputan investigasi jurnalisme, dan dinamika isu viral positif."
  },
  {
    id: "Studi Kasus Pemecahan Masalah (Problem Solving & Root Cause)",
    label: "Studi Kasus Masalah Nyata (Problem Solving)",
    badge: "Solutif Praktis",
    desc: "Masalah nyata yang macet atau gagal di lapangan yang menuntut penyelidikan akar masalah dan solusi kreatif."
  },
  {
    id: "Eksperimen / Simulasi Laboratorium & Pengujian Hipotesis Ilmiah",
    label: "Eksperimen Ilmiah & Pengujian Hipotesis",
    badge: "Inquiry / Eksperimen",
    desc: "Prosedur penyelidikan empiris, tabel variabel bebas-terikat, dan analisis data hasil uji coba."
  },
  {
    id: "Peta Spasial, Denah Kontekstual & Analisis Lingkungan",
    label: "Peta Spasial, Denah & Analisis Lingkungan",
    badge: "Spasial",
    desc: "Representasi spasial, denah zonasi, sebaran wilayah, dan dampak keruangan lingkungan hidup."
  },
  {
    id: "Dilema Etika Moral, Tanggung Jawab Sosial & Kebijakan Publik",
    label: "Dilema Etika Moral & Keputusan Strategis",
    badge: "Reflektif Etis",
    desc: "Kasus yang menghadapkan siswa pada pertimbangan moral, integritas nilai, dan regulasi yang berbenturan."
  },
  {
    id: "Infografis Komprehensif & Perbandingan Komparatif Lintas Bidang",
    label: "Infografis Komprehensif & Komparasi Data",
    badge: "Sintesis Komparatif",
    desc: "Penyajian poin-poin visual perbandingan kelebihan-kelemahan antar dua model atau metode berbeda."
  }
];

/**
 * Pilihan Variasi Stimulus & Kasus Kontekstual untuk Generator Materi Ajar
 */
export const MATERI_AJAR_STIMULUS_LIST = [
  {
    id: "Studi Kasus Kontekstual & Realitas Lapangan Terkini",
    label: "Studi Kasus Kontekstual & Realitas Lapangan",
    desc: "Contoh kasus dunia kerja, operasional nyata, dan fenomena sehari-hari yang dekat dengan peserta didik."
  },
  {
    id: "Analisis Data Statistik & Infografis Konseptual Terpadu",
    label: "Analisis Data Statistik & Infografis Konsep",
    desc: "Data numerik, tabel statistik resmi, dan gambaran visual diagram untuk memperkuat pemahaman materi."
  },
  {
    id: "Fenomena Isu Terkini & Artikel Berita Aktual Edukatif",
    label: "Fenomena Isu Terkini & Artikel Berita Aktual",
    desc: "Berita aktual dan dinamika tren terkini sebagai jembatan konsep materi dengan kejadian dunia nyata."
  },
  {
    id: "Dialog Reflektif & Perdebatan Multi-Perspektif Tokoh",
    label: "Dialog Reflektif & Polemik Sudut Pandang",
    desc: "Wawancara atau dialog simulasi antara pakar/tokoh yang mendiskusikan pro-kontra implementasi materi."
  },
  {
    id: "Eksperimen / Praktik Mandiri & Eksplorasi Hands-On Siswa",
    label: "Eksperimen / Panduan Praktik Hands-On",
    desc: "Langkah penyelidikan mandiri, uji coba terpandu, dan aktivitas praktikal yang dapat dikerjakan siswa."
  },
  {
    id: "Komparasi Kasus Nyata (Studi Banding Praktik Baik Lokal vs Global)",
    label: "Komparasi Kasus Nyata (Praktik Baik Lokal vs Global)",
    desc: "Perbandingan studi kasus sukses di Indonesia dengan praktik terbaik di kancah internasional."
  },
  {
    id: "Multi-Stimulus Terpadu (Kasus Lapangan + Data Numerik + Diagram Alir)",
    label: "Multi-Stimulus Terpadu (Kasus + Data + Diagram Alir)",
    desc: "Paduan komplit antara narasi kontekstual, tabel data pendukung, dan skema diagram alir sistematis."
  }
];

/**
 * Pilihan Jenis Stimulus untuk Generator Paket Soal (Diperkaya dan Beragam)
 */
export const SOAL_STIMULUS_OPTIONS = [
  { id: "Narasi / Teks Bacaan Kontekstual", label: "Narasi Teks Kontekstual", icon: "📝", category: "Teks" },
  { id: "Artikel Berita / Warta Aktual Terkini", label: "Artikel Berita / Warta Terkini", icon: "📰", category: "Teks" },
  { id: "Tabel Data Statistik & Komparasi", label: "Tabel Data Statistik", icon: "📊", category: "Data" },
  { id: "Grafik Tren / Kurva & Diagram Hubungan", label: "Grafik / Diagram Kurva", icon: "📈", category: "Data" },
  { id: "Dokumen Otentik & Bukti Transaksi", label: "Dokumen Otentik / Rekam Bukti", icon: "📑", category: "Otentik" },
  { id: "Dialog Percakapan / Debat Kritis", label: "Dialog / Silang Pendapat", icon: "💬", category: "Diskusi" },
  { id: "Studi Kasus Nyata & Dilema Solutif", label: "Studi Kasus & Problem Solving", icon: "🔍", category: "Kasus" },
  { id: "Gambar / Ilustrasi / Foto Lapangan", label: "Gambar / Ilustrasi / Foto", icon: "🖼️", category: "Visual" },
  { id: "Peta Tematik / Denah / Sketsa Spasial", label: "Peta Tematik / Denah Spasial", icon: "🗺️", category: "Spasial" },
  { id: "Data Eksperimen Ilmiah & Hasil Lab", label: "Data Eksperimen / Hasil Lab", icon: "🔬", category: "Sains" },
  { id: "Bagan Alir (Flowchart) & Skema Proses", label: "Bagan Alir (Flowchart) / Skema", icon: "⚙️", category: "Proses" },
  { id: "Cuplikan Sastra / Puisi / Teks Sejarah", label: "Kutipan Sastra / Sejarah", icon: "📜", category: "Teks" },
  { id: "Infografis & Visual Data Terpadu", label: "Infografis Terpadu", icon: "💡", category: "Visual" },
  { id: "Tanpa Stimulus", label: "Tanpa Stimulus (Langsung Soal)", icon: "🚫", category: "Langsung" }
];

/**
 * Props untuk Komponen Multi-Select Dropdown Sub-Materi
 */
interface SubMateriMultiSelectProps {
  selected?: string[];
  onChange: (newSelected: string[]) => void;
  materi: string;
  mapel?: string;
  kelas?: string;
  elemen?: string;
  label?: string;
  placeholder?: string;
  accentColor?: "indigo" | "amber" | "violet" | "teal" | "emerald";
}

/**
 * Komponen Dropdown Multi-Select Sub-Materi dengan fitur:
 * - Dropdown pilihan interaktif dengan checklist multi-select
 * - Pemilahan otomatis sesuai materi pokok yang dipilih
 * - Kemampuan memilih lebih dari 1 sub-materi
 * - Fitur pencarian sub-materi
 * - Penambahan sub-materi kustom sendiri secara instan (mendukung pemisahan koma/enter)
 * - Chips / badges terpilih dengan tombol hapus (x)
 * - Tombol Pilih Semua dan Hapus Semua
 */
export function SubMateriMultiSelect({
  selected = [],
  onChange,
  materi,
  mapel = "",
  kelas = "",
  elemen = "",
  label = "Sub-Materi Terfokus",
  placeholder = "Pilih satu atau beberapa sub-materi...",
  accentColor = "indigo"
}: SubMateriMultiSelectProps) {
  const safeSelected = Array.isArray(selected) ? selected : [];
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [customOptions, setCustomOptions] = useState<string[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);

  // Ambil daftar rekomendasi sub materi berdasarkan materi pokok + opsi kustom yang ditambahkan guru
  const availableOptions = useMemo(() => {
    const list = getSubMateriList(materi, mapel, kelas, elemen);
    return Array.from(new Set([...customOptions, ...list]));
  }, [materi, mapel, kelas, elemen, customOptions]);

  // Filter opsi berdasarkan pencarian
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return availableOptions;
    const q = searchQuery.toLowerCase();
    return availableOptions.filter(opt => opt.toLowerCase().includes(q));
  }, [availableOptions, searchQuery]);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle pilihan item
  const toggleItem = (item: string) => {
    if (safeSelected.includes(item)) {
      onChange(safeSelected.filter(s => s !== item));
    } else {
      onChange([...safeSelected, item]);
    }
  };

  // Pilih Semua
  const selectAll = () => {
    const combined = Array.from(new Set([...safeSelected, ...availableOptions]));
    onChange(combined);
  };

  // Hapus Semua
  const clearAll = () => {
    onChange([]);
  };

  // Tambah sub materi kustom (tanpa memicu submit form luar, mendukung beberapa sub-materi via koma)
  const handleAddCustom = (inputText?: string, e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const raw = (inputText !== undefined ? inputText : customInput).trim();
    if (!raw) {
      setFeedbackMsg("Ketik nama sub-materi terlebih dahulu.");
      setTimeout(() => setFeedbackMsg(null), 2500);
      return;
    }

    // Pisahkan jika guru memasukkan beberapa sub-materi sekaligus dipisahkan koma atau enter
    const items = raw
      .split(/[,;\n]+/)
      .map(s => s.trim().replace(/^[\s\d.-]+/, "").replace(/^[,\s;:]+|[,\s;:]+$/g, ""))
      .filter(s => s.length > 0);

    if (items.length === 0) return;

    setCustomOptions(prev => {
      const existing = Array.isArray(prev) ? prev : [];
      return Array.from(new Set([...existing, ...items]));
    });

    const nextSelected = Array.from(new Set([...safeSelected, ...items]));
    onChange(nextSelected);

    setCustomInput("");
    setFeedbackMsg(`Berhasil menambahkan ${items.length} sub-materi!`);
    setTimeout(() => setFeedbackMsg(null), 2000);
  };

  // Konfigurasi tema warna
  const themeClasses = {
    indigo: {
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      checkbox: "text-indigo-600 focus:ring-indigo-500",
      btnActive: "bg-indigo-600 text-white",
      highlight: "text-indigo-600",
      borderActive: "border-indigo-400 ring-2 ring-indigo-500/20"
    },
    amber: {
      badge: "bg-amber-50 text-amber-800 border-amber-200",
      checkbox: "text-amber-600 focus:ring-amber-500",
      btnActive: "bg-amber-600 text-white",
      highlight: "text-amber-600",
      borderActive: "border-amber-400 ring-2 ring-amber-500/20"
    },
    violet: {
      badge: "bg-violet-50 text-violet-700 border-violet-200",
      checkbox: "text-violet-600 focus:ring-violet-500",
      btnActive: "bg-violet-600 text-white",
      highlight: "text-violet-600",
      borderActive: "border-violet-400 ring-2 ring-violet-500/20"
    },
    teal: {
      badge: "bg-teal-50 text-teal-700 border-teal-200",
      checkbox: "text-teal-600 focus:ring-teal-500",
      btnActive: "bg-teal-600 text-white",
      highlight: "text-teal-600",
      borderActive: "border-teal-400 ring-2 ring-teal-500/20"
    },
    emerald: {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      checkbox: "text-emerald-600 focus:ring-emerald-500",
      btnActive: "bg-emerald-600 text-white",
      highlight: "text-emerald-600",
      borderActive: "border-emerald-400 ring-2 ring-emerald-500/20"
    }
  }[accentColor];

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      {/* Header: Label, Tombol Tambah Cepat, dan Counter */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <Layers size={13} className={themeClasses.highlight} />
          <span>{label}</span>
          <span className="text-[10px] text-slate-400 font-normal lowercase">(dapat pilih lebih dari 1)</span>
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowQuickAdd(prev => !prev);
              setTimeout(() => quickInputRef.current?.focus(), 100);
            }}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
              showQuickAdd 
                ? "bg-slate-800 text-white border-slate-800" 
                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 shadow-2xs"
            }`}
            title="Tambah sub materi sendiri"
          >
            <Plus size={11} />
            <span>Tambah Sub-Materi</span>
          </button>
          {safeSelected.length > 0 && (
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${themeClasses.badge}`}>
              {safeSelected.length} Dipilih
            </span>
          )}
        </div>
      </div>

      {/* Inline Quick Add Input Bar */}
      {showQuickAdd && (
        <div 
          className="p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 animate-in fade-in-50 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-1.5">
            <input
              ref={quickInputRef}
              type="text"
              placeholder="Ketik sub-materi (bisa beberapa dipisahkan koma, contoh: Jurnal Umum, Buku Besar)..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddCustom(customInput, e);
                }
              }}
              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <button
              type="button"
              onClick={(e) => handleAddCustom(customInput, e)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
            >
              <Plus size={13} />
              <span>Tambahkan</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowQuickAdd(false);
              }}
              className="px-2 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-xs font-medium cursor-pointer"
              title="Tutup"
            >
              <X size={13} />
            </button>
          </div>
          {feedbackMsg && (
            <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 px-1">
              <Sparkles size={11} />
              <span>{feedbackMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* Dropdown Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full text-left px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium flex items-center justify-between transition-all ${
            isOpen ? themeClasses.borderActive : "hover:border-slate-300"
          }`}
        >
          <div className="flex-1 truncate pr-2 text-slate-700">
            {safeSelected.length === 0 ? (
              <span className="text-slate-400">{placeholder}</span>
            ) : (
              <span className="font-semibold text-slate-800">
                {safeSelected.length === 1 ? safeSelected[0] : `${safeSelected[0]} (+${safeSelected.length - 1} lainnya)`}
              </span>
            )}
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown Menu Panel */}
        {isOpen && (
          <div
            className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Toolbar: Pencarian & Shortcut Action */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/80 space-y-1.5">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari sub-materi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="text-slate-500 font-medium">
                  Tersedia: {availableOptions.length} opsi
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[10px] font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-[10px] font-bold text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Hapus Pilihan
                  </button>
                </div>
              </div>
            </div>

            {/* List Pilihan Sub-Materi */}
            <div className="max-h-56 overflow-y-auto p-1.5 divide-y divide-slate-50">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  Tidak ditemukan sub-materi yang cocok.
                </div>
              ) : (
                filteredOptions.map((item) => {
                  const isChecked = safeSelected.includes(item);
                  return (
                    <div
                      key={item}
                      onClick={() => toggleItem(item)}
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer text-xs transition-colors select-none ${
                        isChecked ? "bg-slate-100/80 font-semibold text-slate-900" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? `${themeClasses.btnActive} border-transparent`
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span className="leading-snug flex-1">{item}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Penambahan Sub-Materi Sendiri (Custom) di dalam Dropdown */}
            <div className="p-2 border-t border-slate-100 bg-slate-50/70" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Ketik sub-materi baru lalu klik Tambah..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddCustom(customInput, e);
                    }
                  }}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <button
                  type="button"
                  onClick={(e) => handleAddCustom(customInput, e)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                >
                  <Plus size={13} />
                  <span>Tambahkan</span>
                </button>
              </div>
              {feedbackMsg && (
                <p className="text-[10px] text-emerald-600 font-bold mt-1 px-0.5">
                  {feedbackMsg}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Chips / Badges Display */}
      {safeSelected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {safeSelected.map((item) => (
            <span
              key={item}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${themeClasses.badge} transition-all`}
            >
              <span className="truncate max-w-[280px]">{item}</span>
              <button
                type="button"
                onClick={() => toggleItem(item)}
                className="hover:opacity-75 p-0.5 rounded-full hover:bg-black/5 cursor-pointer"
                title="Hapus"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Helper text */}
      <p className="text-[10px] text-slate-500 font-medium italic leading-relaxed">
        *Pilih satu atau lebih sub-materi agar rumusan LKPD, materi ajar, atau paket soal lebih terfokus, tajam, dan tidak melebar ke seluruh isi bab.
      </p>
    </div>
  );
}
