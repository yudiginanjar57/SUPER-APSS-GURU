const fs = require('fs');
let code = fs.readFileSync('src/components/StudentDashboard.tsx', 'utf8');

const targetStr = `            <div>
              <p className="font-bold text-xs">Materi & Modul Digital</p>
              <p className="text-[10px] text-indigo-200 mt-0.5">Akses file presentasi PPT & video pembelajaran</p>
            </div>
            <MonitorPlay size={16} className="text-white opacity-70" />
          </motion.button>
        </div>
      </div>`;

const replacementStr = `            <div>
              <p className="font-bold text-xs">Materi & Modul Digital</p>
              <p className="text-[10px] text-indigo-200 mt-0.5">Akses file presentasi PPT & video pembelajaran</p>
            </div>
            <MonitorPlay size={16} className="text-white opacity-70" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (onNavigate) {
                onNavigate("evaluasi");
              } else if (setActiveTab) {
                setActiveTab("evaluasi");
              }
            }}
            className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-colors cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-xs">Ujian & CBT</p>
              <p className="text-[10px] text-indigo-200 mt-0.5">Tes formatif, sumatif & ujian PTS/PAS</p>
            </div>
            <ShieldAlert size={16} className="text-white opacity-70" />
          </motion.button>
        </div>
      </div>`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  if (!code.includes('ShieldAlert')) {
    code = code.replace('MonitorPlay', 'MonitorPlay,\n  ShieldAlert');
  }
  fs.writeFileSync('src/components/StudentDashboard.tsx', code);
  console.log('patched StudentDashboard.tsx 2');
} else {
  console.log('target string 2 not found');
}
