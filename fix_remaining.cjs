const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix SyncLogEntry
code = code.replace(/type: "info" | "success" | "error"/g, 'status: type');
code = code.replace(/type: \\"info\\" | \\"success\\" | \\"error\\"/g, 'status: type');
code = code.replace(/type: "info" \| "success" \| "error"/g, 'status: type');

// Fix addSyncLog type
code = code.replace(/addSyncLog = \(message: string, type: "info" \| "success" \| "error"\)/g, 'addSyncLog = (message: string, type: "info" | "success" | "error" | "syncing")');

// Replace { id: ..., type } with { id: ..., status: type }
code = code.replace(/message, type \}\]/g, 'message, status: type }]');

// Fix the if (info) dangling logic
const applyCloudStr = `    if (Array.isArray(json.homeVisits)) setHomeVisits(json.homeVisits);

    const nowStr = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    setLastSyncTime(nowStr);
    localStorage.setItem("guru_cloud_last_sync", nowStr);`;

code = code.replace(/if \(Array\.isArray\(json\.homeVisits\)\) setHomeVisits\(json\.homeVisits\);\s*if \(info\)\s*const nowStr = new Date\(\)\.toLocaleString\("id-ID", \{ dateStyle: "medium", timeStyle: "short" \}\);\s*setLastSyncTime\(nowStr\);\s*localStorage\.setItem\("guru_cloud_last_sync", nowStr\);/, applyCloudStr);

// Same but in case 'if (info)' was already stripped by sed leaving empty space:
code = code.replace(/if \(Array\.isArray\(json\.homeVisits\)\) setHomeVisits\(json\.homeVisits\);\s*const nowStr = new Date\(\)\.toLocaleString\("id-ID", \{ dateStyle: "medium", timeStyle: "short" \}\);\s*setLastSyncTime\(nowStr\);\s*localStorage\.setItem\("guru_cloud_last_sync", nowStr\);/, applyCloudStr);

// Remove setSpreadsheetInfo
code = code.replace(/setSpreadsheetInfo\(info\);\n/g, '');
code = code.replace(/setSpreadsheetInfo\(null\);\n/g, '');

// Remove lastSyncedTime prop from CloudSyncModal
code = code.replace(/lastSyncedTime=\{lastSyncTime\}\n/g, '');

fs.writeFileSync('src/App.tsx', code);
