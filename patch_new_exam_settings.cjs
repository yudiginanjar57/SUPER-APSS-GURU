const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

const targetStr = `                    </select>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">`;

const replacementStr = `                    </select>
                  </div>
                </div>

                {/* Advanced CBT Settings */}
                <div className="mt-4 grid grid-cols-3 gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={newExamForm.isShuffleQuestions} 
                      onChange={(e) => setNewExamForm({ ...newExamForm, isShuffleQuestions: e.target.checked })} 
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                    />
                    Acak Soal
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={newExamForm.isShuffleOptions} 
                      onChange={(e) => setNewExamForm({ ...newExamForm, isShuffleOptions: e.target.checked })} 
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                    />
                    Acak Opsi Jawaban
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Paket:</span>
                    <select
                      value={newExamForm.examPackage}
                      onChange={(e) => setNewExamForm({ ...newExamForm, examPackage: e.target.value })}
                      className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                    >
                      <option value="Utama">Utama</option>
                      <option value="Susulan">Susulan</option>
                      <option value="Remedial">Remedial</option>
                      <option value="Pengayaan">Pengayaan</option>
                      <option value="Paket A">Paket A</option>
                      <option value="Paket B">Paket B</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-extrabold text-slate-800 text-sm">Daftar Soal & Kunci Jawaban</h4>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        alert('Fitur Impor dari Excel sedang dikembangkan.');
                      }} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-[10px] font-black flex items-center gap-1">
                        <FileSpreadsheet size={14} /> Import Excel
                      </button>
                      <button onClick={() => {
                        alert('Fitur Parsing dari Word/PDF sedang dikembangkan.');
                      }} className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-[10px] font-black flex items-center gap-1">
                        <FileText size={14} /> Import Word/PDF
                      </button>
                    </div>
                  </div>`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
console.log('patched modal settings');
