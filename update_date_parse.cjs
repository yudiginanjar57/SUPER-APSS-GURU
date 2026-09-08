const fs = require('fs');
let code = fs.readFileSync('src/components/WaliKelas.tsx', 'utf8');

const targetStr = `            } else if (typeof parsedDateOfBirth === 'string' && parsedDateOfBirth.includes('/')) {
               const parts = parsedDateOfBirth.split('/');
               if (parts.length === 3 && parts[2].length === 4) {
                 parsedDateOfBirth = \`\${parts[2]}-\${parts[1].padStart(2, '0')}-\${parts[0].padStart(2, '0')}\`;
               }
            }`;

const replacementStr = `            } else if (typeof parsedDateOfBirth === 'string' && parsedDateOfBirth.includes('/')) {
               const parts = parsedDateOfBirth.split('/');
               if (parts.length === 3) {
                 let year = parts[2];
                 if (year.length === 2) {
                   // Handle yy format (assume 20xx for students, or 19xx if > 50)
                   year = parseInt(year) > 50 ? '19' + year : '20' + year;
                 }
                 if (year.length === 4) {
                   parsedDateOfBirth = \`\${year}-\${parts[1].padStart(2, '0')}-\${parts[0].padStart(2, '0')}\`;
                 }
               }
            }`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('src/components/WaliKelas.tsx', code);
  console.log('Date parsing updated');
} else {
  console.log('Target string not found');
}
