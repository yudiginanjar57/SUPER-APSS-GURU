const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

const targetStr = `                {/* 4. Isian / Essay */}`;

const replacementStr = `                {/* 4. Menjodohkan */}
                {activeExam.questions[currentQuestionIdx]?.type === 'menjodohkan' && activeExam.questions[currentQuestionIdx]?.matchingPairs && (
                  <div className="space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 font-bold mb-2 uppercase">Pasangkan kolom kiri dengan opsi di kolom kanan:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Kiri */}
                      <div className="space-y-3">
                        {activeExam.questions[currentQuestionIdx].matchingPairs!.map((pair, idx) => {
                          const qId = activeExam.questions[currentQuestionIdx].id;
                          const currentAnswers = answers[qId] || {};
                          // We get the right options (shuffled if applicable, otherwise original)
                          const rightOptions = activeExam.questions[currentQuestionIdx].shuffledRightsForSession 
                                             || activeExam.questions[currentQuestionIdx].matchingPairs!.map(p => p.right);
                          
                          return (
                            <div key={idx} className="flex flex-col space-y-1">
                              <div className="p-3 bg-slate-700 rounded-lg text-sm font-semibold text-slate-200 border border-slate-600">
                                {pair.left}
                              </div>
                              <select
                                value={currentAnswers[pair.left] || ""}
                                onChange={(e) => {
                                  const newObj = { ...currentAnswers, [pair.left]: e.target.value };
                                  handleSelectAnswer(qId, newObj);
                                }}
                                className="p-2 bg-slate-800 text-slate-300 text-sm rounded-lg border border-slate-600 outline-none focus:border-indigo-500"
                              >
                                <option value="" disabled>-- Pilih Pasangan --</option>
                                {rightOptions.map((opt, rIdx) => (
                                  <option key={rIdx} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Isian / Essay */}`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('patched rendering menjodohkan');
