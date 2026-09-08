const fs = require('fs');
let code = fs.readFileSync('src/components/WaliKelas.tsx', 'utf8');

const targetStr = `{student.photo ? (
                          <img 
                            src={formatDriveImageUrl(student.photo)} 
                            alt={student.name} 
                            className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md mb-4 relative z-10" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (`

const newStr = `{student.photo ? (
                          <div className="relative inline-block z-10 mb-4">
                            <img 
                              src={formatDriveImageUrl(student.photo)} 
                              alt={student.name} 
                              className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md transition-transform duration-300" 
                              style={{ transform: \`rotate(\${student.photoRotation || 0}deg)\` }}
                              referrerPolicy="no-referrer"
                            />
                            <button
                              onClick={() => {
                                const currentRot = student.photoRotation || 0;
                                setStudents(students.map(s => s.id === student.id ? { ...s, photoRotation: currentRot + 90 } : s));
                              }}
                              className="absolute bottom-0 right-0 p-1.5 bg-white shadow-lg text-indigo-600 rounded-full hover:bg-indigo-50 border border-slate-200"
                              title="Putar Foto (Rotate)"
                            >
                              <RotateCw size={16} />
                            </button>
                          </div>
                        ) : (`

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('src/components/WaliKelas.tsx', code);
  console.log('Rotate button added successfully');
} else {
  console.log('Target string not found!');
}
