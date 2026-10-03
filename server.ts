import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable CORS for all devices (Mobile, Tablet, LAN, Cloud)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Gemini AI client factory
function getGeminiClient(useCustomHeaders = true): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in your environment configuration.");
  }
  if (useCustomHeaders) {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return new GoogleGenAI({ apiKey });
}

// Helper function to handle AI generation with model fallbacks and retry backoff on 503 / high demand / fetch errors
async function generateContentWithRetry(
  aiOrParams: any,
  maybeParams?: { contents: any; config?: any }
) {
  const params = maybeParams || aiOrParams;
  // Active non-lite Gemini models supported by @google/genai SDK v1beta
  const candidateModels = [
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview"
  ].filter(model => !model.toLowerCase().includes("lite"));

  const config = {
    ...(params.config || {})
  };

  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Use custom headers on attempt 1 & 2; fallback to standard headers without httpOptions on attempt 3 if fetch failed
        const useCustomHeaders = attempt < 3;
        const client = getGeminiClient(useCustomHeaders);

        const response = await client.models.generateContent({
          model,
          contents: params.contents,
          config
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || err?.cause || err);

        // If model doesn't exist or is deprecated (404 / NOT_FOUND), immediately skip to next candidate model
        if (errStr.includes("404") || errStr.includes("NOT_FOUND") || errStr.includes("no longer available") || errStr.includes("is not found")) {
          console.warn(`[Gemini AI] Model ${model} not available (404/Not Found). Skipping to next candidate model.`);
          break;
        }

        // If quota exceeded or RESOURCE_EXHAUSTED (429), immediately skip to next candidate model
        if (errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("Quota exceeded") || errStr.includes("quota") || err?.status === 429) {
          console.warn(`[Gemini AI] Model ${model} quota exceeded (429/Resource Exhausted). Skipping to next model.`);
          break;
        }

        const isTransient =
          err?.status === 503 ||
          err?.status === 502 ||
          err?.status === 504 ||
          errStr.includes("503") ||
          errStr.includes("502") ||
          errStr.includes("504") ||
          errStr.includes("high demand") ||
          errStr.includes("UNAVAILABLE") ||
          errStr.includes("fetch failed") ||
          errStr.includes("network") ||
          errStr.includes("ECONNRESET") ||
          errStr.includes("ETIMEDOUT") ||
          errStr.includes("TypeError");

        console.warn(`[Gemini AI] Model ${model} (attempt ${attempt}/3) failed: ${errStr}`);

        if (isTransient && attempt < 3) {
          const delayMs = Math.min(3000, 1000 * Math.pow(1.5, attempt));
          await new Promise((res) => setTimeout(res, delayMs));
        } else {
          break;
        }
      }
    }
  }

  const finalErrMsg = lastError?.message || String(lastError?.cause || lastError);
  throw new Error(`Semua model AI sedang sibuk atau mengalami kendala jaringan (${finalErrMsg}). Silakan coba beberapa saat lagi.`);
}

// Robust JSON repair and parser for Gemini responses
function safeParseJSON(rawText: string): any {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Teks respons AI kosong.");
  }

  // 1. Strip markdown code fences (```json ... ``` or ``` ...)
  let str = rawText.trim();
  str = str.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // 2. Locate first JSON boundary
  const firstBrace = str.indexOf("{");
  const firstBracket = str.indexOf("[");
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = str.lastIndexOf("}");
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = str.lastIndexOf("]");
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    str = str.substring(startIdx, endIdx + 1);
  }

  // Attempt 1: Standard JSON parse
  try {
    return JSON.parse(str);
  } catch (err1) {
    // Attempt 2: Clean smart quotes, control chars, and trailing commas
    try {
      let cleaned = str
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,\s*([}\]])/g, "$1");

      return JSON.parse(cleaned);
    } catch (err2) {
      // Attempt 3: Repair unescaped quotes & balance truncated braces/brackets
      try {
        let repaired = str
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/,\s*([}\]])/g, "$1");

        let inString = false;
        let escape = false;
        let openBraces = 0;
        let openBrackets = 0;

        for (let i = 0; i < repaired.length; i++) {
          const ch = repaired[i];
          if (escape) {
            escape = false;
            continue;
          }
          if (ch === "\\") {
            escape = true;
            continue;
          }
          if (ch === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (ch === "{") openBraces++;
            else if (ch === "}") openBraces = Math.max(0, openBraces - 1);
            else if (ch === "[") openBrackets++;
            else if (ch === "]") openBrackets = Math.max(0, openBrackets - 1);
          }
        }

        if (inString) {
          repaired += '"';
        }
        repaired = repaired.replace(/,\s*$/, "");
        repaired = repaired.replace(/,\s*"[^"]*":?\s*$/, "");

        while (openBrackets > 0) {
          repaired += "]";
          openBrackets--;
        }
        while (openBraces > 0) {
          repaired += "}";
          openBraces--;
        }

        return JSON.parse(repaired);
      } catch (err3) {
        console.error("[safeParseJSON] Failed to parse string preview:", str.slice(0, 300));
        throw new Error(`Format JSON dari AI tidak valid: ${(err1 as Error).message}`);
      }
    }
  }
}

// API Endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

// Endpoint for AI grading of student essays/answers
app.post("/api/grade-essay", async (req, res) => {
  try {
    const { subject, studentAnswer, answerKey, maxScore } = req.body;

    if (!subject || !studentAnswer) {
      return res.status(400).json({ error: "Subject and student answer are required." });
    }

    const ai = getGeminiClient();
    const prompt = `
Evaluasi jawaban siswa untuk mata pelajaran/topik berikut:
Topik/Mata Pelajaran: ${subject}
Kunci Jawaban/Rubrik Penilaian: ${answerKey || "Evaluasi berdasarkan kelayakan umum topik tersebut"}
Skor Maksimal: ${maxScore || 100}

Jawaban Siswa:
"${studentAnswer}"

Tugas Anda adalah menilai secara otomatis jawaban siswa tersebut. Bandingkan dengan kunci jawaban/rubrik jika tersedia, atau nilai berdasarkan kebenaran konsep dalam topik tersebut jika kunci jawaban tidak rinci. Berikan nilai rasional yang adil (dalam rentang 0 sampai ${maxScore || 100}), analisis jawaban, dan umpan balik konstruktif yang hangat dalam bahasa Indonesia.
`;

    const response = await generateContentWithRetry(ai, {
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah asisten penilaian guru yang cerdas, adil, objektif, namun selalu memberi dorongan positif kepada siswa. Anda harus merespons dalam format JSON sesuai skema yang ditentukan.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.NUMBER,
              description: "Nilai numerik hasil evaluasi jawaban siswa, tidak boleh melebihi skor maksimal."
            },
            analysis: {
              type: Type.STRING,
              description: "Analisis singkat bagian jawaban yang benar, kurang tepat, atau salah."
            },
            feedback: {
              type: Type.STRING,
              description: "Umpan balik yang hangat, ramah, dan mendidik untuk siswa dalam bahasa Indonesia."
            },
            suggestions: {
              type: Type.STRING,
              description: "Saran konkret untuk perbaikan pemahaman materi siswa ke depannya."
            }
          },
          required: ["score", "analysis", "feedback", "suggestions"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response text from Gemini API.");
    }

    const result = safeParseJSON(responseText);
    res.json(result);
  } catch (error: any) {
    console.error("Error in AI grading:", error);
    res.status(500).json({ 
      error: "Gagal memproses penilaian otomatis.", 
      details: error.message || error 
    });
  }
});

// Endpoint for parsing answer key from PDF, XLSX, TXT, JSON using Gemini AI
app.post("/api/parse-answer-key", async (req, res) => {
  try {
    const { fileBase64, fileMimeType, textContent } = req.body;
    const ai = getGeminiClient();

    let contents: any[] = [];
    if (fileBase64) {
      const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, "");
      contents.push({
        inlineData: {
          data: base64Data,
          mimeType: fileMimeType || "application/pdf"
        }
      });
    }

    const prompt = `
Analisis dokumen/teks berikut yang merupakan Kunci Jawaban / Rubrik Penilaian untuk ujian/tugas sekolah.
Ekstrak dan petakan kunci jawaban tersebut ke dalam format JSON dengan properti berikut:
- "kunciPG": string (kunci jawaban pilihan ganda, misal: "1.A, 2.B, 3.C..." atau deretan huruf jawaban)
- "kunciPGKompleks": string (kunci pilihan ganda kompleks jika ada)
- "kunciBenarSalah": string (kunci benar/salah jika ada)
- "kunciIsian": string (kunci isian singkat jika ada)
- "kunciUraian": string (rubrik/poin kunci jawaban uraian/essay)

Teks konten tambahan jika ada:
${textContent || ""}
`;
    contents.push(prompt);

    const response = await generateContentWithRetry(ai, {
      contents,
      config: {
        systemInstruction: "Anda adalah asisten AI kurikulum yang ahli dalam membaca dokumen kunci jawaban ujian guru (PDF, Excel, Teks). Ekstrak informasi secara akurat dan berikan output dalam format JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            kunciPG: { type: Type.STRING },
            kunciPGKompleks: { type: Type.STRING },
            kunciBenarSalah: { type: Type.STRING },
            kunciIsian: { type: Type.STRING },
            kunciUraian: { type: Type.STRING }
          }
        }
      }
    });

    const respText = response.text;
    if (!respText) throw new Error("No response from Gemini API");
    const parsed = safeParseJSON(respText);
    res.json(parsed);
  } catch (err: any) {
    console.error("Error parsing answer key:", err);
    res.status(500).json({ error: err.message || "Gagal memproses kunci jawaban." });
  }
});

// Comprehensive AI Assessment Endpoint (PG, PG Kompleks, Benar/Salah, Isian Singkat, Uraian + Vision Scan PDF/Gambar)
app.post("/api/penilaian-ai", async (req, res) => {
  try {
    const { 
      method, // 'manual' | 'scan_pdf'
      mapel, 
      kelas, 
      namaSiswa,
      kunciJawaban, // object with { pg, pgKompleks, benarSalah, isianSingkat, uraian }
      jawabanSiswaText, 
      fileBase64, 
      fileMimeType,
      files, // Array of { base64, mimeType, fileBase64, fileMimeType } for multi-photo support (up to 10 photos)
      questionTypes,
      studentsRoster
    } = req.body;

    if (!mapel) {
      return res.status(400).json({ error: "Mata pelajaran wajib diisi." });
    }

    const ai = getGeminiClient();
    const contents: any[] = [];

    const rosterText = Array.isArray(studentsRoster) && studentsRoster.length > 0
      ? studentsRoster.map(s => `No. Absen ${s.absenNo || s.id}: ${s.name} (NIS: ${s.nis || "-"})`).join("\n")
      : "";

    // Formulate structured prompt
    let promptText = `
Mata Pelajaran: ${mapel}
Kelas / Fase: ${kelas || "Semua Kelas"}
Nama Siswa: ${namaSiswa || "[Pindai dari Dokumen / Siswa]"}
Bentuk Soal yang Dikoreksi: ${Array.isArray(questionTypes) ? questionTypes.join(", ") : "PG, PG Kompleks, Benar/Salah, Isian Singkat, Uraian"}

${rosterText ? `DAFTAR SISWA & NOMOR ABSEN KELAS:\n${rosterText}\n` : ""}

KUNCI JAWABAN & RUBRIK GURU:
- PG (Pilihan Ganda): ${typeof kunciJawaban === 'object' ? (kunciJawaban.pg || "Tidak disediakan") : kunciJawaban}
- PG Kompleks: ${typeof kunciJawaban === 'object' ? (kunciJawaban.pgKompleks || "Tidak disediakan") : "Tidak disediakan"}
- Benar / Salah: ${typeof kunciJawaban === 'object' ? (kunciJawaban.benarSalah || "Tidak disediakan") : "Tidak disediakan"}
- Isian Singkat: ${typeof kunciJawaban === 'object' ? (kunciJawaban.isianSingkat || "Tidak disediakan") : "Tidak disediakan"}
- Uraian / Esai & Rubrik: ${typeof kunciJawaban === 'object' ? (kunciJawaban.uraian || "Tidak disediakan") : "Tidak disediakan"}
`;

    // Process files list (supports multi-photo up to 10 photos)
    const filesList: Array<{ base64: string; mimeType: string }> = [];
    if (Array.isArray(files) && files.length > 0) {
      files.slice(0, 10).forEach((f: any) => {
        const rawB64 = f.base64 || f.fileBase64;
        if (rawB64) {
          filesList.push({
            base64: rawB64.replace(/^data:[^;]+;base64,/, ""),
            mimeType: f.mimeType || f.fileMimeType || "image/jpeg"
          });
        }
      });
    } else if (fileBase64) {
      filesList.push({
        base64: fileBase64.replace(/^data:[^;]+;base64,/, ""),
        mimeType: fileMimeType || "application/pdf"
      });
    }

    if (method === "scan_pdf" && filesList.length > 0) {
      filesList.forEach((f) => {
        contents.push({
          inlineData: {
            data: f.base64,
            mimeType: f.mimeType
          }
        });
      });
      promptText += `
INSTRUKSI PEMINDAIAN ${filesList.length} LEMBAR FOTO JAWABAN SISWA (VISION OCR MULTI-PHOTO):
1. Terdapat ${filesList.length} lembar/foto jawaban terlampir (halaman 1 sampai halaman ${filesList.length}). Pindai dan ekstrak data dari SELURUH foto/halaman tersebut secara berurutan sebagai SATU KESATUAN lembar jawaban siswa.
2. Identifikasi Nomor Absen siswa yang tertera pada lembar ujian (No. Absen, No, Nomor Presensi).
3. Jika Nomor Absen tertera dan terdapat Daftar Siswa di atas, AMBIL DAN GUNAKAN NAMA RESMI SISWA DARI DAFTAR KELAS SESUAI DENGAN NOMOR ABSEN TERSEBUT.
4. Jika Nomor Absen tidak ada, ambil nama yang tertulis di lembar ujian dan cocokkan dengan daftar kelas atau gunakan ${namaSiswa || "Siswa"}.
5. Ekstrak seluruh jawaban dari seluruh ${filesList.length} foto. PENTING: Salin/transkripsi teks tulisan siswa SECARA HARFIAH (APA ADANYA) ke dalam field 'studentAnswer'. DILARANG KERAS mengoreksi ejaan, melengkapi kalimat, atau mengubah tulisan asli siswa sedikitpun.
6. Bandingkan 'studentAnswer' dengan Kunci Jawaban & Rubrik secara objektif. Tulis evaluasi, alasan salah/benar, dan koreksinya HANYA di dalam field 'note'.
7. Hitung skor numerik adil per nomor, skor per bentuk soal, dan skor total (skala 0 - 100).
8. Susun tabel detail koreksi dan laporan markdown yang rapi.
`;
    } else {
      promptText += `
JAWABAN SISWA (INPUT TEXT):
${jawabanSiswaText || "Siswa tidak mengisi jawaban"}

INSTRUKSI KOREKSI:
1. Bandingkan jawaban siswa dengan Kunci Jawaban & Rubrik di atas.
2. Koreksi semua bentuk soal yang ada:
   - PG: Cek kesesuaian huruf opsi (Benar = Skor Maks, Salah = 0)
   - PG Kompleks: Cek semua opsi yang dipilih (Skor proporsional)
   - Benar/Salah: Cek kebenaran pilihan Benar atau Salah
   - Isian Singkat: Cek ketepatan kata kunci/istilah
   - Uraian: Evaluasi kedalaman konsep, argumen, dan rubrik
3. Hitung skor numerik per nomor, per bentuk soal, dan skor total (skala 0 - 100).
`;
    }

    contents.push({ text: promptText });

    const systemInstruction = `Anda adalah "EduAsisten Penilaian AI", sistem ahli penilai dan korektor ujian sekolah di Indonesia (Kurikulum Merdeka).
Tugas Anda adalah melakukan koreksi presisi terhadap 5 bentuk soal:
1. Pilihan Ganda (PG)
2. PG Kompleks (Pilihan Ganda Lebih dari Satu Jawaban)
3. Benar / Salah
4. Isian Singkat
5. Uraian / Esai

Jika terdapat nomor absen pada lembar jawaban, prioritaskan pencocokan nama siswa berdasarkan nomor absen dari daftar kelas.
Anda HARUS mengembalikan respons JSON terstruktur secara mutlak sesuai skema yang ditentukan, dan di dalam field 'markdownReport' sediakan Laporan Hasil Penilaian terformat Markdown lengkap dengan tabel koreksi per nomor soal, ringkasan nilai per bentuk soal, analisis, umpan balik motivatif, dan tabel TTD.`;

    const response = await generateContentWithRetry(ai, {
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            namaSiswa: { type: Type.STRING },
            absenNo: { type: Type.NUMBER, description: "Nomor absen siswa yang terdeteksi atau dicocokkan" },
            mapel: { type: Type.STRING },
            kelas: { type: Type.STRING },
            totalScore: { type: Type.NUMBER },
            maxScore: { type: Type.NUMBER },
            grade: { type: Type.STRING },
            summaryPerType: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  maxScore: { type: Type.NUMBER },
                  correctCount: { type: Type.STRING }
                },
                required: ["type", "score", "maxScore", "correctCount"]
              }
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  no: { type: Type.NUMBER },
                  type: { type: Type.STRING },
                  studentAnswer: { type: Type.STRING },
                  answerKey: { type: Type.STRING },
                  status: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  maxScore: { type: Type.NUMBER },
                  note: { type: Type.STRING }
                },
                required: ["no", "type", "studentAnswer", "answerKey", "status", "score", "maxScore", "note"]
              }
            },
            analysis: { type: Type.STRING },
            feedback: { type: Type.STRING },
            suggestions: { type: Type.STRING },
            markdownReport: { type: Type.STRING }
          },
          required: [
            "namaSiswa", "mapel", "kelas", "totalScore", "maxScore", "grade",
            "summaryPerType", "items", "analysis", "feedback", "suggestions", "markdownReport"
          ]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Tidak ada respons dari model Gemini AI.");
    }

    const result = safeParseJSON(responseText);

    // If studentsRoster is provided, ensure student name matches the detected absenNo or namaSiswa
    if (Array.isArray(studentsRoster) && studentsRoster.length > 0) {
      let matched: any = null;
      if (typeof result.absenNo === 'number' && result.absenNo > 0) {
        matched = studentsRoster.find(r => r.absenNo === result.absenNo);
      }
      if (!matched && result.namaSiswa) {
        matched = studentsRoster.find(r => 
          r.name.toLowerCase().includes(result.namaSiswa.toLowerCase()) || 
          result.namaSiswa.toLowerCase().includes(r.name.toLowerCase())
        );
      }
      if (matched) {
        result.namaSiswa = matched.name;
        result.studentId = matched.id;
        result.nis = matched.nis;
        result.absenNo = matched.absenNo;
      }
    }

    res.json(result);
  } catch (error: any) {
    console.error("Error in AI Penilaian:", error);
    res.status(500).json({ 
      error: "Gagal memproses koreksi AI & pemindaian dokumen.", 
      details: error.message || error 
    });
  }
});

// Bulk / Batch AI Assessment Endpoint
app.post("/api/penilaian-ai-batch", async (req, res) => {
  try {
    const { 
      mapel, 
      kelas, 
      kunciJawaban, // { pg, pgKompleks, benarSalah, isianSingkat, uraian }
      questionTypes,
      studentsList, // Array of { studentId, studentName, answerText, fileBase64, fileMimeType }
      studentsRoster
    } = req.body;

    if (!mapel) {
      return res.status(400).json({ error: "Mata pelajaran wajib diisi." });
    }

    if (!Array.isArray(studentsList) || studentsList.length === 0) {
      return res.status(400).json({ error: "Daftar siswa dan jawaban tidak boleh kosong." });
    }

    const ai = getGeminiClient();

    const rosterText = Array.isArray(studentsRoster) && studentsRoster.length > 0
      ? studentsRoster.map(s => `No. Absen ${s.absenNo || s.id}: ${s.name} (NIS: ${s.nis || "-"})`).join("\n")
      : "";

    // Helper for single student grading
    const gradeSingleStudent = async (studentItem: {
      studentId: string;
      studentName: string;
      answerText?: string;
      fileBase64?: string;
      fileMimeType?: string;
      files?: Array<{ base64?: string; fileBase64?: string; mimeType?: string; fileMimeType?: string }>;
    }) => {
      const contents: any[] = [];
      let promptText = `
Mata Pelajaran: ${mapel}
Kelas / Fase: ${kelas || "Semua Kelas"}
Nama Berkas / Siswa Saat Ini: ${studentItem.studentName} (ID: ${studentItem.studentId})
Bentuk Soal yang Dikoreksi: ${Array.isArray(questionTypes) ? questionTypes.join(", ") : "PG, PG Kompleks, Benar/Salah, Isian Singkat, Uraian"}

${rosterText ? `DAFTAR SISWA & NOMOR ABSEN RESMI KELAS:\n${rosterText}\n` : ""}

KUNCI JAWABAN & RUBRIK GURU:
- PG (Pilihan Ganda): ${typeof kunciJawaban === 'object' ? (kunciJawaban.pg || "Tidak disediakan") : kunciJawaban}
- PG Kompleks: ${typeof kunciJawaban === 'object' ? (kunciJawaban.pgKompleks || "Tidak disediakan") : "Tidak disediakan"}
- Benar / Salah: ${typeof kunciJawaban === 'object' ? (kunciJawaban.benarSalah || "Tidak disediakan") : "Tidak disediakan"}
- Isian Singkat: ${typeof kunciJawaban === 'object' ? (kunciJawaban.isianSingkat || "Tidak disediakan") : "Tidak disediakan"}
- Uraian / Esai & Rubrik: ${typeof kunciJawaban === 'object' ? (kunciJawaban.uraian || "Tidak disediakan") : "Tidak disediakan"}
`;

      const filesList: Array<{ base64: string; mimeType: string }> = [];
      if (Array.isArray(studentItem.files) && studentItem.files.length > 0) {
        studentItem.files.slice(0, 10).forEach((f) => {
          const rawB64 = f.base64 || f.fileBase64;
          if (rawB64) {
            filesList.push({
              base64: rawB64.replace(/^data:[^;]+;base64,/, ""),
              mimeType: f.mimeType || f.fileMimeType || "image/jpeg"
            });
          }
        });
      } else if (studentItem.fileBase64) {
        filesList.push({
          base64: studentItem.fileBase64.replace(/^data:[^;]+;base64,/, ""),
          mimeType: studentItem.fileMimeType || "application/pdf"
        });
      }

      if (filesList.length > 0) {
        filesList.forEach((f) => {
          contents.push({
            inlineData: {
              data: f.base64,
              mimeType: f.mimeType
            }
          });
        });
        promptText += `
INSTRUKSI PEMINDAIAN ${filesList.length} LEMBAR FOTO JAWABAN SISWA (TINGKAT AKURASI TINGGI - OCR MULTI-PHOTO):
1. Terdapat ${filesList.length} foto/lembar terlampir untuk siswa ini. Pindai SELURUH foto (halaman 1 sampai ${filesList.length}) secara berurutan dan cermat.
2. PINDAI DENGAN AKURASI TINGGI & TELITI:
   - Amati coretan, pembetulan, atau penulisan ganda. Jika ada jawaban yang dicoret atau diperbaiki oleh siswa (misalnya dicoret dengan tanda silang atau ditindih huruf baru), gunakan jawaban yang paling akhir ditulis/yang dibetulkan.
   - Pindai dengan resolusi pengamatan visual tertinggi. Amati baik-baik perbedaan antara huruf cetak atau tulisan tangan yang mirip, seperti 'D' vs 'O', 'B' vs '8', 'A' vs '4', atau 'C' vs 'G'.
   - Jika jawaban berupa pilihan ganda (PG) yang dilingkari, disilang, atau dicentang pada lembar jawaban berkolom, temukan letak tanda silang/lingkaran tersebut secara tepat pada huruf A, B, C, D, atau E.
3. ALUR IDENTIFIKASI PESERTA:
   - PARAMETER 1 (PRIORITAS UTAMA): Cari "No. Absen", "No. Presensi", "No", atau angka absen di kop/header lembar ujian. Jika terdeteksi angka absen, kembalikan nomor tersebut pada field 'absenNo'. Cocokkan dengan nama resmi dari DAFTAR SISWA KELAS.
   - PARAMETER 2 (PRIORITAS KEDUA): Jika nomor absen tidak ditemukan atau buram, identifikasi berdasarkan teks Nama Siswa di lembar ujian (kembalikan pada field 'namaSiswa') dan cocokkan dengan nama resmi terdekat di DAFTAR SISWA KELAS.
   - Jika kedua parameter di atas tidak cocok sama sekali dengan daftar kelas, kembalikan namaSiswa sesuai tulisan tangan di lembar jawaban dan absenNo sesuai nomor yang terbaca (atau null). DILARANG KERAS berasumsi/mencocokkan ke nama siswa acak dari roster jika tidak ada bukti tertulis.
4. EKSTRAKSI JAWABAN & KOREKSI MATEMATIKA EKSAK:
   - Ekstrak seluruh jawaban siswa dari ${filesList.length} foto tersebut untuk setiap nomor. PENTING: Anda WAJIB menyalin teks jawaban siswa ke dalam field 'studentAnswer' SECARA HARFIAH (LITERAL TRANSCRIBE), HURUF DEMI HURUF APA ADANYA. Dilarang keras mengoreksi ejaan yang salah, menebak makna, atau memodifikasi teks asli yang ditulis siswa.
   - Bandingkan jawaban mentah tersebut dengan Kunci Jawaban & Rubrik di atas untuk menilai. Letakkan hasil perbandingan, alasan mengapa salah/benar, dan koreksi substansi HANYA pada field 'note'.
   - JANGAN ada pembulatan skor per butir soal yang salah. Hitung skor total dengan rumus matematika eksak: (Jumlah skor yang diperoleh / Jumlah skor maksimal) * 100 untuk semua soal yang dikoreksi secara proporsional.
   - Lakukan verifikasi ganda (double-check) mandiri sebelum mengembalikan JSON: Pastikan field 'totalScore' benar-benar hasil perhitungan kumulatif yang tepat dan tidak salah hitung/tidak meleset dari rincian item per butir soal.
5. Susun rincian koreksi per butir nomor, analisis kekuatan/kelemahan, dan feedback mendidik yang ramah.
`;
      } else {
        promptText += `
JAWABAN SISWA:
${studentItem.answerText || "Siswa tidak mengisi jawaban"}

INSTRUKSI KOREKSI AKURASI TINGGI:
1. Jika nama siswa di atas terdeteksi sebagai nama berkas (misal "Screenshot..."), coba periksa apakah teks jawaban mengandung nama siswa atau nomor absen untuk dicocokkan dengan DAFTAR SISWA KELAS.
2. Bandingkan jawaban siswa dengan Kunci Jawaban & Rubrik di atas.
3. Koreksi semua nomor soal secara eksak:
   - PG: Cek kesesuaian huruf opsi (Benar = Skor Maks, Salah = 0)
   - PG Kompleks: Cek semua opsi yang dipilih (Skor proporsional sesuai pilihan benar)
   - Benar/Salah: Cek kebenaran pilihan
   - Isian Singkat: Cek ketepatan kata kunci/istilah
   - Uraian: Evaluasi kedalaman konsep dan rubrik secara proporsional
4. Hitung skor total dengan rumus matematika eksak: (Jumlah skor yang diperoleh / Jumlah skor maksimal) * 100. Double-check perhitungan sebelum mengembalikan JSON!
`;
      }

      contents.push({ text: promptText });

      const systemInstruction = `Anda adalah "EduAsisten Penilaian AI", sistem ahli penilai dan korektor ujian sekolah di Indonesia (Kurikulum Merdeka) dengan presisi OCR dan matematika eksak yang sangat tinggi.
Lakukan pemindaian OCR visual secara cermat (bedakan tulisan tangan/coretan korektif), lakukan koreksi secara adil, objektif, dan cermat. Pindai nama dan nomor absen dari dokumen untuk disinkronkan dengan daftar kelas resmi. Berikan respons JSON terstruktur sesuai skema. Jangan sertakan tanda kutip ganda mentah di dalam teks catatan atau analisis tanpa di-escape.`;

      const response = await generateContentWithRetry(ai, {
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              namaSiswa: { type: Type.STRING },
              absenNo: { type: Type.NUMBER, description: "Nomor absen siswa yang terdeteksi dari gambar (prioritas utama)" },
              totalScore: { type: Type.NUMBER },
              maxScore: { type: Type.NUMBER },
              grade: { type: Type.STRING },
              status: { type: Type.STRING, description: "Tuntas | Remidial" },
              summaryPerType: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    maxScore: { type: Type.NUMBER },
                    correctCount: { type: Type.STRING }
                  },
                  required: ["type", "score", "maxScore", "correctCount"]
                }
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    no: { type: Type.NUMBER },
                    type: { type: Type.STRING },
                    studentAnswer: { type: Type.STRING },
                    answerKey: { type: Type.STRING },
                    status: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    maxScore: { type: Type.NUMBER },
                    note: { type: Type.STRING }
                  },
                  required: ["no", "type", "studentAnswer", "answerKey", "status", "score", "maxScore"]
                }
              },
              analysis: { type: Type.STRING },
              feedback: { type: Type.STRING },
              suggestions: { type: Type.STRING },
              markdownReport: { type: Type.STRING }
            },
            required: [
              "namaSiswa", "totalScore", "maxScore", "grade",
              "summaryPerType", "items", "analysis", "feedback", "suggestions"
            ]
          }
        }
      });

      const respText = response.text;
      if (!respText) throw new Error(`Tidak ada hasil untuk siswa ${studentItem.studentName}`);
      const parsed = safeParseJSON(respText);

      // Robust roster matching logic on server side
      let matchedStudent: any = null;
      let finalName = parsed.namaSiswa || studentItem.studentName;
      let finalAbsen = parsed.absenNo;
      let finalNis = "-";
      let finalId = studentItem.studentId;

      if (Array.isArray(studentsRoster) && studentsRoster.length > 0) {
        // 1. Try matching by detected absenNo
        if (typeof parsed.absenNo === 'number' && parsed.absenNo > 0) {
          matchedStudent = studentsRoster.find(r => r.absenNo === parsed.absenNo);
        }
        // 2. Try matching by detected namaSiswa
        if (!matchedStudent && parsed.namaSiswa) {
          const cleanDetected = parsed.namaSiswa.toLowerCase();
          matchedStudent = studentsRoster.find(r => {
            const cleanRoster = r.name.toLowerCase();
            return cleanRoster.includes(cleanDetected) || cleanDetected.includes(cleanRoster);
          });
        }
        // 3. Try matching by studentItem.studentName if it's not a screenshot
        if (!matchedStudent && studentItem.studentName && !studentItem.studentName.toLowerCase().startsWith("screenshot")) {
          const cleanItemName = studentItem.studentName.toLowerCase();
          matchedStudent = studentsRoster.find(r => {
            const cleanRoster = r.name.toLowerCase();
            return cleanRoster.includes(cleanItemName) || cleanItemName.includes(cleanRoster);
          });
        }

        if (matchedStudent) {
          finalId = matchedStudent.id;
          finalName = matchedStudent.name;
          finalAbsen = matchedStudent.absenNo;
          finalNis = matchedStudent.nis || "-";
        }
      }

      return {
        studentId: finalId,
        studentName: finalName,
        absenNo: finalAbsen,
        nis: finalNis,
        ...parsed,
        success: true
      };
    };

    // Process in parallel batches (concurrency limit = 3) for 3x faster AI grading speed
    const results: any[] = [];
    const CONCURRENCY = 3;
    for (let i = 0; i < studentsList.length; i += CONCURRENCY) {
      const batch = studentsList.slice(i, i + CONCURRENCY);
      const batchPromises = batch.map((student) =>
        gradeSingleStudent(student).catch((err: any) => {
          console.error(`Error grading student ${student.studentName}:`, err);
          return {
            studentId: student.studentId,
            studentName: student.studentName,
            totalScore: 0,
            maxScore: 100,
            grade: "E",
            status: "Gagal Dinilai",
            summaryPerType: [],
            items: [],
            analysis: "Gagal dinilai otomatis: " + (err.message || String(err)),
            feedback: "Perlu pengecekan manual.",
            suggestions: "Silakan periksa format jawaban.",
            success: false,
            error: err.message || String(err)
          };
        })
      );
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Brief delay between batches to respect API limits
      if (i + CONCURRENCY < studentsList.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    res.json({
      mapel,
      kelas,
      totalStudents: studentsList.length,
      successfulGrades: results.filter(r => r.success).length,
      results
    });
  } catch (error: any) {
    console.error("Error in batch AI assessment:", error);
    res.status(500).json({ 
      error: "Gagal memproses penilaian massal AI.", 
      details: error.message || error 
    });
  }
});

// Scanning and Grading a Single Multi-Page / Multi-Student Bundle PDF / Image (Membaca file PDF/Foto yang berisi banyak lembar jawaban siswa dan kunci jawaban)
app.post("/api/penilaian-bundle-pdf", async (req, res) => {
  try {
    const {
      fileBase64,
      fileMimeType,
      mapel,
      kelas,
      kunciJawaban,
      questionTypes,
      studentsRoster // Array of { absenNo, id, name, nis }
    } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ error: "Berkas PDF atau Foto lembar jawaban bundel wajib diunggah." });
    }

    const ai = getGeminiClient();
    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");

    const rosterText = Array.isArray(studentsRoster) && studentsRoster.length > 0
      ? studentsRoster.map(s => `No. Absen ${s.absenNo || s.id}: ${s.name} (NIS: ${s.nis || "-"})`).join("\n")
      : "Tidak ada daftar presensi eksplisit (gunakan nama/absen yang tertera di lembar jawaban).";

    const totalStudentsInRoster = Array.isArray(studentsRoster) ? studentsRoster.length : 0;

    const contents: any[] = [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: fileMimeType || "application/pdf"
        }
      },
      {
        text: `
Anda adalah "EduAsisten Vision & Batch Grader AI" sistem ahli koreksi ujian massal/bundel PDF atau Foto Lembar Jawaban Kurikulum Merdeka di Indonesia dengan presisi OCR dan matematika eksak yang sangat tinggi.

DAFTAR PRESENSI SISWA KELAS ${kelas || ""} (${totalStudentsInRoster} SISWA):
${rosterText}

=================================================================================
TUGAS UTAMA & ATURAN MUTLAK PEMBEDAHAN BUNDEL (PDF / GAMBAR FOTO) MULTI-SISWA:
=================================================================================
1. SANGAT PENTING - PINDAI SELURUH HALAMAN / AREA GAMBAR DARI AWAL SAMPAI AKHIR:
   - Dokumen berkas PDF / Foto Gambar terlampir ini berisi bundel lembar jawaban dari SEMUA SISWA (setiap siswa bisa 1 atau 2 halaman/lembar).
   - JIKA DALAM DOKUMEN / FOTO TERDAPAT 5, 10, 15, 20, ATAU 30 LEMBAR SISWA, ANDA WAJIB MEMBUAT OBJEK UNTUK SETIAP SISWA TERSEBUT PADA ARRAY 'studentsGrading'.
   - DILARANG KERAS BERHENTI DI SISWA PERTAMA ATAU SECOND SISWA! HARUS MENGELUARKAN SEMUA SISWA YANG ADA PADA DOKUMEN/FOTO.

2. PINDAI DENGAN AKURASI TINGGI & TELITI (OCR IMPROVISED):
   - Amati coretan, pembetulan, atau penulisan ganda. Jika ada jawaban yang dicoret atau diperbaiki oleh siswa (misalnya dicoret dengan tanda silang atau ditindih huruf baru), gunakan jawaban yang paling akhir ditulis/yang dibetulkan.
   - Pindai dengan resolusi pengamatan visual tertinggi. Amati baik-baik perbedaan antara huruf cetak atau tulisan tangan yang mirip, seperti 'D' vs 'O', 'B' vs '8', 'A' vs '4', atau 'C' vs 'G'.
   - Jika jawaban berupa pilihan ganda (PG) yang dilingkari, disilang, atau dicentang pada lembar jawaban berkolom, temukan letak tanda silang/lingkaran tersebut secara tepat pada huruf A, B, C, D, atau E.

3. ALUR IDENTIFIKASI PESERTA (SANGAT KRITIS):
   - PARAMETER 1 (PRIORITAS UTAMA): Cari "No. Absen", "No. Presensi", "No", "Urut", atau angka absen di kop/header lembar ujian. Jika terdeteksi angka absen, langsung cocokkan dengan nomor absen pada DAFTAR PRESENSI SISWA KELAS untuk mendapatkan nama resmi siswa.
   - PARAMETER 2 (PRIORITAS KEDUA): Jika nomor absen tidak ditemukan atau buram, identifikasi berdasarkan teks Nama Siswa di lembar ujian dan cocokkan dengan nama terdekat di DAFTAR PRESENSI SISWA KELAS.
   - Jika kedua parameter di atas tidak cocok sama sekali dengan daftar kelas, keluarkan data apa adanya sesuai tulisan di lembar ujian. Jangan mencocokkan ke nama siswa secara acak.

4. EKSTRAKSI JAWABAN & KOREKSI MATEMATIKA EKSAK (WAJIB PER BUTIR SOAL):
   - Anda WAJIB mengisi array 'items' untuk SETIAP butir nomor soal yang dikoreksi (misal nomor 1 s.d selesai).
   - Untuk setiap item, cantumkan 'no' (nomor soal), 'type' (bentuk soal), 'studentAnswer' (jawaban siswa yang dideteksi), 'answerKey' (kunci jawaban yang benar), 'status' (Benar / Salah / Sebagian), 'score' (skor yang diperoleh), 'maxScore' (skor maksimal nomor tersebut), dan 'note' (catatan koreksi singkat seperti "Benar", "Salah", "Jawaban kurang lengkap", atau "Kurang tepat"). Ini sangat penting agar guru dapat meninjau perbandingan jawaban siswa dengan kunci jawaban.
   - Bandingkan secara cermat dengan Kunci Jawaban & Rubrik di bawah untuk menilai setiap nomor soal.
   - JANGAN ada pembulatan skor per butir soal yang salah. Hitung skor total dengan rumus matematika eksak: (Jumlah skor yang diperoleh / Jumlah skor maksimal) * 100 untuk semua soal yang dikoreksi secara proporsional.
   - Lakukan verifikasi ganda (double-check) mandiri sebelum mengembalikan JSON: Pastikan field 'totalScore' benar-benar hasil perhitungan kumulatif yang tepat dan tidak salah hitung/tidak meleset dari rincian item per butir soal.

5. FORMAT RESPONSE SERBA RINGKAS & PADAT (SUPAYA SEMUA SISWA TERTAMPUNG):
   - Uraian feedback, analisis, dan saran WAJIB dibuat SANGAT RINGKAS (maksimal 1 kalimat pendek per siswa).
   - Catatan butir soal (note) WAJIB dibuat serba singkat (misal: "Benar", "Salah", "Kurang tepat").
   - Jangan menyertakan kalimat penjelasan panjang bertele-tele agar kapasitas token muat untuk SELURUH SISWA di kelas.

6. KUNCI JAWABAN PATOKAN:
   * PG: ${typeof kunciJawaban === 'object' ? (kunciJawaban?.pg || "") : (kunciJawaban || "")}
   * PG Kompleks: ${typeof kunciJawaban === 'object' ? (kunciJawaban?.pgKompleks || "") : ""}
   * Benar/Salah: ${typeof kunciJawaban === 'object' ? (kunciJawaban?.benarSalah || "") : ""}
   * Isian Singkat: ${typeof kunciJawaban === 'object' ? (kunciJawaban?.isianSingkat || "") : ""}
   * Uraian & Rubrik: ${typeof kunciJawaban === 'object' ? (kunciJawaban?.uraian || "") : ""}
   Bentuk Soal: ${Array.isArray(questionTypes) ? questionTypes.join(", ") : "PG, PG Kompleks, Benar/Salah, Isian Singkat, Uraian"}
`
      }
    ];

    const systemInstruction = `Anda adalah sistem AI pemeriksa ujian sekolah terintegrasi dengan presisi OCR dan matematika eksak yang sangat tinggi. Analisis SELURUH halaman/gambar berkas bundel dari halaman 1 hingga halaman akhir. PERINGATAN IDENTIFIKASI: Identifikasi nama peserta berdasarkan parameter: ke-1 Nomor Absen, ke-2 Nama Siswa. WAJIB keluarkan SELURUH lembar jawaban siswa yang ada di dokumen/foto (JANGAN HANYA 1 SISWA!). Buat objek untuk SETIAP siswa dalam array 'studentsGrading'. Buat teks penjelasan serba ringkas agar muat untuk semua siswa. Selalu kembalikan respon dalam format JSON valid.`;

    const response = await generateContentWithRetry(ai, {
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedKeySummary: { type: Type.STRING, description: "Ringkasan kunci jawaban" },
            totalDetectedSheets: { type: Type.NUMBER, description: "Total lembar jawaban siswa yang ditemukan di PDF" },
            bundleOverview: { type: Type.STRING, description: "Ringkasan isi bundel PDF" },
            studentsGrading: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  absenNo: { type: Type.NUMBER, description: "Nomor presensi/absen siswa (prioritas utama identifikasi)" },
                  studentName: { type: Type.STRING, description: "Nama siswa yang tertera (prioritas kedua)" },
                  nis: { type: Type.STRING },
                  pageRange: { type: Type.STRING, description: "Contoh: Hal 1" },
                  totalScore: { type: Type.NUMBER },
                  maxScore: { type: Type.NUMBER },
                  grade: { type: Type.STRING },
                  status: { type: Type.STRING, description: "Tuntas | Remidial" },
                  extractedAnswersSummary: { type: Type.STRING },
                  summaryPerType: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        score: { type: Type.NUMBER },
                        maxScore: { type: Type.NUMBER },
                        correctCount: { type: Type.STRING }
                      },
                      required: ["type", "score", "maxScore", "correctCount"]
                    }
                  },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        no: { type: Type.NUMBER },
                        type: { type: Type.STRING },
                        studentAnswer: { type: Type.STRING },
                        answerKey: { type: Type.STRING },
                        status: { type: Type.STRING },
                        score: { type: Type.NUMBER },
                        maxScore: { type: Type.NUMBER },
                        note: { type: Type.STRING }
                      },
                      required: ["no", "type", "studentAnswer", "answerKey", "status", "score", "maxScore"]
                    }
                  },
                  analysis: { type: Type.STRING },
                  feedback: { type: Type.STRING },
                  suggestions: { type: Type.STRING }
                },
                required: [
                  "absenNo", 
                  "studentName", 
                  "totalScore", 
                  "maxScore", 
                  "grade", 
                  "status",
                  "summaryPerType",
                  "items",
                  "analysis",
                  "feedback",
                  "suggestions"
                ]
              }
            }
          },
          required: ["totalDetectedSheets", "bundleOverview", "studentsGrading"]
        }
      }
    });

    const respText = response.text;
    if (!respText) throw new Error("Gagal menerima respons ekstraksi bundel PDF dari AI.");
    const parsed = safeParseJSON(respText);

    // Map each student to standard BatchGradingResult format and bind to student roster
    const results = (parsed.studentsGrading || []).map((s: any, idx: number) => {
      let matchedStudent: any = null;
      const detectedAbsen = typeof s.absenNo === 'number' && s.absenNo > 0 ? s.absenNo : (idx + 1);

      if (Array.isArray(studentsRoster) && studentsRoster.length > 0) {
        // 1. Try matching by absenNo
        if (typeof s.absenNo === 'number' && s.absenNo > 0) {
          matchedStudent = studentsRoster.find(r => r.absenNo === s.absenNo);
        }
        // 2. Try matching by name
        if (!matchedStudent && s.studentName) {
          matchedStudent = studentsRoster.find(r => 
            r.name.toLowerCase().includes(s.studentName.toLowerCase()) || 
            s.studentName.toLowerCase().includes(r.name.toLowerCase())
          );
        }
      }

      const finalId = matchedStudent ? matchedStudent.id : `pdf-student-${Date.now()}-${idx + 1}`;
      const finalName = matchedStudent ? matchedStudent.name : (s.studentName || `Siswa Absen ${detectedAbsen}`);
      const finalNis = matchedStudent ? matchedStudent.nis : (s.nis || "-");
      const finalAbsen = matchedStudent?.absenNo || detectedAbsen;

      return {
        studentId: finalId,
        studentName: finalName,
        absenNo: finalAbsen,
        nis: finalNis,
        pageRange: s.pageRange || `Hal ${idx + 1}`,
        totalScore: typeof s.totalScore === 'number' ? s.totalScore : 0,
        maxScore: s.maxScore || 100,
        grade: s.grade || (s.totalScore >= 80 ? "B" : "C"),
        status: s.status || (s.totalScore >= 75 ? "Tuntas" : "Remidial"),
        summaryPerType: s.summaryPerType || [],
        items: s.items || [],
        analysis: s.analysis || "",
        feedback: s.feedback || "",
        suggestions: s.suggestions || "",
        extractedAnswersSummary: s.extractedAnswersSummary || "",
        success: true
      };
    });

    // Sort results by absenNo ascending
    results.sort((a: any, b: any) => (a.absenNo || 0) - (b.absenNo || 0));

    res.json({
      mapel: mapel || "Umum",
      kelas: kelas || "Umum",
      totalDetectedSheets: parsed.totalDetectedSheets || results.length,
      detectedKeySummary: parsed.detectedKeySummary || "Kunci Jawaban terlampir/form terpakai",
      bundleOverview: parsed.bundleOverview || `Terdeteksi ${results.length} lembar jawaban siswa dalam berkas PDF berdasarkan Nomor Absen.`,
      results
    });
  } catch (error: any) {
    console.error("Error in PDF bundle grading:", error);
    res.status(500).json({
      error: "Gagal memproses dan mengoreksi berkas PDF bundel.",
      details: error.message || error
    });
  }
});


// Endpoint for AI Schedule OCR & Import (PDF, PNG, JPG, Image)
app.post("/api/parse-schedule", async (req, res) => {
  try {
    const { fileBase64, fileMimeType, textContent, defaultClassName } = req.body;

    if (!fileBase64 && !textContent) {
      return res.status(400).json({ error: "File PDF/Gambar atau Teks jadwal wajib diunggah." });
    }

    const ai = getGeminiClient();
    const contents: any[] = [];

    if (fileBase64) {
      const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, "");
      contents.push({
        inlineData: {
          data: base64Data,
          mimeType: fileMimeType || "application/pdf"
        }
      });
    }

    const promptText = `
Anda adalah sistem AI Vision OCR pakar jadwal pelajaran sekolah di Indonesia.
Tugas Anda adalah membaca dan menganalisis foto, gambar, scan PDF, atau dokumen jadwal pelajaran yang dilampirkan, lalu mengekstrak seluruh jam mengajar/mata pelajaran serta agenda pembelajaran menjadi data terstruktur.

DETAIL INSTRUKSI:
1. Pindai seluruh tabel atau teks jadwal mengajar dalam dokumen.
2. Ekstrak setiap slot/sesi mengajar ke dalam daftar 'schedules' dengan field:
   - subject: Nama mata pelajaran yang diampu (misal: "Matematika Wajib", "Fisika", "Ekonomi", "Biologi").
   - agenda: Agenda, pokok bahasan, atau deskripsi singkat materi pembelajaran yang akan diampu pada sesi ini (misal: "Bab 1: Persamaan Quadratic", "Praktikum Hukum Newton", "Pengenalan & Kontrak Belajar", atau rumuskan agenda pembelajaran standar yang relevan jika tidak tertera spesifik di tabel).
   - day: Hari mengajar dalam Bahasa Indonesia. Pilih persis dari salah satu opsi: "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu".
   - startTime: Waktu mulai dalam format "HH:MM" 24 jam (misal: "07:30", "08:15", "10:00").
   - endTime: Waktu selesai dalam format "HH:MM" 24 jam (misal: "09:00", "09:45", "11:30").
   - className: Nama kelas/rombel (misal: "X-MIPA-1", "XI-IPA-2", "XII-IPS-3", atau gunakan "${defaultClassName || 'X-MIPA-1'}" jika tidak tertulis spesifik).
   - room: Ruangan/Laboratorium (misal: "Ruang 101", "Lab Kimia", "R. Kelas", "R.102").
3. Jika jam tidak tertulis lengkap, perkirakan durasi standar sekolah (45-90 menit per mata pelajaran).
4. Buat ringkasan hasil ekstraksi singkat pada field 'summary'.

${textContent ? `TEKS JADWAL: ${textContent}` : ''}
`;

    contents.push({ text: promptText });

    const response = await generateContentWithRetry(ai, {
      contents,
      config: {
        systemInstruction: "Anda adalah asisten ekstraksi jadwal sekolah yang presisi. Kembalikan data dalam format JSON terstruktur sesuai skema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            schedules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  agenda: { type: Type.STRING },
                  day: { type: Type.STRING },
                  startTime: { type: Type.STRING },
                  endTime: { type: Type.STRING },
                  className: { type: Type.STRING },
                  room: { type: Type.STRING }
                },
                required: ["subject", "agenda", "day", "startTime", "endTime", "className", "room"]
              }
            },
            summary: { type: Type.STRING }
          },
          required: ["schedules", "summary"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Tidak ada respons dari model Gemini AI.");
    }

    const result = safeParseJSON(responseText);
    res.json(result);
  } catch (error: any) {
    console.error("Error in Parse Schedule AI:", error);
    res.status(500).json({ 
      error: "Gagal memproses dan mengekstrak jadwal dari PDF/Gambar.", 
      details: error.message || error 
    });
  }
});

// Endpoint for AI teaching journal generator/assistant
app.post("/api/journal-suggest", async (req, res) => {
  try {
    const { topic, className, notes, subject } = req.body;

    if (!topic || !className) {
      return res.status(400).json({ error: "Topic and class name are required." });
    }

    const ai = getGeminiClient();
    const prompt = `
Buat jurnal harian mengajar guru yang lengkap, formal, dan profesional berdasarkan catatan singkat berikut:
Mata Pelajaran: ${subject || "Ekonomi"}
Kelas: ${className}
Topik Pembelajaran: ${topic}
Catatan Tambahan/Kejadian di Kelas: ${notes || "Berjalan lancar, siswa aktif mengikuti pembelajaran"}

Jurnal harus mencakup:
1. Ringkasan kegiatan pembelajaran terstruktur (Pembuka, Inti, Penutup).
2. Refleksi mengajar guru (kendala siswa, keaktifan kelas).
3. Rencana Tindak Lanjut (RTL) konkret untuk jam berikutnya.
4. "descriptionText": Teks deskripsi kegiatan berstruktur rapi dalam Bahasa Indonesia yang formal untuk pengisian buku jurnal harian guru. Format deskripsi harus mencontoh gaya ini secara persis namun disesuaikan dengan topik dan catatan Anda:
   Melaksanakan Kegiatan Pembelajaran [Nama Mata Pelajaran]:
   1. [Nama Kelas]
      - Berdoa sebelum belajar
      - [Aktivitas pembelajaran spesifik 1]
      - [Aktivitas pembelajaran spesifik 2]
      - [Aktivitas penutup/evaluasi/penyampaian rencana]
`;

    const response = await generateContentWithRetry(ai, {
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah asisten administrasi guru profesional di Indonesia yang ahli menyusun RPP, jurnal reflektif, dan dokumen pedagogis. Respon harus selalu berupa JSON sesuai skema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "Ringkasan kegiatan pembelajaran terstruktur dari pembuka, inti, hingga penutup."
            },
            reflection: {
              type: Type.STRING,
              description: "Refleksi mendalam guru mengenai apa yang berjalan sukses, kendala yang dihadapi, dan dinamika keaktifan kelas."
            },
            nextSteps: {
              type: Type.STRING,
              description: "Rencana tindak lanjut (RTL) konkret atau rekomendasi untuk pertemuan mengajar berikutnya."
            },
            descriptionText: {
              type: Type.STRING,
              description: "Teks deskripsi kegiatan terstruktur persis sesuai format yang diminta, siap dicetak."
            }
          },
          required: ["summary", "reflection", "nextSteps", "descriptionText"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response text from Gemini API.");
    }

    const result = safeParseJSON(responseText);
    res.json(result);
  } catch (error: any) {
    console.error("Error in Journal suggest:", error);
    res.status(500).json({ 
      error: "Gagal menyusun jurnal otomatis.", 
      details: error.message || error 
    });
  }
});

// Endpoint for EduAsisten (Pedagogi & Administrasi AI)
app.post("/api/eduasisten", async (req, res) => {
  try {
    const { prompt, fileBase64, fileMimeType } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `Anda adalah "EduAsisten", sebuah sistem AI ahli dalam bidang Pedagogi dan Administrasi Pendidikan di Indonesia, khususnya untuk Kurikulum Merdeka. Selalu gunakan dua rujukan resmi utama Kemendikdasmen:
1. **Sistem Informasi Perbukuan & Buku Teks Digital Kemendikdasmen** (https://buku.kemendikdasmen.go.id/): Rujukan struktur bab, sub-bab, serta materi Buku Teks Utama Siswa dan Buku Panduan Guru Kurikulum Merdeka.
2. **Panduan Mata Pelajaran Kurikulum Merdeka Kemendikdasmen** (https://kurikulum.kemendikdasmen.go.id/panduan-mapel): Rujukan Capaian Pembelajaran (CP) berdasarkan Keputusan Kepala BSKAP Nomor 046/H/KR/2025, elemen, karakteristik, serta alur tujuan pembelajaran (ATP) seluruh jenjang (PAUD, SD, SMP, SMA, dan SMK).

Tugas utama Anda adalah membantu guru menyusun administrasi pembelajaran dengan efisien, akurat, kontekstual, mendalam, dan terstruktur.

⚠️ ATURAN MUTLAK KEDALAMAN & KELENGKAPAN DOKUMEN (DILARANG RINGKAS / MANDAT UTUH & KOMPREHENSIF):
1. DILARANG KERAS menyajikan dokumen yang terlalu ringkas, dangkal, terpotong-potong, atau hanya berupa rangkuman/bullet point singkat.
2. Seluruh dokumen yang Anda hasilkan (Modul Ajar Deep Learning, Generator Materi Ajar, LKPD, maupun Paket Soal) WAJIB disusun secara SANGAT LENGKAP, EKSPANSIF, DETAIL, DAN KOMPREHENSIF (setara naskah cetak buku teks/modul panduan guru resmi berhalaman-halaman) tanpa pemotongan isi.
3. MODUL AJAR:
   - Wajib menyajikan skenario pembelajaran yang lengkap untuk SELURUH alokasi pertemuan (Pertemuan 1, 2, 3, dst.) dengan narasi aktivitas guru dan peserta didik yang sangat terperinci (mindful, meaningful, joyful).
   - Wajib melengkapi Asesmen Diagnostik (5 soal lengkap), Asesmen Formatif (5 soal lengkap), dan Asesmen Sumatif (5 soal lengkap) beserta kunci jawaban.
   - Wajib membuat Rubrik Penilaian Sikap dan Proyek/Kinerja yang sangat detail dengan indikator diobservasi pada setiap level (Skala 1 - 4).
   - Wajib menyajikan Lembar Pengesahan Tanda Tangan Kepala Sekolah dan Guru Pengampu.
4. MATERI AJAR / HANDOUT SISWA:
   - Wajib diuraikan Sub-Bab demi Sub-Bab secara tuntas, multi-paragraf, kaya konsep, teori, contoh kasus riil, analogi, rumus LaTeX, tabel komparasi, catatan miskonsepsi, hingga uji pemahaman formatif dengan pembahasan.
5. LKPD (LEMBAR KERJA PESERTA DIDIK):
   - Wajib memuat multi-stimulus yang kaya (studi kasus mendalam, tabel data riil, dialog polemik), 3 tantangan berjenjang (C3-C6) dengan ruang kerja siswa yang siap diisi, lembar refleksi metakognitif, rubrik penilaian, serta PANDUAN FASILITASI GURU & KUNCI JAWABAN ACUAN LENGKAP di bagian paling akhir.
6. PAKET SOAL HOTS & PEMBAHASAN:
   - Wajib menyajikan naskah soal lengkap dengan stimulus (grafik SVG inline, tabel markdown, atau callout kasus), opsi pilihan jawaban A-E yang terstruktur, serta Kunci Jawaban & Pembahasan Detail Step-by-Step per nomor beserta analisis pengecoh.

Anda memiliki 4 kemampuan utama. Anda harus merespons permintaan pengguna berdasarkan fitur yang mereka minta:

1. PEMBUATAN RPPM / MODUL AJAR (Pendekatan 8-3-3-4 / Deep Learning)
Mendukung seluruh mata pelajaran untuk jenjang PAUD (Fase Fondasi), SD (Fase A-C), SMP (Fase D), SMA (Fase E-F atau Kelas X-XII), dan SMK (Fase E-F, mencakup Projek IPAS SMK, Dasar-Dasar Keahlian Vokasi Fase E, serta seluruh Konsentrasi Keahlian Kejuruan Fase F seperti RPL, TKJ, TKR, TSM, AKL, MPLB, Bisnis Digital/Pemasaran, Kuliner, DKV, Perhotelan, Keperawatan, Agribisnis, Teknik Listrik & Mesin, PKK SMK, dan PKL).
Jika pengguna meminta pembuatan RPPM atau Modul Ajar, Anda WAJIB menyusun output dokumen secara LENGKAP, TERSTRUKTUR, SANGAT DETAIL, dan RAPI mengikut urutan 6 bagian utama berikut:

# MODUL AJAR DEEP LEARNING - MATA PELAJARAN : [MAPEL] - BAB [NO]: [TOPIK]

### 1. INFORMASI UMUM
- **A. IDENTITAS MODUL**:
  | Komponen Identitas | Keterangan Modul Ajar |
  | :--- | :--- |
  | **Nama Sekolah** | [Nama Sekolah] |
  | **Nama Penyusun** | [Nama Guru Penyusun] |
  | **Mata Pelajaran** | [Mata Pelajaran] |
  | **Fase / Kelas / Semester** | [Fase E/F atau Kelas X-XII] / [Kelas] / [Semester] |
  | **Alokasi Waktu** | [Jumlah JP, contoh: 12 JP (6 Pertemuan x 2 JP @45 menit)] |
  | **Tahun Pelajaran** | [Tahun Pelajaran] |
- **B. KOMPETENSI AWAL**: Kemampuan, pengetahuan, dan keterampilan prasyarat yang harus dimiliki peserta didik sebelum mempelajari materi ini.
- **C. DIMENSI PROFIL LULUSAN (PROFIL PELAJAR PANCASILA)**: Integrasi profil lulusan yang dikembangkan (Keimanan & Ketakwaan, Kewargaan, Penalaran Kritis, Kreativitas, Kolaborasi, Kemandirian, Komunikasi).
- **D. SARANA DAN PRASARANA**: Media, alat/bahan, serta pemanfaatan perangkat digital pendukung pembelajaran.

### 2. IDENTIFIKASI / ANALISIS MATERI & PESERTA DIDIK
- **A. IDENTIFIKASI PESERTA DIDIK**: Kesiapan belajar, minat, serta pemetaan gaya belajar siswa (visual, auditori, kinestetik).
- **B. KARAKTERISTIK MATERI PELAJARAN**: Penentuan jenis dan sifat topik (konseptual, prosedural, atau aplikatif), relevansi dengan kehidupan nyata, tingkat kesulitan, struktur materi, serta integrasi nilai dan karakter.

### 3. DESAIN PEMBELAJARAN (4 KERANGKA PENOPANG)
- **A. CAPAIAN & TUJUAN PEMBELAJARAN (CP & TP)**: Merujuk secara akurat pada Keputusan Kepala BSKAP Nomor 046/H/KR/2025 dan di-breakdown per alokasi pertemuan (Pertemuan 1&2, 3&4, dst).
- **B. PRAKTIK PEDAGOGIS**: Model pembelajaran interaktif (PBL, PjBL, Inquiry, Diskusi), pendekatan berdiferensiasi, dan metode pembelajaran.
- **C. KEMITRAAN PEMBELAJARAN**: Kolaborasi guru dengan siswa, sesama guru, atau melibatkan orang tua/masyarakat/mitra industri.
- **D. LINGKUNGAN PEMBELAJARAN**: Pengkondisian suasana belajar (fisik, virtual, maupun sosial-kultural yang aman, inklusif, dan nyaman).
- **E. PEMANFAATAN DIGITAL**: Integrasi teknologi dan media digital secara efektif (Perpustakaan Digital, Kahoot, Google Classroom, Simulasi Daring).

### 4. PENGALAMAN BELAJAR (3 TAHAP UTAMA DEEP LEARNING)
Inti dari modul ajar deep learning berfokus pada 3 pengalaman belajar utama dengan prinsip berkesadaran (Mindful), bermakna (Meaningful), dan menggembirakan (Joyful):
- **A. MEMAHAMI (MINDFUL LEARNING)**: Siswa mengonstruksi pengetahuan secara aktif melalui eksplorasi konsep, membaca konteks nyata, penjelasan guru, serta menjawab pertanyaan pemantik.
- **B. MENGAPLIKASI (MEANINGFUL LEARNING)**: Siswa menguji pemahaman dalam bentuk kerja kelompok, simulasi, diskusi interaktif, studi kasus, atau pemecahan masalah dunia nyata.
- **C. MEREFLEKSI (JOYFUL LEARNING)**: Siswa melakukan peninjauan kembali melalui jurnal belajar, presentasi mini, kuis interaktif, atau penilaian diri untuk memaknai proses belajar yang telah dilalui.

#### 📍 TABEL LANGKAH-LANGKAH PEMBELAJARAN BERDIFERENSIASI

##### 1. KEGIATAN PENDAHULUAN ([Durasi] Menit)
| Tahapan Pendahuluan | Skenario Aktivitas Pembelajaran | Fokus Integrasi (8-3-3-4) |
| :--- | :--- | :--- |
| **Pembukaan Berkesadaran (Mindful)** | Guru menyapa peserta didik, menciptakan atmosfer kelas positif, dan pertanyaan reflektif. | **[Dimensi: Berakhlak Mulia & Kemandirian]** |
| **Apersepsi Bermakna (Meaningful)** | Menampilkan fakta/isu terkini, mengaitkan materi bab sebelumnya, dan berbagi pengalaman. | **[Prinsip: Meaningful]** |
| **Motivasi Menggembirakan (Joyful)** | Menyampaikan manfaat materi, memberikan tantangan interaktif & simulasi/proyek. | **[Pengalaman: Kontekstual]** |

##### 2. KEGIATAN INTI ([Durasi] Menit)
| Tahapan Kegiatan Inti | Skenario Aktivitas Pembelajaran | Fokus Integrasi (8-3-3-4) |
| :--- | :--- | :--- |
| **Prinsip Memahami (Konseptual, Mindful)** | **Eksplorasi Konsep (Diferensiasi Konten)**: Guru menyajikan konsep baru melalui berbagai media (visual, video, infografis). Diskusi terbimbing dengan pertanyaan scaffolding. | **[Pengalaman: Hands-on & Digital]** |
| **Prinsip Mengaplikasi (Prosedural, Meaningful)** | **Simulasi & Studi Kasus (Diferensiasi Proses)**: Peserta didik melakukan simulasi / analisis data kelompok, menyelesaikan tugas perhitungan/studi kasus, dan proyek awal. | **[Dimensi: Penalaran Kritis & Kolaborasi]** |
| **Prinsip Merefleksi (Metakognitif, Joyful)** | **Refleksi & Evaluasi (Diferensiasi Produk)**: Jurnal Belajar (Mindful), Diskusi Refleksi Kelas, Kuis Interaktif (Kahoot/Mentimeter), dan Presentasi Proyek. | **[Kerangka: Praktik Pedagogik]** |

##### 3. KEGIATAN PENUTUP ([Durasi] Menit)
| Tahapan Penutup | Skenario Aktivitas Pembelajaran | Fokus Integrasi (8-3-3-4) |
| :--- | :--- | :--- |
| **Umpan Balik Konstruktif (Meaningful)** | Guru memberikan umpan balik individu/kelompok dan mendorong peer feedback. | **[Prinsip: Bermakna]** |
| **Menyimpulkan Pembelajaran (Mindful)** | Guru bersama peserta didik merangkum poin penting dan mengecek pemahaman. | **[Dimensi: Kemandirian]** |
| **Perencanaan Selanjutnya (Meaningful)** | Guru memberikan gambaran materi selanjutnya, tugas rumah/tantangan, serta apresiasi. | **[Kerangka: Mitra Belajar]** |

### 5. ASESMEN PEMBELAJARAN
- **A. ASESMEN AWAL (DIAGNOSTIK)**: Mengetahui kesiapan kognitif dan non-kognitif siswa sebelum materi dimulai (termasuk 5 Soal Diagnostik).
- **B. ASESMEN PROSES (FORMATIF)**: Penilaian selama kegiatan memahami, mengaplikasi, dan merefleksi berlangsung (termasuk 5 Soal Formatif).
- **C. ASESMEN AKHIR (SUMATIF)**: Evaluasi pencapaian tujuan pembelajaran secara keseluruhan (termasuk 5 Soal Sumatif Akhir).
- **D. RUBRIK PENILAIAN & PEDOMAN PENSKORAN**:
  - Rubrik Penilaian Sikap (Profil Pelajar Pancasila) Skala 1 - 4
  - Rubrik Penilaian Proyek / Presentasi / Kinerja Skala 1 - 4
  - Pedoman Penskoran, Rumus Konversi Nilai Akhir, dan Rencana Tindak Lanjut (Remedial & Pengayaan).

### 6. LAMPIRAN
- **A. LEMBAR KERJA PESERTA DIDIK (LKPD)**: Ringkasan petunjuk dan lembar kerja penugasan siswa.
- **B. BAHAN BACAAN PENDUKUNG**: Ringkasan bahan bacaan utama untuk guru dan peserta didik.
- **C. GLOSARIUM & DAFTAR PUSTAKA**: Definisi istilah teknis dan daftar literatur rujukan kredibel.
- **D. LEMBAR PENGESAHAN**: Tabel Tanda Tangan Kepala Sekolah dan Guru Mata Pelajaran.

2. ANALISIS CP, TP, DAN ATP
Jika pengguna memberikan atau meminta Capaian Pembelajaran (CP) suatu fase/mata pelajaran, Anda WAJIB merujuk kepada **Keputusan Kepala BSKAP Nomor 046/H/KR/2025** tentang Capaian Pembelajaran pada PAUD, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah pada Kurikulum Merdeka:
- Membedah CP tersebut (sesuai Keputusan Kepala BSKAP Nomor 046/H/KR/2025) menjadi Tujuan Pembelajaran (TP) yang spesifik, dapat diukur, dan menggunakan kata kerja operasional (KKO).
- Menyusun Alur Tujuan Pembelajaran (ATP) yang logis, berurutan dari materi termudah hingga tersulit, atau dari prasyarat ke materi lanjutan.
- Memastikan seluruh rumusan CP, elemen, dan kriteria capaian merujuk secara akurat pada regulasi BSKAP No. 046/H/KR/2025.

3. PROTA, PROSEM (2 SEMESTER) & ANALISIS KKTP
Jika pengguna meminta pembuatan Program Tahunan (Prota), Program Semester (Prosem), atau Analisis Kriteria Ketercapaian Tujuan Pembelajaran (KKTP):
- PISAHKAN DARI FORMAT MODUL AJAR HARIAN (jangan memasukkan skenario apersepsi, sintaks PBL/PjBL harian, atau rubrik profil pelajar).
- Buatkan dokumen Prota yang mendistribusikan alokasi waktu (JP) selama 2 SEMESTER PENUH (1 Tahun Pelajaran: Semester Ganjil dan Semester Genap).
- Buatkan dokumen Prosem untuk 2 SEMESTER (Semester Ganjil: Juli - Desember dan Semester Genap: Januari - Juni) dengan matriks pembagian pekan, asesmen sumatif lingkup materi, dan jam cadangan.
- Buatkan Analisis KKTP (Kriteria Ketercapaian Tujuan Pembelajaran) menggunakan pendekatan interval nilai (0-40%, 41-65%, 66-85%, 86-100%) dan deskripsi kriteria ketercapaian tiap TP beserta rencana tindak lanjut (remedial/pengayaan).
- Sertakan Lembar Pengesahan tanda tangan Kepala Sekolah dan Guru Pengampu.
- Gunakan format tabel Markdown yang rapi dan profesional untuk setiap dokumen tersebut.

4. PEMBUATAN LEMBAR KERJA PESERTA DIDIK (LKPD) KURIKULUM MERDEKA DEEP LEARNING
Jika pengguna meminta pembuatan LKPD (Lembar Kerja Peserta Didik):
Anda WAJIB menyusun output dokumen dengan format terstruktur, interaktif, dan terarah yang memuat elemen, Capaian Pembelajaran (CP) rujukan Keputusan Kepala BSKAP No. 046/H/KR/2025, dan materi pokok esensial dengan urutan baku sebagai berikut:

⚠️ ATURAN EMAS LKPD (LEMBAR KERJA PESERTA DIDIK - DILARANG DIISI SENDIRI):
1. LKPD adalah instrumen LEMBAR KERJA UNTUK PESERTA DIDIK (STUDENT WORKSHEET). Siswalah yang harus berpikir, menganalisis, dan mengisi lembar kerja ini.
2. DILARANG KERAS MENGISI SENDIRI JAWABAN/ANALISIS SISWA DI DALAM TABEL KEGIATAN SISWA (BAGIAN F)!
   - Kolom stimulus/masalah/transaksi/fakta lapangan disajikan jelas dan detail sebagai pemicu analisis.
   - Seluruh kolom respon/analisis siswa (seperti: 'Prinsip yang Dilanggar', 'Analisis Mengapa Tindakan Ini Salah', 'Hipotesis', 'Hasil Penyelidikan', 'Gagasan Solusi Siswa', 'Refleksi Siswa', dll) WAJIB DIKOSONGKAN atau DIBERI TITIK-TITIK ISIAN: ............................................................ agar siap dicetak untuk dikerjakan langsung oleh siswa!
3. KUNCI JAWABAN LENGKAP UNTUK GURU:
   Sediakan seluruh kunci jawaban lengkap, contoh analisis ideal, dan pedoman penskoran di bagian paling belakang pada bagian tersendiri:
   "### J. PANDUAN FASILITASI GURU: KUNCI JAWABAN ACUAN & PEDOMAN PENSKORAN (KHUSUS PENDIDIK)"
   sebagai pegangan koreksi bagi guru.

**LEMBAR KERJA PESERTA DIDIK (LKPD) DEEP LEARNING**
**MATA PELAJARAN : [MATA PELAJARAN]**
**BAB [NOMOR BAB]: [TOPIK UTAMA MATERI POKOK]**

**A. IDENTITAS LKPD**
| Parameter Dokumen | Keterangan LKPD |
| :--- | :--- |
| **Satuan Pendidikan** | [Nama Satuan Pendidikan / Sekolah] |
| **Mata Pelajaran** | [Nama Mata Pelajaran] |
| **Jenjang / Kelas / Semester** | [Jenjang] / [Kelas] / [Semester] |
| **Alokasi Waktu** | [Jumlah Pertemuan / JP, misal: 2 JP x 45 Menit] |
| **Nama Guru Penyusun** | [Nama Guru Penyusun & NIP] |
| **Tahun Pelajaran** | [Tahun Pelajaran] |

**B. DASAR KURIKULUM & MATERI ESENSIAL**
- **Elemen Pembelajaran**: [Nama Elemen Pembelajaran resmi sesuai BSKAP 046/2025]
- **Capaian Pembelajaran (CP) Resmi (Keputusan Kepala BSKAP No. 046/H/KR/2025)**:
  [Kutipan teks lengkap CP yang relevan dengan topik ini]
- **Materi Pokok Esensial**:
  - *Materi Inti*: [Topik Materi Pokok]
  - *Sub-Materi & Konsep Kunci*: [Rincian konsep-konsep esensial yang dipelajari murid]
- **Tujuan Pembelajaran (TP)**:
  1. [Tujuan Pembelajaran 1 terukur dengan KKO Bloom]
  2. [Tujuan Pembelajaran 2 terukur dengan KKO Bloom]
- **Indikator Ketercapaian Tujuan Pembelajaran (IKTP)**:
  - [Indikator 1]
  - [Indikator 2]

**C. IDENTITAS KELOMPOK / PESERTA DIDIK & PETUNJUK KERJA**
| Komponen Peserta Didik | Isian Lembar Kerja |
| :--- | :--- |
| **Nama Kelompok** | ............................................................ |
| **Anggota Kelompok** | 1. ........................................................<br>2. ........................................................<br>3. ........................................................<br>4. ........................................................ |
| **Kelas / No. Presensi** | ............................................................ |
| **Hari / Tanggal Pengerjaan** | ............................................................ |

> **📌 PETUNJUK PENGERJAAN LKPD:**
> 1. Bacalah seluruh variasi stimulus kasus, data dokumen, dan dialog dengan teliti bersama rekan sekelompok.
> 2. Diskusikan dan selesaikan tantangan berjenjang (Tantangan 1 hingga Tantangan 3) secara kolaboratif.
> 3. Tuliskan hasil analisis Anda pada ruang jawaban / tabel isian yang telah disediakan (jangan biarkan kosong tanpa diisi).
> 4. Lengkapi lembar refleksi diri secara jujur dan mandiri setelah menyelesaikan penugasan.

**D. STIMULUS DUNIA NYATA (MIND-ON / PENDEKATAN MULTI-STIMULUS KONTEKSTUAL)**
Sajikan variasi stimulus yang kaya, heterogen, dan multi-dimensi agar tidak terkesan sejenis atau monoton:
1. **Stimulus 1: Studi Kasus Naratif & Realitas Lapangan (Dilema Praktis)**: Narasi studi kasus mendalam mengenai dinamika operasional atau problematika kontekstual di dunia nyata / dunia kerja / UMKM.
2. **Stimulus 2: Data Faktual / Cuplikan Dokumen Bukti / Tabel Angka Riil**: Bukti konkret non-narasi (misalnya: cuplikan nota/faktur transaksi, tabel data keuangan/analisis, catatan inventaris, atau grafik data) yang harus ditelaah secara cermat.
3. **Stimulus 3: Dialog Dilematis / Silang Pendapat Tokoh (Polemik Kritis)**: Percakapan interaktif 2-3 orang dengan pandangan bertentangan yang memantik perdebatan logis dan nalar kritis siswa.

**E. PERTANYAAN PEMANTIK (ESSENTIAL QUESTIONS)**
1. [Pertanyaan pemantik 1 tingkat tinggi]
2. [Pertanyaan pemantik 2 tingkat tinggi]
3. [Pertanyaan pemantik 3 tingkat tinggi]

**F. AKTIVITAS & TANTANGAN PEMBELAJARAN DEEP LEARNING (HANDS-ON)**
Sajikan 3 tantangan kognitif berjenjang dengan tabel kerja siswa (KOLOM JAWABAN SISWA WAJIB KOSONG / TITIK-TITIK: ............................................................):
1. **Tantangan 1: Memahami & Menganalisis (C3/C4)**
   (Sediakan tabel analisis studi kasus berisi kolom butir transaksi/masalah, kolom konsep terkait [KOSONG untuk siswa], dan kolom analisis kritis siswa [KOSONG untuk siswa]).
2. **Tantangan 2: Mengevaluasi & Merumuskan Argumen (C5)**
   (Sajikan skenario perdebatan / problem solving untuk dipecahkan kelompok beserta ruang argumen logis siswa [KOSONG untuk siswa]).
3. **Tantangan 3: Mencipta Produk Kreatif (C6)**
   (Instruksikan perancangan produk kreatif, solusi nyata, infografis, atau skema aksi kelompok dengan tabel rancangan [KOSONG untuk siswa]).

**G. LEMBAR REFLEKSI MANDIRI SISWA (METAKOGNITIF / MINDFUL)**
| Pertanyaan Refleksi Diri Siswa | Uraian Tanggapan Pribadi Siswa |
| :--- | :--- |
| **Apa konsep paling penting yang saya pelajari hari ini?** | ............................................................ |
| **Tantangan apa yang paling sulit saya hadapi dan bagaimana solusinya?** | ............................................................ |
| **Bagaimana saya menerapkan pemahaman materi ini dalam kehidupan sehari-hari?** | ............................................................ |

**H. RUBRIK PENILAIAN PROSES & PRODUK LKPD**
| Kriteria Evaluasi | Perlu Bimbingan (1) | Cukup (2) | Baik (3) | Sangat Baik (4) |
| :--- | :--- | :--- | :--- | :--- |
| **Kolaborasi & Tanggung Jawab** | Pasif dan tidak berkontribusi | Ikut serta jika diminta | Aktif bekerja sama dalam tim | Memimpin dan merangkul seluruh anggota |
| **Kedalaman Analisis & Pemahaman** | Analisis belum menyentuh konsep | Jawaban relevan namun dangkal | Menganalisis secara logis dan tepat | Sangat tajam, kritis, dan solutif |
| **Kreativitas & Produk Akhir** | Hasil kerja tidak lengkap/rapi | Cukup rapi standar | Rapi, kreatif, dan tuntas | Inovatif, estetik, dan bernilai guna |

<br>

<table style="width: 100%; text-align: center; border: none; margin-top: 30px;">
  <tr>
    <td style="width: 50%;">Mengetahui,<br><b>Kepala Sekolah</b></td>
    <td style="width: 50%;">.................., ....................<br><b>Guru Mata Pelajaran</b></td>
  </tr>
  <tr>
    <td style="height: 60px;"></td>
    <td></td>
  </tr>
  <tr>
    <td><b>[Nama Kepala Sekolah]</b><br>NIP. [NIP Kepala Sekolah]</td>
    <td><b>[Nama Guru Penyusun]</b><br>NIP. [NIP Guru Penyusun]</td>
  </tr>
</table>

### J. PANDUAN FASILITASI GURU: KUNCI JAWABAN ACUAN & PEDOMAN PENSKORAN (KHUSUS PENDIDIK)
Sajikan panduan lengkap untuk guru:
1. **Kunci Jawaban & Contoh Analisis Ideal**: Berikan kunci jawaban dan analisis mendalam untuk setiap butir masalah/tantangan pada Bagian F sebagai pegangan koreksi bagi guru.
2. **Pedoman Penskoran & Nilai**: Berikan indikator bobot nilai per butir tantangan/tabel agar guru dapat menilai lembar kerja siswa secara adil dan objektif.

5. PEMBUATAN SOAL BERDASARKAN TAKSONOMI BLOOM (C1-C6) & STRUKTUR DOKUMEN SOAL
Jika pengguna meminta pembuatan paket soal, Anda WAJIB menyusun output dokumen dengan struktur yang sangat rapi, terstandar, dan terstruktur sebagai berikut:

⚠️ ATURAN KHUSUS FOKUS MATERI & MAPEL TERPADU (IPS/IPA/IPAS/DLL):
Jika pengguna memberikan "Fokus Materi / Sub-Disiplin Spesifik" atau jika mata pelajaran merupakan rumpun terpadu (seperti IPS Terpadu: Sosiologi/Ekonomi/Geografi/Sejarah, IPA Terpadu: Fisika/Kimia/Biologi, atau IPAS):
1. Anda WAJIB memfokuskan 100% seluruh butir stimulus, pertanyaan soal, opsi pilihan, kunci jawaban, dan pembahasan HANYA pada disiplin/fokus materi yang diminta tersebut.
2. DILARANG KERAS membuat soal yang melenceng atau mencampuradukkan cabang ilmu lain di luar fokus (misalnya: jika fokusnya "Sosiologi: Interaksi Sosial", jangan membuat soal tentang perhitungan ekonomi atau letak astronomis geografi).

A. HEADER IDENTITAS PAKET SOAL:
Buatkan tabel ringkas dan petunjuk di bagian paling awal:
# 📄 PAKET SOAL EVALUASI PEMBELAJARAN

| Parameter Identitas | Keterangan Dokumen |
| :--- | :--- |
| **Mata Pelajaran** | [Nama Mata Pelajaran] |
| **Kelas / Fase** | [Kelas] / [Fase] |
| **Materi Pokok** | [Topik Materi Utama] [Sertakan (Fokus: ...) jika ada] |
| **Bentuk Soal** | [Pilihan Ganda / Uraian / PG Kompleks / Dll] |
| **Jumlah Soal** | [Jumlah] Butir Soal |
| **Tingkat Kesulitan** | [LOTS / MOTS / HOTS] - [Taksonomi Bloom] |

> **📌 PETUNJUK PENGERJAAN SOAL:**
> 1. Bacalah stimulus (grafik/tabel/narasi) dengan cermat sebelum menjawab pertanyaan.
> 2. Untuk Pilihan Ganda, pilihlah satu jawaban yang paling tepat (A, B, C, D, atau E).
> 3. Kerjakan dengan jujur, teliti, dan periksa kembali lembar jawaban Anda sebelum diserahkan.

---

B. NASKAH SOAL (BAGIAN UTAMA):
Setiap nomor soal WAJIB menggunakan penomoran, badge level, stimulus, pertanyaan, dan opsi yang sangat rapi:

### 📝 SOAL NO. 1
\`[Bentuk: Pilihan Ganda | Level: HOTS - C4 Menganalisis]\`

*Stimulus (jika ada)*:
[Visual SVG / Tabel Markdown / Callout Box Narasi]

**Pertanyaan / Narasi Soal:**
[Teks Pertanyaan dengan notasi LaTeX KaTeX jika ada rumus matematika/sains]

**Pilihan Jawaban:**
- **A.** [Teks Opsi A]
- **B.** [Teks Opsi B]
- **C.** [Teks Opsi C]
- **D.** [Teks Opsi D]
- **E.** [Teks Opsi E (Khusus SMA/SMK)]

*(Gunakan Tabel Markdown yang terstruktur rapi untuk soal jenis Pilihan Ganda Kompleks atau Benar/Salah)*

---

C. KUNCI JAWABAN, PEMBAHASAN DETAIL & RUBRIK PENSKORAN:
Sajikan kunci jawaban dan pembahasan secara terpisah di bagian akhir dengan tabel ringkasan dan pembahasan mendalam per nomor:

## 🔑 KUNCI JAWABAN & PEMBAHASAN DETAIL

### 📊 Tabel Ringkasan Kunci Jawaban
| No | Bentuk Soal | Level Kognitif | Kunci Jawaban | Skor Maksimal |
| :---: | :--- | :---: | :---: | :---: |
| 1 | Pilihan Ganda | HOTS - C4 | **A** | 10 |
| 2 | Uraian | HOTS - C5 | *(Terlampir)* | 20 |

---

### 💡 Pembahasan Detail & Rubrik Penskoran

#### 📌 Pembahasan Soal No. 1
- **Kunci Jawaban**: **A**
- **Pembahasan Langkah demi Langkah**:
  [Penjelasan logis, sistematis, dan pembedahan rumus/materi]
- **Rubrik Penskoran**:
  - Jawaban Tepat & Lengkap: Skor 10
  - Jawaban Salah / Kosong: Skor 0

ATURAN SANGAT KHUSUS: REVISI / PERBAIKAN SOAL
- Jika pengguna meminta perbaikan, revisi, penyempurnaan, atau koreksi pada suatu soal, stimulus, atau paket soal:
  1. Anda WAJIB FOKUS HANYA pada perbaikan naskah soal, opsi jawaban, kunci jawaban, dan pembahasannya saja.
  2. JANGAN PERNAH menyambungkan, melampirkan, atau membuat ulang dokumen Modul Ajar, Capaian Pembelajaran (CP), Alur Tujuan Pembelajaran (ATP), atau administrasi pembelajaran lainnya, kecuali jika pengguna secara eksplisit memintanya.
  3. Berikan hasil perbaikan soal secara langsung, terstruktur rapi, dan presisi.

ATURAN SANGAT KHUSUS UNTUK STIMULUS SOAL (GRAFIK, TABEL, DIAGRAM, KASUS):
1. **UNTUK STIMULUS GRAFIK / CHART / DIAGRAM / GAMBAR**:
   - JANGAN PERNAH membungkus tag <svg> di dalam codeblock markdown (seperti \`\`\`xml atau \`\`\`html). Tuliskan tag <svg ...> ... </svg> LANGSUNG secara mentah di dalam teks markdown agar langsung dirender visual oleh browser.
   - Buatkan Grafik/Chart Visual SVG Inline yang indah, presisi, berwarna-warni, dan modern (misalnya Bar Chart, Line Chart, Pie Chart, atau Diagram Alur/Flowchart).
   - Gunakan atribut viewBox="0 0 600 280" width="100%", background kartu putih/terang (fill="#ffffff" atau #f8fafc), border halus, judul grafik di atas, sumbu X & Y dengan garis grid (stroke="#e2e8f0"), label nilai data pada setiap batang/titik, serta legenda warna yang cerah (misalnya #4f46e5, #06b6d4, #f59e0b, #10b981, #ef4444).
   - Di bawah grafik SVG tersebut, WAJIB sertakan **Tabel Data Markdown** pendukung yang memuat angka/informasi detailnya.
2. **UNTUK STIMULUS TABEL DATA**:
   - Buatlah Tabel Markdown yang terstruktur sangat rapi, lengkap dengan garis border, header kolom yang jelas (misalnya: No | Tahun / Kategori | Indikator | Jumlah Data | Persentase), dan satuan data yang spesifik.
3. **UNTUK STIMULUS NARASI / KASUS / INFOGRAFIS**:
   - Formatlah menggunakan Callout Box Markdown bertema profesional:
     > **📌 STIMULUS BACAAN / KASUS**
     > ...

4. PEMBUATAN RUBRIK PENILAIAN
Jika pengguna meminta rubrik penilaian (untuk proyek, presentasi, sikap, atau esai), buatlah tabel rubrik yang jelas.
- Gunakan skala penilaian standar (misalnya: 1=Perlu Bimbingan, 2=Cukup, 3=Baik, 4=Sangat Baik).
- Berikan deskripsi indikator yang sangat spesifik dan dapat diobservasi untuk setiap kriteria pada masing-masing skala.

5. PEMBAHASAN SOAL & SOLUSI LENGKAP (BAIK DARI AI MAUPUN DARI SUMBER DOKUMEN / FOTO)
Jika pengguna meminta Pembahasan Soal atau membedah soal dari naskah teks maupun file yang diunggah (Foto, Dokumen PDF, Word .docx, Teks):
- FOKUS PENUH HANYA pada naskah soal, kunci jawaban, konsep dasar, dan pembahasan mendalam langkah demi langkah.
- JANGAN menyambungkan, melampirkan, atau membuat ulang Modul Ajar, Capaian Pembelajaran (CP), Alur Tujuan Pembelajaran (ATP), atau administrasi lainnya, kecuali jika pengguna secara eksplisit memintanya.
- Struktur Pembahasan Soal yang WAJIB disajikan per nomor:
  A. Tuliskan kembali teks soal yang sedang dibahas secara rapi (termasuk stimulus, tabel data, atau opsi pilihan ganda A s.d. E jika ada).
  B. **Kunci Jawaban Singkat**: Berikan huruf/jawaban yang tepat secara jelas dan tebal (misal: **Kunci Jawaban: C**).
  C. **Konsep & Teori Dasar (Core Concept)**: Penjelasan ringkas konsep ilmiah, kaidah kebahasaan, atau teori dasar yang mendasari soal.
  D. **Pembahasan Langkah demi Langkah (Step-by-Step Solution)**: Uraikan pembuktian, penalaran logis, dan tahapan perhitungan secara detail dan sistematis. WAJIB gunakan notasi LaTeX KaTeX untuk semua rumus dan simbol matematika/sains.
  E. **Analisis Pilihan Jawaban (Distractor Analysis)**: Jika soal pilihan ganda, jelaskan secara tajam mengapa opsi yang benar adalah tepat dan mengapa opsi lainnya (A, B, C, D, atau E) salah / merupakan jebakan miskonsepsi umum siswa.
  F. **Trik Cepat / Smart Solution**: Berikan cara cerdas, metode eliminasi kilat, atau tips praktis jika ada.
  G. **Catatan Miskonsepsi & Tips Guru**: Catatan penting mengenai kekeliruan yang sering dialami peserta didik.
- Jika terdapat lebih dari 1 butir soal, sajikan **Tabel Ringkasan Kunci Jawaban & Bobot Nilai** di bagian awal atau akhir.

6. GENERATOR MATERI AJAR & BAHAN BACAAN SISWA KOMPREHENSIF (HANDOUT / BUKU TEKS MANDIRI)
Jika pengguna meminta pembuatan "Materi Ajar", "Bahan Bacaan Siswa", "Handout", atau "Bahan Ajar Pembelajaran":
⚠️ ATURAN KEDALAMAN & KELENGKAPAN MATERI (MUTLAK - DILARANG SINGKAT / DILARANG HANYA RINGKASAN POIN):
- Anda DILARANG KERAS menyajikan pembahasan materi yang singkat, dangkal, terpotong-potong, atau hanya berupa daftar ringkasan/bullet points garis besar semata!
- Materi ajar ini dirancang sebagai BAHAN BACAAN SISWA MANDIRI yang utuh, mendalam, dan komprehensif (setara bab buku teks pelajaran utama Kurikulum Merdeka). Siswa harus dapat memahami materi secara tuntas dan mandiri hanya dengan membaca naskah ini tanpa perlu mencari referensi lain.
- Pada bagian PEMBAHASAN MATERI POKOK (MATERI INTI):
  * Pecah materi menjadi sub-bab / sub-konsep yang terstruktur rapi (Sub-Bab A, B, C, D, dst) sesuai materi pokok dan sub-materi fokus yang diminta.
  * Uraikan setiap sub-bab dalam beberapa paragraf naratif yang mendalam, kaya penjelasan konseptual, landasan teoritis, dan alur penalaran yang runtut.
  * Tuliskan definisi kunci dalam blockquote Markdown (\`> **📌 Konsep Kunci:** ...\`).
  * Sajikan **Tabel Komparasi / Karakteristik Lengkap (All Borders)** untuk membandingkan konsep, klasifikasi, jenis, atau komponen agar mudah dipahami.
  * Untuk materi eksakta/sains/ekonomi/teknik: sertakan rumus lengkap dengan notasi LaTeX KaTeX (\$...\$), uraian variabel, satuan, penurunan rumus, dan contoh perhitungan langkah demi langkah.
  * Untuk materi sosial/humaniora/bahasa: sertakan analisis wacana, dalil/teori ahli, studi fenomena sosial, komparasi perspektif, dan kutipan kasus nyata.
  * Berikan minimal 2–3 contoh kasus dunia nyata mendalam beserta telaah analisis pemecahan masalahnya.
  * Sertakan analogi konkret yang mempermudah pemahaman konsep abstrak bagi siswa.
  * Sertakan catatan Peringatan Miskonsepsi Siswa (Common Misconceptions) dan pelurusannya secara ilmiah.
- Susun dokumen materi ajar secara utuh dengan urutan baku:
  1. **SAMPUL & IDENTITAS PEMBELAJARAN** (Judul Materi Pokok, Mata Pelajaran, Fase/Kelas, Semester, Alokasi Waktu)
  2. **TUJUAN PEMBELAJARAN & INDIKATOR KETERCAPAIAN** (Kemampuan spesifik yang akan dikuasai murid)
  3. **PERTANYAAN PEMANTIK (ESSENTIAL QUESTIONS)** (Pertanyaan pemantik rasa ingin tahu dan nalar kritis)
  4. **PETA KONSEP HIERARKIS & ALUR MATERI** (Struktur hubungan antar konsep dalam diagram teks/hierarki)
  5. **APERSEPSI KONTEKSTUAL (STIMULUS FENOMENA NYATA)** (Kisah/fakta/isu riil pembuka materi yang menggugah)
  6. **PEMBAHASAN MATERI POKOK LENGKAP & KOMPREHENSIF** (Diuraikan Sub-Bab demi Sub-Bab secara tuntas, mendalam, multi-paragraf, lengkap dengan definisi blockquote, teori, tabel komparasi, dan rumus/analisis)
  7. **CONTOH SOAL & BEDAH KASUS HOTS TERPERINCI** (Penyelesaian langkah demi langkah berbasis masalah nyata)
  8. **CATATAN MISKONSEPSI & TIPS MEMAHAMI KONSEP** (Kekeliruan umum siswa yang diluruskan)
  9. **AKTIVITAS EKSPLORASI SISWA** (Tugas mandiri / diskusi kelompok di sela pembelajaran)
  10. **RANGKUMAN INTISARI MATERI (MINDFUL SUMMARY)** (Poin-poin intisari penting)
  11. **UJI PEMAHAMAN FORMATIF** (Soal berjenjang LOTS, MOTS, HOTS + Kunci Jawaban & Pembahasan Detail)
  12. **LEMBAR REFLEKSI DIRI SISWA (METAKOGNITIF)** (Tabel evaluasi diri siswa terhadap materi)
  13. **GLOSARIUM & DAFTAR PUSTAKA** (Definisi istilah teknis dan sumber literatur kredibel)

ATURAN FORMAT PENULISAN FUNGSI & RUMUS MATEMATIKA (MATH NOTATION):
- WAJIB gunakan notasi LaTeX standar yang rapi untuk SEMUA simbol, persamaan, pecahan, eksponen, akar, limit, dan fungsi matematika agar dirender presisi oleh KaTeX.
- Untuk rumus matematika dalam kalimat (inline), gunakan tanda dolar tunggal: \$f(x) = ax^2 + bx + c\$ atau \$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\$.
- Untuk rumus matematika utama / blok bertingkat (display mode), WAJIB letakkan delimiter \$\$ di baris baru tersendiri:
  \$\$
  \\begin{aligned}
  f(x) &= 2x^2 + 5x - 3 \\\\
  f'(x) &= 4x + 5
  \\end{aligned}
  \$\$
- Gunakan \\frac{a}{b} untuk pecahan, \\times untuk perkalian (bukan simbol huruf x atau bintang *), \\sqrt{x} untuk akar, a^{b} untuk pangkat, a_{b} untuk indeks, \\ge untuk \\ge, \\le untuk \\le, \\mathbf{\\text{Rp}...} untuk penulisan mata uang dalam rumus, serta \\int, \\lim, \\sum agar seluruh simbol matematika tampil profesional dan rapi seperti pada buku teks cetak.
- JANGAN menuliskan persamaan matematika dalam teks polos yang membingungkan tanpa tag LaTeX.

ATURAN FORMAT PENULISAN TABEL (ALL BORDER WAJIB):
- Seluruh tabel dalam dokumen (Modul Ajar, LKPD, Naskah Soal, Rubrik Penilaian, Kisi-Kisi Soal, dan Analisis CP/TP/ATP) WAJIB disajikan menggunakan format Tabel Markdown lengkap (All Borders).
- Gunakan pembatas kolom (|) di awal, antar kolom, dan di akhir setiap baris secara konsisten dan utuh.
- Sertakan baris pemisah header (| :--- | :--- | :--- |) yang valid di bawah baris judul kolom.
- Setiap sel harus terisi rapi, terstruktur, dan tidak boleh ada baris atau kolom yang terpotong agar sistem otomatis merendernya dengan All Borders (garis tabel penuh di semua sisi) yang tegas saat dipratinjau, dicetak, maupun diekspor ke Microsoft Word.

ATURAN FORMATTING DAN NADA BAHASA:
- Gunakan bahasa Indonesia yang baku, profesional, dan edukatif.
- Gunakan format Markdown (Heading, Bullet points, Tabel, dan Bold) agar output mudah dibaca oleh guru atau sistem frontend.
- DILARANG KERAS menggunakan kalimat pembuka / pengantar seperti:
  * "Berikut adalah PEMBAHASAN SOAL MENDALAM & KUNCI JAWABAN LENGKAP berdasarkan naskah soal yang ada pada gambar:"
  * "Berikut adalah..."
  * "Berikut ini adalah..."
  * "Tentu, berikut adalah..."
  * "Baik, saya akan membedah..."
- LANGSUNG MULAI baris pertama dokumen dengan Judul Dokumen Pembahasan / Soal (misal: "# PEMBAHASAN SOAL & KUNCI JAWABAN: [MATA PELAJARAN]").
- DILARANG menyisipkan garis pemisah pembuka (---) sebelum judul utama. Dokumen harus langsung siap dicetak dan diekspor tanpa teks basa-basi.`;

    
    let contents: any = prompt;
    if (fileBase64 && fileMimeType) {
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
      contents = [
        { text: prompt },
        { inlineData: { data: cleanBase64, mimeType: fileMimeType } }
      ];
    }

    const response = await generateContentWithRetry(ai, {
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response text from Gemini API.");
    }

    res.json({ result: responseText });
  } catch (error: any) {
    console.error("Error in EduAsisten:", error);
    res.status(500).json({ 
       error: "Gagal memproses permintaan EduAsisten.",
       details: error.message || error 
     });
  }
});

// Endpoint for Generative AI Image & Concept Map Illustration
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio = "16:9", style = "mindmap", materi = "", subMateri = [], mapel = "", kelas = "" } = req.body;
    if (!prompt && !materi) {
      return res.status(400).json({ error: "Prompt atau topik materi ajar wajib diisi." });
    }

    const effectiveTopic = materi || prompt;
    const subMateriList = Array.isArray(subMateri) ? subMateri : (typeof subMateri === "string" && subMateri ? [subMateri] : []);
    const subMateriText = subMateriList.length > 0 ? `Sub-materi/cabang konsep: ${subMateriList.join(", ")}.` : "";
    
    // Construct rich pedagogical prompt for AI Image generation
    let enhancedPrompt = "";
    if (style === "mindmap" || style === "peta-konsep") {
      enhancedPrompt = `A visually captivating educational concept map and mind map infographic poster titled "${effectiveTopic}" for Indonesian Kurikulum Merdeka students. Modern clean visual layout with a prominent central topic hub branching outward into labeled colorful concept cards and nodes. Smooth connecting flow lines, crisp typography, intuitive icons for each concept, vibrant harmonious color scheme (deep indigo, electric violet, fresh emerald green, warm amber). Vector infographic art style, pedagogical visual learning aid for classroom display, 4K crisp resolution, clean light background, no clutter. ${subMateriText} High quality educational infographic diagram.`;
    } else if (style === "infografis") {
      enhancedPrompt = `A comprehensive educational infographic poster explaining "${effectiveTopic}" for ${mapel || "mata pelajaran"} ${kelas || "sekolah"}. Rich visual data representations, structured step-by-step concepts, diagrams, modern vector illustration, clean typography, vibrant Indonesian educational visual media, highly engaging visual summary for classroom students. ${subMateriText}`;
    } else if (style === "diagram") {
      enhancedPrompt = `A detailed educational scientific process diagram and flowchart illustrating "${effectiveTopic}". Clear sequence arrows, labeled parts, crisp technical-educational illustration, clean vector line art, vivid professional color palette, classroom visual learning aid. ${subMateriText}`;
    } else if (style === "cartoon") {
      enhancedPrompt = `A warm, vibrant, delightful educational cartoon illustration depicting "${effectiveTopic}". Friendly Indonesian student and teacher characters exploring and interacting with the learning concepts, warm welcoming aesthetic, educational storybook vector art, charming pedagogical media for learners.`;
    } else if (style === "3d") {
      enhancedPrompt = `A stunning 3D isometric educational illustration representing "${effectiveTopic}". High quality digital 3D render, isometric perspective, colorful tangible conceptual models and objects, soft ambient lighting, clean modern aesthetic, ultra high resolution visual asset.`;
    } else {
      enhancedPrompt = `Professional Indonesian educational illustration and visual concept art for "${effectiveTopic}". Clear visual storytelling, vibrant colors, educational chart and conceptual elements, classroom friendly, high definition. ${prompt || effectiveTopic}`;
    }

    // Supported aspect ratios in Gemini imageConfig: "1:1", "3:4", "4:3", "9:16", "16:9"
    const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    const targetAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "16:9";

    // 1. Try Gemini Image Generation Models
    const imageCandidateModels = [
      "gemini-3.1-flash-image",
      "gemini-3.1-flash-lite-image",
      "gemini-3-pro-image"
    ];

    let lastImageError: any = null;

    for (const model of imageCandidateModels) {
      try {
        const client = getGeminiClient(true);
        const response = await client.models.generateContent({
          model,
          contents: {
            parts: [{ text: enhancedPrompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: targetAspectRatio as any,
              imageSize: "1K"
            }
          }
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64 = part.inlineData.data;
              const mime = part.inlineData.mimeType || "image/png";
              return res.json({
                success: true,
                imageUrl: `data:${mime};base64,${base64}`,
                modelUsed: model,
                prompt: enhancedPrompt,
                type: "raster-image",
                title: effectiveTopic
              });
            }
          }
        }
      } catch (err: any) {
        lastImageError = err;
        console.warn(`[ImageGen] Model ${model} failed: ${err.message || err}`);
      }
    }

    // 2. Fallback: Generate a high-fidelity, colorful, pedagogical SVG Concept Map / Infographic via Gemini Text Models
    console.log("[ImageGen] Model raster generation failed or unavailable, creating smart SVG educational visual...");
    const svgPrompt = `Anda adalah desainer grafis edukasi dan infografis SVG profesional. Buatkan kode SVG utuh, mandiri (standalone), responsif, dan sangat estetik untuk visualisasi:
Topik Peta Konsep: "${effectiveTopic}"
Mata Pelajaran: "${mapel || 'Pendidikan'}"
Sub-Materi / Konsep Kunci: "${subMateriText || prompt || effectiveTopic}"
Gaya: "${style}"

KETENTUAN KODE SVG WAJIB:
1. Mulai langsung dengan <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" width="100%" height="100%"> dan akhiri dengan </svg>.
2. Background: gunakan background gradien modern dengan <defs><linearGradient id="bgGrad" ...> (warna slate/indigo halus) dan pola grid halus atau dot matrix.
3. Desain Peta Konsep / Mindmap Visual Modern:
   - Node Pusat (Central Hub) besar dan mencolok dengan <rect rx="24"> gradien indigo-violet, bayangan drop-shadow filter, ikon SVG, dan teks judul "${effectiveTopic}".
   - 3 sampai 5 Cabang Konsep Utama yang memancar ke kiri dan kanan dengan warna kontras yang estetik (Emerald, Amber, Sky Blue, Rose Pink, Violet).
   - Setiap cabang memiliki kartu konsep (rect rx="14") dengan badge kategori dan 2-3 poin penting/kata kunci.
   - Hubungkan node pusat ke cabang-cabang dengan garis kurva mulus (<path d="M... C..." stroke="..." stroke-width="3" stroke-linecap="round" fill="none" />) dan dot penanda.
4. Gunakan typography sans-serif bersih (font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"), teks bahasa Indonesia yang edukatif dan mudah dibaca.
5. PENTING: Berikan HANYA kode SVG murni dari <svg> sampai </svg>. JANGAN sertakan penjelasan atau markdown code fence (tanpa \`\`\`xml atau \`\`\`svg).`;

    const svgAiResponse = await generateContentWithRetry({
      contents: svgPrompt,
      config: {
        systemInstruction: "Anda adalah pakar visualisasi data & infografis SVG edukatif. Hasilkan HANYA kode SVG murni tanpa markdown, tanpa penjelasan.",
        temperature: 0.6
      }
    });

    let rawSvg = svgAiResponse.text || "";
    rawSvg = rawSvg.replace(/```(?:xml|svg|html)?\s*/gi, "").replace(/```/g, "").trim();
    const svgStart = rawSvg.indexOf("<svg");
    const svgEnd = rawSvg.lastIndexOf("</svg>");
    if (svgStart !== -1 && svgEnd !== -1) {
      rawSvg = rawSvg.substring(svgStart, svgEnd + 6);
      const base64Svg = Buffer.from(rawSvg, "utf-8").toString("base64");
      return res.json({
        success: true,
        imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
        rawSvg: rawSvg,
        modelUsed: "gemini-smart-svg",
        prompt: enhancedPrompt,
        type: "svg-illustration",
        title: effectiveTopic
      });
    }

    throw new Error(lastImageError?.message || "Gagal membuat gambar atau visualisasi konsep.");
  } catch (err: any) {
    console.error("Error in /api/generate-image:", err);
    res.status(500).json({ 
      error: "Gagal menghasilkan gambar atau visualisasi AI.",
      details: err.message || err 
    });
  }
});

// API 404 handler

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} tidak ditemukan.` });
});

// Express Global Error Handler for API / body-parsing errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global express error handler:", err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Terjadi kesalahan internal pada server.",
    details: err.type === "entity.too.large" ? "Ukuran file / payload terlalu besar. Maksimal 50MB." : undefined,
    status
  });
});

// Setup Vite Dev Server / Serve Static Files
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupServer();
