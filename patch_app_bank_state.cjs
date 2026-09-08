const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetImports = 'import { \n  Student, ';
const replacementImports = 'import { \n  QuestionBankItem,\n  Student, ';
if (code.includes(targetImports) && !code.includes('QuestionBankItem')) {
  code = code.replace(targetImports, replacementImports);
}

const targetState = `  const [materials, setMaterials] = useState<LearningMaterial[]>(PRESET_LEARNING_MATERIALS);`;
const replacementState = `  const [materials, setMaterials] = useState<LearningMaterial[]>(PRESET_LEARNING_MATERIALS);
  const [bankQuestions, setBankQuestions] = useState<QuestionBankItem[]>([
    {
      id: "qb-1",
      type: "pg",
      question: "Apakah yang dimaksud dengan ilmu ekonomi?",
      options: ["Ilmu tentang kekayaan", "Ilmu tentang kelangkaan", "Ilmu tentang uang", "Ilmu tentang perdagangan"],
      correctAnswer: "Ilmu tentang kelangkaan",
      points: 10,
      className: "Kelas 10",
      subject: "EKONOMI",
      bab: "BAB 1: Konsep Dasar Ilmu Ekonomi",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]);`;

if (code.includes(targetState) && !code.includes('const [bankQuestions')) {
  code = code.replace(targetState, replacementState);
}

const targetRender = `questions={[]} // We'll add state for this
                    onAddQuestion={(q) => console.log(q)}
                    onEditQuestion={(q) => console.log(q)}
                    onDeleteQuestion={(id) => console.log(id)}`;

const replacementRender = `questions={bankQuestions}
                    onAddQuestion={(q) => setBankQuestions(prev => [q, ...prev])}
                    onEditQuestion={(q) => setBankQuestions(prev => prev.map(item => item.id === q.id ? q : item))}
                    onDeleteQuestion={(id) => setBankQuestions(prev => prev.filter(item => item.id !== id))}`;

if (code.includes(targetRender)) {
  code = code.replace(targetRender, replacementRender);
}

fs.writeFileSync('src/App.tsx', code);
console.log('patched app bank state');
