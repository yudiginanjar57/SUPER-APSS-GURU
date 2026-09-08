const fs = require('fs');
let code = fs.readFileSync('src/components/BankSoal.tsx', 'utf8');

code = code.replace("id: editingQuestion ? editingQuestion.id : \\`qb-\\${Date.now()}\\`,", "id: editingQuestion ? editingQuestion.id : `qb-${Date.now()}`,");

code = code.replace("{q.type === 'pg' || q.type === 'pg_kompleks' ? \\`\\${q.options?.length || 0} Opsi\\` : ''}", "{q.type === 'pg' || q.type === 'pg_kompleks' ? `${q.options?.length || 0} Opsi` : ''}");

code = code.replace("{q.type === 'menjodohkan' ? \\`\\${q.matchingPairs?.length || 0} Pasang\\` : ''}", "{q.type === 'menjodohkan' ? `${q.matchingPairs?.length || 0} Pasang` : ''}");

fs.writeFileSync('src/components/BankSoal.tsx', code);
console.log('fixed backticks 3');
