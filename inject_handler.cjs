const fs = require('fs');
let code = fs.readFileSync('src/components/Penilaian.tsx', 'utf8');

const handlerCode = `
  const handleCameraCapture = (file: File) => {
    if (!cameraTargetStudent) return;
    const { id, name } = cameraTargetStudent;
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setStudentUploadedFiles(prev => ({
        ...prev,
        [id]: {
          file,
          base64,
          mimeType: file.type || "image/jpeg",
          name: file.name
        }
      }));
      // Auto-check this student in batch list if not already checked
      setSelectedStudentsForBatch(prev => prev.includes(id) ? prev : [...prev, id]);
      setCameraTargetStudent(null);
    };
    reader.readAsDataURL(file);
  };
`;

const insertMarker = 'const handleStudentFileUpload = (studentId: string, studentName: string, e: ChangeEvent<HTMLInputElement>) => {';
if (code.includes(insertMarker)) {
  code = code.replace(insertMarker, handlerCode + '\n  ' + insertMarker);
  fs.writeFileSync('src/components/Penilaian.tsx', code);
  console.log('Handler injected successfully');
} else {
  console.log('Marker not found');
}
