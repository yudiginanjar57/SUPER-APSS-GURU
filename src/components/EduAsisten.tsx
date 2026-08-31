import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { safeStorage } from "../lib/safeStorage";
import { 
  Bot, Send, Sparkles, BookOpen, Target, FileQuestion, ClipboardCheck, 
  Loader2, X, Download, Menu, Plus, MessageSquare, Edit2, Reply, Trash2, 
  ThumbsUp, ThumbsDown, Copy, Check, RefreshCw, User, UserCheck, Settings,
  Upload, FileUp, CheckSquare, ListChecks
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";

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
  "SD": ["1 (Fase A)", "2 (Fase A)", "3 (Fase B)", "4 (Fase B)", "5 (Fase C)", "6 (Fase C)"],
  "SMP": ["7 (Fase D)", "8 (Fase D)", "9 (Fase D)"],
  "SMA": ["10 (Fase E)", "11 (Fase F)", "12 (Fase F)"]
};

const DATA_MAPEL_UMUM = [
  "Pendidikan Agama dan Budi Pekerti",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "Matematika",
  "Ilmu Pengetahuan Alam (IPA)",
  "Ilmu Pengetahuan Sosial (IPS)",
  "Bahasa Inggris",
  "Pendidikan Jasmani, Olahraga, dan Kesehatan",
  "Informatika",
  "Seni Budaya"
];

const DATA_MAPEL_FASE_F = [
  "Pendidikan Agama dan Budi Pekerti",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "Matematika",
  "Bahasa Inggris",
  "Pendidikan Jasmani, Olahraga, dan Kesehatan",
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
  "Prakarya dan Kewirausahaan"
];

function getMapelList(kelas: string): string[] {
  if (kelas.includes("Fase F")) {
    return DATA_MAPEL_FASE_F;
  }
  return DATA_MAPEL_UMUM;
}

function getElemenList(mapel: string, kelas: string): string[] {
  const fase = kelas.includes("Fase F") ? "F" : kelas.includes("Fase E") ? "E" : "";

  if (mapel === "Matematika") {
    return ["Bilangan", "Aljabar dan Fungsi", "Pengukuran", "Geometri", "Analisis Data dan Peluang", "Kalkulus"];
  }
  if (mapel === "Bahasa Indonesia" || mapel === "Bahasa Inggris") {
    return ["Menyimak", "Membaca dan Memirsa", "Berbicara dan Mempresentasikan", "Menulis"];
  }
  if (["Fisika", "Kimia", "Biologi"].includes(mapel)) {
    return ["Pemahaman Sains", "Keterampilan Proses"];
  }
  if (mapel === "Ilmu Pengetahuan Alam (IPA)") {
    if (fase === "E") return ["Pemahaman Fisika", "Pemahaman Kimia", "Pemahaman Biologi", "Keterampilan Proses"];
    return ["Pemahaman Sains", "Keterampilan Proses"];
  }
  if (mapel === "Pendidikan Pancasila") {
    return ["Pancasila", "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945", "Bhinneka Tunggal Ika", "Negara Kesatuan Republik Indonesia"];
  }
  if (mapel === "Pendidikan Agama dan Budi Pekerti") {
    return ["Al-Qur'an dan Hadis", "Aqidah", "Akhlak", "Fiqih", "Sejarah Peradaban Islam"];
  }
  if (mapel === "Sejarah") return ["Pemahaman Konsep Sejarah", "Keterampilan Proses Sejarah"];
  if (mapel === "Sosiologi") return ["Pemahaman Konsep Sosiologi", "Keterampilan Proses Sosiologi"];
  if (mapel === "Ekonomi") return ["Pemahaman Konsep Ekonomi", "Keterampilan Proses Ekonomi"];
  if (mapel === "Geografi") return ["Pemahaman Konsep Geografi", "Keterampilan Proses Geografi"];
  if (mapel === "Antropologi") return ["Pemahaman Konsep Antropologi", "Keterampilan Proses Antropologi"];
  if (mapel === "Ilmu Pengetahuan Sosial (IPS)") {
    if (fase === "E") return ["Pemahaman Konsep Sejarah", "Pemahaman Konsep Geografi", "Pemahaman Konsep Ekonomi", "Pemahaman Konsep Sosiologi", "Keterampilan Proses"];
    return ["Pemahaman Konsep", "Keterampilan Proses"];
  }
  if (mapel === "Pendidikan Jasmani, Olahraga, dan Kesehatan") {
    return ["Keterampilan Gerak", "Pengetahuan Gerak", "Pemanfaatan Gerak", "Pengembangan Karakter"];
  }
  if (mapel === "Informatika") {
    return ["Berpikir Komputasional", "Teknologi Informasi dan Komunikasi", "Sistem Komputer", "Jaringan Komputer dan Internet", "Analisis Data", "Algoritma dan Pemrograman", "Dampak Sosial Informatika", "Praktik Lintas Bidang"];
  }
  if (mapel === "Seni Budaya") {
    return ["Mengalami", "Menciptakan", "Merefleksikan", "Berpikir dan Bekerja Artistik", "Berdampak"];
  }
  if (mapel === "Prakarya dan Kewirausahaan") {
    return ["Observasi dan Eksplorasi", "Desain/Perencanaan", "Produksi", "Refleksi dan Evaluasi"];
  }
  return ["Pemahaman Konsep", "Keterampilan Proses"];
}

function getMateriEsensial(mapel: string, kelas: string, elemen: string): string[] {
  const fase = kelas.includes("Fase F") ? "F" : kelas.includes("Fase E") ? "E" : "";

  if (mapel === "Matematika") {
    if (elemen === "Bilangan") return fase === "E" ? ["Eksponen dan Logaritma", "Barisan dan Deret (Aritmetika dan Geometri)"] : ["Matriks", "Bunga Majemuk dan Anuitas"];
    if (elemen === "Aljabar dan Fungsi") return fase === "E" ? ["Sistem Persamaan Linear Tiga Variabel (SPLTV)", "Fungsi Kuadrat"] : ["Fungsi Komposisi dan Invers", "Polinomial"];
    if (elemen === "Kalkulus") return ["Limit Fungsi Aljabar", "Turunan Fungsi Aljabar", "Integral Tak Tentu"];
    if (elemen === "Geometri") return fase === "E" ? ["Perbandingan Trigonometri"] : ["Transformasi Geometri", "Lingkaran"];
    if (elemen === "Analisis Data dan Peluang") return fase === "E" ? ["Statistika Dasar", "Peluang"] : ["Peluang Kejadian Majemuk", "Statistika Lanjut"];
  }
  if (mapel === "Bahasa Indonesia") {
    if (elemen === "Menyimak") return fase === "E" ? ["Menyimak Teks Laporan Hasil Observasi", "Menyimak Teks Anekdot"] : ["Menyimak Teks Argumentasi"];
    if (elemen === "Membaca dan Memirsa") return fase === "E" ? ["Membaca Hikayat", "Memirsa Teks Biografi"] : ["Membaca Teks Cerpen", "Membaca Resensi"];
    if (elemen === "Berbicara dan Mempresentasikan") return fase === "E" ? ["Mempresentasikan Teks Negosiasi", "Stand Up Comedy (Anekdot)"] : ["Mempresentasikan Karya Ilmiah"];
    if (elemen === "Menulis") return fase === "E" ? ["Menulis Teks Laporan Hasil Observasi", "Menulis Teks Negosiasi"] : ["Menulis Puisi", "Menulis Teks Drama"];
  }
  if (mapel === "Bahasa Inggris") {
    if (elemen === "Menyimak") return fase === "E" ? ["Listening: What to Do This Weekend?", "Listening: Descriptive Text"] : ["Listening: Analytical Exposition"];
    if (elemen === "Membaca dan Memirsa") return fase === "E" ? ["Reading: Narrative Text", "Reading: Recount Text"] : ["Reading: Explanation Text", "Reading: Discussion Text"];
    return fase === "E" ? ["Understanding Intentions", "Descriptive Text", "Narrative Text", "Recount Text"] : ["Analytical Exposition Text", "Explanation Text", "Discussion Text"];
  }
  if (mapel === "Biologi") {
    if (elemen === "Pemahaman Sains" || elemen === "Pemahaman Biologi" || elemen === "Pemahaman Konsep") {
      return fase === "E" ? ["Virus dan Peranannya (Apa itu Herd Immunity?)", "Keanekaragaman Hayati", "Perubahan Lingkungan"] : ["Sel", "Sistem Gerak", "Sistem Sirkulasi", "Sistem Pencernaan", "Pertumbuhan dan Perkembangan", "Pewarisan Sifat"];
    }
    return ["Merumuskan Pertanyaan Ilmiah", "Merancang Percobaan", "Analisis Data Percobaan Biologi"];
  }
  if (mapel === "Ilmu Pengetahuan Alam (IPA)") {
    if (elemen === "Pemahaman Fisika") return ["Pemanasan Global - Mengapa Suhu Semakin Panas?", "Pengukuran dalam Kerja Ilmiah", "Energi Alternatif / Terbarukan"];
    if (elemen === "Pemahaman Kimia") return ["Struktur Atom dan Aplikasinya", "Nanoteknologi", "Hukum Dasar Kimia"];
    if (elemen === "Pemahaman Biologi") return ["Virus dan Peranannya (Apa itu Herd Immunity?)", "Keanekaragaman Hayati", "Perubahan Lingkungan"];
    if (elemen === "Pemahaman Sains" || elemen === "Pemahaman Konsep") return ["Materi Sains Terpadu"];
    return ["Merumuskan Pertanyaan Ilmiah", "Merancang Percobaan", "Analisis Data Praktikum"];
  }
  if (mapel === "Fisika") {
    if (elemen === "Pemahaman Sains" || elemen === "Pemahaman Fisika" || elemen === "Pemahaman Konsep") {
      return fase === "E" ? ["Pemanasan Global - Mengapa Suhu Semakin Panas?", "Pengukuran dalam Kerja Ilmiah", "Energi Alternatif / Terbarukan"] : ["Kinematika Gerak", "Dinamika Gerak", "Fluida Statis dan Dinamis", "Suhu dan Kalor", "Gelombang", "Listrik Statis dan Dinamis"];
    }
    return ["Merancang Alat Ukur Sederhana", "Analisis Data Praktikum Fisika"];
  }
  if (mapel === "Kimia") {
    if (elemen === "Pemahaman Sains" || elemen === "Pemahaman Kimia" || elemen === "Pemahaman Konsep") {
      return fase === "E" ? ["Struktur Atom dan Aplikasinya", "Nanoteknologi", "Hukum Dasar Kimia"] : ["Laju Reaksi", "Kesetimbangan Kimia", "Senyawa Karbon", "Termokimia", "Asam dan Basa", "Elektrokimia"];
    }
    return ["Prosedur Keselamatan Laboratorium", "Praktikum Titrasi"];
  }
  if (mapel === "Sejarah") {
    if (elemen.includes("Pemahaman Konsep")) {
      return fase === "E" ? ["Pengantar Ilmu Sejarah", "Manusia, Ruang, dan Waktu", "Asal-usul Nenek Moyang Bangsa Indonesia", "Tokoh Sejarah - Siapa B.J. Habibie?"] : ["Pergerakan Nasional", "Proklamasi Kemerdekaan", "Demokrasi Terpimpin", "Orde Baru", "Reformasi"];
    }
    return ["Penelitian Sejarah", "Historiografi"];
  }
  if (mapel === "Sosiologi") {
    if (elemen.includes("Pemahaman Konsep")) {
      return fase === "E" ? ["Sosiologi sebagai Ilmu", "Identitas Sosial", "Tindakan Sosial", "Hubungan Sosial", "Lembaga Sosial"] : ["Kelompok Sosial", "Masalah Sosial", "Konflik dan Integrasi Sosial", "Mobilitas Sosial", "Perubahan Sosial", "Kearifan Lokal"];
    }
    return ["Penelitian Sosiologi", "Analisis Realitas Sosial"];
  }
  if (mapel === "Ekonomi") {
    if (elemen.includes("Pemahaman Konsep")) {
      return fase === "E" ? ["Kelangkaan dan Kebutuhan", "Skala Prioritas", "Keseimbangan Pasar", "Sistem Pembayaran dan Uang", "Lembaga Keuangan"] : ["Badan Usaha dalam Perekonomian", "Akuntansi Keuangan Dasar", "Pendapatan Nasional", "Ketenagakerjaan", "Kebijakan Moneter dan Fiskal", "Ekonomi Internasional"];
    }
    return ["Penelitian Ekonomi Sederhana", "Analisis Fenomena Ekonomi"];
  }
  if (mapel === "Geografi") {
    if (elemen.includes("Pemahaman Konsep")) {
      return fase === "E" ? ["Pengantar Geografi", "Peta, Penginderaan Jauh, dan SIG", "Fenomena Geosfer", "Dinamika Litosfer dan Pedosfer", "Dinamika Atmosfer"] : ["Posisi Strategis Indonesia", "Keanekaragaman Hayati", "Lingkungan dan Kependudukan", "Mitigasi Bencana", "Pengembangan Wilayah", "Interaksi Desa-Kota"];
    }
    return ["Penelitian Geografi", "Pemetaan dan SIG Terapan"];
  }
  if (mapel === "Antropologi") {
    if (elemen.includes("Pemahaman Konsep")) {
      return fase === "E" ? ["Pengantar Antropologi", "Konsep Dasar Antropologi", "Kebudayaan", "Sistem Kekerabatan"] : ["Etnografi", "Dinamika Budaya", "Keberagaman Budaya", "Antropologi Terapan"];
    }
    return ["Penelitian Etnografi", "Observasi Partisipatoris"];
  }
  if (mapel === "Ilmu Pengetahuan Sosial (IPS)") {
    if (elemen === "Pemahaman Konsep Sejarah") return ["Pengantar Ilmu Sejarah", "Manusia, Ruang, dan Waktu", "Asal-usul Nenek Moyang Bangsa Indonesia", "Tokoh Sejarah - Siapa B.J. Habibie?"];
    if (elemen === "Pemahaman Konsep Sosiologi") return ["Sosiologi sebagai Ilmu", "Identitas Sosial", "Tindakan Sosial", "Hubungan Sosial", "Lembaga Sosial"];
    if (elemen === "Pemahaman Konsep Ekonomi") return ["Kelangkaan dan Kebutuhan", "Skala Prioritas", "Keseimbangan Pasar", "Sistem Pembayaran dan Uang", "Lembaga Keuangan"];
    if (elemen === "Pemahaman Konsep Geografi") return ["Pengantar Geografi", "Peta, Penginderaan Jauh, dan SIG", "Fenomena Geosfer", "Dinamika Litosfer dan Pedosfer", "Dinamika Atmosfer"];
    if (elemen === "Pemahaman Konsep") return ["Pengantar IPS Terpadu", "Manusia, Ruang, dan Waktu", "Interaksi Sosial"];
    return ["Penelitian Sosial", "Analisis Data Sosial"];
  }
  if (mapel === "Pendidikan Pancasila") {
    if (elemen === "Pancasila") return fase === "E" ? ["Ideologi Pancasila", "Penerapan Pancasila dalam Kehidupan"] : ["Pancasila dalam Konteks Global"];
    if (elemen === "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945") return fase === "E" ? ["UUD NRI Tahun 1945"] : ["Hak dan Kewajiban Warga Negara"];
    if (elemen === "Bhinneka Tunggal Ika") return fase === "E" ? ["Gotong Royong", "Identitas Nasional"] : ["Penyelesaian Konflik"];
    if (elemen === "Negara Kesatuan Republik Indonesia") return fase === "E" ? ["Sistem Pertahanan dan Keamanan Negara"] : ["Peran Indonesia dalam Perdamaian Dunia"];
  }
  if (mapel === "Informatika") {
    if (elemen === "Berpikir Komputasional") return fase === "E" ? ["Logika Proposisi", "Sistem Bilangan"] : ["Strategi Algoritmik"];
    if (elemen === "Teknologi Informasi dan Komunikasi") return fase === "E" ? ["Aplikasi Perkantoran Lanjut"] : ["Integrasi Aplikasi"];
    if (elemen === "Sistem Komputer") return ["Perangkat Keras", "Sistem Operasi"];
    if (elemen === "Jaringan Komputer dan Internet") return ["Topologi Jaringan", "Keamanan Data"];
    if (elemen === "Analisis Data") return ["Pengumpulan Data", "Visualisasi Data"];
    if (elemen === "Algoritma dan Pemrograman") return ["Bahasa Pemrograman (C/Python)", "Fungsi dan Prosedur"];
    if (elemen === "Dampak Sosial Informatika") return ["Sejarah Komputer", "Etika Profesi IT"];
    if (elemen === "Praktik Lintas Bidang") return ["Proyek Kolaborasi IT"];
  }
  if (mapel === "Pendidikan Agama dan Budi Pekerti") {
    return fase === "E" ? ["Kajian Ayat Al-Qur'an", "Sejarah Peradaban Islam Masa Khulafaur Rasyidin"] : ["Hukum Fiqih Kontemporer", "Perkembangan Islam di Indonesia"];
  }
  if (mapel === "Pendidikan Jasmani, Olahraga, dan Kesehatan") {
    return fase === "E" ? ["Permainan Bola Besar/Kecil", "Senam Lantai"] : ["Strategi Permainan", "Kebugaran Jasmani"];
  }
  if (mapel === "Seni Budaya") {
    return fase === "E" ? ["Apresiasi Karya Seni", "Eksplorasi Ide"] : ["Penyajian Karya Seni", "Manajemen Pameran/Pertunjukan"];
  }
  if (mapel === "Prakarya dan Kewirausahaan") {
    if (elemen === "Observasi dan Eksplorasi") return fase === "E" ? ["Eksplorasi Ide dan Peluang Usaha"] : ["Analisis Kebutuhan Pasar"];
    if (elemen === "Desain/Perencanaan") return fase === "E" ? ["Perencanaan Usaha", "Desain Produk"] : ["Perencanaan Produksi Massal", "Business Plan"];
    if (elemen === "Produksi") return fase === "E" ? ["Proses Produksi Skala Kecil"] : ["Sistem Produksi", "Quality Control"];
    if (elemen === "Refleksi dan Evaluasi") return fase === "E" ? ["Evaluasi Produk", "Penghitungan HPP"] : ["Strategi Pemasaran", "Laporan Keuangan", "Evaluasi Hasil Usaha"];
    return fase === "E" ? ["Ide dan Peluang Usaha", "Perencanaan Usaha"] : ["Sistem Produksi", "Strategi Pemasaran"];
  }

  // Fallback
  return ["Materi Esensial Umum", "Pengenalan Konsep Dasar", "Penerapan Keterampilan"];
}

function getCP(mapel: string, kelas: string, elemen: string): string[] {
  const faseMatch = kelas.match(/Fase ([A-F])/);
  const fase = faseMatch ? `Fase ${faseMatch[1]}` : "";
  
  if (mapel === "Matematika" && fase === "Fase E") {
    if (elemen === "Bilangan") {
      return ["Di akhir fase E, peserta didik dapat menggeneralisasi sifat-sifat operasi bilangan berpangkat (eksponen) dan logaritma, serta menggunakan barisan dan deret (aritmetika dan geometri)."];
    }
    if (elemen === "Aljabar dan Fungsi") {
      return ["Di akhir fase E, peserta didik dapat menyelesaikan masalah yang berkaitan dengan sistem persamaan linear tiga variabel dan sistem pertidaksamaan linear dua variabel."];
    }
  }
  if (mapel === "Bahasa Indonesia" && fase === "Fase E") {
    if (elemen === "Menyimak") {
      return ["Di akhir fase E, peserta didik mampu mengevaluasi dan mengkreasi informasi berupa gagasan, pikiran, perasaan, pandangan, arahan atau pesan yang akurat dari menyimak berbagai tipe teks (nonfiksi dan fiksi) dalam bentuk monolog, dialog, dan gelar wicara."];
    }
    if (elemen === "Membaca dan Memirsa") {
       return ["Di akhir fase E, peserta didik mampu mengevaluasi informasi berupa gagasan, pikiran, pandangan, arahan atau pesan dari berbagai jenis teks, misalnya deskripsi, laporan, narasi, rekon, eksplanasi, eksposisi dan diskusi, dari teks visual dan audiovisual untuk menemukan makna yang tersurat dan tersirat."];
    }
  }
  
  return [
    `Capaian Pembelajaran ${mapel} - ${fase} - Elemen ${elemen}: Peserta didik mampu menguasai kompetensi dasar dan keterampilan yang diharapkan pada elemen ini sesuai dengan standar Kurikulum Merdeka.`
  ];
}

export default function EduAsisten() {
  const defaultMessage = {
    id: "welcome-msg",
    role: "assistant" as const,
    content: "Halo! Saya **EduAsisten**, sistem AI ahli dalam Pedagogi dan Administrasi Pendidikan Kurikulum Merdeka.\n\nSaya siap membantu Bapak/Ibu Guru menyusun Modul Ajar (Pendekatan 8-3-3-4), menganalisis CP/TP/ATP, membuat soal (Taksonomi Bloom C1-C6), dan menyusun rubrik penilaian. Silakan pilih menu cepat di bawah atau ketikkan kebutuhan Anda."
  };

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    return safeStorage.getJSON<ChatSession[]>("eduasisten_sessions", []);
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([defaultMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; role: "user" | "assistant"; content: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRevisionMenu, setShowRevisionMenu] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync to local storage safely
  useEffect(() => {
    safeStorage.setItem("eduasisten_sessions", sessions);
  }, [sessions]);

  // Load session
  useEffect(() => {
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) setMessages(session.messages);
    } else {
      setMessages([defaultMessage]);
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

  // User Profile State (Sekolah, Guru, TTD Kepala Sekolah)
  const [userProfile, setUserProfile] = useState<{
    namaSekolah: string;
    namaPenyusun: string;
    nipPenyusun: string;
    namaKepsek: string;
    nipKepsek: string;
  }>(() => {
    return safeStorage.getJSON("eduasisten_profile", {
      namaSekolah: "SMAN 1 Jakarta",
      namaPenyusun: "Guru Penggerak, S.Pd.",
      nipPenyusun: "19850101 201001 1 001",
      namaKepsek: "Dr. H. Kepala Sekolah, M.Pd.",
      nipKepsek: "19720315 199802 1 002"
    });
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    safeStorage.setItem("eduasisten_profile", userProfile);
  }, [userProfile]);

  // Modal State for Perangkat Pembelajaran
  const [isPerangkatModalOpen, setIsPerangkatModalOpen] = useState(false);
  const [perangkatForm, setPerangkatForm] = useState({
    jenis: "Modul Ajar",
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    mapel: "Matematika",
    elemen: getElemenList("Matematika", "10 (Fase E)")[0],
    cp: getCP("Matematika", "10 (Fase E)", getElemenList("Matematika", "10 (Fase E)")[0])[0],
    materi: "",
    namaSekolah: "",
    namaPenyusun: "",
    nipPenyusun: "",
    tahunPelajaran: "2024/2025",
    instruksiTambahan: ""
  });

  // Modal State for Generator Soal
  const [isSoalModalOpen, setIsSoalModalOpen] = useState(false);
  const [soalForm, setSoalForm] = useState({
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    mapel: "Matematika",
    materi: "",
    tingkatKesulitan: ["HOTS"],
    levelKognitif: ["C4 (Menganalisis)", "C5 (Mengevaluasi)", "C6 (Mencipta)"],
    jenisStimulus: "Narasi / Teks Bacaan",
    keteranganStimulus: "",
    bentukSoal: ["Pilihan Ganda (PG)", "Uraian / Esai"],
    jumlahSoal: "5",
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
    const newMapelList = getMapelList(newKelas);
    setSoalForm(prev => ({
      ...prev,
      jenjang,
      kelas: newKelas,
      mapel: newMapelList.includes(prev.mapel) ? prev.mapel : newMapelList[0]
    }));
  };

  const handleSoalKelasChange = (kelas: string) => {
    const newMapelList = getMapelList(kelas);
    setSoalForm(prev => ({
      ...prev,
      kelas,
      mapel: newMapelList.includes(prev.mapel) ? prev.mapel : newMapelList[0]
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
    const newMapelList = getMapelList(newKelas);
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
    const newMapelList = getMapelList(kelas);
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

  const handleSubmit = async (e?: React.FormEvent, customInput?: string) => {
    e?.preventDefault();
    const promptText = customInput || input;
    if (!promptText.trim() || isLoading) return;

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
      content: promptText.trim(),
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
        body: JSON.stringify({ prompt: finalPrompt })
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
        nipPenyusun: prev.nipPenyusun || userProfile.nipPenyusun
      }));
      setIsPerangkatModalOpen(true);
    } else if (actionId === "cptp") {
      setPerangkatForm(prev => ({ 
        ...prev, 
        jenis: "Analisis CP & ATP",
        namaSekolah: prev.namaSekolah || userProfile.namaSekolah,
        namaPenyusun: prev.namaPenyusun || userProfile.namaPenyusun,
        nipPenyusun: prev.nipPenyusun || userProfile.nipPenyusun
      }));
      setIsPerangkatModalOpen(true);
    } else if (actionId === "soal") {
      setIsSoalModalOpen(true);
    } else if (actionId === "penilaian") {
      setIsPenilaianModalOpen(true);
    } else {
      setInput(prompt);
    }
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

    const tingkatStr = soalForm.tingkatKesulitan.length > 0 ? soalForm.tingkatKesulitan.join(", ") : "HOTS";
    const levelStr = soalForm.levelKognitif.length > 0 ? soalForm.levelKognitif.join(", ") : "C4, C5, C6";
    const bentukStr = soalForm.bentukSoal.length > 0 ? soalForm.bentukSoal.join(", ") : "Pilihan Ganda, Uraian";

    const prompt = `Tolong buatkan paket soal pembelajaran komprehensif menggunakan **Generator Soal** dengan spesifikasi dan struktur dokumen sebagai berikut:

**SPESIFIKASI DOKUMEN SOAL:**
- **Jenjang & Kelas**: ${soalForm.jenjang} / ${soalForm.kelas}
- **Mata Pelajaran**: ${soalForm.mapel}
- **Topik / Materi Pokok**: ${soalForm.materi || "[Sesuaikan dengan Kurikulum Fase ini]"}
- **Tingkat Kesulitan**: ${tingkatStr}
- **Level Kognitif Bloom**: ${levelStr}
- **Bentuk Soal**: ${bentukStr}
- **Jumlah Soal**: ${soalForm.jumlahSoal || "5"} butir soal

**STIMULUS SOAL:**
- **Jenis Stimulus**: ${soalForm.jenisStimulus}
${soalForm.keteranganStimulus ? `- **Keterangan / Detil Stimulus**: ${soalForm.keteranganStimulus}` : ""}

${soalForm.instruksiTambahan ? `**INSTRUKSI TAMBAHAN GURU:**\n${soalForm.instruksiTambahan}\n` : ""}

**PETUNJUK FORMAT DAN STRUKTUR DOKUMEN (SANGAT WAJIB & STRICT):**
1. **Bagian A. Header Identitas**: Sajikan tabel Markdown identitas (Mata Pelajaran, Kelas/Fase, Topik, Bentuk, Jumlah, Tingkat) & Callout Box Petunjuk Pengerjaan di paling awal.
2. **Bagian B. Naskah Soal**: Format setiap nomor soal secara konsisten dan terpisah rapi:
   ### 📝 SOAL NO. X
   \`[Bentuk: ${bentukStr} | Level: ${levelStr}]\`
3. **Format Stimulus**:
   - Jika Grafik/Chart SVG: Tuliskan tag <svg> secara mentah di luar codeblock, dan sertakan Tabel Data Markdown pendukung di bawahnya.
   - Jika Tabel Data: Tuliskan Tabel Markdown terstruktur rapi dengan garis border dan header kolom yang jelas.
   - Jika Narasi/Kasus: Sajikan dalam Callout Box (\`> **📌 STIMULUS BACAAN**\`).
4. **Format Pilihan Jawaban**:
   - Untuk Pilihan Ganda: Tuliskan opsi A, B, C, D (E untuk SMA) secara vertikal dengan format tebal \`- **A.** [Teks Opsi]\`.
   - Untuk Pilihan Ganda Kompleks / Benar-Salah: Gunakan Tabel Markdown yang rapi dengan kolom nomor, pernyataan, dan centang/pilihan.
5. **Format Matematika/Sains**: WAJIB gunakan notasi LaTeX KaTeX (\$f(x) = ax^2 + bx + c\$ atau \$\$\\frac{a}{b}\$\$) secara konsisten.
6. **Bagian C. Kunci Jawaban & Pembahasan Detail**:
   - **Tabel Ringkasan Kunci Jawaban** (No | Bentuk Soal | Level Kognitif | Kunci Jawaban | Skor Maksimal)
   - **Pembahasan Detail Langkah demi Langkah** per nomor soal beserta Rubrik Penskoran.
`;

    setIsSoalModalOpen(false);
    handleSubmit(undefined, prompt);
  };

  const handlePerangkatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let prompt = "";
    if (perangkatForm.jenis === "Modul Ajar") {
      const namaSekolahFinal = perangkatForm.namaSekolah || userProfile.namaSekolah || "[Nama Sekolah]";
      const namaPenyusunFinal = perangkatForm.namaPenyusun || userProfile.namaPenyusun || "[Nama Penyusun]";
      const nipPenyusunFinal = perangkatForm.nipPenyusun || userProfile.nipPenyusun || "[NIP Penyusun]";
      const namaKepsekFinal = userProfile.namaKepsek || "[Nama Kepala Sekolah]";
      const nipKepsekFinal = userProfile.nipKepsek || "[NIP Kepala Sekolah]";

      prompt = `Tolong buatkan Modul Ajar / RPPM dengan pendekatan 8-3-3-4 untuk:
- Jenjang: ${perangkatForm.jenjang}
- Kelas: ${perangkatForm.kelas}
- Mata Pelajaran: ${perangkatForm.mapel}
- Elemen: ${perangkatForm.elemen}
- Capaian Pembelajaran: ${perangkatForm.cp}
- Materi Pokok: ${perangkatForm.materi || "Sesuaikan dengan CP di atas"}

Mohon gunakan format persis seperti struktur terstandar dan rapi berikut:

**MODUL AJAR DEEP LEARNING**
**MATA PELAJARAN : ${perangkatForm.mapel}**
**BAB [NOMOR BAB]: ${perangkatForm.materi || "[TOPIK MATERI]"}**

**A. IDENTITAS MODUL**
| Komponen Identitas | Keterangan Modul Ajar |
| :--- | :--- |
| **Nama Sekolah** | ${namaSekolahFinal} |
| **Nama Penyusun** | ${namaPenyusunFinal}${nipPenyusunFinal ? ` (NIP: ${nipPenyusunFinal})` : ""} |
| **Mata Pelajaran** | ${perangkatForm.mapel} |
| **Fase / Kelas / Semester** | ${perangkatForm.kelas} / [Semester] |
| **Alokasi Waktu** | [Alokasi Waktu, misal: 12 JP (6 Pertemuan x 2 JP @45 menit)] |
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

<table style="width: 100%; text-align: center; border: none; margin-top: 40px;">
  <tr>
    <td style="width: 50%;">Mengetahui,<br><b>Kepala Sekolah</b></td>
    <td style="width: 50%;">.................., ....................<br><b>Guru Mata Pelajaran</b></td>
  </tr>
  <tr>
    <td style="height: 70px;"></td>
    <td></td>
  </tr>
  <tr>
    <td><b>${namaKepsekFinal}</b><br>NIP. ${nipKepsekFinal}</td>
    <td><b>${namaPenyusunFinal}</b><br>NIP. ${nipPenyusunFinal}</td>
  </tr>
</table>

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
    
    setIsPerangkatModalOpen(false);
    handleSubmit(undefined, prompt);
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

    // 6. Convert LaTeX math delimiters \[ ... \] and \( ... \)
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, "\n\n$$$$1$$$$\n\n");
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, " $$$1$ ");

    return text;
  };

  const exportToWord = (contentHtml: string) => {
    let processedHtml = contentHtml.replace(/●/g, "&bull; ");

    const style = `<style>
      @page {
        size: A4 portrait;
        margin: 2.5cm 2cm 2.5cm 2cm;
      }
      body {
        font-family: 'Calibri', 'Arial', sans-serif;
        font-size: 11pt;
        color: #0f172a;
        line-height: 1.6;
      }
      p {
        margin-top: 0;
        margin-bottom: 8pt;
        line-height: 1.5;
        text-align: justify;
      }
      h1, h2, h3, h4, h5 {
        font-family: 'Calibri', 'Arial', sans-serif;
        color: #1e3a8a;
        font-weight: bold;
        margin-top: 14pt;
        margin-bottom: 6pt;
        page-break-after: avoid;
      }
      h1 { font-size: 16pt; border-bottom: 2pt solid #2563eb; padding-bottom: 4pt; }
      h2 { font-size: 13pt; color: #1e40af; border-bottom: 1pt solid #cbd5e1; padding-bottom: 2pt; }
      h3 { font-size: 11.5pt; color: #1e3a8a; }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 12pt 0;
        font-size: 10pt;
        page-break-inside: avoid;
      }
      th, td {
        border: 1pt solid #475569;
        padding: 6pt 9pt;
        text-align: left;
        vertical-align: top;
      }
      th {
        background-color: #e2e8f0;
        font-weight: bold;
        color: #0f172a;
      }
      tr:nth-child(even) td {
        background-color: #f8fafc;
      }
      ul, ol {
        margin-top: 4pt;
        margin-bottom: 8pt;
        padding-left: 18pt;
      }
      li {
        margin-bottom: 4pt;
        line-height: 1.5;
        text-align: left;
      }
      blockquote {
        border-left: 4pt solid #2563eb;
        background-color: #eff6ff;
        color: #1e3a8a;
        padding: 8pt 12pt;
        margin: 10pt 0;
        font-style: italic;
      }
      strong, b {
        color: #0f172a;
      }
      hr {
        border: none;
        border-top: 1pt solid #cbd5e1;
        margin: 14pt 0;
      }
    </style>`;

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'>${style}<title>Dokumen Modul Ajar EduAsisten</title></head><body>`;
    const footer = "</body></html>";
    const sourceHTML = header + processedHtml + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = 'Dokumen_Modul_Ajar_EduAsisten.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
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
    }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-140px)] w-full bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden relative">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-4 flex items-center justify-between shrink-0 z-50 relative">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors relative"
            title="Riwayat Percakapan"
          >
            <Menu size={22} />
            {sessions.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-indigo-600" />
            )}
          </button>
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Bot size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-extrabold font-display flex items-center gap-2">
              EduAsisten <Sparkles size={14} className="text-amber-300" />
            </h2>
            <p className="text-[11px] font-medium text-indigo-100 opacity-90">
              Ahli Pedagogi & Administrasi Kurikulum Merdeka
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline">Riwayat</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">{sessions.length}</span>
            </button>
          )}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5 shadow-xs"
            title="Profil Guru & TTD Kepala Sekolah"
          >
            <User size={14} />
            <span>Profil Guru</span>
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

                <div className="p-3">
                  <button 
                    onClick={handleNewChat}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Percakapan Baru
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
                      <div id={`markdown-${msg.id}`} className="markdown-body text-sm prose prose-sm prose-slate max-w-none 
                        prose-headings:font-bold prose-headings:text-slate-800 
                        prose-p:leading-relaxed prose-a:text-indigo-600
                        prose-strong:text-slate-800 prose-ul:list-disc prose-ol:list-decimal">
                        <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, rehypeKatex]}>{processMarkdownContent(msg.content)}</Markdown>
                      </div>

                      {/* Assistant Message Actions Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button 
                            onClick={() => {
                              const el = document.getElementById(`markdown-${msg.id}`);
                              if (el) exportToWord(el.innerHTML);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                          >
                            <Download size={13} />
                            Word
                          </button>

                          <button 
                            onClick={() => handleReplyMessage(msg)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors"
                          >
                            <Reply size={13} />
                            Balas
                          </button>

                          <button 
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                            title="Salin pesan"
                          >
                            {copiedId === msg.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            {copiedId === msg.id ? "Tersalin!" : "Salin"}
                          </button>

                          {/* Revision Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setShowRevisionMenu(showRevisionMenu === msg.id ? null : msg.id)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg transition-colors"
                            >
                              <RefreshCw size={13} />
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

        <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar">
          {quickActions.map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.id, action.prompt)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-colors ${action.color}`}
            >
              <action.icon size={14} />
              {action.title}
            </button>
          ))}
        </div>
        
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
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
        <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
          EduAsisten dapat membuat kesalahan. Harap tinjau kembali modul ajar atau soal yang dihasilkan.
        </p>
      </div>
      </div>
      </div>

      {/* Perangkat Pembelajaran Modal */}
      {isPerangkatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-full"
          >
            <div className="bg-indigo-600 px-5 py-4 flex items-center justify-between">
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
            <div className="p-5 overflow-y-auto">
              <form id="perangkat-form" onSubmit={handlePerangkatSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Jenis Perangkat</label>
                  <select
                    value={perangkatForm.jenis}
                    onChange={(e) => setPerangkatForm({...perangkatForm, jenis: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-indigo-700"
                  >
                    <option value="Modul Ajar">Modul Ajar / RPPM</option>
                    <option value="Analisis CP & ATP">Analisis CP, TP, dan ATP</option>
                  </select>
                </div>
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
                      {getMapelList(perangkatForm.kelas).map(m => (
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
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Capaian Pembelajaran (CP)</label>
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

                {perangkatForm.jenis === "Modul Ajar" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Materi Pokok / Esensial</label>
                    <input
                      type="text"
                      list="materi-options"
                      placeholder="Pilih atau masukkan materi pokok..."
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
                )}

                {perangkatForm.jenis === "Modul Ajar" && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800">Identitas Modul & Instruksi</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nama Sekolah</label>
                        <input
                          type="text"
                          placeholder="Contoh: SMAN 1 Jakarta"
                          value={perangkatForm.namaSekolah}
                          onChange={(e) => setPerangkatForm({...perangkatForm, namaSekolah: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Tahun Pelajaran</label>
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
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nama Penyusun</label>
                        <input
                          type="text"
                          placeholder="Nama Guru"
                          value={perangkatForm.namaPenyusun}
                          onChange={(e) => setPerangkatForm({...perangkatForm, namaPenyusun: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">NIP Penyusun</label>
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
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Instruksi Tambahan (Opsional)</label>
                      <textarea
                        placeholder="Contoh: Fokuskan pada metode diskusi kelompok untuk materi ini..."
                        value={perangkatForm.instruksiTambahan}
                        onChange={(e) => setPerangkatForm({...perangkatForm, instruksiTambahan: e.target.value})}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
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
            <div className="bg-amber-600 px-5 py-4 flex items-center justify-between shrink-0">
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

            <div className="p-5 overflow-y-auto space-y-4">
              <form id="soal-form" onSubmit={handleSoalSubmit} className="space-y-4">
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
                      {getMapelList(soalForm.kelas).map(m => (
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
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Pemberian Stimulus Soal</label>
                    <select
                      value={soalForm.jenisStimulus}
                      onChange={(e) => setSoalForm({...soalForm, jenisStimulus: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-amber-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      <option value="Narasi / Teks Bacaan">📝 Narasi / Teks Bacaan</option>
                      <option value="Gambar / Ilustrasi / Diagram">🖼️ Gambar / Ilustrasi / Diagram</option>
                      <option value="Tabel Data">📊 Tabel Data</option>
                      <option value="Grafik / Kurva Diagram">📈 Grafik / Diagram</option>
                      <option value="Data Lainnya (Infografis, Kasus, Kode/Formula)">📂 Data Lainnya (Infografis, Kasus, Kode)</option>
                      <option value="Tanpa Stimulus">🚫 Tanpa Stimulus (Langsung Soal)</option>
                    </select>
                  </div>

                  {soalForm.jenisStimulus !== "Tanpa Stimulus" && (
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
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setPenilaianForm({
                              ...penilaianForm,
                              fileBase64: reader.result as string,
                              fileMimeType: file.type || "application/pdf",
                              fileName: file.name
                            });
                          };
                          reader.readAsDataURL(file);
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
