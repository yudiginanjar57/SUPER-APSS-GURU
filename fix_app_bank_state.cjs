const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetState = `  const [materials, setMaterials] = useState<LearningMaterial[]>(() => {`;
const replacementState = `  const [bankQuestions, setBankQuestions] = useState<QuestionBankItem[]>([
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
  ]);

  const [materials, setMaterials] = useState<LearningMaterial[]>(() => {`;

if (code.includes(targetState) && !code.includes('const [bankQuestions')) {
  code = code.replace(targetState, replacementState);
}

fs.writeFileSync('src/App.tsx', code);
console.log('fixed app state');
