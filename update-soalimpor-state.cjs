const fs = require('fs');
let code = fs.readFileSync('src/components/EduAsisten.tsx', 'utf8');

const regex = /const \[soalImporForm, setSoalImporForm\] = useState\(\{[\s\n]*fileText: "",[\s\n]*instruksiTambahan: ""[\s\n]*\}\);/;

const replacement = `const [soalImporForm, setSoalImporForm] = useState({
    fileText: "",
    fileBase64: "",
    fileMimeType: "",
    fileName: "",
    instruksiTambahan: ""
  });`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/EduAsisten.tsx', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
