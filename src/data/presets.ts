import { Student, ScheduleItem, Assignment, Submission, StudentGrade, JournalEntry } from "../types";

export const CLASSES = ["X-MIPA-1", "XI-MIPA-3", "XII-IPS-2"];

export const CLASS_ROOM_MAPPING: Record<string, string> = {
  "X-MIPA-1": "Ruang 101",
  "XI-MIPA-3": "Laboratorium Fisika",
  "XII-IPS-2": "Ruang 302"
};

export const SUBJECTS = [
  "Matematika Peminatan",
  "Matematika Wajib",
  "Fisika",
  "Biologi",
  "Kimia",
  "Ekonomi",
  "Sosiologi",
  "Sejarah",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Upacara Bendera"
];

export const PRESET_STUDENTS: Student[] = [
  // Class X-MIPA-1
  { id: "s1", name: "Ahmad Fauzi", nis: "1024501", className: "X-MIPA-1" },
  { id: "s2", name: "Budi Santoso", nis: "1024502", className: "X-MIPA-1" },
  { id: "s3", name: "Citra Lestari", nis: "1024503", className: "X-MIPA-1" },
  { id: "s4", name: "Dewi Sartika", nis: "1024504", className: "X-MIPA-1" },
  { id: "s5", name: "Eko Prasetyo", nis: "1024505", className: "X-MIPA-1" },
  { id: "s6", name: "Farhan Hakim", nis: "1024506", className: "X-MIPA-1" },
  { id: "s7", name: "Gita Amalia", nis: "1024507", className: "X-MIPA-1" },

  // Class XI-MIPA-3
  { id: "s11", name: "Hendra Wijaya", nis: "1124601", className: "XI-MIPA-3" },
  { id: "s12", name: "Indah Permata", nis: "1124602", className: "XI-MIPA-3" },
  { id: "s13", name: "Joko Susilo", nis: "1124603", className: "XI-MIPA-3" },
  { id: "s14", name: "Kartika Sari", nis: "1124604", className: "XI-MIPA-3" },
  { id: "s15", name: "Lukman Hakim", nis: "1124605", className: "XI-MIPA-3" },

  // Class XII-IPS-2
  { id: "s21", name: "Mega Utami", nis: "1224701", className: "XII-IPS-2" },
  { id: "s22", name: "Naufal Hadi", nis: "1224702", className: "XII-IPS-2" },
  { id: "s23", name: "Olivia Putri", nis: "1224703", className: "XII-IPS-2" },
  { id: "s24", name: "Putu Gede", nis: "1224704", className: "XII-IPS-2" },
  { id: "s25", name: "Rian Hidayat", nis: "1224705", className: "XII-IPS-2" }
];

export const PRESET_SCHEDULE: ScheduleItem[] = [
  { id: "sch1", subject: "Matematika Peminatan", day: "Senin", startTime: "07:30", endTime: "09:00", className: "X-MIPA-1", room: "Ruang 101", agenda: "Bab 1: Persamaan & Pertidaksamaan Rasional" },
  { id: "sch2", subject: "Fisika", day: "Senin", startTime: "09:30", endTime: "11:00", className: "XI-MIPA-3", room: "Laboratorium Fisika", agenda: "Praktikum Dinamika Rotasi & Kesetimbangan Benda Tegar" },
  { id: "sch3", subject: "Matematika Peminatan", day: "Selasa", startTime: "08:00", endTime: "09:30", className: "XI-MIPA-3", room: "Ruang 204", agenda: "Materi Polinomial & Suku Banyak" },
  { id: "sch4", subject: "Ekonomi", day: "Selasa", startTime: "10:00", endTime: "11:30", className: "XII-IPS-2", room: "Ruang 302", agenda: "Akuntansi Sebagai Sistem Informasi & Jurnal Umum" },
  { id: "sch5", subject: "Matematika Wajib", day: "Rabu", startTime: "07:30", endTime: "09:00", className: "X-MIPA-1", room: "Ruang 101", agenda: "Sistem Persamaan Linear Tiga Variabel (SPLTV)" },
  { id: "sch6", subject: "Sosiologi", day: "Rabu", startTime: "09:30", endTime: "11:00", className: "XII-IPS-2", room: "Ruang 302", agenda: "Perubahan Sosial & Dampaknya Terhadap Masyarakat" },
  { id: "sch7", subject: "Fisika", day: "Kamis", startTime: "08:00", endTime: "09:30", className: "X-MIPA-1", room: "Ruang 101", agenda: "Hukum Newton tentang Gerak & Aplikasinya" },
  { id: "sch8", subject: "Sejarah", day: "Kamis", startTime: "10:00", endTime: "11:30", className: "XII-IPS-2", room: "Ruang 302", agenda: "Perkembangan Politik & Ekonomi Indonesia Masa Orde Baru" },
  { id: "sch9", subject: "Matematika Peminatan", day: "Jumat", startTime: "07:30", endTime: "09:00", className: "XI-MIPA-3", room: "Ruang 204", agenda: "Diskusi Soal & Evaluasi Irisan Kerucut (Lingkaran)" }
];

export const PRESET_ASSIGNMENTS: Assignment[] = [
  { id: "a1", title: "Latihan Aljabar Linear", category: "Tugas", className: "X-MIPA-1", dueDate: "2026-07-20", maxScore: 100 },
  { id: "a2", title: "Laporan Praktikum Kinematika", category: "Proyek", className: "XI-MIPA-3", dueDate: "2026-07-18", maxScore: 100 },
  { id: "a3", title: "Analisis Pasar Mikro Ekonomi", category: "Tugas", className: "XII-IPS-2", dueDate: "2026-07-22", maxScore: 100 }
];

export const PRESET_SUBMISSIONS: Submission[] = [
  // Submissions for assignment 1
  {
    id: "sub1",
    assignmentId: "a1",
    studentId: "s1",
    studentName: "Ahmad Fauzi",
    submittedDate: "2026-07-14",
    studentAnswer: "Jawaban aljabar linear: Untuk mencari nilai x pada persamaan 3x + 5 = 20, kita kurangi kedua ruas dengan 5 menjadi 3x = 15. Kemudian bagi dengan 3 sehingga didapatkan x = 5. Matriks determinan A = ad - bc.",
    score: 95,
    status: "Selesai",
    aiAnalysis: {
      score: 95,
      analysis: "Langkah-langkah yang dijabarkan sudah sangat lengkap dan terstruktur dengan benar. Penjelasan determinan matriks juga tepat.",
      feedback: "Luar biasa Ahmad! Pemahamanmu tentang aljabar linear dan determinan matriks sangat solid.",
      suggestions: "Teruskan performa ini. Cobalah tantang dirimu dengan soal matriks ordo 3x3."
    }
  },
  {
    id: "sub2",
    assignmentId: "a1",
    studentId: "s2",
    studentName: "Budi Santoso",
    submittedDate: "2026-07-15",
    studentAnswer: "3x + 5 = 20 -> 3x = 15 -> x = 3. Dan nilai matriks determinan adalah perkalian silang saja.",
    score: null,
    status: "Perlu Dinilai",
    aiAnalysis: undefined
  },
  {
    id: "sub3",
    assignmentId: "a1",
    studentId: "s3",
    studentName: "Citra Lestari",
    submittedDate: "2026-07-14",
    studentAnswer: "Persamaan: 3x + 5 = 20. Kita hilangkan 5 di ruas kiri, jadi 3x = 15. Maka x = 15/3 = 5. Untuk determinan matriks A = [[a, b], [c, d]] rumusnya ad - bc.",
    score: 100,
    status: "Selesai",
    aiAnalysis: {
      score: 100,
      analysis: "Sempurna. Perhitungan persamaan linear dan rumus determinan matriks 2x2 dituliskan dengan presisi mutlak.",
      feedback: "Sempurna Citra! Pertahankan kerja bagusmu, jawabanmu sangat bersih dan rapi.",
      suggestions: "Hebat! Kamu siap lanjut ke materi sistem persamaan linear tiga variabel (SPLTV)."
    }
  },
  {
    id: "sub4",
    assignmentId: "a1",
    studentId: "s4",
    studentName: "Dewi Sartika",
    submittedDate: "",
    studentAnswer: "",
    score: null,
    status: "Belum Dikumpulkan"
  },

  // Submissions for assignment 2
  {
    id: "sub11",
    assignmentId: "a2",
    studentId: "s11",
    studentName: "Hendra Wijaya",
    submittedDate: "2026-07-14",
    studentAnswer: "Laporan Kinematika: Berdasarkan praktikum gerak lurus berubah beraturan (GLBB), didapatkan bahwa percepatan benda konstan dan kecepatan berbanding lurus dengan waktu. Grafik v terhadap t membentuk garis lurus miring ke atas.",
    score: null,
    status: "Perlu Dinilai"
  }
];

export const PRESET_GRADES: StudentGrade[] = [
  // Class X-MIPA-1
  {
    studentId: "s1",
    studentName: "Ahmad Fauzi",
    className: "X-MIPA-1",
    assignmentScores: { "a1": 95 },
    examScore: 88,
    midtermScore: 85,
    characterScore: 90
  },
  {
    studentId: "s2",
    studentName: "Budi Santoso",
    className: "X-MIPA-1",
    assignmentScores: { "a1": 70 },
    examScore: 78,
    midtermScore: 85,
    characterScore: 90
  },
  {
    studentId: "s3",
    studentName: "Citra Lestari",
    className: "X-MIPA-1",
    assignmentScores: { "a1": 100 },
    examScore: 94,
    midtermScore: 85,
    characterScore: 90
  },
  {
    studentId: "s4",
    studentName: "Dewi Sartika",
    className: "X-MIPA-1",
    assignmentScores: { "a1": 0 },
    examScore: 82,
    midtermScore: 85,
    characterScore: 90
  },

  // Class XI-MIPA-3
  {
    studentId: "s11",
    studentName: "Hendra Wijaya",
    className: "XI-MIPA-3",
    assignmentScores: { "a2": 85 },
    examScore: 80,
    midtermScore: 85,
    characterScore: 90
  },
  {
    studentId: "s12",
    studentName: "Indah Permata",
    className: "XI-MIPA-3",
    assignmentScores: { "a2": 90 },
    examScore: 89,
    midtermScore: 85,
    characterScore: 90
  }
];

export const PRESET_JOURNAL: JournalEntry[] = [
  {
    id: "j0",
    date: "2026-01-12",
    className: "XI D4 & XI C1",
    topic: "Upacara Bendera & Refleksi Pembelajaran Ekonomi",
    notes: "Upacara bendera pagi hari, dilanjutkan rapat dinas awal semester 2, lalu pembelajaran di kelas XI D4 dan XI C1.",
    summary: "Melaksanakan kegiatan dinas upacara bendera, rapat dinas guru awal semester 2, serta memulai proses refleksi pembelajaran semester 1 dan sosialisasi rencana belajar semester 2.",
    reflection: "Siswa bersemangat mengikuti upacara dan kegiatan belajar awal semester. Refleksi membantu memetakan materi yang masih membingungkan dari semester lalu.",
    nextSteps: "Melanjutkan materi inti Ekonomi Semester 2 pada pertemuan berikutnya.",
    isAISuggested: false,
    teacherName: "YUDI GINANJAR",
    nip: "199605242024211008",
    subject: "EKONOMI",
    month: "JANUARI 2026",
    weekNum: "2",
    documentTitle: "Dokumentasi Kegiatan Harian\nPembelajaran Ekonomi\nKelas: XI D4 dan XI C1\nUpacara Bendera dan Rapat Dinas Awal Semester",
    institution: "Pemerintah Provinsi Jawa Barat\nSMA Negeri 2 Tasikmalaya",
    photoTimestamps: ["06:53", "06:53", "10:37", "09:27"],
    photos: [
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80"
    ],
    descriptionText: `Melaksanakan kegiatan dinas sekolah:
1. Melaksanakan kegiatan upacara bendera
2. Melaksanakan Rapat Dinas Awal semester 2

Melaksanakan Kegiatan Pembelajaran Ekonomi:
1. Kelas XI D4
   - Berdoa sebelum belajar
   - Melakukan kegiatan refleksi pembelajaran ekonomi SMT 1
   - Menyampaikan rencana kegiatan belajar mengajar pelajaran Ekonomi Semester 2
2. Kelas XI C1
   - Berdoa sebelum belajar
   - Melakukan kegiatan refleksi pembelajaran ekonomi SMT 1
   - Menyampaikan rencana kegiatan belajar mengajar pelajaran Ekonomi Semester 2`
  },
  {
    id: "j1",
    date: "2026-07-13",
    className: "X-MIPA-1",
    topic: "Pengenalan Aljabar Linear & Matriks",
    notes: "Siswa sangat antusias terutama saat simulasi perkalian matriks menggunakan kartu kelompok.",
    summary: "1. Pendahuluan: Berdoa bersama dan penyampaian apersepsi kegunaan matriks dalam kriptografi.\n2. Kegiatan Inti: Penjelasan ordo, baris, kolom, dan determinan matriks 2x2. Latihan kelompok menggunakan metode kooperatif.\n3. Penutup: Refleksi singkat dan pemberian pekerjaan rumah latihan aljabar.",
    reflection: "Dinamika kelas sangat hidup. Namun, ada 2 siswa (Budi & Farhan) yang terlihat kesulitan menyamakan baris dan kolom. Pembagian kelompok membantu mengatasi masalah ini.",
    nextSteps: "Melakukan kuis singkat mengenai determinan di awal jam, lalu melangkah ke materi perkalian matriks ordo 3x3.",
    isAISuggested: false,
    teacherName: "YUDI GINANJAR",
    nip: "199605242024211008",
    subject: "MATEMATIKA",
    month: "JULI 2026",
    weekNum: "1",
    documentTitle: "Dokumentasi Pembelajaran\nMatematika - Aljabar Linier\nKelas: X-MIPA-1",
    institution: "Pemerintah Provinsi Jawa Barat\nSMA Negeri 2 Tasikmalaya",
    photoTimestamps: ["07:15", "08:30"],
    photos: [
      "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80"
    ],
    descriptionText: `Melaksanakan Kegiatan Pembelajaran Matematika:
1. Kelas X-MIPA-1
   - Melakukan apersepsi pentingnya aljabar linear dalam pemrograman komputer
   - Menjelaskan struktur baris dan kolom matriks
   - Melakukan latihan kelompok perkalian matriks ordo 2x2
   - Memberikan evaluasi kelompok`
  },
  {
    id: "j2",
    date: "2026-07-14",
    className: "XI-MIPA-3",
    topic: "Praktikum GLBB Kinematika",
    notes: "Praktikum di laboratorium. Menggunakan ticker timer untuk mengukur percepatan mobil mainan.",
    summary: "1. Pendahuluan: Pengarahan tata tertib laboratorium dan demonstrasi pembacaan ticker timer.\n2. Kegiatan Inti: Siswa bekerja dalam kelompok merakit bidang miring, menjalankan beban, dan menggunting pita ticker timer.\n3. Penutup: Pembahasan hubungan jarak-waktu dan kecepatan-waktu, dilanjutkan dengan merapikan alat laboratorium.",
    reflection: "Siswa memahami konsep percepatan konstan lewat grafik pita ticker timer secara visual. Kegiatan berhasil 100%, semua kelompok menyelesaikan pengambilan data.",
    nextSteps: "Pengumpulan laporan praktikum kinematika dan pembahasan pengolahan data regresi linear sederhana di kelas.",
    isAISuggested: true,
    teacherName: "YUDI GINANJAR",
    nip: "199605242024211008",
    subject: "FISIKA",
    month: "JULI 2026",
    weekNum: "1",
    documentTitle: "Dokumentasi Praktikum Fisika\nKinematika GLBB di Lab\nKelas: XI-MIPA-3",
    institution: "Pemerintah Provinsi Jawa Barat\nSMA Negeri 2 Tasikmalaya",
    photoTimestamps: ["13:00", "14:15"],
    photos: [
      "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80"
    ],
    descriptionText: `Melaksanakan Kegiatan Praktikum Fisika:
1. Kelas XI-MIPA-3
   - Memberikan pengantar tentang Gerak Lurus Berubah Beraturan (GLBB)
   - Membagi siswa menjadi 5 kelompok praktikum
   - Membimbing perakitan ticker timer pada papan luncur miring
   - Melakukan analisis grafik ketukan pita kertas`
  }
];
