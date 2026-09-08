const fs = require('fs');
let code = fs.readFileSync('src/components/StudentDashboard.tsx', 'utf8');

const targetStr = `      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="student-quick-links">
        {/* Study Room Promo Card */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onQuickAction("ruangbelajar")}
          className="relative overflow-hidden flex items-start gap-4 p-5 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 text-left shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >`;

const replacementStr = `      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="student-quick-links">
        {/* Study Room Promo Card */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onQuickAction("ruangbelajar")}
          className="relative overflow-hidden flex items-start gap-4 p-5 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 text-left shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >`;

code = code.replace(targetStr, replacementStr);

const targetStr2 = `        {/* Assignment Action Card */}`;
const replacementStr2 = `        {/* CBT Exam Card */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onQuickAction("evaluasi")}
          className="relative overflow-hidden flex items-start gap-4 p-5 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 to-orange-50 text-left shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-xl bg-white text-rose-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-alert"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm mb-1">Ujian & Evaluasi CBT</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">Akses sistem ujian aman (Safe Exam Mode) dan tes formatif</p>
          </div>
        </motion.button>
        
        {/* Assignment Action Card */}`;

code = code.replace(targetStr2, replacementStr2);

fs.writeFileSync('src/components/StudentDashboard.tsx', code);
console.log('patched StudentDashboard.tsx');
