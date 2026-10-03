const fs = require('fs');
let code = fs.readFileSync('src/components/EduAsisten.tsx', 'utf8');

const regex = /\{[\s\n]*id: "rubrik",[\s\n]*title: "Rubrik Penilaian",[\s\n]*icon: CheckSquare,[\s\n]*prompt: "Tolong buatkan rubrik penilaian proyek \[Nama Proyek\/Tugas\] dengan 4 kriteria utama menggunakan skala 1-4.",[\s\n]*color: "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"[\s\n]*\}/;

const replacement = `{
      id: "rubrik",
      title: "Rubrik Penilaian",
      icon: CheckSquare,
      prompt: "Tolong buatkan rubrik penilaian proyek [Nama Proyek/Tugas] dengan 4 kriteria utama menggunakan skala 1-4.",
      color: "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
    },
    {
      id: "prota",
      title: "Prota, Prosem & KKTP",
      icon: CalendarDays,
      prompt: "", // Handled by modal
      color: "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
    }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/EduAsisten.tsx', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
