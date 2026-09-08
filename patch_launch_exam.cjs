const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

const targetStr = `  const launchExamSession = (exam: EvaluationExam) => {
    setActiveExam(exam);`;

const replacementStr = `  // Helper to shuffle arrays
  const shuffleArray = (array: any[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const launchExamSession = (exam: EvaluationExam) => {
    let sessionExam = { ...exam };
    if (sessionExam.isShuffleQuestions) {
      sessionExam.questions = shuffleArray(sessionExam.questions);
    }
    if (sessionExam.isShuffleOptions) {
      sessionExam.questions = sessionExam.questions.map(q => {
        if ((q.type === 'pg' || q.type === 'pg_kompleks') && q.options) {
          return { ...q, options: shuffleArray(q.options) };
        }
        if (q.type === 'menjodohkan' && q.matchingPairs) {
          // Shuffle right side options for menjodohkan
          const rights = shuffleArray(q.matchingPairs.map(p => p.right));
          return { ...q, shuffledRightsForSession: rights }; // Store temporarily
        }
        return q;
      });
    }

    setActiveExam(sessionExam);`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('patched');
