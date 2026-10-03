const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const \{ prompt \} = req\.body;\s*if \(!prompt\) \{\s*return res\.status\(400\)\.json\(\{ error: "Prompt is required\." \}\);\s*\}/;

const replacement = `const { prompt, fileBase64, fileMimeType } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server.ts', code);
    console.log("SUCCESS 1");
} else {
    console.log("REGEX 1 NOT FOUND");
}

const regex2 = /const response = await generateContentWithRetry\(ai, \{\s*contents: prompt,\s*config: \{\s*systemInstruction,\s*\}\s*\}\);/;

const replacement2 = `
    let contents = prompt;
    if (fileBase64 && fileMimeType) {
      contents = [
        { text: prompt },
        { inlineData: { data: fileBase64, mimeType: fileMimeType } }
      ];
    }

    const response = await generateContentWithRetry(ai, {
      contents,
      config: {
        systemInstruction,
      }
    });`;

if (regex2.test(code)) {
    code = code.replace(regex2, replacement2);
    fs.writeFileSync('server.ts', code);
    console.log("SUCCESS 2");
} else {
    console.log("REGEX 2 NOT FOUND");
}
