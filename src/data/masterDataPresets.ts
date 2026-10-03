import { SubjectMaster, ClassMaster, SchoolMasterProfile } from '../types';

export const DEFAULT_SUBJECTS: SubjectMaster[] = [
  {
    id: 'sub-pabp',
    code: 'PAI',
    name: 'Pendidikan Agama & Budi Pekerti',
    category: 'Umum',
    fase: 'Semua Fase',
    hoursPerWeek: 3,
    kkm: 75,
    description: 'Pendidikan keagamaan, akhlak mulia, dan toleransi beragama'
  },
  {
    id: 'sub-ppkn',
    code: 'PPKn',
    name: 'Pendidikan Pancasila',
    category: 'Umum',
    fase: 'Semua Fase',
    hoursPerWeek: 2,
    kkm: 75,
    description: 'Pemahaman ideologi Pancasila, konstitusi, dan kewarganegaraan'
  },
  {
    id: 'sub-bind',
    code: 'BIND',
    name: 'Bahasa Indonesia',
    category: 'Umum',
    fase: 'Semua Fase',
    hoursPerWeek: 4,
    kkm: 75,
    description: 'Literasi teks, struktur kebahasaan, dan apresiasi sastra'
  },
  {
    id: 'sub-mat-w',
    code: 'MAT-W',
    name: 'Matematika (Umum)',
    category: 'Umum',
    fase: 'Semua Fase',
    hoursPerWeek: 4,
    kkm: 75,
    description: 'Aljabar, geometri, statistika, peluang, dan kalkulus dasar'
  },
  {
    id: 'sub-bing',
    code: 'BING',
    name: 'Bahasa Inggris',
    category: 'Umum',
    fase: 'Semua Fase',
    hoursPerWeek: 2,
    kkm: 75,
    description: 'Komunikasi lisan, wacana fungsional, dan keterampilan berbahasa global'
  },
  {
    id: 'sub-pjok',
    code: 'PJOK',
    name: 'Pendidikan Jasmani, Olahraga & Kesehatan',
    category: 'Umum',
    fase: 'Semua Fase',
    hoursPerWeek: 3,
    kkm: 75,
    description: 'Kebugaran jasmani, sportivitas, dan pola hidup sehat'
  },
  {
    id: 'sub-sej',
    code: 'SEJ',
    name: 'Sejarah Indonesia',
    category: 'Umum',
    fase: 'Semua Fase',
    hoursPerWeek: 2,
    kkm: 75,
    description: 'Historiografi nasional, peristiwa penting, dan kesadaran sejarah'
  },
  {
    id: 'sub-seni',
    code: 'SENI',
    name: 'Seni dan Budaya',
    category: 'Umum',
    fase: 'Semua Fase',
    hoursPerWeek: 2,
    kkm: 75,
    description: 'Karya cipta seni rupa, musik, tari, dan teater'
  },
  {
    id: 'sub-infor',
    code: 'TIK',
    name: 'Informatika',
    category: 'Umum',
    fase: 'Fase E (Kelas 10)',
    hoursPerWeek: 3,
    kkm: 75,
    description: 'Berpikir komputasional, algoritma, pemrograman, dan literasi digital'
  },
  {
    id: 'sub-fis',
    code: 'FIS',
    name: 'Fisika',
    category: 'Pilihan',
    fase: 'Fase F (Kelas 11-12)',
    hoursPerWeek: 5,
    kkm: 75,
    description: 'Mekanika, termodinamika, gelombang, optik, dan listrik magnet'
  },
  {
    id: 'sub-kim',
    code: 'KIM',
    name: 'Kimia',
    category: 'Pilihan',
    fase: 'Fase F (Kelas 11-12)',
    hoursPerWeek: 5,
    kkm: 75,
    description: 'Struktur atom, ikatan kimia, reaksi larutan, dan kimia organik'
  },
  {
    id: 'sub-bio',
    code: 'BIO',
    name: 'Biologi',
    category: 'Pilihan',
    fase: 'Fase F (Kelas 11-12)',
    hoursPerWeek: 5,
    kkm: 75,
    description: 'Keanekaragaman hayati, sel, metabolisme, genetika, dan ekosistem'
  },
  {
    id: 'sub-eko',
    code: 'EKO',
    name: 'Ekonomi',
    category: 'Pilihan',
    fase: 'Semua Fase',
    hoursPerWeek: 5,
    kkm: 75,
    description: 'Konsep kelangkaan, pasar, akuntansi, dan kebijakan moneter fiskal'
  },
  {
    id: 'sub-sos',
    code: 'SOS',
    name: 'Sosiologi',
    category: 'Pilihan',
    fase: 'Fase F (Kelas 11-12)',
    hoursPerWeek: 5,
    kkm: 75,
    description: 'Interaksi sosial, struktur kelompok, konflik, dan dinamika sosial'
  },
  {
    id: 'sub-geo',
    code: 'GEO',
    name: 'Geografi',
    category: 'Pilihan',
    fase: 'Fase F (Kelas 11-12)',
    hoursPerWeek: 5,
    kkm: 75,
    description: 'Litosfer, hidrosfer, biosfer, sistem informasi geografis, dan mitigasi bencana'
  },
  {
    id: 'sub-mat-lanjut',
    code: 'MAT-TL',
    name: 'Matematika Tingkat Lanjut',
    category: 'Pilihan',
    fase: 'Fase F (Kelas 11-12)',
    hoursPerWeek: 5,
    kkm: 75,
    description: 'Trigonometri analitik, polinomial, matriks, dan kalkulus diferensial integral'
  },
  {
    id: 'sub-mulok',
    code: 'ML-SND',
    name: 'Muatan Lokal (Bahasa Sunda)',
    category: 'Muatan Lokal',
    fase: 'Semua Fase',
    hoursPerWeek: 2,
    kkm: 75,
    description: 'Undak usuk basa Sunda, carpon, dongeng, dan kearifan lokal Jawa Barat'
  },
  {
    id: 'sub-bk',
    code: 'BK',
    name: 'Bimbingan & Konseling',
    category: 'Layanan',
    fase: 'Semua Fase',
    hoursPerWeek: 1,
    kkm: 80,
    description: 'Pengembangan diri, karir masa depan, dan bimbingan kepribadian siswa'
  },
  // JENJANG SD & MI (Fase A - C)
  {
    id: 'sub-ipas-sd',
    code: 'IPAS',
    name: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    category: 'SD / Fase B-C',
    fase: 'Fase B & C (SD Kelas 3-6)',
    hoursPerWeek: 5,
    kkm: 75,
    description: 'Eksplorasi fenomena alam, lingkungan, masyarakat, dan sejarah lokal SD'
  },
  {
    id: 'sub-coding-sd',
    code: 'AI-SD',
    name: 'Koding & Kecerdasan Artifisial (AI)',
    category: 'SD / Muatan Khusus',
    fase: 'Fase B & C (SD Kelas 3-6)',
    hoursPerWeek: 2,
    kkm: 75,
    description: 'Literasi komputasional dasar, logika koding visual, dan etika AI dasar'
  },
  // JENJANG SMP & MTs (Fase D)
  {
    id: 'sub-ipa-smp',
    code: 'IPA-SMP',
    name: 'Ilmu Pengetahuan Alam (IPA)',
    category: 'SMP / Fase D',
    fase: 'Fase D (SMP Kelas 7-9)',
    hoursPerWeek: 5,
    kkm: 75,
    description: 'Hakikat sains, pengukuran, zat, suhu, pemuaian, ekosistem, listrik, dan tata surya'
  },
  {
    id: 'sub-ips-smp',
    code: 'IPS-SMP',
    name: 'Ilmu Pengetahuan Sosial (IPS)',
    category: 'SMP / Fase D',
    fase: 'Fase D (SMP Kelas 7-9)',
    hoursPerWeek: 4,
    kkm: 75,
    description: 'Keluarga, interaksi keruangan, lembaga sosial, sejarah nusantara, dan kegiatan ekonomi'
  },
  {
    id: 'sub-prakarya-smp',
    code: 'PRAKARYA',
    name: 'Prakarya (Kerajinan, Rekayasa, Budidaya, Pengolahan)',
    category: 'SMP / Fase D',
    fase: 'Fase D (SMP Kelas 7-9)',
    hoursPerWeek: 2,
    kkm: 75,
    description: 'Pengembangan produk kerajinan bahan lunak/keras, teknologi rekayasa, dan olahan pangan'
  },
  // JENJANG SMK & MAK (Fase E - F)
  {
    id: 'sub-pipas-smk',
    code: 'PIPAS-SMK',
    name: 'Projek IPAS (Ilmu Pengetahuan Alam dan Sosial SMK)',
    category: 'SMK / Kejuruan',
    fase: 'Fase E (SMK Kelas 10)',
    hoursPerWeek: 6,
    kkm: 75,
    description: 'Makhluk hidup & lingkungannya, zat & perubahannya, energi & perubahannya, serta interaksi sosial'
  },
  {
    id: 'sub-dd-rpl-smk',
    code: 'DD-RPL',
    name: 'Dasar-Dasar Rekayasa Perangkat Lunak (RPL)',
    category: 'SMK / Kejuruan',
    fase: 'Fase E (SMK Kelas 10)',
    hoursPerWeek: 12,
    kkm: 78,
    description: 'Pemrograman terstruktur, orientasi objek, basis data, dan rekayasa perangkat lunak'
  },
  {
    id: 'sub-dd-tkj-smk',
    code: 'DD-TKJ',
    name: 'Dasar-Dasar Teknik Komputer dan Jaringan (TKJ)',
    category: 'SMK / Kejuruan',
    fase: 'Fase E (SMK Kelas 10)',
    hoursPerWeek: 12,
    kkm: 78,
    description: 'K3LH, rakit komputer, instalasi OS, jaringan komputer dasar, dan sistem telekomunikasi'
  },
  {
    id: 'sub-dd-oto-smk',
    code: 'DD-OTO',
    name: 'Dasar-Dasar Teknik Otomotif',
    category: 'SMK / Kejuruan',
    fase: 'Fase E (SMK Kelas 10)',
    hoursPerWeek: 12,
    kkm: 78,
    description: 'Proses bisnis otomotif, K3LH, gambar teknik, alat ukur, dan mesin otomotif dasar'
  },
  {
    id: 'sub-dd-akl-smk',
    code: 'DD-AKL',
    name: 'Dasar-Dasar Akuntansi & Keuangan Lembaga',
    category: 'SMK / Kejuruan',
    fase: 'Fase E (SMK Kelas 10)',
    hoursPerWeek: 12,
    kkm: 78,
    description: 'Etika profesi akuntansi, prinsip dasar akuntansi, perbankan dasar, dan aplikasi pengolah angka'
  },
  {
    id: 'sub-dd-mplb-smk',
    code: 'DD-MPLB',
    name: 'Dasar-Dasar Manajemen Perkantoran & Layanan Bisnis',
    category: 'SMK / Kejuruan',
    fase: 'Fase E (SMK Kelas 10)',
    hoursPerWeek: 12,
    kkm: 78,
    description: 'Prosedur administrasi kantor, kearsipan digital, komunikasi bisnis, dan pelayanan prima'
  },
  {
    id: 'sub-dd-pemasaran-smk',
    code: 'DD-PMS',
    name: 'Dasar-Dasar Pemasaran & Bisnis Digital',
    category: 'SMK / Kejuruan',
    fase: 'Fase E (SMK Kelas 10)',
    hoursPerWeek: 12,
    kkm: 78,
    description: 'Riset pasar, pemasaran digital (digital marketing), e-commerce, dan kewirausahaan'
  },
  {
    id: 'sub-dd-kuliner-smk',
    code: 'DD-KLN',
    name: 'Dasar-Dasar Kuliner / Tata Boga',
    category: 'SMK / Kejuruan',
    fase: 'Fase E (SMK Kelas 10)',
    hoursPerWeek: 12,
    kkm: 78,
    description: 'Sanitasi, higiene, K3 kuliner, teknik potong, resep masakan Nusantara dan Internasional'
  },
  {
    id: 'sub-dd-dkv-smk',
    code: 'DD-DKV',
    name: 'Dasar-Dasar Desain Komunikasi Visual (DKV)',
    category: 'SMK / Kejuruan',
    fase: 'Fase E (SMK Kelas 10)',
    hoursPerWeek: 12,
    kkm: 78,
    description: 'Prinsip desain, sketsa, tipografi, fotografi, ilustrasi digital, dan karya seni visual'
  },
  {
    id: 'sub-pkk-smk',
    code: 'PKK-SMK',
    name: 'Projek Kreatif dan Kewirausahaan (PKK)',
    category: 'SMK / Kejuruan',
    fase: 'Fase F (SMK Kelas 11-12)',
    hoursPerWeek: 5,
    kkm: 78,
    description: 'Perencanaan produk, prototipe, hak cipta/HAKI, strategi pemasaran, dan laporan keuangan usaha'
  },
  {
    id: 'sub-pkl-smk',
    code: 'PKL-SMK',
    name: 'Praktik Kerja Lapangan (PKL)',
    category: 'SMK / Kejuruan',
    fase: 'Fase F (SMK Kelas 12)',
    hoursPerWeek: 18,
    kkm: 80,
    description: 'Pengalaman kerja nyata di Dunia Usaha / Dunia Industri (DUDI) sesuai konsentrasi keahlian'
  },
  // KONSENTRASI KEAHLIAN FASE F SMK
  {
    id: 'sub-kon-rpl',
    code: 'KON-RPL',
    name: 'Konsentrasi Keahlian RPL (Pemrograman Web, Mobile & PBO)',
    category: 'SMK / Kejuruan',
    fase: 'Fase F (SMK Kelas 11-12)',
    hoursPerWeek: 18,
    kkm: 80,
    description: 'Pemrograman web tingkat lanjut, aplikasi mobile Android/iOS, PBO, basis data relational & NoSQL'
  },
  {
    id: 'sub-kon-tkj',
    code: 'KON-TKJ',
    name: 'Konsentrasi Keahlian TKJ (Administrasi Server & Keamanan Jaringan)',
    category: 'SMK / Kejuruan',
    fase: 'Fase F (SMK Kelas 11-12)',
    hoursPerWeek: 18,
    kkm: 80,
    description: 'Administrasi infrastruktur jaringan Cisco/Mikrotik, server Linux/Windows, cloud computing & cybersecurity'
  },
  {
    id: 'sub-kon-tkr',
    code: 'KON-TKR',
    name: 'Konsentrasi Keahlian TKR (Pemeliharaan Mesin & Kelistrikan Mobil)',
    category: 'SMK / Kejuruan',
    fase: 'Fase F (SMK Kelas 11-12)',
    hoursPerWeek: 18,
    kkm: 80,
    description: 'Tune-up EFI, pemeliharaan sasis, transmisi otomatis/manual, dan sistem kelistrikan bodi mobil'
  },
  {
    id: 'sub-kon-tsm',
    code: 'KON-TSM',
    name: 'Konsentrasi Keahlian TSM (Pemeliharaan Mesin & Injeksi Sepeda Motor)',
    category: 'SMK / Kejuruan',
    fase: 'Fase F (SMK Kelas 11-12)',
    hoursPerWeek: 18,
    kkm: 80,
    description: 'Servis berkala sistem PGM-FI/YMJET-FI, perbaikan mesin, sasis, transmisi, dan kelistrikan motor'
  },
  {
    id: 'sub-kon-akl',
    code: 'KON-AKL',
    name: 'Konsentrasi Keahlian AKL (Akuntansi Keuangan & Komputer Akuntansi)',
    category: 'SMK / Kejuruan',
    fase: 'Fase F (SMK Kelas 11-12)',
    hoursPerWeek: 18,
    kkm: 80,
    description: 'Penyusunan laporan keuangan perusahaan jasa/dagang/manufaktur, Accurate, MYOB, dan perpajakan'
  },
  {
    id: 'sub-kon-mplb',
    code: 'KON-MPLB',
    name: 'Konsentrasi Keahlian MPLB (Otomatisasi Perkantoran & Kearsipan Digital)',
    category: 'SMK / Kejuruan',
    fase: 'Fase F (SMK Kelas 11-12)',
    hoursPerWeek: 18,
    kkm: 80,
    description: 'Tata kelola kepegawaian & keuangan kantor, kearsipan elektronik, rapat bisnis, dan protokol'
  },
  {
    id: 'sub-kon-pemasaran',
    code: 'KON-PMS',
    name: 'Konsentrasi Keahlian Pemasaran Digital & Bisnis Ritel',
    category: 'SMK / Kejuruan',
    fase: 'Fase F (SMK Kelas 11-12)',
    hoursPerWeek: 18,
    kkm: 80,
    description: 'Strategi digital marketing, iklan media sosial (Meta/Tiktok Ads), e-commerce marketplace, dan POS ritel'
  },
  {
    id: 'sub-kon-kuliner',
    code: 'KON-KLN',
    name: 'Konsentrasi Keahlian Kuliner (Pengolahan Makanan & Pastry/Bakery)',
    category: 'SMK / Kejuruan',
    fase: 'Fase F (SMK Kelas 11-12)',
    hoursPerWeek: 18,
    kkm: 80,
    description: 'Pengolahan hidangan Kontinental & Oriental, resep Nusantara autentik, produk pastry & roti'
  },
  {
    id: 'sub-kon-dkv',
    code: 'KON-DKV',
    name: 'Konsentrasi Keahlian DKV (Desain Grafis, Videografi & Animasi)',
    category: 'SMK / Kejuruan',
    fase: 'Fase F (SMK Kelas 11-12)',
    hoursPerWeek: 18,
    kkm: 80,
    description: 'Desain identitas visual/branding, UI/UX design, editing video profesional, komposisi fotografi & animasi'
  },
  {
    id: 'sub-kon-perhotelan',
    code: 'KON-HTL',
    name: 'Konsentrasi Keahlian Perhotelan (Front Office & Housekeeping)',
    category: 'SMK / Kejuruan',
    fase: 'Fase F (SMK Kelas 11-12)',
    hoursPerWeek: 18,
    kkm: 80,
    description: 'Layanan resepsionis kantor depan, kebersihan & tata graha (housekeeping), laundry, dan reservasi hotel'
  },
  {
    id: 'sub-kon-kesehatan',
    code: 'KON-KST',
    name: 'Konsentrasi Keahlian Keperawatan & Farmasi Klinis',
    category: 'SMK / Kejuruan',
    fase: 'Fase F (SMK Kelas 11-12)',
    hoursPerWeek: 18,
    kkm: 80,
    description: 'Pemeriksaan tanda-tanda vital, perawatan pasien, racik obat apotek, dan komunikasi terapeutik'
  }
];

export const DEFAULT_SCHOOL_PROFILE: SchoolMasterProfile = {
  schoolName: 'SMA Negeri 2 Tasikmalaya',
  npsn: '20224512',
  nss: '301026001002',
  educationLevel: 'SMA',
  accreditation: 'A (Unggul)',
  address: 'Jl. R.E. Martadinata No. 261',
  city: 'Kota Tasikmalaya',
  province: 'Jawa Barat',
  postalCode: '46151',
  phone: '(0265) 331331',
  email: 'info@sman2tasikmalaya.sch.id',
  website: 'https://sman2tasikmalaya.sch.id',
  headmasterName: 'Dra. Hj. Sri Lestari, M.Pd.',
  headmasterNip: '19680512 199303 2 004',
  headmasterRank: 'Pembina Utama Muda, IV/c',
  academicYear: '2025/2026',
  semester: 'Ganjil',
  reportDate: '19 Desember 2025'
};
