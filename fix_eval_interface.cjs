const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

const targetProps = `interface EvaluasiSiswaProps {
  isStudent?: boolean;
  currentUserRole?: 'admin' | 'guru' | 'siswa';
  availableClasses?: string[];
  students?: Student[];
  subject?: string;
  teacherName?: string;
}`;

const replacementProps = `interface EvaluasiSiswaProps {
  isStudent?: boolean;
  currentUserRole?: 'admin' | 'guru' | 'siswa';
  availableClasses?: string[];
  students?: Student[];
  subject?: string;
  teacherName?: string;
  bankQuestions?: QuestionBankItem[];
}`;

if (code.includes(targetProps)) {
  code = code.replace(targetProps, replacementProps);
}

// Ensure QuestionBankItem is imported
const importTarget = `Student } from "../types";`;
const importReplacement = `Student,\n  QuestionBankItem } from "../types";`;

if (code.includes(importTarget)) {
  code = code.replace(importTarget, importReplacement);
}

fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('fixed eval interface');
