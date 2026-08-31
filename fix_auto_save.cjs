const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix the auto-save useEffect
const fixAutoSaveRegex = /const info = await saveToGoogleSheets\(payload\);/g;
code = code.replace(fixAutoSaveRegex, `
        if (googleUser) {
          const syncId = getActiveSyncId(googleUser);
          await saveUserDataToFirestore(syncId, payload);
        }
`);

// Replace remaining 'setLastGoogleSheetsSyncTime'
code = code.replaceAll('setLastGoogleSheetsSyncTime', 'setLastSyncTime');
code = code.replaceAll('guru_sheets_last_sync', 'guru_cloud_last_sync');
code = code.replaceAll('Cloud & Google Sheets', 'Cloud Firestore');

fs.writeFileSync('src/App.tsx', code);
