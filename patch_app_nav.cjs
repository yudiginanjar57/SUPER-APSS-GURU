const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `  const navItems = isStudent
    ? [
        { id: "dashboard", label: "Dashboard Siswa", icon: LayoutDashboard },
        { id: "ruangbelajar", label: "Ruang Belajar", icon: MonitorPlay }
      ]
    : [
        { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
        { id: "ruangbelajar", label: "Ruang Belajar", icon: MonitorPlay },
        { id: "eduasisten", label: "EduAsisten AI", icon: Bot },`;

const replacementStr = `  const navItems = isStudent
    ? [
        { id: "dashboard", label: "Dashboard Siswa", icon: LayoutDashboard },
        { id: "ruangbelajar", label: "Ruang Belajar", icon: MonitorPlay },
        { id: "evaluasi", label: "Evaluasi & Ujian (CBT)", icon: ShieldAlert }
      ]
    : [
        { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
        { id: "ruangbelajar", label: "Ruang Belajar", icon: MonitorPlay },
        { id: "evaluasi", label: "Evaluasi (CBT)", icon: ShieldAlert },
        { id: "eduasisten", label: "EduAsisten AI", icon: Bot },`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/App.tsx', code);
console.log('patched nav items');
