const fs = require('fs');
let code = fs.readFileSync('src/components/EduAsisten.tsx', 'utf8');

const regex = /<form id="soal-form" onSubmit=\{handleSoalSubmit\} className="space-y-4">([\s\S]*?)<\/form>\s*<\/div>\s*<div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">/;

if (regex.test(code)) {
    const match = code.match(regex);
    let formContent = match[1];

    let newFormContent = `
                {soalModalTab === 'buat' && (
                  <div className="space-y-4">
${formContent}
                  </div>
                )}
                {soalModalTab === 'impor' && (
                  <div className="space-y-4">
                    <div className="bg-indigo-50 border border-indigo-200/80 p-3 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900">
                      <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed font-medium">
                        Tempelkan teks naskah soal dari dokumen Word/PDF di bawah ini. AI akan merapikan soal, memberikan review singkat, serta menyusun <b>kunci jawaban dan pembahasan</b> lengkap.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Teks Naskah Soal yang Diimpor</label>
                      <textarea
                        required
                        placeholder="Paste (tempelkan) teks soal dari Word/PDF di sini..."
                        value={soalImporForm.fileText}
                        onChange={(e) => setSoalImporForm({...soalImporForm, fileText: e.target.value})}
                        rows={10}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Instruksi Tambahan (Opsional)</label>
                      <textarea
                        placeholder="Contoh: Fokuskan review pada tingkat kesulitan soal..."
                        value={soalImporForm.instruksiTambahan}
                        onChange={(e) => setSoalImporForm({...soalImporForm, instruksiTambahan: e.target.value})}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                      />
                    </div>
                  </div>
                )}
                {soalModalTab === 'manual' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
                      <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed font-medium">
                        Input manual soal yang Anda miliki. AI akan membantu <b>merapikan format</b>, menyisipkan <b>stimulus</b> (jika perlu), serta membuatkan <b>kunci jawaban & pembahasan detail</b>.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Jenjang</label>
                        <select
                          value={soalManualForm.jenjang}
                          onChange={(e) => {
                            const newKelas = DATA_JENJANG[e.target.value as keyof typeof DATA_JENJANG][0];
                            const newMapelList = getMapelList(newKelas);
                            setSoalManualForm(prev => ({
                              ...prev,
                              jenjang: e.target.value,
                              kelas: newKelas,
                              mapel: newMapelList.includes(prev.mapel) ? prev.mapel : newMapelList[0]
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        >
                          <option value="SD">SD</option>
                          <option value="SMP">SMP</option>
                          <option value="SMA">SMA</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Kelas / Fase</label>
                        <select
                          value={soalManualForm.kelas}
                          onChange={(e) => {
                            const newMapelList = getMapelList(e.target.value);
                            setSoalManualForm(prev => ({
                              ...prev,
                              kelas: e.target.value,
                              mapel: newMapelList.includes(prev.mapel) ? prev.mapel : newMapelList[0]
                            }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        >
                          {DATA_JENJANG[soalManualForm.jenjang as keyof typeof DATA_JENJANG].map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Mata Pelajaran</label>
                        <select
                          value={soalManualForm.mapel}
                          onChange={(e) => setSoalManualForm({...soalManualForm, mapel: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        >
                          {getMapelList(soalManualForm.kelas).map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Materi Pokok / Topik</label>
                        <input
                          type="text"
                          placeholder="Contoh: Persamaan Kuadrat / Teks Anekdot"
                          value={soalManualForm.materi}
                          onChange={(e) => setSoalManualForm({...soalManualForm, materi: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Naskah Soal (Input Manual)</label>
                      <textarea
                        required
                        placeholder="Ketik soal Anda di sini..."
                        value={soalManualForm.naskahSoal}
                        onChange={(e) => setSoalManualForm({...soalManualForm, naskahSoal: e.target.value})}
                        rows={8}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Instruksi Tambahan (Opsional)</label>
                      <textarea
                        placeholder="Contoh: Tolong buatkan stimulus berupa grafik/tabel yang relevan dengan soal-soal ini..."
                        value={soalManualForm.instruksiTambahan}
                        onChange={(e) => setSoalManualForm({...soalManualForm, instruksiTambahan: e.target.value})}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                      />
                    </div>
                  </div>
                )}
`;

    const replacement = `<form id="soal-form" onSubmit={handleSoalSubmit} className="space-y-4">
${newFormContent}
              </form>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">`;

    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/EduAsisten.tsx', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
