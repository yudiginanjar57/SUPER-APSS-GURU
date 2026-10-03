const fs = require('fs');
let code = fs.readFileSync('src/components/EduAsisten.tsx', 'utf8');

const regex = /<p className="leading-relaxed font-medium">\s*Tempelkan teks naskah soal dari dokumen Word\/PDF di bawah ini. AI akan merapikan soal, memberikan review singkat, serta menyusun <b>kunci jawaban dan pembahasan<\/b> lengkap.\s*<\/p>\s*<\/div>\s*<div className="space-y-1.5">\s*<label className="text-\[11px\] font-bold text-slate-700 uppercase tracking-wide">Teks Naskah Soal yang Diimpor<\/label>\s*<textarea\s*required\s*placeholder="Paste \(tempelkan\) teks soal dari Word\/PDF di sini\.\.\."\s*value=\{soalImporForm.fileText\}\s*onChange=\{\(e\) => setSoalImporForm\(\{\.\.\.soalImporForm, fileText: e.target.value\}\)\}\s*rows=\{10\}\s*className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500\/20 focus:border-amber-500 resize-none font-mono text-xs"\s*\/>\s*<\/div>/;

const replacement = `<p className="leading-relaxed font-medium">
                        Unggah file dokumen Word/PDF Anda, atau tempelkan teks naskah soal di bawah ini. AI akan merapikan soal, memberikan review singkat, serta menyusun <b>kunci jawaban dan pembahasan</b> lengkap.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Unggah Dokumen (PDF/Gambar)</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-amber-50/50 transition-colors text-center relative cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg,image/jpg"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const base64 = await compressFileForOCR(file);
                                const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
                                setSoalImporForm({
                                  ...soalImporForm,
                                  fileBase64: base64,
                                  fileMimeType: isPdf ? "application/pdf" : "image/jpeg",
                                  fileName: file.name
                                });
                              } catch (err) {
                                console.error("Error processing file:", err);
                              }
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="flex flex-col items-center gap-1 text-slate-600">
                          <Upload size={20} className="text-amber-600" />
                          <span className="font-bold text-[11px]">
                            {soalImporForm.fileName ? soalImporForm.fileName : "Klik untuk pilih file Soal PDF / Gambar"}
                          </span>
                          <span className="text-[10px] text-slate-400">PDF, PNG, JPG hingga 20MB</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Atau Paste Teks Naskah Soal</label>
                      <textarea
                        required={!soalImporForm.fileBase64}
                        placeholder="Paste (tempelkan) teks soal dari Word/PDF di sini..."
                        value={soalImporForm.fileText}
                        onChange={(e) => setSoalImporForm({...soalImporForm, fileText: e.target.value})}
                        rows={6}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none font-mono text-xs"
                      />
                    </div>`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/EduAsisten.tsx', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
