const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove imports
code = code.replace(/import\s*\{\s*saveUserDataToFirestore,\s*loadUserDataFromFirestore,\s*subscribeToFirestoreUserData,\s*AppDataPayload\s*\}\s*from\s*"([^"]+)";/g, '');
code = code.replace(/import\s*CloudSyncModal[^;]+;/g, '');

// Save it back
fs.writeFileSync('src/App.tsx', code);
