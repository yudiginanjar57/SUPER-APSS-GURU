import React, { useState, useRef, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Lightbulb, Sparkles, Upload, FileText, Image as ImageIcon, 
  FileCheck, CheckCircle2, AlertCircle, Trash2, ArrowRight, 
  HelpCircle, Zap, BookOpen, Layers, CheckSquare, Eye, RefreshCw
} from "lucide-react";
import * as mammoth from "mammoth";
import { compressFileForOCR } from "../lib/imageUtils";

interface PembahasanSoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, fileData?: { base64: string; mimeType: string; name: string }) => void;
  defaultJenjang?: string;
  defaultKelas?: string;
  defaultMapel?: string;
}

const DATA_JENJANG = {
  "SD": ["1-2 (Fase A)", "3-4 (Fase B)", "5-6 (Fase C)"],
  "SMP": ["7-9 (Fase D)"],
  "SMA": ["10 (Fase E)", "11 (Fase F)", "12 (Fase F)"],
  "SMK": ["10 (Fase E)", "11 (Fase F)", "12 (Fase F)"]
};

const DATA_MAPEL_UMUM = [
  "Matematika",
  "Fisika",
  "Kimia",
  "Biologi",
  "Ekonomi",
  "Sosiologi",
  "Geografi",
  "Sejarah",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Pendidikan Pancasila",
  "Informatika",
  "Ilmu Pengetahuan Alam (IPA)",
  "Ilmu Pengetahuan Sosial (IPS)",
  "Pendidikan Agama dan Budi Pekerti"
];

const CONTOH_SOAL: Record<string, { label: string; mapel: string; jenjang: string; kelas: string; text: string }> = {
  matematika: {
    label: "Matematika SMA (Persamaan Kuadrat & Fungsi)",
    mapel: "Matematika",
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    text: `Diketahui fungsi kuadrat f(x) = 2x² - 4x - 6.
Tentukan:
a. Titik potong grafik dengan sumbu-X dan sumbu-Y.
b. Koordinat titik puncak (ekstrim) dan jenisnya.
c. Nilai f(3) dan f(-1).
d. Jika garis y = 2x + k menyinggung grafik f(x), tentukan nilai konstanta k.`
  },
  fisika: {
    label: "Fisika SMA (Dinamika Gerak & Hukum Newton)",
    mapel: "Fisika",
    jenjang: "SMA",
    kelas: "10 (Fase E)",
    text: `Sebuah balok bermassa 5 kg ditarik dengan gaya F = 50 N yang membentuk sudut 37° terhadap bidang horizontal kasar (sin 37° = 0,6; cos 37° = 0,8). Koefisien gesek kinetis antara balok dan lantai adalah 0,2 (g = 10 m/s²).
Pertanyaan:
1. Berapakah besar gaya normal yang bekerja pada balok?
2. Berapakah besar gaya gesek kinetik yang dialami balok?
3. Hitunglah percepatan gerak balok tersebut!`
  },
  ekonomi: {
    label: "Ekonomi SMA (Pajak Bumi & Bangunan - HOTS)",
    mapel: "Ekonomi",
    jenjang: "SMA",
    kelas: "11 (Fase F)",
    text: `Tuan Danu memiliki dua objek pajak bumi dan bangunan di kota Bandung:
1. Rumah tinggal: Luas tanah 400 m² (NJOP Rp2.000.000/m²) dan luas bangunan 200 m² (NJOP Rp1.500.000/m²).
2. Ruko usaha: Luas tanah 200 m² (NJOP Rp3.000.000/m²) dan luas bangunan 150 m² (NJOP Rp2.000.000/m²).
Pemerintah menetapkan NJOPTKP sebesar Rp12.000.000,00 dan NJKP: 40% (NJOP >= 1 Miliar), 20% (NJOP < 1 Miliar). Tarif PBB adalah 0,5%.
Hitunglah:
a. NJOP masing-masing properti.
b. PBB terutang untuk Properti 1 dan Properti 2.
c. Total PBB terutang yang harus dibayar Tuan Danu.`
  },
  biologi: {
    label: "Biologi SMA (Genetika & Hukum Mendel)",
    mapel: "Biologi",
    jenjang: "SMA",
    kelas: "12 (Fase F)",
    text: `Pada tanaman kacang ercis, alel biji bulat (B) dominan terhadap biji kisut (b), dan alel warna kuning (K) dominan terhadap hijau (k).
Jika tanaman galur murni biji bulat kuning (BBKK) disilangkan dengan tanaman biji kisut hijau (bbkk), menghasilkan F1. Kemudian F1 disilangkan sesamanya menghasilkan 320 tanaman F2.
Pertanyaan:
a. Buatlah bagan persilangan hingga generasi F2.
b. Berapakah rasio fenotipe F2?
c. Berapakah perkiraan jumlah tanaman F2 yang berfenotipe biji bulat hijau?
d. Mengapa sifat biji bulat dan kuning dapat memisah secara bebas menurut Hukum Mendel II?`
  }
};

export default function PembahasanSoalModal({
  isOpen,
  onClose,
  onSubmit,
  defaultJenjang = "SMA",
  defaultKelas = "10 (Fase E)",
  defaultMapel = "Matematika"
}: PembahasanSoalModalProps) {
  // Main Tab: 'ai_langsung' | 'dari_sumber'
  const [activeTab, setActiveTab] = useState<'ai_langsung' | 'dari_sumber'>('ai_langsung');

  // Sub Tab for 'ai_langsung': 'input_sendiri' | 'generate_baru'
  const [aiSubTab, setAiSubTab] = useState<'input_sendiri' | 'generate_baru'>('input_sendiri');

  // Form State: AI Langsung - Input Sendiri
  const [inputJenjang, setInputJenjang] = useState(defaultJenjang);
  const [inputKelas, setInputKelas] = useState(defaultKelas);
  const [inputMapel, setInputMapel] = useState(defaultMapel);
  const [soalText, setSoalText] = useState("");
  const [fokusFitur, setFokusFitur] = useState({
    stepByStep: true,
    rumusKaTeX: true,
    distractorAnalysis: true,
    smartSolution: true,
    miskonsepsi: true
  });
  const [instruksiAI, setInstruksiAI] = useState("");

  // Form State: AI Langsung - Generate Baru
  const [genTopik, setGenTopik] = useState("");
  const [genKesulitan, setGenKesulitan] = useState("HOTS");
  const [genBentuk, setGenBentuk] = useState("Pilihan Ganda (PG) & Uraian");
  const [genJumlah, setGenJumlah] = useState("3");

  // Form State: Dari Sumber Dokumen / Foto
  const [fileData, setFileData] = useState<{
    file: File | null;
    name: string;
    sizeFormatted: string;
    type: 'image' | 'pdf' | 'docx' | 'txt' | 'other';
    base64: string;
    mimeType: string;
    extractedText?: string;
  } | null>(null);

  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [cakupanSoal, setCakupanSoal] = useState<'semua' | 'tertentu'>('semua');
  const [nomorSoalTertentu, setNomorSoalTertentu] = useState("");
  const [kedalamanSumber, setKedalamanSumber] = useState<'sangat_detail' | 'standar' | 'ringkas'>('sangat_detail');
  const [instruksiSumber, setInstruksiSumber] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleJenjangChange = (newJenjang: string) => {
    setInputJenjang(newJenjang);
    const kelasOptions = DATA_JENJANG[newJenjang as keyof typeof DATA_JENJANG] || ["10 (Fase E)"];
    setInputKelas(kelasOptions[0]);
  };

  const handleProcessFile = async (file: File) => {
    setIsProcessingFile(true);
    setFileError(null);

    const name = file.name;
    const lowerName = name.toLowerCase();
    const sizeKB = (file.size / 1024).toFixed(1);
    const sizeFormatted = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
      : `${sizeKB} KB`;

    try {
      if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
        // Process Word document via mammoth
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const extracted = result.value.trim();

        if (!extracted) {
          throw new Error("Dokumen Word tidak memiliki teks atau kosong.");
        }

        setFileData({
          file,
          name,
          sizeFormatted,
          type: 'docx',
          base64: "",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          extractedText: extracted
        });
      } else if (lowerName.endsWith(".txt")) {
        // Text file
        const text = await file.text();
        setFileData({
          file,
          name,
          sizeFormatted,
          type: 'txt',
          base64: "",
          mimeType: "text/plain",
          extractedText: text
        });
      } else if (lowerName.endsWith(".pdf")) {
        // PDF file for Gemini multimodal
        const dataUrl = await compressFileForOCR(file);
        setFileData({
          file,
          name,
          sizeFormatted,
          type: 'pdf',
          base64: dataUrl,
          mimeType: "application/pdf"
        });
      } else if (/\.(png|jpe?g|webp|heic)$/i.test(lowerName) || file.type.startsWith("image/")) {
        // Image / Photo
        const dataUrl = await compressFileForOCR(file, 1800, 0.85);
        setFileData({
          file,
          name,
          sizeFormatted,
          type: 'image',
          base64: dataUrl,
          mimeType: file.type || "image/jpeg"
        });
      } else {
        throw new Error("Format file belum didukung. Harap gunakan Foto (JPG, PNG), PDF, atau Word (.docx).");
      }
    } catch (err: any) {
      console.error("Gagal memproses file:", err);
      setFileError(err.message || "Gagal memproses file.");
      setFileData(null);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleLoadContoh = (key: string) => {
    const contoh = CONTOH_SOAL[key];
    if (!contoh) return;
    setInputJenjang(contoh.jenjang);
    setInputKelas(contoh.kelas);
    setInputMapel(contoh.mapel);
    setSoalText(contoh.text);
  };

  const handleSubmitModal = () => {
    if (activeTab === 'ai_langsung') {
      if (aiSubTab === 'input_sendiri') {
        if (!soalText.trim()) {
          alert("Silakan ketik atau tempelkan naskah soal yang ingin dibahas.");
          return;
        }

        const prompt = `Tolong buatkan **PEMBAHASAN SOAL LENGKAP, TERSTRUKTUR & MENDALAM** untuk soal berikut:

### 📋 IDENTITAS PEMBELAJARAN
- **Jenjang**: ${inputJenjang}
- **Kelas / Fase**: ${inputKelas}
- **Mata Pelajaran**: ${inputMapel}

---

### 📝 NASKAH SOAL YANG AKAN DIBAHAS:
${soalText.trim()}

---

### 🎯 PANDUAN PENYUSUNAN PEMBAHASAN:
1. **Identitas & Kunci Jawaban Singkat**:
   - Tuliskan nomor dan bentuk soal secara rapi.
   - Cantumkan **Kunci Jawaban Singkat** yang tegas dan jelas di awal.
2. ${fokusFitur.stepByStep ? "- **Langkah demi Langkah (Step-by-Step)**: Uraikan pembuktian, penalaran logis, dan tahapan solusi yang sistematis dan mudah dipahami siswa." : ""}
3. ${fokusFitur.rumusKaTeX ? "- **Notasi Rumus Matematika / Sains KaTeX**: Tuliskan semua persamaan, pecahan, indeks, akar, atau fungsi menggunakan LaTeX KaTeX standar ($...$ inline, dan $$...$$ pada baris baru terpisah)." : ""}
4. ${fokusFitur.distractorAnalysis ? "- **Analisis Pilihan Jawaban (Distractor Analysis)**: Jika soal berbentuk pilihan ganda, jelaskan mengapa opsi yang benar adalah tepat dan mengapa opsi lainnya salah (miskonsepsi siswa)." : ""}
5. ${fokusFitur.smartSolution ? "- **Trik Cepat / Smart Solution**: Berikan metode kilat atau tips cara cerdas menyelesaikan tipe soal ini dengan cepat saat ujian." : ""}
6. ${fokusFitur.miskonsepsi ? "- **Catatan Miskonsepsi & Tips Pedagogis**: Berikan catatan khusus mengenai kesalahan umum yang sering dilakukan siswa." : ""}
7. **DILARANG MENGGUNAKAN KATA PENGANTAR**: JANGAN tulis kalimat seperti "Berikut adalah...", "Tentu...", dll. LANGSUNG MULAI baris pertama dokumen dari Judul Pembahasan.

${instruksiAI ? `\n**INSTRUKSI TAMBAHAN GURU:**\n${instruksiAI}\n` : ""}`;

        onSubmit(prompt);
        onClose();
      } else {
        // generate_baru
        if (!genTopik.trim()) {
          alert("Silakan masukkan topik atau materi soal yang ingin dibuat pembahasannya.");
          return;
        }

        const prompt = `Tolong buatkan **${genJumlah} BUTIR SOAL + PEMBAHASAN MENDALAM LANGKAH DEMI LANGKAH** dengan spesifikasi:

- **Jenjang**: ${inputJenjang}
- **Kelas / Fase**: ${inputKelas}
- **Mata Pelajaran**: ${inputMapel}
- **Topik / Materi Pokok**: ${genTopik.trim()}
- **Tingkat Kesulitan**: ${genKesulitan} (Sesuai Taksonomi Bloom)
- **Bentuk Soal**: ${genBentuk}
- **Jumlah Soal**: ${genJumlah} Butir

### FORMAT PEMBAHASAN SOAL YANG HARUS DISAJIKAN:
Untuk setiap nomor soal:
1. **Tampilkan Naskah Soal Lengkap** (dengan stimulus konteks nyata dan opsi pilihan ganda A s.d. E jika PG).
2. **Kunci Jawaban Singkat** (Jelas dan tebal).
3. **Konsep Dasar & Rumus Kunci** (Gunakan notasi LaTeX KaTeX untuk semua rumus dan simbol).
4. **Pembahasan Langkah demi Langkah** (Logis, runut, dan edukatif).
5. **Analisis Pengecoh (Distractor Analysis)** (Mengapa opsi lain salah).
6. **Trik Cepat / Tips Ujian** (Jika ada).

Di bagian akhir, sajikan **Tabel Ringkasan Kunci Jawaban**.

${instruksiAI ? `\n**INSTRUKSI TAMBAHAN GURU:**\n${instruksiAI}\n` : ""}`;

        onSubmit(prompt);
        onClose();
      }
    } else {
      // dari_sumber
      if (!fileData) {
        alert("Silakan unggah dokumen soal (Foto, PDF, atau Word) terlebih dahulu.");
        return;
      }

      let cakupanText = "Bahas seluruh soal yang ada pada dokumen/foto ini secara lengkap.";
      if (cakupanSoal === 'tertentu' && nomorSoalTertentu.trim()) {
        cakupanText = `Hanya bahas nomor soal berikut: **${nomorSoalTertentu.trim()}**. Soal di luar nomor tersebut tidak perlu dibahas secara penuh.`;
      }

      let kedalamanText = "Sangat detail, komprehensif, mencakup konsep teori dasar, rumus KaTeX, langkah demi langkah, dan analisis opsi pengecoh.";
      if (kedalamanSumber === 'standar') {
        kedalamanText = "Standar edukatif, runut, mudah dipahami siswa dengan rumus KaTeX yang rapi.";
      } else if (kedalamanSumber === 'ringkas') {
        kedalamanText = "Ringkas, langsung ke inti penyelesaian dan kunci jawaban.";
      }

      let prompt = `Tolong buatkan **PEMBAHASAN SOAL MENDALAM & KUNCI JAWABAN LENGKAP** berdasarkan naskah soal yang ada pada dokumen/sumber berikut:

- **Nama Sumber / File**: ${fileData.name} (${fileData.sizeFormatted})
- **Tipe File**: ${fileData.type.toUpperCase()}
- **Cakupan Pembahasan**: ${cakupanText}
- **Tingkat Kedalaman**: ${kedalamanText}

### ATURAN DAN STRUKTUR PEMBAHASAN:
1. **Transkripsikan Naskah Soal**: Tuliskan kembali teks soal yang sedang dibahas secara rapi dan jelas (termasuk stimulus, tabel, atau opsi jawabannya).
2. **Kunci Jawaban Singkat**: Berikan huruf/jawaban yang tepat di awal pembahasan nomor tersebut.
3. **Konsep & Rumus Kunci**: Jelaskan teori ilmiah / konsep dasar dan rumus yang digunakan (WAJIB gunakan notasi LaTeX KaTeX standar untuk display $$...$$ dan inline $...$).
4. **Pembahasan Langkah demi Langkah**: Tuliskan perhitungan, penjabaran, dan penarikan kesimpulan secara sangat detail.
5. **Analisis Pilihan Jawaban**: Jika soal pilihan ganda, jelaskan alasan mengapa pilihan benar adalah tepat dan mengapa pilihan lainnya salah.
6. **Trik Cepat / Smart Solution**: Sertakan cara cerdas atau tips eliminasi cepat jika ada.
7. **Tabel Ringkasan Kunci Jawaban**: Sajikan tabel ringkas di bagian awal atau akhir.
8. **DILARANG MENGGUNAKAN KATA PENGANTAR**: DILARANG menulis kalimat pembuka seperti "Berikut adalah...", "Tentu...", dll. LANGSUNG MULAI baris pertama dokumen dari Judul Pembahasan: "# PEMBAHASAN SOAL & KUNCI JAWABAN: [MAPEL / TOPIK]". JANGAN gunakan pemisah pembuka (---) sebelum judul.

${fileData.extractedText ? `\n---\n### 📄 ISI TEKS DARI DOKUMEN WORD/TEKS:\n${fileData.extractedText}\n---\n` : ""}
${instruksiSumber ? `\n**INSTRUKSI KHUSUS DARI GURU:**\n${instruksiSumber}\n` : ""}`;

      const payloadFileData = fileData.base64 ? {
        base64: fileData.base64,
        mimeType: fileData.mimeType,
        name: fileData.name
      } : undefined;

      onSubmit(prompt, payloadFileData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Lightbulb size={22} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">Pembahasan & Bedah Soal AI</h3>
                <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  EduAsisten
                </span>
              </div>
              <p className="text-xs text-teal-100 opacity-90 mt-0.5">
                Solusi langkah demi langkah, rumus KaTeX, dan analisis pengecoh dari AI atau file dokumen/foto
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Primary Tabs: AI Langsung vs Dari Sumber File */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 pt-3 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('ai_langsung')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'ai_langsung'
                ? "bg-white text-teal-700 border-teal-600 shadow-2xs"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Sparkles size={16} className={activeTab === 'ai_langsung' ? "text-teal-600" : "text-slate-400"} />
            <span>1. Dari AI Langsung</span>
          </button>

          <button
            onClick={() => setActiveTab('dari_sumber')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'dari_sumber'
                ? "bg-white text-teal-700 border-teal-600 shadow-2xs"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Upload size={16} className={activeTab === 'dari_sumber' ? "text-teal-600" : "text-slate-400"} />
            <span>2. Dari Sumber (Foto, PDF, Word)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-slate-800">
          {activeTab === 'ai_langsung' ? (
            <div className="space-y-4">
              {/* Sub-tab Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAiSubTab('input_sendiri')}
                  className={`flex-1 py-1.5 px-3 rounded-lg transition-all ${
                    aiSubTab === 'input_sendiri'
                      ? "bg-white text-teal-700 font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ✍️ Ketik / Tempelkan Soal Sendiri
                </button>
                <button
                  type="button"
                  onClick={() => setAiSubTab('generate_baru')}
                  className={`flex-1 py-1.5 px-3 rounded-lg transition-all ${
                    aiSubTab === 'generate_baru'
                      ? "bg-white text-teal-700 font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ⚡ Buatkan Soal Baru & Pembahasan oleh AI
                </button>
              </div>

              {/* Kurikulum & Identitas Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Jenjang
                  </label>
                  <select
                    value={inputJenjang}
                    onChange={(e) => handleJenjangChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {Object.keys(DATA_JENJANG).map(j => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Kelas / Fase
                  </label>
                  <select
                    value={inputKelas}
                    onChange={(e) => setInputKelas(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {(DATA_JENJANG[inputJenjang as keyof typeof DATA_JENJANG] || []).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={inputMapel}
                    onChange={(e) => setInputMapel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {DATA_MAPEL_UMUM.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {aiSubTab === 'input_sendiri' ? (
                <>
                  {/* Contoh Soal Cepat */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        Isi Cepat dengan Contoh Soal:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(CONTOH_SOAL).map(([key, item]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleLoadContoh(key)}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-medium rounded-lg transition-colors border border-teal-200/60"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Textarea Naskah Soal */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                      Naskah Soal yang Ingin Dibahas <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={soalText}
                      onChange={(e) => setSoalText(e.target.value)}
                      placeholder="Ketik atau tempelkan (paste) naskah soal di sini, lengkap dengan pilihan jawaban (A, B, C, D, E) jika ada..."
                      rows={6}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none leading-relaxed"
                    />
                  </div>
                </>
              ) : (
                /* generate_baru form */
                <div className="space-y-3 bg-teal-50/50 p-4 rounded-2xl border border-teal-100">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                      Topik / Materi Pembelajaran <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={genTopik}
                      onChange={(e) => setGenTopik(e.target.value)}
                      placeholder="Contoh: Termodinamika & Hukum Gas Ideal, atau Persamaan Garis Singgung Lingkaran"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                        Tingkat Kesulitan
                      </label>
                      <select
                        value={genKesulitan}
                        onChange={(e) => setGenKesulitan(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      >
                        <option value="HOTS (C4-C6 - Analisis & Evaluasi)">HOTS (Tinggi - C4/C5/C6)</option>
                        <option value="MOTS (C3 - Aplikasi Konsep)">MOTS (Sedang - C3)</option>
                        <option value="LOTS (C1-C2 - Pemahaman Dasar)">LOTS (Dasar - C1/C2)</option>
                        <option value="Campuran Bertingkat (LOTS, MOTS, HOTS)">Campuran Bertingkat</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                        Bentuk Soal
                      </label>
                      <select
                        value={genBentuk}
                        onChange={(e) => setGenBentuk(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      >
                        <option value="Pilihan Ganda (PG A-E)">Pilihan Ganda (A-E)</option>
                        <option value="Uraian / Esai Perhitungan">Uraian / Esai</option>
                        <option value="Pilihan Ganda & Uraian">Kombinasi (PG & Uraian)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                        Jumlah Soal
                      </label>
                      <select
                        value={genJumlah}
                        onChange={(e) => setGenJumlah(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      >
                        <option value="1">1 Butir Soal</option>
                        <option value="2">2 Butir Soal</option>
                        <option value="3">3 Butir Soal</option>
                        <option value="5">5 Butir Soal</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Fitur & Format Pembahasan Checkboxes */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                  Komponen Pembahasan yang Diinginkan:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-teal-50/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={fokusFitur.stepByStep}
                      onChange={(e) => setFokusFitur({ ...fokusFitur, stepByStep: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-700">Langkah demi Langkah (Step-by-step)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-teal-50/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={fokusFitur.rumusKaTeX}
                      onChange={(e) => setFokusFitur({ ...fokusFitur, rumusKaTeX: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-700">Rumus KaTeX / LaTeX Standar</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-teal-50/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={fokusFitur.distractorAnalysis}
                      onChange={(e) => setFokusFitur({ ...fokusFitur, distractorAnalysis: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-700">Analisis Opsi Pengecoh (Distractor)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-teal-50/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={fokusFitur.smartSolution}
                      onChange={(e) => setFokusFitur({ ...fokusFitur, smartSolution: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-700">Trik Cepat / Smart Solution</span>
                  </label>
                </div>
              </div>

              {/* Instruksi Tambahan */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                  Instruksi Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={instruksiAI}
                  onChange={(e) => setInstruksiAI(e.target.value)}
                  placeholder="Contoh: Jelaskan dengan analogi sehari-hari, atau fokuskan pada penurunan rumus..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>
          ) : (
            /* TAB 2: DARI SUMBER DOKUMEN / FOTO */
            <div className="space-y-4">
              {/* Panduan Banner */}
              <div className="bg-teal-50 border border-teal-200/80 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-teal-900">
                <Sparkles size={16} className="text-teal-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Unggah foto naskah soal dari buku cetak/kamera, dokumen <b>PDF</b> latihan ujian, atau dokumen <b>Word (.docx)</b>. AI akan mendeteksi soal, menyusun naskah rapi, serta membuatkan kunci jawaban dan pembahasan langkah demi langkah.
                </p>
              </div>

              {/* Upload Dropzone */}
              {!fileData ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    isDragOver 
                      ? "border-teal-500 bg-teal-50/70 scale-[0.99]" 
                      : "border-slate-300 bg-slate-50/70 hover:bg-slate-100/70 hover:border-teal-400"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="w-14 h-14 rounded-2xl bg-teal-100/80 text-teal-700 flex items-center justify-center mb-1">
                    <Upload size={24} />
                  </div>

                  <h4 className="text-sm font-bold text-slate-800">
                    Pilih atau Tarik File Dokumen / Foto Soal ke Sini
                  </h4>

                  <p className="text-xs text-slate-500 max-w-md">
                    Mendukung <b className="text-teal-700">Foto Kamera / Screenshot</b> (JPG, PNG), <b className="text-teal-700">Dokumen PDF</b>, dan <b className="text-teal-700">Microsoft Word (.docx)</b>
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shadow-2xs">
                      📸 Foto / Gambar
                    </span>
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shadow-2xs">
                      📑 PDF
                    </span>
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shadow-2xs">
                      📝 Word (.docx)
                    </span>
                  </div>

                  {isProcessingFile && (
                    <div className="flex items-center gap-2 text-teal-700 text-xs font-semibold mt-3 animate-pulse">
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Sedang membaca dan mengoptimalkan file...</span>
                    </div>
                  )}

                  {fileError && (
                    <div className="flex items-center gap-1.5 text-rose-600 text-xs font-semibold mt-2">
                      <AlertCircle size={14} />
                      <span>{fileError}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Selected File Card */
                <div className="border border-slate-200 bg-slate-50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                        {fileData.type === 'docx' ? <FileText size={22} /> : 
                         fileData.type === 'pdf' ? <FileCheck size={22} /> : 
                         <ImageIcon size={22} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                            {fileData.name}
                          </h4>
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-md text-[10px] font-extrabold uppercase">
                            {fileData.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Ukuran: {fileData.sizeFormatted} • Siap dianalisis oleh AI
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFileData(null)}
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                      title="Hapus & ganti file"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Word / Txt Extracted Text Preview */}
                  {fileData.extractedText && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                          <Eye size={13} className="text-teal-600" />
                          Pratinjau Teks Soal yang Diekstrak dari Word:
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {fileData.extractedText.length} karakter
                        </span>
                      </div>
                      <textarea
                        value={fileData.extractedText}
                        onChange={(e) => setFileData({ ...fileData, extractedText: e.target.value })}
                        rows={5}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-700 resize-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 leading-relaxed"
                        placeholder="Teks naskah soal..."
                      />
                    </div>
                  )}

                  {/* Image Preview Thumbnail */}
                  {fileData.type === 'image' && fileData.base64 && (
                    <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
                      <img 
                        src={fileData.base64} 
                        alt="Preview Soal" 
                        className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-2xs"
                      />
                      <div className="text-xs text-slate-600">
                        <p className="font-semibold text-slate-800">Foto siap dianalisis oleh AI Vision</p>
                        <p className="text-[11px] text-slate-500">Gemini akan membaca teks, diagram, dan angka pada foto ini.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Opsi Cakupan Soal dalam File */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                  Cakupan Soal yang Ingin Dibahas:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label 
                    onClick={() => setCakupanSoal('semua')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      cakupanSoal === 'semua'
                        ? "bg-teal-50 border-teal-300 text-teal-900 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cakupan"
                      checked={cakupanSoal === 'semua'}
                      onChange={() => setCakupanSoal('semua')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span>Bahas Seluruh Soal dalam Dokumen</span>
                  </label>

                  <label 
                    onClick={() => setCakupanSoal('tertentu')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      cakupanSoal === 'tertentu'
                        ? "bg-teal-50 border-teal-300 text-teal-900 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cakupan"
                      checked={cakupanSoal === 'tertentu'}
                      onChange={() => setCakupanSoal('tertentu')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span>Bahas Nomor Tertentu Saja</span>
                  </label>
                </div>

                {cakupanSoal === 'tertentu' && (
                  <div className="mt-2 pl-1 animate-in fade-in duration-200">
                    <input
                      type="text"
                      value={nomorSoalTertentu}
                      onChange={(e) => setNomorSoalTertentu(e.target.value)}
                      placeholder="Contoh: Nomor 1, 3, 5 atau Nomor 1 sampai 10"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                )}
              </div>

              {/* Tingkat Kedalaman Pembahasan */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                  Format & Kedalaman Pembahasan:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setKedalamanSumber('sangat_detail')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      kedalamanSumber === 'sangat_detail'
                        ? "bg-teal-50 border-teal-300 text-teal-900"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-bold">🌟 Sangat Detail</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Langkah demi langkah, konsep, & opsi pengecoh</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKedalamanSumber('standar')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      kedalamanSumber === 'standar'
                        ? "bg-teal-50 border-teal-300 text-teal-900"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-bold">📘 Standar Edukatif</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Penjelasan runut dan rumus KaTeX rapi</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKedalamanSumber('ringkas')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      kedalamanSumber === 'ringkas'
                        ? "bg-teal-50 border-teal-300 text-teal-900"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-bold">⚡ Ringkas & Padat</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Kunci jawaban langsung dan inti rumus</div>
                  </button>
                </div>
              </div>

              {/* Instruksi Khusus */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                  Instruksi Khusus untuk Pembahasan File Ini (Opsional)
                </label>
                <input
                  type="text"
                  value={instruksiSumber}
                  onChange={(e) => setInstruksiSumber(e.target.value)}
                  placeholder="Contoh: Utamakan pembahasan nomor yang berlabel HOTS, atau gunakan bahasa santai..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmitModal}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Sparkles size={16} />
            <span>Mulai Pembahasan Soal</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
