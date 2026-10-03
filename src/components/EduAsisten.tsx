import { useState, useRef, useEffect, ChangeEvent, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { safeStorage } from "../lib/safeStorage";
import { 
  Bot, Send, Sparkles, BookOpen, Target, FileQuestion, ClipboardCheck, 
  Loader2, X, Download, Menu, Plus, MessageSquare, Edit2, Reply, Trash2, 
  ThumbsUp, ThumbsDown, Copy, Check, RefreshCw, User, UserCheck, Settings,
  Upload, FileUp, CheckSquare, ListChecks, Printer, FileText, SlidersHorizontal,
  Image as ImageIcon, Link as LinkIcon, Building2, CheckCircle2, Info, CalendarDays, Calendar,
  Lightbulb, ExternalLink, Search, BookMarked, Library
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import EduExportModal from "./EduExportModal";
import PembahasanSoalModal from "./PembahasanSoalModal";
import { 
  exportToWordFormatted, 
  printDocumentFormatted, 
  copyFormattedRichText,
  cleanIntroPreamble
} from "../lib/documentExporter";
import { formatDriveImageUrl } from "../lib/driveUtils";
import { compressImage, compressFileForOCR } from "../lib/imageUtils";
import { useDriveDatabase } from "../context/DriveSyncContext";
import { Cloud, CloudUpload, CloudDownload } from "lucide-react";
import {
  SubMateriMultiSelect,
  LKPD_VARIASI_STIMULUS_LIST,
  MATERI_AJAR_STIMULUS_LIST,
  SOAL_STIMULUS_OPTIONS,
  resolveBidangMapel
} from "./SubMateriHelper";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  replyTo?: {
    role: "user" | "assistant";
    content: string;
  };
  feedback?: "like" | "dislike";
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const DATA_JENJANG = {
  "PAUD": ["Fase Fondasi (PAUD / TK)"],
  "SD": ["1-2 (Fase A)", "3-4 (Fase B)", "5-6 (Fase C)"],
  "SMP": ["7-9 (Fase D)"],
  "SMA": ["10 (Fase E)", "11 (Fase F)", "12 (Fase F)"],
  "SMK": ["10 (Fase E)", "11 (Fase F)", "12 (Fase F)"]
};

const DATA_MAPEL_PAUD = [
  "Nilai Agama dan Budi Pekerti",
  "Jati Diri",
  "Dasar-Dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni (STEAM)"
];

const DATA_MAPEL_SD = [
  "Pendidikan Agama dan Budi Pekerti",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "Matematika",
  "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
  "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
  "Seni Budaya (Seni Rupa, Musik, Tari, Teater)",
  "Bahasa Inggris",
  "Koding & Kecerdasan Artifisial (AI)",
  "Muatan Lokal (Bahasa Daerah)"
];

const DATA_MAPEL_SMP = [
  "Pendidikan Agama dan Budi Pekerti",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "Matematika",
  "Ilmu Pengetahuan Alam (IPA)",
  "Ilmu Pengetahuan Sosial (IPS)",
  "Bahasa Inggris",
  "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
  "Informatika",
  "Seni dan Prakarya (Kerajinan, Rekayasa, Budidaya, Pengolahan)",
  "Muatan Lokal (Bahasa Daerah)"
];

const DATA_MAPEL_SMA_E = [
  "Pendidikan Agama dan Budi Pekerti",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "Matematika",
  "IPA Terpadu (Fisika, Kimia, Biologi)",
  "IPS Terpadu (Sosiologi, Ekonomi, Geografi, Sejarah)",
  "Bahasa Inggris",
  "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
  "Informatika",
  "Seni Budaya",
  "Sejarah Indonesia"
];

const DATA_MAPEL_SMA_F = [
  "Pendidikan Agama dan Budi Pekerti",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "Matematika (Umum)",
  "Bahasa Inggris",
  "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
  "Seni Budaya",
  "Sejarah",
  "Biologi",
  "Kimia",
  "Fisika",
  "Informatika",
  "Sosiologi",
  "Ekonomi",
  "Geografi",
  "Antropologi",
  "Matematika Tingkat Lanjut",
  "Bahasa Inggris Tingkat Lanjut",
  "Prakarya dan Kewirausahaan (PKWu)"
];

const DATA_MAPEL_SMK = [
  "Pendidikan Agama dan Budi Pekerti",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "Matematika Terapan (SMK)",
  "Bahasa Inggris Komunikasi Bisnis & Kerja",
  "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
  "Sejarah Indonesia",
  "Seni Budaya",
  "Projek IPAS (Ilmu Pengetahuan Alam dan Sosial SMK)",
  "Informatika & Algoritma (SMK)",
  // DASAR-DASAR PROGRAM KEAHLIAN (FASE E - KELAS 10)
  "Dasar-Dasar Rekayasa Perangkat Lunak (RPL)",
  "Dasar-Dasar Teknik Komputer dan Jaringan (TKJ)",
  "Dasar-Dasar Teknik Otomotif",
  "Dasar-Dasar Akuntansi & Keuangan Lembaga (AKL)",
  "Dasar-Dasar Manajemen Perkantoran & Layanan Bisnis (MPLB)",
  "Dasar-Dasar Pemasaran & Bisnis Digital",
  "Dasar-Dasar Kuliner / Tata Boga",
  "Dasar-Dasar Desain Komunikasi Visual (DKV)",
  "Dasar-Dasar Teknik Mesin & Ketenagalistrikan",
  "Dasar-Dasar Layanan Kesehatan / Keperawatan",
  "Dasar-Dasar Agribisnis & Agroteknologi",
  "Dasar-Dasar Perhotelan & Layanan Hospitaliti",
  // KONSENTRASI KEAHLIAN KEJURUAN (FASE F - KELAS 11-12)
  "Konsentrasi Keahlian RPL (Pemrograman Web, Mobile & PBO)",
  "Konsentrasi Keahlian TKJ (Server & Keamanan Jaringan)",
  "Konsentrasi Keahlian TKR (Pemeliharaan Mesin & Kelistrikan Mobil)",
  "Konsentrasi Keahlian TSM (Pemeliharaan Mesin & Injeksi Sepeda Motor)",
  "Konsentrasi Keahlian AKL (Akuntansi Keuangan & Komputer Akuntansi)",
  "Konsentrasi Keahlian MPLB (Otomatisasi Perkantoran & Kearsipan)",
  "Konsentrasi Keahlian Pemasaran Digital & Bisnis Ritel",
  "Konsentrasi Keahlian Kuliner (Pengolahan Makanan & Pastry/Bakery)",
  "Konsentrasi Keahlian DKV (Desain Grafis, Videografi & Animasi)",
  "Konsentrasi Keahlian Perhotelan (Front Office & Housekeeping)",
  "Konsentrasi Keahlian Keperawatan & Farmasi Klinis",
  "Konsentrasi Keahlian Agribisnis Tanaman Pangan & Hortikultura",
  "Konsentrasi Keahlian Teknik Instalasi Tenaga Listrik & Mesin",
  // PROJEK & PKL
  "Projek Kreatif dan Kewirausahaan (PKK SMK)",
  "Praktik Kerja Lapangan (PKL SMK)"
];

interface BukuDigitalItem {
  id: string;
  title: string;
  mapel: string;
  jenjang: "SD" | "SMP" | "SMA" | "SMK" | "PAUD";
  kelas: string;
  fase: string;
  type: "Buku Siswa Utama" | "Buku Panduan Guru" | "Buku Teks Pendamping";
  babList: string[];
  description: string;
  link: string;
}

const BUKU_DIGITAL_CATALOG: BukuDigitalItem[] = [
  // PAUD
  {
    id: "b-paud-1",
    title: "Buku Panduan Guru Elemen Nilai Agama dan Budi Pekerti PAUD",
    mapel: "Nilai Agama dan Budi Pekerti",
    jenjang: "PAUD",
    kelas: "Fase Fondasi (PAUD / TK)",
    fase: "Fase Fondasi",
    type: "Buku Panduan Guru",
    babList: ["Mengenal Tuhan & Ciptaan-Nya", "Pembiasaan Doa & Ibadah Harian", "Kasih Sayang terhadap Sesama & Alam Sekitar"],
    description: "Buku panduan guru Kemendikdasmen untuk pembiasaan nilai-nilai agama, moral, dan karakter anak usia dini.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-paud-2",
    title: "Buku Panduan Guru Elemen Jati Diri PAUD",
    mapel: "Jati Diri",
    jenjang: "PAUD",
    kelas: "Fase Fondasi (PAUD / TK)",
    fase: "Fase Fondasi",
    type: "Buku Panduan Guru",
    babList: ["Mengenal Diri & Pengelolaan Emosi Positif", "Keterampilan Motorik Kasar & Halus", "Pola Hidup Bersih, Sehat & Mandiri"],
    description: "Pedoman pembelajaran eksploratif untuk membangun identitas diri, emosi positif, dan kesehatan fisik anak.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-paud-3",
    title: "Buku Panduan Guru Elemen Dasar-Dasar Literasi & STEAM PAUD",
    mapel: "Dasar-Dasar STEAM & Literasi",
    jenjang: "PAUD",
    kelas: "Fase Fondasi (PAUD / TK)",
    fase: "Fase Fondasi",
    type: "Buku Panduan Guru",
    babList: ["Pra-Literasi & Cerita Bergambar Interaktif", "Pra-Matematika, Pola & Bentuk Geometri", "Eksplorasi Sains Sederhana, Teknologi & Ekspresi Seni"],
    description: "Aktivitas saintifik berbasis bermain bermakna untuk mengasah kemampuan literasi, numerasi, dan kreativitas STEAM.",
    link: "https://buku.kemendikdasmen.go.id/"
  },

  // SD
  {
    id: "b-sd-1",
    title: "Buku Siswa IPAS SD Kelas 3 Kurikulum Merdeka",
    mapel: "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
    jenjang: "SD",
    kelas: "3-4 (Fase B)",
    fase: "Fase B",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Mari Kenali Hewan di Sekitar Kita", "Bab 2: Wujud Zat dan Perubahannya", "Bab 3: Gaya di Sekitar Kita", "Bab 4: Mengubah Bentuk Energi", "Bab 5: Cerita Tentang Daerahku"],
    description: "Buku teks utama Kemendikdasmen materi IPAS kelas 3 tentang identifikasi hewan, konsep wujud benda, dan energi.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-sd-2",
    title: "Buku Siswa IPAS SD Kelas 4 Kurikulum Merdeka",
    mapel: "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
    jenjang: "SD",
    kelas: "3-4 (Fase B)",
    fase: "Fase B",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Tumbuhan Sumber Kehidupan di Bumi", "Bab 2: Wujud Zat dan Perubahannya", "Bab 3: Gaya di Sekitar Kita", "Bab 4: Mengubah Bentuk Energi", "Bab 5: Cerita Tentang Daerahku", "Bab 6: Indonesiaku Kaya Budaya"],
    description: "Buku teks utama Kemendikdasmen materi IPAS kelas 4 mencakup fotosintesis, gaya, energi, dan kearifan lokal daerah.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-sd-3",
    title: "Buku Siswa IPAS SD Kelas 5 Kurikulum Merdeka",
    mapel: "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
    jenjang: "SD",
    kelas: "5-6 (Fase C)",
    fase: "Fase C",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Melihat karena Cahaya Mendengar karena Bunyi", "Bab 2: Harmoni dalam Ekosistem", "Bab 3: Magnet Listrik dan Teknologi untuk Kehidupan", "Bab 4: Mari Kenali Bumi Kita", "Bab 5: Bagaimana Kita Hidup dan Bertumbuh"],
    description: "Buku teks utama IPAS kelas 5 membahas sifat cahaya/bunyi, rantai makanan ekosistem, kelistrikan, dan organ tubuh.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-sd-4",
    title: "Buku Siswa IPAS SD Kelas 6 Kurikulum Merdeka",
    mapel: "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
    jenjang: "SD",
    kelas: "5-6 (Fase C)",
    fase: "Fase C",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Bagaikan Roda Berputar (Sistem Organ Rangka & Saraf)", "Bab 2: Cerita tentang Indonesia Kita", "Bab 3: Pelesir Keliling Dunia (Benua & Perdagangan)", "Bab 4: Indonesia dan Masyarakat Dunia"],
    description: "Buku teks utama IPAS kelas 6 mencakup koordinasi tubuh, sejarah perjuangan bangsa, geografi benua, dan isu global.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-sd-5",
    title: "Buku Siswa Bahasa Indonesia SD Kelas 1-6 ('Lihat Sekitar' & 'Bergerak Bersama')",
    mapel: "Bahasa Indonesia",
    jenjang: "SD",
    kelas: "3-4 (Fase B)",
    fase: "Fase A-C",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Aku dan Teman Baru (Membaca & Memirsa)", "Bab 2: Menjaga Kesehatan & Keselamatan", "Bab 3: Kebhinekaan & Kebudayaan Indonesia", "Bab 4: Menulis Laporan Hasil Observasi Sederhana"],
    description: "Buku teks literasi membaca, menyimak, dan menulis ekspresif untuk jenjang SD Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-sd-6",
    title: "Buku Siswa Matematika SD Kelas 1-6 Kurikulum Merdeka",
    mapel: "Matematika",
    jenjang: "SD",
    kelas: "3-4 (Fase B)",
    fase: "Fase A-C",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Bilangan Cacah Sampai 10.000 & Operasi Hitung", "Bab 2: Pecahan Senilai, Desimal & Persen", "Bab 3: Pengukuran Panjang, Luas & Volume", "Bab 4: Bangun Datar, Keliling & Luas", "Bab 5: Penyajian Data & Diagram Batang"],
    description: "Buku matematika bergambar dengan konteks numerasi pemecahan masalah kehidupan sehari-hari.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-sd-7",
    title: "Buku Panduan Guru & Modul Koding & Kecerdasan Artifisial (AI) SD Kelas 3-6",
    mapel: "Koding & AI SD",
    jenjang: "SD",
    kelas: "3-4 (Fase B)",
    fase: "Fase B-C",
    type: "Buku Panduan Guru",
    babList: ["Bab 1: Berpikir Komputasional & Dekomposisi Masalah", "Bab 2: Algoritma Visual Sederhana Scratch/Blockly", "Bab 3: Etika Digital & Pengenalan Kecerdasan Artifisial"],
    description: "Panduan resmi koding visual dan literasi AI untuk melatih penalaran kritis dan kreativitas komputasi peserta didik SD.",
    link: "https://buku.kemendikdasmen.go.id/"
  },

  // SMP
  {
    id: "b-smp-1",
    title: "Buku Siswa IPA SMP Kelas 7 Kurikulum Merdeka",
    mapel: "Ilmu Pengetahuan Alam (IPA)",
    jenjang: "SMP",
    kelas: "7-9 (Fase D)",
    fase: "Fase D",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Hakikat Sains dan Metode Ilmiah", "Bab 2: Zat dan Perubahannya", "Bab 3: Suhu, Kalor, dan Pemuaian", "Bab 4: Gerak dan Gaya", "Bab 5: Klasifikasi Makhluk Hidup", "Bab 6: Ekologi dan Keanekaragaman Hayati Indonesia"],
    description: "Buku IPA Kelas 7 Kemendikdasmen mencakup prinsip kerja ilmiah, termofisika, mekanika dasar, dan keanekaragaman hayati.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-smp-2",
    title: "Buku Siswa IPA SMP Kelas 8 Kurikulum Merdeka",
    mapel: "Ilmu Pengetahuan Alam (IPA)",
    jenjang: "SMP",
    kelas: "7-9 (Fase D)",
    fase: "Fase D",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Pengenalan Sel Mikroskopis", "Bab 2: Struktur dan Fungsi Tubuh Makhluk Hidup", "Bab 3: Usaha, Energi, dan Pesawat Sederhana", "Bab 4: Getaran, Gelombang, dan Cahaya", "Bab 5: Unsur, Senyawa, dan Campuran", "Bab 6: Gunung Berapi dan Gempa Bumi"],
    description: "Buku IPA Kelas 8 membedah sitologi sel, sistem organ manusia, gelombang, serta materi kimia dan kebumian.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-smp-3",
    title: "Buku Siswa IPA SMP Kelas 9 Kurikulum Merdeka",
    mapel: "Ilmu Pengetahuan Alam (IPA)",
    jenjang: "SMP",
    kelas: "7-9 (Fase D)",
    fase: "Fase D",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Pertumbuhan dan Perkembangan Makhluk Hidup", "Bab 2: Sistem Koordinasi, Reproduksi & Homeostasis", "Bab 3: Tekanan Zat Padat, Cair & Gas", "Bab 4: Listrik Statis, Dinamis & Kemagnetan", "Bab 5: Pewarisan Sifat dan Bioteknologi Ramah Lingkungan"],
    description: "Buku IPA Kelas 9 memuat genetika Mendel, kelistrikan, fluida, sistem koordinasi, dan bioteknologi terapan.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-smp-4",
    title: "Buku Siswa IPS SMP Kelas 7-9 Kurikulum Merdeka",
    mapel: "Ilmu Pengetahuan Sosial (IPS)",
    jenjang: "SMP",
    kelas: "7-9 (Fase D)",
    fase: "Fase D",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Keluarga Awal Kehidupan & Peta Sosio-Geografi", "Bab 2: Keberagaman Lingkungan Sekitar & Interaksi Sosial", "Bab 3: Potensi Ekonomi Lingkungan & Perdagangan Inklusif", "Bab 4: Pemberdayaan Masyarakat & Pembangunan Berkelanjutan"],
    description: "Buku IPS terpadu memadukan wawasan sejarah nusantara, geografi keruangan, sosiologi, dan ekonomi.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-smp-5",
    title: "Buku Siswa Informatika SMP Kelas 7-9 Kurikulum Merdeka",
    mapel: "Informatika",
    jenjang: "SMP",
    kelas: "7-9 (Fase D)",
    fase: "Fase D",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Informatika dan Keterampilan Generik", "Bab 2: Berpikir Komputasional (Algoritma, Pattern)", "Bab 3: Teknologi Informasi dan Komunikasi (Pengolah Kata & Lembar Kerja)", "Bab 4: Sistem Komputer & Jaringan Komputer", "Bab 5: Pemrograman Visual Block / Python Dasar"],
    description: "Buku Informatika SMP melatih pemikiran komputasional, jaringan internet, dan logika algoritma pemrograman.",
    link: "https://buku.kemendikdasmen.go.id/"
  },

  // SMA
  {
    id: "b-sma-1",
    title: "Buku Siswa Biologi SMA Kelas 10 & 11 Kurikulum Merdeka",
    mapel: "Biologi",
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    fase: "Fase E-F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Keanekaragaman Hayati dan Klasifikasinya", "Bab 2: Virus dan Peranannya dalam Kehidupan", "Bab 3: Inovasi Teknologi Biologi & Bioteknologi", "Bab 4: Ekosistem dan Pelestarian Lingkungan", "Bab 5: Struktur Sel, Transpor Membran & Metabolisme"],
    description: "Buku teks Biologi Kemendikdasmen membahas virologi, biodiversitas Indonesia, ekologi, dan inovasi bioteknologi.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-sma-2",
    title: "Buku Siswa Fisika SMA Kelas 10 & 11 Kurikulum Merdeka",
    mapel: "Fisika",
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    fase: "Fase E-F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Pengukuran dalam Kerja Ilmiah & Ketidakpastian", "Bab 2: Pemanasan Global dan Perubahan Iklim", "Bab 3: Energi Terbarukan & Efisiensi Energi", "Bab 4: Vektor & Kinematika Gerak Lurus/Parabola", "Bab 5: Dinamika Gerak Newton & Usaha Energi"],
    description: "Buku Fisika SMA memadukan prinsip pengukuran ilmiah, isu energi terbarukan, dan hukum mekanika kuantitatif.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-sma-3",
    title: "Buku Siswa Kimia SMA Kelas 10 & 11 Kurikulum Merdeka",
    mapel: "Kimia",
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    fase: "Fase E-F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Struktur Atom dan Sistem Periodik Unsur", "Bab 2: Tata Nama Senyawa dan Persamaan Reaksi", "Bab 3: Hukum Dasar Kimia dan Stoikiometri", "Bab 4: Ikatan Kimia & Bentuk Molekul", "Bab 5: Termokimia & Laju Reaksi"],
    description: "Buku Kimia SMA mempelajari teori atom modern, stoikiometri perhitungan kimia, dan reaksi kimia hijau.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-sma-4",
    title: "Buku Siswa Ekonomi SMA Kelas 10 & 11 Kurikulum Merdeka",
    mapel: "Ekonomi",
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    fase: "Fase E-F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Konsep Ilmu Ekonomi & Kelangkaan", "Bab 2: Skala Prioritas dan Kebutuhan Manusia", "Bab 3: Lembaga Jasa Keuangan & OJK", "Bab 4: Keseimbangan Pasar & Struktur Pasar", "Bab 5: Pendapatan Nasional & Pertumbuhan Ekonomi"],
    description: "Buku Ekonomi SMA tentang manajemen keuangan pribadi, mekanisme pasar, dan analisis ekonomi nasional.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-sma-5",
    title: "Buku Siswa Matematika Utama & Tingkat Lanjut SMA Kelas 10-12",
    mapel: "Matematika",
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    fase: "Fase E-F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Eksponen dan Logaritma", "Bab 2: Vektor dan Operasinya", "Bab 3: Trigonometri Analitika", "Bab 4: Matriks & Sistem Persamaan Linear", "Bab 5: Polinomial & Kalkulus Diferensial/Integral"],
    description: "Buku Matematika SMA melatih penalaran aljabar, geometri analitis, dan kalkulus diferensial.",
    link: "https://buku.kemendikdasmen.go.id/"
  },

  // SMK
  {
    id: "b-smk-1",
    title: "Buku Panduan Guru Projek IPAS SMK Kelas 10",
    mapel: "Projek IPAS (Ilmu Pengetahuan Alam dan Sosial SMK)",
    jenjang: "SMK",
    kelas: "10 (Fase E)",
    fase: "Fase E",
    type: "Buku Panduan Guru",
    babList: ["Bab 1: Makhluk Hidup dan Lingkungannya dalam Dunia Kerja", "Bab 2: Zat dan Perubahannya dalam Industri", "Bab 3: Energi dan Perubahannya", "Bab 4: Bumi dan Antariksa", "Bab 5: Interaksi Sosial & Dinamika Ekonomi Kerja"],
    description: "Buku Projek IPAS kontekstual industri vokasi untuk mengasah pemikiran saintifik terapan para siswa SMK.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-smk-2",
    title: "Buku Siswa & Guru Dasar-Dasar Rekayasa Perangkat Lunak (RPL) SMK Kelas 10",
    mapel: "Dasar-Dasar Rekayasa Perangkat Lunak (RPL)",
    jenjang: "SMK",
    kelas: "10 (Fase E)",
    fase: "Fase E",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Proses Bisnis Industri Software & Agile Development", "Bab 2: Perkembangan Teknologi RPL & K3LH Industri", "Bab 3: Pemrograman Dasar, Algoritma & PBO", "Bab 4: Desain Basis Data Relational & SQL"],
    description: "Buku dasar keahlian RPL mencakup rekayasa kebutuhan software, pemrograman berorientasi objek, dan basis data.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-smk-3",
    title: "Buku Siswa & Guru Dasar-Dasar Teknik Komputer & Jaringan (TKJ) SMK Kelas 10",
    mapel: "Dasar-Dasar Teknik Komputer dan Jaringan (TKJ)",
    jenjang: "SMK",
    kelas: "10 (Fase E)",
    fase: "Fase E",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Proses Bisnis Teknik Komputer & Telekomunikasi", "Bab 2: K3LH dan Budaya Kerja Industri Network", "Bab 3: Peranti Keras Komputer, Assembly & OS", "Bab 4: Konfigurasi Jaringan Lokal (LAN) & Topologi"],
    description: "Buku dasar keahlian TKJ mencakup arsitektur komputer, perakitan, OS Linux/Windows, dan infrastruktur LAN.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-smk-4",
    title: "Buku Siswa & Guru Dasar-Dasar Otomotif (TKR/TSM) SMK Kelas 10",
    mapel: "Dasar-Dasar Teknik Otomotif",
    jenjang: "SMK",
    kelas: "10 (Fase E)",
    fase: "Fase E",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Proses Bisnis Otomotif & Layanan Purna Jual", "Bab 2: Perkembangan Teknologi Otomotif & Kendaraan Listrik (EV)", "Bab 3: Gambar Teknik & Alat Ukur Presisi Otomotif", "Bab 4: Pemeliharaan Komponen Mesin 2T/4T & Injeksi"],
    description: "Buku keahlian otomotif memuat teknologi mesin, sistem kelistrikan, sasis, dan pengenalan kendaraan listrik.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-smk-5",
    title: "Buku Siswa & Guru Dasar-Dasar Akuntansi & Keuangan Lembaga (AKL) SMK Kelas 10",
    mapel: "Dasar-Dasar Akuntansi & Keuangan Lembaga (AKL)",
    jenjang: "SMK",
    kelas: "10 (Fase E)",
    fase: "Fase E",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Proses Bisnis Bidang Akuntansi & Industri Perbankan", "Bab 2: Komputer Akuntansi & Aplikasi Keuangan Digital", "Bab 3: Etika Profesi & Pengolahan Dokumen Transaksi", "Bab 4: Siklus Akuntansi Perusahaan Jasa dan Dagang"],
    description: "Buku dasar AKL mencakup prinsip pembukuan berpasangan, siklus akuntansi, dan pengenalan software Accurate/MYOB.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-smk-6",
    title: "Buku Siswa & Guru Konsentrasi Keahlian Kejuruan SMK Kelas 11 & 12 (Fase F)",
    mapel: "Konsentrasi Keahlian RPL (Pemrograman Web, Mobile & PBO)",
    jenjang: "SMK",
    kelas: "11-12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Bab 1: Pemrograman Web Lanjut (Frontend/Backend REST API)", "Bab 2: Pemrograman Aplikasi Mobile (Android/iOS)", "Bab 3: Administrasi Server & Keamanan Siber Industri"],
    description: "Buku panduan pembelajaran kompetensi keahlian kejuruan tingkat lanjut untuk Kelas 11 & 12 SMK.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-smk-7",
    title: "Buku Panduan Guru Projek Kreatif dan Kewirausahaan (PKK SMK)",
    mapel: "Projek Kreatif dan Kewirausahaan (PKK SMK)",
    jenjang: "SMK",
    kelas: "11-12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Bab 1: Perencanaan Produk & Analisis Peluang Usaha Vokasi", "Bab 2: Pembuatan Prototipe Produk Keahlian", "Bab 3: Pemasaran Digital, Toko Online & HAKI", "Bab 4: Pengelolaan Keuangan & Laporan Business Plan"],
    description: "Buku panduan perancangan wirausaha kreatif berbasis kompetensi keahlian dan karya inovatif produk SMK.",
    link: "https://buku.kemendikdasmen.go.id/"
  },
  {
    id: "b-smk-8",
    title: "Buku Panduan Guru Praktik Kerja Lapangan (PKL SMK)",
    mapel: "Praktik Kerja Lapangan (PKL SMK)",
    jenjang: "SMK",
    kelas: "11-12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Bab 1: Orientasi Budaya Kerja & K3LH Dunia Usaha/Dunia Industri (DUDI)", "Bab 2: Jurnal Harian & Pelaksanaan Magang Industri", "Bab 3: Penyusunan Laporan PKL & Evaluasi Kinerja DUDI"],
    description: "Pedoman pelaksanaan, pendampingan, dan penilaian Praktik Kerja Lapangan (PKL) terintegrasi dengan mitra industri.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },

  // UMUM / SMA / SMP / SD TAMBAHAN KATALOG
  {
    id: "b-sma-6",
    title: "Buku Siswa Bahasa Inggris: Work in Progress SMA/SMK Kelas 10",
    mapel: "Bahasa Inggris",
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    fase: "Fase E",
    type: "Buku Siswa Utama",
    babList: ["Chapter 1: Great Athletes (Descriptive Text)", "Chapter 2: Expository Text: Financial Literacy", "Chapter 3: Sports and Health (Procedure Text)", "Chapter 4: Healthy Foods & Narrative Text"],
    description: "Buku Bahasa Inggris Kurikulum Merdeka Kemendikdasmen berkonteks komunikasi internasional dan literasi abad 21.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-7",
    title: "Buku Siswa Pendidikan Pancasila SMA/SMK Kelas 10 & 11",
    mapel: "Pendidikan Pancasila",
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    fase: "Fase E-F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Pancasila sebagai Pemersatu Bangsa", "Bab 2: Membangun Budaya Taat Hukum & UUD 1945", "Bab 3: Mengelola Kebinekaan dan Harmoni Sosial", "Bab 4: Kedaulatan Negara Kesatuan Republik Indonesia"],
    description: "Buku teks utama Kemendikdasmen penguatan karakter kewarganegaraan, konstitusi, dan falsafah Pancasila.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-8",
    title: "Buku Siswa Sejarah SMA Kelas 10 & 11 Kurikulum Merdeka",
    mapel: "Sejarah",
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    fase: "Fase E-F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Pengantar Ilmu Sejarah & Metodologi Historiografi", "Bab 2: Penelitian Sejarah & Sumber Sejarah Lisan/Tertulis", "Bab 3: Kerajaan Hindu-Buddha & Islam di Nusantara", "Bab 4: Pergerakan Nasional & Kemerdekaan Indonesia"],
    description: "Buku Sejarah Kurikulum Merdeka melatih berpikir sinkronis, diakronis, dan analisis kritis peristilahan sejarah.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-9",
    title: "Buku Siswa Sosiologi SMA Kelas 11 Kurikulum Merdeka",
    mapel: "Sosiologi",
    jenjang: "SMA",
    kelas: "11 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Kelompok Sosial di Masyarakat", "Bab 2: Permasalahan Sosial Akibat Pengelompokan Sosial", "Bab 3: Konflik Sosial dan Resolusi Konflik", "Bab 4: Membangun Harmoni Sosial & Inklusi"],
    description: "Buku Sosiologi SMA mendalami struktur sosial, dinamika konflik, dan resolusi berbasis kearifan lokal.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-10",
    title: "Buku Siswa Geografi SMA Kelas 11 Kurikulum Merdeka",
    mapel: "Geografi",
    jenjang: "SMA",
    kelas: "11 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Posisi Strategis Indonesia & Potensi Sumber Daya Alam", "Bab 2: Keanekaragaman Hayati (Flora & Fauna)", "Bab 3: Lingkungan Hidup dan Kependudukan", "Bab 4: Mitigasi dan Adaptasi Bencana Alam"],
    description: "Buku Geografi SMA mengkaji aspek spasial keruangan, kebencanaan, dan pengelolaan lingkungan hidup.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-smp-6",
    title: "Buku Siswa English for Nusantara SMP Kelas 7 & 8",
    mapel: "Bahasa Inggris",
    jenjang: "SMP",
    kelas: "7-9 (Fase D)",
    fase: "Fase D",
    type: "Buku Siswa Utama",
    babList: ["Chapter 1: About Me (Introducing Oneself & Hobbies)", "Chapter 2: Culinary and Me (Describing Foods & Recipes)", "Chapter 3: Home Sweet Home (Rooms & Household Activities)", "Chapter 4: My School Activities & Digital Literacy"],
    description: "Buku teks Bahasa Inggris SMP berkonteks budaya lokal Indonesia dan komunikasi kontekstual peserta didik.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-smp-7",
    title: "Buku Siswa Pendidikan Agama Islam dan Budi Pekerti SMP Kelas 7-9",
    mapel: "Pendidikan Agama Islam dan Budi Pekerti",
    jenjang: "SMP",
    kelas: "7-9 (Fase D)",
    fase: "Fase D",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Al-Qur'an dan Hadis Pembimbing Kehidupan", "Bab 2: Meneladani Asmaul Husna dalam Kehidupan", "Bab 3: Hakikat Shalat dan Zikir dalam Menjaga Ketenteraman", "Bab 4: Sejarah Peradaban Islam Nusantara"],
    description: "Buku PAI SMP untuk pembentukan akhlak mulia, pemahaman Al-Qur'an/Hadis, dan wawasan Islam moderat.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sd-8",
    title: "Buku Siswa PJOK (Pendidikan Jasmani Olahraga Kesehatan) SD Kelas 1-6",
    mapel: "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
    jenjang: "SD",
    kelas: "3-4 (Fase B)",
    fase: "Fase A-C",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Variasi Pola Gerak Dasar Lokomotor & Non-Lokomotor", "Bab 2: Keterampilan Olahraga Permainan Bola Besar & Kecil", "Bab 3: Kebugaran Jasmani & Senam Lantai", "Bab 4: Pola Hidup Bersih, Sehat & Gizi Seimbang"],
    description: "Buku panduan PJOK SD untuk mengembangkan kesegaran jasmani, koordinasi motorik, dan kebiasaan hidup sehat.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  // KELAS XII SMA PILIHAN / ELECTIVE TEXTBOOKS INTEGRATION (buku.kemendikdasmen.go.id)
  {
    id: "b-sma-12-bio",
    title: "Buku Siswa Biologi SMA Kelas XII (Pilihan)",
    mapel: "Biologi",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Pertumbuhan dan Perkembangan", "Bab 2: Metabolisme Sel & Enzim", "Bab 3: Materi Genetik dan Sintesis Protein", "Bab 4: Pembelahan Sel (Mitosis & Meiosis)", "Bab 5: Pola Pewarisan Sifat Mendel", "Bab 6: Hereditas Manusia & Mutasi", "Bab 7: Teori Evolusi", "Bab 8: Bioteknologi Modern"],
    description: "Buku teks utama Biologi Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-fis",
    title: "Buku Siswa Fisika SMA Kelas XII (Pilihan)",
    mapel: "Fisika",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Listrik Arus Searah (DC)", "Bab 2: Listrik Statis & Kapasitor", "Bab 3: Kemagnetan & Gaya Lorentz", "Bab 4: Induksi Elektromagnetik & Faraday", "Bab 5: Listrik Arus Bolak-Balik (AC)", "Bab 6: Radiasi Gelombang Elektromagnetik", "Bab 7: Teori Relativitas Khusus", "Bab 8: Fisika Kuantum & Radioaktivitas"],
    description: "Buku teks utama Fisika Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-kim",
    title: "Buku Siswa Kimia SMA Kelas XII (Pilihan)",
    mapel: "Kimia",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Sifat Koligatif Larutan", "Bab 2: Penyetaraan Redoks & Sel Elektrokimia", "Bab 3: Kimia Unsur Golongan Utama & Transisi", "Bab 4: Senyawa Turunan Alkana", "Bab 5: Benzena dan Turunannya", "Bab 6: Polimer & Makromolekul Organik"],
    description: "Buku teks utama Kimia Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-sos",
    title: "Buku Siswa Sosiologi SMA Kelas XII (Pilihan)",
    mapel: "Sosiologi",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Perubahan Sosial di Tengah Modernisasi", "Bab 2: Globalisasi dan Transformasi Sosial Budaya", "Bab 3: Ketimpangan Sosial di Era Global", "Bab 4: Kearifan Lokal & Pemberdayaan Komunitas", "Bab 5: Proyek Aksi Sosial Partisipatif"],
    description: "Buku teks utama Sosiologi Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-geo",
    title: "Buku Siswa Geografi SMA Kelas XII (Pilihan)",
    mapel: "Geografi",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Pengembangan Wilayah, Tata Ruang & Pusat Pertumbuhan", "Bab 2: Interaksi Keruangan Desa dan Kota", "Bab 3: Peta & SIG untuk Perencanaan Wilayah", "Bab 4: Dinamika Kerjasama Negara Maju dan Berkembang"],
    description: "Buku teks utama Geografi Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-eko",
    title: "Buku Siswa Ekonomi SMA Kelas XII (Pilihan)",
    mapel: "Ekonomi",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Perdagangan Internasional & Devisa", "Bab 2: Kerja Sama Ekonomi Internasional", "Bab 3: Persamaan Dasar Akuntansi & Bukti Transaksi", "Bab 4: Siklus Akuntansi Perusahaan Jasa", "Bab 5: Siklus Akuntansi Perusahaan Dagang"],
    description: "Buku teks utama Ekonomi Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-inf",
    title: "Buku Siswa Informatika SMA Kelas XII (Pilihan)",
    mapel: "Informatika",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Kompleksitas Algoritma & Notasi Big-O", "Bab 2: Desain Aplikasi Web & Mobile", "Bab 3: Keamanan Informasi & Kriptografi", "Bab 4: Cloud Computing & Internet of Things (IoT)", "Bab 5: Praktik Lintas Bidang (Capstone Project)"],
    description: "Buku teks utama Informatika Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-matlan",
    title: "Buku Siswa Matematika Tingkat Lanjut SMA Kelas XII (Pilihan)",
    mapel: "Matematika Tingkat Lanjut",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Geometri Dimensi Tiga (Jarak & Sudut)", "Bab 2: Polinomial Tingkat Lanjut", "Bab 3: Limit Fungsi Trigonometri & Tak Hingga", "Bab 4: Turunan Fungsi Trigonometri & Sifatnya", "Bab 5: Aplikasi Turunan & Integral Fungsi Trigonometri"],
    description: "Buku teks utama Matematika Tingkat Lanjut Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-ant",
    title: "Buku Siswa Antropologi SMA Kelas XII (Pilihan)",
    mapel: "Antropologi",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Antropologi Terapan dalam Pembangunan", "Bab 2: Globalisasi & Respon Masyarakat Adat", "Bab 3: Pelestarian Warisan Budaya Takbenda Nusantara", "Bab 4: Penelitian Mini Etnografi Lapangan"],
    description: "Buku teks utama Antropologi Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-indo",
    title: "Buku Siswa Cerdas Cergas Berbahasa dan Bersastra Indonesia SMA Kelas XII",
    mapel: "Bahasa Indonesia",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Mengapresiasi Karya Sastra Indonesia", "Bab 2: Mengonstruksi Kritik Sastra dan Esai", "Bab 3: Memahami Isu Terkini Melalui Artikel", "Bab 4: Menyajikan Gagasan dalam Resensi Buku"],
    description: "Buku utama Bahasa Indonesia untuk melatih keterampilan berbahasa, apresiasi sastra, kritik sastra, dan penulisan artikel ilmiah.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-ing",
    title: "Buku Siswa Bahasa Inggris: Life Today SMA Kelas XII",
    mapel: "Bahasa Inggris",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Unit 1: Social Media and Digital Literacy", "Unit 2: Environmental Awareness and Green Living", "Unit 3: Financial Literacy for Youth", "Unit 4: Careers and Global Citizenship"],
    description: "Buku utama Bahasa Inggris SMA Kelas 12 Kurikulum Merdeka untuk membekali kecakapan literasi digital, isu lingkungan, dan finansial global.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-mat",
    title: "Buku Siswa Matematika SMA Kelas XII (Umum)",
    mapel: "Matematika (Umum)",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Geometri Ruang & Diagonal", "Bab 2: Statistika Deskriptif, Penyebaran & Distribusi Data", "Bab 3: Peluang Kejadian Majemuk & Saling Bebas"],
    description: "Buku teks utama Matematika Kelas 12 SMA Umum Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-sej",
    title: "Buku Siswa Sejarah SMA Kelas XII",
    mapel: "Sejarah",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Perjuangan Mempertahankan Kemerdekaan (1945-1950)", "Bab 2: Demokrasi Liberal dan Demokrasi Terpimpin", "Bab 3: Indonesia Masa Orde Baru hingga Reformasi", "Bab 4: Peran Indonesia di Panggung Politik Internasional"],
    description: "Buku teks sejarah nasional dan dunia kelas 12 untuk melatih kesadaran sejarah dan berpikir diakronik.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-pan",
    title: "Buku Siswa Pendidikan Pancasila SMA Kelas XII",
    mapel: "Pendidikan Pancasila",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Ber-Pancasila dalam Kehidupan Global", "Bab 2: Penegakan Hukum & Perlindungan Hak Asasi Manusia", "Bab 3: Kebinekaan Bangsa & Upaya Meminimalisir Konflik", "Bab 4: Dinamika Kehidupan Bernegara Berdasarkan UUD 1945"],
    description: "Buku utama Pendidikan Pancasila kelas XII SMA untuk memantapkan pemahaman konstitusi, toleransi global, dan penegakan HAM.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-pai",
    title: "Buku Siswa Pendidikan Agama Islam dan Budi Pekerti SMA Kelas XII",
    mapel: "Pendidikan Agama dan Budi Pekerti",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Sabar dalam Menghadapi Musibah & Ujian", "Bab 2: Indahnya Hidup Sehat Melalui Makanan Halal & Thayyib", "Bab 3: Berpikir Kritis & Demokratis Berlandaskan Agama", "Bab 4: Sejarah Kejayaan & Kemunduran Peradaban Islam Sedunia"],
    description: "Buku utama PAI & Budi Pekerti kelas XII SMA untuk membina kepribadian luhur, toleransi beragama, dan berpikir ilmiah.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-inglan",
    title: "Buku Siswa Bahasa Inggris Tingkat Lanjut SMA Kelas XII (Pilihan)",
    mapel: "Bahasa Inggris Tingkat Lanjut",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Unit 1: Exploring Creative Narratives", "Unit 2: Critical Reading and Argumentation", "Unit 3: Persuasive Public Speaking", "Unit 4: Writing Academic Reports and Surveys"],
    description: "Buku teks utama Bahasa Inggris Tingkat Lanjut Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-pkwu",
    title: "Buku Siswa Prakarya dan Kewirausahaan: Kerajinan SMA Kelas XII",
    mapel: "Prakarya dan Kewirausahaan (PKWu)",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Wirausaha Produk Kerajinan untuk Pasar Lokal", "Bab 2: Desain & Proses Produksi Kerajinan Fungsional", "Bab 3: Perhitungan Biaya Produksi & Harga Jual", "Bab 4: Strategi Promosi Online & Pameran Produk"],
    description: "Buku teks utama Prakarya dan Kewirausahaan (PKWu) Bidang Kerajinan Kelas 12 SMA Kurikulum Merdeka.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-sejlan",
    title: "Buku Siswa Sejarah Tingkat Lanjut SMA Kelas XII (Pilihan)",
    mapel: "Sejarah",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Dunia Internasional Pasca Perang Dunia II", "Bab 2: Perang Dingin & Blokade Politik Ideologi Dunia", "Bab 3: Dekolonisasi di Asia & Afrika", "Bab 4: Kerjasama Global & Organisasi Internasional", "Bab 5: Isu Kontemporer Global di Abad ke-21"],
    description: "Buku teks utama Sejarah Tingkat Lanjut Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-senirupa",
    title: "Buku Panduan Guru Seni Rupa SMA Kelas XII (Pilihan)",
    mapel: "Seni Budaya",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Apresiasi Karya Seni Rupa Kontemporer", "Eksperimentasi Medium dan Teknik Seni Rupa", "Pembuatan Karya Seni Rupa Dua dan Tiga Dimensi Mandiri", "Manajemen Pameran Seni Rupa di Lingkungan Sekolah"],
    description: "Buku Panduan Guru Seni Rupa Kelas 12 SMA Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-senimusik",
    title: "Buku Panduan Guru Seni Musik SMA Kelas XII (Pilihan)",
    mapel: "Seni Budaya",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Bab 1: Eksplorasi Genre Musik & Bunyi", "Bab 2: Kreativitas Aransemen Musik Sederhana", "Bab 3: Manajemen Pertunjukan Musik Sekolah", "Bab 4: Refleksi & Apresiasi Karya Musik Nusantara"],
    description: "Buku Panduan Guru Seni Musik Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-senitari",
    title: "Buku Panduan Guru Seni Tari SMA Kelas XII (Pilihan)",
    mapel: "Seni Budaya",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Bab 1: Komposisi Tari Kontemporer Nusantara", "Bab 2: Manajemen Produksi Karya Seni Tari", "Bab 3: Evaluasi & Kritik Karya Seni Tari", "Bab 4: Pagelaran Seni Tari Kolaboratif"],
    description: "Buku Panduan Guru Seni Tari Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-seniteater",
    title: "Buku Panduan Guru Seni Teater SMA Kelas XII (Pilihan)",
    mapel: "Seni Budaya",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Bab 1: Eksplorasi Teater Modern & Kontemporer", "Bab 2: Penulisan Naskah Lakon Kreatif", "Bab 3: Keaktoran & Sutradara", "Bab 4: Produksi & Pementasan Karya Teater"],
    description: "Buku Panduan Guru Seni Teater Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-sastraint",
    title: "Buku Siswa Bahasa dan Sastra Indonesia SMA Kelas XII (Pilihan)",
    mapel: "Bahasa Indonesia",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Kajian Sastra Melayu Klasik & Hikayat", "Bab 2: Membedah Aliran Sastra Indonesia Modern", "Bab 3: Apresiasi Estetika Puisi & Prosa Kontemporer", "Bab 4: Kritik Sastra & Kajian Stilistika Karya Mandiri"],
    description: "Buku teks utama mata pelajaran pilihan Bahasa dan Sastra Indonesia Kelas 12 SMA Kurikulum Merdeka.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-pakristen",
    title: "Buku Siswa Pendidikan Agama Kristen dan Budi Pekerti SMA Kelas XII",
    mapel: "Pendidikan Agama dan Budi Pekerti",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Gereja dan Pembaharuan Kehidupan Masyarakat", "Bab 2: Mewujudkan Keadilan, Perdamaian & Demokrasi", "Bab 3: Menghadapi Gaya Hidup Modern & Budaya Instan", "Bab 4: Keterlibatan Aktif dalam Pelayanan Sosial"],
    description: "Buku teks Pendidikan Agama Kristen Kelas XII SMA Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-pakatolik",
    title: "Buku Siswa Pendidikan Agama Katolik dan Budi Pekerti SMA Kelas XII",
    mapel: "Pendidikan Agama dan Budi Pekerti",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Panggilan Hidup Berkeluarga & Membiara", "Bab 2: Keterlibatan Umat Katolik dalam Masyarakat", "Bab 3: Memperjuangkan Keadilan, Keberagaman & Keutuhan Ciptaan", "Bab 4: Dialog Antarumat Beragama & Kerukunan Bangsa"],
    description: "Buku teks Pendidikan Agama Katolik Kelas XII SMA Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-gahindu",
    title: "Buku Siswa Pendidikan Agama Hindu dan Budi Pekerti SMA Kelas XII",
    mapel: "Pendidikan Agama dan Budi Pekerti",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Filsafat Moksa dalam Hindu", "Bab 2: Penerapan Tri Hita Karana di Era Modern", "Bab 3: Kajian Upakara & Upacara Yadnya", "Bab 4: Pemimpin Ideal Berlandaskan Astabrata"],
    description: "Buku teks Pendidikan Agama Hindu Kelas XII SMA Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-pabuddha",
    title: "Buku Siswa Pendidikan Agama Buddha dan Budi Pekerti SMA Kelas XII",
    mapel: "Pendidikan Agama dan Budi Pekerti",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Penerapan Hukum Karma & Rebirth", "Bab 2: Meditasi Vipassana & Ketenangan Batin", "Bab 3: Menjaga Etika Sosial & Konservasi Lingkungan", "Bab 4: Peran Umat Buddha dalam Perdamaian Dunia"],
    description: "Buku teks Pendidikan Agama Buddha Kelas XII SMA Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-pakhonghucu",
    title: "Buku Siswa Pendidikan Agama Khonghucu dan Budi Pekerti SMA Kelas XII",
    mapel: "Pendidikan Agama dan Budi Pekerti",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Ajaran Kebajikan & Moralitas Junzi", "Bab 2: Bakti (Xiao) terhadap Orang Tua & Leluhur", "Bab 3: Membangun Harmoni dalam Kebinekaan Nasional", "Bab 4: Ritual Keagamaan & Pemantapan Iman Tian"],
    description: "Buku teks Pendidikan Agama Khonghucu Kelas XII SMA Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  // KELAS XII SMA MATA PELAJARAN PILIHAN & PANDUAN GURU RESMI (LENGKAP)
  {
    id: "b-sma-12-pkwu-rek",
    title: "Buku Siswa Prakarya dan Kewirausahaan: Rekayasa SMA Kelas XII (Pilihan)",
    mapel: "Prakarya dan Kewirausahaan (PKWu)",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Wirausaha Produk Rekayasa Teknologi Terapan", "Bab 2: Desain Sistem Kontrol Otomatis & IoT Sederhana", "Bab 3: Pembuatan Alat Konversi Energi Ramah Lingkungan", "Bab 4: Perhitungan Kelayakan Usaha & Pemasaran Digital"],
    description: "Buku teks utama PKWu Bidang Rekayasa Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-pkwu-bud",
    title: "Buku Siswa Prakarya dan Kewirausahaan: Budidaya SMA Kelas XII (Pilihan)",
    mapel: "Prakarya dan Kewirausahaan (PKWu)",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Perencanaan Usaha Budidaya Ternak Unggas/Ikan Konsumsi", "Bab 2: Teknik Pemeliharaan & Manajemen Pakan Berkelanjutan", "Bab 3: Penanganan Pasca Panen & Rantai Pasok", "Bab 4: Analisis Titik Impas (BEP) dan Pemasaran Agrobisnis"],
    description: "Buku teks utama PKWu Bidang Budidaya Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-pkwu-olh",
    title: "Buku Siswa Prakarya dan Kewirausahaan: Pengolahan SMA Kelas XII (Pilihan)",
    mapel: "Prakarya dan Kewirausahaan (PKWu)",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Wirausaha Pengolahan Makanan Khas Daerah yang Dimodifikasi", "Bab 2: Teknologi Pengemasan & Pengawetan Alami Modern", "Bab 3: Pengendalian Mutu & Standar Keamanan Pangan (HACCP)", "Bab 4: Strategi Branding & Penjualan Omnichannel"],
    description: "Buku teks utama PKWu Bidang Pengolahan Kelas 12 SMA Pilihan Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-pjok",
    title: "Buku Siswa Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK) SMA Kelas XII",
    mapel: "PJOK",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Bab 1: Taktik & Strategi Permainan Invasi (Sepakbola & Bola Basket)", "Bab 2: Strategi Permainan Net & Lapangan (Bulutangkis & Tenis)", "Bab 3: Program Peningkatan Kebugaran Jasmani Mandiri Berkelanjutan", "Bab 4: Pola Hidup Sehat, Pencegahan Penyakit Degeneratif & Manajemen Stres"],
    description: "Buku teks utama PJOK Kelas 12 SMA Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-fra",
    title: "Buku Siswa Bahasa Prancis SMA Kelas XII (Pilihan)",
    mapel: "Bahasa Prancis",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Unité 1: Les Projets d'Avenir et les Métiers", "Unité 2: La Culture, la Mode et la Gastronomie Francophone", "Unité 3: L'Environnement et le Développement Durable", "Unité 4: Expression d'Opinions et Débats Contemporains"],
    description: "Buku teks utama Bahasa Prancis Tingkat Lanjut Kelas 12 SMA Pilihan Kurikulum Merdeka.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-ger",
    title: "Buku Siswa Bahasa Jerman SMA Kelas XII (Pilihan)",
    mapel: "Bahasa Jerman",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Einheit 1: Ausbildung, Studium und Berufswahl in Deutschland", "Einheit 2: Wissenschaft, Technik und Zukunftsvisionen", "Einheit 3: Umwelt, Nachhaltigkeit und Energiekrise", "Einheit 4: Deutsche Kultur, Medien und Literatur"],
    description: "Buku teks utama Bahasa Jerman Tingkat Lanjut Kelas 12 SMA Pilihan Kurikulum Merdeka.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-jpn",
    title: "Buku Siswa Bahasa Jepang SMA Kelas XII (Pilihan)",
    mapel: "Bahasa Jepang",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Dai 1 Ka: Shousha to Nihon no Hatarakikata (Dunia Kerja & Karier)", "Dai 2 Ka: Gendai Shakai to Kankyou Mondai (Masyarakat Modern & Lingkungan)", "Dai 3 Ka: Nihon no Bunka, Anime to Dentou Geinou (Budaya & Seni Tradisional)", "Dai 4 Ka: Nihongo no Intabyuu to Supiichi (Wawancara & Pidato Bahasa Jepang)"],
    description: "Buku teks utama Bahasa Jepang Tingkat Lanjut Kelas 12 SMA Pilihan Kurikulum Merdeka.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-arb",
    title: "Buku Siswa Bahasa Arab SMA Kelas XII (Pilihan)",
    mapel: "Bahasa Arab",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Ad-Dars 1: Al-Hadharah Al-Islamiyyah wal Ulum Al-Haditsah (Peradaban & Sains)", "Ad-Dars 2: Al-Alamu wal Mustaqbal Al-Mihani (Dunia Kerja & Profesi)", "Ad-Dars 3: Qadhaya Al-Bi'ah wal Muhafazhatu Alaiha (Kelestarian Lingkungan)", "Ad-Dars 4: Qira'ah wa Tahlil An-Nushus Al-Adabiyyah (Kajian Teks Sastra Arab)"],
    description: "Buku teks utama Bahasa Arab Tingkat Lanjut Kelas 12 SMA Pilihan Kurikulum Merdeka.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-chn",
    title: "Buku Siswa Bahasa Mandarin SMA Kelas XII (Pilihan)",
    mapel: "Bahasa Mandarin",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["Di 1 Ke: Wei Lai Zhi Ye Yu Meng Xiang (Rencana Karier Masa Depan)", "Di 2 Ke: Ke Ji Chuang Xin Yu Sheng Huo Bian Ge (Inovasi Teknologi)", "Di 3 Ke: Zhong Hua Wen Hua Yu Chuan Tong Jie Ri (Budaya & Festival Tradisional)", "Di 4 Ke: Guo Ji Jiao Liu Yu Shang Wu Han Yu (Komunikasi Bisnis Internasional)"],
    description: "Buku teks utama Bahasa Mandarin Tingkat Lanjut Kelas 12 SMA Pilihan Kurikulum Merdeka.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-kor",
    title: "Buku Siswa Bahasa Korea SMA Kelas XII (Pilihan)",
    mapel: "Bahasa Korea",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Siswa Utama",
    babList: ["1-Gwa: Jillo-wa Mirae Gyehoek (Rencana Masa Depan & Pendidikan Lanjutan)", "2-Gwa: Hanguk Munhwa-wa Gendai Sahwe (Budaya Korea Kontemporer & Media)", "3-Gwa: Hwan-gyeong Boho-wa Jiyuk Sahwe (Pelestarian Lingkungan)", "4-Gwa: Gong-shikjeok Daewha-wa 발표 (Percakapan Formal & Presentasi)"],
    description: "Buku teks utama Bahasa Korea Tingkat Lanjut Kelas 12 SMA Pilihan Kurikulum Merdeka.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  // BUKU PANDUAN GURU KELAS XII SMA KURIKULUM MERDEKA (OFFICIAL TEACHER GUIDES)
  {
    id: "b-sma-12-guru-bio",
    title: "Buku Panduan Guru Biologi SMA Kelas XII (Pilihan)",
    mapel: "Biologi",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Pembelajaran Diferensiasi Pertumbuhan & Enzim", "Strategi Praktikum Sintesis Protein & Pembelahan Sel", "Panduan Asesmen Hereditas, Mutasi & Evolusi", "Desain Proyek Bioteknologi Modern & Bioetika"],
    description: "Buku Panduan Guru resmi Biologi SMA Kelas 12 untuk merancang pembelajaran mendalam (deep learning) dan asesmen otentik.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-fis",
    title: "Buku Panduan Guru Fisika SMA Kelas XII (Pilihan)",
    mapel: "Fisika",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Desain Eksperimen Rangkaian DC & Medan Magnet", "Panduan Pembelajaran Elektromagnetik & Sirkuit AC", "Strategi Konseptual Teori Relativitas Khusus", "Panduan Pembelajaran Fisika Modern & Radioaktivitas"],
    description: "Buku Panduan Guru Fisika SMA Kelas 12 Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-kim",
    title: "Buku Panduan Guru Kimia SMA Kelas XII (Pilihan)",
    mapel: "Kimia",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Pembelajaran Sifat Koligatif Larutan & Sel Elektrokimia", "Strategi Penyelidikan Reaksi Redoks & Korosi", "Pedoman Pembelajaran Kimia Karbon & Gugus Fungsi", "Panduan Proyek Polimer, Biomolekul & Kimia Hijau"],
    description: "Buku Panduan Guru Kimia SMA Kelas 12 Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-sos",
    title: "Buku Panduan Guru Sosiologi SMA Kelas XII (Pilihan)",
    mapel: "Sosiologi",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Pembelajaran Perubahan Sosial & Globalisasi", "Strategi Riset Partisipatoris Mengkaji Ketimpangan Sosial", "Pedoman Pembimbingan Aksi Sosial & Pemberdayaan Komunitas Lokal", "Rubrik Asesmen Proyek Sosiologi Terapan"],
    description: "Buku Panduan Guru Sosiologi SMA Kelas 12 Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-geo",
    title: "Buku Panduan Guru Geografi SMA Kelas XII (Pilihan)",
    mapel: "Geografi",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Pedagogi Pengembangan Wilayah & Tata Ruang", "Metode Praktik Pemetaan Digital & Penginderaan Jauh (SIG)", "Strategi Analisis Interaksi Keruangan Desa-Kota", "Panduan Asesmen Proyek Kerja Sama Antarwilayah"],
    description: "Buku Panduan Guru Geografi SMA Kelas 12 Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-eko",
    title: "Buku Panduan Guru Ekonomi SMA Kelas XII (Pilihan)",
    mapel: "Ekonomi",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Pembelajaran Perdagangan Internasional & Valuta Asing", "Strategi Pengajaran Akuntansi Perusahaan Jasa & Dagang", "Panduan Asesmen Portofolio Penyusunan Laporan Keuangan", "Studi Kasus Kebijakan Fiskal & Moneter Global"],
    description: "Buku Panduan Guru Ekonomi SMA Kelas 12 Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-inf",
    title: "Buku Panduan Guru Informatika SMA Kelas XII (Pilihan)",
    mapel: "Informatika",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Pedagogi Analisis Algoritma Kompleks & Struktur Data", "Pedoman Praktik Pengembangan Aplikasi Web, Mobile & IoT", "Panduan Pembelajaran Etika Siber, Kriptografi & Keamanan Data", "Metode Evaluasi Capstone Project Kolaboratif"],
    description: "Buku Panduan Guru Informatika SMA Kelas 12 Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-matlan",
    title: "Buku Panduan Guru Matematika Tingkat Lanjut SMA Kelas XII (Pilihan)",
    mapel: "Matematika Tingkat Lanjut",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Pembelajaran Geometri Dimensi Tiga & Vektor Lanjut", "Strategi Pembelajaran Kalkulus Diferensial & Integral Trigonometri", "Pendekatan Problem Solving Polinomial Derajat Tinggi", "Rubrik Penilaian Pemodelan Matematika Sains & Teknik"],
    description: "Buku Panduan Guru Matematika Tingkat Lanjut SMA Kelas 12 Kurikulum Merdeka.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-ant",
    title: "Buku Panduan Guru Antropologi SMA Kelas XII (Pilihan)",
    mapel: "Antropologi",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Riset Mini Etnografi & Observasi Lapangan", "Strategi Pembelajaran Antropologi Terapan & Perubahan Sosial", "Pedoman Dokumentasi Warisan Budaya Takbenda", "Asesmen Portofolio Penulisan Laporan Etnografis"],
    description: "Buku Panduan Guru Antropologi SMA Kelas 12 Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-inglan",
    title: "Buku Panduan Guru Bahasa Inggris Tingkat Lanjut SMA Kelas XII (Pilihan)",
    mapel: "Bahasa Inggris Tingkat Lanjut",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Teacher's Guide to Academic Essay & Argumentative Writing", "Strategies for Socratic Seminars & Critical Debates", "Assessment Rubrics for Multimodal Presentations", "Differentiated Instruction for Advanced English Learners"],
    description: "Buku Panduan Guru Bahasa Inggris Tingkat Lanjut Kelas 12 SMA Pilihan Kurikulum Merdeka.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-sastraint",
    title: "Buku Panduan Guru Bahasa dan Sastra Indonesia SMA Kelas XII (Pilihan)",
    mapel: "Bahasa Indonesia",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Pedoman Pembelajaran Kritik Sastra & Esai Estetika", "Strategi Kajian Sastra Klasik, Pujangga Baru, & Kontemporer", "Panduan Penulisan Kreatif Puisi, Prosa, & Cerpen Mandiri", "Model Penilaian Autentik Apresiasi & Pementasan Sastra"],
    description: "Buku Panduan Guru Bahasa dan Sastra Indonesia SMA Kelas 12 Kurikulum Merdeka.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-mat",
    title: "Buku Panduan Guru Matematika SMA Kelas XII (Umum)",
    mapel: "Matematika (Umum)",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Pembelajaran Geometri Ruang Kontekstual", "Strategi Pembelajaran Statistika Inferensial & Uji Hipotesis Sederhana", "Desain Aktivitas Peluang Majemuk dalam Kehidupan Sehari-hari", "Pedoman Asesmen Diagnostik, Formatif & Sumatif Matematika"],
    description: "Buku Panduan Guru Matematika Umum SMA Kelas 12 Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-indo",
    title: "Buku Panduan Guru Bahasa Indonesia SMA Kelas XII",
    mapel: "Bahasa Indonesia",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Pedoman Pembelajaran Membaca Kritis Artikel Ilmiah Populer", "Panduan Menulis Surat Lamaran Pekerjaan & Riwayat Hidup Profesional", "Strategi Pengajaran Teks Editorial & Opini Media", "Panduan Asesmen Bedah Novel & Kritik Sastra"],
    description: "Buku Panduan Guru Cerdas Cergas Berbahasa Indonesia SMA Kelas 12 Kurikulum Merdeka.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-ing",
    title: "Buku Panduan Guru Bahasa Inggris: Life Today SMA Kelas XII",
    mapel: "Bahasa Inggris",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Instructional Guide for Digital Literacy & Media Texts", "Interactive Activities for Environmental Discourse", "Project-Based Learning on Youth Financial Literacy", "Assessment Protocols for Speaking, Reading, and Writing"],
    description: "Buku Panduan Guru Bahasa Inggris (Life Today) SMA Kelas 12 Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-sej",
    title: "Buku Panduan Guru Sejarah SMA Kelas XII",
    mapel: "Sejarah",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Berpikir Kritis Diakronik & Sinkronik Sejarah Kontemporer", "Strategi Pembelajaran Dinamika Politik & Ekonomi Pasca Kemerdekaan", "Penyusunan Proyek Riset Sejarah Lisan Lokal", "Pedoman Asesmen Pemahaman Konsep Sejarah & Analisis Sumber"],
    description: "Buku Panduan Guru Sejarah SMA Kelas 12 Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-pan",
    title: "Buku Panduan Guru Pendidikan Pancasila SMA Kelas XII",
    mapel: "Pendidikan Pancasila",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Strategi Pembelajaran Konstitusi & Praktik Berpancasila di Era Digital", "Panduan Diskusi Dilema Moral Penegakan HAM & Hukum", "Penyelenggaraan Proyek Gotong Royong Penguatan Kebinekaan", "Rubrik Observasi Profil Pelajar Pancasila Berkelanjutan"],
    description: "Buku Panduan Guru Pendidikan Pancasila SMA Kelas 12 Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-pai",
    title: "Buku Panduan Guru PAI dan Budi Pekerti SMA Kelas XII",
    mapel: "Pendidikan Agama dan Budi Pekerti",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Metode Pembiasaan Nilai Akhlak Mulia & Moderasi Beragama", "Pedoman Pembelajaran Fiqih Muamalah & Pernikahan Modern", "Kajian Kritis Sejarah Peradaban & Tokoh Islam Pembaharu", "Pedoman Asesmen Sikap Spiritual & Sosial"],
    description: "Buku Panduan Guru PAI dan Budi Pekerti SMA Kelas 12 Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-pjok",
    title: "Buku Panduan Guru PJOK SMA Kelas XII",
    mapel: "PJOK",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Pedoman Perancangan Taktik & Formasi Olahraga Permainan", "Panduan Pembuatan Program Latihan Kebugaran Jasmani Mandiri Siswa", "Panduan Pencegahan Cedera & Pertolongan Pertama (P3K)", "Rubrik Asesmen Kinerja Gerak & Perilaku Sportif"],
    description: "Buku Panduan Guru PJOK SMA Kelas 12 Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-pkwu-ker",
    title: "Buku Panduan Guru Prakarya dan Kewirausahaan: Kerajinan SMA Kelas XII",
    mapel: "Prakarya dan Kewirausahaan (PKWu)",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Pembelajaran Produk Kerajinan Pasar Global", "Desain Kurikulum Proyek Produksi Berkelanjutan", "Manajemen Expo / Bazar Kewirausahaan Sekolah", "Rubrik Penilaian Portofolio Bisnis Siswa"],
    description: "Buku Panduan Guru PKWu Kerajinan Kelas 12 SMA Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-pkwu-rek",
    title: "Buku Panduan Guru Prakarya dan Kewirausahaan: Rekayasa SMA Kelas XII",
    mapel: "Prakarya dan Kewirausahaan (PKWu)",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Proyek Rekayasa Alat Otomasi Sederhana", "Strategi Mentoring Riset Terapan & Prototyping", "Pedoman Evaluasi Kelayakan Produk & Hak Paten", "Asesmen Kolaborasi Tim Rekayasa"],
    description: "Buku Panduan Guru PKWu Rekayasa Kelas 12 SMA Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-pkwu-bud",
    title: "Buku Panduan Guru Prakarya dan Kewirausahaan: Budidaya SMA Kelas XII",
    mapel: "Prakarya dan Kewirausahaan (PKWu)",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Proyek Agribisnis & Budidaya Ramah Lingkungan", "Monitoring Siklus Pemeliharaan & Analisis Hasil Panen", "Penyusunan Rencana Usaha Budidaya Organik", "Rubrik Kinerja Pengelolaan Lahan Praktik"],
    description: "Buku Panduan Guru PKWu Budidaya Kelas 12 SMA Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-pkwu-olh",
    title: "Buku Panduan Guru Prakarya dan Kewirausahaan: Pengolahan SMA Kelas XII",
    mapel: "Prakarya dan Kewirausahaan (PKWu)",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Proyek Modifikasi Kuliner Nusantara", "Penyuluhan Sanitasi, Higiene & Standarisasi BPOM/Halal", "Strategi Peluncuran Produk & Pemasaran Digital", "Asesmen Sensorik & Uji Organoleptik Makanan"],
    description: "Buku Panduan Guru PKWu Pengolahan Kelas 12 SMA Kurikulum Merdeka Kemendikdasmen.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  },
  {
    id: "b-sma-12-guru-bk",
    title: "Buku Panduan Guru Bimbingan dan Konseling (BK) SMA Kelas XII",
    mapel: "Bimbingan dan Konseling (BK)",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    fase: "Fase F",
    type: "Buku Panduan Guru",
    babList: ["Panduan Asesmen Bakat, Minat & Pemetaan Karier Masa Depan", "Strategi Bimbingan Sukses Masuk Perguruan Tinggi & Kedinasan", "Manajemen Stres Ujian & Kesiapan Menuju Dunia Kerja", "Layanan Konseling Individual & Kelompok Transisi Dewasa Awal"],
    description: "Buku Panduan Guru BK resmi untuk mendampingi transisi karir, pemilihan jurusan kuliah, dan kematangan emosional siswa kelas 12 SMA.",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  }
];

interface PanduanItem {
  id: string;
  name: string;
  jenjang: "SD" | "SMP" | "SMA" | "SMK" | "PAUD";
  fase: string;
  description: string;
  elemen: string[];
  link: string;
}

const PANDUAN_MAPEL_CATALOG: PanduanItem[] = [
  // PAUD
  {
    id: "p-paud-1",
    name: "Nilai Agama dan Budi Pekerti",
    jenjang: "PAUD",
    fase: "Fase Fondasi",
    description: "Mengenal konsep Tuhan, kasih sayang, dan pembiasaan ibadah harian anak usia dini.",
    elemen: ["Keimanan", "Akhlak Mulia", "Ibadah Harian"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-paud-2",
    name: "Jati Diri",
    jenjang: "PAUD",
    fase: "Fase Fondasi",
    description: "Membangun emosi positif, rasa percaya diri, kemandirian, dan pola hidup sehat.",
    elemen: ["Pengelolaan Emosi", "Motorik Kasar/Halus", "Pola Hidup Sehat"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-paud-3",
    name: "Dasar-Dasar STEAM & Literasi",
    jenjang: "PAUD",
    fase: "Fase Fondasi",
    description: "Eksplorasi pra-literasi, simbol matematika sederhana, sains lingkungan, dan ekspresi seni.",
    elemen: ["Pra-Literasi", "Pra-Matematika", "Eksplorasi Sains & Seni"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },

  // SD
  {
    id: "p-sd-1",
    name: "Ilmu Pengetahuan Alam dan Sosial (IPAS SD)",
    jenjang: "SD",
    fase: "Fase B & C (Kelas 3-6)",
    description: "Integrasi konsep sains alam dan sosial untuk memahami lingkungan sekitar dan kebudayaan.",
    elemen: ["Pemahaman IPAS", "Keterampilan Proses Sains-Sosial"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-sd-2",
    name: "Bahasa Indonesia SD",
    jenjang: "SD",
    fase: "Fase A, B, C (Kelas 1-6)",
    description: "Fondasi membaca, menulis, menyimak, dan berbicara secara komunikatif dan santun.",
    elemen: ["Menyimak", "Membaca & Memirsa", "Berbicara & Mempresentasikan", "Menulis"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-sd-3",
    name: "Matematika SD",
    jenjang: "SD",
    fase: "Fase A, B, C (Kelas 1-6)",
    description: "Konsep bilangan, operasi hitung, geometri bangun datar/ruang, pengukuran, dan data sederhana.",
    elemen: ["Bilangan", "Aljabar", "Pengukuran", "Geometri", "Analisis Data"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-sd-4",
    name: "Pendidikan Pancasila SD",
    jenjang: "SD",
    fase: "Fase A, B, C (Kelas 1-6)",
    description: "Penerapan nilai Pancasila, hak & kewajiban di rumah/sekolah, dan kebhinekaan.",
    elemen: ["Pancasila", "UUD 1945", "Bhinneka Tunggal Ika", "NKRI"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-sd-5",
    name: "Koding & AI SD",
    jenjang: "SD",
    fase: "Fase B & C (Kelas 3-6)",
    description: "Pengenalan pemikiran komputasional, logika visual Scratch/blockly, dan etika kecerdasan buatan.",
    elemen: ["Berpikir Komputasional", "Koding Visual", "Literasi Digital & AI"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },

  // SMP
  {
    id: "p-smp-1",
    name: "Ilmu Pengetahuan Alam (IPA SMP)",
    jenjang: "SMP",
    fase: "Fase D (Kelas 7-9)",
    description: "Hakikat sains, metode ilmiah, zat & wujudnya, suhu, ekosistem, gelombang, dan tata surya.",
    elemen: ["Pemahaman Sains", "Keterampilan Proses Penyelidikan"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smp-2",
    name: "Ilmu Pengetahuan Sosial (IPS SMP)",
    jenjang: "SMP",
    fase: "Fase D (Kelas 7-9)",
    description: "Interaksi keruangan, sejarah nusantara, lembaga masyarakat, dan kegiatan ekonomi inklusif.",
    elemen: ["Pemahaman Konsep IPS", "Keterampilan Proses Sosial"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smp-3",
    name: "Informatika SMP",
    jenjang: "SMP",
    fase: "Fase D (Kelas 7-9)",
    description: "Berpikir komputasional, algoritma, pemrograman blok/Python dasar, dan jaringan internet.",
    elemen: ["Berpikir Komputasional", "Sistem Komputer", "Jaringan", "Pemrograman"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smp-4",
    name: "Seni dan Prakarya SMP",
    jenjang: "SMP",
    fase: "Fase D (Kelas 7-9)",
    description: "Karya seni rupa, musik, tari, teater, serta prakarya kerajinan, rekayasa, dan pengolahan pangan.",
    elemen: ["Mengalami", "Menciptakan", "Merefleksikan", "Berdampak"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },

  // SMA
  {
    id: "p-sma-1",
    name: "IPA Terpadu & Biologi/Kimia/Fisika",
    jenjang: "SMA",
    fase: "Fase E (Kelas 10) & F (Kelas 11-12)",
    description: "Eksplorasi fenomena alam, reaksi kimia, struktur sel, dan fenomena fisika kuantitatif.",
    elemen: ["Pemahaman Sains", "Keterampilan Penyelidikan Ilmiah"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-sma-2",
    name: "IPS Terpadu & Sosiologi/Ekonomi/Geografi/Sejarah",
    jenjang: "SMA",
    fase: "Fase E (Kelas 10) & F (Kelas 11-12)",
    description: "Studi dinamika masyarakat, pasar ekonomi, mitigasi bencana, dan kesadaran sejarah bangsa.",
    elemen: ["Pemahaman Konsep Sosial-Humaniora", "Keterampilan Analisis"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-sma-3",
    name: "Matematika & Matematika Tingkat Lanjut",
    jenjang: "SMA",
    fase: "Fase E & F (Kelas 10-12)",
    description: "Fungsi kuadrat/eksponen, trigonometri, matriks, polinomial, kalkulus diferensial dan integral.",
    elemen: ["Bilangan", "Aljabar", "Geometri", "Kalkulus", "Statistika"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },

  // SMK
  {
    id: "p-smk-1",
    name: "Projek IPAS SMK",
    jenjang: "SMK",
    fase: "Fase E (Kelas 10 SMK)",
    description: "Aplikasi IPA dan IPS kontekstual dunia kerja: zat, energi, ekosistem, dan interaksi sosial kerja.",
    elemen: ["Pemahaman Sains & Sosial Vokasi", "Keterampilan Projek IPAS"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smk-2",
    name: "Dasar-Dasar Rekayasa Perangkat Lunak (RPL)",
    jenjang: "SMK",
    fase: "Fase E (Kelas 10 SMK)",
    description: "Pemrograman berorientasi objek, basis data, rekayasa web, dan K3LH industri software.",
    elemen: ["Proses Bisnis RPL", "Algoritma Pemrograman", "Basis Data"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smk-3",
    name: "Dasar-Dasar Teknik Komputer & Jaringan (TKJ)",
    jenjang: "SMK",
    fase: "Fase E (Kelas 10 SMK)",
    description: "Perakitan komputer, instalasi OS, arsitektur jaringan lokal (LAN/WAN), dan keamanan siber.",
    elemen: ["Jaringan Komputer", "Sistem Operasi", "K3LH & Telekomunikasi"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smk-4",
    name: "Dasar-Dasar Otomotif / AKL / MPLB / Bisnis Digital / Kuliner / DKV",
    jenjang: "SMK",
    fase: "Fase E (Kelas 10 SMK)",
    description: "Keahlian vokasi sesuai rumpun industri: otomotif, keuangan akuntansi, perkantoran, tata boga, DKV.",
    elemen: ["Proses Bisnis Industri", "Budaya Kerja & K3LH", "Teknis Keahlian"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smk-kon-rpl",
    name: "Konsentrasi Keahlian RPL (Web, Mobile & PBO)",
    jenjang: "SMK",
    fase: "Fase F (Kelas 11-12 SMK)",
    description: "Pemrograman web terintegrasi, aplikasi mobile Android/iOS, PBO tingkat lanjut, REST API & basis data.",
    elemen: ["Pemrograman Web", "Pemrograman Mobile", "PBO", "Basis Data"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smk-kon-tkj",
    name: "Konsentrasi Keahlian TKJ (Server & Keamanan Jaringan)",
    jenjang: "SMK",
    fase: "Fase F (Kelas 11-12 SMK)",
    description: "Infrastruktur jaringan terdistribusi, routing/switching Mikrotik & Cisco, server Linux, cloud & cybersecurity.",
    elemen: ["Administrasi Jaringan", "Administrasi Server", "Keamanan Jaringan"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smk-kon-otm",
    name: "Konsentrasi Keahlian TKR & TSM (Teknik Otomotif)",
    jenjang: "SMK",
    fase: "Fase F (Kelas 11-12 SMK)",
    description: "Pemeliharaan mesin EFI/PGM-FI, perbaikan sasis, transmisi manual/otomatis, dan kelistrikan otomotif.",
    elemen: ["Mesin Otomotif", "Sasis & Transmisi", "Kelistrikan Otomotif"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smk-kon-akl",
    name: "Konsentrasi Keahlian AKL (Akuntansi & Komputer Akuntansi)",
    jenjang: "SMK",
    fase: "Fase F (Kelas 11-12 SMK)",
    description: "Laporan keuangan industri, aplikasi MYOB/Accurate, akuntansi perbankan, dan perpajakan badan.",
    elemen: ["Akuntansi Keuangan", "Komputer Akuntansi", "Perpajakan"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smk-kon-mplb",
    name: "Konsentrasi Keahlian MPLB (Otomatisasi Perkantoran)",
    jenjang: "SMK",
    fase: "Fase F (Kelas 11-12 SMK)",
    description: "Tata kelola administrasi kepegawaian & keuangan, kearsipan elektronik, event organizer & keprotokolan.",
    elemen: ["Administrasi Perkantoran", "Kearsipan Digital", "Humas & Protokol"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smk-kon-pms",
    name: "Konsentrasi Keahlian Pemasaran Digital & Bisnis Ritel",
    jenjang: "SMK",
    fase: "Fase F (Kelas 11-12 SMK)",
    description: "Pemasaran digital (SEO, SEM, Meta Ads, TikTok Shop), manajemen toko ritel & POS, serta visual merchandising.",
    elemen: ["Digital Marketing", "Bisnis Ritel", "Visual Merchandising"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smk-kon-kln",
    name: "Konsentrasi Keahlian Kuliner (Pengolahan Makanan & Pastry)",
    jenjang: "SMK",
    fase: "Fase F (Kelas 11-12 SMK)",
    description: "Teknik memasak hidangan Nusantara & Internasional, manajemen gizi, tata hidang, pastry, dan kue komersial.",
    elemen: ["Pengolahan Makanan", "Pastry & Bakery", "Tata Hidang"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smk-kon-dkv",
    name: "Konsentrasi Keahlian DKV (Desain Grafis, Videografi & Animasi)",
    jenjang: "SMK",
    fase: "Fase F (Kelas 11-12 SMK)",
    description: "Desain grafis periklanan, desain branding/logo, produksi videografi, editing, animasi 2D/3D & UI/UX.",
    elemen: ["Desain Grafis & Branding", "Videografi & Animasi", "UI/UX Design"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smk-5",
    name: "Projek Kreatif & Kewirausahaan (PKK SMK)",
    jenjang: "SMK",
    fase: "Fase F (Kelas 11-12 SMK)",
    description: "Pembuatan prototipe produk, analisis peluang usaha, pemasaran digital, dan pendaftaran HAKI.",
    elemen: ["Perencanaan Produk", "Prototipe", "Pemasaran & Laporan Keuangan"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  },
  {
    id: "p-smk-6",
    name: "Praktik Kerja Lapangan (PKL SMK)",
    jenjang: "SMK",
    fase: "Fase F (Kelas 12 SMK)",
    description: "Pengalaman kerja nyata di industri/DUDI untuk memantapkan kompetensi lulusan siap kerja.",
    elemen: ["Soft Skills Industri", "Hard Skills Keahlian", "Jurnal Praktik Kerja"],
    link: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
  }
];

function getMapelList(kelas: string, jenjang?: string): string[] {
  if (jenjang === "PAUD" || kelas.includes("Fondasi")) return DATA_MAPEL_PAUD;
  if (jenjang === "SD" || kelas.includes("Fase A") || kelas.includes("Fase B") || kelas.includes("Fase C")) return DATA_MAPEL_SD;
  if (jenjang === "SMP" || kelas.includes("Fase D")) return DATA_MAPEL_SMP;
  if (jenjang === "SMK") return DATA_MAPEL_SMK;
  if (kelas.includes("Fase F")) return DATA_MAPEL_SMA_F;
  if (kelas.includes("Fase E")) return DATA_MAPEL_SMA_E;
  return DATA_MAPEL_SMA_F;
}

function getElemenList(mapel: string, kelas: string, jenjang?: string): string[] {
  const fase = kelas.includes("Fase F") ? "F" : kelas.includes("Fase E") ? "E" : "";

  if (mapel.includes("Matematika")) {
    return ["Bilangan", "Aljabar dan Fungsi", "Pengukuran", "Geometri", "Analisis Data dan Peluang", "Kalkulus"];
  }
  if (mapel.includes("Bahasa Indonesia") || mapel.includes("Bahasa Inggris")) {
    return ["Menyimak", "Membaca dan Memirsa", "Berbicara dan Mempresentasikan", "Menulis"];
  }
  if (mapel.includes("IPAS") && !mapel.includes("Projek IPAS")) {
    return ["Pemahaman IPAS (Sains & Sosial)", "Keterampilan Proses IPAS"];
  }
  if (mapel.includes("Projek IPAS")) {
    return ["Pemahaman Sains & Sosial Vokasi", "Keterampilan Proses Projek IPAS"];
  }
  if (mapel.includes("IPS")) {
    return [
      "Pemahaman Konsep Ekonomi",
      "Pemahaman Konsep Sosiologi",
      "Pemahaman Konsep Geografi",
      "Pemahaman Konsep Sejarah",
      "Keterampilan Proses (IPS Terpadu)"
    ];
  }
  if (mapel.includes("IPA")) {
    return [
      "Pemahaman Konsep Fisika",
      "Pemahaman Konsep Kimia",
      "Pemahaman Konsep Biologi",
      "Keterampilan Proses (IPA Terpadu)"
    ];
  }
  if (["Fisika", "Kimia", "Biologi"].includes(mapel)) {
    return ["Pemahaman Sains", "Keterampilan Proses"];
  }
  if (mapel.includes("Pancasila")) {
    return ["Pancasila", "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945", "Bhinneka Tunggal Ika", "Negara Kesatuan Republik Indonesia"];
  }
  if (mapel.includes("Agama")) {
    return ["Al-Qur'an dan Hadis", "Aqidah", "Akhlak", "Fiqih", "Sejarah Peradaban Islam"];
  }
  if (mapel.includes("Sejarah")) return ["Pemahaman Konsep Sejarah", "Keterampilan Proses Sejarah"];
  if (mapel.includes("Sosiologi")) return ["Pemahaman Konsep Sosiologi", "Keterampilan Proses Sosiologi"];
  if (mapel.includes("Ekonomi")) return ["Pemahaman Konsep Ekonomi", "Keterampilan Proses Ekonomi"];
  if (mapel.includes("Geografi")) return ["Pemahaman Konsep Geografi", "Keterampilan Proses Geografi"];
  if (mapel.includes("Antropologi")) return ["Pemahaman Konsep Antropologi", "Keterampilan Proses Antropologi"];
  if (mapel.includes("Jasmani") || mapel.includes("PJOK")) {
    return ["Keterampilan Gerak", "Pengetahuan Gerak", "Pemanfaatan Gerak", "Pengembangan Karakter"];
  }
  if (mapel.includes("Informatika")) {
    return ["Berpikir Komputasional", "Teknologi Informasi dan Komunikasi", "Sistem Komputer", "Jaringan Komputer dan Internet", "Analisis Data", "Algoritma dan Pemrograman", "Dampak Sosial Informatika", "Praktik Lintas Bidang"];
  }
  if (mapel.includes("Seni") || mapel.includes("Prakarya")) {
    return ["Mengalami", "Menciptakan", "Merefleksikan", "Berpikir dan Bekerja Artistik", "Berdampak"];
  }
  if (mapel.includes("Dasar-Dasar") || mapel.includes("Konsentrasi") || mapel.includes("PKK") || mapel.includes("PKL")) {
    return ["Proses Bisnis & Industri", "Perkembangan Teknologi & Isu Global", "K3LH & Budaya Kerja", "Teknis & Praktik Keahlian"];
  }
  return ["Pemahaman Konsep", "Keterampilan Proses"];
}

function getMateriEsensial(mapel: string, kelas: string, elemen: string): string[] {
  const targetMapel = resolveBidangMapel(mapel, elemen);
  const isKelas10 = kelas.includes("10") || kelas.includes("Fase E");
  const isKelas11 = kelas.includes("11");
  const isKelas12 = kelas.includes("12");
  const isSMP = kelas.includes("7") || kelas.includes("8") || kelas.includes("9") || kelas.includes("Fase D");

  // MATEMATIKA
  if (targetMapel === "Matematika" || mapel === "Matematika") {
    if (isKelas10) {
      if (elemen === "Bilangan") return [
        "Eksponen dan Bentuk Akar",
        "Logaritma dan Sifat-sifat Operasinya",
        "Barisan dan Deret Aritmetika",
        "Barisan dan Deret Geometri"
      ];
      if (elemen === "Aljabar dan Fungsi") return [
        "Sistem Persamaan Linear Tiga Variabel (SPLTV)",
        "Sistem Pertidaksamaan Linear Dua Variabel (SPtLDV)",
        "Karakteristik dan Grafik Fungsi Kuadrat",
        "Fungsi Eksponensial dan Grafiknya"
      ];
      if (elemen === "Geometri") return [
        "Perbandingan Trigonometri (Sin, Cos, Tan pada Segitiga Siku-siku)",
        "Perbandingan Sudut Istimewa dan Sudut Berelasi",
        "Penerapan Trigonometri dalam Pengukuran Sudut Elevasi dan Depresi"
      ];
      if (elemen === "Analisis Data dan Peluang") return [
        "Ukuran Pemusatan Data (Mean, Median, Modus data tunggal & kelompok)",
        "Ukuran Penempatan Data (Kuartil, Desil, Persentil)",
        "Ukuran Penyebaran Data (Jangkauan, Varians, Simpangan Baku, IQR)",
        "Peluang Kejadian Sederhana dan Saling Lepas"
      ];
      return ["Eksponen dan Logaritma", "Barisan dan Deret", "SPLTV dan SPtLDV", "Trigonometri Dasar", "Statistika dan Peluang"];
    }
    if (isKelas11) {
      if (elemen === "Aljabar dan Fungsi") return [
        "Komposisi Fungsi (Operasi Aljabar Fungsi dan Sifat)",
        "Fungsi Invers dan Invers Komposisi Fungsi",
        "Polinomial (Suku Banyak): Operasi Penjumlahan, Pengurangan, Perkalian",
        "Pembagian Polinomial, Teorema Sisa, dan Teorema Faktor"
      ];
      if (elemen === "Geometri") return [
        "Lingkaran: Persamaan Lingkaran dan Kedudukan Titik/Garis terhadap Lingkaran",
        "Persamaan Garis Singgung Lingkaran",
        "Sudut Pusat, Sudut Keliling, Panjang Busur, dan Luas Juring Lingkaran",
        "Transformasi Geometri (Translasi, Refleksi, Rotasi, dan Dilatasi)"
      ];
      if (elemen === "Bilangan") return [
        "Matriks: Operasi Penjumlahan, Pengurangan, dan Perkalian Matriks",
        "Determinan dan Invers Matriks ordo 2x2 dan 3x3",
        "Aplikasi Matriks dalam Penyelesaian Sistem Persamaan Linear",
        "Bunga Tunggal, Bunga Majemuk, dan Anuitas dalam Finansial"
      ];
      if (elemen === "Analisis Data dan Peluang") return [
        "Diagram Pencar (Scatter Plot) dan Hubungan Bivariat",
        "Regresi Linear Sederhana dan Garis Best-Fit",
        "Analisis Korelasi Pearson dan Koefisien Determinasi"
      ];
      if (elemen === "Kalkulus") return [
        "Konsep Limit Fungsi Aljabar",
        "Metode Penyelesaian Limit (Faktorisasi & Merasionalkan Bentuk Akar)",
        "Pengantar Konsep Turunan Pertama Fungsi Aljabar"
      ];
      return ["Komposisi Fungsi & Invers", "Lingkaran & Garis Singgung", "Matriks & Determinan", "Regresi Linear & Diagram Pencar", "Limit Fungsi Aljabar"];
    }
    if (isKelas12) {
      if (elemen === "Kalkulus") return [
        "Turunan Fungsi Aljabar dan Sifat-sifat Turunan",
        "Aturan Rantai Turunan Fungsi",
        "Aplikasi Turunan: Persamaan Garis Singgung dan Garis Normal Kurva",
        "Fungsi Naik, Fungsi Turun, Titik Stasioner, dan Nilai Maksimum/Minimum",
        "Turunan Fungsi Trigonometri",
        "Integral Tak Tentu Fungsi Aljabar",
        "Integral Tentu dan Penerapan Menghitung Luas Daerah di Bawah Kurva"
      ];
      if (elemen === "Analisis Data dan Peluang") return [
        "Kaidah Pencacahan: Aturan Penjumlahan dan Aturan Perkalian",
        "Permutasi (Unsur Berbeda, Unsur Sama, Siklis)",
        "Kombinasi dan Binomial Newton",
        "Peluang Kejadian Majemuk (Saling Lepas, Tidak Saling Lepas, Saling Bebas, Bersyarat)",
        "Distribusi Peluang Diskrit dan Variabel Acak",
        "Distribusi Peluang Binomial",
        "Distribusi Peluang Normal dan Tabel Z",
        "Uji Hipotesis Sederhana pada Masalah Kontekstual"
      ];
      if (elemen === "Geometri") return [
        "Geometri Ruang (Dimensi Tiga): Kedudukan Titik, Garis, dan Bidang",
        "Jarak Antara Titik ke Titik, Titik ke Garis, dan Titik ke Bidang",
        "Sudut Antar Garis, Garis ke Bidang, dan Antar Dua Bidang",
        "Irisan Bidang pada Bangun Ruang"
      ];
      if (elemen === "Aljabar dan Fungsi") return [
        "Program Linear dan Daerah Penyelesaian Sistem Pertidaksamaan",
        "Nilai Optimum Fungsi Objektif dengan Garis Selidik / Titik Pojok",
        "Pemodelan Masalah Nyata Berbasis Aljabar Lanjut"
      ];
      return ["Turunan Fungsi & Aplikasinya", "Integral Tentu & Tak Tentu", "Kaidah Pencacahan, Permutasi & Kombinasi", "Peluang Majemuk & Distribusi Normal", "Geometri Dimensi Tiga (Jarak & Sudut)"];
    }
    if (isSMP) {
      return ["Bilangan Bulat dan Pecahan", "Bentuk Aljabar dan Operasinya", "Persamaan dan Pertidaksamaan Linear Satu Variabel", "Perbandingan Senilai dan Berbalik Nilai", "Aritmetika Sosial", "Teorema Pythagoras", "Relasi dan Fungsi", "Persamaan Garis Lurus", "Sistem Persamaan Linear Dua Variabel (SPLDV)", "Bangun Ruang Sisi Datar & Lengkung", "Transformasi Geometri Dasar", "Statistika dan Peluang SMP"];
    }
  }

  // BAHASA INDONESIA
  if (mapel === "Bahasa Indonesia") {
    if (isKelas10) {
      if (elemen === "Menyimak") return [
        "Menyimak Teks Laporan Hasil Observasi (LHO) Kritis dan Akurat",
        "Menyimak Teks Anekdot untuk Memahami Kritik dan Humor Tersirat",
        "Menyimak Dialog dan Teks Negosiasi untuk Merumuskan Kesepakatan"
      ];
      if (elemen === "Membaca dan Memirsa") return [
        "Membaca Kritis Teks LHO dan Memilah Fakta vs Opini",
        "Membandingkan Nilai Budaya dan Karakter dalam Hikayat dan Cerpen",
        "Membaca Teks Biografi untuk Meneladani Integritas Tokoh Bangsa"
      ];
      if (elemen === "Berbicara dan Mempresentasikan") return [
        "Mempresentasikan Hasil Observasi dengan Media Visual Interaktif",
        "Menyajikan Lawakan Tunggal (Stand Up Comedy) Berisi Kritik Santun",
        "Melakukan Praktik Negosiasi Formal dan Informal secara Efektif"
      ];
      if (elemen === "Menulis") return [
        "Menulis Teks Laporan Hasil Observasi Objektif dan Terstruktur",
        "Menulis Teks Anekdot Berdasarkan Fenomena Sosial Kontekstual",
        "Menulis Teks Negosiasi Berbentuk Narasi dan Surat Penawaran",
        "Menulis Teks Biografi Singkat Tokoh Inspiratif Lokal",
        "Menulis Puisi dengan Pilihan Diksi, Rima, dan Majas yang Tepat"
      ];
      return ["Teks Laporan Hasil Observasi (LHO)", "Teks Anekdot", "Hikayat dan Cerpen", "Teks Negosiasi", "Teks Biografi", "Menulis Puisi"];
    }
    if (isKelas11) {
      if (elemen === "Menyimak") return [
        "Menyimak Teks Argumentasi Bertema Ketahanan Pangan Lokal",
        "Menyimak Teks Berita dan Vlog Berita Aktual secara Kritis",
        "Menyimak Pembacaan Teks Cerpen Berlatar Belakang Sejarah Indonesia"
      ];
      if (elemen === "Membaca dan Memirsa") return [
        "Membaca Kritis Teks Argumentasi dan Menilai Kekuatan Argumen",
        "Membaca Teks Resensi Novel / Buku Pengayaan Nonfiksi",
        "Menganalisis Dialog dan Plot dalam Naskah Drama"
      ];
      if (elemen === "Berbicara dan Mempresentasikan") return [
        "Mempresentasikan Berita Aktual dalam Format Vlog Berita",
        "Mempresentasikan Proposal Karya Ilmiah di Depan Audiens",
        "Memerankan Tokoh dan Berdialog dalam Pementasan Drama Sekolah"
      ];
      if (elemen === "Menulis") return [
        "Menulis Teks Argumentasi yang Padu, Kohesif, dan Disertai Data",
        "Menulis Teks Berita berdasarkan Fakta Peristiwa Aktual",
        "Menulis Teks Cerpen yang Mengangkat Nilai Kemanusiaan dan Sejarah",
        "Menulis Teks Resensi Buku Pengayaan / Karya Sastra",
        "Menulis Karya Tulis Ilmiah Sederhana Berkaidah Akademik"
      ];
      return ["Teks Argumentasi Pangan Lokal", "Teks Berita & Vlog Berita", "Cerpen Berlatar Sejarah", "Resensi Buku", "Karya Tulis Ilmiah", "Naskah Drama & Pementasan"];
    }
    if (isKelas12) {
      if (elemen === "Menyimak") return [
        "Menyimak Teks Cerita / Novel Sejarah dan Memetakan Alur Peristiwa",
        "Menyimak Teks Editorial / Tajuk Rencana tentang Isu Publik",
        "Menyimak Wawancara Kerja dan Debat Formal Isu Kontemporer"
      ];
      if (elemen === "Membaca dan Memirsa") return [
        "Membaca Kritis Cerita Sejarah: Membedakan Fakta Sejarah dan Rekaan",
        "Menganalisis Opini, Struktur, dan Kaidah Bahasa Teks Editorial",
        "Membaca Artikel Opini Ilmiah Populer Media Cetak dan Daring",
        "Mengkaji Buku Pengayaan Nonfiksi dan Menguraikan Gagasan Pokok"
      ];
      if (elemen === "Berbicara dan Mempresentasikan") return [
        "Menyampaikan Pandangan Kritis dalam Diskusi Panel dan Debat",
        "Melakukan Simulasi Wawancara Kerja (Job Interview) Profesional",
        "Mempresentasikan Esai Kritik Sastra dan Ulasan Buku"
      ];
      if (elemen === "Menulis") return [
        "Menulis Surat Lamaran Pekerjaan dan Daftar Riwayat Hidup (CV) Standar HRD",
        "Menulis Cerita Sejarah Pribadi Berdasarkan Alur Kronologis yang Menarik",
        "Menulis Teks Editorial / Tajuk Rencana Solutif terhadap Masalah Terkini",
        "Menulis Artikel Opini Ilmiah Populer Layak Muat Media Massa",
        "Menulis Kritik Sastra dan Esai Analitis terhadap Karya Sastra Nusantara"
      ];
      return ["Surat Lamaran Pekerjaan & CV", "Teks Cerita / Novel Sejarah", "Teks Editorial / Tajuk Rencana", "Artikel Opini Ilmiah Populer", "Kritik Sastra dan Esai", "Buku Nonfiksi Pengayaan"];
    }
  }

  // BAHASA INGGRIS
  if (mapel === "Bahasa Inggris") {
    if (isKelas10) {
      return [
        "Descriptive Text: Great Indonesian Athletes and Cultural Heritage Sites",
        "Recount Text: Historical Moments and Memorable Sports/School Events",
        "Narrative Text: Indonesian Folktales, Legends, and Moral Wisdom",
        "Expository / Procedure Text: Healthy Habits, Nutrition, and Well-being"
      ];
    }
    if (isKelas11) {
      return [
        "Analytical Exposition Text: Environmental Sustainability and Renewable Energy",
        "Hortatory Exposition Text: Digital Literacy, Cyber Safety, and Social Responsibility",
        "Explanation Text: Natural Disasters and Scientific Phenomena (How & Why)",
        "Discussion Text: Artificial Intelligence and Technology in Everyday Life",
        "Procedural Infographics and Digital Campaign Design"
      ];
    }
    if (isKelas12) {
      return [
        "News Item Text: Broadcasting Breaking Events and Press Releases",
        "Job Application Letter and Professional Curriculum Vitae (CV)",
        "Review Text: Critical Review of Books, Documentaries, and Cinematic Arts",
        "Discussion & Academic Debate: Defending Stances on Global Issues",
        "Delivering Professional Presentations and Academic Pitching"
      ];
    }
  }

  // FISIKA
  if (mapel === "Fisika") {
    if (isKelas10) {
      return [
        "Pengukuran dalam Kerja Ilmiah, Ketidakpastian, dan Angka Penting",
        "Metode Ilmiah dan Keselamatan Kerja Laboratorium",
        "Energi Terbarukan: Sumber Energi, Efisiensi Energi, dan Konservasi Energi",
        "Pemanasan Global: Dampak, Penyebab Gas Rumah Kaca, dan Aksi Iklim"
      ];
    }
    if (isKelas11) {
      return [
        "Vektor pada Perpindahan dan Gaya Dua Dimensi",
        "Kinematika Gerak Lurus Beraturan (GLB) dan Berubah Beraturan (GLBB)",
        "Gerak Dua Dimensi: Gerak Parabola dan Gerak Melingkar Beraturan",
        "Dinamika Gerak: Hukum-Hukum Newton tentang Gerak dan Penerapannya",
        "Hukum Gravitasi Universal Newton dan Hukum-Hukum Kepler",
        "Usaha, Daya, dan Hukum Kekekalan Energi Mekanik",
        "Momentum, Impuls, dan Hukum Kekekalan Momentum (Tumbukan)",
        "Dinamika Rotasi, Momen Inersia, dan Keseimbangan Benda Tegar",
        "Fluida Statis: Tekanan Hidrostatis, Hukum Pascal, dan Hukum Archimedes",
        "Fluida Dinamis: Azas Kontinuitas dan Persamaan Bernoulli",
        "Suhu, Kalor, Azas Black, dan Perpindahan Kalor Konduksi/Konveksi/Radiasi",
        "Termodinamika: Hukum I & II Termodinamika serta Siklus Mesin Carnot"
      ];
    }
    if (isKelas12) {
      return [
        "Gelombang Mekanik: Cepat Rambat, Gelombang Berjalan, dan Gelombang Stasioner",
        "Gelombang Bunyi: Nada Pipa Organa, Resonansi, Efek Doppler, Intensitas & Taraf Intensitas",
        "Gelombang Cahaya: Interferensi, Difraksi Kisi, dan Polarisasi Cahaya",
        "Rangkaian Listrik Arus Searah (DC): Hukum Ohm, Hukum Kirchhoff I & II, Daya Listrik",
        "Listrik Statis: Hukum Coulomb, Medan Listrik, Potensial Listrik, dan Kapasitor Keping Sejajar",
        "Kemagnetan: Medan Magnet Kawat Berarus (Biot-Savart) dan Gaya Lorentz",
        "Induksi Elektromagnetik: Fluks Magnet, Hukum Faraday, Hukum Lenz, Generator, Transformator",
        "Rangkaian Listrik Arus Bolak-Balik (AC): R-L-C Seri, Impedansi, dan Frekuensi Resonansi",
        "Radiasi Gelombang Elektromagnetik dan Spektrum Gelombang",
        "Teori Relativitas Khusus: Postulat Einstein, Dilatasi Waktu, Kontraksi Lorentz, Kesetaraan Massa-Energi",
        "Fisika Kuantum: Radiasi Benda Hitam, Foton, Efek Fotolistrik, dan Hamburan Compton",
        "Fisika Inti, Radioaktivitas, Reaksi Fisi & Fusi, serta Energi Nuklir"
      ];
    }
  }

  // KIMIA
  if (mapel === "Kimia") {
    if (isKelas10) {
      return [
        "Kimia Hijau (Green Chemistry) dalam Pembangunan Berkelanjutan",
        "Perkembangan Model Atom dan Struktur Atom (Proton, Elektron, Neutron)",
        "Konfigurasi Elektron (Model Bohr & Mekanika Kuantum) dan Tabel Periodik Unsur",
        "Ikatan Kimia Dasar (Ikatan Ion, Ikatan Kovalen Tunggal/Rangkap, Ikatan Logam)",
        "Hukum-Hukum Dasar Kimia (Lavoisier, Proust, Dalton, Gay-Lussac, Avogadro)",
        "Stoikiometri Dasar dan Konsep Mol Sederhana"
      ];
    }
    if (isKelas11) {
      return [
        "Bentuk Molekul: Teori Domain Elektron (VSEPR) dan Hibridisasi",
        "Gaya Antarmolekul: Ikatan Hidrogen, Gaya London, dan Dipol-Dipol",
        "Termokimia: Sistem & Lingkungan, Reaksi Eksoterm/Endoterm, Persamaan Termokimia",
        "Penentuan Perubahan Entalpi Reaksi: Kalorimetri, Hukum Hess, dan Energi Ikatan",
        "Laju Reaksi: Teori Tumbukan, Faktor Penentu Laju, Orde Reaksi, dan Persamaan Laju",
        "Kesetimbangan Kimia: Pergeseran Kesetimbangan (Asas Le Chatelier) dan Tetapan Kesetimbangan (Kc, Kp)",
        "Asam dan Basa: Teori Asam-Basa, Indikator Asam-Basa, dan Perhitungan pH",
        "Titrasi Asam-Basa dan Kurva Titrasi",
        "Larutan Penyangga (Buffer): Prinsip Kerja, Perhitungan pH, dan Fungsi dalam Cairan Tubuh",
        "Hidrolisis Garam: Jenis Garam yang Terhidrolisis dan Perhitungan pH Larutan Garam",
        "Kelarutan dan Hasil Kali Kelarutan (Ksp) serta Pembentukan Endapan"
      ];
    }
    if (isKelas12) {
      return [
        "Sifat Koligatif Larutan: Penurunan Tekanan Uap, Titik Didih, Titik Beku, Tekanan Osmotik",
        "Sifat Koligatif Larutan Elektrolit dan Faktor van 't Hoff",
        "Reaksi Redoks: Penyetaraan Persamaan Redoks (Metode Perubahan Biloks & Setengah Reaksi)",
        "Sel Elektrokimia: Sel Volta, Deret Volta, Potensial Sel Standar (E°sel)",
        "Korosi: Faktor Penyebab dan Metode Pencegahan Korosi Logam",
        "Sel Elektrolisis dan Perhitungan Hukum Faraday I & II",
        "Kimia Unsur: Kelimpahan, Sifat Fisik/Kimia, dan Manfaat Gas Mulia, Halogen, Alkali, Alkali Tanah, dan Logam Transisi Periode 4",
        "Senyawa Karbon Turunan Alkana: Haloalkana, Alkohol, Eter, Aldehid, Keton, Asam Karboksilat, Ester (Tata Nama, Isomer, Sifat, Reaksi)",
        "Benzena dan Senyawa Turunannya (Fenol, Toluena, Anilina, Asam Benzoat, Nitrobenzena)",
        "Makromolekul: Polimer (Sintesis & Klasifikasi), Karbohidrat, Protein, dan Lemak"
      ];
    }
  }

  // BIOLOGI
  if (mapel === "Biologi") {
    if (isKelas10) {
      return [
        "Keanekaragaman Hayati Indonesia (Gen, Jenis, Ekosistem) dan Upaya Pelestariannya",
        "Virus dan Peranannya: Karakteristik, Replikasi Litik/Lisogenik, serta Pencegahan Penyakit Viral",
        "Inovasi Bioteknologi Konvensional dan Modern Ramah Lingkungan",
        "Ekosistem: Komponen Biotik/Abiotik, Rantai Makanan, Jaring-jaring Makanan, dan Daur Biogeokimia",
        "Perubahan Lingkungan, Pencemaran, Pengelolaan Limbah, dan Pelestarian Alam"
      ];
    }
    if (isKelas11) {
      return [
        "Sel: Struktur Organel Sel, Fungsi Sel, dan Transpor Membran (Difusi, Osmosis, Transpor Aktif)",
        "Struktur dan Fungsi Jaringan Tumbuhan (Meristem, Epidermis, Parenkim, Pengangkut)",
        "Struktur dan Fungsi Jaringan Hewan (Epitel, Ikat, Otot, Saraf)",
        "Sistem Gerak pada Manusia: Rangka, Sendi, Mekanisme Kontraksi Otot, dan Kelainannya",
        "Sistem Peredaran Darah (Sirkulasi): Komponen Darah, Jantung, Golongan Darah, dan Penyakit Jantung",
        "Sistem Pencernaan: Zat Makanan, Saluran dan Kelenjar Pencernaan, Uji Nutrisi, Gangguan Pencernaan",
        "Sistem Pernapasan (Respirasi): Mekanisme Inspirasi-Ekspirasi, Pertukaran Gas, Kelainan Paru",
        "Sistem Ekskresi: Struktur Ginjal dan Pembentukan Urine, Hati, Kulit, Paru-paru",
        "Sistem Regulasi/Koordinasi: Sistem Saraf, Endokrin (Hormon), Panca Indra, Dampak NAPZA",
        "Sistem Reproduksi: Gametogenesis, Organ Reproduksi, Siklus Menstruasi, Fertilisasi, ASI, dan KB",
        "Sistem Imunitas (Pertahanan Tubuh): Imunitas Bawaan, Adaptif, Vaksinasi, dan Gangguan Autoimun"
      ];
    }
    if (isKelas12) {
      return [
        "Pertumbuhan dan Perkembangan Makhluk Hidup: Faktor Internal (Fitohormon) dan Eksternal",
        "Metabolisme Sel: Sifat, Mekanisme Kerja, dan Faktor yang Mempengaruhi Kerja Enzim",
        "Katabolisme Karbohidrat: Respirasi Aerob (Glikolisis, Dekarboksilasi, Siklus Krebs, Rantai Transpor Elektron) dan Fermentasi",
        "Anabolisme: Fotosintesis (Reaksi Terang Hill & Reaksi Gelap Calvin) dan Kemosintesis",
        "Materi Genetik: Struktur DNA, RNA, Gen, Kromosom, Replikasi DNA, dan Sintesis Protein (Transkripsi & Translasi)",
        "Pembelahan Sel: Mitosis, Meiosis, Siklus Sel, dan Gametogenesis (Spermatogenesis & Oogenesis)",
        "Pola-Pola Hereditas Mendel: Hukum Mendel I & II, Monohibrid, Dihibrid, Backcross, dan Testcross",
        "Penyimpangan Semu Hukum Mendel: Kriptomeri, Epistasis-Hipostasis, Komplementer, Polimeri",
        "Pola Hereditas pada Manusia: Golongan Darah ABO/MN/Rh, Penyakit Menurun (Hemofilia, Buta Warna), Pedigree",
        "Mutasi: Mutasi Gen (Point Mutation) dan Mutasi Kromosom (Struktur & Jumlah), Mutagen",
        "Evolusi: Teori Evolusi Darwin vs Lamarck, Petunjuk Evolusi, Spesiasi, dan Hukum Hardy-Weinberg",
        "Bioteknologi Modern: Rekayasa Genetika, DNA Rekombinan, Kultur Jaringan, Kloning, dan Bioetika"
      ];
    }
  }

  // SOSIOLOGI
  if (targetMapel === "Sosiologi" || targetMapel.includes("Sosiologi") || mapel === "Sosiologi") {
    if (isKelas10) {
      return [
        "Sosiologi sebagai Ilmu: Objek Kajian, Ciri-ciri Sosiologis, dan Paradigma Sosiologi",
        "Identitas Diri, Tindakan Sosial, dan Hubungan Sosial Antarindividu dalam Masyarakat",
        "Lembaga Sosial: Pengertian, Jenis (Keluarga, Agama, Pendidikan, Ekonomi, Politik), dan Fungsinya",
        "Metode Penelitian Sosial Sederhana: Observasi, Wawancara, dan Etika Penelitian Lapangan"
      ];
    }
    if (isKelas11) {
      return [
        "Struktur Sosial: Diferensiasi Sosial dan Stratifikasi Sosial di Indonesia",
        "Kelompok Sosial di Masyarakat: Ciri, Pembentukan, Partikularisme, dan Eksklusivisme Kelompok",
        "Permasalahan Sosial Akibat Pengelompokan: Kemiskinan, Kriminalitas, dan Ketidakadilan Sosial",
        "Konflik Sosial, Kekerasan, dan Analisis Pemetaan Akar Masalah Konflik",
        "Resolusi Konflik, Transformasi Konflik, dan Upaya Membangun Perdamaian serta Harmoni Sosial"
      ];
    }
    if (isKelas12) {
      return [
        "Perubahan Sosial di Tengah Modernisasi: Teori, Bentuk, Arah, dan Faktor Pendorong/Penghambat",
        "Globalisasi dan Transformasi Sosial Budaya Masyarakat Indonesia",
        "Ketimpangan Sosial sebagai Dampak Perubahan Sosial di Era Global",
        "Kearifan Lokal dan Pemberdayaan Komunitas dalam Pembangunan Berkelanjutan",
        "Merancang dan Melaksanakan Proyek Aksi Sosial Partisipatif di Lingkungan Sekitar"
      ];
    }
  }

  // EKONOMI
  if (targetMapel === "Ekonomi" || targetMapel.includes("Ekonomi") || mapel === "Ekonomi") {
    if (isKelas10) {
      return [
        "Konsep Dasar Ilmu Ekonomi",
        "Biaya Peluang dan Skala Prioritas",
        "Pelaku dan Kegiatan Ekonomi",
        "Keseimbangan Pasar dan Elastisitas",
        "Struktur Pasar",
        "Uang dan Perbankan",
        "Sistem Pembayaran dan Otoritas Jasa Keuangan (OJK)"
      ];
    }
    if (isKelas11) {
      return [
        "Badan Usaha dalam Perekonomian Indonesia",
        "Manajemen Badan Usaha",
        "Pendapatan Nasional",
        "Ketenagakerjaan dan Sistem Upah",
        "Indeks Harga dan Inflasi",
        "Kebijakan Moneter dan Kebijakan Fiskal"
      ];
    }
    if (isKelas12) {
      return [
        "Pengantar Akuntansi",
        "Persamaan Dasar Akuntansi",
        "Siklus Akuntansi Perusahaan Jasa",
        "Siklus Akuntansi Perusahaan Dagang",
        "Perdagangan Internasional",
        "Neraca Pembayaran Internasional dan Devisa",
        "Kerjasama Ekonomi Internasional"
      ];
    }
  }

  // GEOGRAFI
  if (targetMapel === "Geografi" || targetMapel.includes("Geografi") || mapel === "Geografi") {
    if (isKelas10) {
      return [
        "Pengantar Geografi: Ruang Lingkup, 10 Konsep Esensial, Prinsip, dan Pendekatan Geografi",
        "Dasar-Dasar Pemetaan, Penginderaan Jauh, dan Sistem Informasi Geografis (SIG)",
        "Dinamika Litosfer: Tenaga Endogen (Tektonisme, Vulkanisme, Seisme), Tenaga Eksogen, dan Pedosfer",
        "Dinamika Atmosfer: Unsur-unsur Cuaca, Klasifikasi Iklim, dan Dampak Perubahan Iklim Global",
        "Dinamika Hidrosfer: Siklus Hidrologi, Perairan Darat (Sungai, Danau, Air Tanah), dan Potensi Lautan"
      ];
    }
    if (isKelas11) {
      return [
        "Posisi Strategis Indonesia sebagai Poros Maritim Dunia dan Batas Kedaulatan Wilayah",
        "Keanekaragaman Hayati (Flora dan Fauna): Bioma Dunia, Persebaran Hayati Nusantara, dan Upaya Konservasi",
        "Pengelolaan Sumber Daya Alam Berkelanjutan: Kehutanan, Kelautan, Pariwisata, dan Pertambangan",
        "Ketahanan Pangan, Industri, dan Energi Terbarukan Nasional",
        "Dinamika Kependudukan Indonesia: Sensus, Komposisi, Piramida Penduduk, Bonus Demografi, dan Masalah Kependudukan",
        "Mitigasi dan Penanggulangan Bencana Alam di Indonesia Berbasis Kearifan Lokal"
      ];
    }
    if (isKelas12) {
      return [
        "Konsep Pengembangan Wilayah, Tata Ruang, dan Penentuan Pusat Pertumbuhan (Growth Poles)",
        "Interaksi Keruangan Desa dan Kota: Karakteristik Ruang, Potensi, Zonasi, dan Dampak Urbanisasi",
        "Pemanfaatan Peta dan Sistem Informasi Geografis (SIG) untuk Perencanaan Pembangunan Wilayah Terpadu",
        "Dinamika Kerjasama Antarnegara: Indikator Negara Maju dan Negara Berkembang, Kerjasama Global, Pasar Bebas"
      ];
    }
  }

  // SEJARAH
  if (targetMapel === "Sejarah" || targetMapel.includes("Sejarah") || mapel === "Sejarah") {
    if (isKelas10) {
      return [
        "Pengantar Ilmu Sejarah: Berpikir Sinkronis, Diakronis, Kausalitas, Perubahan dan Keberlanjutan",
        "Jalur Rempah Nusantara dan Teori Asal-Usul Nenek Moyang Bangsa Indonesia",
        "Kehidupan Kerajaan-Kerajaan Maritim Masa Hindu-Buddha di Nusantara",
        "Kehidupan Kerajaan-Kerajaan Maritim Masa Islam di Nusantara dan Integrasi Kepulauan"
      ];
    }
    if (isKelas11) {
      return [
        "Kolonialisme dan Imperialisme Bangsa Barat di Indonesia (VOC dan Pemerintahan Kolonial Belanda)",
        "Perlawanan Rakyat Indonesia terhadap Kolonialisme Imperialisme Sebelum Abad ke-20",
        "Pergerakan Kebangsaan Nasional: Budi Utomo, Sarekat Islam, Indische Partij, dan Sumpah Pemuda 1928",
        "Masa Pendudukan Militer Jepang di Indonesia dan Dampaknya bagi Perjuangan Kemerdekaan",
        "Peristiwa Sekitar Proklamasi Kemerdekaan Indonesia 17 Agustus 1945 dan Pembentukan Pemerintahan",
        "Perjuang Mempertahankan Kemerdekaan (Perjuangan Fisik Bersenjata dan Jalur Diplomasi 1945-1949)"
      ];
    }
    if (isKelas12) {
      return [
        "Perjuangan Menghadapi Ancaman Disintegrasi Bangsa (Pemberontakan PKI Madiun, DI/TII, PRRI/Permesta, G30S/PKI)",
        "Sistem dan Dinamika Politik-Ekonomi Indonesia Masa Demokrasi Parlementer / Liberal (1950-1959)",
        "Sistem dan Dinamika Politik-Ekonomi Indonesia Masa Demokrasi Terpimpin (1959-1965)",
        "Sistem dan Perkembangan Politik-Ekonomi Masa Pemerintahan Orde Baru (1966-1998)",
        "Perkembangan Politik, Ekonomi, dan Reformasi Indonesia Menuju Era Digital Kontemporer",
        "Peran Aktif Bangsa Indonesia dalam Panggung Perdamaian Dunia (KAA, GNB, ASEAN, Misi Pasukan Garuda)"
      ];
    }
  }

  // PENDIDIKAN PANCASILA
  if (mapel === "Pendidikan Pancasila") {
    if (isKelas10) {
      return [
        "Menggali Ide Pendiri Bangsa tentang Dasar Negara Pancasila",
        "Penerapan Nilai-Nilai Pancasila dalam Kehidupan Berbangsa dan Bernegara",
        "Norma dan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945",
        "Membangun Harmoni dalam Keberagaman dan Mengikis Stereotip Diskriminasi",
        "Menjaga Keutuhan NKRI dan Kedaulatan Batas Wilayah Nasional"
      ];
    }
    if (isKelas11) {
      return [
        "Menjiwai Pancasila: Keterkaitan Sila-Sila Pancasila dalam Kebijakan Publik",
        "Demokrasi Berdasarkan UUD NRI 1945: Kedaulatan Rakyat dan Peran Lembaga Perwakilan",
        "Harmoni Budaya: Menghargai Keragaman Tradisi sebagai Modal Sosial Pembangunan",
        "Resolusi Konflik Horizontal dan Penguatan Kohesi Sosial Bhinneka Tunggal Ika",
        "Sistem Pertahanan dan Keamanan Rakyat Semesta (Sishankamrata) Menghadapi Ancaman Zaman"
      ];
    }
    if (isKelas12) {
      return [
        "Pancasila dalam Konteks Global: Menjawab Tantangan Ideologi Transnasional",
        "Jaminan Hak Asasi Manusia (HAM), Supremasi Hukum, dan Pemberantasan Korupsi",
        "Kewargaan Digital: Hak, Kewajiban, Etika, dan Tanggung Jawab Warga Negara di Jagat Siber",
        "Peran Aktif Indonesia dalam Hubungan Internasional Sesuai Cita-Cita Pembukaan UUD 1945"
      ];
    }
  }

  // INFORMATIKA
  if (mapel === "Informatika") {
    if (isKelas10) {
      return [
        "Berpikir Komputasional",
        "Teknologi Informasi dan Komunikasi",
        "Sistem Komputer",
        "Jaringan Komputer dan Internet",
        "Analisis Data",
        "Algoritma dan Pemrograman",
        "Dampak Sosial Informatika",
        "Praktik Lintas Bidang"
      ];
    }
    if (isKelas11) {
      return [
        "Berpikir Komputasional Tingkat Lanjut",
        "Strategi Algoritmik dan Struktur Data",
        "Arsitektur Jaringan Komputer",
        "Analisis Data Sains dan Kecerdasan Buatan",
        "Rekayasa Perangkat Lunak"
      ];
    }
    if (isKelas12) {
      return [
        "Analisis Kompleksitas Algoritma",
        "Pengembangan Aplikasi Web dan Mobile",
        "Keamanan Siber dan Kriptografi",
        "Komputasi Awan dan Internet of Things (IoT)",
        "Capstone Project Praktik Lintas Bidang"
      ];
    }
  }

  // PRAKARYA DAN KEWIRAUSAHAAN
  if (mapel === "Prakarya dan Kewirausahaan") {
    if (isKelas10) {
      return [
        "Eksplorasi Ide dan Peluang Usaha Produk Berbasis Budaya / Bahan Lokal",
        "Perencanaan Usaha: Analisis Peluang Pasar dan Perhitungan BEP (Break Even Point) Dasar",
        "Proses Produksi dan Pengemasan Produk Kreatif / Pangan Nusantara",
        "Evaluasi Produk dan Teknik Promosi Pemasaran Konvensional & Digital Sederhana"
      ];
    }
    if (isKelas11) {
      return [
        "Riset Kebutuhan Konsumen dan Desain Inovasi Produk Nusantara",
        "Penyusunan Rencana Usaha (Business Plan) Lengkap dan Analisis Biaya Pokok Produksi (HPP)",
        "Sistem Produksi Standar, Keselamatan Kerja (K3), dan Quality Control Produk",
        "Strategi Pemasaran Digital (Digital Marketing), Branding, dan Pemanfaatan Marketplace"
      ];
    }
    if (isKelas12) {
      return [
        "Pengembangan Usaha Kreatif dan Inovasi Produk Ramah Lingkungan (Green Product)",
        "Manajemen Produksi Massal dan Efisiensi Rantai Pasok Usaha",
        "Penyusunan Laporan Keuangan Sederhana (Arus Kas, Laba Rugi, dan Neraca Usaha)",
        "Evaluasi Kinerja Usaha, Strategi Pengembangan Usaha, dan Pitching Bisnis ke Mitra/Investor"
      ];
    }
  }

  // SENI BUDAYA
  if (mapel === "Seni Budaya") {
    if (isKelas10) return [
      "Apresiasi Karya Seni Tradisional dan Modern Nusantara",
      "Eksplorasi Ide, Media, dan Teknik dalam Berkarya Seni Rupa/Musik/Tari/Teater",
      "Penciptaan Karya Seni yang Mengangkat Kearifan Budaya Lokal"
    ];
    if (isKelas11) return [
      "Eksplorasi Gagasan Berkarya Berdasarkan Isu Lingkungan dan Sosial",
      "Manajemen Produksi Pameran Seni Rupa atau Pagelaran Seni Pertunjukan",
      "Penyajian Karya Seni di Ruang Publik dan Galeri Seni Sekolah"
    ];
    if (isKelas12) return [
      "Kritik Seni: Menelaah Unsur Estetika, Makna Simbolis, dan Nilai Filosofis Karya Seni",
      "Kurasi dan Tata Kelola Pameran / Festival Seni Budaya Tingkat Lanjut",
      "Pameran / Pertunjukan Terpadu Karya Seni Kolaboratif Akhir Jenjang"
    ];
  }

  // PJOK
  if (mapel === "Pendidikan Jasmani, Olahraga, dan Kesehatan") {
    if (isKelas10) return [
      "Keterampilan Gerak Permainan Invasi (Sepak Bola / Bola Basket)",
      "Keterampilan Gerak Permainan Net (Bola Voli / Bulu Tangkis)",
      "Aktivitas Senam Lantai dan Kebugaran Jasmani Terkait Kesehatan",
      "Pencegahan Penyakit Menular dan Perilaku Hidup Bersih dan Sehat (PHBS)"
    ];
    if (isKelas11) return [
      "Taktik dan Strategi Penyerangan serta Pertahanan Permainan Beregu",
      "Perancangan Program Latihan Kebugaran Jasmani Mandiri (Prinsip FITT)",
      "Aktivitas Ritmik dan Senam Aerobik untuk Daya Tahan Kardiovaskular",
      "Manajemen Kesehatan Mental, Stres, dan Pencegahan Penyalahgunaan NAPZA"
    ];
    if (isKelas12) return [
      "Perwasitan dan Manajemen Penyelenggaraan Turnamen Olahraga di Sekolah",
      "Evaluasi Kebugaran Jasmani Mandiri dan Pengukuran Komposisi Tubuh",
      "Pencegahan Cedera Olahraga dan Pertolongan Pertama pada Kecelakaan (P3K)",
      "Pola Hidup Aktif Sepanjang Hayat (Lifelong Physical Activity) dan Karier Olahraga"
    ];
  }

  // ANTROPOLOGI
  if (mapel === "Antropologi") {
    if (isKelas10) return [
      "Pengantar Antropologi: Ruang Lingkup, Objek Kajian, dan Manfaat Ilmu Antropologi",
      "Konsep Dasar Kebudayaan: Wujud, 7 Unsur Universal, dan Dinamika Budaya",
      "Sistem Kekerabatan dan Organisasi Sosial Tradisional di Nusantara"
    ];
    if (isKelas11) return [
      "Metodologi Etnografi: Observasi Partisipatoris, Wawancara Mendalam, dan Catatan Lapangan",
      "Keanekaragaman Budaya, Bahasa, dan Religi Masyarakat Indonesia",
      "Kearifan Lokal dalam Mitigasi dan Pengelolaan Sumber Daya Alam",
      "Dinamika Kebudayaan: Akulturasi, Asimilasi, dan Difusi Budaya"
    ];
    if (isKelas12) return [
      "Antropologi Terapan: Kontribusi Kebudayaan dalam Perencanaan Pembangunan Nasional",
      "Globalisasi dan Komersialisasi Budaya: Respon Masyarakat Adat terhadap Budaya Massa",
      "Pelestarian Warisan Budaya Takbenda (Intangible Cultural Heritage) Indonesia",
      "Proyek Mini Etnografi: Studi Kehidupan Sosial-Budaya Komunitas Lokal"
    ];
  }

  // IPA (Fase E / SMP)
  if (mapel === "Ilmu Pengetahuan Alam (IPA)") {
    if (isKelas10) return [
      "Pemanasan Global: Penyebab Gas Rumah Kaca, Dampak, dan Aksi Perubahan Iklim",
      "Pengukuran dalam Kerja Ilmiah, Besaran, dan Angka Penting",
      "Energi Terbarukan: Potensi Sumber Energi Ramah Lingkungan di Indonesia",
      "Struktur Atom dan Kimia Hijau dalam Pembangunan Berkelanjutan",
      "Keanekaragaman Hayati Indonesia, Virus, dan Pelestarian Ekosistem"
    ];
  }

  // IPS (Fase E / SMP)
  if (mapel === "Ilmu Pengetahuan Sosial (IPS)") {
    if (isKelas10) return [
      "Pengantar IPS Terpadu: Manusia, Ruang, dan Waktu dalam Dinamika Sosial",
      "Konsep Dasar Sejarah Nusantara dan Jalur Rempah",
      "Objek Kajian Sosiologi, Identitas Diri, dan Interaksi Sosial",
      "Kelangkaan, Skala Prioritas, dan Keseimbangan Pasar Ekonomi",
      "10 Konsep Geografi, Peta, dan Dinamika Litosfer-Atmosfer"
    ];
  }

  // Fallback default
  return [
    `Materi Pokok 1 - ${mapel} ${kelas}`,
    `Materi Pokok 2 - ${mapel} ${kelas}`,
    `Materi Pokok 3 - ${mapel} ${kelas}`
  ];
}

function getCP(mapel: string, kelas: string, elemen: string): string[] {
  const targetMapel = resolveBidangMapel(mapel, elemen);
  const isKelas10 = kelas.includes("10") || kelas.includes("Fase E");
  const isKelas11 = kelas.includes("11");
  const isKelas12 = kelas.includes("12");
  const faseMatch = kelas.match(/Fase ([A-F])/);
  const fase = faseMatch ? `Fase ${faseMatch[1]}` : (isKelas10 ? "Fase E" : "Fase F");

  // MATEMATIKA
  if (targetMapel === "Matematika" || mapel === "Matematika") {
    if (isKelas10) {
      if (elemen === "Bilangan") return [
        "Di akhir Fase E, peserta didik dapat menggeneralisasi sifat-sifat operasi bilangan berpangkat (eksponen) dan logaritma, serta menggunakan barisan dan deret (aritmetika dan geometri) dalam menyelesaikan masalah kontekstual."
      ];
      if (elemen === "Aljabar dan Fungsi") return [
        "Di akhir Fase E, peserta didik dapat menyelesaikan masalah yang berkaitan dengan sistem persamaan linear tiga variabel dan sistem pertidaksamaan linear dua variabel, serta memodelkan fenomena dengan fungsi kuadrat dan fungsi eksponensial."
      ];
      if (elemen === "Geometri") return [
        "Di akhir Fase E, peserta didik dapat menyelesaikan permasalahan segitiga siku-siku yang melibatkan perbandingan trigonometri dan aplikasinya dalam kehidupan sehari-hari."
      ];
      if (elemen === "Analisis Data dan Peluang") return [
        "Di akhir Fase E, peserta didik dapat menampilkan dan menginterpretasi data menggunakan ukuran pemusatan, penempatan, dan penyebaran; serta menentukan peluang kejadian sederhana dan saling lepas."
      ];
    } else {
      if (elemen === "Aljabar dan Fungsi") return [
        "Di akhir Fase F, peserta didik dapat menyatakan data dalam bentuk matriks, menentukan fungsi invers, komposisi fungsi, dan memodelkan fenomena dengan fungsi polinomial."
      ];
      if (elemen === "Geometri") return [
        "Di akhir Fase F, peserta didik dapat menerapkan konsep keliling dan luas lingkaran, menentukan persamaan lingkaran dan garis singgung lingkaran, serta menerapkan konsep transformasi geometri dan geometri ruang."
      ];
      if (elemen === "Kalkulus") return [
        "Di akhir Fase F, peserta didik dapat memahami konsep limit fungsi, turunan fungsi aljabar/trigonometri, dan integral untuk menyelesaikan masalah optimasi serta laju perubahan."
      ];
      if (elemen === "Analisis Data dan Peluang") return [
        "Di akhir Fase F, peserta didik dapat menginvestigasi hubungan bivariat melalui diagram pencar dan regresi linear, serta memahami kaidah pencacahan, peluang kejadian majemuk, dan distribusi peluang normal."
      ];
    }
  }

  // BAHASA INDONESIA
  if (targetMapel === "Bahasa Indonesia" || mapel === "Bahasa Indonesia") {
    if (isKelas10) {
      if (elemen === "Menyimak") return [
        "Di akhir Fase E, peserta didik mampu mengevaluasi dan mengkreasi informasi berupa gagasan, pikiran, perasaan, pandangan, arahan atau pesan yang akurat dari menyimak berbagai tipe teks (LHO, anekdot, negosiasi) dalam bentuk monolog, dialog, dan gelar wicara."
      ];
      if (elemen === "Membaca dan Memirsa") return [
        "Di akhir Fase E, peserta didik mampu mengevaluasi informasi dan menemukan makna tersurat maupun tersirat dari berbagai jenis teks fiksi dan nonfiksi (hikayat, cerpen, biografi, puisi) dengan kritis."
      ];
      if (elemen === "Berbicara dan Mempresentasikan") return [
        "Di akhir Fase E, peserta didik mampu mengolah dan menyajikan gagasan, pikiran, pandangan, atau arahan untuk tujuan pengajuan usul, pemecahan masalah, negosiasi, dan presentasi publik secara santun dan efektif."
      ];
      if (elemen === "Menulis") return [
        "Di akhir Fase E, peserta didik mampu menulis gagasan, pikiran, pandangan, arahan tertulis untuk berbagai tujuan secara logis, kritis, dan kreatif dalam bentuk teks LHO, anekdot, negosiasi, biografi, dan puisi."
      ];
    } else {
      if (elemen === "Menyimak") return [
        "Di akhir Fase F, peserta didik mampu mengevaluasi berbagai gagasan dan pandangan berdasarkan kaidah logika berpikir dari menyimak teks argumentasi, berita, cerita sejarah, editorial, dan diskusi akademik."
      ];
      if (elemen === "Membaca dan Memirsa") return [
        "Di akhir Fase F, peserta didik mampu mengevaluasi gagasan dan pesan yang tersurat dan tersirat dalam berbagai jenis teks kompleks (esai, resensi, novel sejarah, tajuk rencana, kritik sastra) untuk menyimpulkan tujuan penulis."
      ];
      if (elemen === "Berbicara dan Mempresentasikan") return [
        "Di akhir Fase F, peserta didik mampu menyajikan gagasan, pikiran, dan kreativitas dalam berbahasa secara lisan, dalam bentuk monolog, dialog, gelar wicara, drama, wawancara kerja, serta debat publik yang logis dan persuasif."
      ];
      if (elemen === "Menulis") return [
        "Di akhir Fase F, peserta didik mampu menulis karya ilmiah, teks editorial, artikel opini, surat lamaran pekerjaan, naskah drama, serta kritik dan esai dengan memperhatikan sistematika dan kaidah kebahasaan baku."
      ];
    }
  }

  // FISIKA / IPA
  if (targetMapel === "Fisika" || targetMapel.includes("Fisika") || mapel === "Fisika" || mapel === "Ilmu Pengetahuan Alam (IPA)") {
    if (isKelas10) return [
      "Di akhir Fase E, peserta didik mampu memahami hakikat sains, menerapkan pengukuran ilmiah yang presisi, menganalisis konsep energi terbarukan, serta merancang solusi atas masalah pemanasan global dan perubahan iklim sesuai BSKAP No. 046/H/KR/2025."
    ];
    if (isKelas11) return [
      "Di akhir Fase F (Kelas 11), peserta didik mampu menerapkan prinsip kinematika dan dinamika gerak benda, fluida statis dan dinamis, usaha-energi, momentum, serta termodinamika dalam menyelesaikan persoalan fisika kontekstual."
    ];
    if (isKelas12) return [
      "Di akhir Fase F (Kelas 12), peserta didik mampu menganalisis konsep gelombang mekanik, bunyi, optik fisis, kelistrikan arus searah dan bolak-balik, kemagnetan, induksi elektromagnetik, fisika kuantum, dan fisika inti."
    ];
  }

  // KIMIA
  if (targetMapel === "Kimia" || targetMapel.includes("Kimia") || mapel === "Kimia") {
    if (isKelas10) return [
      "Di akhir Fase E, peserta didik mampu memahami prinsip kimia hijau, struktur atom, konfigurasi elektron, tabel periodik, ikatan kimia dasar, serta hukum-hukum dasar kimia dalam kehidupan sehari-hari."
    ];
    if (isKelas11) return [
      "Di akhir Fase F (Kelas 11), peserta didik mampu menganalisis ikatan antarmolekul, bentuk geometri molekul, termokimia, kinetika laju reaksi, kesetimbangan kimia, serta sifat larutan asam-basa, buffer, dan hidrolisis."
    ];
    if (isKelas12) return [
      "Di akhir Fase F (Kelas 12), peserta didik mampu menganalisis sifat koligatif larutan, reaksi redoks dan elektrokimia (sel Volta & elektrolisis), kimia unsur, struktur serta reaksi senyawa karbon turunan alkana dan makromolekul."
    ];
  }

  // BIOLOGI
  if (targetMapel === "Biologi" || targetMapel.includes("Biologi") || mapel === "Biologi") {
    if (isKelas10) return [
      "Di akhir Fase E, peserta didik mampu menganalisis keanekaragaman hayati Indonesia, peranan virus, bioteknologi ramah lingkungan, interaksi dalam ekosistem, serta solusi atas perubahan lingkungan hidup."
    ];
    if (isKelas11) return [
      "Di akhir Fase F (Kelas 11), peserta didik mampu menganalisis keterkaitan antara struktur dan fungsi sel/jaringan dengan proses fisiologi sistem organ tubuh manusia (gerak, sirkulasi, pencernaan, respirasi, ekskresi, koordinasi, reproduksi, dan imunitas)."
    ];
    if (isKelas12) return [
      "Di akhir Fase F (Kelas 12), peserta didik mampu menganalisis proses metabolisme sel (enzim, katabolisme, anabolisme), materi genetik, sintesis protein, pembelahan sel, pola hereditas Mendel & manusia, mutasi, evolusi, dan bioteknologi modern."
    ];
  }

  // SOSIOLOGI
  if (targetMapel === "Sosiologi" || targetMapel.includes("Sosiologi") || mapel === "Sosiologi") {
    if (isKelas10) return [
      "Di akhir Fase E, peserta didik mampu memahami sosiologi sebagai ilmu pengkaji masyarakat, identitas sosial, tindakan dan hubungan sosial, lembaga sosial, serta melakukan penelitian sosial sederhana."
    ];
    if (isKelas11) return [
      "Di akhir Fase F (Kelas 11), peserta didik mampu menganalisis struktur sosial, dinamika kelompok sosial, masalah sosial kemasyarakatan, serta konflik sosial dan resolusi perdamaian/integrasi sosial."
    ];
    if (isKelas12) return [
      "Di akhir Fase F (Kelas 12), peserta didik mampu menganalisis proses perubahan sosial, dampak globalisasi dan modernisasi, ketimpangan sosial, kearifan lokal, serta merancang proyek pemberdayaan komunitas."
    ];
  }

  // EKONOMI
  if (targetMapel === "Ekonomi" || targetMapel.includes("Ekonomi") || mapel === "Ekonomi") {
    if (isKelas10) return [
      "Di akhir Fase E, peserta didik mampu memahami konsep kelangkaan, biaya peluang, keseimbangan pasar, struktur pasar, sistem pembayaran, uang, perbankan, dan literasi keuangan OJK."
    ];
    if (isKelas11) return [
      "Di akhir Fase F (Kelas 11), peserta didik mampu menganalisis badan usaha (BUMN, BUMS, Koperasi), pendapatan nasional, ketenagakerjaan, inflasi, indeks harga, serta kebijakan moneter dan fiskal."
    ];
    if (isKelas12) return [
      "Di akhir Fase F (Kelas 12), peserta didik mampu menganalisis perdagangan internasional, kerja sama ekonomi global, serta menerapkan siklus akuntansi pada perusahaan jasa dan perusahaan dagang."
    ];
  }

  // GEOGRAFI
  if (targetMapel === "Geografi" || targetMapel.includes("Geografi") || mapel === "Geografi") {
    if (isKelas10) return [
      "Di akhir Fase E, peserta didik mampu menerapkan 10 konsep esensial geografi, pemetaan dan SIG, serta menganalisis dinamika litosfer, pedosfer, atmosfer, dan hidrosfer."
    ];
    if (isKelas11) return [
      "Di akhir Fase F (Kelas 11), peserta didik mampu menganalisis posisi strategis maritim Indonesia, persebaran flora-fauna, pengelolaan sumber daya alam berkelanjutan, dinamika kependudukan, dan mitigasi bencana."
    ];
    if (isKelas12) return [
      "Di akhir Fase F (Kelas 12), peserta didik mampu menganalisis konsep pengembangan wilayah dan tata ruang, interaksi keruangan desa-kota, pemanfaatan peta/SIG untuk pembangunan, dan kerjasama antarnegara maju-berkembang."
    ];
  }

  // SEJARAH
  if (targetMapel === "Sejarah" || targetMapel.includes("Sejarah") || mapel === "Sejarah") {
    if (isKelas10) return [
      "Di akhir Fase E, peserta didik mampu memahami konsep dasar ilmu sejarah (sinkronis, diakronis, kronologis), jalur rempah nusantara, serta masa kerajaan Hindu-Buddha dan Islam di Indonesia."
    ];
    if (isKelas11) return [
      "Di akhir Fase F (Kelas 11), peserta didik mampu menganalisis kolonialisme bangsa barat, perlawanan daerah, pergerakan kebangsaan nasional, masa pendudukan Jepang, proklamasi kemerdekaan, dan mempertahankan kemerdekaan RI."
    ];
    if (isKelas12) return [
      "Di akhir Fase F (Kelas 12), peserta didik mampu menganalisis perjuangan menghadapi disintegrasi bangsa, dinamika Demokrasi Parlementer, Demokrasi Terpimpin, Orde Baru, masa Reformasi, serta peran Indonesia dalam perdamaian dunia."
    ];
  }

  // PENDIDIKAN PANCASILA
  if (mapel === "Pendidikan Pancasila") {
    if (isKelas10) return [
      "Di akhir Fase E, peserta didik mampu menganalisis gagasan pendiri bangsa tentang Pancasila, penerapan nilai-nilai Pancasila, norma konstitusi UUD 1945, serta menjaga keutuhan NKRI dan Bhinneka Tunggal Ika."
    ];
    if (isKelas11) return [
      "Di akhir Fase F (Kelas 11), peserta didik mampu menjiwai keterkaitan sila-sila Pancasila, praktik demokrasi Pancasila, menghargai keberagaman budaya, resolusi konflik sosial, dan sistem pertahanan Sishankamrata."
    ];
    if (isKelas12) return [
      "Di akhir Fase F (Kelas 12), peserta didik mampu mengamalkan Pancasila di era global, menjunjung tinggi HAM dan penegakan hukum, mengamalkan etika kewargaan digital, serta berpartisipasi aktif dalam pergaulan dunia."
    ];
  }

  // INFORMATIKA
  if (mapel === "Informatika") {
    if (isKelas10) return [
      "Di akhir Fase E, peserta didik mampu menerapkan berpikir komputasional, integrasi perkantoran TIK, sistem komputer, jaringan internet dan enkripsi, analisis data, dasar pemrograman algoritmik, serta dampak sosial informatika."
    ];
    if (isKelas11) return [
      "Di akhir Fase F (Kelas 11), peserta didik mampu menerapkan strategi algoritmik (rekursi, greedy, dynamic programming), struktur data lanjut (tree/graph), routing jaringan, sains data, dan rekayasa perangkat lunak."
    ];
    if (isKelas12) return [
      "Di akhir Fase F (Kelas 12), peserta didik mampu menganalisis kompleksitas komputasi, merancang aplikasi web/mobile terpadu, menerapkan cybersecurity dan etika data digital, cloud computing, serta capstone project praktik lintas bidang."
    ];
  }

  return [
    `Capaian Pembelajaran (CP) ${mapel} - ${kelas} - Elemen ${elemen}: Peserta didik menguasai kompetensi esensial dan keterampilan proses mendalam sesuai regulasi Keputusan Kepala BSKAP Nomor 046/H/KR/2025.`
  ];
}

export default function EduAsisten() {
  const {
    isConnected: isDriveConnected,
    isSyncing: isDriveSyncing,
    googleUser,
    syncNotice: driveSyncNotice,
    connectGoogleDrive,
    disconnectGoogleDrive,
    syncAllToDrive,
    restoreAllFromDrive,
    clearNotice: clearDriveNotice
  } = useDriveDatabase();

  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isPanduanModalOpen, setIsPanduanModalOpen] = useState(false);
  const [referensiModalTab, setReferensiModalTab] = useState<'buku' | 'panduan'>('buku');
  const [panduanSearch, setPanduanSearch] = useState("");
  const [selectedPanduanJenjang, setSelectedPanduanJenjang] = useState("Semua");

  const [customBukuList, setCustomBukuList] = useState<BukuDigitalItem[]>(() => {
    return safeStorage.getJSON<BukuDigitalItem[]>("eduasisten_custom_buku", []);
  });
  const [isAddBukuModalOpen, setIsAddBukuModalOpen] = useState(false);
  const [newBukuForm, setNewBukuForm] = useState({
    title: "",
    mapel: "",
    jenjang: "SMA" as "SD" | "SMP" | "SMA" | "SMK" | "PAUD",
    kelas: "10 (Fase E)",
    fase: "Fase E",
    type: "Buku Siswa Utama" as "Buku Siswa Utama" | "Buku Panduan Guru" | "Buku Teks Pendamping",
    babList: "",
    description: "",
    link: "https://buku.kemendikdasmen.go.id/katalog"
  });

  const handleAddBukuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBukuForm.title.trim() || !newBukuForm.mapel.trim()) return;

    const babs = newBukuForm.babList
      .split(/,|\n/)
      .map(b => b.trim())
      .filter(Boolean);

    const newBook: BukuDigitalItem = {
      id: `custom-buku-${Date.now()}`,
      title: newBukuForm.title.trim(),
      mapel: newBukuForm.mapel.trim(),
      jenjang: newBukuForm.jenjang,
      kelas: newBukuForm.kelas,
      fase: newBukuForm.fase || (newBukuForm.jenjang === "SMA" || newBukuForm.jenjang === "SMK" ? "Fase E-F" : "Fase D"),
      type: newBukuForm.type,
      babList: babs.length > 0 ? babs : ["Bab 1: Pendahuluan & Pokok Bahasan Utama"],
      description: newBukuForm.description.trim() || `Buku ${newBukuForm.type} Kurikulum Merdeka Kemendikdasmen untuk mata pelajaran ${newBukuForm.mapel}.`,
      link: newBukuForm.link.trim() || "https://buku.kemendikdasmen.go.id/katalog"
    };

    const updated = [newBook, ...customBukuList];
    setCustomBukuList(updated);
    safeStorage.setItem("eduasisten_custom_buku", updated);

    setNewBukuForm({
      title: "",
      mapel: "",
      jenjang: "SMA",
      kelas: "10 (Fase E)",
      fase: "Fase E",
      type: "Buku Siswa Utama",
      babList: "",
      description: "",
      link: "https://buku.kemendikdasmen.go.id/katalog"
    });
    setIsAddBukuModalOpen(false);
  };

  const handleDeleteCustomBuku = (id: string) => {
    const updated = customBukuList.filter(b => b.id !== id);
    setCustomBukuList(updated);
    safeStorage.setItem("eduasisten_custom_buku", updated);
  };

  const defaultMessage = {
    id: "welcome-msg",
    role: "assistant" as const,
    content: "Halo! Saya **EduAsisten**, sistem AI ahli dalam Pedagogi dan Administrasi Pendidikan Kurikulum Merdeka.\n\nSaya siap membantu Bapak/Ibu Guru menyusun Modul Ajar (Pendekatan 8-3-3-4), menganalisis CP/TP/ATP, membuat soal (Taksonomi Bloom C1-C6), dan menyusun rubrik penilaian. Silakan pilih menu aplikasi di bawah ini atau ketikkan kebutuhan Anda."
  };

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    return safeStorage.getJSON<ChatSession[]>("eduasisten_sessions", []);
  });
  const [savedModules, setSavedModules] = useState<any[]>(() => {
    return safeStorage.getJSON<any[]>("eduasisten_saved_modules", []);
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    return safeStorage.getItem("eduasisten_current_session_id") || null;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSavedModulesModalOpen, setIsSavedModulesModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any | null>(null);

  const [messages, setMessages] = useState<Message[]>(() => {
    const savedSessions = safeStorage.getJSON<ChatSession[]>("eduasisten_sessions", []);
    const activeId = safeStorage.getItem("eduasisten_current_session_id");
    if (activeId) {
      const found = savedSessions.find(s => s.id === activeId);
      if (found && found.messages && found.messages.length > 0) {
        return found.messages;
      }
    }
    const lastActive = safeStorage.getJSON<Message[]>("eduasisten_active_messages", []);
    if (lastActive && lastActive.length > 0) {
      return lastActive;
    }
    return [defaultMessage];
  });

  const [editingAssistantMsgId, setEditingAssistantMsgId] = useState<string | null>(null);
  const [editingAssistantContent, setEditingAssistantContent] = useState("");

  const hasModulAjarInSession = useMemo(() => {
    return messages.some(msg => 
      msg.role === "assistant" && 
      (msg.content.toLowerCase().includes("modul ajar") || msg.content.toLowerCase().includes("identitas modul") || msg.content.toLowerCase().includes("desain pembelajaran") || msg.content.toLowerCase().includes("capaian pembelajaran"))
    );
  }, [messages]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; role: "user" | "assistant"; content: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRevisionMenu, setShowRevisionMenu] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const allBukuCatalog = [...customBukuList, ...BUKU_DIGITAL_CATALOG];

  // Sync to local storage safely & dispatch global realtime event
  useEffect(() => {
    safeStorage.setItem("eduasisten_sessions", sessions);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("guru_data_updated"));
    }
  }, [sessions]);

  useEffect(() => {
    safeStorage.setItem("eduasisten_saved_modules", savedModules);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("guru_data_updated"));
    }
  }, [savedModules]);

  useEffect(() => {
    if (currentSessionId) {
      safeStorage.setItem("eduasisten_current_session_id", currentSessionId);
    } else {
      safeStorage.removeItem("eduasisten_current_session_id");
    }
  }, [currentSessionId]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      safeStorage.setItem("eduasisten_active_messages", messages);
    }
  }, [messages]);

  // Listen for remote updates received from Firestore Cloud
  useEffect(() => {
    const handleRemoteSync = () => {
      const remoteSessions = safeStorage.getJSON<ChatSession[]>("eduasisten_sessions", []);
      const remoteModules = safeStorage.getJSON<any[]>("eduasisten_saved_modules", []);
      if (remoteSessions && remoteSessions.length > 0) {
        setSessions(remoteSessions);
      }
      if (remoteModules && remoteModules.length > 0) {
        setSavedModules(remoteModules);
      }
    };
    window.addEventListener("eduasisten_remote_synced", handleRemoteSync);
    return () => {
      window.removeEventListener("eduasisten_remote_synced", handleRemoteSync);
    };
  }, []);

  // Load session
  useEffect(() => {
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) setMessages(session.messages);
    }
    setReplyingTo(null);
  }, [currentSessionId]);

  const saveCurrentSession = (newMessages: Message[]) => {
    if (currentSessionId) {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: newMessages, updatedAt: Date.now() } : s
      ));
    } else {
      const newId = Date.now().toString();
      const title = newMessages.find(m => m.role === "user")?.content.substring(0, 30) + "..." || "Percakapan Baru";
      setCurrentSessionId(newId);
      setSessions(prev => [{ id: newId, title, messages: newMessages, updatedAt: Date.now() }, ...prev]);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setReplyingTo(null);
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([defaultMessage]);
    }
  };

  const handleReplyMessage = (msg: Message) => {
    setReplyingTo({
      id: msg.id,
      role: msg.role,
      content: msg.content
    });
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (msgId: string, type: "like" | "dislike") => {
    const updated = messages.map(m => m.id === msgId ? { ...m, feedback: m.feedback === type ? undefined : type } : m);
    setMessages(updated);
    saveCurrentSession(updated);
  };

  const handleQuickRevision = (msg: Message, instruction: string) => {
    setShowRevisionMenu(null);
    const revisionPrompt = `Tolong perbaiki respons EduAsisten berikut:\n\nInstruksi Perbaikan: ${instruction}`;
    setReplyingTo({
      id: msg.id,
      role: msg.role,
      content: msg.content
    });
    handleSubmit(undefined, revisionPrompt);
  };

  // User Profile State (Sekolah, Guru, TTD Kepala Sekolah & Kop Surat Digital)
  const [userProfile, setUserProfile] = useState<{
    namaSekolah: string;
    namaPenyusun: string;
    nipPenyusun: string;
    namaKepsek: string;
    nipKepsek: string;
    kopType?: 'text' | 'image';
    kopImageUrl?: string;
    tahunPelajaran?: string;
    alamatSekolah?: string;
    kontakSekolah?: string;
  }>(() => {
    const savedKopType = (localStorage.getItem("eduasisten_kop_type") as "text" | "image") || "text";
    const savedKopImage = localStorage.getItem("eduasisten_kop_image") || "";

    const defaults = {
      namaSekolah: "SMAN 1 Jakarta",
      namaPenyusun: "Guru Penggerak, S.Pd.",
      nipPenyusun: "19850101 201001 1 001",
      namaKepsek: "Dr. H. Kepala Sekolah, M.Pd.",
      nipKepsek: "19720315 199802 1 002",
      kopType: savedKopType,
      kopImageUrl: savedKopImage,
      tahunPelajaran: "2024/2025",
      alamatSekolah: "Jl. Pendidikan Nasional No. 1",
      kontakSekolah: "Telp: (021) 123456 • info@sekolah.sch.id"
    };
    const saved = safeStorage.getJSON("eduasisten_profile", defaults);
    return { ...defaults, ...saved };
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDeckOpen, setIsDeckOpen] = useState(true);
  const [exportModalContent, setExportModalContent] = useState("");
  const [exportDocTypeHint, setExportDocTypeHint] = useState<string | undefined>(undefined);
  const [exportInitialTitle, setExportInitialTitle] = useState<string | undefined>(undefined);
  const [copiedRichId, setCopiedRichId] = useState<string | null>(null);

  useEffect(() => {
    safeStorage.setItem("eduasisten_profile", userProfile);
    if (userProfile.kopType) {
      localStorage.setItem("eduasisten_kop_type", userProfile.kopType);
    }
    if (userProfile.kopImageUrl !== undefined) {
      localStorage.setItem("eduasisten_kop_image", userProfile.kopImageUrl);
    }
  }, [userProfile]);

  const handleProfileKopUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1600, 0.85);
      setUserProfile(prev => ({
        ...prev,
        kopType: "image",
        kopImageUrl: compressed
      }));
    } catch (err) {
      console.error("Gagal unggah kop:", err);
    }
  };

  // Modal State for Perangkat Pembelajaran
  const [isPerangkatModalOpen, setIsPerangkatModalOpen] = useState(false);
  const [perangkatModalTab, setPerangkatModalTab] = useState<'buat' | 'arsip'>('buat');
  const [perangkatForm, setPerangkatForm] = useState({
    jenis: "Modul Ajar Kurikulum merdeka",
    kurikulum: "Kurikulum Merdeka",
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    mapel: "Matematika",
    elemen: getElemenList("Matematika", "10 (Fase E)")[0],
    cp: getCP("Matematika", "10 (Fase E)", getElemenList("Matematika", "10 (Fase E)")[0])[0],
    materi: "",
    subMateri: [] as string[],
    fokusMateri: "",
    variasiStimulus: "Studi Kasus Kontekstual & Realitas Lapangan Terkini",
    kedalaman: "Standar",
    sumberBelajar: "",
    modelPembelajaran: "Problem Based Learning (PBL)",
    waktuJP: 2,
    jumlahPertemuan: 1,
    semester: "Ganjil",
    profilLulusan: ["Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia", "Kebinekaan Global", "Bergotong Royong", "Mandiri", "Bernalar Kritis", "Kreatif"],
    namaSekolah: "",
    namaPenyusun: "",
    nipPenyusun: "",
    tahunPelajaran: "2024/2025",
    instruksiTambahan: "",
    fileBase64: "",
    fileMimeType: "",
    fileName: ""
  });

  // Modal State for Perangkat Review before generation
  const [isPerangkatReviewModalOpen, setIsPerangkatReviewModalOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState<'ringkasan' | 'materi' | 'visual' | 'kualitas'>('ringkasan');
  const [reviewFields, setReviewFields] = useState({
    judulPaket: "",
    sekolah: "",
    guru: "",
    mapel: "",
    kelas: "",
    semester: "",
    materi: "",
    alokasiWaktu: "",
    kurikulum: "Kurikulum Merdeka",
    modelPembelajaran: "Problem Based Learning (PBL)",
    kedalaman: "Standar",
    warnaUtama: "Amber & Indigo",
    visualStyle: "Modern & Bersih",
    fonts: "Playfair Display + Plus Jakarta Sans",
    instruksiTambahan: "",
    content: ""
  });

  // Modal State for Generator LKPD (Lembar Kerja Peserta Didik)
  const [isLKPDModalOpen, setIsLKPDModalOpen] = useState(false);
  const [lkpdForm, setLkpdForm] = useState({
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    mapel: "Matematika",
    elemen: getElemenList("Matematika", "10 (Fase E)")[0] || "",
    cp: getCP("Matematika", "10 (Fase E)", getElemenList("Matematika", "10 (Fase E)")[0] || "")[0] || "",
    materi: "",
    subMateri: [] as string[],
    fokusAktivitas: "",
    pendekatan: "Deep Learning / Experiential",
    tingkatKesulitan: "Standard / Campuran (LOTS-HOTS)",
    metode: "Project Based Learning (PjBL)",
    tipeAktivitas: "Kelompok (Kolaboratif)",
    jumlahPertemuan: "1",
    jumlahTantangan: "3",
    kedalaman: "Standar",
    variasiStimulus: "Multi-Stimulus Lengkap (Kasus Narasi + Bukti Dokumen/Data + Dialog Dilema)",
    includeBuktiTransaksiLengkap: true,
    instruksiTambahan: "",
    fileBase64: "",
    fileMimeType: "",
    fileName: ""
  });

  // Modal State for Pembahasan Soal
  const [isPembahasanModalOpen, setIsPembahasanModalOpen] = useState(false);

  // Modal State for Generator Soal
  const [isSoalModalOpen, setIsSoalModalOpen] = useState(false);
  const [soalModalTab, setSoalModalTab] = useState<'buat' | 'impor' | 'manual'>('buat');
  const [soalForm, setSoalForm] = useState<{
    jenjang: string;
    kelas: string;
    mapel: string;
    materi: string;
    subMateri: string[];
    fokusMateri: string;
    tingkatKesulitan: string[];
    levelKognitif: string[];
    jenisStimulus: string[];
    keteranganStimulus: string;
    bentukSoal: string[];
    jumlahSoal: string;
    instruksiTambahan: string;
  }>({
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    mapel: "Matematika",
    materi: "",
    subMateri: [],
    fokusMateri: "",
    tingkatKesulitan: ["HOTS"],
    levelKognitif: ["C4 (Menganalisis)", "C5 (Mengevaluasi)", "C6 (Mencipta)"],
    jenisStimulus: ["Narasi / Teks Bacaan Kontekstual"],
    keteranganStimulus: "",
    bentukSoal: ["Pilihan Ganda (PG)", "Uraian / Esai"],
    jumlahSoal: "5",
    instruksiTambahan: ""
  });
  const [soalImporForm, setSoalImporForm] = useState({
    fileText: "",
    fileBase64: "",
    fileMimeType: "",
    fileName: "",
    instruksiTambahan: ""
  });
  const [soalManualForm, setSoalManualForm] = useState({
    naskahSoal: "",
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    mapel: "Matematika",
    materi: "",
    instruksiTambahan: ""
  });

  // Modal State for Penilaian & Koreksi AI
  const [isPenilaianModalOpen, setIsPenilaianModalOpen] = useState(false);
  const [penilaianForm, setPenilaianForm] = useState({
    method: "scan_pdf" as "scan_pdf" | "manual",
    mapel: "Ekonomi",
    kelas: "10 (Fase E)",
    namaSiswa: "",
    questionTypes: [
      "Pilihan Ganda (PG)",
      "PG Kompleks",
      "PG Benar / Salah",
      "Isian Singkat",
      "Uraian / Esai"
    ],
    kunciJawaban: {
      pg: "1. A, 2. C, 3. B, 4. D, 5. E",
      pgKompleks: "1. A, C, D | 2. B, D",
      benarSalah: "1. Benar, 2. Salah, 3. Benar",
      isianSingkat: "1. Inflasi, 2. Kebutuhan Primer",
      uraian: "1. Jelaskan hukum permintaan..."
    },
    jawabanSiswaText: "",
    fileBase64: "",
    fileMimeType: "",
    fileName: ""
  });

  const handleSoalJenjangChange = (jenjang: string) => {
    const newKelas = DATA_JENJANG[jenjang as keyof typeof DATA_JENJANG][0];
    const newMapelList = getMapelList(newKelas, jenjang);
    setSoalForm(prev => ({
      ...prev,
      jenjang,
      kelas: newKelas,
      mapel: newMapelList.includes(prev.mapel) ? prev.mapel : newMapelList[0]
    }));
  };

  const handleSoalKelasChange = (kelas: string) => {
    const newMapelList = getMapelList(kelas, soalForm.jenjang);
    setSoalForm(prev => ({
      ...prev,
      kelas,
      mapel: newMapelList.includes(prev.mapel) ? prev.mapel : newMapelList[0]
    }));
  };

  const handleLKPDJenjangChange = (jenjang: string) => {
    const newKelas = DATA_JENJANG[jenjang as keyof typeof DATA_JENJANG][0];
    const newMapelList = getMapelList(newKelas, jenjang);
    setLkpdForm(prev => {
      const newMapel = newMapelList.includes(prev.mapel) ? prev.mapel : newMapelList[0];
      const newElemenList = getElemenList(newMapel, newKelas);
      const newElemen = newElemenList[0] || "";
      const newCP = getCP(newMapel, newKelas, newElemen)[0] || "";
      return {
        ...prev,
        jenjang,
        kelas: newKelas,
        mapel: newMapel,
        elemen: newElemen,
        cp: newCP
      };
    });
  };

  const handleLKPDKelasChange = (kelas: string) => {
    const newMapelList = getMapelList(kelas, lkpdForm.jenjang);
    setLkpdForm(prev => {
      const newMapel = newMapelList.includes(prev.mapel) ? prev.mapel : newMapelList[0];
      const newElemenList = getElemenList(newMapel, kelas);
      const newElemen = newElemenList.includes(prev.elemen) ? prev.elemen : (newElemenList[0] || "");
      const newCP = getCP(newMapel, kelas, newElemen)[0] || "";
      return {
        ...prev,
        kelas,
        mapel: newMapel,
        elemen: newElemen,
        cp: newCP
      };
    });
  };

  const handleLKPDMapelChange = (mapel: string) => {
    setLkpdForm(prev => {
      const newElemenList = getElemenList(mapel, prev.kelas);
      const newElemen = newElemenList[0] || "";
      const newCP = getCP(mapel, prev.kelas, newElemen)[0] || "";
      return {
        ...prev,
        mapel,
        elemen: newElemen,
        cp: newCP
      };
    });
  };

  const handleLKPDElemenChange = (elemen: string) => {
    setLkpdForm(prev => ({
      ...prev,
      elemen,
      cp: getCP(prev.mapel, prev.kelas, elemen)[0] || ""
    }));
  };

  const applySiklusJasaPreset = () => {
    const cpList = getCP("Ekonomi", "12 (Fase F)", "Akuntansi");
    setLkpdForm(prev => ({
      ...prev,
      jenjang: "SMA",
      kelas: "12 (Fase F)",
      mapel: "Ekonomi",
      elemen: "Akuntansi",
      cp: cpList[0] || prev.cp,
      materi: "Siklus Akuntansi Perusahaan Jasa",
      subMateri: [
        "Bukti Transaksi Keuangan",
        "Jurnal Umum Perusahaan Jasa",
        "Buku Besar & Prosedur Posting",
        "Neraca Saldo",
        "Ayat Jurnal Penyesuaian (AJP)",
        "Kertas Kerja / Neraca Lajur (10 Kolom)",
        "Laporan Keuangan (Laba Rugi, Perubahan Modal, Neraca)",
        "Jurnal Penutup & Neraca Saldo Setelah Penutupan",
        "Jurnal Pembalik (Reversing Entries)"
      ],
      fokusAktivitas: "Praktikum Siklus Akuntansi Perusahaan Jasa Lengkap (Analisis Dokumen Bukti Transaksi Otentik, Jurnal Umum, Buku Besar, Neraca Saldo, AJP, Neraca Lajur 10 Kolom, Laporan Keuangan, dan Jurnal Penutup)",
      pendekatan: "Problem Based Learning (PBL)",
      tipeAktivitas: "Individu (Mandiri)",
      jumlahPertemuan: "2",
      variasiStimulus: "Paket Bukti Transaksi Keuangan Otentik Lengkap (Kuitansi, Faktur, Nota, Memo)",
      includeBuktiTransaksiLengkap: true,
      instruksiTambahan: "Sajikan paket lengkap dokumen bukti transaksi otentik (Kuitansi, Faktur, Nota Kontan, Memo Internal) beserta lembar kerja tabel jurnal, buku besar, neraca lajur 10 kolom, laporan keuangan, dan jurnal penutup yang siap dikerjakan siswa."
    }));
  };

  const applySiklusDagangPreset = () => {
    const cpList = getCP("Ekonomi", "12 (Fase F)", "Akuntansi");
    setLkpdForm(prev => ({
      ...prev,
      jenjang: "SMA",
      kelas: "12 (Fase F)",
      mapel: "Ekonomi",
      elemen: "Akuntansi",
      cp: cpList[0] || prev.cp,
      materi: "Siklus Akuntansi Perusahaan Dagang",
      subMateri: [
        "Karakteristik & Transaksi Perusahaan Dagang",
        "Bukti Transaksi Perusahaan Dagang",
        "Jurnal Khusus (Pembelian, Penjualan, Penerimaan Kas, Pengeluaran Kas)",
        "Buku Besar Pembantu Piutang dan Utang",
        "Neraca Saldo Perusahaan Dagang",
        "Harga Pokok Penjualan (HPP)",
        "Jurnal Penyesuaian Perusahaan Dagang",
        "Kertas Kerja (Neraca Lajur) Perusahaan Dagang",
        "Laporan Keuangan Perusahaan Dagang",
        "Jurnal Penutup & Penutupan Buku"
      ],
      fokusAktivitas: "Praktikum Siklus Akuntansi Perusahaan Dagang Lengkap (Dokumen Bukti Transaksi, Jurnal Khusus 4 Kolom & Memorial, Buku Besar Utama & Pembantu, Neraca Saldo, HPP & Jurnal Penyesuaian, Kertas Kerja 10 Kolom, Laporan Keuangan, dan Penutupan Buku)",
      pendekatan: "Problem Based Learning (PBL)",
      tipeAktivitas: "Individu (Mandiri)",
      jumlahPertemuan: "3",
      variasiStimulus: "Paket Bukti Transaksi Keuangan Otentik Lengkap (Kuitansi, Faktur, Nota, Memo)",
      includeBuktiTransaksiLengkap: true,
      instruksiTambahan: "Sajikan paket lengkap dokumen bukti transaksi otentik (Faktur Pembelian/Penjualan syarat 2/10 n/30, Nota Debet/Kredit, Kuitansi, Nota Kontan, Memo Penyesuaian Persediaan & Penyusutan) beserta lembar kerja tabel jurnal khusus 4 kolom, buku besar pembantu, neraca lajur 10 kolom, laporan keuangan, dan penutupan buku."
    }));
  };

  const toggleArrayItem = <T,>(arr: T[], item: T): T[] => {
    if (arr.includes(item)) {
      if (arr.length === 1) return arr;
      return arr.filter(i => i !== item);
    } else {
      return [...arr, item];
    }
  };

  const handleJenjangChange = (jenjang: string) => {
    const newKelas = DATA_JENJANG[jenjang as keyof typeof DATA_JENJANG][0];
    const newMapelList = getMapelList(newKelas, jenjang);
    setPerangkatForm(prev => {
      const newMapel = newMapelList.includes(prev.mapel) ? prev.mapel : newMapelList[0];
      const newElemen = getElemenList(newMapel, newKelas)[0];
      return {
        ...prev,
        jenjang,
        kelas: newKelas,
        mapel: newMapel,
        elemen: newElemen,
        cp: getCP(newMapel, newKelas, newElemen)[0]
      };
    });
  };

  const handleKelasChange = (kelas: string) => {
    const newMapelList = getMapelList(kelas, perangkatForm.jenjang);
    setPerangkatForm(prev => {
      const newMapel = newMapelList.includes(prev.mapel) ? prev.mapel : newMapelList[0];
      const newElemenList = getElemenList(newMapel, kelas);
      const newElemen = newElemenList.includes(prev.elemen) ? prev.elemen : newElemenList[0];
      return {
        ...prev,
        kelas,
        mapel: newMapel,
        elemen: newElemen,
        cp: getCP(newMapel, kelas, newElemen)[0]
      };
    });
  };

  const handleMapelChange = (mapel: string) => {
    setPerangkatForm(prev => {
      const newElemenList = getElemenList(mapel, prev.kelas);
      const newElemen = newElemenList.includes(prev.elemen) ? prev.elemen : newElemenList[0];
      return {
        ...prev,
        mapel,
        elemen: newElemen,
        cp: getCP(mapel, prev.kelas, newElemen)[0]
      };
    });
  };

  const handleElemenChange = (elemen: string) => {
    setPerangkatForm(prev => ({
      ...prev,
      elemen,
      cp: getCP(prev.mapel, prev.kelas, elemen)[0]
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent, customInput?: string, fileData?: { base64: string, mimeType: string, name: string }) => {
    e?.preventDefault();
    const promptText = customInput || input;
    if (!promptText.trim() || isLoading) return;

    // Check if the user is requesting LKPD, Materi or PPT
    const promptLower = promptText.trim().toLowerCase();
    const isRequestingLKPDOrMateriOrPPT = 
      promptLower.includes("lkpd") || 
      promptLower.includes("lembar kerja peserta didik") || 
      promptLower.includes("materi pokok") || 
      promptLower.includes("materi ajar") || 
      promptLower.includes("tayangan ppt") || 
      promptLower.includes("slide ppt") || 
      promptLower.includes("presentasi ppt") ||
      (promptLower.includes("ppt") && (promptLower.includes("buat") || promptLower.includes("susun") || promptLower.includes("bikin")));

    if (isRequestingLKPDOrMateriOrPPT && !hasModulAjarInSession) {
      alert("⚠️ Maaf Bapak/Ibu Guru, sesuai dengan alur kerja penyusunan perangkat Kurikulum Merdeka yang sistematis, pembuatan LKPD, Materi Pokok, atau Tayangan PPT memerlukan dokumen Modul Ajar / RPP yang selesai terlebih dahulu.\n\nSilakan gunakan menu 'Modul Ajar Deep Learning' di Menu Deck untuk menyusun Modul Ajar terlebih dahulu agar tujuan pembelajaran dan isi materi selaras.");
      setInput(promptText); // Preserve the input text
      return;
    }

    let finalPrompt = promptText.trim();
    let replyToData = undefined;

    if (replyingTo) {
      replyToData = {
        role: replyingTo.role,
        content: replyingTo.content
      };
      finalPrompt = `[Membalas pesan sebelumnya dari ${replyingTo.role === "user" ? "Guru" : "EduAsisten"}: "${replyingTo.content.substring(0, 300)}..."]\n\n${finalPrompt}`;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: promptText.trim() + (fileData ? `\n\n[File Dilampirkan: ${fileData.name}]` : ""),
      replyTo: replyToData
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    saveCurrentSession(newMessages);
    setInput("");
    setReplyingTo(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/eduasisten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt: finalPrompt, fileBase64: fileData?.base64, fileMimeType: fileData?.mimeType })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server error (${res.status}): ${responseText.slice(0, 150)}`);
      }

      if (!res.ok) throw new Error(data.error || data.details || "Gagal mendapatkan respons dari EduAsisten");

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.result
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      saveCurrentSession(finalMessages);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Maaf, terjadi kesalahan saat menghubungi server. Mohon coba lagi nanti."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionId: string, prompt: string) => {
    if (actionId === "modul") {
      setPerangkatForm(prev => ({ 
        ...prev, 
        jenis: "Modul Ajar",
        namaSekolah: prev.namaSekolah || userProfile.namaSekolah,
        namaPenyusun: prev.namaPenyusun || userProfile.namaPenyusun,
        nipPenyusun: prev.nipPenyusun || userProfile.nipPenyusun,
        tahunPelajaran: userProfile.tahunPelajaran || prev.tahunPelajaran
      }));
      setIsPerangkatModalOpen(true);
    } else if (actionId === "cptp") {
      setPerangkatForm(prev => ({ 
        ...prev, 
        jenis: "Analisis CP & ATP",
        namaSekolah: prev.namaSekolah || userProfile.namaSekolah,
        namaPenyusun: prev.namaPenyusun || userProfile.namaPenyusun,
        nipPenyusun: prev.nipPenyusun || userProfile.nipPenyusun,
        tahunPelajaran: userProfile.tahunPelajaran || prev.tahunPelajaran
      }));
      setIsPerangkatModalOpen(true);
    } else if (actionId === "prota") {
      setPerangkatForm(prev => ({ 
        ...prev, 
        jenis: "Prota, Prosem & Analisis KKTP",
        namaSekolah: prev.namaSekolah || userProfile.namaSekolah,
        namaPenyusun: prev.namaPenyusun || userProfile.namaPenyusun,
        nipPenyusun: prev.nipPenyusun || userProfile.nipPenyusun,
        tahunPelajaran: userProfile.tahunPelajaran || prev.tahunPelajaran
      }));
      setIsPerangkatModalOpen(true);
    } else if (actionId === "materi") {
      setPerangkatForm(prev => ({ 
        ...prev, 
        jenis: "Generator Materi Ajar",
        kedalaman: "Sangat Mendalam & Komprehensif (Buku Teks Mandiri)",
        namaSekolah: prev.namaSekolah || userProfile.namaSekolah,
        namaPenyusun: prev.namaPenyusun || userProfile.namaPenyusun,
        nipPenyusun: prev.nipPenyusun || userProfile.nipPenyusun,
        tahunPelajaran: userProfile.tahunPelajaran || prev.tahunPelajaran
      }));
      setIsPerangkatModalOpen(true);
    } else if (actionId === "soal") {
      setIsSoalModalOpen(true);
    } else if (actionId === "lkpd") {
      if (!hasModulAjarInSession) {
        alert("⚠️ Maaf Bapak/Ibu Guru, sesuai dengan alur kerja penyusunan perangkat Kurikulum Merdeka yang sistematis, pembuatan LKPD memerlukan penyusunan Modul Ajar / RPP yang selesai terlebih dahulu.\n\nSilakan gunakan menu 'Modul Ajar Deep Learning' di Menu Deck untuk menyusun Modul Ajar terlebih dahulu agar tujuan pembelajaran dan isi materi selaras.");
        return;
      }
      setIsLKPDModalOpen(true);
    } else if (actionId === "pembahasan") {
      setIsPembahasanModalOpen(true);
    } else if (actionId === "penilaian") {
      setIsPenilaianModalOpen(true);
    } else if (actionId === "buku_teks") {
      setReferensiModalTab("buku");
      setIsPanduanModalOpen(true);
    } else if (actionId === "panduan_mapel") {
      setReferensiModalTab("panduan");
      setIsPanduanModalOpen(true);
    } else {
      setInput(prompt);
    }
  };

  const getLearningModelPrompt = (model: string, jumlahTantangan: string): string => {
    const modelLower = model.toLowerCase();
    let modelTitle = "";
    let modelSteps = "";

    if (modelLower.includes("pbl") || modelLower.includes("problem")) {
      modelTitle = "F. KEGIATAN PEMBELAJARAN BERBASIS MASALAH (PROBLEM-BASED LEARNING)";
      modelSteps = `Rancang kegiatan dan pengerjaan LKPD ini dengan mengikuti **Sintaks Pembelajaran Problem-Based Learning (PBL)** abad 21 secara ketat yang disajikan dalam bentuk tabel kerja interaktif untuk DIKERJAKAN OLEH SISWA:
(⚠️ PERINGATAN: Kolom jawaban/analisis siswa WAJIB BERUPA SEL KOSONG MURNI, JANGAN DIBERI GUIDE TEKS / TITIK-TITIK, DAN JANGAN PERNAH DIISI JAWABANNYA LANGSUNG OLEH AI!)

1. **Sintaks 1: Orientasi Masalah (C3/C4)**
   - Sajikan instruksi bagi siswa untuk menganalisis masalah dari Stimulus. Sediakan tabel kerja siswa berisi kolom **No**, **Fakta Lapangan / Gejala Masalah** (diisi pemicu kasus), dan **Identifikasi Akar Masalah & Analisis Siswa (KOSONG MURNI)**.
2. **Sintaks 2: Mengorganisasikan Tugas Belajar (C4)**
   - Sediakan tabel kerja interaktif berisi kolom **Pertanyaan Kunci Penyelidikan** dan kolom **Prediksi / Hipotesis Awal Siswa (KOSONG MURNI)** untuk memandu siswa merencanakan pencarian solusi.
3. **Sintaks 3: Membimbing Penyelidikan Mandiri/Kelompok (C4/C5)**
   - Sediakan ruang isian terstruktur bagi siswa untuk mencatat data baru dengan kolom **Fokus Penyelidikan**, **Data / Temuan Fakta Siswa (KOSONG MURNI)**, dan **Sumber Referensi**.
4. **Sintaks 4: Mengembangkan & Menyajikan Hasil Karya (C6)**
   - Berikan tantangan bagi siswa untuk merancang dan mempresentasikan solusi konkrit. Sediakan tabel rancangan dengan kolom **Nama Gagasan Solusi**, **Langkah Implementasi Siswa (KOSONG MURNI)**, dan **Rancangan / Sketsa Solusi**.
5. **Sintaks 5: Menganalisis & Mengevaluasi Solusi (C5/C6)**
   - Sediakan tabel evaluasi akhir dengan kolom **Kelebihan Solusi yang Diajukan**, **Tantangan / Risiko**, dan **Rencana Tindak Lanjut (KOSONG MURNI)**.`;
    } else if (modelLower.includes("pjbl") || modelLower.includes("project")) {
      modelTitle = "F. PROYEK KREATIF SISWA (PROJECT-BASED LEARNING)";
      modelSteps = `Rancang kegiatan dan pengerjaan LKPD ini dengan mengikuti **Sintaks Pembelajaran Project-Based Learning (PjBL)** abad 21 secara ketat yang disajikan dalam bentuk tabel kerja interaktif untuk DIKERJAKAN OLEH SISWA:
(⚠️ PERINGATAN: Kolom perencanaan/jawaban siswa WAJIB BERUPA SEL KOSONG MURNI, JANGAN PERNAH DIISI JAWABANNYA LANGSUNG OLEH AI!)

1. **Sintaks 1: Pertanyaan Mendasar & Ide Proyek (C3/C4)**
   - Pandu siswa menetapkan ide proyek kreatif untuk memecahkan masalah esensial. Sediakan tabel berisi kolom **Tantangan Nyata**, **Gagasan Proyek Kelompok (KOSONG MURNI)**, dan **Relevansi Solusi**.
2. **Sintaks 2: Perencanaan Langkah-Langkah Proyek (C4/C5)**
   - Sediakan tabel perencanaan proyek interaktif berisi kolom **Tahapan Aktivitas**, **Alat & Bahan**, dan **Pembagian Peran Anggota (KOSONG MURNI)**.
3. **Sintaks 3: Penyusunan Jadwal (Time Schedule) (C4)**
   - Sediakan tabel manajemen waktu berisi kolom **Hari/Tanggal**, **Target Aktivitas**, dan **Indikator Keberhasilan (KOSONG MURNI)**.
4. **Sintaks 4: Monitoring dan Pengembangan Proyek (C5/C6)**
   - Sediakan lembar monitoring kemajuan proyek dengan kolom **Tahapan Kerja**, **Kendala yang Ditemui (KOSONG MURNI)**, dan **Solusi / Adaptasi Langkah**.
5. **Sintaks 5: Menguji Hasil / Evaluasi Produk (C5/C6)**
   - Sediakan tabel uji kelayakan produk berisi kolom **Kriteria Keberhasilan**, **Hasil Uji Coba Lapangan (KOSONG MURNI)**, dan **Catatan Masukan Rekan Sejawat**.
6. **Sintaks 6: Evaluasi Pengalaman Belajar (C6)**
   - Sediakan tabel refleksi akhir proyek berisi kolom **Kompetensi Baru yang Dikuasai** dan **Rekomendasi Pengembangan (KOSONG MURNI)**.`;
    } else if (modelLower.includes("inquiry") || modelLower.includes("discovery")) {
      modelTitle = "F. PENYELIDIKAN ILMIAH MANDIRI (INQUIRY / DISCOVERY LEARNING)";
      modelSteps = `Rancang kegiatan dan pengerjaan LKPD ini dengan mengikuti **Sintaks Pembelajaran Inquiry/Discovery Learning** secara ketat yang disajikan dalam bentuk tabel kerja interaktif untuk DIKERJAKAN OLEH SISWA:
(⚠️ PERINGATAN: Kolom respon/hipotesis/temuan siswa WAJIB BERUPA SEL KOSONG MURNI, JANGAN PERNAH DIISI JAWABANNYA LANGSUNG OLEH AI!)

1. **Sintaks 1: Stimulasi & Rumusan Pertanyaan (C3/C4)**
   - Sediakan tabel berisi kolom **Gejala/Fenomena Teramati** (diisi stimulus kasus) dan kolom **Rumusan Pertanyaan Kritis Siswa (KOSONG MURNI)**.
2. **Sintaks 2: Pengajuan Hipotesis (C4)**
   - Sediakan tabel interaktif berisi kolom **Pertanyaan Penyelidikan** dan kolom **Hipotesis / Dugaan Awal Siswa (KOSONG MURNI)**.
3. **Sintaks 3: Pengumpulan Data & Eksperimen (C4/C5)**
   - Sediakan tabel pencatatan data terstruktur berisi kolom **Aspek / Parameter Diamati**, **Hasil Pengamatan Siswa (KOSONG MURNI)**, dan **Keterangan Tambahan**.
4. **Sintaks 4: Pengolahan & Analisis Data (C5)**
   - Sediakan tabel analisis berisi kolom **Hubungan Antar-Variabel**, **Pola Temuan Siswa (KOSONG MURNI)**, dan **Kesesuaian dengan Konsep Teori**.
5. **Sintaks 5: Pembuktian (Verifikasi) (C5/C6)**
   - Sediakan ruang isian untuk membuktikan apakah hipotesis diterima/ditolak dengan kolom **Hipotesis Awal**, **Bukti Data Nyata Siswa (KOSONG MURNI)**, dan **Kesimpulan Pembuktian**.
6. **Sintaks 6: Generalisasi / Menarik Kesimpulan (C6)**
   - Sediakan lembar konseptualisasi akhir berisi kolom **Prinsip Baru yang Ditemukan (KOSONG MURNI)** dan **Penerapan Nyata dalam Keseharian**.`;
    } else if (modelLower.includes("kontekstual") || modelLower.includes("ctl")) {
      modelTitle = "F. EKSPLORASI KONTEKSTUAL LINGKUNGAN (CONTEXTUAL TEACHING & LEARNING)";
      modelSteps = `Rancang kegiatan dan pengerjaan LKPD ini dengan mengikuti **Komponen Utama Contextual Teaching and Learning (CTL)** secara ketat yang disajikan dalam bentuk tabel kerja interaktif untuk DIKERJAKAN OLEH SISWA:
(⚠️ PERINGATAN KERAS: Kolom respon/analisis siswa WAJIB BERUPA SEL KOSONG MURNI! DILARANG KERAS MENULISKAN JAWABAN/ANALISIS DI KOLOM SISWA!)

1. **Komponen 1: Konstruktivisme & Penemuan (Inquiry) (C3/C4)**
   - Hubungkan pemahaman teoretis siswa dengan fakta penyimpangan/kasus di Stimulus. Sajikan tabel analisis berisi 4 kolom lengkap:
     - Kolom 1: **No**
     - Kolom 2: **Transaksi / Fakta Kasus Nyata** (tuliskan 3-4 butir kasus/transaksi pemicunya di sini secara jelas)
     - Kolom 3: **Prinsip / Konsep yang Dianalisis** (WAJIB KOSONG MURNI)
     - Kolom 4: **Analisis Kritis & Argumentasi Siswa (Mengapa Tindakan Ini Salah?)** (WAJIB KOSONG MURNI)
   *Ingat: Kolom 3 dan Kolom 4 WAJIB kosong murni agar siswa yang menganalisis dan mengisinya sendiri! Kunci jawaban diberikan di Bagian J khusus Guru.*
2. **Komponen 2: Masyarakat Belajar & Pemodelan (Modeling) (C4)**
   - Fasilitasi kerja kelompok konkrit. Sediakan tabel analisis berisi kolom **Kasus / Model Percontohan** dan kolom **Ide Penerapan Solusi oleh Kelompok (KOSONG MURNI)**.
3. **Komponen 3: Pertanyaan Kritis & Penilaian Nyata (Authentic Assessment) (C5/C6)**
   - Sediakan tabel pemecahan masalah nyata dengan kolom **Fenomena Masalah Terpilih**, **Usulan Solusi Kelompok (KOSONG MURNI)**, dan **Rencana Aksi Nyata Terdekat (KOSONG MURNI)**.`;
    } else {
      modelTitle = "F. KEGIATAN & TANTANGAN PEMBELAJARAN DEEP LEARNING (EXPERIENTIAL LEARNING)";
      modelSteps = `Rancang kegiatan dan pengerjaan LKPD ini dengan menerapkan siklus **Experiential Deep Learning** secara ketat yang disajikan dalam bentuk tabel kerja interaktif untuk DIKERJAKAN OLEH SISWA:
(⚠️ PERINGATAN: Kolom jawaban/analisis siswa WAJIB BERUPA SEL KOSONG MURNI, JANGAN PERNAH DIISI JAWABANNYA LANGSUNG OLEH AI!)

1. **Siklus 1: Mengalami Konkrit (Concrete Experience - C3/C4)**
   - Sediakan aktivitas terstruktur bagi siswa untuk melakukan observasi konkrit atau simulasi berdasarkan stimulus. Sajikan tabel pengamatan berisi kolom **No**, **Aspek Kasus / Fenomena Diamati**, dan **Temuan Pengamatan Siswa (KOSONG MURNI)**.
2. **Siklus 2: Refleksi Observatif (Reflective Observation - C4/C5)**
   - Sediakan tabel diskusi kelompok/individu berisi kolom **Fakta Kasus Lapangan**, **Mengapa Hal Ini Terjadi? (KOSONG MURNI)**, dan **Konsekuensi / Dampak Analisis Siswa (KOSONG MURNI)**.
3. **Siklus 3: Konseptualisasi Abstrak (Abstract Conceptualization - C5/C6)**
   - Sediakan lembar pemetaan konsep untuk merumuskan prinsip inti dengan kolom **Konsep Utama**, **Pemahaman Baru Siswa (KOSONG MURNI)**, dan **Rumusan Generalisasi Siswa**.
4. **Siklus 4: Eksperimentasi Aktif (Active Experimentation - C6)**
   - Sediakan tantangan pemecahan masalah dengan kolom **Skenario Masalah Baru**, **Rancangan Solusi Kreatif Siswa (KOSONG MURNI)**, dan **Langkah Konkret Eksekusi**.`;
    }

    return `### ${modelTitle}\n${modelSteps}`;
  };

  const handleLKPDSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLKPDModalOpen(false);

    const namaSekolahFinal = userProfile.namaSekolah || "[Nama Sekolah]";
    const namaPenyusunFinal = userProfile.namaPenyusun || "[Nama Penyusun]";
    const nipPenyusunFinal = userProfile.nipPenyusun || "";
    const tahunPelajaranFinal = userProfile.tahunPelajaran || "2024/2025";

    const jpCalculated = parseInt(lkpdForm.jumlahPertemuan || "1") * 2;
    const alokasiWaktuFinal = `${lkpdForm.jumlahPertemuan || "1"} Pertemuan (${jpCalculated} JP @ 2 x 45 Menit)`;

    const hasFokus = lkpdForm.fokusAktivitas && lkpdForm.fokusAktivitas.trim();
    const hasSubMateri = lkpdForm.subMateri && lkpdForm.subMateri.length > 0;
    const subMateriStr = hasSubMateri ? lkpdForm.subMateri.join(", ") : "";
    const isIndividu = lkpdForm.tipeAktivitas.toLowerCase().includes("individu");

    const headerTitle = hasFokus 
      ? `TOPIK : ${lkpdForm.fokusAktivitas.trim().toUpperCase()}` 
      : (hasSubMateri 
          ? `BAB : ${lkpdForm.materi.toUpperCase()} (SUB-MATERI : ${lkpdForm.subMateri.join(", ").toUpperCase()})` 
          : `BAB : ${lkpdForm.materi.toUpperCase()}`);

    const subMateriPrompt = hasSubMateri
      ? `3. **Materi Pokok Esensial & Sub-Materi Terfokus**: Jabarkan konsep-konsep kunci esensial secara KHUSUS hanya untuk sub-materi terpilih: **${subMateriStr}** (bagian dari materi ${lkpdForm.materi}). Pembahasan harus tajam, terarah, sangat detail, mendalam, dan komprehensif mengupas tuntas sub-materi tersebut (tidak melebar ke pokok bab lain).`
      : (hasFokus
        ? `3. **Materi Pokok Esensial & Sub-Materi (TERPADU & SPESIFIK)**: Jabarkan konsep-konsep kunci esensial secara KHUSUS hanya untuk fokus materi **${lkpdForm.fokusAktivitas.trim()}** (sebagai bagian dari ${lkpdForm.materi}). JANGAN membawa, menguraikan, atau membahas materi bab ${lkpdForm.materi} lainnya secara luas di luar fokus khusus ini. Pembahasan materi harus terfokus, mendalam, sangat detail, dan komprehensif hanya untuk materi yang difokuskan ini.`
        : `3. **Materi Pokok Esensial & Sub-Materi**: Jabarkan konsep-konsep kunci esensial dari materi **${lkpdForm.materi}** yang harus dikuasai peserta didik.`);

    const stimulusVariasi = lkpdForm.variasiStimulus || "Multi-Stimulus Lengkap (Kasus Narasi + Bukti Dokumen/Data + Dialog Dilema)";

    const stimulusPrompt = `Sajikan **VARIASI MULTI-STIMULUS DUNIA NYATA YANG KAYA, DINAMIS & HETEROGEN** (${stimulusVariasi}) agar TIDAK terkesan sejenis atau monoton. Sajikan minimal 3 bentuk stimulus konkret berbeda yang saling melengkapi terkait ${hasSubMateri ? `sub-materi **${subMateriStr}**` : (hasFokus ? `fokus materi **${lkpdForm.fokusAktivitas.trim()}**` : `materi **${lkpdForm.materi}**`)}:
1. **Stimulus 1: Studi Kasus Naratif & Realitas Lapangan (Dilema Praktis)**
   Sajikan studi kasus kontekstual mendalam di dunia nyata/kehidupan sehari-hari (misal dinamika operasional UMKM, industri kreatif, rekayasa lingkungan, atau interaksi sosial) yang memuat problematika atau dilema nyata.
2. **Stimulus 2: Data Faktual / Cuplikan Dokumen Bukti / Tabel Angka Riil**
   Sajikan bukti konkret non-narasi (misalnya: cuplikan nota/faktur transaksi, tabel data keuangan/analisis, grafik statistik tekstual, catatan logistik, atau bukti rekam data otentik) yang menjadi objek telaah objektif peserta didik.
3. **Stimulus 3: Dialog Dilematis / Silang Pendapat Tokoh (Polemik Kritis)**
   Sajikan percakapan singkat 2-3 orang (misal antara pemilik usaha, manajer, staf, akuntan, atau konsumen) yang berdebat dengan pandangan bertolak belakang mengenai keputusan dalam kasus tersebut, sehingga memancing nalar kritis siswa.
*Catatan Penting*: Variasikan sektor dan profil kasus agar kaya perspektif dan tidak berulang dalam pola yang sama!`;

    const identitasSiswaPrompt = isIndividu
      ? `### C. IDENTITAS PESERTA DIDIK & PETUNJUK KERJA
Sajikan tabel identitas pengisian Nama Siswa, Kelas, NISN, dan Hari/Tanggal (karena ini adalah LKPD INDIVIDU/MANDIRI), diikuti petunjuk teknis pengerjaan LKPD yang jelas.`
      : `### C. IDENTITAS KELOMPOK & PETUNJUK KERJA
Sajikan tabel identitas pengisian Nama Kelompok, Anggota Kelompok, Kelas, dan Hari/Tanggal (karena ini adalah LKPD KELOMPOK/KOLABORATIF), diikuti petunjuk teknis pengerjaan LKPD kelompok yang jelas.`;

    const fokusAktivitasInstruction = (hasSubMateri || hasFokus) ? `
**⚠️ PENTING - BATASAN RUANG LINGKUP SUB-MATERI & FOKUS (SANGAT STRICT):**
Pengguna mengunci ruang lingkup LKPD ini agar difokuskan HANYA pada ${hasSubMateri ? `sub-materi: "${subMateriStr}"` : ""} ${hasFokus ? `dengan fokus khusus: "${lkpdForm.fokusAktivitas.trim()}"` : ""}.
Oleh karena itu, Anda WAJIB membatasi ruang lingkup seluruh bagian dokumen LKPD (materi ringkas, tantangan investigasi, stimulus kasus, tabel kerja siswa) secara eksklusif hanya untuk materi tersebut. Jangan menyertakan materi bab luas ${lkpdForm.materi} lainnya. Ini sangat krusial agar LKPD berorientasi tujuan khusus, terarah, dan tidak bias!` : "";

    const isAkuntansiEkonomi = 
      (lkpdForm.mapel.toLowerCase().includes("ekonomi") || lkpdForm.mapel.toLowerCase().includes("akuntansi")) &&
      (lkpdForm.materi.toLowerCase().includes("jasa") ||
       lkpdForm.materi.toLowerCase().includes("dagang") ||
       lkpdForm.materi.toLowerCase().includes("akuntansi") ||
       lkpdForm.includeBuktiTransaksiLengkap ||
       (lkpdForm.subMateri && lkpdForm.subMateri.some(s => s.toLowerCase().includes("jurnal") || s.toLowerCase().includes("buku besar") || s.toLowerCase().includes("bukti transaksi") || s.toLowerCase().includes("penyesuaian") || s.toLowerCase().includes("kertas kerja") || s.toLowerCase().includes("dagang") || s.toLowerCase().includes("jasa"))));

    const isPerusahaanDagang = 
      lkpdForm.materi.toLowerCase().includes("dagang") || 
      (lkpdForm.subMateri && lkpdForm.subMateri.some(s => s.toLowerCase().includes("dagang") || s.toLowerCase().includes("khusus") || s.toLowerCase().includes("hpp")));

    const akuntansiStimulusPrompt = `Sajikan studi kasus praktikum akuntansi secara lengkap, mendalam, dan realistis untuk **${isPerusahaanDagang ? 'Perusahaan Dagang' : 'Perusahaan Jasa'}** dengan komponen berikut:
1. **Profil Entitas Usaha & Kebijakan Akuntansi**:
   - Nama Perusahaan: ${isPerusahaanDagang ? 'UD "Sumber Berkah" / CV Makmur Jaya' : 'Bintang Express / Prima Jaya Service'}
   - Bidang Usaha: ${isPerusahaanDagang ? 'Perdagangan Barang Dagang Komoditas & Retail' : 'Jasa Laundry, Bengkel, atau Salon & Spa Profesional'}
   - Periode Akuntansi: Bulan Desember 2024 (1 - 31 Desember 2024)
   - Kebijakan Akuntansi: ${isPerusahaanDagang ? 'Sistem pencatatan persediaan metode Periodik/Fisik, syarat pembayaran kredit 2/10, n/30, penyusutan aset tetap metode garis lurus 10% per tahun.' : 'Pencatatan pendapatan berbasis akrual, penyusutan aset tetap metode garis lurus, beban dibayar di muka dicatat dengan pendekatan harta.'}
2. **Daftar Akun / Chart of Accounts (Lengkap dengan Nomor Kode Akun)**:
   Sajikan tabel kode akun (101 Kas, 102 Piutang Usaha, ${isPerusahaanDagang ? '103 Persediaan Barang Dagang, 104 Perlengkapan Toko, 105 Sewa Dibayar di Muka, 121 Peralatan Toko, 122 Akumulasi Penyusutan Peralatan, 201 Utang Usaha, 202 Utang Gaji, 301 Modal Pemilik, 302 Prive Pemilik, 401 Penjualan, 402 Retur Penjualan, 403 Potongan Penjualan, 501 Pembelian, 502 Retur Pembelian, 503 Potongan Pembelian, 504 Beban Angkut Pembelian, 601 Beban Gaji, 602 Beban Sewa, 603 Beban Perlengkapan, 604 Beban Penyusutan' : '103 Perlengkapan, 104 Sewa Dibayar di Muka, 121 Peralatan, 122 Akumulasi Penyusutan Peralatan, 201 Utang Usaha, 202 Utang Gaji, 301 Modal Pemilik, 302 Prive Pemilik, 401 Pendapatan Jasa, 601 Beban Gaji Karyawan, 602 Beban Sewa Tempat, 603 Beban Perlengkapan, 604 Beban Penyusutan, 605 Beban Listrik, Air & Telepon'}).
3. **Neraca Saldo Awal per 1 Desember 2024**:
   Sajikan tabel Neraca Saldo Awal yang balance (seimbang Debit = Kredit).
4. **PAKET DOKUMEN BUKTI TRANSAKSI OTENTIK (MINIMAL 8 - 10 DOKUMEN TRANSAKSI LENGKAP TERTANGGAL 1 - 31 DESEMBER 2024)**:
   Sajikan setiap bukti transaksi dalam format Tabel Box Bukti Transaksi Otentik berbingkai rapi (memuat No Dokumen, Tanggal, Pihak Terkait, Jumlah Nominal Rp, Terbilang, Keterangan/Uraian Transaksi, dan Tanda Tangan Kasir/Otorisator):
   - **Bukti 1 (Kuitansi / Bukti Kas Masuk - BKM)**: Penerimaan setoran modal / pelunasan piutang pelanggan.
   - **Bukti 2 (Faktur Pembelian / Penjualan Kredit)**: Transaksi kredit dengan syarat pembayaran 2/10, n/30 (memuat kuantitas, deskripsi barang/jasa, harga satuan, dan total Rp).
   - **Bukti 3 (Nota Kontan)**: Transaksi pembelian / penjualan tunai.
   - **Bukti 4 (Bukti Kas Keluar - BKK)**: Pembayaran beban operasional / pembayaran sewa tempat.
   - **Bukti 5 (Nota Debet / Nota Kredit)**: Retur pengembalian barang rusak atau penyesuaian harga.
   - **Bukti 6 (Kuitansi / Bukti Kas Masuk)**: Penerimaan pendapatan operasional tunai.
   - **Bukti 7 (Bukti Kas Keluar)**: Pengambilan uang pribadi oleh pemilik (Prive).
   - **Bukti 8 (Bukti Kas Keluar)**: Pembayaran utang usaha kepada pemasok.
   - **Bukti 9 & 10 (Bukti Memorial / Memo Internal Penyesuaian)**: Data penyesuaian per 31 Desember 2024 (sisa perlengkapan belum terpakai, sewa jatuh tempo, beban gaji terutang, penyusutan aset tetap, dan saldo akhir persediaan).`;

    const akuntansiWorkbookPrompt = `### F. LEMBAR KERJA PRAKTIKUM PESERTA DIDIK (STUDENT WORKBOOK - ALL BORDERS TABEL KOSONG SIAP DIKERJAKAN)
Sediakan seluruh format lembar kerja praktikum siklus akuntansi lengkap dan terstruktur.

⚠️ **ATURAN MUTLAK FORMAT TABEL LEMBAR KERJA SISWA (BAGIAN F)**:
1. **KOSONGKAN SELURUH ISI BARIS ISIAN SISWA (CLEAN BLANK CELLS)**: Dilarang keras menuliskan petunjuk/guide teks di dalam baris jawaban siswa seperti "(Pembayaran sewa ruko dimuka)", "(Pembelian peralatan kredit)", "(Retur ...)", "(Menutup akun ...)", dll. Seluruh baris isian siswa harus berupa sel kosong murni agar siswa dapat menganalisis dan menuliskan akun serta angkanya sendiri dari awal sampai akhir!
2. **DILARANG MENGGUNAKAN TITIK-TITIK GANGGU**: Jangan gunakan rentetan titik-titik (seperti ".................." atau ".. / ..") di dalam sel tabel karena merusak presisi batas kolom saat dicetak. Gunakan sel kosong bergaris bersih.
3. **KERTAS KERJA / NERACA LAJUR 10 KOLOM**: Wajib dibungkus dengan tag \`<div class="page-landscape landscape-table">\` dan ditutup dengan \`</div>\` agar otomatis tercetak dalam 1 halaman Landscape penuh yang lebar, rapi, dan presisi tanpa pemotongan kolom.

${isPerusahaanDagang ? `
1. **Tabel Kerja 1: Identifikasi & Analisis Dokumen Bukti Transaksi**
| Tanggal | No. Bukti Transaksi | Akun yang Didebit | Akun yang Dikredit | Jumlah (Rp) |
| :---: | :---: | :--- | :--- | :---: |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
*(Sediakan minimal 8-10 baris kosong murni)*

2. **Tabel Kerja 2: Lembar Jurnal Khusus & Jurnal Memorial (Perusahaan Dagang)**
- **A. Jurnal Pembelian**
| Tanggal | No. Faktur | Keterangan / Kreditur | Syarat | Ref | Pembelian (D) | Perlengkapan (D) | Serba-Serbi (D) | Utang Usaha (K) |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| **TOTAL** | | | | | | | | |

- **B. Jurnal Penjualan**
| Tanggal | No. Faktur | Keterangan / Debitur | Syarat | Ref | Piutang Usaha (D) / Penjualan (K) |
| :---: | :---: | :--- | :---: | :---: | :---: |
| | | | | | |
| | | | | | |
| **TOTAL** | | | | | |

- **C. Jurnal Penerimaan Kas**
| Tanggal | No. Bukti | Keterangan | Ref | Kas (D) | Pot. Penjualan (D) | Piutang Usaha (K) | Penjualan (K) | Serba-Serbi (K) |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| | | | | | | | | |
| | | | | | | | | |
| **TOTAL** | | | | | | | | |

- **D. Jurnal Pengeluaran Kas**
| Tanggal | No. Bukti | Keterangan | Ref | Utang Usaha (D) | Pembelian (D) | Beban/Serba-Serbi (D) | Kas (K) | Pot. Pembelian (K) |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| | | | | | | | | |
| | | | | | | | | |
| **TOTAL** | | | | | | | | |

- **E. Jurnal Memorial**
| Tanggal | No. Bukti | Nama Akun & Keterangan | Ref | Debit (Rp) | Kredit (Rp) |
| :---: | :---: | :--- | :---: | :---: | :---: |
| | | | | | |
| | | | | | |
| **TOTAL** | | | | | |

3. **Tabel Kerja 3: Lembar Buku Besar Utama & Buku Besar Pembantu**
Sajikan format tabel Buku Besar Utama 4 kolom dan Buku Besar Pembantu Piutang/Utang dengan baris-baris kosong murni siap diisi.

4. **Tabel Kerja 4: Format Neraca Saldo Perusahaan Dagang**
| No. Akun | Nama Akun | Ref | Debit (Rp) | Kredit (Rp) |
| :---: | :--- | :---: | :---: | :---: |
| 101 | Kas | | | |
| 102 | Piutang Usaha | | | |
| 103 | Persediaan Barang Dagang | | | |
| 104 | Perlengkapan Toko | | | |
| 105 | Sewa Dibayar di Muka | | | |
| 121 | Peralatan Toko | | | |
| 122 | Akumulasi Penyusutan Peralatan | | | |
| 201 | Utang Usaha | | | |
| 301 | Modal Pemilik | | | |
| 302 | Prive Pemilik | | | |
| 401 | Penjualan | | | |
| 402 | Retur Penjualan | | | |
| 403 | Potongan Penjualan | | | |
| 501 | Pembelian | | | |
| 502 | Retur Pembelian | | | |
| 503 | Potongan Pembelian | | | |
| 504 | Beban Angkut Pembelian | | | |
| 601 | Beban Gaji Karyawan | | | |
| 602 | Beban Sewa Toko | | | |
| **TOTAL** | | | | |

5. **Tabel Kerja 5: Format Perhitungan HPP & Jurnal Penyesuaian (AJP)**
- Format lembar perhitungan Harga Pokok Penjualan (HPP) bergaris bersih.
- Format tabel Jurnal Penyesuaian dengan baris kosong murni.

<div class="page-landscape landscape-table">

6. **Tabel Kerja 6: Format Kertas Kerja / Neraca Lajur 10 Kolom Perusahaan Dagang (Halaman Landscape)**

| No | Nama Akun | Neraca Saldo (D) | Neraca Saldo (K) | Penyesuaian (D) | Penyesuaian (K) | NSD (D) | NSD (K) | Laba Rugi (D) | Laba Rugi (K) | Neraca (D) | Neraca (K) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 101 | Kas | | | | | | | | | | |
| 102 | Piutang Usaha | | | | | | | | | | |
| 103 | Persediaan Barang Dagang | | | | | | | | | | |
| 104 | Perlengkapan Toko | | | | | | | | | | |
| 105 | Sewa Dibayar di Muka | | | | | | | | | | |
| 121 | Peralatan Toko | | | | | | | | | | |
| 122 | Akum. Peny. Peralatan | | | | | | | | | | |
| 201 | Utang Usaha | | | | | | | | | | |
| 301 | Modal Pemilik | | | | | | | | | | |
| 302 | Prive Pemilik | | | | | | | | | | |
| 401 | Penjualan | | | | | | | | | | |
| 402 | Retur Penjualan | | | | | | | | | | |
| 403 | Potongan Penjualan | | | | | | | | | | |
| 501 | Pembelian | | | | | | | | | | |
| 502 | Retur Pembelian | | | | | | | | | | |
| 503 | Potongan Pembelian | | | | | | | | | | |
| 504 | Beban Angkut Pembelian | | | | | | | | | | |
| 601 | Beban Gaji Karyawan | | | | | | | | | | |
| 602 | Beban Sewa Toko | | | | | | | | | | |
| 603 | Beban Perlengkapan Toko | | | | | | | | | | |
| 604 | Beban Penyusutan Peralatan | | | | | | | | | | |
| | **TOTAL** | | | | | | | | | | |
| | **LABA / (RUGI) BERSIH** | | | | | | | | | | |
| | **TOTAL AKHIR SEIMBANG** | | | | | | | | | | |

</div>

7. **Tabel Kerja 7: Format Laporan Keuangan Perusahaan Dagang**
Sajikan format Laporan Laba Rugi bentuk Bertahap (Multiple Step), Laporan Perubahan Ekuitas, dan Neraca dalam tabel markdown bergaris rapi dengan kolom isian angka yang bersih.

8. **Tabel Kerja 8: Format Jurnal Penutup & Neraca Saldo Setelah Penutupan**
Sajikan format tabel Jurnal Penutup dan Neraca Saldo Setelah Penutupan dengan baris kosong murni.
` : `
1. **Tabel Kerja 1: Identifikasi & Analisis Bukti Transaksi**
| Tanggal | No. Bukti Transaksi | Akun Didebit | Akun Dikredit | Jumlah (Rp) |
| :---: | :---: | :--- | :--- | :---: |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
*(Sediakan 8-10 baris kosong murni)*

2. **Tabel Kerja 2: Lembar Jurnal Umum Perusahaan Jasa**
| Tanggal | No. Bukti | Nama Akun & Keterangan | Ref | Debit (Rp) | Kredit (Rp) |
| :---: | :---: | :--- | :---: | :---: | :---: |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| **TOTAL** | | | | | |
*(Seluruh baris kosong murni, tanpa ada teks guide seperti "(Pembayaran sewa ...)")*

3. **Tabel Kerja 3: Lembar Buku Besar Utama (Bentuk 4 Kolom Saldo)**
Sajikan tabel akun buku besar (Kas 101, Piutang 102, Perlengkapan 103, Sewa Dibayar di Muka 104, Peralatan 121, Akum. Penyusutan 122, Utang Usaha 201, Utang Gaji 202, Modal 301, Prive 302, Pendapatan Jasa 401, Beban-Beban).
Contoh Format Akun:
#### Nama Akun: Kas (No. Akun: 101)
| Tanggal | Keterangan | Ref | Debit (Rp) | Kredit (Rp) | Saldo Debit (Rp) | Saldo Kredit (Rp) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| 1 Des | Saldo Awal | ✓ | - | - | 45.000.000 | - |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
*(Baris posting berikutnya KOSONG MURNI tanpa ada tulisan "JU-1" atau titik-titik)*

4. **Tabel Kerja 4: Format Neraca Saldo Sebelum Penyesuaian**
| No. Akun | Nama Akun | Ref | Debit (Rp) | Kredit (Rp) |
| :---: | :--- | :---: | :---: | :---: |
| 101 | Kas | | | |
| 102 | Piutang Usaha | | | |
| 103 | Perlengkapan Bengkel | | | |
| 104 | Sewa Dibayar di Muka | | | |
| 121 | Peralatan Bengkel | | | |
| 122 | Akumulasi Penyusutan Peralatan | | | |
| 201 | Utang Usaha | | | |
| 202 | Utang Gaji | | | |
| 301 | Modal Tuan Prima | | | |
| 302 | Prive Tuan Prima | | | |
| 401 | Pendapatan Jasa | | | |
| **TOTAL** | | | | |
*(Kolom Ref, Debit, Kredit KOSONG MURNI untuk diisi sendiri oleh siswa)*

5. **Tabel Kerja 5: Format Ayat Jurnal Penyesuaian (AJP)**
| Tanggal | Nama Akun & Keterangan | Ref | Debit (Rp) | Kredit (Rp) |
| :---: | :--- | :---: | :---: | :---: |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| **TOTAL** | | | | |
*(Baris kosong murni tanpa keterangan dalam kurung)*

<div class="page-landscape landscape-table">

6. **Tabel Kerja 6: Format Kertas Kerja / Neraca Lajur 10 Kolom (Halaman Landscape)**

| No | Nama Akun | Neraca Saldo (D) | Neraca Saldo (K) | Penyesuaian (D) | Penyesuaian (K) | NSD (D) | NSD (K) | Laba Rugi (D) | Laba Rugi (K) | Neraca (D) | Neraca (K) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 101 | Kas | | | | | | | | | | |
| 102 | Piutang Usaha | | | | | | | | | | |
| 103 | Perlengkapan Bengkel | | | | | | | | | | |
| 104 | Sewa Dibayar di Muka | | | | | | | | | | |
| 121 | Peralatan Bengkel | | | | | | | | | | |
| 122 | Akum. Peny. Peralatan | | | | | | | | | | |
| 201 | Utang Usaha | | | | | | | | | | |
| 202 | Utang Gaji | | | | | | | | | | |
| 301 | Modal Tuan Prima | | | | | | | | | | |
| 302 | Prive Tuan Prima | | | | | | | | | | |
| 401 | Pendapatan Jasa | | | | | | | | | | |
| 601 | Beban Gaji Karyawan | | | | | | | | | | |
| 602 | Beban Sewa Tempat | | | | | | | | | | |
| 603 | Beban Perlengkapan | | | | | | | | | | |
| 604 | Beban Penyusutan Peralatan | | | | | | | | | | |
| 605 | Beban Listrik, Air & Telepon | | | | | | | | | | |
| | **TOTAL** | | | | | | | | | | |
| | **LABA / (RUGI) BERSIH** | | | | | | | | | | |
| | **TOTAL AKHIR SEIMBANG** | | | | | | | | | | |

</div>

7. **Tabel Kerja 7: Format Laporan Keuangan Lengkap**
Sajikan 3 tabel terpisah yang rapi:
- Laporan Laba Rugi (Format Tabel Bergaris dengan kolom Uraian dan Kolom Nominal Bersih)
- Laporan Perubahan Ekuitas (Format Tabel Bergaris Bersih)
- Laporan Posisi Keuangan / Neraca (Format Tabel Bergaris Bersih 4 Kolom: Aset | Nominal | Liabilitas & Ekuitas | Nominal)

8. **Tabel Kerja 8: Format Jurnal Penutup & Neraca Saldo Setelah Penutupan**
- Format Jurnal Penutup dengan 10-12 baris kosong murni.
- Format Neraca Saldo Setelah Penutupan dengan daftar akun riil dan kolom nominal kosong.
`}`;

    const akuntansiTeacherKeyPrompt = `### J. PANDUAN FASILITASI GURU: KUNCI JAWABAN AKUNTANSI LENGKAP & PEDOMAN PENSKORAN (KHUSUS PENDIDIK)
Sebagai pegangan pendidik, Anda WAJIB menyajikan kunci jawaban yang 100% lengkap, matematis akurat, dan seimbang (balance):
1. **Kunci Analisis Bukti Transaksi**: Tabel analisis akun debit/kredit dan nominal untuk setiap bukti transaksi.
2. **Kunci Jurnal Lengkap**: ${isPerusahaanDagang ? 'Kunci Jurnal Khusus (Pembelian, Penjualan, Penerimaan Kas, Pengeluaran Kas) dan Jurnal Memorial' : 'Kunci Jurnal Umum dua sisi yang seimbang (Total Debit = Total Kredit)'}.
3. **Kunci Rekapitulasi & Saldo Buku Besar**: Saldo akhir masing-masing akun buku besar.
4. **Kunci Neraca Saldo**: Tabel Neraca Saldo sebelum penyesuaian yang seimbang.
5. **Kunci Ayat Jurnal Penyesuaian (AJP)**: Perhitungan dan jurnal penyesuaian tuntas per 31 Desember.
6. **Kunci Kertas Kerja 10 Kolom**: Angka lengkap dan seimbang pada setiap kolom (Neraca Saldo, AJP, NSD, Laba/Rugi, Neraca).
7. **Kunci Laporan Keuangan**:
   - Angka Laba Bersih Operasional
   - Angka Modal Akhir Pemilik
   - Neraca Posisi Keuangan yang seimbang (Total Aset = Total Liabilitas + Ekuitas).
8. **Kunci Jurnal Penutup & Neraca Saldo Setelah Penutupan**.
9. **Pedoman Penskoran & Rubrik Praktikum Akuntansi**: Bobot nilai setiap tahapan siklus akuntansi.`;

    const effectiveStimulusPrompt = isAkuntansiEkonomi ? akuntansiStimulusPrompt : stimulusPrompt;
    const effectiveWorkbookPrompt = isAkuntansiEkonomi ? akuntansiWorkbookPrompt : getLearningModelPrompt(lkpdForm.pendekatan, lkpdForm.jumlahTantangan);
    const effectiveTeacherKeyPrompt = isAkuntansiEkonomi ? akuntansiTeacherKeyPrompt : `### J. PANDUAN FASILITASI GURU: KUNCI JAWABAN ACUAN & PEDOMAN PENSKORAN (KHUSUS PENDIDIK)
Sajikan panduan lengkap untuk guru:
1. **Kunci Jawaban & Contoh Analisis Ideal**: Berikan kunci jawaban dan analisis mendalam untuk setiap butir masalah/tantangan pada Bagian F sebagai pegangan koreksi bagi guru.
2. **Pedoman Penskoran & Nilai**: Berikan indikator bobot nilai per butir soal/tabel agar guru dapat menilai lembar kerja siswa secara adil dan objektif.`;

    const promptText = `Tolong buatkan **LEMBAR KERJA PESERTA DIDIK (LKPD) DEEP LEARNING** yang lengkap, terstruktur, interaktif, dan berpusat pada murid (student-centered) untuk Kurikulum Merdeka dengan detail berikut:

**A. IDENTITAS LKPD:**
- Satuan Pendidikan: ${namaSekolahFinal}
- Mata Pelajaran: ${lkpdForm.mapel}
- Jenjang / Kelas: ${lkpdForm.jenjang} / ${lkpdForm.kelas}
- Elemen Capaian Pembelajaran: ${lkpdForm.elemen || "Sesuaikan dengan Bab & regulasi BSKAP 046/2025"}
- Capaian Pembelajaran (CP) Resmi: ${lkpdForm.cp || "Sesuai Keputusan Kepala BSKAP No. 046/H/KR/2025"}
- Bab / Materi Pokok Esensial: ${lkpdForm.materi}
${hasSubMateri ? `- Sub-Materi Terfokus: ${subMateriStr}\n` : ""}- Metode Pembelajaran: ${lkpdForm.pendekatan}
- Tipe Aktivitas: ${lkpdForm.tipeAktivitas} (LKPD ${isIndividu ? 'Individu/Mandiri' : 'Kelompok/Kolaboratif'})
- Kedalaman Materi: ${lkpdForm.kedalaman}
- Variasi Kasus & Stimulus: ${stimulusVariasi}
- Alokasi Waktu: ${alokasiWaktuFinal}
- Penyusun: ${namaPenyusunFinal} ${nipPenyusunFinal ? `(NIP: ${nipPenyusunFinal})` : ""}
- Tahun Pelajaran: ${tahunPelajaranFinal}
${lkpdForm.instruksiTambahan ? `- Instruksi Tambahan Khusus: ${lkpdForm.instruksiTambahan}\n` : ""}
${fokusAktivitasInstruction}

**⚠️ ATURAN EMAS LKPD (LEMBAR KERJA PESERTA DIDIK - TIDAK TERISI SENDIRI):**
1. **DOKUMEN INI ADALAH INSTRUMEN LEMBAR KERJA SISWA (STUDENT WORKSHEET)**. Peserta didiklah yang akan belajar, menganalisis, dan mengisi lembar kerja ini.
2. **DILARANG KERAS MENGISI SENDIRI JAWABAN/ANALISIS SISWA DI DALAM TABEL KEGIATAN SISWA (BAGIAN F)!**
   - Kolom soal/masalah/transaksi/fakta lapangan disajikan jelas dan detail sebagai pemicu analisis.
   - Seluruh kolom respon siswa (seperti: 'Prinsip yang Dilanggar', 'Analisis Mengapa Tindakan Ini Salah / Kerusakan Konseptual', 'Hipotesis', 'Hasil Penyelidikan', 'Gagasan Solusi Siswa', 'Refleksi Siswa', dll) **WAJIB DIKOSONGKAN atau DIBERI TITIK-TITIK ISIAN: ............................................................** agar lembar kerja ini siap dicetak untuk ditulis tangan atau diketik oleh siswa!
3. **KUNCI JAWABAN LENGKAP UNTUK GURU**:
   Sediakan seluruh kunci jawaban lengkap, contoh analisis ideal, dan pedoman penskoran di bagian paling belakang pada bagian tersendiri:
   **### J. PANDUAN FASILITASI GURU: KUNCI JAWABAN ACUAN & PEDOMAN PENSKORAN (KHUSUS PENDIDIK)**
   Di bagian J inilah Anda sertakan kunci jawaban tuntas untuk setiap tabel tantangan di Bagian F sebagai pegangan koreksi bagi guru.

**KETENTUAN WAJIB STRUKTUR DOKUMEN LKPD (LENGKAP, TERSTRUKTUR & SISTEMATIS):**
Sajikan dokumen ini dalam format Markdown dengan judul header:
# LEMBAR KERJA PESERTA DIDIK (LKPD) DEEP LEARNING - MATA PELAJARAN : ${lkpdForm.mapel.toUpperCase()} - ${headerTitle}

Dokumen WAJIB memuat bagian-bagian berikut secara berurutan:

### A. IDENTITAS LKPD
Sajikan dalam tabel Markdown yang rapi dengan memisahkan baris Penyusun dan NIP (Nama Penyusun dan NIP Penyusun diletakkan di baris yang terpisah, JANGAN digabung):
- Satuan Pendidikan
- Mata Pelajaran
- Kelas / Fase
- Alokasi Waktu
- Nama Penyusun
- NIP Penyusun (Baris Terpisah)
- Tahun Pelajaran

### B. DASAR KURIKULUM & MATERI ESENSIAL
Uraikan secara jelas dan mendalam:
1. **Elemen Capaian Pembelajaran**: Tuliskan nama elemen (${lkpdForm.elemen || "Sesuai regulasi BSKAP"}).
2. **Capaian Pembelajaran (CP) Resmi**: Rujuk langsung dan kutip rumusan CP resmi berdasarkan **Keputusan Kepala BSKAP Nomor 046/H/KR/2025**.
${subMateriPrompt}
4. **Tujuan Pembelajaran (TP)**: Rumuskan 2-3 TP terukur menggunakan Kata Kerja Operasional (KKO) Taksonomi Bloom (sesuaikan agar sinkron dengan fokus materi jika ada).
5. **Indikator Ketercapaian Tujuan Pembelajaran (IKTP)**: Indikator konkret pencapaian kompetensi.

${identitasSiswaPrompt}

${effectiveStimulusPrompt}

### E. PERTANYAAN PEMANTIK (ESSENTIAL QUESTIONS)
Buat 3 pertanyaan reflektif tingkat tinggi yang memicu diskusi awal (kelompok atau individu) terkait variasi stimulus di atas.

${effectiveWorkbookPrompt}

### G. LEMBAR REFLEKSI MANDIRI SISWA (METAKOGNITIF / MINDFUL)
Sajikan tabel refleksi diri peserta didik dengan kolom respons yang kosong / titik-titik untuk diisi siswa:
| Pertanyaan Refleksi Diri Siswa | Uraian Tanggapan Pribadi Siswa |
| :--- | :--- |
| **Apa konsep paling bermakna yang saya temukan dan kuasai hari ini?** | ............................................................ |
| **Bagian mana dari analisis kasus di atas yang paling menantang dan bagaimana saya mengatasinya?** | ............................................................ |
| **Bagaimana saya akan mengaplikasikan pemahaman materi ini dalam kehidupan sehari-hari atau kejuruan saya?** | ............................................................ |

### H. RUBRIK PENILAIAN PROSES & PRODUK (SKALA 1 - 4)
Tabel rubrik penilaian otentik berskala 1 (Perlu Bimbingan), 2 (Cukup), 3 (Baik), 4 (Sangat Baik) beserta indikator terobservasi yang jelas.

### I. TANDA TANGAN PENGESAHAN
<br>
<table style="width: 100%; table-layout: fixed; text-align: center; border: none; margin-top: 40px;">
  <tr>
    <td style="width: 40%; border: none;">Mengetahui,<br><b>Kepala Sekolah</b></td>
    <td style="width: 20%; border: none;"></td>
    <td style="width: 40%; border: none;">.................., ....................<br><b>Guru Mata Pelajaran</b></td>
  </tr>
  <tr>
    <td style="height: 70px; border: none;"></td>
    <td style="border: none;"></td>
    <td style="border: none;"></td>
  </tr>
  <tr>
    <td style="border: none;"><b>${namaSekolahFinal === '[Nama Sekolah]' ? 'Kepala Sekolah' : 'Kepala ' + namaSekolahFinal}</b><br>NIP. ${userProfile.nipKepsek || '....................'}</td>
    <td style="border: none;"></td>
    <td style="border: none;"><b>${namaPenyusunFinal}</b><br>NIP. ${nipPenyusunFinal || '....................'}</td>
  </tr>
</table>

${effectiveTeacherKeyPrompt}

**ATURAN TABEL (ALL BORDER WAJIB):**
Pastikan seluruh tabel dalam LKPD (Tabel Identitas LKPD, Tabel Kelompok & Petunjuk, Tabel Isian Tantangan/Analisis Data, Lembar Refleksi, dan Rubrik Penilaian) dibuat dalam format Tabel Markdown utuh dengan ALL BORDERS (memiliki garis batas tepi dan antar kolom/baris lengkap). JANGAN menggunakan tabel HTML kecuali untuk bagian tanda tangan pengesahan di atas.
PENTING: Seluruh teks narasi, penjelasan, stimulus, dan petunjuk dalam LKPD (terutama di dalam kolom tabel atau deskripsi) harus ditulis dengan format rata kiri-kanan (justify) agar rapih.

Mohon susun LKPD ini secara tuntas dan mendalam dengan identitas lengkap, namun kolom lembar kerja siswa di Bagian F WAJIB dibiarkan kosong/diberi titik-titik isian agar siap dicetak dan dikerjakan sendiri oleh siswa.`;

    let finalPrompt = promptText;
    let fileData = undefined;
    
    if (lkpdForm.fileBase64) {
      finalPrompt += `\n\n- Referensi Materi (terlampir): Mohon gunakan dokumen referensi terlampir sebagai acuan utama atau bahan stimulasi dalam LKPD ini.`;
      fileData = {
        base64: lkpdForm.fileBase64,
        mimeType: lkpdForm.fileMimeType,
        name: lkpdForm.fileName
      };
    }

    handleSubmit(undefined, finalPrompt, fileData);
  };

  const handlePenilaianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPenilaianModalOpen(false);
    setIsLoading(true);

    const userMsgText = `📌 **Penilaian & Koreksi AI (${penilaianForm.method === "scan_pdf" ? "Pindai Lembar Jawaban PDF/Gambar" : "Input Teks"})**
- **Mata Pelajaran**: ${penilaianForm.mapel}
- **Kelas**: ${penilaianForm.kelas}
- **Nama Siswa**: ${penilaianForm.namaSiswa || "[Dipindai dari Dokumen]"}
- **Bentuk Soal**: ${penilaianForm.questionTypes.join(", ")}
${penilaianForm.fileName ? `- **File Lembar Jawaban**: ${penilaianForm.fileName}` : ""}`;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMsgText
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    saveCurrentSession(newMessages);

    try {
      const res = await fetch("/api/penilaian-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: penilaianForm.method,
          mapel: penilaianForm.mapel,
          kelas: penilaianForm.kelas,
          namaSiswa: penilaianForm.namaSiswa,
          kunciJawaban: penilaianForm.kunciJawaban,
          jawabanSiswaText: penilaianForm.jawabanSiswaText,
          fileBase64: penilaianForm.fileBase64,
          fileMimeType: penilaianForm.fileMimeType,
          questionTypes: penilaianForm.questionTypes
        })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server error (${res.status}): ${responseText.slice(0, 150)}`);
      }

      if (!res.ok) throw new Error(data.error || data.details || "Gagal melakukan koreksi AI.");

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.markdownReport || `### 📊 HASIL PENILAIAN AI (SKOR TOTAL: ${data.totalScore}/${data.maxScore || 100})\n\n**Nama Siswa:** ${data.namaSiswa}\n**Mata Pelajaran:** ${data.mapel} (${data.kelas})\n**Predikat:** ${data.grade}\n\n${data.analysis}\n\n**Umpan Balik:**\n${data.feedback}`
      };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      saveCurrentSession(finalMessages);
    } catch (err: any) {
      console.error(err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `⚠️ **Gagal Melakukan Penilaian AI**: ${err.message || "Terjadi kesalahan saat memproses koreksi."}`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let prompt = "";

    if (soalModalTab === 'buat') {
      const tingkatStr = soalForm.tingkatKesulitan.length > 0 ? soalForm.tingkatKesulitan.join(", ") : "HOTS";
      const levelStr = soalForm.levelKognitif.length > 0 ? soalForm.levelKognitif.join(", ") : "C4, C5, C6";
      const bentukStr = soalForm.bentukSoal.length > 0 ? soalForm.bentukSoal.join(", ") : "Pilihan Ganda, Uraian";
      const hasSubMateri = soalForm.subMateri && soalForm.subMateri.length > 0;
      const subMateriStr = hasSubMateri ? soalForm.subMateri.join(", ") : "";
      const stimulusStr = Array.isArray(soalForm.jenisStimulus)
        ? (soalForm.jenisStimulus.filter(s => s !== "Tanpa Stimulus").length > 0 
            ? soalForm.jenisStimulus.filter(s => s !== "Tanpa Stimulus").join(", ") 
            : "Tanpa Stimulus (Langsung Soal)")
        : (soalForm.jenisStimulus || "Narasi / Teks Bacaan Kontekstual");
      const hasStimulusActive = Array.isArray(soalForm.jenisStimulus)
        ? soalForm.jenisStimulus.some(s => s !== "Tanpa Stimulus")
        : soalForm.jenisStimulus !== "Tanpa Stimulus";

      prompt = `Tolong buatkan paket soal pembelajaran komprehensif berkualitas tinggi menggunakan **Generator Soal** dengan spesifikasi dan struktur dokumen sebagai berikut:

**SPESIFIKASI DOKUMEN SOAL:**
- **Jenjang & Kelas**: ${soalForm.jenjang} / ${soalForm.kelas}
- **Mata Pelajaran**: ${soalForm.mapel}
- **Topik / Materi Pokok**: ${soalForm.materi || "[Sesuaikan dengan Kurikulum Fase ini]"}
${hasSubMateri ? `- **Sub-Materi Terfokus (SANGAT KRUSIAL)**: ${subMateriStr}\n` : ""}${soalForm.fokusMateri ? `- **Fokus Materi / Sub-Disiplin Spesifik (PENTING)**: ${soalForm.fokusMateri}\n` : ""}- **Tingkat Kesulitan**: ${tingkatStr}
- **Level Kognitif Bloom**: ${levelStr}
- **Bentuk Soal**: ${bentukStr}
- **Jumlah Soal**: ${soalForm.jumlahSoal || "5"} butir soal

${hasSubMateri ? `**⚠️ INSTRUKSI FOKUS SUB-MATERI (SANGAT STRICT):**
Paket soal ini WAJIB berfokus 100% secara eksklusif pada sub-materi berikut: "${subMateriStr}". Seluruh butir soal, stimulus, kunci jawaban, dan pembahasan harus menguji secara mendalam konsep-konsep dari sub-materi tersebut (tidak melebar ke pokok bahasan lain di luar sub-materi ini)!\n` : ""}
${soalForm.fokusMateri ? `**⚠️ INSTRUKSI FOKUS MATERI (SANGAT KRUSIAL - MAPEL TERPADU / SUB-DISIPLIN):**
Pengguna mengunci fokus materi HANYA pada sub-materi/cabang ilmu berikut: "${soalForm.fokusMateri}".
Untuk mata pelajaran terpadu (seperti IPS Terpadu, IPA Terpadu, IPAS, atau rumpun lainnya) maupun mapel umum, seluruh butir soal, stimulus, kunci jawaban, dan pembahasan WAJIB berfokus 100% secara eksklusif HANYA pada fokus materi/cabang ilmu tersebut. JANGAN membuat soal yang melebar atau beralih ke cabang ilmu/materi lain di luar fokus yang diminta!\n` : ""}
**STIMULUS SOAL (${hasStimulusActive ? "WAJIB ADA & KAYA VARIASI" : "TIDAK MENGGUNAKAN STIMULUS"}):**
- **Jenis Stimulus**: ${stimulusStr}
${soalForm.keteranganStimulus && hasStimulusActive ? `- **Keterangan / Detil Stimulus**: ${soalForm.keteranganStimulus}` : ""}
${hasStimulusActive ? `Pastikan stimulus yang disajikan kaya, bermakna, kontekstual dengan kehidupan nyata, dan memadukan variasi stimulus yang dipilih (${stimulusStr}). Variasikan stimulus antar nomor soal (misal nomor 1 menyajikan narasi/artikel berita kontekstual, nomor 2 tabel data statistik komparatif, nomor 3 grafik/diagram proses atau studi kasus pemecahan masalah) sehingga paket butir soal sangat variatif, heterogen, dan tidak terkesan sejenis/monoton.` : "Buat butir soal langsung ke pokok pertanyaan tanpa memerlukan stimulus bacaan atau gambar pendahuluan."}

${soalForm.instruksiTambahan ? `**INSTRUKSI TAMBAHAN GURU:**\n${soalForm.instruksiTambahan}\n` : ""}

**PETUNJUK FORMAT DAN STRUKTUR DOKUMEN (SANGAT WAJIB & STRICT):**
1. **Bagian A. Header Identitas**: Sajikan tabel Markdown identitas (Mata Pelajaran, Kelas/Fase, Topik, Bentuk, Jumlah, Tingkat) & Callout Box Petunjuk Pengerjaan di paling awal.
2. **Bagian B. Naskah Soal**: Format setiap nomor soal secara konsisten dan terpisah rapi:
   ### 📝 SOAL NO. X
   \`[Bentuk: ${bentukStr} | Level: ${levelStr}]\`
3. **Format Stimulus (TANPA LABEL PENGANTAR):**
   - JANGAN PERNAH menyertakan kata/label pengantar seperti "📌 STIMULUS BACAAN", "STIMULUS SOAL:", "Stimulus:", atau sejenisnya. Cukup langsung tuliskan narasinya saja di dalam Callout Box (\`> [Teks narasi langsung]\`) atau sajikan tabel datanya secara langsung tanpa label pengantar tersebut.
   - Jika Grafik/Chart SVG: Tuliskan tag <svg> secara mentah di luar codeblock, dan sertakan Tabel Data Markdown pendukung di bawahnya secara langsung.
   - Jika Tabel Data: Tuliskan Tabel Markdown terstruktur rapi dengan garis border dan header kolom yang jelas.
4. **Kalimat Pertanyaan/Soal (JANGAN pakai Label Pengantar):**
   - JANGAN PERNAH mengawali kalimat pertanyaan dengan label bahasa seperti "Pertanyaan / Narasi Soal:", "Pertanyaan:", "Kalimat Soal:", "Narasi Soal:", atau sejenisnya. Setelah menyajikan stimulus, langsung tuliskan kalimat soal/pertanyaannya secara mengalir tanpa embel-embel label tersebut.
   - Untuk Pilihan Jawaban:
     - Untuk Pilihan Ganda: Tuliskan opsi A, B, C, D (E untuk SMA) secara vertikal dengan format tebal \`\n- **A.** [Teks Opsi]\`.
     - Untuk Pilihan Ganda Kompleks / Benar-Salah: Gunakan Tabel Markdown yang rapi dengan kolom nomor, pernyataan, dan centang/pilihan.
5. **Format Matematika/Sains**: WAJIB gunakan notasi LaTeX KaTeX (\$f(x) = ax^2 + bx + c\$ atau \$\$\frac{a}{b}\$\$) secara konsisten.
6. **Bagian C. Kunci Jawaban & Pembahasan Detail**:
   - **Tabel Ringkasan Kunci Jawaban** (No | Bentuk Soal | Level Kognitif | Kunci Jawaban | Skor Maksimal)
   - **Pembahasan Detail Langkah demi Langkah** per nomor soal beserta Rubrik Penskoran.
7. **Format Tabel (ALL BORDER WAJIB)**: Seluruh tabel dalam naskah soal (Tabel Header Identitas, Tabel Stimulus Data, Tabel PG Kompleks/Benar-Salah, Tabel Kisi-Kisi Soal, dan Tabel Kunci Jawaban) WAJIB menggunakan format Tabel Markdown lengkap (All Borders) dengan pembatas kolom pipe (|) di awal, antar kolom, dan di akhir setiap baris secara konsisten.
8. **Variasi Kunci Jawaban (SANGAT STRICT):**
   - Distribusi opsi kunci jawaban pilihan ganda (A, B, C, D, atau E) harus bervariasi secara acak dan adil.
   - JANGAN PERNAH membuat kunci jawaban pilihan ganda dengan opsi huruf yang sama berturut-turut lebih dari 3 soal (maksimal opsi yang sama berturut-turut hanya 3 soal, misalnya: A, A, A diperbolehkan, tetapi jika ada 4 soal berturut-turut dengan kunci jawaban yang sama seperti A, A, A, A maka itu SANGAT DILARANG). Sisa nomor soal harus diselingi dengan opsi yang berbeda.
`;
    } else if (soalModalTab === 'impor') {
      prompt = `Tolong lakukan **Review dan Analisis Soal** berdasarkan ${soalImporForm.fileBase64 ? "dokumen yang diunggah" : "teks yang diimpor"} berikut ini.

${soalImporForm.fileText ? `**TEKS NASKAH SOAL YANG DIIMPOR:**\n\`\`\`text\n${soalImporForm.fileText}\n\`\`\`\n` : ""}

**INSTRUKSI TUGAS:**
1. Rapikan soal di atas menjadi format naskah soal yang terstruktur, lengkap dengan penomoran dan pilihan ganda yang rapi.
2. Berikan penilaian/review singkat terhadap kualitas soal tersebut (misalnya dari segi HOTS/LOTS, kesesuaian dengan kaidah penulisan soal, dan validitas opsi jawaban).
3. Buatkan **Kunci Jawaban dan Pembahasan Detail** untuk setiap butir soal tersebut.
4. Buatkan **Tabel Ringkasan Kunci Jawaban** di akhir.

${soalImporForm.instruksiTambahan ? `**INSTRUKSI TAMBAHAN:**\n${soalImporForm.instruksiTambahan}\n` : ""}
`;
    } else if (soalModalTab === 'manual') {
      prompt = `Tolong bantu saya menyusun dan merapikan naskah soal yang saya inputkan manual berikut, lalu buatkan pembahasan dan kunci jawabannya.

**SPESIFIKASI SOAL:**
- **Jenjang & Kelas**: ${soalManualForm.jenjang} / ${soalManualForm.kelas}
- **Mata Pelajaran**: ${soalManualForm.mapel}
- **Topik / Materi Pokok**: ${soalManualForm.materi || "[Otomatis Sesuaikan]"}

**NASKAH SOAL INPUT MANUAL:**
\`\`\`text
${soalManualForm.naskahSoal}
\`\`\`

**INSTRUKSI TUGAS:**
1. Rapikan teks naskah soal di atas menjadi format Markdown yang profesional.
2. Tambahkan **Stimulus** yang sesuai jika soal tersebut belum memilikinya namun membutuhkan konteks.
3. Buatkan **Pembahasan Detail Langkah demi Langkah** per nomor soal.
4. Sajikan **Tabel Ringkasan Kunci Jawaban** di bagian bawah.

${soalManualForm.instruksiTambahan ? `**INSTRUKSI TAMBAHAN:**\n${soalManualForm.instruksiTambahan}\n` : ""}
`;
    }

    setIsSoalModalOpen(false);
    
    let fileData = undefined;
    if (soalModalTab === 'impor' && soalImporForm.fileBase64) {
      fileData = {
        base64: soalImporForm.fileBase64,
        mimeType: soalImporForm.fileMimeType,
        name: soalImporForm.fileName
      };
    }
    
    handleSubmit(undefined, prompt, fileData);
  };

  const handlePerangkatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPerangkatModalOpen(false);
    executePerangkatSubmitWithForm(perangkatForm);
  };

  const handleReviewSubmit = () => {
    const newModule = {
      id: "modul-" + Date.now(),
      title: reviewFields.judulPaket || ("Perangkat: " + (reviewFields.materi || "Rencana Pembelajaran")),
      subject: reviewFields.mapel || "Umum",
      className: reviewFields.kelas || "-",
      content: reviewFields.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSavedModules(prev => [newModule, ...prev]);
    setIsPerangkatReviewModalOpen(false);
    alert("Berhasil disimpan ke Arsip Modul Ajar!");
  };

  const executePerangkatSubmitWithForm = (formToUse: typeof perangkatForm) => {
    const perangkatForm = formToUse;
    let prompt = "";
    if (perangkatForm.jenis === "Prota, Prosem & Analisis KKTP") {
      const namaSekolahFinal = perangkatForm.namaSekolah || userProfile.namaSekolah || "[Nama Sekolah]";
      const namaPenyusunFinal = perangkatForm.namaPenyusun || userProfile.namaPenyusun || "[Nama Penyusun]";
      const nipPenyusunFinal = perangkatForm.nipPenyusun || userProfile.nipPenyusun || "[NIP Penyusun]";
      const namaKepsekFinal = userProfile.namaKepsek || "[Nama Kepala Sekolah]";
      const nipKepsekFinal = userProfile.nipKepsek || "[NIP Kepala Sekolah]";

      prompt = `Tolong buatkan dokumen administrasi pembelajaran resmi: **PROGRAM TAHUNAN (PROTA), PROGRAM SEMESTER (PROSEM), DAN ANALISIS KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)** secara terpisah dari Modul Ajar, langsung untuk **2 SEMESTER PENUH (1 TAHUN PELAJARAN: SEMESTER GANJIL & GENAP)** sesuai panduan Kemendikdasmen dan Keputusan BSKAP No. 046/H/KR/2025:

**IDENTITAS DOKUMEN:**
- Satuan Pendidikan: ${namaSekolahFinal}
- Kurikulum: ${perangkatForm.kurikulum}
- Jenjang / Kelas: ${perangkatForm.jenjang} / ${perangkatForm.kelas}
- Mata Pelajaran: ${perangkatForm.mapel}
- Elemen: ${perangkatForm.elemen}
- Capaian Pembelajaran (CP): ${perangkatForm.cp}
- Lingkup Materi Esensial: ${perangkatForm.materi || "Sesuaikan dengan susunan materi lengkap kelas " + perangkatForm.kelas}
- Alokasi Waktu: ${perangkatForm.waktuJP} JP / Tahun
- Tahun Pelajaran: ${perangkatForm.tahunPelajaran || "2024/2025"}
- Guru Pengampu: ${namaPenyusunFinal} (NIP: ${nipPenyusunFinal})
- Kepala Sekolah: ${namaKepsekFinal} (NIP: ${nipKepsekFinal})
${perangkatForm.instruksiTambahan ? `- Instruksi Tambahan: ${perangkatForm.instruksiTambahan}\n` : ""}

**KETENTUAN STRUKTUR DOKUMEN (PISAHKAN DARI FORMAT MODUL AJAR HARIAN):**
Jangan sertakan skenario pembelajaran harian, apersepsi, atau sintaks PBL/PjBL di dokumen ini. Dokumen ini adalah perangkat manajerial tahunan dan semesteran.

Susun secara lengkap dan rapi dalam tabel Markdown dengan 4 komponen utama:

### I. PROGRAM TAHUNAN (PROTA) - 2 SEMESTER PENUH
Distribusikan seluruh materi pokok dan Alur Tujuan Pembelajaran (ATP) selama 1 tahun pelajaran ke dalam Semester 1 (Ganjil) dan Semester 2 (Genap):
| No | Semester | Elemen / Capaian Pembelajaran | Alur Tujuan Pembelajaran (ATP) | Lingkup Materi Pokok | Alokasi Waktu (JP) |
|---|---|---|---|---|---|
(Tuliskan seluruh materi semester 1 dan semester 2 secara seimbang, sertakan alokasi JP Asesmen Sumatif Akhir Semester dan Jam Cadangan, serta Total JP Tahunan).

### II. PROGRAM SEMESTER (PROSEM)
Sajikan matriks distribusi kalender mingguan untuk 2 semester:
1. **PROSEM SEMESTER 1 (GANJIL: JULI - DESEMBER)**
Tabel Prosem Semester Ganjil dengan kolom: No, No. TP, Materi Pokok / Tujuan Pembelajaran, Alokasi JP, dan pembagian pekan tiap bulan (Juli 1-5, Ags 1-5, Sep 1-5, Okt 1-5, Nov 1-5, Des 1-5), Asesmen Sumatif Lingkup Materi, SAS, dan Jam Cadangan.
2. **PROSEM SEMESTER 2 (GENAP: JANUARI - JUNI)**
Tabel Prosem Semester Genap dengan kolom: No, No. TP, Materi Pokok / Tujuan Pembelajaran, Alokasi JP, dan pembagian pekan tiap bulan (Jan 1-5, Feb 1-5, Mar 1-5, Apr 1-5, Mei 1-5, Jun 1-5), Asesmen Sumatif Lingkup Materi, Asesmen Akhir Tahun, dan Jam Cadangan.

### III. ANALISIS KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)
Gunakan pendekatan Interval Nilai Kurikulum Merdeka:
- **Rentang Interval**:
  - 0% - 40% : Belum Mencapai Ketuntasan (Remedial di Seluruh Bagian)
  - 41% - 65% : Belum Mencapai Ketuntasan (Remedial di Bagian Tertentu yang Lemah)
  - 66% - 85% : Sudah Mencapai Ketuntasan (Tidak Perlu Remedial)
  - 86% - 100% : Sudah Mencapai Ketuntasan (Diberikan Pengayaan / Tantangan Tambahan)
- **Tabel Analisis KKTP (Semester 1 & 2)**:
| No | Semester | Elemen | Tujuan Pembelajaran (TP) | Indikator / Kriteria Ketercapaian | Interval Ketercapaian Nilai | Rencana Tindak Lanjut Pedagogis |
|---|---|---|---|---|---|---|

### IV. LEMBAR PENGESAHAN
<br>
<table style="width: 100%; table-layout: fixed; text-align: center; border: none; margin-top: 40px;">
  <tr>
    <td style="width: 40%; border: none;">Mengetahui,<br><b>Kepala Sekolah</b></td>
    <td style="width: 20%; border: none;"></td>
    <td style="width: 40%; border: none;">.................., ....................<br><b>Guru Mata Pelajaran</b></td>
  </tr>
  <tr>
    <td style="height: 70px; border: none;"></td>
    <td style="border: none;"></td>
    <td style="border: none;"></td>
  </tr>
  <tr>
    <td style="border: none;"><b>${namaKepsekFinal}</b><br>NIP. ${nipKepsekFinal}</td>
    <td style="border: none;"></td>
    <td style="border: none;"><b>${namaPenyusunFinal}</b><br>NIP. ${nipPenyusunFinal}</td>
  </tr>
</table>`;
    } else if (perangkatForm.jenis === "Generator Materi Ajar") {
      const hasSubMateri = perangkatForm.subMateri && perangkatForm.subMateri.length > 0;
      const subMateriStr = hasSubMateri ? perangkatForm.subMateri.join(", ") : "";
      prompt = `Tolong buatkan **Materi Ajar Terstruktur (Bahan Bacaan Siswa / Handout Buku Teks Mandiri)** yang SANGAT LENGKAP, MENDALAM, DAN KOMPREHENSIF untuk:
- Kurikulum: ${perangkatForm.kurikulum}
- Jenjang: ${perangkatForm.jenjang}
- Kelas / Fase: ${perangkatForm.kelas}
- Semester: ${perangkatForm.semester}
- Mata Pelajaran: ${perangkatForm.mapel}
- Elemen: ${perangkatForm.elemen}
- Capaian Pembelajaran (CP BSKAP 046/2025): ${perangkatForm.cp}
- Topik / Judul Materi Pokok: ${perangkatForm.materi}
${hasSubMateri ? `- Sub-Materi Terfokus (SANGAT KRUSIAL DIBEDAH TUNTAS): ${subMateriStr}\n` : ""}- Tingkat Kedalaman Pembahasan: ${perangkatForm.kedalaman || "Sangat Mendalam & Komprehensif (Buku Teks Mandiri)"}
${perangkatForm.variasiStimulus ? `- Pendekatan Kasus & Stimulus Kontekstual: ${perangkatForm.variasiStimulus}\n` : ""}${perangkatForm.fokusMateri ? `- Fokus Khusus Materi: ${perangkatForm.fokusMateri}\n` : ""}
${hasSubMateri ? `**⚠️ BATASAN RUANG LINGKUP SUB-MATERI (FOKUS TERARAH & MENDALAM):**\nMateri ajar ini WAJIB mengupas secara tuntas dan mendalam sub-materi berikut: "${subMateriStr}". Setiap sub-materi tersebut harus dibedah dalam sub-bab tersendiri dengan uraian materi yang kaya, rinci, analitis, dan aplikatif (tidak melebar ke bab lain, namun mengupas sub-materi ini hingga ke akar-akarnya).\n` : ""}
${perangkatForm.variasiStimulus ? `**PENDEKATAN STIMULUS & CONTOH KASUS KONTEKSTUAL:**\nIntegrasikan pendekatan "${perangkatForm.variasiStimulus}" ke dalam naskah penjelasan konsep, studi kasus riil, analogi, dan aktivitas siswa agar materi ajar sangat hidup, kontekstual, dan menggugah nalar kritis.\n` : ""}
${perangkatForm.sumberBelajar ? `- Sumber Belajar Referensi: ${perangkatForm.sumberBelajar}\n` : ""}
${perangkatForm.instruksiTambahan ? `- Instruksi Tambahan Guru: ${perangkatForm.instruksiTambahan}\n` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ATURAN KEDALAMAN & KELENGKAPAN MATERI (MUTLAK - DILARANG SINGKAT):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. **DILARANG KERAS MEMBUAT MATERI SINGKAT, DANGKAL, ATAU HANYA BERUPA RINGKASAN POIN-POIN GARIS BESAR!**
2. Dokumen ini adalah **Bahan Bacaan Mandiri Siswa (Handout Buku Teks Utama)**, bukan sekadar rangkuman guru. Murid harus dapat memahami materi secara utuh dan mendalam hanya dengan membaca dokumen ini tanpa perlu mencari sumber lain.
3. Pada **BAGIAN 6 (PEMBAHASAN MATERI POKOK LENGKAP & KOMPREHENSIF)**:
   - Pecah materi menjadi beberapa **Sub-Bab Utama** (Sub-Bab A, Sub-Bab B, Sub-Bab C, dst.) berdasarkan materi pokok dan sub-materi fokus yang dipilih.
   - Pada **SETIAP SUB-BAB**, Anda WAJIB menyajikan:
     * **Uraian Penjelasan Konsep Lengkap (Full Narrative)**: Jabarkan dalam beberapa paragraf mendalam dan edukatif (bukan 1-2 kalimat). Taruh definisi kunci dalam format blockquote Markdown: \`> **📌 Konsep Kunci:** ...\`.
     * **Landasan Teori, Hukum Ilmiah, & Prinsip Utama**: Mengapa dan bagaimana konsep tersebut bekerja, aksioma/kaidah yang mendasari, serta relevansinya.
     * **Klasifikasi, Struktur, & Tabel Komparasi Rinci (All Borders)**: Sajikan tabel Markdown lengkap yang membandingkan jenis-jenis, karakteristik, kelebihan-kekurangan, atau komponen materi.
     * **Mekanisme Operasional / Penurunan Rumus / Prosedur Sistematis**:
       - Jika materi Eksakta/Sains/Matematika/Ekonomi/Teknik: Tuliskan formula matematika lengkap menggunakan notasi LaTeX KaTeX ($...$ atau display mode $$...$$), jelaskan makna variabel, satuan, penurunan rumus, dan contoh numerik terperinci.
       - Jika materi Sosial/Humaniora/Bahasa: Sajikan telaah analisis wacana, pandangan teori ahli, dinamika fenomena di masyarakat, dan argumen kritis.
     * **Analogi Nyata (Perumpamaan Konkret)**: Berikan analogi kehidupan sehari-hari agar konsep abstrak menjadi mudah dipahami siswa.
     * **Contoh Kasus Kontekstual & Telaah Solusi**: Berikan minimal 2 skenario nyata dunia nyata/kerja dan bedah pembahasannya secara tuntas.
     * **Peringatan Miskonsepsi Siswa**: 2–3 kekeliruan umum siswa beserta koreksi konsep ilmiah yang benar.
     * **Pertanyaan Cek Pemahaman Cepat (Quick Check)**: 1–2 pertanyaan pemantik pemahaman di akhir sub-bab.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUKTUR RESMI DOKUMEN MATERI AJAR SISWA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Susunlah dokumen lengkap dan terstandar dengan urutan berikut:

# 📖 BAHAN BACAAN SISWA: [JUDUL MATERI POKOK]
**Mata Pelajaran:** ${perangkatForm.mapel} | **Kelas / Fase:** ${perangkatForm.kelas} | **Semester:** ${perangkatForm.semester}

---

### 1. IDENTITAS & INFORMASI PEMBELAJARAN
(Tabel ringkas: Nama Sekolah, Mata Pelajaran, Fase/Kelas, Alokasi Waktu, Elemen, dan Capaian Pembelajaran)

### 2. TUJUAN PEMBELAJARAN & INDIKATOR KETERCAPAIAN
(Target kompetensi spesifik yang dicapai murid dengan KKO taksonomi Bloom)

### 3. PERTANYAAN PEMANTIK (ESSENTIAL QUESTIONS)
(3-4 pertanyaan pemantik yang menggugah rasa ingin tahu dan nalar kritis)

### 4. PETA KONSEP HIERARKIS & ALUR MATERI
(Struktur hubungan antar konsep kunci yang disajikan secara hierarkis atau diagram teks Markdown)

### 5. APERSEPSI & STIMULUS FENOMENA DUNIA NYATA
(Narasi kasus/fenomena aktual pembuka yang mengaitkan materi dengan pengalaman nyata siswa)

### 6. PEMBAHASAN MATERI POKOK LENGKAP & KOMPREHENSIF (BAGIAN INTI)
(Pembedahan materi secara mendalam, lengkap, dan sistematis per Sub-Bab A, B, C, dst., dengan uraian paragraf panjang, kotak konsep kunci, tabel komparasi, rumus LaTeX / telaah konseptual, dan analogi)

### 7. CONTOH SOAL & BEDAH STUDI KASUS HOTS TERPERINCI
(Contoh permasalahan kompleks yang dibedah langkah demi langkah beserta pembahasan logis dan solutif)

### 8. CATATAN PENTING & PELURUSAN MISKONSEPSI UMUM
(Tabel perbandingan miskonsepsi vs konsep ilmiah yang benar)

### 9. LEMBAR AKTIVITAS EKSPLORASI SISWA (HANDS-ON & MIND-ON)
(Aktivitas mandiri atau diskusi kolaboratif untuk menguji pemahaman konsep)

### 10. RANGKUMAN INTISARI MATERI (MINDFUL SUMMARY)
(Ringkasan intisari konsep esensial yang mudah diingat)

### 11. UJI PEMAHAMAN FORMATIF
(5 Soal Evaluasi Berjenjang: LOTS, MOTS, HOTS + Kunci Jawaban Lengkap & Pembahasan Analitis di bagian bawahnya)

### 12. LEMBAR REFLEKSI DIRI SISWA (METAKOGNITIF)
(Tabel refleksi apa yang sudah dipahami, tantangan, dan penerapannya)

### 13. GLOSARIUM & DAFTAR REFERENSI
(Kamus mini istilah-istilah penting beserta definisinya dan rujukan buku teks Kemendikdasmen)`;
    } else if (perangkatForm.jenis !== "Analisis CP & ATP") {
      const namaSekolahFinal = perangkatForm.namaSekolah || userProfile.namaSekolah || "[Nama Sekolah]";
      const namaPenyusunFinal = perangkatForm.namaPenyusun || userProfile.namaPenyusun || "[Nama Penyusun]";
      const nipPenyusunFinal = perangkatForm.nipPenyusun || userProfile.nipPenyusun || "[NIP Penyusun]";
      const namaKepsekFinal = userProfile.namaKepsek || "[Nama Kepala Sekolah]";
      const nipKepsekFinal = userProfile.nipKepsek || "[NIP Kepala Sekolah]";

      const hasSubMateri = perangkatForm.subMateri && perangkatForm.subMateri.length > 0;
      const subMateriStr = hasSubMateri ? perangkatForm.subMateri.join(", ") : "";

      prompt = `Tolong buatkan **${perangkatForm.jenis}** yang teruji dan terkurasi sesuai standar Kemendikbud/Kemendikdasmen untuk:
- Kurikulum: ${perangkatForm.kurikulum}
- Jenjang: ${perangkatForm.jenjang}
- Kelas: ${perangkatForm.kelas}
- Semester: ${perangkatForm.semester}
- Mata Pelajaran: ${perangkatForm.mapel}
- Elemen: ${perangkatForm.elemen}
- Capaian Pembelajaran: ${perangkatForm.cp}
- Materi Pokok: ${perangkatForm.materi || "Sesuaikan dengan CP di atas"}
${hasSubMateri ? `- Sub-Materi Pokok Terfokus (SANGAT KRUSIAL): ${subMateriStr}\n` : ""}${perangkatForm.fokusMateri ? `- Fokus Materi: ${perangkatForm.fokusMateri}\n` : ""}- Kedalaman Materi: ${perangkatForm.kedalaman}
${perangkatForm.variasiStimulus ? `- Pendekatan Stimulus & Kasus: ${perangkatForm.variasiStimulus}\n` : ""}${perangkatForm.sumberBelajar ? `- Sumber Belajar: ${perangkatForm.sumberBelajar}\n` : ""}- Model Pembelajaran: ${perangkatForm.modelPembelajaran} (sesuaikan sintaks model pembelajaran abad 21)
- Alokasi Waktu: ${perangkatForm.waktuJP} JP (dalam ${perangkatForm.jumlahPertemuan} Pertemuan)
- Profil Pelajar: ${perangkatForm.profilLulusan.length > 0 ? perangkatForm.profilLulusan.join(", ") : "Sesuaikan dengan AI"}
${perangkatForm.instruksiTambahan ? `- Instruksi Tambahan: ${perangkatForm.instruksiTambahan}\n` : ""}
${hasSubMateri ? `**⚠️ BATASAN RUANG LINGKUP SUB-MATERI (FOKUS TERARAH):**\nModul Ajar ini WAJIB difokuskan secara mendalam pada sub-materi berikut: "${subMateriStr}". Seluruh Tujuan Pembelajaran, langkah kegiatan apersepsi, kegiatan inti berdiferensiasi, serta instrumen asesmen formatif dan sumatif harus secara spesifik mengupas tuntas sub-materi tersebut (tidak melebar ke bab lain).\n` : ""}${perangkatForm.variasiStimulus ? `**PENDEKATAN STIMULUS & CONTOH KASUS:**\nIntegrasikan pendekatan "${perangkatForm.variasiStimulus}" ke dalam skenario studi kasus, fenomena kontekstual apersepsi, dan aktivitas pemecahan masalah siswa.\n` : ""}
Mohon gunakan format persis seperti struktur terstandar dan rapi berikut:

**${perangkatForm.jenis.toUpperCase()}**
**MATA PELAJARAN : ${perangkatForm.mapel}**
**BAB [NOMOR BAB]: ${perangkatForm.materi || "[TOPIK MATERI]"}${hasSubMateri ? ` (SUB-MATERI: ${subMateriStr})` : ""}**

**A. IDENTITAS MODUL**
| Komponen Identitas | Keterangan Modul Ajar |
| :--- | :--- |
| **Nama Sekolah** | ${namaSekolahFinal} |
| **Nama Penyusun** | ${namaPenyusunFinal} |
| **NIP Penyusun** | ${nipPenyusunFinal || "-"} |
| **Mata Pelajaran** | ${perangkatForm.mapel} |
| **Fase / Kelas / Semester** | ${perangkatForm.kelas} / ${perangkatForm.semester} |
| **Alokasi Waktu** | ${perangkatForm.waktuJP} JP (${perangkatForm.jumlahPertemuan} Pertemuan) |
| **Tahun Pelajaran** | ${perangkatForm.tahunPelajaran || "2024/2025"} |

**B. IDENTIFIKASI KESIAPAN PESERTA DIDIK**
Sebelum memulai pembelajaran ${perangkatForm.materi || "[Topik Materi]"}, peserta didik diharapkan telah memiliki pengetahuan, keterampilan, dan pemahaman awal sebagai berikut:

- **Pengetahuan Awal**:
  - [Konsep dasar 1]
  - [Konsep dasar 2]
  - [Pemahaman dasar 3]
- **Keterampilan Awal**:
  - [Kemampuan 1]
  - [Kemampuan 2]
  - [Kemampuan 3]
- **Pemahaman Awal**:
  - [Pemahaman kontekstual peserta didik]

**C. KARAKTERISTIK MATERI PELAJARAN**
Materi ${perangkatForm.materi || "[Topik Materi]"} adalah bagian penting dalam ${perangkatForm.mapel} yang membahas...

- **Jenis Pengetahuan**: [Pengetahuan konseptual, faktual, dan prosedural]
- **Relevansi dengan Kehidupan Nyata**: [Penjelasan relevansi dengan kehidupan sehari-hari]
- **Tingkat Kesulitan**: [Sedang hingga tinggi & penjelasan]
- **Struktur Materi**: [Penjelasan urutan logis materi]
- **Integrasi Nilai dan Karakter**: [Nilai-nilai karakter yang diintegrasikan]

**D. DIMENSI PROFIL LULUSAN PEMBELAJARAN**
Berdasarkan tujuan pembelajaran, 7 dimensi profil kelulusan yang ditekankan adalah:

- **Keimanan dan Ketakwaan terhadap Tuhan YME serta Berakhlak Mulia**: [Uraian]
- **Kewargaan**: [Uraian]
- **Penalaran Kritis**: [Uraian]
- **Kreativitas**: [Uraian]
- **Kolaborasi**: [Uraian]
- **Kemandirian**: [Uraian]
- **Komunikasi**: [Uraian]

### 🎯 DESAIN PEMBELAJARAN

**A. CAPAIAN PEMBELAJARAN (CP) KEPUTUSAN KEPALA BSKAP NOMOR 046/H/KR/2025**
Pada akhir Fase ${perangkatForm.kelas}, peserta didik diharapkan mampu:
- [Capaian 1]
- [Capaian 2]
- [Capaian 3]
- [Capaian 4]

**B. LINTAS DISIPLIN ILMU YANG RELEVAN**
- **Geografi**: [Uraian keterkaitan]
- **Sejarah**: [Uraian keterkaitan]
- **Sosiologi**: [Uraian keterkaitan]
- **Pendidikan Kewarganegaraan**: [Uraian keterkaitan]
- **Matematika**: [Uraian keterkaitan]
- **Teknologi Informasi dan Komunikasi (TIK)**: [Uraian keterkaitan]

**C. TUJUAN PEMBELAJARAN**
- **Pertemuan 1 & 2 ([Topik Sub-materi 1])**:
  - [Tujuan 1]
  - [Tujuan 2]
- **Pertemuan 3 & 4 ([Topik Sub-materi 2])**:
  - [Tujuan 1]
  - [Tujuan 2]
- **Pertemuan 5 & 6 ([Topik Sub-materi 3])**:
  - [Tujuan 1]
  - [Tujuan 2]

**D. TOPIK PEMBELAJARAN KONTEKSTUAL**
- **[Topik Kontekstual 1]**: [Penjelasan/Pertanyaan studi kasus nyata]
- **[Topik Kontekstual 2]**: [Penjelasan/Pertanyaan studi kasus nyata]
- **[Topik Kontekstual 3]**: [Penjelasan/Pertanyaan studi kasus nyata]

**E. KERANGKA PEMBELAJARAN**
- **PRAKTIK PEDAGOGIK**:
  - **Project-Based Learning (PBL)**: [Uraian]
  - **Diskusi Kelompok & Simulasi**: [Uraian]
  - **Pembelajaran Aktif**: [Uraian]
- **MITRA PEMBELAJARAN**:
  - **Lingkungan Sekolah & Masyarakat**: [Uraian]
- **LINGKUNGAN BELAJAR**:
  - **Ruang Fisik & Virtual**: [Uraian]
- **PEMANFAATAN DIGITAL**:
  - **Perpustakaan Digital / Kahoot! / Google Classroom / Simulasi Daring**: [Uraian]

**F. LANGKAH-LANGKAH PEMBELAJARAN BERDIFERENSIASI**

### 📍 1. KEGIATAN PENDAHULUAN ([Durasi] Menit)
| Tahapan Pendahuluan | Skenario Aktivitas Pembelajaran | Fokus Integrasi (8-3-3-4) |
| :--- | :--- | :--- |
| **Pembukaan Berkesadaran (Mindful)** | Guru menyapa peserta didik, menciptakan atmosfer kelas yang positif. Memulai dengan pertanyaan reflektif: "..." Mengajak peserta didik melakukan aktivitas singkat untuk melatih fokus. | **[Dimensi: Berakhlak Mulia & Kemandirian]** |
| **Apersepsi Bermakna (Meaningful)** | Menampilkan fakta/berita utama terkini. Mengaitkan materi dengan bab sebelumnya. Meminta peserta didik berbagi pengalaman. | **[Prinsip: Meaningful]** |
| **Motivasi Menggembirakan (Joyful)** | Menyampaikan bahwa materi ini membantu mereka menjadi warga negara yang kritis. Memberikan tantangan interaktif & menjanjikan simulasi/proyek. | **[Pengalaman: Kontekstual]** |

### 📍 2. KEGIATAN INTI ([Durasi] Menit)
| Tahapan Kegiatan Inti | Skenario Aktivitas Pembelajaran | Fokus Integrasi (8-3-3-4) |
| :--- | :--- | :--- |
| **Prinsip Memahami (Konseptual, Bermakna)** | **Eksplorasi Konsep (Diferensiasi Konten)**: Guru menyajikan konsep baru melalui berbagai media (visual, video, infografis, teks bertingkat). Diskusi terbimbing & penguatan konsep dengan pertanyaan scaffolding. | **[Pengalaman: Hands-on & Digital]** |
| **Prinsip Mengaplikasi (Prosedural, Bermakna, Joyful)** | **Simulasi & Studi Kasus (Diferensiasi Proses)**: Peserta didik melakukan simulasi / analisis data dalam kelompok. Menyelesaikan tugas perhitungan / analisis studi kasus. Pemecahan masalah kontekstual & Proyek Awal kolaboratif. | **[Dimensi: Penalaran Kritis & Kolaborasi]** |
| **Prinsip Merefleksi (Metakognitif, Berkesadaran)** | **Refleksi & Evaluasi (Diferensiasi Produk)**: Jurnal Belajar (Mindful), Diskusi Refleksi Kelas, Kuis Interaktif (Kahoot/Mentimeter), dan Presentasi Proyek Akhir. | **[Kerangka: Praktik Pedagogik]** |

### 📍 3. KEGIATAN PENUTUP ([Durasi] Menit)
| Tahapan Penutup | Skenario Aktivitas Pembelajaran | Fokus Integrasi (8-3-3-4) |
| :--- | :--- | :--- |
| **Umpan Balik Konstruktif (Meaningful)** | Guru memberikan umpan balik secara individu/kelompok dan mendorong peer feedback antar peserta didik. | **[Prinsip: Bermakna]** |
| **Menyimpulkan Pembelajaran (Mindful)** | Guru bersama peserta didik merangkum poin penting dan mengecek pemahaman peserta didik secara acak. | **[Dimensi: Kemandirian]** |
| **Perencanaan Selanjutnya (Bermakna)** | Guru memberikan gambaran materi selanjutnya, memberikan tugas rumah/tantangan, serta mengapresiasi partisipasi peserta didik. | **[Kerangka: Mitra Belajar]** |

**G. ASESMEN PEMBELAJARAN & RUBRIK PENILAIAN**

**1. ASESMEN AWAL PEMBELAJARAN (DIAGNOSTIK)**
● **Tujuan**: Mengidentifikasi pengetahuan awal, miskonsepsi, dan minat peserta didik...
● **Metode**: Kuesioner singkat / Pemetaan Kesiapan Belajar.
**Tes Diagnostik (5 Soal)**:
1. [Soal 1]
2. [Soal 2]
3. [Soal 3]
4. [Soal 4]
5. [Soal 5]

**2. ASESMEN PROSES PEMBELAJARAN (FORMATIF)**
● **Tujuan**: Memantau pemahaman peserta didik selama proses pembelajaran...
● **Metode**: Observasi Diskusi, Tugas Harian, Mini Presentasi.
**5 Soal untuk Asesmen Proses**:
1. [Soal 1]
2. [Soal 2]
3. [Soal 3]
4. [Soal 4]
5. [Soal 5]

**3. ASESMEN AKHIR PEMBELAJARAN (SUMATIF)**
● **Tujuan**: Mengukur pencapaian tujuan pembelajaran secara keseluruhan di akhir bab.
● **Metode**: Tes Tertulis & Penilaian Proyek Akhir.
**5 Soal untuk Asesmen Akhir**:
1. [Soal 1]
2. [Soal 2]
3. [Soal 3]
4. [Soal 4]
5. [Soal 5]

**4. RUBRIK PENILAIAN (SKALA 1 - 4)**

### 📊 RUBRIK PENILAIAN SIKAP & OBSERVASI (PROFIL PELAJAR PANCASILA)
| Kriteria Evaluasi | Perlu Bimbingan (1) | Cukup (2) | Baik (3) | Sangat Baik (4) |
| :--- | :--- | :--- | :--- | :--- |
| **Penalaran Kritis** | Belum mampu menganalisis data atau masalah tanpa bantuan penuh. | Mampu menganalisis masalah sederhana tetapi masih kurang mendalam. | Mampu menganalisis data dan isu secara logis dan kritis. | Sangat mahir menganalisis isu kompleks, mengevaluasi argumen, dan memberikan solusi inovatif. |
| **Kolaborasi & Kerja Sama** | Pasif dalam diskusi kelompok dan kurang berkontribusi. | Berkontribusi dalam kelompok jika diminta oleh teman/guru. | Aktif bekerja sama, mendengarkan pendapat teman, dan berbagi tugas. | Memimpin diskusi secara inklusif, menghargai perbedaan, dan mendorong keberhasilan tim. |
| **Kemandirian & Kesadaran** | Memerlukan dorongan berkelanjutan untuk menyelesaikan tugas. | Menyelesaikan tugas dengan arahan dan pengawasan berkala. | Mandiri dalam mencari informasi dan menyelesaikan tugas tepat waktu. | Sangat mandiri, menunjukkan inisiatif tinggi, dan melakukan refleksi diri yang mendalam. |

### 📊 RUBRIK PENILAIAN PROYEK & PRESENTASI
| Kriteria Evaluasi | Perlu Bimbingan (1) | Cukup (2) | Baik (3) | Sangat Baik (4) |
| :--- | :--- | :--- | :--- | :--- |
| **Kesesuaian & Kedalaman Materi** | Materi proyek tidak relevan atau mengandung banyak kekeliruan konsep. | Materi relevan tetapi pembahasan masih dangkal dan terbatas. | Materi sesuai, informasi akurat, dan mencakup poin-poin utama materi. | Pembahasan sangat komprehensif, kaya akan data aktual, dan analisis kontekstual yang tajam. |
| **Kreativitas & Kualitas Produk** | Produk (infografis/video/laporan) dibuat ala kadarnya tanpa estetika. | Produk cukup rapi tetapi menggunakan templat standar tanpa variasi. | Produk menarik, rapi, kreatif, dan mudah dipahami. | Produk sangat inovatif, desain visual/editing profesional, dan bernilai guna tinggi. |
| **Kemampuan Presentasi & Komunikasi** | Penyampaian tidak lancar, membaca teks penuh, dan tidak mampu menjawab pertanyaan. | Penyampaian cukup jelas namun kurang percaya diri; jawaban pertanyaan kurang tepat. | Penyampaian lancar, menggunakan bahasa yang baik, dan menjawab pertanyaan dengan benar. | Penyampaian sangat komunikatif, interaktif, menguasai audiens, dan menjawab pertanyaan secara kritis. |

### 📈 PEDOMAN PENSKORAN & RUMUS KONVERSI NILAI
- **Rumus Nilai Akhir**: **Nilai = (Skor Perolehan / Skor Maksimal) x 100**
- **Kategori Nilai**:
  - **89 - 100** : Sangat Baik (A)
  - **78 - 88**  : Baik (B)
  - **65 - 77**  : Cukup (C)
  - **< 65**     : Perlu Bimbingan (D)

<br>

<table style="width: 100%; table-layout: fixed; text-align: center; border: none; margin-top: 40px;">
  <tr>
    <td style="width: 40%; border: none;">Mengetahui,<br><b>Kepala Sekolah</b></td>
    <td style="width: 20%; border: none;"></td>
    <td style="width: 40%; border: none;">.................., ....................<br><b>Guru Mata Pelajaran</b></td>
  </tr>
  <tr>
    <td style="height: 70px; border: none;"></td>
    <td style="border: none;"></td>
    <td style="border: none;"></td>
  </tr>
  <tr>
    <td style="border: none;"><b>${namaKepsekFinal}</b><br>NIP. ${nipKepsekFinal}</td>
    <td style="border: none;"></td>
    <td style="border: none;"><b>${namaPenyusunFinal}</b><br>NIP. ${nipPenyusunFinal}</td>
  </tr>
</table>

**ATURAN TABEL (ALL BORDER WAJIB):**
Pastikan seluruh tabel dalam Modul Ajar ini (Tabel Identitas, Tabel Langkah Pembelajaran, dan Tabel Rubrik Penilaian) dibuat dalam format Tabel Markdown utuh dengan ALL BORDERS (memiliki garis batas tepi dan antar kolom/baris lengkap). JANGAN menggunakan tabel HTML kecuali untuk bagian tanda tangan pengesahan di atas.

${perangkatForm.instruksiTambahan ? `\nInstruksi Tambahan dari Guru:\n${perangkatForm.instruksiTambahan}\n` : ""}`;
    } else {
      prompt = `Bantu saya membedah Capaian Pembelajaran (CP) berdasarkan **Keputusan Kepala BSKAP Nomor 046/H/KR/2025** menjadi Tujuan Pembelajaran (TP) dan Alur Tujuan Pembelajaran (ATP) yang logis:

- Jenjang: ${perangkatForm.jenjang}
- Kelas: ${perangkatForm.kelas}
- Mata Pelajaran: ${perangkatForm.mapel}
- Elemen: ${perangkatForm.elemen}
- Capaian Pembelajaran: ${perangkatForm.cp}

Bedah CP tersebut (merujuk kepada Keputusan Kepala BSKAP Nomor 046/H/KR/2025) menjadi TP yang spesifik dan terukur menggunakan KKO. Lalu susun ATP yang berurutan dari materi termudah hingga tersulit.`;
    }
    
    if (perangkatForm.fileBase64) {
      prompt += `\n\n- Referensi Materi (terlampir): Mohon gunakan dokumen referensi terlampir sebagai sumber utama atau acuan dalam penyusunan perangkat ini.`;
    }

    setIsPerangkatModalOpen(false);
    
    let fileData = undefined;
    if (perangkatForm.fileBase64) {
      fileData = {
        base64: perangkatForm.fileBase64,
        mimeType: perangkatForm.fileMimeType,
        name: perangkatForm.fileName
      };
    }

    handleSubmit(undefined, prompt, fileData);
  };

  const handleEditMessage = (msg: Message) => {
    const msgIndex = messages.findIndex(m => m.id === msg.id);
    if (msgIndex === -1) return;
    
    setInput(msg.content);
    const newMessages = messages.slice(0, msgIndex);
    setMessages(newMessages);
    saveCurrentSession(newMessages);
  };

  const processMarkdownContent = (content: string): string => {
    if (!content) return "";
    let text = content;

    // 0. Remove introductory labels from questions: "Stimulus Soal", "Stimulus Bacaan", "Pertanyaan / Narasi Soal:" etc.
    text = text.replace(/(?:\r?\n|^)\s*(?:>\s*)?\*?\*?📌?\s*(?:STIMULUS\s+(?:BACAAN|SOAL)|STIMULUS|NARASI\s+SOAL)\*?\*?\s*[:-]?\s*/gi, (match) => {
      return match.startsWith('\n') ? '\n' : match.startsWith('\r\n') ? '\r\n' : '';
    });
    text = text.replace(/\*?\*?(?:Pertanyaan\s*[\/&]\s*Narasi\s+Soal|Pertanyaan\s+Soal|Narasi\s+Soal|Kalimat\s+Soal)\*?\*?\s*[:-]\s*/gi, "");
    text = text.replace(/(?:\r?\n|^)\s*\*?\*?Pertanyaan\*?\*?\s*[:-]\s*/gi, (match) => {
      return match.startsWith('\n') ? '\n' : match.startsWith('\r\n') ? '\r\n' : '';
    });

    // 1. Convert bullet symbols ● or • to standard markdown list items -
    text = text.replace(/^[ \t]*[●•][ \t]*/gm, "- ");

    // 2. Convert unformatted key-value blocks (like Nama Sekolah : ..., Nama Penyusun : ...) into clean Markdown tables
    text = text.replace(/(?:^\s*(?:Nama Sekolah|Nama Penyusun|Mata Pelajaran|Fase\s*\/[^\n:]+|Alokasi Waktu|Tahun Pelajaran)\s*:\s*[^\n]+\n?){3,}/gim, (match) => {
      const lines = match.trim().split('\n');
      const tableRows = lines.map(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) return '';
        const rawKey = line.substring(0, colonIdx).trim().replace(/^\*\*|\*\*$/g, '');
        const rawVal = line.substring(colonIdx + 1).trim();
        return `| **${rawKey}** | ${rawVal} |`;
      }).filter(Boolean);
      return `\n\n| Komponen Identitas | Keterangan Modul Ajar |\n| :--- | :--- |\n` + tableRows.join('\n') + `\n\n`;
    });

    // 3. Ensure sub-headers like "Pengetahuan:", "Keterampilan:", "Pemahaman:" have bold list formatting
    text = text.replace(/(\n|^)(Pengetahuan|Keterampilan|Pemahaman):(?=\s*\n\s*[-*])/gi, "$1\n- **$2**:");

    // 4. Unwrap SVG from code blocks (e.g. ```xml <svg ...> ... </svg> ``` or ```html ... ```)
    text = text.replace(/```(?:xml|html|svg)?\s*\n?\s*(<svg[\s\S]*?<\/svg>)\s*\n?\s*```/gi, "$1");

    // Decode HTML entities in SVG if present
    text = text.replace(/&lt;svg/gi, "<svg").replace(/&lt;\/svg&gt;/gi, "</svg>");

    // 5. Process and sanitize all <svg>...</svg> blocks
    text = text.replace(/<svg[\s\S]*?<\/svg>/gi, (svgMatch) => {
      let clean = svgMatch
        .replace(/\bstroke-width=/gi, 'strokeWidth=')
        .replace(/\bstroke-dasharray=/gi, 'strokeDasharray=')
        .replace(/\bstroke-linecap=/gi, 'strokeLinecap=')
        .replace(/\bstroke-linejoin=/gi, 'strokeLinejoin=')
        .replace(/\bstroke-opacity=/gi, 'strokeOpacity=')
        .replace(/\bfill-opacity=/gi, 'fillOpacity=')
        .replace(/\bfont-size=/gi, 'fontSize=')
        .replace(/\bfont-weight=/gi, 'fontWeight=')
        .replace(/\bfont-family=/gi, 'fontFamily=')
        .replace(/\btext-anchor=/gi, 'textAnchor=')
        .replace(/\bdominant-baseline=/gi, 'dominantBaseline=')
        .replace(/\balignment-baseline=/gi, 'alignmentBaseline=')
        .replace(/\bclip-path=/gi, 'clipPath=')
        .replace(/\bclip-rule=/gi, 'clipRule=')
        .replace(/\bfill-rule=/gi, 'fillRule=')
        .replace(/\bstop-color=/gi, 'stopColor=')
        .replace(/\bstop-opacity=/gi, 'stopOpacity=')
        .replace(/\bvector-effect=/gi, 'vectorEffect=')
        .replace(/\bshape-rendering=/gi, 'shapeRendering=');

      clean = clean.replace(/(\r?\n)\s*(\r?\n)+/g, "$1");
      return `\n\n${clean}\n\n`;
    });

    // 6. Comprehensive Math & LaTeX sanitization:
    // a. Normalize LaTeX display delimiters \[ ... \] to display math block $$\n...\n$$
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
      return `\n\n$$\n${math.trim()}\n$$\n\n`;
    });

    // b. Normalize LaTeX inline delimiters \( ... \) to inline math $...$
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
      return `$${math.trim()}$`;
    });

    // c. Auto-wrap standalone LaTeX environments that are NOT already enclosed in $$ and normalize single-backslash newlines & hline
    text = text.replace(/(?:\\*begin{(aligned|align\*?|equation\*?|gather\*?|matrix|pmatrix|bmatrix|cases|array)})([\s\S]*?)(?:\\*end{\1})/gi, (match, env, inner, offset, str) => {
      let cleanInner = inner;
      // Convert " \ " (space, single backslash, space) or " \ " with newlines to " \\ " (LaTeX newline)
      cleanInner = cleanInner.replace(/(?<!\\)\s*\\\s+/g, " \\\\ ");
      
      // Check if already enclosed in $$ or display math fences
      const before = str.substring(0, offset).trim();
      const after = str.substring(offset + match.length).trim();
      const isEnclosed = before.endsWith("$$") && after.startsWith("$$");

      const blockContent = env === "aligned" && cleanInner.includes("\\hline")
        ? `\\begin{array}{ll}${cleanInner}\\end{array}`
        : `\\begin{${env}}${cleanInner}\\end{${env}}`;

      if (isEnclosed) {
        return blockContent;
      }
      return `\n\n$$\n${blockContent}\n$$\n\n`;
    });

    // d. Normalize $$ block math fences and clean up any duplicates or empty fences:
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      const trimmed = math.trim();
      return `\n\n$$\n${trimmed}\n$$\n\n`;
    });

    // Clean up empty or adjacent $$ blocks (e.g. $$ $$ or $$ \n $$)
    text = text.replace(/\$\$\s*\$\$/g, "");

    // e. Clean up excess newlines
    text = text.replace(/\n{3,}/g, "\n\n");

    return text;
  };

  const exportToWord = (contentHtml: string) => {
    exportToWordFormatted(contentHtml, {}, userProfile);
  };

  const quickActions = [
    {
      id: "modul",
      title: "Buat Modul Ajar",
      icon: BookOpen,
      prompt: "", // Handled by modal
      color: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
    },
    {
      id: "cptp",
      title: "Analisis CP & ATP",
      icon: Target,
      prompt: "", // Handled by modal
      color: "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
    },
    {
      id: "soal",
      title: "Generator Soal",
      icon: FileQuestion,
      prompt: "", // Handled by modal
      color: "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
    },
    {
      id: "pembahasan",
      title: "Pembahasan Soal",
      icon: Lightbulb,
      prompt: "", // Handled by modal
      color: "bg-teal-50 text-teal-600 border-teal-200 hover:bg-teal-100"
    },
    {
      id: "penilaian",
      title: "Penilaian & Koreksi AI",
      icon: ClipboardCheck,
      prompt: "", // Handled by modal
      color: "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
    },
    {
      id: "rubrik",
      title: "Rubrik Penilaian",
      icon: CheckSquare,
      prompt: "Tolong buatkan rubrik penilaian proyek [Nama Proyek/Tugas] dengan 4 kriteria utama menggunakan skala 1-4.",
      color: "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
    },
    {
      id: "prota",
      title: "Prota, Prosem & KKTP",
      icon: CalendarDays,
      prompt: "", // Handled by modal
      color: "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
    },
    {
      id: "buku_teks",
      title: "Buku Teks Kemendikdasmen",
      icon: BookMarked,
      prompt: "", // Handled by modal
      color: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
    },
    {
      id: "panduan_mapel",
      title: "Panduan Mapel Kemendikdasmen",
      icon: BookOpen,
      prompt: "", // Handled by modal
      color: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100"
    }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-90px)] w-full bg-white rounded-2xl md:rounded-3xl shadow-md border border-slate-200 overflow-hidden relative">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-3 sm:p-4 flex items-center justify-between shrink-0 z-50 relative">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-9 h-9 sm:w-10 sm:h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors relative shrink-0"
            title="Riwayat Percakapan"
          >
            <Menu size={20} />
            {sessions.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-indigo-600" />
            )}
          </button>
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shrink-0">
            <Bot size={22} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold font-display flex items-center gap-1.5 truncate">
              EduAsisten <Sparkles size={14} className="text-amber-300 shrink-0" />
            </h2>
            <p className="text-[10px] sm:text-[11px] font-medium text-indigo-100 opacity-90 truncate hidden sm:block">
              Ahli Pedagogi & Administrasi Kurikulum Merdeka (SD, SMP, SMA, SMK)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Link Referensi Resmi Perbukuan Kemendikdasmen */}
          <a
            href="https://buku.kemendikdasmen.go.id/katalog"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 sm:px-2.5 py-1.5 bg-indigo-500/80 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border border-indigo-400/40"
            title="Katalog Perbukuan Kemendikdasmen (buku.kemendikdasmen.go.id/katalog)"
          >
            <BookMarked size={14} className="text-amber-300" />
            <span className="hidden 2xl:inline">Katalog Buku</span>
          </a>

          {/* Link Referensi Resmi Panduan Mapel Kemendikdasmen */}
          <a
            href="https://kurikulum.kemendikdasmen.go.id/panduan-mapel"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 sm:px-2.5 py-1.5 bg-sky-500/80 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border border-sky-400/40"
            title="Situs Resmi Panduan Mata Pelajaran Kemendikdasmen"
          >
            <ExternalLink size={14} className="text-sky-100" />
            <span className="hidden xl:inline">Panduan Mapel</span>
          </a>

          {/* Tombol Pusat Referensi & Katalog Modal */}
          <button
            onClick={() => setIsPanduanModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border border-white/20"
            title="Pusat Referensi Buku Teks & Panduan Mapel Kemendikdasmen"
          >
            <Library size={14} className="text-amber-300" />
            <span className="hidden lg:inline">Referensi</span>
          </button>

          {/* Tombol Sinkronisasi Database Google Drive */}
          <button
            onClick={() => setIsDriveModalOpen(true)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border ${
              isDriveConnected
                ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border-emerald-400/50"
                : "bg-white/10 hover:bg-white/20 text-white border-white/20"
            }`}
            title="Sinkronisasi Database Google Drive Lintas Perangkat"
          >
            <Cloud size={14} className={isDriveConnected ? "text-emerald-300" : "text-white"} />
            <span className="hidden md:inline">
              {isDriveConnected ? "Drive Aktif" : "Drive Sync"}
            </span>
            {isDriveConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setIsPembahasanModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border border-emerald-400/40"
            title="Pembahasan Soal (AI Langsung atau Sumber Dokumen / Foto)"
          >
            <Lightbulb size={14} className="text-amber-300" />
            <span className="hidden md:inline">Pembahasan Soal</span>
          </button>
          {sessions.length > 0 && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <MessageSquare size={14} />
              <span className="hidden md:inline">Riwayat</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">{sessions.length}</span>
            </button>
          )}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5 shadow-xs"
            title="Profil Guru & TTD Kepala Sekolah"
          >
            <User size={14} />
            <span className="hidden sm:inline">Profil Guru</span>
          </button>

          {/* Tombol Menu Deck */}
          <button
            onClick={() => setIsDeckOpen(!isDeckOpen)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-xs border ${
              isDeckOpen
                ? "bg-violet-600 text-white border-violet-500 hover:bg-violet-700"
                : "bg-white/10 hover:bg-white/20 text-white border-white/20"
            }`}
            title="Buka / Tutup Menu Deck Fitur Cepat"
          >
            <Sparkles size={14} className={isDeckOpen ? "text-amber-300" : "text-amber-400 animate-pulse"} />
            <span>Menu Deck</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar History Drawer (Autohide) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs z-30" 
                onClick={() => setIsSidebarOpen(false)}
              />
              
              {/* Drawer */}
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute top-0 left-0 bottom-0 z-40 bg-white w-72 h-full border-r border-slate-200 flex flex-col shadow-2xl"
              >
                <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-indigo-600" />
                    <h3 className="font-extrabold text-sm text-slate-800">Riwayat Percakapan</h3>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  <button 
                    onClick={handleNewChat}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Percakapan Baru
                  </button>
                  <button 
                    onClick={() => {
                      setIsSidebarOpen(false);
                      setPerangkatModalTab('arsip');
                      setIsPerangkatModalOpen(true);
                    }}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Library size={15} /> RPP & Modul Tersimpan
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => {
                        setCurrentSessionId(session.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer group ${
                        currentSessionId === session.id 
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60" 
                          : "hover:bg-slate-50 text-slate-600 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MessageSquare size={14} className={currentSessionId === session.id ? "text-indigo-600 shrink-0" : "text-slate-400 shrink-0"} />
                        <span className="truncate">{session.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all shrink-0"
                        title="Hapus riwayat"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-center py-8 px-4 text-slate-400">
                      <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium">Belum ada riwayat percakapan</p>
                      <p className="text-[10px] mt-1 text-slate-400">Percakapan Anda akan tersimpan secara otomatis di sini.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-3 max-w-[92%] md:max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === "user" ? "bg-indigo-100 text-indigo-600" : "bg-indigo-600 text-white"}`}>
                  {msg.role === "user" ? <UserIcon /> : <Bot size={16} />}
                </div>
                
                <div className={`p-4 rounded-2xl shadow-xs relative group ${
                  msg.role === "user" 
                    ? "bg-indigo-600 text-white rounded-tr-sm" 
                    : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
                }`}>
                  {/* Quoted Reply Banner */}
                  {msg.replyTo && (
                    <div className={`mb-3 p-2.5 rounded-xl text-xs border-l-4 ${
                      msg.role === "user" 
                        ? "bg-indigo-700/60 border-amber-300 text-indigo-100" 
                        : "bg-slate-100 border-indigo-500 text-slate-700"
                    }`}>
                      <div className="flex items-center gap-1 font-bold text-[11px] mb-0.5 opacity-90">
                        <Reply size={12} />
                        <span>{msg.replyTo.role === "user" ? "Membalas Pesan Guru" : "Membalas EduAsisten"}</span>
                      </div>
                      <p className="line-clamp-2 italic font-normal">{msg.replyTo.content}</p>
                    </div>
                  )}

                  {msg.role === "user" ? (
                    <div className="flex flex-col gap-2">
                      <p className="whitespace-pre-wrap text-sm font-medium">{msg.content}</p>
                      
                      {/* User message actions */}
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-indigo-500/30">
                        <button
                          onClick={() => handleReplyMessage(msg)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-indigo-100 hover:text-white hover:bg-indigo-700 transition-colors"
                          title="Balas pesan ini"
                        >
                          <Reply size={12} /> Balas
                        </button>
                        {!isLoading && (
                          <button 
                            onClick={() => handleEditMessage(msg)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-indigo-100 hover:text-white hover:bg-indigo-700 transition-colors"
                            title="Edit / perbaiki pesan"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {editingAssistantMsgId === msg.id ? (
                        <div className="flex flex-col gap-2 mt-1">
                          <p className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                            <Edit2 size={11} /> Anda sedang mengedit naskah dokumen ini langsung. Silakan sesuaikan isi teks di bawah:
                          </p>
                          <textarea
                            value={editingAssistantContent}
                            onChange={(e) => setEditingAssistantContent(e.target.value)}
                            className="w-full min-h-[420px] p-3 border-2 border-indigo-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-800 leading-relaxed"
                            placeholder="Edit naskah dokumen di sini..."
                          />
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={() => setEditingAssistantMsgId(null)}
                              className="px-3 py-1.5 text-xs font-extrabold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => {
                                const updatedMessages = messages.map(m => {
                                  if (m.id === msg.id) {
                                    return { ...m, content: editingAssistantContent };
                                  }
                                  return m;
                                });
                                setMessages(updatedMessages);
                                saveCurrentSession(updatedMessages);
                                setEditingAssistantMsgId(null);
                              }}
                              className="px-3 py-1.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <Check size={12} />
                              Simpan Perubahan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div id={`markdown-${msg.id}`} className="markdown-body text-sm prose prose-sm prose-slate max-w-none 
                          prose-headings:font-bold prose-headings:text-slate-800 
                          prose-p:leading-relaxed prose-a:text-indigo-600
                          prose-strong:text-slate-800 prose-ul:list-disc prose-ol:list-decimal">
                          <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, trust: true }]]}>{processMarkdownContent(msg.content)}</Markdown>
                        </div>
                      )}

                      {/* Assistant Message Actions Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Interactive Edit Content Option */}
                          <button 
                            onClick={() => {
                              setEditingAssistantMsgId(msg.id);
                              setEditingAssistantContent(msg.content);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg transition-colors border border-amber-200/60 shadow-2xs animate-pulse-subtle"
                            title="Edit atau periksa isi naskah dokumen ini langsung sebelum dicetak/ekspor"
                          >
                            <Edit2 size={13} className="text-amber-600 animate-spin-slow" />
                            <span>Edit Konten</span>
                          </button>

                          {/* Quick Word Export */}
                          <button 
                            onClick={() => {
                              const el = document.getElementById(`markdown-${msg.id}`);
                              if (el) exportToWordFormatted(el.innerHTML, {}, userProfile);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors border border-blue-200/60 shadow-2xs"
                            title="Unduh format Microsoft Word (.doc) rapi & siap pakai"
                          >
                            <Download size={13} className="text-blue-600" />
                            <span>Word</span>
                          </button>

                          {/* Quick PDF & Print */}
                          <button 
                            onClick={() => {
                              const el = document.getElementById(`markdown-${msg.id}`);
                              if (el) printDocumentFormatted(el.innerHTML, {}, userProfile);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors border border-rose-200/60 shadow-2xs"
                            title="Cetak langsung atau simpan dokumen ke PDF A4/F4"
                          >
                            <Printer size={13} className="text-rose-600" />
                            <span>PDF / Cetak</span>
                          </button>

                          {/* Copy Formatted Rich-Text */}
                          <button 
                            onClick={() => {
                              setReviewFields({
                                judulPaket: perangkatForm.materi 
                                  ? `${perangkatForm.mapel || "Ekonomi"}: ${perangkatForm.materi}` 
                                  : "Pengantar Akuntansi: Tujuan Utama dan Pihak yang Membutuhkan Informasi Keuangan",
                                sekolah: perangkatForm.namaSekolah || userProfile.namaSekolah || "SMA Negeri 2 Tasikmalaya",
                                guru: perangkatForm.namaPenyusun || userProfile.namaPenyusun || "Yudi Ginanjar",
                                mapel: perangkatForm.mapel || "Ekonomi",
                                kelas: perangkatForm.kelas || "XII D4",
                                semester: perangkatForm.semester || "Ganjil",
                                materi: perangkatForm.materi || "Pengantar Akuntansi",
                                alokasiWaktu: perangkatForm.waktuJP 
                                  ? `${perangkatForm.waktuJP} JP (${perangkatForm.jumlahPertemuan || 1} Pertemuan)`
                                  : "2 JP (1 Pertemuan)",
                                kurikulum: perangkatForm.kurikulum || "Kurikulum Merdeka",
                                modelPembelajaran: perangkatForm.modelPembelajaran || "Problem Based Learning (PBL)",
                                kedalaman: perangkatForm.kedalaman || "Standar",
                                warnaUtama: "Amber & Indigo",
                                visualStyle: "Modern & Bersih",
                                fonts: "Playfair Display + Plus Jakarta Sans",
                                instruksiTambahan: perangkatForm.instruksiTambahan || "",
                                content: msg.content
                              });
                              setReviewTab('ringkasan');
                              setIsPerangkatReviewModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg transition-colors border border-amber-200/60 shadow-2xs"
                            title="Simpan dokumen ini ke Arsip Modul Ajar untuk diedit di lain waktu"
                          >
                            <CheckSquare size={13} className="text-amber-600" />
                            <span>Simpan ke Arsip</span>
                          </button>

                          <button 
                            onClick={async () => {
                              const el = document.getElementById(`markdown-${msg.id}`);
                              if (el) {
                                const success = await copyFormattedRichText(el.innerHTML, {}, userProfile);
                                if (success) {
                                  setCopiedRichId(msg.id);
                                  setTimeout(() => setCopiedRichId(null), 2000);
                                }
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors border border-emerald-200/60 shadow-2xs"
                            title="Salin tabel & format langsung ke Word/Google Docs (Ctrl+V tanpa berantakan)"
                          >
                            {copiedRichId === msg.id ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} className="text-emerald-600" />}
                            <span>{copiedRichId === msg.id ? "Format Tersalin!" : "Salin Rapi"}</span>
                          </button>

                          {/* Complete Export Options & Preview Modal */}
                          <button 
                            onClick={() => {
                              const el = document.getElementById(`markdown-${msg.id}`);
                              if (el) {
                                setExportModalContent(cleanIntroPreamble(el.innerHTML));
                                let hint: string | undefined = undefined;
                                const text = msg.content.toLowerCase();
                                if (text.includes("lembar kerja peserta didik") || text.includes("lkpd")) {
                                  hint = "lkpd";
                                } else if (text.includes("modul ajar") || text.includes("rppm")) {
                                  hint = "modul";
                                } else if (text.includes("program tahunan") || text.includes("prosem") || text.includes("prota")) {
                                  hint = "prota";
                                } else if (text.includes("pembahasan") || text.includes("kunci jawaban")) {
                                  hint = "pembahasan";
                                } else if (text.includes("paket soal") || text.includes("soal no.") || text.includes("kisi-kisi")) {
                                  hint = "soal";
                                } else if (text.includes("rubrik penilaian") || text.includes("kriteria evaluasi")) {
                                  hint = "rubrik";
                                } else if (text.includes("capaian pembelajaran") || text.includes("atp")) {
                                  hint = "atp";
                                }
                                setExportDocTypeHint(hint);
                                setExportInitialTitle(undefined);
                                setIsExportModalOpen(true);
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors border border-indigo-200/60 shadow-2xs"
                            title="Preview & atur Kop Surat, ukuran kertas A4/F4, font resmi, atau TTD"
                          >
                            <SlidersHorizontal size={13} className="text-indigo-600" />
                            <span>Opsi Ekspor</span>
                          </button>

                          <button 
                            onClick={() => handleReplyMessage(msg)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                          >
                            <Reply size={13} />
                            Balas
                          </button>

                          <button 
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                            title="Salin teks Markdown mentah"
                          >
                            {copiedId === msg.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            {copiedId === msg.id ? "Tersalin!" : "Teks"}
                          </button>

                          {/* Revision Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setShowRevisionMenu(showRevisionMenu === msg.id ? null : msg.id)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg transition-colors border border-amber-200/50"
                            >
                              <RefreshCw size={13} className="text-amber-600" />
                              Perbaiki
                            </button>

                            {showRevisionMenu === msg.id && (
                              <div className="absolute left-0 bottom-full mb-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 p-1 z-30 space-y-0.5 text-xs">
                                <p className="px-2 py-1 font-bold text-[10px] text-slate-400 uppercase tracking-wider">Minta Perbaikan Jawaban</p>
                                <button
                                  onClick={() => handleQuickRevision(msg, "Sederhanakan penjelasan agar lebih ringkas dan mudah dipahami")}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 text-slate-700 rounded-lg text-xs"
                                >
                                  ⚡ Sederhanakan Penjelasan
                                </button>
                                <button
                                  onClick={() => handleQuickRevision(msg, "Buat lebih detail, komprehensif, dan lengkap dengan langkah-langkah konkret")}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 text-slate-700 rounded-lg text-xs"
                                >
                                  📚 Buat Lebih Detail & Mendalam
                                </button>
                                <button
                                  onClick={() => handleQuickRevision(msg, "Ubah format penyajian ke bentuk tabel yang rapi dan terstruktur")}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 text-slate-700 rounded-lg text-xs"
                                >
                                  📊 Ubah ke Format Tabel
                                </button>
                                <button
                                  onClick={() => handleQuickRevision(msg, "Sesuaikan materi dan soal ke tingkat HOTS (Higher Order Thinking Skills - C4-C6)")}
                                  className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 text-slate-700 rounded-lg text-xs"
                                >
                                  🎯 Sesuaikan Tingkat HOTS
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Thumbs up/down feedback */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleFeedback(msg.id, "like")}
                            className={`p-1 rounded-lg transition-colors ${
                              msg.feedback === "like" ? "bg-emerald-100 text-emerald-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            }`}
                            title="Bagus & Bermanfaat"
                          >
                            <ThumbsUp size={13} />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, "dislike")}
                            className={`p-1 rounded-lg transition-colors ${
                              msg.feedback === "dislike" ? "bg-rose-100 text-rose-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            }`}
                            title="Kurang Tepat / Butuh Perbaikan"
                          >
                            <ThumbsDown size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex gap-3 max-w-[80%] flex-row">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1">
                  <Bot size={16} />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-sm bg-white border border-slate-200 shadow-xs flex items-center gap-2 text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs font-semibold">EduAsisten sedang mengetik...</span>
                </div>
              </div>
            </motion.div>
          )}
          {/* Removed in-chat quickActions to prevent obstruction */}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions & Input Area */}
        <div className="bg-white border-t border-slate-200 p-4 shrink-0">
        {/* Active Replying Bar */}
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 mb-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 animate-in fade-in slide-in-from-bottom-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Reply size={14} className="text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-[11px] text-indigo-700 block">
                  Membalas {replyingTo.role === "user" ? "Pesan Guru" : "EduAsisten"}:
                </span>
                <p className="truncate text-slate-600 text-[11px]">{replyingTo.content}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-indigo-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors shrink-0"
              title="Batal membalas"
            >
              <X size={14} />
            </button>
          </div>
        )}
        
        {/* Quick Toolbar Pill Buttons removed to keep chat area unobstructed */}
        
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          <button
            type="button"
            onClick={() => setIsPembahasanModalOpen(true)}
            className="h-[50px] w-[50px] shrink-0 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-500 border border-slate-200 rounded-2xl flex flex-col items-center justify-center transition-colors shadow-2xs"
            title="Unggah Foto / Dokumen Soal (PDF / Word / Foto)"
          >
            <Upload size={16} />
            <span className="text-[9px] font-bold mt-0.5">Lampirkan</span>
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Tanya EduAsisten atau ketik instruksi Anda..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none min-h-[50px] max-h-[150px]"
            rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 5) : 1}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-[50px] w-[50px] shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition-colors shadow-sm"
          >
            <Send size={18} className={input.trim() && !isLoading ? "ml-1" : ""} />
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
          EduAsisten dapat membuat kesalahan. Harap tinjau kembali modul ajar atau soal yang dihasilkan.
        </p>
      </div>
      </div>

      {/* Menu Deck Sidebar Panel */}
      <AnimatePresence>
        {isDeckOpen && (
          <>
            {/* On mobile: Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-35" 
              onClick={() => setIsDeckOpen(false)}
            />
            
            {/* Deck Panel */}
            <motion.div 
              initial={{ x: "100%", opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.9 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="absolute lg:relative top-0 right-0 bottom-0 z-40 lg:z-10 bg-slate-50 w-80 sm:w-88 h-full border-l border-slate-200 flex flex-col shadow-2xl lg:shadow-none"
            >
              {/* Header */}
              <div className="bg-white border-b border-slate-200 p-4 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 font-display">Menu Deck</h3>
                    <p className="text-[10px] text-slate-400 font-medium font-sans">Fitur Cepat & AI</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDeckOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  title="Sembunyikan Deck"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Categories & Buttons Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                
                {/* Kategori 1: Perangkat Pembelajaran */}
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold text-indigo-600 tracking-wider uppercase flex items-center gap-1.5 px-1">
                    <BookOpen size={10} />
                    <span>Perangkat Pembelajaran</span>
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => handleQuickAction("modul", "")}
                      className="w-full text-left p-3 bg-white hover:bg-indigo-50/40 border border-slate-200/60 rounded-2xl transition-all shadow-2xs group flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform shrink-0">
                        <BookOpen size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                          Modul Ajar Deep Learning
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-normal">
                          Rancang RPPM / Modul Ajar lengkap pendekatan 8-3-3-4.
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleQuickAction("cptp", "")}
                      className="w-full text-left p-3 bg-white hover:bg-indigo-50/40 border border-slate-200/60 rounded-2xl transition-all shadow-2xs group flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform shrink-0">
                        <Target size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                          Analisis CP & ATP
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-normal">
                          Bedah elemen CP menjadi TP & ATP regulasi BSKAP 046/2025.
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleQuickAction("prota", "")}
                      className="w-full text-left p-3 bg-white hover:bg-indigo-50/40 border border-slate-200/60 rounded-2xl transition-all shadow-2xs group flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform shrink-0">
                        <CalendarDays size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                          Prota, Prosem & KKTP
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-normal">
                          Buat perencanaan tahunan, program semester & kriteria KKTP.
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setPerangkatModalTab('arsip');
                        setIsPerangkatModalOpen(true);
                      }}
                      className="w-full text-left p-3 bg-indigo-50/20 hover:bg-indigo-50/40 border border-indigo-200/50 rounded-2xl transition-all shadow-2xs group flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform shrink-0">
                        <Library size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                          RPP & Modul Ajar Tersimpan
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-normal">
                          Lihat, edit, dan unduh dokumen RPP/Modul Ajar yang telah Anda simpan di arsip.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Kategori 2: Kreator Tugas & LKPD */}
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold text-violet-600 tracking-wider uppercase flex items-center gap-1.5 px-1">
                    <Sparkles size={10} />
                    <span>Kreator Tugas & LKPD</span>
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => handleQuickAction("lkpd", "")}
                      className="w-full text-left p-3 bg-violet-50/30 hover:bg-violet-50 border border-violet-200/60 rounded-2xl transition-all shadow-2xs group flex items-start gap-3 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bg-violet-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                        Baru
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center border border-violet-200 group-hover:scale-105 transition-transform shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-violet-700 transition-colors">
                          Generator LKPD AI
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-normal">
                          Buat Lembar Kerja Peserta Didik interaktif berbasis Deep Learning.
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleQuickAction("materi", "")}
                      className="w-full text-left p-3 bg-white hover:bg-violet-50/40 border border-slate-200/60 rounded-2xl transition-all shadow-2xs group flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 group-hover:scale-105 transition-transform shrink-0">
                        <BookMarked size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-violet-600 transition-colors">
                          Generator Materi Ajar
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-normal">
                          Buat rangkuman materi dan bahan bacaan siswa yang terstruktur.
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleQuickAction("soal", "")}
                      className="w-full text-left p-3 bg-white hover:bg-violet-50/40 border border-slate-200/60 rounded-2xl transition-all shadow-2xs group flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 group-hover:scale-105 transition-transform shrink-0">
                        <FileQuestion size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-violet-600 transition-colors">
                          Generator Paket Soal
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-normal">
                          Susun bank soal HOTS/MOTS/LOTS Bloom C1-C6 & Rubrik.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Kategori 3: Pembahasan & Koreksi AI */}
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold text-teal-600 tracking-wider uppercase flex items-center gap-1.5 px-1">
                    <Lightbulb size={10} />
                    <span>Pembahasan & Koreksi AI</span>
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => handleQuickAction("pembahasan", "")}
                      className="w-full text-left p-3 bg-white hover:bg-teal-50/40 border border-slate-200/60 rounded-2xl transition-all shadow-2xs group flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 group-hover:scale-105 transition-transform shrink-0">
                        <Lightbulb size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-teal-600 transition-colors">
                          Pembahasan Soal AI
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-normal">
                          Bedah naskah soal dari teks, foto papan tulis, PDF, atau dokumen.
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleQuickAction("penilaian", "")}
                      className="w-full text-left p-3 bg-white hover:bg-teal-50/40 border border-slate-200/60 rounded-2xl transition-all shadow-2xs group flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 group-hover:scale-105 transition-transform shrink-0">
                        <ClipboardCheck size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-teal-600 transition-colors">
                          Koreksi & Penilaian AI
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-normal">
                          Pindai lembar jawaban siswa dan hitung skor otomatis.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Kategori 4: Referensi Kurikulum */}
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold text-amber-600 tracking-wider uppercase flex items-center gap-1.5 px-1">
                    <Library size={10} />
                    <span>Katalog & Referensi Resmi</span>
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => handleQuickAction("buku_teks", "")}
                      className="w-full text-left p-3 bg-white hover:bg-amber-50/40 border border-slate-200/60 rounded-2xl transition-all shadow-2xs group flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform shrink-0">
                        <BookMarked size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-amber-700 transition-colors">
                          Katalog Buku Digital
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-normal">
                          Akses buku teks utama PAUD, SD, SMP, SMA, & SMK Kejuruan.
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleQuickAction("panduan_mapel", "")}
                      className="w-full text-left p-3 bg-white hover:bg-amber-50/40 border border-slate-200/60 rounded-2xl transition-all shadow-2xs group flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform shrink-0">
                        <Library size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 group-hover:text-amber-700 transition-colors">
                          Panduan Mapel Resmi
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-normal">
                          Panduan implementasi & kesesuaian materi kurikulum.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>

      {/* Edit Module Modal */}
      {editingModule && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col h-[90vh]"
          >
            <div className="bg-indigo-600 px-5 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-white flex items-center gap-2">
                <Edit2 size={18} />
                Edit Modul Ajar
              </h3>
              <button 
                onClick={() => setEditingModule(null)}
                className="text-indigo-100 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-5 overflow-hidden flex flex-col gap-4 bg-slate-50">
               <div className="flex flex-col md:flex-row gap-4 shrink-0">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">Judul Dokumen</label>
                    <input 
                      type="text"
                      value={editingModule.title}
                      onChange={(e) => setEditingModule({...editingModule, title: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
               </div>
               <div className="flex-1 flex flex-col space-y-1 h-full min-h-0">
                 <label className="text-[11px] font-bold text-slate-700 uppercase flex justify-between">
                   <span>Konten Markdown</span>
                   <span className="text-slate-400 font-normal">Gunakan format Markdown untuk tata letak rapi</span>
                 </label>
                 <textarea 
                   value={editingModule.content}
                   onChange={(e) => setEditingModule({...editingModule, content: e.target.value})}
                   className="w-full h-full flex-1 bg-white border border-slate-200 rounded-xl p-4 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none whitespace-pre-wrap"
                 />
               </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingModule(null)}
                className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setSavedModules(prev => prev.map(m => m.id === editingModule.id ? editingModule : m));
                  setEditingModule(null);
                  setIsPerangkatModalOpen(true);
                  setPerangkatModalTab('arsip');
                }}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check size={16} /> Simpan Perubahan
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Perangkat Pembelajaran Modal */}
      {isPerangkatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-indigo-600 px-5 py-4 flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-white flex items-center gap-2">
                  <BookOpen size={18} />
                  Perencanaan Pembelajaran
                </h3>
                <button 
                  onClick={() => setIsPerangkatModalOpen(false)}
                  className="text-indigo-100 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex p-1 bg-indigo-700/50 rounded-lg">
                <button
                  onClick={() => setPerangkatModalTab('buat')}
                  className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${
                    perangkatModalTab === 'buat' ? 'bg-white text-indigo-700 shadow-xs' : 'text-indigo-100 hover:text-white'
                  }`}
                >
                  Buat Baru
                </button>
                <button
                  onClick={() => setPerangkatModalTab('arsip')}
                  className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${
                    perangkatModalTab === 'arsip' ? 'bg-white text-indigo-700 shadow-xs' : 'text-indigo-100 hover:text-white'
                  }`}
                >
                  Arsip Modul Ajar
                </button>
              </div>
            </div>

            {perangkatModalTab === 'buat' ? (
              <>
            <div className="p-5 overflow-y-auto">
              <form id="perangkat-form" onSubmit={handlePerangkatSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Jenis Perangkat</label>
                    <select
                      value={perangkatForm.jenis}
                      onChange={(e) => {
                        const newJenis = e.target.value;
                        setPerangkatForm({
                          ...perangkatForm,
                          jenis: newJenis,
                          kedalaman: newJenis === "Generator Materi Ajar"
                            ? "Sangat Mendalam & Komprehensif (Buku Teks Mandiri)"
                            : (perangkatForm.kedalaman.includes("Sangat Mendalam") ? "Mendalam" : perangkatForm.kedalaman)
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-indigo-700"
                    >
                      <option value="RPP Pembelajaran Mendalam">RPP Pembelajaran Mendalam</option>
                      <option value="Modul Ajar Kurikulum merdeka">Modul Ajar Kurikulum Merdeka</option>
                      <option value="Generator Materi Ajar">Generator Materi Ajar (Bahan Bacaan Komprehensif)</option>
                      <option value="RPP Model 1 Lembar">RPP Model 1 Lembar</option>
                      <option value="RPP Lengkap K13">RPP Lengkap K13</option>
                      <option value="Analisis CP & ATP">Analisis CP, TP, dan ATP</option>
                      <option value="Prota, Prosem & Analisis KKTP">Prota, Prosem & Analisis KKTP</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Kurikulum</label>
                    <select
                      value={perangkatForm.kurikulum}
                      onChange={(e) => setPerangkatForm({...perangkatForm, kurikulum: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="Kurikulum Merdeka">Kurikulum Merdeka</option>
                      <option value="Kurikulum 2013">Kurikulum 2013</option>
                      <option value="Kurikulum Cambridge">Kurikulum Cambridge</option>
                    </select>
                  </div>
                </div>

                {perangkatForm.jenis === "Generator Materi Ajar" && (
                  <div className="p-3 bg-gradient-to-r from-indigo-50/90 via-violet-50/90 to-purple-50/90 border border-indigo-200/90 rounded-2xl flex items-start gap-2.5 shadow-2xs">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Sparkles size={14} />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                        <span>Mode Materi Ajar Komprehensif & Mandiri Aktif</span>
                        <span className="text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.2 rounded-full">Anti-Ringkasan</span>
                      </p>
                      <p className="text-[11px] text-indigo-900 leading-relaxed font-medium">
                        AI akan menyusun bahan bacaan siswa secara menyeluruh dan tuntas: setiap sub-konsep diuraikan mendalam (multi-paragraf), dilengkapi kotak konsep kunci, landasan teori, tabel komparasi, rumus/telaah kasus nyata, analogi, serta soal uji pemahaman tanpa disingkat.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Jenjang Sekolah</label>
                    <select
                      value={perangkatForm.jenjang}
                      onChange={(e) => handleJenjangChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="SD">SD</option>
                      <option value="SMP">SMP</option>
                      <option value="SMA">SMA</option>
                      <option value="SMK">SMK</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Kelas / Fase</label>
                    <select
                      value={perangkatForm.kelas}
                      onChange={(e) => handleKelasChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {DATA_JENJANG[perangkatForm.jenjang as keyof typeof DATA_JENJANG].map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mata Pelajaran</label>
                    <select
                      value={perangkatForm.mapel}
                      onChange={(e) => handleMapelChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {getMapelList(perangkatForm.kelas, perangkatForm.jenjang).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Elemen</label>
                    <select
                      value={perangkatForm.elemen}
                      onChange={(e) => handleElemenChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {getElemenList(perangkatForm.mapel, perangkatForm.kelas).map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Capaian Pembelajaran (CP)</label>
                    <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                      BSKAP No. 046/H/KR/2025
                    </span>
                  </div>
                  <select
                    value={perangkatForm.cp}
                    onChange={(e) => setPerangkatForm({...perangkatForm, cp: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {getCP(perangkatForm.mapel, perangkatForm.kelas, perangkatForm.elemen).map((cp, idx) => (
                      <option key={idx} value={cp}>{cp.length > 80 ? cp.substring(0, 80) + "..." : cp}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 italic mt-1 leading-relaxed">
                    "{perangkatForm.cp}"
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Materi Pokok / Esensial</label>
                  <input
                    type="text"
                    list="materi-options"
                    placeholder="Pilih atau masukkan materi pokok (lengkap)..."
                    value={perangkatForm.materi}
                    onChange={(e) => setPerangkatForm({...perangkatForm, materi: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <datalist id="materi-options">
                    {getMateriEsensial(perangkatForm.mapel, perangkatForm.kelas, perangkatForm.elemen).map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                {/* Sub-Materi Multi-Select Dropdown */}
                <SubMateriMultiSelect
                  materi={perangkatForm.materi}
                  mapel={perangkatForm.mapel}
                  kelas={perangkatForm.kelas}
                  elemen={perangkatForm.elemen}
                  selected={perangkatForm.subMateri || []}
                  onChange={(newSelected) => setPerangkatForm(prev => ({ ...prev, subMateri: newSelected }))}
                  accentColor="indigo"
                  label="Sub-Materi Terfokus"
                  placeholder="Pilih sub-materi (dapat pilih lebih dari 1)..."
                />

                {/* Variasi Stimulus & Contoh Kasus Kontekstual untuk Generator Materi Ajar & Modul Ajar/RPP */}
                {(perangkatForm.jenis === "Generator Materi Ajar" || perangkatForm.jenis.includes("Modul Ajar") || perangkatForm.jenis.includes("RPP")) && (
                  <div className="space-y-1.5 p-3 bg-violet-50/60 border border-violet-100 rounded-xl">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-violet-900 uppercase tracking-wide">
                        Variasi Kasus & Stimulus Kontekstual
                      </label>
                      <span className="text-[10px] font-bold text-violet-700 bg-white px-2 py-0.5 rounded-full border border-violet-200">
                        {perangkatForm.jenis === "Generator Materi Ajar" ? "Bahan Bacaan Siswa" : "Skenario Pembelajaran"}
                      </span>
                    </div>
                    <select
                      value={perangkatForm.variasiStimulus || MATERI_AJAR_STIMULUS_LIST[0].id}
                      onChange={(e) => setPerangkatForm(prev => ({ ...prev, variasiStimulus: e.target.value }))}
                      className="w-full bg-white border border-violet-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    >
                      {MATERI_AJAR_STIMULUS_LIST.map(st => (
                        <option key={st.id} value={st.id}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-violet-600 font-medium italic">
                      *Mengarahkan AI menyajikan contoh kontekstual, studi kasus, stimulus fenomena nyata, atau aktivitas siswa yang bervariasi sesuai pendekatan di atas.
                    </p>
                  </div>
                )}

                {/* Skenario Modul Ajar Khusus (Fokus materi, model, pertemuan, dsb) - Dipisahkan dari Prota/Prosem/KKTP */}
                {perangkatForm.jenis !== "Analisis CP & ATP" && perangkatForm.jenis !== "Prota, Prosem & Analisis KKTP" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Fokus Materi <span className="text-slate-400 font-normal lowercase">(opsional)</span></label>
                        <input
                          type="text"
                          placeholder="Contoh: Aplikasi Bunga Majemuk"
                          value={perangkatForm.fokusMateri}
                          onChange={(e) => setPerangkatForm({...perangkatForm, fokusMateri: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                            {perangkatForm.jenis === "Generator Materi Ajar" ? "Kedalaman Pembahasan" : "Kedalaman"}
                          </label>
                          {perangkatForm.jenis === "Generator Materi Ajar" && (
                            <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                              Komprehensif & Tuntas
                            </span>
                          )}
                        </div>
                        <select
                          value={perangkatForm.kedalaman}
                          onChange={(e) => setPerangkatForm({...perangkatForm, kedalaman: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                        >
                          {perangkatForm.jenis === "Generator Materi Ajar" ? (
                            <>
                              <option value="Sangat Mendalam & Komprehensif (Buku Teks Mandiri)">Sangat Mendalam & Komprehensif (Buku Teks Mandiri)</option>
                              <option value="Mendalam & Analitis (Modul Tuntas)">Mendalam & Analitis (Modul Tuntas)</option>
                              <option value="Standar Lengkap">Standar Lengkap</option>
                            </>
                          ) : (
                            <>
                              <option value="Ringkas">Ringkas</option>
                              <option value="Standar">Standar</option>
                              <option value="Mendalam">Mendalam</option>
                            </>
                          )}
                        </select>
                        {perangkatForm.jenis === "Generator Materi Ajar" && (
                          <p className="text-[10px] text-indigo-700 font-medium italic mt-0.5 leading-relaxed">
                            *AI akan membedah seluruh teori, konsep kunci, mekanisme, tabel komparasi, rumus, dan studi kasus secara tuntas tanpa disingkat.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Sumber Belajar <span className="text-slate-400 font-normal lowercase">(opsional)</span></label>
                      <input
                        type="text"
                        placeholder="Contoh: Modul cetak, Youtube, dll."
                        value={perangkatForm.sumberBelajar}
                        onChange={(e) => setPerangkatForm({...perangkatForm, sumberBelajar: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Model Pembelajaran</label>
                      <select
                        value={perangkatForm.modelPembelajaran}
                        onChange={(e) => setPerangkatForm({...perangkatForm, modelPembelajaran: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="Problem Based Learning (PBL)">Problem Based Learning (PBL)</option>
                        <option value="Project Based Learning (PjBL)">Project Based Learning (PjBL)</option>
                        <option value="Discovery Learning">Discovery Learning</option>
                        <option value="Inquiry Learning">Inquiry Learning</option>
                        <option value="Flipped Classroom">Flipped Classroom</option>
                        <option value="Blended Learning">Blended Learning</option>
                        <option value="Cooperative Learning (Jigsaw/STAD)">Cooperative Learning</option>
                        <option value="Design Thinking">Design Thinking</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Semester</label>
                        <select
                          value={perangkatForm.semester}
                          onChange={(e) => setPerangkatForm({...perangkatForm, semester: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          <option value="Ganjil">Ganjil</option>
                          <option value="Genap">Genap</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Pertemuan</label>
                        <select
                          value={perangkatForm.jumlahPertemuan}
                          onChange={(e) => setPerangkatForm({...perangkatForm, jumlahPertemuan: Number(e.target.value)})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Kali</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Waktu (JP)</label>
                        <select
                          value={perangkatForm.waktuJP}
                          onChange={(e) => setPerangkatForm({...perangkatForm, waktuJP: Number(e.target.value)})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                          {Array.from({length: 12}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} JP</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Profil Pelajar Lulusan</label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {[
                          "Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia", 
                          "Kebinekaan Global", 
                          "Bergotong Royong", 
                          "Mandiri", 
                          "Bernalar Kritis", 
                          "Kreatif",
                          "Komunikasi",
                          "Kolaborasi"
                        ].map(profil => (
                          <label key={profil} className="flex items-start gap-2 cursor-pointer bg-slate-50 border border-slate-100 p-2 rounded-lg">
                            <input
                              type="checkbox"
                              checked={perangkatForm.profilLulusan.includes(profil)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPerangkatForm({...perangkatForm, profilLulusan: [...perangkatForm.profilLulusan, profil]});
                                } else {
                                  setPerangkatForm({...perangkatForm, profilLulusan: perangkatForm.profilLulusan.filter(p => p !== profil)});
                                }
                              }}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[10px] font-medium leading-tight text-slate-700">{profil}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Khusus Prota, Prosem & KKTP - Pengaturan Khusus 2 Semester Penuh */}
                {perangkatForm.jenis === "Prota, Prosem & Analisis KKTP" && (
                  <div className="space-y-3 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-slate-50 border border-indigo-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                        <Calendar size={18} />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                          Pengaturan Prota, Prosem & KKTP (2 Semester Penuh)
                        </h4>
                        <p className="text-[11px] text-indigo-700 font-medium">
                          Dokumen terpisah dari modul ajar harian, mencakup 1 tahun pelajaran penuh.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 uppercase">Cakupan Periode</label>
                        <div className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-950 flex items-center justify-between shadow-2xs">
                          <span>Semester 1 & 2 (1 Tahun)</span>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">2 Semester</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 uppercase">Alokasi Jam Pelajaran (JP)</label>
                        <select
                          value={perangkatForm.waktuJP}
                          onChange={(e) => setPerangkatForm({...perangkatForm, waktuJP: Number(e.target.value)})}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                        >
                          <option value={72}>2 JP / Pekan (~72 JP / Tahun)</option>
                          <option value={108}>3 JP / Pekan (~108 JP / Tahun)</option>
                          <option value={144}>4 JP / Pekan (~144 JP / Tahun)</option>
                          <option value={180}>5 JP / Pekan (~180 JP / Tahun)</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-white/90 border border-indigo-100 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span>Struktur Hasil Pembuatan Otomatis:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[10.5px] text-slate-600 pl-1">
                        <li><b>PROTA:</b> Distribusi materi & alokasi JP Semester Ganjil & Genap.</li>
                        <li><b>PROSEM:</b> Matriks kalender pekan Juli-Des (Smt 1) & Jan-Jun (Smt 2).</li>
                        <li><b>KKTP:</b> Analisis Interval Nilai (0-40%, 41-65%, 66-85%, 86-100%) & Tindak Lanjut.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {perangkatForm.jenis !== "Analisis CP & ATP" && (
                  <>
                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      <h3 className="text-sm font-bold text-slate-800">Identitas Dokumen & Pengesahan</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Nama Sekolah</label>
                          <input
                            type="text"
                            placeholder="Contoh: SMAN 1 Jakarta"
                            value={perangkatForm.namaSekolah}
                            onChange={(e) => setPerangkatForm({...perangkatForm, namaSekolah: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Tahun Pelajaran</label>
                          <input
                            type="text"
                            placeholder="Contoh: 2024/2025"
                            value={perangkatForm.tahunPelajaran}
                            onChange={(e) => setPerangkatForm({...perangkatForm, tahunPelajaran: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Nama Penyusun</label>
                          <input
                            type="text"
                            placeholder="Nama Guru"
                            value={perangkatForm.namaPenyusun}
                            onChange={(e) => setPerangkatForm({...perangkatForm, namaPenyusun: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">NIP Penyusun</label>
                          <input
                            type="text"
                            placeholder="NIP Guru"
                            value={perangkatForm.nipPenyusun}
                            onChange={(e) => setPerangkatForm({...perangkatForm, nipPenyusun: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      {/* TTD Kepala Sekolah - Terhubung dengan Profil Guru */}
                      <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <UserCheck size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-extrabold uppercase tracking-wide text-indigo-900">TTD Kepala Sekolah</span>
                              <span className="text-[9px] bg-indigo-200 text-indigo-800 px-1.5 py-0.2 rounded font-bold">Profil</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-700 truncate">
                              {userProfile.namaKepsek ? userProfile.namaKepsek : "Belum diisi di Profil"}
                            </p>
                            {userProfile.nipKepsek && (
                              <p className="text-[10px] text-slate-500 font-mono">NIP. {userProfile.nipKepsek}</p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsProfileModalOpen(true)}
                          className="px-2.5 py-1.5 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors shrink-0 shadow-2xs flex items-center gap-1"
                        >
                          <Settings size={13} />
                          <span>Edit Profil</span>
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Instruksi Tambahan (Opsional)</label>
                        <textarea
                          placeholder="Contoh: Fokuskan pada metode diskusi kelompok untuk materi ini..."
                          value={perangkatForm.instruksiTambahan}
                          onChange={(e) => setPerangkatForm({...perangkatForm, instruksiTambahan: e.target.value})}
                          rows={2}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex justify-between items-center">
                          <span>Referensi Dokumen/Materi (Opsional)</span>
                          {perangkatForm.fileName && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPerangkatForm({
                                  ...perangkatForm,
                                  fileBase64: "",
                                  fileMimeType: "",
                                  fileName: ""
                                });
                              }}
                              className="text-rose-500 hover:text-rose-600 flex items-center gap-1 text-[10px]"
                            >
                              <X size={12} /> Hapus File
                            </button>
                          )}
                        </label>
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-indigo-50/50 transition-colors text-center relative cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/jpg"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const base64 = await compressFileForOCR(file);
                                  const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
                                  const isWord = file.type.includes("word") || file.name.toLowerCase().endsWith(".doc") || file.name.toLowerCase().endsWith(".docx");
                                  setPerangkatForm({
                                    ...perangkatForm,
                                    fileBase64: base64,
                                    fileMimeType: isPdf ? "application/pdf" : (isWord ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "image/jpeg"),
                                    fileName: file.name
                                  });
                                } catch (err) {
                                  console.error("Error processing file:", err);
                                }
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <div className="flex flex-col items-center gap-1 text-slate-600">
                            <Upload size={20} className="text-indigo-600" />
                            <span className="font-bold text-[11px]">
                              {perangkatForm.fileName ? perangkatForm.fileName : "Klik untuk melampirkan file referensi (Word/PDF/Gambar)"}
                            </span>
                            <span className="text-[10px] text-slate-400">PDF, Word, PNG, JPG</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </form>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsPerangkatModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="perangkat-form"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Sparkles size={16} /> Buat {perangkatForm.jenis}
              </button>
            </div>
            </>
            ) : (
            <div className="flex-1 overflow-y-auto p-5 min-h-[300px] bg-slate-50">
              {savedModules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-10">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                    <BookOpen size={32} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-medium">Belum ada modul ajar yang disimpan.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedModules.map(mod => (
                    <div key={mod.id} className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h4 className="font-bold text-slate-800 text-sm">{mod.title}</h4>
                        <button 
                          onClick={() => {
                            if (window.confirm("Hapus modul ajar ini dari arsip?")) {
                              setSavedModules(prev => prev.filter(m => m.id !== mod.id));
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500 mb-3">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">{mod.subject}</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">{mod.className}</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">{new Date(mod.createdAt).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingModule(mod);
                            setIsPerangkatModalOpen(false);
                          }}
                          className="flex-1 flex justify-center items-center gap-1.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors"
                        >
                          <Edit2 size={13} /> Edit Konten
                        </button>
                        <button
                          onClick={() => {
                            setExportModalContent(cleanIntroPreamble(mod.content));
                            setExportDocTypeHint("modul");
                            setExportInitialTitle(mod.title || "Modul Ajar");
                            setIsExportModalOpen(true);
                          }}
                          className="flex-1 flex justify-center items-center gap-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                        >
                          <Printer size={13} /> Export / Cetak
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Review Perangkat Ajar Modal */}
      {isPerangkatReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]"
          >
            {/* Header */}
            <div className="border-b border-slate-100 p-6 flex items-start gap-4 shrink-0 bg-slate-50/50">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-0.5">
                  REVIEW PERANGKAT AJAR
                </span>
                <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">
                  Periksa Materi Turunan Sebelum Disimpan
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Materi, PPT, dan LKPD disusun dari RPP yang sudah disimpan.
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsPerangkatReviewModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Judul Paket */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-3xs">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  JUDUL PAKET
                </label>
                <input
                  type="text"
                  value={reviewFields.judulPaket}
                  onChange={(e) => setReviewFields({ ...reviewFields, judulPaket: e.target.value })}
                  className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm font-extrabold text-slate-800 shadow-2xs transition-all"
                  placeholder="Masukkan judul paket perangkat ajar..."
                />
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-slate-100 pb-1 gap-1">
                {(['ringkasan', 'materi', 'visual', 'kualitas'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setReviewTab(tab)}
                    className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                      reviewTab === tab
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {tab === 'ringkasan' ? 'RINGKASAN' : tab === 'materi' ? 'MATERI' : tab === 'visual' ? 'VISUAL' : 'KUALITAS'}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              {reviewTab === 'ringkasan' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Library size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">IDENTITAS DOKUMEN</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Sekolah</label>
                      <input
                        type="text"
                        value={reviewFields.sekolah}
                        onChange={(e) => setReviewFields({ ...reviewFields, sekolah: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Guru Pengampu</label>
                      <input
                        type="text"
                        value={reviewFields.guru}
                        onChange={(e) => setReviewFields({ ...reviewFields, guru: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Mata Pelajaran</label>
                      <input
                        type="text"
                        value={reviewFields.mapel}
                        onChange={(e) => setReviewFields({ ...reviewFields, mapel: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Materi Pokok</label>
                      <input
                        type="text"
                        value={reviewFields.materi}
                        onChange={(e) => setReviewFields({ ...reviewFields, materi: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Kelas / Fase</label>
                      <input
                        type="text"
                        value={reviewFields.kelas}
                        onChange={(e) => setReviewFields({ ...reviewFields, kelas: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Semester</label>
                      <input
                        type="text"
                        value={reviewFields.semester}
                        onChange={(e) => setReviewFields({ ...reviewFields, semester: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Alokasi Waktu</label>
                      <input
                        type="text"
                        value={reviewFields.alokasiWaktu}
                        onChange={(e) => setReviewFields({ ...reviewFields, alokasiWaktu: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Kurikulum</label>
                      <input
                        type="text"
                        value={reviewFields.kurikulum}
                        onChange={(e) => setReviewFields({ ...reviewFields, kurikulum: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15"
                      />
                    </div>
                  </div>
                </div>
              )}

              {reviewTab === 'materi' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Target size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">PEDAGOGIK & STRUKTUR</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Model Pembelajaran</label>
                      <select
                        value={reviewFields.modelPembelajaran}
                        onChange={(e) => setReviewFields({ ...reviewFields, modelPembelajaran: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15"
                      >
                        <option value="Problem Based Learning (PBL)">Problem Based Learning (PBL)</option>
                        <option value="Project Based Learning (PjBL)">Project Based Learning (PjBL)</option>
                        <option value="Inquiry Learning">Inquiry Learning</option>
                        <option value="Discovery Learning">Discovery Learning</option>
                        <option value="Direct Instruction">Direct Instruction</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Kedalaman Pembahasan</label>
                      <select
                        value={reviewFields.kedalaman}
                        onChange={(e) => setReviewFields({ ...reviewFields, kedalaman: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15"
                      >
                        <option value="Standar">Standar (Menengah)</option>
                        <option value="Mendalam">Mendalam (Tinggi/Detail)</option>
                        <option value="Ringkas">Ringkas (Praktis/Cepat)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Instruksi Tambahan Penyusunan</label>
                    <textarea
                      value={reviewFields.instruksiTambahan}
                      onChange={(e) => setReviewFields({ ...reviewFields, instruksiTambahan: e.target.value })}
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15 resize-none"
                      placeholder="Contoh: Tambahkan fokus pada integrasi ekonomi kreatif lokal..."
                    />
                  </div>
                </div>
              )}

              {reviewTab === 'visual' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Sparkles size={14} className="text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">PENGATURAN VISUAL & DESAIN</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Tema Warna Dokumen</label>
                      <select
                        value={reviewFields.warnaUtama}
                        onChange={(e) => setReviewFields({ ...reviewFields, warnaUtama: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15"
                      >
                        <option value="Amber & Indigo">Amber & Indigo (Profesional/Edukasi)</option>
                        <option value="Emerald & Sage">Emerald & Sage (Sejuk/Lingkungan)</option>
                        <option value="Cool Teal & Slate">Cool Teal & Slate (Modern/Sains)</option>
                        <option value="Crimson & Charcoal">Crimson & Charcoal (Kuat/Sejarah)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Kombinasi Tipografi</label>
                      <select
                        value={reviewFields.fonts}
                        onChange={(e) => setReviewFields({ ...reviewFields, fonts: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15"
                      >
                        <option value="Playfair Display + Plus Jakarta Sans">Playfair Display + Plus Jakarta Sans (Sangat Elegan)</option>
                        <option value="Merriweather + Inter">Merriweather + Inter (Akademis Standar)</option>
                        <option value="Lora + Work Sans">Lora + Work Sans (Klasik Mewah)</option>
                        <option value="Cinzel + Montserrat">Cinzel + Montserrat (Seni/Eksklusif)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Gaya Layout Cetak</label>
                      <select
                        value={reviewFields.visualStyle}
                        onChange={(e) => setReviewFields({ ...reviewFields, visualStyle: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-500/15"
                      >
                        <option value="Modern & Bersih">Modern & Bersih (Visual Rapi & Spacing Seimbang)</option>
                        <option value="Formal Tradisional">Formal Tradisional (Sesuai Format Dinas/Kementerian)</option>
                        <option value="Kreatif Interaktif">Kreatif Interaktif (Dilengkapi Tantangan Unik & Eksperimen)</option>
                        <option value="Minimalis Mewah">Minimalis Mewah (Tipografi Besar, Whitespace Luas)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {reviewTab === 'kualitas' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">CHECKLIST STANDAR MUTU PEDAGOGI</span>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-emerald-950 block">Keselarasan CP & TP</span>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          Indikator ketercapaian diturunkan secara langsung dan akurat dari Keputusan Kepala BSKAP Nomor 046/H/KR/2025.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 border-t border-emerald-100/50 pt-3">
                      <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-emerald-950 block">Kerangka Diferensiasi Aktif</span>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          Skenario pembelajaran dirancang terpisah berdasarkan kesiapan, minat, dan profil belajar (Konten, Proses, Produk).
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 border-t border-emerald-100/50 pt-3">
                      <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-emerald-950 block">3 Tingkatan Asesmen Terintegrasi</span>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          Dilengkapi dengan naskah soal lengkap untuk Asesmen Awal (Diagnostik), Formatif (Proses), dan Sumatif (Hasil).
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 border-t border-emerald-100/50 pt-3">
                      <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-emerald-950 block">Metodologi Deep Learning (8-3-3-4)</span>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          Tahapan pembelajaran mengadopsi prinsip Mindful, Meaningful, Joyful dengan rubrik berskala 1 - 4 lengkap.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsPerangkatReviewModalOpen(false);
                }}
                className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 font-extrabold text-slate-600 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReviewSubmit}
                className="px-6 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/10"
              >
                <Sparkles size={16} />
                <span>Simpan perangkat</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Generator Soal Modal */}
      {isSoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-amber-600 flex flex-col shrink-0">
              <div className="px-5 py-4 flex items-center justify-between">
                <h3 className="font-extrabold text-white flex items-center gap-2 text-base">
                  <FileQuestion size={20} />
                  Generator Soal
                </h3>
                <button 
                  onClick={() => setIsSoalModalOpen(false)}
                  className="text-amber-100 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex px-2 pb-0">
                <button
                  type="button"
                  onClick={() => setSoalModalTab('buat')}
                  className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${soalModalTab === 'buat' ? 'border-white text-white' : 'border-transparent text-amber-200 hover:text-amber-100'}`}
                >
                  Buat dengan AI
                </button>
                <button
                  type="button"
                  onClick={() => setSoalModalTab('impor')}
                  className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${soalModalTab === 'impor' ? 'border-white text-white' : 'border-transparent text-amber-200 hover:text-amber-100'}`}
                >
                  Impor Word/PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSoalModalTab('manual')}
                  className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${soalModalTab === 'manual' ? 'border-white text-white' : 'border-transparent text-amber-200 hover:text-amber-100'}`}
                >
                  Input Manual
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <form id="soal-form" onSubmit={handleSoalSubmit} className="space-y-4">

                {soalModalTab === 'buat' && (
                  <div className="space-y-4">

                {/* Jenjang, Kelas & Mapel */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Jenjang</label>
                    <select
                      value={soalForm.jenjang}
                      onChange={(e) => handleSoalJenjangChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      <option value="SD">SD</option>
                      <option value="SMP">SMP</option>
                      <option value="SMA">SMA</option>
                      <option value="SMK">SMK</option>
                      <option value="PAUD">PAUD</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Kelas / Fase</label>
                    <select
                      value={soalForm.kelas}
                      onChange={(e) => handleSoalKelasChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      {DATA_JENJANG[soalForm.jenjang as keyof typeof DATA_JENJANG].map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Jumlah Soal</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={soalForm.jumlahSoal}
                      onChange={(e) => setSoalForm({...soalForm, jumlahSoal: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Mata Pelajaran & Materi */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Mata Pelajaran</label>
                    <select
                      value={soalForm.mapel}
                      onChange={(e) => setSoalForm({...soalForm, mapel: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      {getMapelList(soalForm.kelas, soalForm.jenjang).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Materi Pokok / Topik</label>
                    <input
                      type="text"
                      list="soal-materi-list"
                      placeholder="Contoh: Persamaan Kuadrat / Teks LHO"
                      value={soalForm.materi}
                      onChange={(e) => setSoalForm({...soalForm, materi: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <datalist id="soal-materi-list">
                      {getMateriEsensial(soalForm.mapel, soalForm.kelas, getElemenList(soalForm.mapel, soalForm.kelas)[0]).map(m => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Sub-Materi Multi-Select Dropdown */}
                <SubMateriMultiSelect
                  materi={soalForm.materi}
                  mapel={soalForm.mapel}
                  kelas={soalForm.kelas}
                  elemen={getElemenList(soalForm.mapel, soalForm.kelas)[0] || ""}
                  selected={soalForm.subMateri || []}
                  onChange={(newSelected) => setSoalForm(prev => ({ ...prev, subMateri: newSelected }))}
                  accentColor="amber"
                  label="Sub-Materi Terfokus"
                  placeholder="Pilih sub-materi (dapat pilih lebih dari 1)..."
                />

                {/* Fokus Materi / Sub-Disiplin Spesifik */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Fokus Materi / Sub-Topik Spesifik <span className="text-amber-600 font-normal lowercase">(opsional / rekomendasi mapel terpadu)</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Contoh: Sosiologi - Interaksi & Konflik Sosial (atau Biologi - Sel & Jaringan)"
                    value={soalForm.fokusMateri}
                    onChange={(e) => setSoalForm({...soalForm, fokusMateri: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-amber-600 font-medium italic">
                    *Kunci materi spesifik agar paket soal untuk Mapel Terpadu (IPS/IPA/IPAS) tidak tercampur atau salah cabang ilmu.
                  </p>
                </div>

                {/* Tingkat Kesulitan */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                    <span>Tingkat Kesulitan</span>
                    <span className="text-[10px] text-slate-400 font-normal">Dapat pilih lebih dari satu</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "LOTS", label: "LOTS (Lower Order)", desc: "C1-C2" },
                      { id: "MOTS", label: "MOTS (Middle Order)", desc: "C3-C4" },
                      { id: "HOTS", label: "HOTS (Higher Order)", desc: "C5-C6" }
                    ].map(t => {
                      const isSelected = soalForm.tingkatKesulitan.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSoalForm({
                            ...soalForm,
                            tingkatKesulitan: toggleArrayItem(soalForm.tingkatKesulitan, t.id)
                          })}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isSelected 
                              ? "bg-amber-500 text-white border-amber-600 shadow-xs" 
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span>{t.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded ${isSelected ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                            {t.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Level Kognitif Bloom C1-C6 */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                    <span>Level Kognitif (Taksonomi Bloom C1-C6)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Pilih level spesifik</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { id: "C1 (Mengingat)", label: "C1 - Mengingat" },
                      { id: "C2 (Memahami)", label: "C2 - Memahami" },
                      { id: "C3 (Mengaplikasikan)", label: "C3 - Mengaplikasikan" },
                      { id: "C4 (Menganalisis)", label: "C4 - Menganalisis" },
                      { id: "C5 (Mengevaluasi)", label: "C5 - Mengevaluasi" },
                      { id: "C6 (Mencipta)", label: "C6 - Mencipta" }
                    ].map(lvl => {
                      const isSelected = soalForm.levelKognitif.includes(lvl.id);
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setSoalForm({
                            ...soalForm,
                            levelKognitif: toggleArrayItem(soalForm.levelKognitif, lvl.id)
                          })}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all text-left truncate ${
                            isSelected 
                              ? "bg-amber-100 text-amber-800 border-amber-300 font-extrabold" 
                              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bentuk Soal */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                    <span>Bentuk Soal</span>
                    <span className="text-[10px] text-slate-400 font-normal">Bisa pilih beberapa</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Pilihan Ganda (PG)",
                      "PG Kompleks",
                      "PG Benar / Salah",
                      "Isian Singkat",
                      "Uraian / Esai"
                    ].map(b => {
                      const isSelected = soalForm.bentukSoal.includes(b);
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setSoalForm({
                            ...soalForm,
                            bentukSoal: toggleArrayItem(soalForm.bentukSoal, b)
                          })}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                            isSelected 
                              ? "bg-indigo-600 text-white border-indigo-700 shadow-xs" 
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {b}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stimulus Soal */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Pemberian Stimulus Soal</label>
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Bisa pilih lebih dari 1</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-100">
                      {SOAL_STIMULUS_OPTIONS.map(s => {
                        const isSelected = Array.isArray(soalForm.jenisStimulus)
                          ? soalForm.jenisStimulus.includes(s.id)
                          : soalForm.jenisStimulus === s.id;

                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              if (s.id === "Tanpa Stimulus") {
                                setSoalForm(prev => ({
                                  ...prev,
                                  jenisStimulus: ["Tanpa Stimulus"]
                                }));
                              } else {
                                setSoalForm(prev => {
                                  const current = Array.isArray(prev.jenisStimulus) 
                                    ? prev.jenisStimulus.filter(item => item !== "Tanpa Stimulus") 
                                    : [];
                                  let next = current.includes(s.id)
                                    ? current.filter(item => item !== s.id)
                                    : [...current, s.id];
                                  if (next.length === 0) next = ["Tanpa Stimulus"];
                                  return {
                                    ...prev,
                                    jenisStimulus: next
                                  };
                                });
                              }
                            }}
                            className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-between text-left gap-1.5 ${
                              isSelected
                                ? (s.id === "Tanpa Stimulus"
                                    ? "bg-slate-700 text-white border-slate-800 shadow-xs"
                                    : "bg-amber-500 text-white border-amber-600 shadow-xs")
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <span className="text-sm shrink-0">{s.icon}</span>
                              <span className="truncate text-[11px] leading-tight">{s.label}</span>
                            </span>
                            {isSelected && <span className="text-xs shrink-0 font-extrabold ml-1">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {(Array.isArray(soalForm.jenisStimulus) ? soalForm.jenisStimulus.some(s => s !== "Tanpa Stimulus") : soalForm.jenisStimulus !== "Tanpa Stimulus") && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Keterangan / Detil Konteks Stimulus</label>
                      <textarea
                        placeholder="Contoh: Sediakan tabel data konsumsi energi tahun 2020-2024 atau siapkan narasi paragraf tentang krisis iklim..."
                        value={soalForm.keteranganStimulus}
                        onChange={(e) => setSoalForm({...soalForm, keteranganStimulus: e.target.value})}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                      />
                    </div>
                  )}

                  {/* Instruksi Tambahan */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Instruksi Tambahan (Opsional)</label>
                    <textarea
                      placeholder="Contoh: Buat konteks lokal kehidupan siswa, sertakan pembobotan skor dan pembahasan yang lengkap..."
                      value={soalForm.instruksiTambahan}
                      onChange={(e) => setSoalForm({...soalForm, instruksiTambahan: e.target.value})}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                    />
                  </div>
                </div>
              
                  </div>
                )}
                {soalModalTab === 'impor' && (
                  <div className="space-y-4">
                    <div className="bg-indigo-50 border border-indigo-200/80 p-3 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900">
                      <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed font-medium">
                        Unggah file dokumen Word/PDF Anda, atau tempelkan teks naskah soal di bawah ini. AI akan merapikan soal, memberikan review singkat, serta menyusun <b>kunci jawaban dan pembahasan</b> lengkap.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Unggah Dokumen (PDF/Gambar)</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-amber-50/50 transition-colors text-center relative cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg,image/jpg"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const base64 = await compressFileForOCR(file);
                                const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
                                setSoalImporForm({
                                  ...soalImporForm,
                                  fileBase64: base64,
                                  fileMimeType: isPdf ? "application/pdf" : "image/jpeg",
                                  fileName: file.name
                                });
                              } catch (err) {
                                console.error("Error processing file:", err);
                              }
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="flex flex-col items-center gap-1 text-slate-600">
                          <Upload size={20} className="text-amber-600" />
                          <span className="font-bold text-[11px]">
                            {soalImporForm.fileName ? soalImporForm.fileName : "Klik untuk pilih file Soal PDF / Gambar"}
                          </span>
                          <span className="text-[10px] text-slate-400">PDF, PNG, JPG hingga 20MB</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Atau Paste Teks Naskah Soal</label>
                      <textarea
                        required={!soalImporForm.fileBase64}
                        placeholder="Paste (tempelkan) teks soal dari Word/PDF di sini..."
                        value={soalImporForm.fileText}
                        onChange={(e) => setSoalImporForm({...soalImporForm, fileText: e.target.value})}
                        rows={6}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Instruksi Tambahan (Opsional)</label>
                      <textarea
                        placeholder="Contoh: Fokuskan review pada tingkat kesulitan soal..."
                        value={soalImporForm.instruksiTambahan}
                        onChange={(e) => setSoalImporForm({...soalImporForm, instruksiTambahan: e.target.value})}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                      />
                    </div>
                  </div>
                )}
                {soalModalTab === 'manual' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
                      <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed font-medium">
                        Input manual soal yang Anda miliki. AI akan membantu <b>merapikan format</b>, menyisipkan <b>stimulus</b> (jika perlu), serta membuatkan <b>kunci jawaban & pembahasan detail</b>.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Jenjang</label>
                        <select
                          value={soalManualForm.jenjang}
                          onChange={(e) => {
                            const newKelas = DATA_JENJANG[e.target.value as keyof typeof DATA_JENJANG][0];
                            const newMapelList = getMapelList(newKelas, e.target.value);
                            setSoalManualForm(prev => ({
                              ...prev,
                              jenjang: e.target.value,
                              kelas: newKelas,
                              mapel: newMapelList.includes(prev.mapel) ? prev.mapel : newMapelList[0]
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        >
                          <option value="SD">SD</option>
                          <option value="SMP">SMP</option>
                          <option value="SMA">SMA</option>
                          <option value="SMK">SMK</option>
                          <option value="PAUD">PAUD</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Kelas / Fase</label>
                        <select
                          value={soalManualForm.kelas}
                          onChange={(e) => {
                            const newMapelList = getMapelList(e.target.value, soalManualForm.jenjang);
                            setSoalManualForm(prev => ({
                              ...prev,
                              kelas: e.target.value,
                              mapel: newMapelList.includes(prev.mapel) ? prev.mapel : newMapelList[0]
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        >
                          {DATA_JENJANG[soalManualForm.jenjang as keyof typeof DATA_JENJANG].map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Mata Pelajaran</label>
                        <select
                          value={soalManualForm.mapel}
                          onChange={(e) => setSoalManualForm({...soalManualForm, mapel: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        >
                          {getMapelList(soalManualForm.kelas, soalManualForm.jenjang).map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Materi Pokok / Topik</label>
                        <input
                          type="text"
                          list="soal-manual-materi-list"
                          placeholder="Pilih atau ketik materi pokok..."
                          value={soalManualForm.materi}
                          onChange={(e) => setSoalManualForm({...soalManualForm, materi: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                        <datalist id="soal-manual-materi-list">
                          {getMateriEsensial(soalManualForm.mapel, soalManualForm.kelas, getElemenList(soalManualForm.mapel, soalManualForm.kelas)[0] || "").map(m => (
                            <option key={m} value={m} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Naskah Soal (Input Manual)</label>
                      <textarea
                        required
                        placeholder="Ketik soal Anda di sini..."
                        value={soalManualForm.naskahSoal}
                        onChange={(e) => setSoalManualForm({...soalManualForm, naskahSoal: e.target.value})}
                        rows={8}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Instruksi Tambahan (Opsional)</label>
                      <textarea
                        placeholder="Contoh: Tolong buatkan stimulus berupa grafik/tabel yang relevan dengan soal-soal ini..."
                        value={soalManualForm.instruksiTambahan}
                        onChange={(e) => setSoalManualForm({...soalManualForm, instruksiTambahan: e.target.value})}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                      />
                    </div>
                  </div>
                )}

              </form>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsSoalModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="soal-form"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Sparkles size={15} /> Generasi Paket Soal
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Profil Guru & Identitas TTD Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-indigo-600 px-5 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-white flex items-center gap-2 text-base">
                <User size={18} />
                Profil Guru & Identitas TTD
              </h3>
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="text-indigo-100 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium">
                  Informasi di bawah ini diisi <b>sekali saja</b> dan akan terpakai otomatis untuk TTD Kepala Sekolah & identitas dokumen di seluruh Modul Ajar/RPPM.
                </p>
              </div>

              <div className="space-y-4">
                {/* Section TTD Kepala Sekolah */}
                <div className="space-y-3 pt-1">
                  <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck size={15} /> TTD Kepala Sekolah
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Nama Kepala Sekolah</label>
                    <input
                      type="text"
                      placeholder="Contoh: Dr. H. Kepala Sekolah, M.Pd."
                      value={userProfile.namaKepsek}
                      onChange={(e) => setUserProfile({ ...userProfile, namaKepsek: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">NIP Kepala Sekolah</label>
                    <input
                      type="text"
                      placeholder="Contoh: 19720315 199802 1 002"
                      value={userProfile.nipKepsek}
                      onChange={(e) => setUserProfile({ ...userProfile, nipKepsek: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Section Identitas Default Guru & Sekolah */}
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={15} /> Identitas Guru & Sekolah Default
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Nama Sekolah Default</label>
                      <input
                        type="text"
                        placeholder="Contoh: SMAN 1 Jakarta"
                        value={userProfile.namaSekolah}
                        onChange={(e) => setUserProfile({ ...userProfile, namaSekolah: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Tahun Pelajaran Default</label>
                      <input
                        type="text"
                        placeholder="Contoh: 2024/2025"
                        value={userProfile.tahunPelajaran || ""}
                        onChange={(e) => setUserProfile({ ...userProfile, tahunPelajaran: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Alamat Sekolah</label>
                      <input
                        type="text"
                        placeholder="Contoh: Jl. Pendidikan Nasional No. 1"
                        value={userProfile.alamatSekolah || ""}
                        onChange={(e) => setUserProfile({ ...userProfile, alamatSekolah: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Kontak / Email / Web (Kop Surat)</label>
                      <input
                        type="text"
                        placeholder="Contoh: Telp: (021) 123456 • info@sekolah.sch.id"
                        value={userProfile.kontakSekolah || ""}
                        onChange={(e) => setUserProfile({ ...userProfile, kontakSekolah: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Nama Penyusun / Guru</label>
                      <input
                        type="text"
                        placeholder="Nama Guru"
                        value={userProfile.namaPenyusun}
                        onChange={(e) => setUserProfile({ ...userProfile, namaPenyusun: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">NIP Guru</label>
                      <input
                        type="text"
                        placeholder="NIP Guru"
                        value={userProfile.nipPenyusun}
                        onChange={(e) => setUserProfile({ ...userProfile, nipPenyusun: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section Kop Surat Digital Sekolah */}
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={15} /> Kop Surat Digital Dokumen Output
                  </h4>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Pilih Jenis Kop Surat</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setUserProfile({ ...userProfile, kopType: "text" })}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                          userProfile.kopType === "text" || !userProfile.kopType
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <FileText size={15} /> 📝 Teks Standar
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserProfile({ ...userProfile, kopType: "image" })}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                          userProfile.kopType === "image"
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <ImageIcon size={15} /> 🖼️ Gambar Kop Digital
                      </button>
                    </div>
                  </div>

                  {userProfile.kopType === "image" && (
                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
                      {userProfile.kopImageUrl ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-slate-800 flex items-center gap-1">
                              <CheckCircle2 size={14} className="text-emerald-600" /> Gambar Kop Terpasang
                            </span>
                            <button
                              type="button"
                              onClick={() => setUserProfile({ ...userProfile, kopImageUrl: "" })}
                              className="text-[11px] text-rose-600 font-bold hover:underline"
                            >
                              Hapus Gambar
                            </button>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                            <img
                              src={formatDriveImageUrl(userProfile.kopImageUrl)}
                              alt="Kop Profile Preview"
                              className="max-h-20 max-w-full mx-auto object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-indigo-900 italic font-medium">
                          Unggah file gambar Kop Surat resmi sekolah Anda (PNG/JPG) atau masukkan link Google Drive.
                        </p>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Unggah Berkas Gambar Kop Surat</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfileKopUpload}
                          className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer border border-slate-200 rounded-lg bg-white p-1"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Atau Link Google Drive / URL Gambar</label>
                        <input
                          type="text"
                          placeholder="https://drive.google.com/file/d/.../view"
                          value={userProfile.kopImageUrl || ""}
                          onChange={(e) => setUserProfile({ ...userProfile, kopImageUrl: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check size={15} /> Simpan & Gunakan
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Google Drive Database Sync Modal */}
      {isDriveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
          >
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Cloud size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Google Drive Database Sync</h3>
                  <p className="text-[11px] text-emerald-100 opacity-90">
                    Sinkronisasi data multi-perangkat berbasis Google Drive
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDriveModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Notice Toast */}
              {driveSyncNotice && (
                <div
                  className={`p-3 rounded-2xl flex items-start justify-between gap-2 text-xs font-medium border ${
                    driveSyncNotice.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : driveSyncNotice.type === "error"
                      ? "bg-rose-50 text-rose-800 border-rose-200"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}
                >
                  <p className="leading-relaxed">{driveSyncNotice.message}</p>
                  <button
                    type="button"
                    onClick={clearDriveNotice}
                    className="p-0.5 hover:bg-black/5 rounded text-slate-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Status Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                    Status Akun Google Drive
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 ${
                      isDriveConnected
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isDriveConnected ? "bg-emerald-600 animate-pulse" : "bg-amber-500"
                      }`}
                    />
                    {isDriveConnected ? "Terhubung" : "Belum Terhubung"}
                  </span>
                </div>

                {isDriveConnected ? (
                  <div className="space-y-2 pt-1 border-t border-slate-200/80">
                    <div className="flex items-center gap-3">
                      {googleUser?.picture ? (
                        <img
                          src={googleUser.picture}
                          alt="Profil"
                          className="w-10 h-10 rounded-full border border-emerald-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                          GD
                        </div>
                      )}
                      <div>
                        <p className="font-extrabold text-slate-900 text-xs">
                          {googleUser?.name || "Pengguna Google Workspace"}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500">
                          {googleUser?.email || "Akun Google Terotorisasi"}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Folder Khusus: <span className="font-mono font-bold text-emerald-700">EduAsisten_Database_Guru</span> di Google Drive Anda.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Hubungkan akun Google Drive (termasuk akun <b>belajar.id</b>) untuk menyimpan seluruh database, modul ajar, dan riwayat percakapan secara otomatis dan aman di cloud pribadi Anda.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!isDriveConnected ? (
                  <button
                    type="button"
                    onClick={connectGoogleDrive}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Cloud size={16} /> Hubungkan Akun Google Drive
                  </button>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => syncAllToDrive()}
                      disabled={isDriveSyncing}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CloudUpload size={16} className={isDriveSyncing ? "animate-bounce" : ""} />
                      <span>{isDriveSyncing ? "Menyinkronkan..." : "Sinkronkan ke Drive"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const res = await restoreAllFromDrive();
                        if (res) {
                          setTimeout(() => window.location.reload(), 1200);
                        }
                      }}
                      disabled={isDriveSyncing}
                      className="py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CloudDownload size={16} className={isDriveSyncing ? "animate-spin" : ""} />
                      <span>{isDriveSyncing ? "Memuat..." : "Pulihkan dari Drive"}</span>
                    </button>
                  </div>
                )}

                {isDriveConnected && (
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px] text-slate-500">
                    <span>Perangkat ini tersinkronisasi otomatis.</span>
                    <button
                      type="button"
                      onClick={disconnectGoogleDrive}
                      className="text-rose-600 hover:underline font-bold"
                    >
                      Putuskan Hubungan
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDriveModalOpen(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Penilaian & Koreksi AI Modal */}
      {isPenilaianModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-5 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-white flex items-center gap-2 text-sm md:text-base">
                <ClipboardCheck size={20} />
                Penilaian & Koreksi AI (5 Bentuk Soal)
              </h3>
              <button 
                onClick={() => setIsPenilaianModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePenilaianSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Method Selection */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 uppercase tracking-wide">Metode Penilaian</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPenilaianForm({ ...penilaianForm, method: "scan_pdf" })}
                    className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                      penilaianForm.method === "scan_pdf"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FileUp size={14} />
                    Pindai PDF / Gambar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPenilaianForm({ ...penilaianForm, method: "manual" })}
                    className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                      penilaianForm.method === "manual"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Edit2 size={14} />
                    Input Teks Manual
                  </button>
                </div>
              </div>

              {/* Identity Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={penilaianForm.mapel}
                    onChange={(e) => setPenilaianForm({ ...penilaianForm, mapel: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Kelas / Fase</label>
                  <input
                    type="text"
                    value={penilaianForm.kelas}
                    onChange={(e) => setPenilaianForm({ ...penilaianForm, kelas: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Nama Siswa</label>
                <input
                  type="text"
                  placeholder="Nama Siswa (opsional jika ada di PDF)"
                  value={penilaianForm.namaSiswa}
                  onChange={(e) => setPenilaianForm({ ...penilaianForm, namaSiswa: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>

              {/* Question Types Checkboxes */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Bentuk Soal yang Dikoreksi</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    "Pilihan Ganda (PG)",
                    "PG Kompleks",
                    "PG Benar / Salah",
                    "Isian Singkat",
                    "Uraian / Esai"
                  ].map(type => {
                    const isChecked = penilaianForm.questionTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          const updated = isChecked
                            ? penilaianForm.questionTypes.filter(t => t !== type)
                            : [...penilaianForm.questionTypes, type];
                          setPenilaianForm({ ...penilaianForm, questionTypes: updated });
                        }}
                        className={`p-2 rounded-xl border text-left font-bold text-[11px] flex items-center justify-between ${
                          isChecked
                            ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                            : "bg-slate-50 border-slate-200 text-slate-500 opacity-60"
                        }`}
                      >
                        <span className="truncate">{type}</span>
                        {isChecked && <Check size={13} className="text-indigo-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kunci Jawaban Input */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="font-extrabold text-slate-700 uppercase tracking-wide block text-[11px]">Kunci Jawaban & Rubrik Guru</label>
                
                {penilaianForm.questionTypes.includes("Pilihan Ganda (PG)") && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 block">🔘 Kunci PG:</span>
                    <input
                      type="text"
                      value={penilaianForm.kunciJawaban.pg}
                      onChange={(e) => setPenilaianForm({
                        ...penilaianForm,
                        kunciJawaban: { ...penilaianForm.kunciJawaban, pg: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-[11px]"
                    />
                  </div>
                )}

                {penilaianForm.questionTypes.includes("PG Kompleks") && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 block">🔲 Kunci PG Kompleks:</span>
                    <input
                      type="text"
                      value={penilaianForm.kunciJawaban.pgKompleks}
                      onChange={(e) => setPenilaianForm({
                        ...penilaianForm,
                        kunciJawaban: { ...penilaianForm.kunciJawaban, pgKompleks: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-[11px]"
                    />
                  </div>
                )}

                {penilaianForm.questionTypes.includes("PG Benar / Salah") && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 block">🌗 Kunci Benar / Salah:</span>
                    <input
                      type="text"
                      value={penilaianForm.kunciJawaban.benarSalah}
                      onChange={(e) => setPenilaianForm({
                        ...penilaianForm,
                        kunciJawaban: { ...penilaianForm.kunciJawaban, benarSalah: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-[11px]"
                    />
                  </div>
                )}

                {penilaianForm.questionTypes.includes("Isian Singkat") && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 block">✏️ Kunci Isian Singkat:</span>
                    <input
                      type="text"
                      value={penilaianForm.kunciJawaban.isianSingkat}
                      onChange={(e) => setPenilaianForm({
                        ...penilaianForm,
                        kunciJawaban: { ...penilaianForm.kunciJawaban, isianSingkat: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-[11px]"
                    />
                  </div>
                )}

                {penilaianForm.questionTypes.includes("Uraian / Esai") && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 block">📝 Kunci Uraian & Rubrik:</span>
                    <textarea
                      rows={2}
                      value={penilaianForm.kunciJawaban.uraian}
                      onChange={(e) => setPenilaianForm({
                        ...penilaianForm,
                        kunciJawaban: { ...penilaianForm.kunciJawaban, uraian: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-[11px] resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Upload PDF/Gambar or Textarea */}
              {penilaianForm.method === "scan_pdf" ? (
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Unggah Lembar Jawaban (PDF / Gambar)</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-indigo-50/50 transition-colors text-center relative cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const base64 = await compressFileForOCR(file);
                            const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
                            setPenilaianForm({
                              ...penilaianForm,
                              fileBase64: base64,
                              fileMimeType: isPdf ? "application/pdf" : "image/jpeg",
                              fileName: file.name
                            });
                          } catch (err) {
                            console.error("Error processing file:", err);
                          }
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center gap-1 text-slate-600">
                      <Upload size={20} className="text-indigo-600" />
                      <span className="font-bold text-[11px]">
                        {penilaianForm.fileName ? penilaianForm.fileName : "Klik untuk pilih file Lembar Jawaban PDF / Gambar"}
                      </span>
                      <span className="text-[10px] text-slate-400">PDF, PNG, JPG hingga 20MB</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <label className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">Jawaban Siswa (Teks)</label>
                  <textarea
                    rows={4}
                    value={penilaianForm.jawabanSiswaText}
                    onChange={(e) => setPenilaianForm({ ...penilaianForm, jawabanSiswaText: e.target.value })}
                    placeholder="Tempelkan atau ketik jawaban siswa di sini..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPenilaianModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 text-white font-extrabold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles size={15} />
                  Mulai Koreksi AI
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal Pusat Referensi Resmi Kemendikdasmen (Perbukuan & Panduan Mapel) */}
      {isPanduanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[88vh] border border-slate-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-700 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
                  <Library size={22} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight flex items-center gap-2">
                    Pusat Referensi Resmi Kemendikdasmen
                  </h3>
                  <p className="text-[11px] text-sky-100 opacity-90">
                    Sistem Perbukuan Digital & Panduan Mata Pelajaran Kurikulum Merdeka
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={referensiModalTab === 'buku' ? "https://buku.kemendikdasmen.go.id/" : "https://kurikulum.kemendikdasmen.go.id/panduan-mapel"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <ExternalLink size={14} /> Portal {referensiModalTab === 'buku' ? "Perbukuan" : "Panduan Mapel"}
                </a>
                <button
                  type="button"
                  onClick={() => setIsPanduanModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Tab Switcher Bar */}
            <div className="bg-indigo-950/90 text-white px-6 py-2.5 flex items-center gap-3 border-b border-indigo-800 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setReferensiModalTab('buku')}
                className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                  referensiModalTab === 'buku'
                    ? "bg-amber-400 text-slate-900 shadow-md scale-102"
                    : "bg-white/10 text-indigo-100 hover:bg-white/20"
                }`}
              >
                <BookMarked size={15} />
                <span>Buku Teks Digital & Kurikulum (buku.kemendikdasmen.go.id)</span>
              </button>
              <button
                type="button"
                onClick={() => setReferensiModalTab('panduan')}
                className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                  referensiModalTab === 'panduan'
                    ? "bg-amber-400 text-slate-900 shadow-md scale-102"
                    : "bg-white/10 text-indigo-100 hover:bg-white/20"
                }`}
              >
                <BookOpen size={15} />
                <span>Panduan Mata Pelajaran (kurikulum.kemendikdasmen.go.id)</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-3 shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={referensiModalTab === 'buku' ? "Cari judul, kelas (XII/12), mapel pilihan, atau bab..." : "Cari mata pelajaran atau elemen..."}
                    value={panduanSearch}
                    onChange={(e) => setPanduanSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                  {panduanSearch && (
                    <button
                      onClick={() => setPanduanSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[11px] font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filter Tabs Jenjang */}
                <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                  {["Semua", "SD", "SMP", "SMA", "SMK", "PAUD"].map((j) => (
                    <button
                      key={j}
                      onClick={() => setSelectedPanduanJenjang(j)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                        selectedPanduanJenjang === j
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {j === "Semua" ? "Semua Jenjang" : j}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Filter Pills for Buku Katalog */}
              {referensiModalTab === 'buku' && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0">Filter Cepat:</span>
                  {[
                    { label: "Semua Buku", query: "" },
                    { label: "Kelas XII (SMA Pilihan)", query: "XII", jenjang: "SMA" },
                    { label: "Mapel Pilihan", query: "Pilihan", jenjang: "SMA" },
                    { label: "Panduan Guru", query: "Guru" },
                    { label: "Buku Siswa", query: "Siswa" },
                    { label: "Biologi", query: "Biologi", jenjang: "SMA" },
                    { label: "Fisika", query: "Fisika", jenjang: "SMA" },
                    { label: "Kimia", query: "Kimia", jenjang: "SMA" },
                    { label: "Sosiologi", query: "Sosiologi", jenjang: "SMA" },
                    { label: "Ekonomi", query: "Ekonomi", jenjang: "SMA" },
                    { label: "Geografi", query: "Geografi", jenjang: "SMA" },
                    { label: "Informatika", query: "Informatika", jenjang: "SMA" },
                    { label: "PKWu", query: "PKWu", jenjang: "SMA" },
                    { label: "Matematika", query: "Matematika" }
                  ].map((chip) => {
                    const isActive = chip.query === "" 
                      ? (!panduanSearch && selectedPanduanJenjang === "Semua")
                      : (panduanSearch.toLowerCase() === chip.query.toLowerCase());
                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          setPanduanSearch(chip.query);
                          if (chip.jenjang) {
                            setSelectedPanduanJenjang(chip.jenjang);
                          }
                        }}
                        className={`px-2.5 py-0.5 rounded-full font-semibold transition-all whitespace-nowrap text-[11px] border ${
                          isActive
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Content Catalog Grid */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100/50 space-y-4">
              {referensiModalTab === 'buku' ? (
                <>
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-indigo-900 leading-relaxed">
                        <strong>Katalog Perbukuan Resmi Kemendikdasmen (https://buku.kemendikdasmen.go.id/katalog):</strong> Terintegrasi lengkap dengan Buku Siswa & Buku Panduan Guru Kurikulum Merdeka (termasuk seluruh Mata Pelajaran Pilihan Kelas XII SMA Fase F). Anda dapat mengunduh buku, menyusun <strong>Modul Ajar Deep Learning</strong>, <strong>LKPD</strong>, atau <strong>Soal HOTS</strong>.
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsAddBukuModalOpen(true)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <Plus size={14} /> Tambah Buku ke Katalog
                      </button>
                      <a
                        href="https://buku.kemendikdasmen.go.id/katalog"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-100/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                      >
                        <ExternalLink size={14} /> Katalog Resmi
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allBukuCatalog
                      .filter(item => {
                        const matchJenjang = selectedPanduanJenjang === "Semua" || item.jenjang === selectedPanduanJenjang;
                        const q = panduanSearch.toLowerCase().trim();
                        if (!q) return matchJenjang;

                        const is12Query = q === '12' || q === 'xii' || q === 'kelas 12' || q === 'kelas xii';
                        const isPilihanQuery = q === 'pilihan' || q === 'tingkat lanjut' || q === 'mapel pilihan';
                        const isGuruQuery = q === 'guru' || q === 'panduan guru';
                        const isSiswaQuery = q === 'siswa' || q === 'buku siswa';

                        let matchSearch = false;
                        if (is12Query) {
                          matchSearch = item.kelas.includes('12') || item.title.toLowerCase().includes('xii') || item.title.toLowerCase().includes('12');
                        } else if (isPilihanQuery) {
                          matchSearch = item.title.toLowerCase().includes('pilihan') || item.title.toLowerCase().includes('tingkat lanjut') || (item.description && item.description.toLowerCase().includes('pilihan')) || item.mapel.toLowerCase().includes('tingkat lanjut');
                        } else if (isGuruQuery) {
                          matchSearch = item.type === 'Buku Panduan Guru' || item.title.toLowerCase().includes('guru') || (item.description && item.description.toLowerCase().includes('guru'));
                        } else if (isSiswaQuery) {
                          matchSearch = item.type === 'Buku Siswa Utama' || item.title.toLowerCase().includes('siswa');
                        } else {
                          matchSearch = item.title.toLowerCase().includes(q) ||
                            item.mapel.toLowerCase().includes(q) ||
                            (item.kelas && item.kelas.toLowerCase().includes(q)) ||
                            (item.fase && item.fase.toLowerCase().includes(q)) ||
                            (item.type && item.type.toLowerCase().includes(q)) ||
                            (item.description && item.description.toLowerCase().includes(q)) ||
                            item.babList.some(b => b.toLowerCase().includes(q));
                        }
                        return matchJenjang && matchSearch;
                      })
                      .map(item => (
                        <div
                          key={item.id}
                          className="bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  item.jenjang === "SD" ? "bg-red-50 text-red-700 border border-red-200" :
                                  item.jenjang === "SMP" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                                  item.jenjang === "SMA" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                  item.jenjang === "SMK" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                  "bg-purple-50 text-purple-700 border border-purple-200"
                                }`}>
                                  {item.jenjang} • {item.kelas}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[10px] font-extrabold">
                                  {item.type}
                                </span>
                                {item.id.startsWith("custom-buku-") && (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-md text-[10px] font-extrabold">
                                    ⭐ Kustom Guru
                                  </span>
                                )}
                              </div>
                              <a
                                href={item.link || "https://buku.kemendikdasmen.go.id/katalog"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200"
                                title="Unduh / Buka di Katalog Kemendikdasmen"
                              >
                                Katalog PDF <ExternalLink size={12} />
                              </a>
                            </div>

                            <h4 className="font-extrabold text-slate-800 text-sm mb-1 leading-snug">{item.title}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed mb-3">{item.description}</p>

                            <div className="mb-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                                📖 Rincian Bab / Pokok Bahasan Utama:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {item.babList.map((bab, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md text-[10px] font-medium shadow-2xs">
                                    {bab}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <a
                              href={item.link || "https://buku.kemendikdasmen.go.id/katalog"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                              title="Unduh Buku (PDF) dari Katalog Perbukuan Kemendikdasmen"
                            >
                              <Download size={14} /> Unduh Buku
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setIsPanduanModalOpen(false);
                                const targetKelas = DATA_JENJANG[item.jenjang as keyof typeof DATA_JENJANG]?.[0] || "10 (Fase E)";
                                const mapelList = getMapelList(targetKelas, item.jenjang);
                                const selectedMapel = mapelList.find(m => m.toLowerCase().includes(item.mapel.toLowerCase().split(' ')[0])) || item.mapel;
                                
                                setPerangkatForm(prev => ({
                                  ...prev,
                                  jenis: "Modul Ajar Kurikulum merdeka",
                                  jenjang: item.jenjang,
                                  kelas: targetKelas,
                                  mapel: selectedMapel,
                                  materi: item.babList[0] || item.title,
                                  fokusMateri: item.babList.join("; "),
                                  sumberBelajar: `Buku Siswa & Panduan Guru Kemendikdasmen (${item.title}) - https://buku.kemendikdasmen.go.id/katalog`,
                                  namaSekolah: prev.namaSekolah || userProfile.namaSekolah,
                                  namaPenyusun: prev.namaPenyusun || userProfile.namaPenyusun,
                                  nipPenyusun: prev.nipPenyusun || userProfile.nipPenyusun,
                                  tahunPelajaran: userProfile.tahunPelajaran || prev.tahunPelajaran
                                }));
                                setIsPerangkatModalOpen(true);
                              }}
                              className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <BookOpen size={14} /> Buat Modul
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsPanduanModalOpen(false);
                                const targetKelas = DATA_JENJANG[item.jenjang as keyof typeof DATA_JENJANG]?.[0] || "10 (Fase E)";
                                const mapelList = getMapelList(targetKelas, item.jenjang);
                                const selectedMapel = mapelList.find(m => m.toLowerCase().includes(item.mapel.toLowerCase().split(' ')[0])) || item.mapel;

                                setSoalForm(prev => ({
                                  ...prev,
                                  jenjang: item.jenjang,
                                  kelas: targetKelas,
                                  mapel: selectedMapel,
                                  materi: item.babList.join("; ")
                                }));
                                setIsSoalModalOpen(true);
                              }}
                              className="flex-1 py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <FileQuestion size={14} /> Buat Soal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!hasModulAjarInSession) {
                                  alert("⚠️ Maaf Bapak/Ibu Guru, sesuai dengan alur kerja penyusunan perangkat Kurikulum Merdeka yang sistematis, pembuatan LKPD memerlukan penyusunan Modul Ajar / RPP yang selesai terlebih dahulu.\n\nSilakan gunakan menu 'Modul Ajar Deep Learning' di Menu Deck untuk menyusun Modul Ajar terlebih dahulu agar tujuan pembelajaran dan isi materi selaras.");
                                  return;
                                }
                                setIsPanduanModalOpen(false);
                                const targetKelas = DATA_JENJANG[item.jenjang as keyof typeof DATA_JENJANG]?.[0] || "10 (Fase E)";
                                const mapelList = getMapelList(targetKelas, item.jenjang);
                                const selectedMapel = mapelList.find(m => m.toLowerCase().includes(item.mapel.toLowerCase().split(' ')[0])) || item.mapel;

                                setLkpdForm(prev => ({
                                  ...prev,
                                  jenjang: item.jenjang,
                                  kelas: targetKelas,
                                  mapel: selectedMapel,
                                  materi: item.babList[0] || item.title
                                }));
                                setIsLKPDModalOpen(true);
                              }}
                              className="flex-1 py-1.5 px-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <FileText size={14} /> Buat LKPD
                            </button>
                            {item.id.startsWith("custom-buku-") && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomBuku(item.id)}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all border border-rose-200 shrink-0"
                                title="Hapus buku dari katalog kustom"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-3">
                    <Info size={18} className="text-sky-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-sky-900 leading-relaxed">
                      <strong>Panduan Mata Pelajaran Kemendikdasmen (https://kurikulum.kemendikdasmen.go.id/panduan-mapel):</strong> Seluruh panduan mata pelajaran mengacu pada Keputusan Kepala BSKAP Nomor 046/H/KR/2025. Pilih mata pelajaran untuk langsung menganalisis CP/TP/ATP atau menyusun Modul Ajar.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PANDUAN_MAPEL_CATALOG
                      .filter(item => {
                        const matchJenjang = selectedPanduanJenjang === "Semua" || item.jenjang === selectedPanduanJenjang;
                        const matchSearch = item.name.toLowerCase().includes(panduanSearch.toLowerCase()) ||
                          item.description.toLowerCase().includes(panduanSearch.toLowerCase());
                        return matchJenjang && matchSearch;
                      })
                      .map(item => (
                        <div
                          key={item.id}
                          className="bg-white border border-slate-200 hover:border-sky-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                item.jenjang === "SD" ? "bg-red-50 text-red-700 border border-red-200" :
                                item.jenjang === "SMP" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                                item.jenjang === "SMA" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                item.jenjang === "SMK" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                "bg-purple-50 text-purple-700 border border-purple-200"
                              }`}>
                                {item.jenjang} • {item.fase}
                              </span>
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1"
                              >
                                Panduan Mapel <ExternalLink size={12} />
                              </a>
                            </div>
                            <h4 className="font-extrabold text-slate-800 text-sm mb-1">{item.name}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed mb-3">{item.description}</p>

                            <div className="flex flex-wrap gap-1 mb-4">
                              {item.elemen.map((el, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium">
                                  {el}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsPanduanModalOpen(false);
                                const targetKelas = DATA_JENJANG[item.jenjang as keyof typeof DATA_JENJANG]?.[0] || "10 (Fase E)";
                                const mapelList = getMapelList(targetKelas, item.jenjang);
                                const selectedMapel = mapelList.find(m => m.toLowerCase().includes(item.name.toLowerCase().split(' ')[0])) || item.name;
                                
                                setPerangkatForm(prev => ({
                                  ...prev,
                                  jenis: "Modul Ajar Kurikulum merdeka",
                                  jenjang: item.jenjang,
                                  kelas: targetKelas,
                                  mapel: selectedMapel,
                                  sumberBelajar: `Panduan Mapel Kemendikdasmen - https://kurikulum.kemendikdasmen.go.id/panduan-mapel`
                                }));
                                setIsPerangkatModalOpen(true);
                              }}
                              className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <BookOpen size={14} /> Buat Modul Ajar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsPanduanModalOpen(false);
                                const targetKelas = DATA_JENJANG[item.jenjang as keyof typeof DATA_JENJANG]?.[0] || "10 (Fase E)";
                                const mapelList = getMapelList(targetKelas, item.jenjang);
                                const selectedMapel = mapelList.find(m => m.toLowerCase().includes(item.name.toLowerCase().split(' ')[0])) || item.name;

                                setSoalForm(prev => ({
                                  ...prev,
                                  jenjang: item.jenjang,
                                  kelas: targetKelas,
                                  mapel: selectedMapel
                                }));
                                setIsSoalModalOpen(true);
                              }}
                              className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <FileQuestion size={14} /> Buat Soal
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Ekspor & Cetak Rapi Dokumen */}
      <EduExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        rawContentHtml={exportModalContent}
        userProfile={userProfile}
        onUpdateProfile={setUserProfile}
        docTypeHint={exportDocTypeHint}
        initialTitle={exportInitialTitle}
      />

      {/* Modal Pembahasan & Bedah Soal AI */}
      <PembahasanSoalModal
        isOpen={isPembahasanModalOpen}
        onClose={() => setIsPembahasanModalOpen(false)}
        onSubmit={(prompt, fileData) => handleSubmit(undefined, prompt, fileData)}
        defaultJenjang="SMA"
        defaultKelas="10 (Fase E)"
        defaultMapel="Matematika"
      />

      {/* Modal Tambah Buku ke Katalog EduAsisten */}
      {isAddBukuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden"
          >
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 border border-white/20">
                  <BookMarked size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base font-display">Tambah Buku dari Katalog Resmi</h3>
                  <p className="text-xs text-indigo-200 opacity-90">
                    Masukkan rincian buku dari https://buku.kemendikdasmen.go.id/katalog
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBukuModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBukuSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Buku <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Buku Siswa Bahasa Inggris Work in Progress SMA Kelas 10"
                  value={newBukuForm.title}
                  onChange={(e) => setNewBukuForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bahasa Inggris"
                    value={newBukuForm.mapel}
                    onChange={(e) => setNewBukuForm(prev => ({ ...prev, mapel: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenjang</label>
                  <select
                    value={newBukuForm.jenjang}
                    onChange={(e) => setNewBukuForm(prev => ({ ...prev, jenjang: e.target.value as any }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="PAUD">PAUD</option>
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA</option>
                    <option value="SMK">SMK</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas & Fase</label>
                  <input
                    type="text"
                    placeholder="Contoh: 10 (Fase E)"
                    value={newBukuForm.kelas}
                    onChange={(e) => setNewBukuForm(prev => ({ ...prev, kelas: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Buku</label>
                  <select
                    value={newBukuForm.type}
                    onChange={(e) => setNewBukuForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="Buku Siswa Utama">Buku Siswa Utama</option>
                    <option value="Buku Panduan Guru">Buku Panduan Guru</option>
                    <option value="Buku Teks Pendamping">Buku Teks Pendamping</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rincian Bab / Pokok Bahasan Utama (Pisahkan dengan koma atau baris baru)
                </label>
                <textarea
                  rows={3}
                  placeholder="Bab 1: Great Athletes&#10;Bab 2: Financial Literacy&#10;Bab 3: Sports and Health"
                  value={newBukuForm.babList}
                  onChange={(e) => setNewBukuForm(prev => ({ ...prev, babList: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Ringkas</label>
                <input
                  type="text"
                  placeholder="Ringkasan isi dan fokus kompetensi buku..."
                  value={newBukuForm.description}
                  onChange={(e) => setNewBukuForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Link Unduh PDF / Katalog Resmi</label>
                <input
                  type="url"
                  placeholder="https://buku.kemendikdasmen.go.id/katalog/..."
                  value={newBukuForm.link}
                  onChange={(e) => setNewBukuForm(prev => ({ ...prev, link: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBukuModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Plus size={14} /> Simpan ke Katalog
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Generator LKPD Modal */}
      {isLKPDModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-violet-600 px-5 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-white flex items-center gap-2">
                <FileText size={18} />
                Generator LKPD AI (Kurikulum Merdeka)
              </h3>
              <button 
                onClick={() => setIsLKPDModalOpen(false)}
                className="text-violet-100 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLKPDSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
              <div className="p-3 bg-violet-50/50 border border-violet-100 rounded-xl text-xs text-violet-900 leading-relaxed">
                Fitur ini akan menghasilkan Lembar Kerja Peserta Didik (LKPD) lengkap dengan materi ringkas, aktivitas interaktif berbasis Deep Learning, penugasan kelompok/mandiri, dan rubrik penilaian yang berpusat pada siswa.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenjang Pendidikan</label>
                  <select
                    value={lkpdForm.jenjang}
                    onChange={(e) => handleLKPDJenjangChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="PAUD">PAUD</option>
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA</option>
                    <option value="SMK">SMK (Kejuruan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas</label>
                  <select
                    value={lkpdForm.kelas}
                    onChange={(e) => handleLKPDKelasChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {DATA_JENJANG[lkpdForm.jenjang as keyof typeof DATA_JENJANG]?.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                  <select
                    value={lkpdForm.mapel}
                    onChange={(e) => handleLKPDMapelChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {getMapelList(lkpdForm.kelas, lkpdForm.jenjang).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Elemen Pembelajaran</label>
                  <select
                    value={lkpdForm.elemen}
                    onChange={(e) => handleLKPDElemenChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {getElemenList(lkpdForm.mapel, lkpdForm.kelas).map(el => (
                      <option key={el} value={el}>{el}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Capaian Pembelajaran (CP) Target</label>
                  <span className="text-[10px] font-extrabold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
                    BSKAP No. 046/H/KR/2025
                  </span>
                </div>
                <select
                  value={lkpdForm.cp}
                  onChange={(e) => setLkpdForm(prev => ({ ...prev, cp: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {getCP(lkpdForm.mapel, lkpdForm.kelas, lkpdForm.elemen).map((cpText, idx) => (
                    <option key={idx} value={cpText}>{cpText.length > 80 ? cpText.substring(0, 80) + "..." : cpText}</option>
                  ))}
                </select>
                <div className="p-2.5 bg-violet-50/30 border border-violet-100 rounded-xl text-[11px] text-slate-600 italic mt-1 leading-relaxed max-h-24 overflow-y-auto">
                  "{lkpdForm.cp || "Pilih elemen untuk memuat CP"}"
                </div>
              </div>

              {/* Preset Khusus Ekonomi Kelas XII - Siklus Akuntansi Lengkap */}
              {((lkpdForm.mapel === "Ekonomi" || lkpdForm.mapel.toLowerCase().includes("akuntansi")) && (lkpdForm.kelas.includes("12") || lkpdForm.kelas.includes("Fase F") || lkpdForm.jenjang === "SMA" || lkpdForm.jenjang === "SMK")) && (
                <div className="p-3 bg-gradient-to-br from-amber-50 via-orange-50/70 to-amber-50 border border-amber-200/90 rounded-xl space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-600" />
                      Preset Siklus Akuntansi Lengkap (Kelas XII)
                    </span>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 font-extrabold px-2 py-0.5 rounded-full border border-amber-300/80">
                      + Bukti Transaksi Otentik
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    Klik preset otomatis di bawah untuk menyusun LKPD Praktikum Akuntansi komprehensif dari <strong>Bukti Transaksi</strong> hingga <strong>Laporan Keuangan & Penutupan</strong>:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={applySiklusJasaPreset}
                      className="px-3 py-2 bg-white hover:bg-amber-100/60 border border-amber-300/90 rounded-xl text-left transition-all group flex flex-col gap-0.5 shadow-2xs hover:border-amber-400"
                    >
                      <span className="text-xs font-extrabold text-amber-950 group-hover:text-amber-900 flex items-center gap-1">
                        🏢 Perusahaan Jasa
                      </span>
                      <span className="text-[10px] text-slate-500 line-clamp-1 leading-tight">
                        Bukti Transaksi → Jurnal Umum → Buku Besar → AJP → Kertas Kerja → Lapkeu
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={applySiklusDagangPreset}
                      className="px-3 py-2 bg-white hover:bg-amber-100/60 border border-amber-300/90 rounded-xl text-left transition-all group flex flex-col gap-0.5 shadow-2xs hover:border-amber-400"
                    >
                      <span className="text-xs font-extrabold text-amber-950 group-hover:text-amber-900 flex items-center gap-1">
                        🛒 Perusahaan Dagang
                      </span>
                      <span className="text-[10px] text-slate-500 line-clamp-1 leading-tight">
                        Bukti Transaksi → Jurnal Khusus → Buku Pembantu → HPP → Lapkeu
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Materi Pokok Esensial</label>
                <input
                  type="text"
                  list="lkpd-materi-options"
                  placeholder="Pilih atau masukkan materi pokok (lengkap)..."
                  value={lkpdForm.materi}
                  onChange={(e) => setLkpdForm(prev => ({ ...prev, materi: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
                <datalist id="lkpd-materi-options">
                  {getMateriEsensial(lkpdForm.mapel, lkpdForm.kelas, lkpdForm.elemen).map(m => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              {/* Sub-Materi Multi-Select Dropdown */}
              <SubMateriMultiSelect
                materi={lkpdForm.materi}
                mapel={lkpdForm.mapel}
                kelas={lkpdForm.kelas}
                elemen={lkpdForm.elemen}
                selected={lkpdForm.subMateri || []}
                onChange={(newSelected) => setLkpdForm(prev => ({ ...prev, subMateri: newSelected }))}
                accentColor="violet"
                label="Sub-Materi Terfokus"
                placeholder="Pilih sub-materi (dapat pilih lebih dari 1)..."
              />

              {/* Opsi Khusus Paket Bukti Transaksi Otentik */}
              {((lkpdForm.mapel === "Ekonomi" || lkpdForm.mapel.toLowerCase().includes("akuntansi")) || lkpdForm.materi.toLowerCase().includes("akuntansi") || lkpdForm.materi.toLowerCase().includes("jasa") || lkpdForm.materi.toLowerCase().includes("dagang")) && (
                <label className="flex items-start gap-2.5 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-100/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={lkpdForm.includeBuktiTransaksiLengkap}
                    onChange={(e) => setLkpdForm(prev => ({ ...prev, includeBuktiTransaksiLengkap: e.target.checked }))}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-950 block">
                      📄 Sertakan Paket Dokumen Bukti Transaksi Otentik Lengkap (Kuitansi, Faktur, Nota, Memo)
                    </span>
                    <span className="text-[11px] text-emerald-800 leading-snug">
                      Menghasilkan paket dokumen bukti transaksi realistis (No Dokumen, Tanggal, Nominal Rp, dan Pihak Terkait) serta format tabel lembar kerja siklus akuntansi siap dikerjakan siswa.
                    </span>
                  </div>
                </label>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fokus Aktivitas / Tujuan Khusus</label>
                <input
                  type="text"
                  placeholder="Contoh: Mengidentifikasi jenis energi ramah lingkungan di sekitar rumah"
                  value={lkpdForm.fokusAktivitas}
                  onChange={(e) => setLkpdForm(prev => ({ ...prev, fokusAktivitas: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-[10px] text-violet-500 mt-1 italic font-medium leading-normal">
                  *Jika diisi, AI akan menyusun LKPD khusus untuk materi/tujuan tersebut saja (tidak melebar ke satu bab penuh).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Opsi LKPD</label>
                  <select
                    value={lkpdForm.tipeAktivitas}
                    onChange={(e) => setLkpdForm(prev => ({ ...prev, tipeAktivitas: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Kelompok (Kolaboratif)">Kelompok (Kolaboratif)</option>
                    <option value="Individu (Mandiri)">Individu (Mandiri)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Pertemuan</label>
                  <select
                    value={lkpdForm.jumlahPertemuan}
                    onChange={(e) => setLkpdForm(prev => ({ ...prev, jumlahPertemuan: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="1">1 Pertemuan (2 JP)</option>
                    <option value="2">2 Pertemuan (4 JP)</option>
                    <option value="3">3 Pertemuan (6 JP)</option>
                    <option value="4">4 Pertemuan (8 JP)</option>
                    <option value="5">5 Pertemuan (10 JP)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pendekatan Pembelajaran</label>
                  <select
                    value={lkpdForm.pendekatan}
                    onChange={(e) => setLkpdForm(prev => ({ ...prev, pendekatan: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Problem Based Learning (PBL)">PBL (Masalah)</option>
                    <option value="Project Based Learning (PjBL)">PjBL (Proyek)</option>
                    <option value="Inquiry / Discovery Learning">Inquiry / Penemuan</option>
                    <option value="Pendekatan Kontekstual (CTL)">Kontekstual (CTL)</option>
                    <option value="Deep Learning / Experiential">Deep Learning</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat Kesulitan</label>
                  <select
                    value={lkpdForm.tingkatKesulitan}
                    onChange={(e) => setLkpdForm(prev => ({ ...prev, tingkatKesulitan: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Standard / Campuran (LOTS-HOTS)">Standard / Campuran</option>
                    <option value="Didominasi HOTS (Analisis & Evaluasi)">Didominasi HOTS</option>
                    <option value="Praktis & Eksperimental">Praktis & Eksperimen</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Variasi Kasus & Stimulus (Anti-Monoton)</label>
                <select
                  value={lkpdForm.variasiStimulus}
                  onChange={(e) => setLkpdForm(prev => ({ ...prev, variasiStimulus: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                >
                  {LKPD_VARIASI_STIMULUS_LIST.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.label} ({st.badge})
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 px-3 py-2 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-800 flex items-start gap-1.5">
                  <span className="font-bold shrink-0">✨ Lembar Siswa:</span>
                  <span>Kolom analisis & jawaban di lembar aktivitas siswa otomatis dikosongkan (siap dicetak/dikerjakan siswa). Kunci jawaban lengkap diletakkan di lampiran khusus guru.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instruksi Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Tambahkan studi kasus lokal tentang pariwisata Bali atau fokuskan pada pengerjaan soal pecahan."
                  value={lkpdForm.instruksiTambahan}
                  onChange={(e) => setLkpdForm(prev => ({ ...prev, instruksiTambahan: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLKPDModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles size={14} /> Buat LKPD via AI
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
