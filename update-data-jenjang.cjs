const fs = require('fs');
let code = fs.readFileSync('src/components/EduAsisten.tsx', 'utf8');

const regex = /const DATA_JENJANG = \{\s*"SD": \["1-2 \(Fase A\)", "3-4 \(Fase B\)", "5-6 \(Fase C\)"\],\s*"SMP": \["7-9 \(Fase D\)"\],\s*"SMA": \["10 \(Fase E\)", "11-12 \(Fase F\)"\],\s*"SMK": \["10 \(Fase E\)", "11-12 \(Fase F\)"\]\s*\};/;

const replacement = `const DATA_JENJANG = {
  "SD": ["1-2 (Fase A)", "3-4 (Fase B)", "5-6 (Fase C)"],
  "SMP": ["7-9 (Fase D)"],
  "SMA": ["10 (Fase E)", "11 (Fase F)", "12 (Fase F)"],
  "SMK": ["10 (Fase E)", "11 (Fase F)", "12 (Fase F)"]
};`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/EduAsisten.tsx', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
