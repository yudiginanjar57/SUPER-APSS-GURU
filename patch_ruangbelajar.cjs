const fs = require('fs');
let code = fs.readFileSync('src/components/RuangBelajar.tsx', 'utf8');

// 1. Remove import
code = code.replace(/import EvaluasiSiswa from "\.\/EvaluasiSiswa";\n?/, '');

// 2. Remove ShieldAlert from imports if present (already there?)
// Let's just remove the word "ShieldAlert,"
code = code.replace(/ShieldAlert,\s*/, '');

// 3. Change activeTabMode initial state back to not including "evaluasi"
code = code.replace(/useState<"catalog" \| "studio" \| "student" \| "evaluasi">/, 'useState<"catalog" | "studio" | "student">');

// 4. Remove the button
const buttonPattern = /<button\s+onClick=\{\(\) => setActiveTabMode\("evaluasi"\)\}[\s\S]*?id="tab-btn-ruang-evaluasi"[\s\S]*?<\/button>/;
code = code.replace(buttonPattern, '');

// 5. Remove the component rendering
const renderPattern = /\{\/\* VIEW 4: EVALUASI & UJIAN SISWA SECURE CBT \*\/\}[\s\S]*?\{activeTabMode === "evaluasi" && \([\s\S]*?<EvaluasiSiswa[\s\S]*?\/>\s*\)\}/;
code = code.replace(renderPattern, '');

fs.writeFileSync('src/components/RuangBelajar.tsx', code);
console.log('patched RuangBelajar.tsx');
