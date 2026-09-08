import fs from 'fs';
const text = fs.readFileSync('src/App.tsx', 'utf8');
const loginListMatch = text.match(/const loginForDriveList = useGoogleLogin\(\{(.*?)\}\);/s);
console.log("loginList:", loginListMatch ? loginListMatch[1].substring(0, 200) : "not found");
