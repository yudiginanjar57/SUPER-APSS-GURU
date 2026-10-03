const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// We want to replace classList with filteredClassList and students with filteredStudents
// ONLY inside the profile modal. The profile modal is inside:
// {isProfileModalOpen && ( ... )}

const startIdx = code.indexOf('{isProfileModalOpen && (');
const endIdx = code.indexOf('</AnimatePresence>', startIdx);

if (startIdx > -1 && endIdx > -1) {
    let modalCode = code.substring(startIdx, endIdx);
    
    // Replace in "students" tab
    modalCode = modalCode.replace(/classList\[0\]/g, 'filteredClassList[0]');
    modalCode = modalCode.replace(/classList\.map/g, 'filteredClassList.map');
    modalCode = modalCode.replace(/classList\.length/g, 'filteredClassList.length');
    
    // Wait, replacing students.filter -> filteredStudents.filter
    modalCode = modalCode.replace(/students\.filter/g, 'filteredStudents.filter');
    
    code = code.substring(0, startIdx) + modalCode + code.substring(endIdx);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Patched successfully");
} else {
    console.log("Could not find modal bounds");
}
