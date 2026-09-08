const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

const targetStr = `    const newExamObj: EvaluationExam = {
      id: \`eval-custom-\${Date.now()}\`,
      title: newExamForm.title,
      description: newExamForm.description || "Evaluasi Mandiri Terstruktur.",
      subject: newExamForm.subject,
      className: newExamForm.className,
      targetClasses: newExamForm.className === "Semua Kelas" ? availableClasses : [newExamForm.className],
      durationMinutes: Number(newExamForm.durationMinutes) || 20,
      token: newExamForm.token,
      bab: newExamForm.bab,
      status: "aktif",
      isSecureMode: true,
      createdAt: new Date().toISOString(),
      questions: newQuestions
    };`;

const replacementStr = `    const newExamObj: EvaluationExam = {
      id: \`eval-custom-\${Date.now()}\`,
      title: newExamForm.title,
      description: newExamForm.description || "Evaluasi Mandiri Terstruktur.",
      subject: newExamForm.subject,
      className: newExamForm.className,
      targetClasses: newExamForm.className === "Semua Kelas" ? availableClasses : [newExamForm.className],
      durationMinutes: Number(newExamForm.durationMinutes) || 20,
      token: newExamForm.token,
      bab: newExamForm.bab,
      status: "aktif",
      isSecureMode: true,
      isShuffleQuestions: newExamForm.isShuffleQuestions,
      isShuffleOptions: newExamForm.isShuffleOptions,
      examPackage: newExamForm.examPackage,
      createdAt: new Date().toISOString(),
      questions: newQuestions
    };`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('patched newExamObj');
