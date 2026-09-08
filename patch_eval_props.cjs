const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

const targetProps = `interface EvaluasiSiswaProps {
  isStudent: boolean;
  currentUserRole?: 'admin' | 'guru' | 'siswa';
  availableClasses: string[];
  students: Student[];
  subject: string;
  teacherName: string;
}`;

const replacementProps = `import { QuestionBankItem } from "../types";

interface EvaluasiSiswaProps {
  isStudent: boolean;
  currentUserRole?: 'admin' | 'guru' | 'siswa';
  availableClasses: string[];
  students: Student[];
  subject: string;
  teacherName: string;
  bankQuestions?: QuestionBankItem[];
}`;

if (code.includes(targetProps)) {
  code = code.replace(targetProps, replacementProps);
}

const targetDestruct = `}: EvaluasiSiswaProps) {`;
const replacementDestruct = `  bankQuestions = []
}: EvaluasiSiswaProps) {`;

if (code.includes(targetDestruct)) {
  code = code.replace(targetDestruct, replacementDestruct);
}

fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('patched EvaluasiSiswa props');
