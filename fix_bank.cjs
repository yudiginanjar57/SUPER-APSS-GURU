const fs = require('fs');
let code = fs.readFileSync('src/components/BankSoal.tsx', 'utf8');

code = code.replace(/\\`qb-\\\$\\{Date\.now\(\)\\}\\`/g, '`qb-${Date.now()}`');

// Also for EvaluasiSiswa.tsx:
let evalCode = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');
evalCode = evalCode.replace(/\\`q-\\\$\\{Date\.now\(\)\\}-\\\$\\{Math\.random\(\)\.toString\(36\)\.substring\(7\)\\}\\`/g, '`q-${Date.now()}-${Math.random().toString(36).substring(7)}`');
// Let's just use string replace if regex is hard
evalCode = evalCode.replace("id: \\`q-\\$", "id: `q-$").replace("{Date.now()}-\\$", "{Date.now()}-$").replace("{Math.random().toString(36).substring(7)}\\`", "{Math.random().toString(36).substring(7)}`");

fs.writeFileSync('src/components/BankSoal.tsx', code);
fs.writeFileSync('src/components/EvaluasiSiswa.tsx', evalCode);
console.log('fixed backticks');
