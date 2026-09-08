const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

const targetStr = `                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => {
                            const updated = [...newQuestions];
                            updated[idx].question = e.target.value;
                            setNewQuestions(updated);
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800"
                          placeholder="Pertanyaan..."
                        />
                      </div>`;

const replacementStr = `                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => {
                            const updated = [...newQuestions];
                            updated[idx].question = e.target.value;
                            setNewQuestions(updated);
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 text-xs"
                          placeholder="Pertanyaan..."
                        />
                        <select
                          value={q.type}
                          onChange={(e) => {
                            const updated = [...newQuestions];
                            updated[idx].type = e.target.value as any;
                            // Reset structure based on type
                            if (e.target.value === 'menjodohkan') {
                              updated[idx].matchingPairs = [
                                { left: 'A', right: 'X' },
                                { left: 'B', right: 'Y' }
                              ];
                            } else if (e.target.value === 'pg' || e.target.value === 'pg_kompleks') {
                              updated[idx].options = ['A', 'B', 'C', 'D'];
                            }
                            setNewQuestions(updated);
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs outline-none"
                        >
                          <option value="pg">Pilihan Ganda</option>
                          <option value="pg_kompleks">Pilihan Ganda Kompleks</option>
                          <option value="benar_salah">Benar/Salah</option>
                          <option value="menjodohkan">Menjodohkan</option>
                          <option value="isian">Isian Singkat</option>
                          <option value="essay">Uraian</option>
                        </select>
                        <p className="text-[10px] text-indigo-600 font-bold">* Konfigurasi opsi jawaban lebih lanjut dapat dilakukan melalui fitur Import Excel/Word untuk efisiensi.</p>
                      </div>`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('patched question editor');
