const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import BankSoal')) {
  code = code.replace(
    'import EvaluasiSiswa from "./components/EvaluasiSiswa";', 
    'import EvaluasiSiswa from "./components/EvaluasiSiswa";\nimport BankSoal from "./components/BankSoal";'
  );
}

const navTarget = `{ id: "evaluasi", label: "Evaluasi (CBT)", icon: ShieldAlert },`;
const navReplacement = `{ id: "evaluasi", label: "Evaluasi (CBT)", icon: ShieldAlert },
        { id: "banksoal", label: "Bank Soal", icon: Database },`;
if (code.includes(navTarget) && !code.includes('id: "banksoal"')) {
  code = code.replace(navTarget, navReplacement);
}

const renderTarget = `{activeTab === "evaluasi" && (`;
const renderReplacement = `{activeTab === "banksoal" && (
                  <BankSoal
                    questions={[]} // We'll add state for this
                    onAddQuestion={(q) => console.log(q)}
                    onEditQuestion={(q) => console.log(q)}
                    onDeleteQuestion={(id) => console.log(id)}
                    availableClasses={classList}
                    subject={subject}
                  />
                )}

                {activeTab === "evaluasi" && (`
if (code.includes(renderTarget) && !code.includes('activeTab === "banksoal"')) {
  code = code.replace(renderTarget, renderReplacement);
}

fs.writeFileSync('src/App.tsx', code);
console.log('patched app with Bank Soal');
