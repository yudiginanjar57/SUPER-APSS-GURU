const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

code = code.replace(/teacherName = "YUDI GINANJAR"\s*bankQuestions = \[\]/, 'teacherName = "YUDI GINANJAR",\n  bankQuestions = []');

fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('fixed destruct syntax');
