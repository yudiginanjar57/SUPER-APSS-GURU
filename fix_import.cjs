const fs = require('fs');
let code = fs.readFileSync('src/components/Penilaian.tsx', 'utf8');

code = code.replace('import CameraCaptureModal from "./CameraCaptureModal";\n', '');
code = code.replace('import * as XLSX from "xlsx";', 'import * as XLSX from "xlsx";\nimport CameraCaptureModal from "./CameraCaptureModal";');

fs.writeFileSync('src/components/Penilaian.tsx', code);
console.log('Import fixed');
