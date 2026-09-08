const fs = require('fs');
let code = fs.readFileSync('src/components/WaliKelas.tsx', 'utf8');

// 1. Fix Excel import
const targetImportStr = `
            updatedStudents[studentIndex] = {
              ...st,
              gender: row['Jenis Kelamin'] || row['L/P'] || row['Laki-laki / Perempuan'] || st.gender,
              placeOfBirth: row['Tempat Lahir'] || st.placeOfBirth,
              dateOfBirth: row['Tanggal Lahir'] || st.dateOfBirth,
              religion: row['Agama'] || st.religion,
              address: row['Alamat'] || row['Domisili'] || st.address,
              studentPhone: row['No HP Siswa'] || row['No WA Siswa'] || row['No Telepon Siswa'] || st.studentPhone,
              parentName: row['Nama Orang Tua'] || row['Nama Wali'] || st.parentName,
              parentPhone: row['No Telepon Orang Tua'] || row['No Telepon'] || row['No WhatsApp'] || row['HP Orang Tua'] || st.parentPhone,
              photo: finalPhoto
            };
`;

const replacementImportStr = `
            let parsedDateOfBirth = row['Tanggal Lahir'] || st.dateOfBirth;
            if (typeof parsedDateOfBirth === 'number') {
              const dateObj = new Date(Math.round((parsedDateOfBirth - 25569) * 86400 * 1000));
              const y = dateObj.getUTCFullYear();
              const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
              const d = String(dateObj.getUTCDate()).padStart(2, '0');
              parsedDateOfBirth = \`\${y}-\${m}-\${d}\`;
            } else if (typeof parsedDateOfBirth === 'string' && parsedDateOfBirth.includes('/')) {
               const parts = parsedDateOfBirth.split('/');
               if (parts.length === 3 && parts[2].length === 4) {
                 parsedDateOfBirth = \`\${parts[2]}-\${parts[1].padStart(2, '0')}-\${parts[0].padStart(2, '0')}\`;
               }
            }

            updatedStudents[studentIndex] = {
              ...st,
              gender: row['Jenis Kelamin'] || row['L/P'] || row['Laki-laki / Perempuan'] || st.gender,
              placeOfBirth: row['Tempat Lahir'] || st.placeOfBirth,
              dateOfBirth: parsedDateOfBirth,
              religion: row['Agama'] || "Islam", // Default all empty or invalid to Islam per request
              address: row['Alamat'] || row['Domisili'] || st.address,
              studentPhone: row['No HP Siswa'] || row['No WA Siswa'] || row['No Telepon Siswa'] || st.studentPhone,
              parentName: row['Nama Orang Tua'] || row['Nama Wali'] || st.parentName,
              parentPhone: row['No Telepon Orang Tua'] || row['No Telepon'] || row['No WhatsApp'] || row['HP Orang Tua'] || st.parentPhone,
              photo: finalPhoto
            };
`;

code = code.replace(targetImportStr, replacementImportStr);

// 2. Revert UI from editable inputs to static tags
const uiTargetStr = `<div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Jenis Kelamin</p>
                            <select
                              value={student.gender || ""}
                              onChange={(e) => setStudents(students.map(s => s.id === student.id ? { ...s, gender: e.target.value as "L" | "P" | "" } : s))}
                              className="text-sm font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 w-full py-0.5 transition-colors cursor-pointer"
                            >
                              <option value="">Pilih...</option>
                              <option value="L">Laki-laki</option>
                              <option value="P">Perempuan</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tempat Lahir</p>
                            <input 
                              type="text"
                              value={student.placeOfBirth || ""}
                              onChange={(e) => setStudents(students.map(s => s.id === student.id ? { ...s, placeOfBirth: e.target.value } : s))}
                              placeholder="Masukkan kota..."
                              className="text-sm font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 w-full py-0.5 transition-colors"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal Lahir</p>
                            <input 
                              type="date"
                              value={student.dateOfBirth || ""}
                              onChange={(e) => setStudents(students.map(s => s.id === student.id ? { ...s, dateOfBirth: e.target.value } : s))}
                              className="text-sm font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 w-full py-0.5 transition-colors cursor-pointer"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Agama</p>
                            <select
                              value={student.religion || ""}
                              onChange={(e) => setStudents(students.map(s => s.id === student.id ? { ...s, religion: e.target.value } : s))}
                              className="text-sm font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 w-full py-0.5 transition-colors cursor-pointer"
                            >
                              <option value="">Pilih...</option>
                              <option value="Islam">Islam</option>
                              <option value="Kristen">Kristen</option>
                              <option value="Katolik">Katolik</option>
                              <option value="Hindu">Hindu</option>
                              <option value="Buddha">Buddha</option>
                              <option value="Konghucu">Konghucu</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Phone size={12} /> No. HP/WA Siswa</p>
                            <div className="flex items-center gap-3">
                              <input 
                                type="tel"
                                value={student.studentPhone || ""}
                                onChange={(e) => setStudents(students.map(s => s.id === student.id ? { ...s, studentPhone: e.target.value } : s))}
                                placeholder="08..."
                                className="text-sm font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 w-full py-0.5 transition-colors"
                              />
                              {student.studentPhone && (
                                <a 
                                  href={\`https://wa.me/\${student.studentPhone.replace(/\\D/g, '').replace(/^0/, '62')}\`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-[10px] font-bold transition-colors border border-green-200 flex items-center gap-1 shrink-0"
                                >
                                  Chat WA
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={12} /> Alamat Domisili</p>
                            <input 
                              type="text"
                              value={student.address || ""}
                              onChange={(e) => setStudents(students.map(s => s.id === student.id ? { ...s, address: e.target.value } : s))}
                              placeholder="Ketik alamat lengkap..."
                              className="text-sm font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 w-full py-0.5 transition-colors"
                            />
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-y border-slate-100">
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                            <Users size={14} className="text-indigo-500" /> Data Orang Tua / Wali
                          </h5>
                        </div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nama Orang Tua</p>
                            <input 
                              type="text"
                              value={student.parentName || ""}
                              onChange={(e) => setStudents(students.map(s => s.id === student.id ? { ...s, parentName: e.target.value } : s))}
                              placeholder="Nama ayah / ibu..."
                              className="text-sm font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 w-full py-0.5 transition-colors"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Phone size={12} /> No. Telepon / WhatsApp</p>
                            <div className="flex items-center gap-3">
                              <input 
                                type="tel"
                                value={student.parentPhone || ""}
                                onChange={(e) => setStudents(students.map(s => s.id === student.id ? { ...s, parentPhone: e.target.value } : s))}
                                placeholder="08..."
                                className="text-sm font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 w-full py-0.5 transition-colors"
                              />
                              {student.parentPhone && (
                                <a 
                                  href={\`https://wa.me/\${student.parentPhone.replace(/\\D/g, '').replace(/^0/, '62')}\`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-[10px] font-bold transition-colors border border-green-200 flex items-center gap-1 shrink-0"
                                >
                                  Chat WA
                                </a>
                              )}
                            </div>
                          </div>`;

const staticUiReplacement = `<div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Jenis Kelamin</p>
                            <p className="text-sm font-semibold text-slate-700">{student.gender === 'L' ? 'Laki-laki' : student.gender === 'P' ? 'Perempuan' : '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tempat Lahir</p>
                            <p className="text-sm font-semibold text-slate-700 uppercase">{student.placeOfBirth || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal Lahir</p>
                            <p className="text-sm font-semibold text-slate-700">
                              {student.dateOfBirth ? (
                                new Date(student.dateOfBirth).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric'
                                })
                              ) : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Agama</p>
                            <p className="text-sm font-semibold text-slate-700">{student.religion || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Phone size={12} /> No. HP/WA Siswa</p>
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-semibold text-slate-700">{student.studentPhone || '-'}</p>
                              {student.studentPhone && (
                                <a 
                                  href={\`https://wa.me/\${student.studentPhone.replace(/\\D/g, '').replace(/^0/, '62')}\`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-[10px] font-bold transition-colors border border-green-200 flex items-center gap-1 shrink-0"
                                >
                                  Chat WA
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={12} /> Alamat Domisili</p>
                            <p className="text-sm font-semibold text-slate-700">{student.address || '-'}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-y border-slate-100">
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                            <Users size={14} className="text-indigo-500" /> Data Orang Tua / Wali
                          </h5>
                        </div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nama Orang Tua</p>
                            <p className="text-sm font-semibold text-slate-700 uppercase">{student.parentName || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Phone size={12} /> No. Telepon / WhatsApp</p>
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-semibold text-slate-700">{student.parentPhone || '-'}</p>
                              {student.parentPhone && (
                                <a 
                                  href={\`https://wa.me/\${student.parentPhone.replace(/\\D/g, '').replace(/^0/, '62')}\`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-[10px] font-bold transition-colors border border-green-200 flex items-center gap-1 shrink-0"
                                >
                                  Chat WA
                                </a>
                              )}
                            </div>
                          </div>`;

if(code.includes('dateOfBirth: row[\'Tanggal Lahir\'] || st.dateOfBirth,')) {
  code = code.replace(uiTargetStr, staticUiReplacement);
  fs.writeFileSync('src/components/WaliKelas.tsx', code);
  console.log('Successfully reverted both logic and UI');
} else if (code.includes('student.address || ""')) {
    // If the exact match failed, let's just do it with index matching
    const splitIndex = code.indexOf('<div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">');
    const endStr = `Chat WA
                                </a>
                              )}
                            </div>
                          </div>`;
    const endIndex = code.indexOf(endStr, splitIndex) + endStr.length;
    
    // We only replace the UI part
    const beforeUI = code.substring(0, splitIndex);
    const afterUI = code.substring(endIndex);
    
    // Also patch the handleFileUpload
    const patchedBefore = beforeUI.replace(targetImportStr, replacementImportStr);
    
    fs.writeFileSync('src/components/WaliKelas.tsx', patchedBefore + staticUiReplacement + afterUI);
    console.log('Successfully patched using manual indices');
}

