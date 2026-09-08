const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

const targetState = `  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);`;
const replacementState = `  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);`;

if (code.includes(targetState) && !code.includes('isBankModalOpen')) {
  code = code.replace(targetState, replacementState);
}

const targetButtons = `<div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-800 text-xs">Butir Soal Evaluasi ({newQuestions.length})</h4>
                    <button
                      type="button"
                      onClick={handleAddQuestionToForm}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer border border-indigo-200"
                    >
                      <Plus size={14} /> Tambah Soal
                    </button>
                  </div>`;

const replacementButtons = `<div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-800 text-xs">Butir Soal Evaluasi ({newQuestions.length})</h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsBankModalOpen(true)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer border border-emerald-200"
                      >
                        <Database size={14} /> Bank Soal
                      </button>
                      <button
                        type="button"
                        onClick={handleAddQuestionToForm}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer border border-indigo-200"
                      >
                        <Plus size={14} /> Tambah Manual
                      </button>
                    </div>
                  </div>`;

if (code.includes(targetButtons) && !code.includes('Bank Soal</button>')) {
  code = code.replace(targetButtons, replacementButtons);
}

// Add Database icon import
if (!code.includes('Database,')) {
  code = code.replace('from "lucide-react";', '  Database,\n} from "lucide-react";');
}

fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('patched eval UI');
