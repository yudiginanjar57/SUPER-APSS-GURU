const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

code = code.replace(/}\s*Database,\s*} from "lucide-react";/, '  Database,\n} from "lucide-react";');

fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('fixed eval imports');
