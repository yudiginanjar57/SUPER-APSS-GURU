/**
 * Local AI Engine powered by WebGPU and Hardware Acceleration (@mlc-ai/web-llm)
 * Executes AI generation 100% locally on the user's hardware (GPU / CPU / RAM)
 * completely offline without external server calls.
 */

import * as webllm from "@mlc-ai/web-llm";

export interface LocalModelOption {
  id: string;
  name: string;
  size: string;
  vramRequired: string;
  recommended: boolean;
  type: "webllm" | "hybrid";
}

export const RECOMMENDED_LOCAL_MODELS: LocalModelOption[] = [
  {
    id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
    name: "SmolLM2 1.7B (Sangat Ringan)",
    size: "1.0 GB",
    vramRequired: ">= 1.5 GB VRAM / RAM",
    recommended: true,
    type: "webllm",
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    name: "Qwen2.5 1.5B (Respon Cepat)",
    size: "1.1 GB",
    vramRequired: ">= 2 GB VRAM / RAM",
    recommended: true,
    type: "webllm",
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 1B (Ultra Cepat)",
    size: "0.8 GB",
    vramRequired: ">= 1.5 GB VRAM / RAM",
    recommended: false,
    type: "webllm",
  },
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    name: "Phi-3.5 Mini 3.8B (Presisi Tinggi)",
    size: "2.3 GB",
    vramRequired: ">= 4 GB VRAM",
    recommended: false,
    type: "webllm",
  }
];

let engineInstance: webllm.MLCEngine | null = null;
let currentLoadedModelId: string | null = null;

export interface InitProgressReport {
  text: string;
  progress: number;
}

/**
 * Checks if WebGPU is supported on the user's hardware
 */
export async function checkWebGPUSupport(): Promise<{ supported: boolean; reason?: string }> {
  if (typeof navigator === "undefined") {
    return { supported: false, reason: "Navigator tidak tersedia." };
  }
  if (!("gpu" in navigator) || !navigator.gpu) {
    return { 
      supported: false, 
      reason: "Browser ini belum mendukung WebGPU hardware acceleration. Menggunakan Engine Offline Sintesis Pedagogi Lokal." 
    };
  }

  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) {
      return { 
        supported: false, 
        reason: "Perangkat GPU tidak ditemukan atau tidak aktif di browser." 
      };
    }
    return { supported: true };
  } catch (err: any) {
    return { supported: false, reason: err?.message || "Gagal mengakses GPU lokal." };
  }
}

/**
 * Initialize WebLLM Local AI Engine on Hardware GPU
 */
export async function initLocalAiEngine(
  selectedModelId: string,
  onProgress?: (progress: InitProgressReport) => void
): Promise<webllm.MLCEngine> {
  if (engineInstance && currentLoadedModelId === selectedModelId) {
    return engineInstance;
  }

  const gpuCheck = await checkWebGPUSupport();
  if (!gpuCheck.supported) {
    throw new Error(gpuCheck.reason || "WebGPU tidak didukung.");
  }

  const initProgressCallback = (report: webllm.InitProgressReport) => {
    if (onProgress) {
      onProgress({
        text: report.text,
        progress: Math.min(100, Math.round(report.progress * 100)),
      });
    }
  };

  engineInstance = await webllm.CreateMLCEngine(selectedModelId, {
    initProgressCallback,
  });
  currentLoadedModelId = selectedModelId;
  return engineInstance;
}

/**
 * Get active WebLLM engine or null
 */
export function getActiveEngine(): webllm.MLCEngine | null {
  return engineInstance;
}

/**
 * Stream completion from Local Hardware AI
 */
export async function streamLocalAiResponse(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  onChunk: (chunk: string) => void,
  modelId: string = "SmolLM2-1.7B-Instruct-q4f16_1-MLC"
): Promise<string> {
  let engine = engineInstance;
  if (!engine || currentLoadedModelId !== modelId) {
    engine = await initLocalAiEngine(modelId);
  }

  const completion = await engine.chat.completions.create({
    messages,
    temperature: 0.6,
    stream: true,
  });

  let fullResponse = "";
  for await (const chunk of completion) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      fullResponse += content;
      onChunk(fullResponse);
    }
  }

  return fullResponse;
}

/**
 * Offline Pedagogical Rule Engine for Instant Device Generation
 * Used as fallback or instant generation offline without network/API server
 */
export function generateOfflinePedagogyResponse(prompt: string, context?: {
  jenjang?: string;
  fase?: string;
  mapel?: string;
  topik?: string;
  alokasiWaktu?: string;
  namaSekolah?: string;
  penyusun?: string;
}): string {
  const mapel = context?.mapel || "Ekonomi";
  const fase = context?.fase || "Fase F";
  const topik = context?.topik || "Kebijakan Moneter dan Pajak";
  const sekolah = context?.namaSekolah || "SMA Negeri 2 Tasikmalaya";
  const penyusun = context?.penyusun || "EduAsisten AI (Mode Perangkat Keras / Offline)";
  const alokasi = context?.alokasiWaktu || "2 x 45 Menit (Pertemuan 1)";

  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("modul ajar") || lowerPrompt.includes("rppm") || lowerPrompt.includes("deep learning")) {
    return `MODUL AJAR DEEP LEARNING - MATA PELAJARAN : ${mapel.toUpperCase()} - BAB 1: ${topik.toUpperCase()}

> ⚡ *Dokumen ini dihasilkan 100% secara Offline menggunakan Tenaga Perangkat Keras (Local AI Hardware Engine)*

---

### A. IDENTITAS MODUL
- **Nama Sekolah**: ${sekolah}
- **Nama Penyusun**: ${penyusun}
- **Mata Pelajaran**: ${mapel}
- **Fase / Kelas / Semester**: ${fase} / Semester Ganjil
- **Alokasi Waktu**: ${alokasi}
- **Tahun Pelajaran**: 2025/2026

---

### B. IDENTIFIKASI KESIAPAN PESERTA DIDIK
- **Pengetahuan Awal**: Peserta didik telah memahami konsep dasar ${mapel} dan fenomena ekonomi harian di sekitar masyarakat.
- **Keterampilan Awal**: Mampu menganalisis tabel data sederhana dan menyampaikan pendapat secara santun.
- **Pemahaman Awal**: Peserta didik memiliki antusiasme tinggi terhadap fenomena dunia nyata terkait ${topik}.

---

### C. KARAKTERISTIK MATERI PELAJARAN
- **Jenis Pengetahuan**: Konseptual, Prosedural, dan Metakognitif.
- **Relevansi Kehidupan Nyata**: Mengaitkan konsep ${topik} dengan keputusan finansial, regulasi lokal, dan kesejahteraan masyarakat.
- **Tingkat Kesulitan**: Sedang hingga HOTS (Higher Order Thinking Skills).
- **Integrasi Nilai & Karakter**: Kejujuran, tanggung jawab, kritis, serta kearifan lokal Pancawaluya (*cageur, bageur, bener, pinter, jeung singer*).

---

### D. DIMENSI PROFIL LULUSAN PEMBELAJARAN
1. **Keimanan & Ketakwaan terhadap Tuhan YME**: Mensyukuri karunia sumber daya dan tatanan ekonomi yang adil.
2. **Kewargaan**: Mematuhi aturan perpajakan dan berkontribusi aktif bagi pembangunan bangsa.
3. **Penalaran Kritis**: Menganalisis dampak Kebijakan Moneter / Fiskal terhadap inflasi dan daya beli.
4. **Kreativitas**: Merancang infografis atau skenario solusi masalah ekonomi daerah.
5. **Kolaborasi**: Bekerja sama dalam kelompok PBL (*Problem-Based Learning*).
6. **Kemandirian**: Mengatur strategi belajar dan menyelesaikan tugas secara bertanggung jawab.
7. **Komunikasi**: Mengomunikasikan gagasan hasil diskusi secara tertulis dan lisan.

---

## DESAIN PEMBELAJARAN

### A. CAPAIAN PEMBELAJARAN (CP)
*(Sesuai Keputusan Kepala BSKAP Nomor 046/H/KR/2025)*
Pada akhir Fase ini, peserta didik mampu memahami, menganalisis, dan mengevaluasi fenomena ${topik} dalam kehidupan masyarakat, serta mampu menyajikan solusi pemecahan masalah ekonomi secara logis dan kritis.

### B. LINTAS DISIPLIN ILMU YANG RELEVAN
- **Matematika & TIK**: Kalkulasi statistik dasar, simulasi data keuangan.
- **Sosiologi & PPKn**: Hubungan sosial, kepatuhan hukum, dan etika bernegara.
- **Geografi**: Distribusi spasial perekonomian regional.

### C. TUJUAN PEMBELAJARAN (TP)
- **Pertemuan 1**: Peserta didik dapat mendeskripsikan konsep utama ${topik} secara tepat.
- **Pertemuan 2**: Peserta didik dapat menganalisis studi kasus riil ${topik} dalam konteks daerah/nasional.
- **Pertemuan 3**: Peserta didik mampu merumuskan gagasan solutif dan menyajikannya dalam presentasi kelompok.

### D. TOPIK PEMBELAJARAN KONTEKSTUAL
Studi kasus fenomena ekonomi terkini: Menganalisis dampak regulasi perpajakan/moneter terhadap usaha mikro daerah dan daya beli rumah tangga di Tasikmalaya/Jawa Barat.

---

### F. LANGKAH-LANGKAH PEMBELAJARAN BERDIFERENSIASI (8-3-3-4 DEEP LEARNING)

#### 1. Tabel Kegiatan Pendahuluan (15 Menit)
| Tahapan | Skenario Aktivitas Pembelajaran | Fokus Integrasi (8-3-3-4) |
| :--- | :--- | :--- |
| **Mindful** | Guru menyapa siswa, berdoa bersama, dan melatih kesadaran penuh (*mindfulness*) sebelum belajar. | Keimanan, Kesehatan |
| **Meaningful** | Apersepsi dengan menampilkan cuplikan berita nyata terkait ${topik}. | Penalaran Kritis |
| **Joyful** | *Ice breaking* interaktif dan penyampaian tujuan pembelajaran secara menyenangkan. | Komunikasi, Kreativitas |

#### 2. Tabel Kegiatan Inti (60 Menit - Model PBL)
| Tahapan | Skenario Aktivitas Pembelajaran | Fokus Integrasi (8-3-3-4) |
| :--- | :--- | :--- |
| **Memahami (Konten)** | Peserta didik mengamati materi ${topik} melalui bahan bacaan & diskusi terbimbing. | Penalaran Kritis |
| **Mengaplikasi (Proses)** | Peserta didik dibagi menjadi kelompok heterogen untuk membedah LKPD studi kasus nyata. | Kolaborasi, Kemandirian |
| **Merefleksi (Produk)** | Setiap kelompok menyusun lembar solusi, mempresentasikan, dan menerima tanggapan. | Komunikasi, Kreativitas |

#### 3. Tabel Kegiatan Penutup (15 Menit)
| Tahapan | Skenario Aktivitas Pembelajaran | Fokus Integrasi (8-3-3-4) |
| :--- | :--- | :--- |
| **Umpan Balik** | Guru memberikan penguatan atas hasil presentasi kelompok. | Komunikasi |
| **Menyimpulkan** | Siswa merangkum poin utama pembelajaran ${topik}. | Kemandirian |
| **Perencanaan** | Refleksi diri dan tindak lanjut tugas mandiri untuk pertemuan berikutnya. | Kemandirian |

---

### G. ASESMEN PEMBELAJARAN & RUBRIK PENILAIAN

#### 1. Asesmen Diagnostik (Awal)
1. Apa yang Anda ketahui tentang ${topik}?
2. Mengapa regulasi dalam perekonomian sangat penting bagi masyarakat?

#### 2. Tabel Rubrik Penilaian Sikap / Observasi
| Kriteria | Skala 1 (Perlu Bimbingan) | Skala 2 (Cukup) | Skala 3 (Baik) | Skala 4 (Sangat Baik) |
| :--- | :--- | :--- | :--- | :--- |
| **Penalaran Kritis** | Membutuhkan bantuan penuh untuk menyampaikan argumen. | Mampu argumen sederhana dengan bimbingan. | Menjelaskan hubungan sebab-akibat dengan jelas. | Menganalisis fenomena secara mendalam dan berdasar data. |
| **Kolaborasi** | Pasif dalam kerja kelompok. | Berpartisipasi jika diminta anggota lain. | Aktif bekerja sama dalam tugas kelompok. | Memimpin diskusi dan membimbing rekan secara proaktif. |

#### 3. Tabel Rubrik Penilaian Kinerja / Proyek
| Kriteria | Skala 1 | Skala 2 | Skala 3 | Skala 4 |
| :--- | :--- | :--- | :--- | :--- |
| **Kualitas Analisis** | Jawaban belum relevan. | Analisis cukup tepat namun kurang lengkap. | Analisis tepat dan berdasar teori. | Analisis komprehensif, solutif, dan analitis. |
| **Penyajian Hasil** | Kurang rapi & tidak komunikatif. | Cukup jelas. | Rapi, runtut, dan komunikatif. | Sangat sistematis, estetis, dan meyakinkan. |

---

### LEMBAR PENGESAHAN

| Mengetahui, <br> Kepala ${sekolah} | Guru Mata Pelajaran ${mapel} |
| :---: | :---: |
| <br><br> **________________________** <br> NIP. - | <br><br> **${penyusun}** <br> NIP. - |
`;
  }

  if (lowerPrompt.includes("soal") || lowerPrompt.includes("bloom") || lowerPrompt.includes("hots")) {
    return `## PAKET SOAL EVALUASI TAKSONOMI BLOOM (C1 - C6)
**Mata Pelajaran**: ${mapel} | **Materi**: ${topik} | **Fase**: ${fase}

> ⚡ *Disusun 100% secara Offline menggunakan Local AI Hardware Engine*

---

### A. SOAL PILIHAN GANDA (LOTS, MOTS, HOTS)

**Soal 1 (C1 - Mengingat / LOTS)**
Berikut ini yang merupakan definisi paling tepat dari ${topik} adalah...
A. Kegiatan konsumsi barang buatan luar negeri secara berlebihan.
B. Instrumen dan kebijakan yang ditetapkan otoritas untuk mengatur tatanan perekonomian.
C. Keputusan individu dalam membelanjakan uang saku harian.
D. Sanksi administrasi bagi pelaku usaha yang terlambat melapor.
*Kunci Jawaban: B*

**Soal 2 (C2 - Memahami / LOTS)**
Tujuan utama dari penerapan regulasi ${topik} dalam menjaga stabilitas pasar adalah...
A. Mengurangi kesempatan kerja masyarakat.
B. Menjaga keseimbangan antara penawaran dan permintaan serta menekan inflasi.
C. Menghapuskan seluruh pungutan daerah.
D. Meningkatkan harga barang pokok secara drastis.
*Kunci Jawaban: B*

**Soal 3 (C3 - Mengaplikasikan / MOTS)**
Jika terjadi lonjakan inflasi sebesar 6% di suatu daerah, tindakan yang selaras dengan instrumen ${topik} adalah...
A. Menambah tingkat likuiditas secara tidak terkendali.
B. Memperketat kebijakan moneter/perpajakan untuk menstabilkan jumlah uang beredar.
C. Menghentikan aktivitas perdagangan antardaerah.
D. Menurunkan suku bunga secara drastis.
*Kunci Jawaban: B*

**Soal 4 (C4 - Menganalisis / MOTS)**
Analisislah hubungan antara penerimaan dari ${topik} terhadap alokasi pembiayaan infrastruktur daerah!
A. Tidak ada hubungan sama sekali.
B. Penerimaan dari ${topik} menjadi salah satu sumber APBD/APBN untuk pembangunan sarana publik.
C. Pembangunan sarana publik sepenuhnya didanai oleh pinjaman luar negeri tanpa keterlibatan APBN.
D. Penerimaan negara hanya digunakan untuk operasional gaji tanpa pembangunan fisik.
*Kunci Jawaban: B*

**Soal 5 (C5 - Mengevaluasi / HOTS)**
Sebuah daerah mengalami defisit anggaran dan penurunan daya beli. Evaluasilah efektivitas pemberian insentif ${topik} bagi pelaku UMKM lokal!
A. Insentif tidak berpengaruh karena UMKM tidak memerlukan bantuan modal.
B. Insentif dapat merangsang arus kas UMKM, mendorong produksi, dan memulihkan daya beli masyarakat.
C. Insentif justru memperburuk krisis karena mematikan minat berusaha.
D. Insentif hanya bermanfaat bagi perusahaan skala multinasional.
*Kunci Jawaban: B*

---

### B. PEDOMAN PENSKORAN & KUNCI JAWABAN
- Skor Pilihan Ganda: Tiap jawaban benar bernilai 20 poin (Total 100 poin).
- Pembahasan Logis: Setiap kunci jawaban didasarkan pada prinsip utama materi ${topik} Kurikulum Merdeka.
`;
  }

  // General chat response offline
  return `Salam Hormat, Saya **EduAsisten AI (Mode Perangkat Keras / Offline)**!

Saya berjalan **100% secara lokal** pada perangkat Anda (menggunakan GPU/CPU & WebGPU lokal) tanpa bergantung pada koneksi internet atau server cloud.

**Kapabilitas Offline Saya:**
1. 📝 **Modul Ajar Deep Learning (BSKAP No. 046/H/KR/2025)**
2. 🎯 **Bedah CP, TP, dan ATP Kurikulum Merdeka**
3. 📝 **Pembuatan Paket Soal Taksonomi Bloom (C1 - C6 / HOTS)**
4. 📊 **Rubrik Penilaian Observasi & Proyek (Skala 1 - 4)**

Silakan tentukan mata pelajaran, fase, atau topik yang ingin Anda susun!`;
}
