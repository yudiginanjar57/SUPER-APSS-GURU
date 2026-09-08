const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add ShieldAlert to lucide-react imports if not there
if (!code.includes('ShieldAlert,')) {
    code = code.replace('ShieldCheck,', 'ShieldCheck,\n  ShieldAlert,');
}

// Add EvaluasiSiswa import
if (!code.includes('import EvaluasiSiswa')) {
    code = code.replace('import RuangBelajar from "./components/RuangBelajar";', 'import RuangBelajar from "./components/RuangBelajar";\nimport EvaluasiSiswa from "./components/EvaluasiSiswa";');
}

fs.writeFileSync('src/App.tsx', code);
console.log('patched imports in App.tsx');
