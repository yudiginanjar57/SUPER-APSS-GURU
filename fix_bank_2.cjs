const fs = require('fs');
let code = fs.readFileSync('src/components/BankSoal.tsx', 'utf8');

code = code.replace(/\\\`qb-\\\$\\{Date\.now\(\)\\}\\`/g, '`qb-${Date.now()}`');
code = code.replace(/\\\`\\\$\\{q\.options\?\\.length \|\| 0\\} Opsi\\\`/g, '`${q.options?.length || 0} Opsi`');
code = code.replace(/\\\`\\\$\\{q\.matchingPairs\?\\.length \|\| 0\\} Pasang\\\`/g, '`${q.matchingPairs?.length || 0} Pasang`');

fs.writeFileSync('src/components/BankSoal.tsx', code);
console.log('fixed backticks 2');
