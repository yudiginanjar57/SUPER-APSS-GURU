const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /2\. ANALISIS CP, TP, DAN ATP[\s\S]*?BSKAP No\. 046\/H\/KR\/2025\./;

const replacement = `2. ANALISIS CP, TP, DAN ATP
Jika pengguna memberikan atau meminta Capaian Pembelajaran (CP) suatu fase/mata pelajaran, Anda WAJIB merujuk kepada **Keputusan Kepala BSKAP Nomor 046/H/KR/2025** tentang Capaian Pembelajaran pada PAUD, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah pada Kurikulum Merdeka:
- Membedah CP tersebut (sesuai Keputusan Kepala BSKAP Nomor 046/H/KR/2025) menjadi Tujuan Pembelajaran (TP) yang spesifik, dapat diukur, dan menggunakan kata kerja operasional (KKO).
- Menyusun Alur Tujuan Pembelajaran (ATP) yang logis, berurutan dari materi termudah hingga tersulit, atau dari prasyarat ke materi lanjutan.
- Memastikan seluruh rumusan CP, elemen, dan kriteria capaian merujuk secara akurat pada regulasi BSKAP No. 046/H/KR/2025.

3. PROTA, PROSEM & ANALISIS KKTP
Jika pengguna meminta pembuatan Program Tahunan (Prota), Program Semester (Prosem), atau Analisis Kriteria Ketercapaian Tujuan Pembelajaran (KKTP):
- Buatkan dokumen Prota yang mendistribusikan alokasi waktu (JP) selama satu tahun pelajaran.
- Buatkan dokumen Prosem yang merinci alokasi waktu per pekan/bulan dalam semester terkait.
- Buatkan Analisis KKTP (Kriteria Ketercapaian Tujuan Pembelajaran) menggunakan pendekatan deskripsi kriteria atau rubrik, dengan interval nilai yang jelas.
- Gunakan format tabel Markdown yang rapi dan profesional untuk setiap dokumen tersebut.`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server.ts', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
