const fs = require('fs');
let code = fs.readFileSync('src/components/EduAsisten.tsx', 'utf8');

const regex = /\} else if \(soalModalTab === 'impor'\) \{[\s\S]*?\} else if \(soalModalTab === 'manual'\) \{/

const replacement = `} else if (soalModalTab === 'impor') {
      prompt = \`Tolong lakukan **Review dan Analisis Soal** berdasarkan \${soalImporForm.fileBase64 ? "dokumen yang diunggah" : "teks yang diimpor"} berikut ini.

\${soalImporForm.fileText ? \`**TEKS NASKAH SOAL YANG DIIMPOR:**\\n\\\`\\\`\\\`text\\n\${soalImporForm.fileText}\\n\\\`\\\`\\\`\\n\` : ""}

**INSTRUKSI TUGAS:**
1. Rapikan soal di atas menjadi format naskah soal yang terstruktur, lengkap dengan penomoran dan pilihan ganda yang rapi.
2. Berikan penilaian/review singkat terhadap kualitas soal tersebut (misalnya dari segi HOTS/LOTS, kesesuaian dengan kaidah penulisan soal, dan validitas opsi jawaban).
3. Buatkan **Kunci Jawaban dan Pembahasan Detail** untuk setiap butir soal tersebut.
4. Buatkan **Tabel Ringkasan Kunci Jawaban** di akhir.

\${soalImporForm.instruksiTambahan ? \`**INSTRUKSI TAMBAHAN:**\\n\${soalImporForm.instruksiTambahan}\\n\` : ""}
\`;
    } else if (soalModalTab === 'manual') {`

const regex2 = /setIsSoalModalOpen\(false\);\s*handleSubmit\(undefined, prompt\);/

const replacement2 = `setIsSoalModalOpen(false);
    
    let fileData = undefined;
    if (soalModalTab === 'impor' && soalImporForm.fileBase64) {
      fileData = {
        base64: soalImporForm.fileBase64,
        mimeType: soalImporForm.fileMimeType,
        name: soalImporForm.fileName
      };
    }
    
    handleSubmit(undefined, prompt, fileData);`

if (regex.test(code) && regex2.test(code)) {
    code = code.replace(regex, replacement);
    code = code.replace(regex2, replacement2);
    fs.writeFileSync('src/components/EduAsisten.tsx', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
