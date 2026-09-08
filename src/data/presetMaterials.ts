import { LearningMaterial } from "../types";

export const PRESET_LEARNING_MATERIALS: LearningMaterial[] = [
  {
    id: "mat-101",
    title: "PowerPoint Interaktif: Bab 1 Masalah Ekonomi & Sistem Ekonomi",
    description: "Slide presentasi interaktif mencakup pengertian kelangkaan, kebutuhan manusia, biaya peluang, dan perbandingan sistem ekonomi pasar vs komando.",
    subject: "EKONOMI",
    className: "XII-C1, XII-C2",
    targetClasses: ["XII-C1", "XII-C2"],
    type: "presentation",
    driveUrl: "https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing",
    embedUrl: "https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/embed?start=false&loop=false&delayms=3000",
    topic: "BAB 1: Konsep Dasar Ilmu Ekonomi",
    bab: "BAB 1: Konsep Dasar Ilmu Ekonomi",
    subBab: "1.1 Masalah Ekonomi & Sistem Ekonomi",
    createdAt: "2026-08-20",
    fileSize: "4.2 MB (Google Slides)",
    tags: ["PowerPoint", "Google Drive", "Ekonomi Kelas 10", "Interaktif"],
    notes: [
      { id: "n1", timestamp: "Slide 3", content: "Minta siswa mendiskusikan contoh kelangkaan minyak bumi di daerah masing-masing", createdAt: "2026-08-20" },
      { id: "n2", timestamp: "Slide 8", content: "Tekankan perbedaan antara biaya sehari-hari dan biaya peluang (opportunity cost)", createdAt: "2026-08-20" }
    ]
  },
  {
    id: "mat-102",
    title: "Video Pembelajaran: Konsep Kelangkaan & Skala Prioritas",
    description: "Video pembelajaran visual durasi 12 menit yang menjelaskan prinsip mendasar pilihan ekonomi dan cara menyusun skala prioritas siswa.",
    subject: "EKONOMI",
    className: "X-MIPA-1",
    type: "video",
    driveUrl: "https://www.youtube.com/watch?v=L_LUpnjgPso",
    embedUrl: "https://www.youtube.com/embed/L_LUpnjgPso?rel=0&modestbranding=1",
    topic: "BAB 1: Kelangkaan & Kebutuhan",
    bab: "BAB 1: Konsep Dasar Ilmu Ekonomi",
    subBab: "1.2 Kelangkaan & Skala Prioritas",
    createdAt: "2026-08-22",
    fileSize: "Streaming Video",
    tags: ["Video Lecture", "YouTube Embed", "Kelangkaan", "E-Learning"],
    notes: [
      { id: "n3", timestamp: "03:15", content: "Pause video pada detik ini untuk menanyakan tabel matriks prioritas Stephen Covey", createdAt: "2026-08-22" },
      { id: "n4", timestamp: "08:40", content: "Penjelasan studi kasus pengeluaran uang saku bulanan siswa", createdAt: "2026-08-22" }
    ]
  },
  {
    id: "mat-103",
    title: "Slide Presentasi PPT: Akuntansi Sebagai Sistem Informasi",
    description: "Bahan tayang pembelajaran akuntansi keuangan untuk siswa kelas XII IPS. Membahas sejarah akuntansi, pemakai informasi, dan prinsip dasar.",
    subject: "EKONOMI",
    className: "XII-IPS-2",
    type: "presentation",
    driveUrl: "https://docs.google.com/presentation/d/12gHh86J7iQ01m-Q6T2tUaFq8mK9wQ/edit?usp=sharing",
    embedUrl: "https://docs.google.com/presentation/d/12gHh86J7iQ01m-Q6T2tUaFq8mK9wQ/embed?start=false&loop=false&delayms=3000",
    topic: "BAB 2: Akuntansi Keuangan",
    bab: "BAB 2: Akuntansi Sebagai Sistem Informasi",
    subBab: "2.1 Konsep Dasar Akuntansi Keuangan",
    createdAt: "2026-08-24",
    fileSize: "6.8 MB (Google Slides)",
    tags: ["Akuntansi", "PPT Google Drive", "Kelas 12 IPS", "Sistem Informasi"],
    notes: [
      { id: "n5", timestamp: "Slide 5", content: "Kuis singkat: sebutkan 3 pemakai informasi akuntansi eksternal", createdAt: "2026-08-24" }
    ]
  },
  {
    id: "mat-104",
    title: "Video Tutorial Praktik: Penyusunan Jurnal Umum & Buku Besar",
    description: "Video simulasi pengerjaan transaksi bisnis ke dalam format jurnal umum berpasangan (Debit & Kredit) dan posting ke buku besar.",
    subject: "EKONOMI",
    className: "XII-IPS-2",
    type: "video",
    driveUrl: "https://www.youtube.com/watch?v=2vS_6j0r06s",
    embedUrl: "https://www.youtube.com/embed/2vS_6j0r06s?rel=0&modestbranding=1",
    topic: "BAB 2: Siklus Akuntansi Perusahaan Jasa",
    bab: "BAB 2: Akuntansi Sebagai Sistem Informasi",
    subBab: "2.2 Penyusunan Jurnal Umum & Buku Besar",
    createdAt: "2026-08-25",
    fileSize: "Video HD Drive",
    tags: ["Jurnal Umum", "Buku Besar", "Video Praktik"],
    notes: []
  },
  {
    id: "mat-105",
    title: "Modul & Presentasi Fisika: Dinamika Rotasi & Kesetimbangan Benda Tegar",
    description: "Materi e-learning fisika SMA mencakup torsi, momen inersia, hukum kekekalan momentum sudut, dan simulasi kesetimbangan.",
    subject: "FISIKA",
    className: "XI-MIPA-3",
    type: "presentation",
    driveUrl: "https://drive.google.com/file/d/1k9B8xQzW0m4vE/preview",
    embedUrl: "https://drive.google.com/file/d/1k9B8xQzW0m4vE/preview",
    topic: "BAB 1: Dinamika Rotasi",
    bab: "BAB 1: Dinamika Rotasi & Kesetimbangan",
    subBab: "1.1 Momen Inersia & Torsi",
    createdAt: "2026-08-26",
    fileSize: "3.5 MB (Drive PDF/PPT)",
    tags: ["Fisika", "Momen Inersia", "Drive Storage"],
    notes: []
  }
];
