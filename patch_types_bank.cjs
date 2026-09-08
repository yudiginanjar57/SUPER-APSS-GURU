const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const targetStr = `export interface EvaluationExam {`;

const replacementStr = `export interface QuestionBankItem extends EvaluationQuestion {
  subject: string;
  className: string;
  bab: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationExam {`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('src/types.ts', code);
  console.log('patched types');
} else {
  console.log('not found');
}
