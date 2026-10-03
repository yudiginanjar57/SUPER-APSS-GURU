const fs = require('fs');
let code = fs.readFileSync('src/components/EduAsisten.tsx', 'utf8');

const regex = /\} else if \(actionId === "cptp"\) \{[\s\S]*?\} else if \(actionId === "soal"\) \{/;

const replacement = `} else if (actionId === "cptp") {
      setPerangkatForm(prev => ({ 
        ...prev, 
        jenis: "Analisis CP & ATP",
        namaSekolah: prev.namaSekolah || userProfile.namaSekolah,
        namaPenyusun: prev.namaPenyusun || userProfile.namaPenyusun,
        nipPenyusun: prev.nipPenyusun || userProfile.nipPenyusun
      }));
      setIsPerangkatModalOpen(true);
    } else if (actionId === "prota") {
      setPerangkatForm(prev => ({ 
        ...prev, 
        jenis: "Prota, Prosem & Analisis KKTP",
        namaSekolah: prev.namaSekolah || userProfile.namaSekolah,
        namaPenyusun: prev.namaPenyusun || userProfile.namaPenyusun,
        nipPenyusun: prev.nipPenyusun || userProfile.nipPenyusun
      }));
      setIsPerangkatModalOpen(true);
    } else if (actionId === "soal") {`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/EduAsisten.tsx', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
