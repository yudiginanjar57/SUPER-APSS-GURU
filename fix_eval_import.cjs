const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

code = code.replace(/ListOrdered\s*Database,\s*}/, 'ListOrdered,\n  Database,\n}');

fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('fixed import syntax');
