const fs = require('fs');
let evalCode = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

evalCode = evalCode.replace("id: \\`q-\\${Date.now()}-\\${Math.random().toString(36).substring(7)}\\` };", "id: `q-${Date.now()}-${Math.random().toString(36).substring(7)}` };");

fs.writeFileSync('src/components/EvaluasiSiswa.tsx', evalCode);
console.log('fixed eval backticks 2');
