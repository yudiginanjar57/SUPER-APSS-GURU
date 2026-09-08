const fs = require('fs');
let code = fs.readFileSync('src/components/Penilaian.tsx', 'utf8');

const oldBtn = `<label className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0">
                                  <Camera size={11} />
                                  <span className="hidden sm:inline">Ambil</span> Foto
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => handleStudentFileUpload(student.id, student.name, e)}
                                    className="hidden"
                                  />
                                </label>`;

const newBtn = `<button
                                  type="button"
                                  onClick={() => setCameraTargetStudent({ id: student.id, name: student.name })}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  <Camera size={11} />
                                  <span className="hidden sm:inline">Ambil</span> Foto
                                </button>`;

if (code.includes(oldBtn)) {
  code = code.replace(oldBtn, newBtn);
  fs.writeFileSync('src/components/Penilaian.tsx', code);
  console.log('Button replaced successfully');
} else {
  console.log('Button not found. Trying regex...');
  
  const regex = /<label className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-\[10px\] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0">\s*<Camera size=\{11\} \/>\s*<span className="hidden sm:inline">Ambil<\/span> Foto\s*<input\s*type="file"\s*accept="image\/\*"\s*capture="environment"\s*onChange=\{\(e\) => handleStudentFileUpload\(student\.id, student\.name, e\)\}\s*className="hidden"\s*\/>\s*<\/label>/gs;
  
  if(regex.test(code)) {
      code = code.replace(regex, newBtn);
      fs.writeFileSync('src/components/Penilaian.tsx', code);
      console.log('Button replaced successfully via regex');
  } else {
      console.log('Regex also failed');
  }
}
