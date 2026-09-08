const fs = require('fs');
let code = fs.readFileSync('src/components/Penilaian.tsx', 'utf8');

const modalCode = `
      {cameraTargetStudent && (
        <CameraCaptureModal 
          title={\`Ambil Foto Jawaban: \${cameraTargetStudent.name}\`}
          onCapture={handleCameraCapture}
          onClose={() => setCameraTargetStudent(null)}
        />
      )}
`;

const insertPoint = '{isGradedStudentsModalOpen && (';
if (code.includes(insertPoint)) {
  code = code.replace(insertPoint, modalCode + '\n      ' + insertPoint);
  fs.writeFileSync('src/components/Penilaian.tsx', code);
  console.log('Modal rendering appended');
} else {
  console.log('Insert point not found');
}
