const fs = require('fs');
let code = fs.readFileSync('src/components/EvaluasiSiswa.tsx', 'utf8');

const targetStr = `        )}
      </AnimatePresence>
    </div>
  );
}`;

const replacementStr = `        )}

        {isBankModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <Database className="text-emerald-600" size={20} />
                  Ambil dari Bank Soal
                </h3>
                <button
                  onClick={() => setIsBankModalOpen(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {(!bankQuestions || bankQuestions.length === 0) ? (
                  <div className="p-8 text-center text-slate-500 font-semibold bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    Bank soal Anda masih kosong. Silakan tambahkan butir soal di menu "Bank Soal".
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bankQuestions.map((q) => {
                      const isAdded = newQuestions.some(nq => nq.question === q.question && nq.type === q.type);
                      return (
                        <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-2">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-black uppercase">
                                  {q.type.replace('_', ' ')}
                                </span>
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase">
                                  {q.className}
                                </span>
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase max-w-[100px] truncate" title={q.bab}>
                                  {q.bab}
                                </span>
                              </div>
                              <p className="font-bold text-sm text-slate-800 line-clamp-2">{q.question}</p>
                            </div>
                            <button
                              onClick={() => {
                                if (isAdded) {
                                  setNewQuestions(prev => prev.filter(nq => !(nq.question === q.question && nq.type === q.type)));
                                } else {
                                  const payload = { ...q, id: \`q-\${Date.now()}-\${Math.random().toString(36).substring(7)}\` };
                                  setNewQuestions(prev => [...prev, payload]);
                                }
                              }}
                              className={\`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm transition-colors cursor-pointer flex items-center gap-1 \${
                                isAdded 
                                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }\`}
                            >
                              {isAdded ? <><Trash2 size={12}/> Hapus</> : <><Plus size={12}/> Tambahkan</>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-800 text-white font-extrabold text-sm rounded-xl cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}`;

if (code.includes(targetStr) && !code.includes('isBankModalOpen &&')) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('src/components/EvaluasiSiswa.tsx', code);
  console.log('patched bank modal');
} else {
  console.log('failed to patch bank modal or already exists');
}
