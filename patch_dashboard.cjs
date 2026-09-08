const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const targetStr = `            { label: "Ruang Belajar", desc: "PPT & Video Google Drive", tab: "ruangbelajar", bg: "bg-emerald-400/20 hover:bg-emerald-400/30" },`;

const replacementStr = `            { label: "Ruang Belajar", desc: "PPT & Video Google Drive", tab: "ruangbelajar", bg: "bg-emerald-400/20 hover:bg-emerald-400/30" },
            { label: "Evaluasi & Ujian (CBT)", desc: "Ujian Secure Mode", tab: "evaluasi", bg: "bg-rose-400/20 hover:bg-rose-400/30" },`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log('patched Dashboard.tsx');
