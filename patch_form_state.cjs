const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

const targetStr = `  const [newExamForm, setNewExamForm] = useState<{
    title: string;
    description: string;
    subject: string;
    className: string;
    durationMinutes: number;
    token: string;
    bab: string;
  }>({
    title: "",
    description: "",
    subject: subject || "EKONOMI",
    className: "Semua Kelas",
    durationMinutes: 20,
    token: "",
    bab: "BAB 1: Konsep Dasar Ekonomi"
  });`;

const replacementStr = `  const [newExamForm, setNewExamForm] = useState<{
    title: string;
    description: string;
    subject: string;
    className: string;
    durationMinutes: number;
    token: string;
    bab: string;
    isShuffleQuestions: boolean;
    isShuffleOptions: boolean;
    examPackage: string;
  }>({
    title: "",
    description: "",
    subject: subject || "EKONOMI",
    className: "Semua Kelas",
    durationMinutes: 20,
    token: "",
    bab: "BAB 1: Konsep Dasar Ekonomi",
    isShuffleQuestions: false,
    isShuffleOptions: false,
    examPackage: "Utama"
  });`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('patched form state');
