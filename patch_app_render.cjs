const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `                {activeTab === "eduasisten" && (
                  <EduAsisten />
                )}`;

const replacementStr = `                {activeTab === "evaluasi" && (
                  <EvaluasiSiswa
                    isStudent={isStudent}
                    currentUserRole={user?.role}
                    availableClasses={classList}
                    students={students}
                    subject={subject}
                    teacherName={teacherName}
                  />
                )}

                {activeTab === "eduasisten" && (
                  <EduAsisten />
                )}`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/App.tsx', code);
console.log('patched app component render');
