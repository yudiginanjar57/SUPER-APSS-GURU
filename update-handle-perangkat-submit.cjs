const fs = require('fs');
let code = fs.readFileSync('src/components/EduAsisten.tsx', 'utf8');

const regex = /if \(perangkatForm\.jenis !== "Analisis CP & ATP"\) \{/;

const replacement = `if (perangkatForm.jenis === "Prota, Prosem & Analisis KKTP") {
      prompt = \`Tolong buatkan dokumen administrasi **\${perangkatForm.jenis}** untuk:
- Kurikulum: \${perangkatForm.kurikulum}
- Jenjang: \${perangkatForm.jenjang}
- Kelas: \${perangkatForm.kelas}
- Semester: \${perangkatForm.semester}
- Mata Pelajaran: \${perangkatForm.mapel}
- Elemen: \${perangkatForm.elemen}
- Capaian Pembelajaran: \${perangkatForm.cp}

\${perangkatForm.instruksiTambahan ? \`- Instruksi Tambahan: \${perangkatForm.instruksiTambahan}\\n\` : ""}
Sajikan hasil pembuatan Prota (Program Tahunan), Prosem (Program Semester), dan Analisis KKTP (Kriteria Ketercapaian Tujuan Pembelajaran) dalam bentuk tabel Markdown yang rapi dan terstruktur.\`;
    } else if (perangkatForm.jenis !== "Analisis CP & ATP") {`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/EduAsisten.tsx', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
