const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

code = code.replace(/import {\s*EvaluationExam,\s*EvaluationQuestion,\s*EvaluationSubmission,\s*ViolationLog,\s*Student,\s*QuestionBankItem } from "\.\.\/types";/g, 
  'import { EvaluationExam, EvaluationQuestion, EvaluationSubmission, ViolationLog, Student, QuestionBankItem } from "../types";');

// Specifically check for missing QuestionBankItem import
if (!code.includes('QuestionBankItem } from "../types"')) {
  code = code.replace('Student } from "../types";', 'Student, QuestionBankItem } from "../types";');
}

fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('fixed eval imports final');
