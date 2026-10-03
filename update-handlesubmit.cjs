const fs = require('fs');
let code = fs.readFileSync('src/components/EduAsisten.tsx', 'utf8');

const regex = /const handleSubmit = async \(e\?: React\.FormEvent, customInput\?: string\) => \{/;
const replacement = `const handleSubmit = async (e?: React.FormEvent, customInput?: string, fileData?: { base64: string, mimeType: string, name: string }) => {`;

const regex2 = /body: JSON\.stringify\(\{ prompt: finalPrompt \}\)/;
const replacement2 = `body: JSON.stringify({ prompt: finalPrompt, fileBase64: fileData?.base64, fileMimeType: fileData?.mimeType })`;

const regex3 = /const userMessage: Message = \{\s*id: Date.now\(\).toString\(\),\s*role: "user",\s*content: promptText.trim\(\),\s*replyTo: replyToData\s*\};/;
const replacement3 = `const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: promptText.trim() + (fileData ? \`\\n\\n[File Dilampirkan: \${fileData.name}]\` : ""),
      replyTo: replyToData
    };`;

if (regex.test(code) && regex2.test(code) && regex3.test(code)) {
    code = code.replace(regex, replacement);
    code = code.replace(regex2, replacement2);
    code = code.replace(regex3, replacement3);
    fs.writeFileSync('src/components/EduAsisten.tsx', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
