const fs = require('fs');
let code = fs.readFileSync('src/components/EduAsisten.tsx', 'utf8');

const regex = /<div className="bg-amber-600 px-5 py-4 flex items-center justify-between shrink-0">\s*<h3 className="font-extrabold text-white flex items-center gap-2 text-base">\s*<FileQuestion size=\{20\} \/>\s*Generator Soal\s*<\/h3>\s*<button\s*onClick=\{([^}]+)\}\s*className="text-amber-100 hover:text-white transition-colors"\s*>\s*<X size=\{20\} \/>\s*<\/button>\s*<\/div>\s*<div className="p-5 overflow-y-auto space-y-4">/;

const replacement = `<div className="bg-amber-600 flex flex-col shrink-0">
              <div className="px-5 py-4 flex items-center justify-between">
                <h3 className="font-extrabold text-white flex items-center gap-2 text-base">
                  <FileQuestion size={20} />
                  Generator Soal
                </h3>
                <button 
                  onClick={() => setIsSoalModalOpen(false)}
                  className="text-amber-100 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex px-2 pb-0">
                <button
                  type="button"
                  onClick={() => setSoalModalTab('buat')}
                  className={\`px-4 py-2 text-sm font-bold border-b-2 transition-colors \${soalModalTab === 'buat' ? 'border-white text-white' : 'border-transparent text-amber-200 hover:text-amber-100'}\`}
                >
                  Buat dengan AI
                </button>
                <button
                  type="button"
                  onClick={() => setSoalModalTab('impor')}
                  className={\`px-4 py-2 text-sm font-bold border-b-2 transition-colors \${soalModalTab === 'impor' ? 'border-white text-white' : 'border-transparent text-amber-200 hover:text-amber-100'}\`}
                >
                  Impor Word/PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSoalModalTab('manual')}
                  className={\`px-4 py-2 text-sm font-bold border-b-2 transition-colors \${soalModalTab === 'manual' ? 'border-white text-white' : 'border-transparent text-amber-200 hover:text-amber-100'}\`}
                >
                  Input Manual
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/EduAsisten.tsx', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
