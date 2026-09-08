const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

code = code.replace(
  'Student \n} from "../types";',
  'Student,\n  QuestionBankItem \n} from "../types";'
);
// Also just in case the newlines are different:
code = code.replace(
  /Student\s*}\s*from\s*"..\//g,
  'Student, QuestionBankItem } from "../'
);

fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('fixed eval imports final 2');
