const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove imports
code = code.replace(/import\s*\{\s*saveUserDataToFirestore,\s*loadUserDataFromFirestore,\s*subscribeToFirestoreUserData,\s*AppDataPayload\s*\}\s*from\s*"[^"]+";/g, '');
code = code.replace(/import\s*CloudSyncModal[^;]+;/g, '');

// Remove Sync Config and Status States completely
// lines 276-324
code = code.replace(/\/\/ Cloud Sync States[\s\S]*?(?=\/\/ Track Google Auth state changes & Dual-Cloud Sync)/, '');

// Remove Track Google Auth state changes block completely
code = code.replace(/\/\/ Track Google Auth state changes & Dual-Cloud Sync \(Firestore Live Sync \+ Google Sheets\)[\s\S]*?(?=\/\/ Safe Storage Sync Effects)/, '');

// Remove Cloud Sync UI
// 1. Mobile Top nav 
code = code.replace(/\{.*?isRealtimeSyncEnabled.*?realtimeSyncStatus === "syncing"[\s\S]*?\s*<\/button>/, '');
// Wait, safer to just use edit_file or precise regex.

fs.writeFileSync('src/App.tsx', code);
