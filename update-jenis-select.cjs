const fs = require('fs');
let code = fs.readFileSync('src/components/EduAsisten.tsx', 'utf8');

const regex = /<option value="Analisis CP & ATP">Analisis CP, TP, dan ATP<\/option>\s*<\/select>/;

const replacement = `<option value="Analisis CP & ATP">Analisis CP, TP, dan ATP</option>
                      <option value="Prota, Prosem & Analisis KKTP">Prota, Prosem & Analisis KKTP</option>
                    </select>`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/EduAsisten.tsx', code);
    console.log("SUCCESS");
} else {
    console.log("REGEX NOT FOUND");
}
