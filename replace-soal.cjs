const fs = require('fs');
let code = fs.readFileSync('src/components/EduAsisten.tsx', 'utf8');

const regex = /const handleSoalSubmit = \(e: React.FormEvent\) => \{[\s\S]*?handleSubmit\(undefined, prompt\);\s*\};/;

const replacement = `const handleSoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let prompt = "";

    if (soalModalTab === 'buat') {
      const tingkatStr = soalForm.tingkatKesulitan.length > 0 ? soalForm.tingkatKesulitan.join(", ") : "HOTS";
      const levelStr = soalForm.levelKognitif.length > 0 ? soalForm.levelKognitif.join(", ") : "C4, C5, C6";
      const bentukStr = soalForm.bentukSoal.length > 0 ? soalForm.bentukSoal.join(", ") : "Pilihan Ganda, Uraian";

      prompt = \`Tolong buatkan paket soal pembelajaran komprehensif berkualitas tinggi menggunakan **Generator Soal** dengan spesifikasi dan struktur dokumen sebagai berikut:

**SPESIFIKASI DOKUMEN SOAL:**
- **Jenjang & Kelas**: \${soalForm.jenjang} / \${soalForm.kelas}
- **Mata Pelajaran**: \${soalForm.mapel}
- **Topik / Materi Pokok**: \${soalForm.materi || "[Sesuaikan dengan Kurikulum Fase ini]"}
- **Tingkat Kesulitan**: \${tingkatStr}
- **Level Kognitif Bloom**: \${levelStr}
- **Bentuk Soal**: \${bentukStr}
- **Jumlah Soal**: \${soalForm.jumlahSoal || "5"} butir soal

**STIMULUS SOAL (WAJIB ADA):**
- **Jenis Stimulus**: \${soalForm.jenisStimulus}
\${soalForm.keteranganStimulus ? \`- **Keterangan / Detil Stimulus**: \${soalForm.keteranganStimulus}\` : ""}
Pastikan stimulus yang diberikan bermakna, kontekstual dengan kehidupan nyata, dan benar-benar digunakan untuk menjawab soal (bukan sekadar hiasan).

\${soalForm.instruksiTambahan ? \`**INSTRUKSI TAMBAHAN GURU:**\\n\${soalForm.instruksiTambahan}\\n\` : ""}

**PETUNJUK FORMAT DAN STRUKTUR DOKUMEN (SANGAT WAJIB & STRICT):**
1. **Bagian A. Header Identitas**: Sajikan tabel Markdown identitas (Mata Pelajaran, Kelas/Fase, Topik, Bentuk, Jumlah, Tingkat) & Callout Box Petunjuk Pengerjaan di paling awal.
2. **Bagian B. Naskah Soal**: Format setiap nomor soal secara konsisten dan terpisah rapi:
   ### 📝 SOAL NO. X
   \\\`[Bentuk: \${bentukStr} | Level: \${levelStr}]\\\`
3. **Format Stimulus**:
   - Jika Grafik/Chart SVG: Tuliskan tag <svg> secara mentah di luar codeblock, dan sertakan Tabel Data Markdown pendukung di bawahnya.
   - Jika Tabel Data: Tuliskan Tabel Markdown terstruktur rapi dengan garis border dan header kolom yang jelas.
   - Jika Narasi/Kasus: Sajikan dalam Callout Box (\\\`> **📌 STIMULUS BACAAN**\\\`).
4. **Format Pilihan Jawaban**:
   - Untuk Pilihan Ganda: Tuliskan opsi A, B, C, D (E untuk SMA) secara vertikal dengan format tebal \\\`- **A.** [Teks Opsi]\\\`.
   - Untuk Pilihan Ganda Kompleks / Benar-Salah: Gunakan Tabel Markdown yang rapi dengan kolom nomor, pernyataan, dan centang/pilihan.
5. **Format Matematika/Sains**: WAJIB gunakan notasi LaTeX KaTeX (\\$f(x) = ax^2 + bx + c\\$ atau \\$\\$\\frac{a}{b}\\$\\$) secara konsisten.
6. **Bagian C. Kunci Jawaban & Pembahasan Detail**:
   - **Tabel Ringkasan Kunci Jawaban** (No | Bentuk Soal | Level Kognitif | Kunci Jawaban | Skor Maksimal)
   - **Pembahasan Detail Langkah demi Langkah** per nomor soal beserta Rubrik Penskoran.
\`;
    } else if (soalModalTab === 'impor') {
      prompt = \`Tolong lakukan **Review dan Analisis Soal** berdasarkan teks yang diimpor dari dokumen Word/PDF berikut ini.

**TEKS NASKAH SOAL YANG DIIMPOR:**
\\\`\\\`\\\`text
\${soalImporForm.fileText}
\\\`\\\`\\\`

**INSTRUKSI TUGAS:**
1. Rapikan teks soal di atas menjadi format naskah soal yang terstruktur, lengkap dengan penomoran dan pilihan ganda yang rapi.
2. Berikan penilaian/review singkat terhadap kualitas soal tersebut (misalnya dari segi HOTS/LOTS, kesesuaian dengan kaidah penulisan soal, dan validitas opsi jawaban).
3. Buatkan **Kunci Jawaban dan Pembahasan Detail** untuk setiap butir soal tersebut.
4. Buatkan **Tabel Ringkasan Kunci Jawaban** di akhir.

\${soalImporForm.instruksiTambahan ? \`**INSTRUKSI TAMBAHAN:**\\n\${soalImporForm.instruksiTambahan}\\n\` : ""}
\`;
    } else if (soalModalTab === 'manual') {
      prompt = \`Tolong bantu saya menyusun dan merapikan naskah soal yang saya inputkan manual berikut, lalu buatkan pembahasan dan kunci jawabannya.

**SPESIFIKASI SOAL:**
- **Jenjang & Kelas**: \${soalManualForm.jenjang} / \${soalManualForm.kelas}
- **Mata Pelajaran**: \${soalManualForm.mapel}
- **Topik / Materi Pokok**: \${soalManualForm.materi || "[Otomatis Sesuaikan]"}

**NASKAH SOAL INPUT MANUAL:**
\\\`\\\`\\\`text
\${soalManualForm.naskahSoal}
\\\`\\\`\\\`

**INSTRUKSI TUGAS:**
1. Rapikan teks naskah soal di atas menjadi format Markdown yang profesional.
2. Tambahkan **Stimulus** yang sesuai jika soal tersebut belum memilikinya namun membutuhkan konteks.
3. Buatkan **Pembahasan Detail Langkah demi Langkah** per nomor soal.
4. Sajikan **Tabel Ringkasan Kunci Jawaban** di bagian bawah.

\${soalManualForm.instruksiTambahan ? \`**INSTRUKSI TAMBAHAN:**\\n\${soalManualForm.instruksiTambahan}\\n\` : ""}
\`;
    }

    setIsSoalModalOpen(false);
    handleSubmit(undefined, prompt);
  };`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/EduAsisten.tsx', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
