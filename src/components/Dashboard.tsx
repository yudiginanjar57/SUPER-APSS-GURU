import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckSquare, 
  BookOpen, 
  Plus, 
  TrendingUp, 
  Award,
  ChevronRight,
  Smile,
  AlertCircle
} from "lucide-react";
import { ScheduleItem, Student, JournalEntry, Assignment, Attendance, Submission, StudentGrade } from "../types";

interface DashboardProps {
  schedule: ScheduleItem[];
  students: Student[];
  journals: JournalEntry[];
  assignments: Assignment[];
  attendanceList?: Attendance[];
  submissions?: Submission[];
  grades?: StudentGrade[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  teacherName: string;
  setTeacherName: (name: string) => void;
  onQuickAction: (action: string) => void;
  classList?: string[];
}

export default function Dashboard({
  schedule,
  students,
  journals,
  assignments,
  attendanceList,
  submissions,
  grades,
  activeTab,
  setActiveTab,
  teacherName,
  setTeacherName,
  onQuickAction,
  classList
}: DashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Synchronized stats computation from real state
  const totalClasses = classList ? classList.length : 0;
  const totalStudents = students.length;
  const totalAssignments = assignments.length;
  const journalCount = journals.length;

  // Real-time attendance percentage computation
  const todayDateStr = new Date().toISOString().split("T")[0];
  const todayAttendance = attendanceList && attendanceList.length > 0 
    ? attendanceList.filter(a => a.date === todayDateStr)
    : [];
  const attendanceSource = todayAttendance.length > 0 ? todayAttendance : (attendanceList || []);
  const presentCount = attendanceSource.filter(a => a.status === 'Hadir').length;
  const attendancePercentage = attendanceSource.length > 0 
    ? `${Math.round((presentCount / attendanceSource.length) * 100)}%`
    : "-";

  // Administrative workload / task progress computation
  const totalSubmissions = submissions ? submissions.length : 0;
  const gradedSubmissions = submissions ? submissions.filter(s => s.score !== null && s.score !== undefined).length : 0;
  const workloadProgress = totalAssignments > 0 ? Math.min(100, Math.round((gradedSubmissions / (totalAssignments * Math.max(1, totalStudents || 1))) * 100)) : 0;
  const displayProgress = Math.max(workloadProgress, totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : 0);

  // Determine current day of week in Indonesian
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const currentDayName = days[new Date().getDay()] as any;
  const todaySchedule = schedule.filter(s => s.day === currentDayName);

  // Get current date string
  const formatDateIndo = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const isScheduleActive = (startTime: string, endTime: string) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const [endH, endM] = endTime.split(':').map(Number);
    const endMinutes = endH * 60 + endM;
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  };

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 p-6 md:p-8 text-white shadow-xl"
        id="welcome-banner"
      >
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wider">
              <Smile size={14} className="text-indigo-200" /> SUPER APP GURU V1.0
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold font-display leading-tight">
              Selamat Datang, 
              <input 
                type="text" 
                value={teacherName} 
                onChange={(e) => setTeacherName(e.target.value)}
                className="ml-2 inline-block bg-transparent border-b-2 border-white/50 hover:border-white focus:border-white focus:outline-none transition-colors cursor-pointer w-auto font-display font-black text-white placeholder-indigo-200 max-w-[280px]"
                placeholder="Nama Anda"
                id="teacher-name-input"
              />
            </h1>
            <p className="text-indigo-100 text-sm md:text-base font-medium">
              {formatDateIndo(currentTime)} • Siap melayani administrasi mengajar Anda hari ini.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
            {/* Elegant Large Clock Widget in the empty space */}
            <div className="bg-white/12 backdrop-blur-lg border border-white/15 rounded-2xl px-6 py-3 flex flex-col items-center justify-center min-w-[160px] shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200 mb-0.5">WAKTU REAL-TIME</span>
              <span className="text-2xl md:text-3xl font-black font-mono tracking-widest text-white drop-shadow-sm flex items-center gap-0.5">
                {formatTime(currentTime)}
              </span>
            </div>

            <div className="flex gap-2">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onQuickAction("create-journal")}
                className="flex-1 sm:flex-initial px-4 py-3 bg-white text-indigo-600 rounded-2xl text-xs md:text-sm font-bold shadow-md hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                id="btn-quick-journal"
              >
                <Plus size={16} /> Tulis Jurnal
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onQuickAction("grade-essay")}
                className="flex-1 sm:flex-initial px-4 py-3 bg-indigo-900/80 text-white rounded-2xl text-xs md:text-sm font-bold shadow-md hover:bg-indigo-950 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                id="btn-quick-grade"
              >
                <Award size={16} /> AI Penilaian
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        {[
          { 
            id: "stat-classes",
            title: "Kelas Aktif", 
            value: totalClasses, 
            desc: `${totalClasses} rombel terdaftar`, 
            color: "from-blue-400 to-indigo-500", 
            icon: Users,
            tab: "dashboard"
          },
          { 
            id: "stat-attendance",
            title: "Kehadiran Hari Ini", 
            value: attendancePercentage, 
            desc: attendanceSource.length > 0 ? "Berdasarkan absensi" : "Rata-rata kehadiran", 
            color: "from-emerald-400 to-teal-500", 
            icon: CheckSquare,
            tab: "absensi"
          },
          { 
            id: "stat-tasks",
            title: "Tugas Aktif", 
            value: totalAssignments, 
            desc: `${totalSubmissions} pengumpulan`, 
            color: "from-amber-400 to-orange-500", 
            icon: BookOpen,
            tab: "tugas"
          },
          { 
            id: "stat-journals",
            title: "Jurnal Mengajar", 
            value: journalCount, 
            desc: "Catatan pembelajaran", 
            color: "from-rose-400 to-pink-500", 
            icon: Calendar,
            tab: "jurnal"
          }
        ].map((stat, idx) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={() => stat.tab !== "dashboard" && setActiveTab(stat.tab)}
            className="cursor-pointer bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group"
            id={stat.id}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{stat.title}</span>
                <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight font-display">{stat.value}</h3>
              </div>
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-sm group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 font-medium flex items-center justify-between">
              <span>{stat.desc}</span>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-bento-grid">
        {/* Today's Schedule Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-full"
          id="todays-schedule-card"
        >
          <div className="flex justify-between items-center mb-5">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-slate-800 font-display flex items-center gap-1.5">
                <Clock className="text-indigo-600" size={18} /> Jadwal & Kelas Hari Ini
              </h2>
              <p className="text-slate-400 text-xs font-medium">Hari mengajar aktif Anda untuk {currentDayName}/Hari ini</p>
            </div>
            <button 
              onClick={() => setActiveTab("jadwal")} 
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition-all"
              id="view-all-schedule-btn"
            >
              Lihat Semua
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[280px]">
            {todaySchedule.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Tidak ada jadwal mengajar hari ini. Selamat beristirahat!
              </div>
            ) : (
              todaySchedule.map((item, index) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`group flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 border ${isScheduleActive(item.startTime, item.endTime) ? "border-emerald-500 shadow-md shadow-emerald-50/50" : "border-slate-100"} hover:bg-slate-50 hover:border-indigo-100 transition-all cursor-pointer`}
                  onClick={() => onQuickAction(`start-class-${item.className}`)}
                  id={`schedule-item-${item.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-indigo-100/60 text-indigo-700 flex flex-col items-center justify-center font-bold text-xs">
                      <span>{item.startTime}</span>
                      <span className="text-[10px] opacity-75">{item.endTime}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-800 group-hover:text-indigo-700 transition-colors">
                        {item.subject}
                      </h4>
                      <p className="text-slate-400 text-xs font-semibold flex items-center gap-2 mt-0.5">
                        <span className="bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-600 text-[10px]">{item.className}</span>
                        <span>•</span>
                        <span>{item.room}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isScheduleActive(item.startTime, item.endTime) ? (
                      <span className="flex items-center gap-1 text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span> Sedang Berlangsung
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Siap Mengajar
                      </span>
                    )}
                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Quick Tips & System Info */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between"
          id="quick-tips-card"
        >
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 font-display flex items-center gap-1.5">
              <TrendingUp className="text-amber-500" size={18} /> Ringkasan Pembelajaran
            </h2>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/40 flex gap-3">
                <AlertCircle className="text-indigo-600 shrink-0" size={18} />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800 text-xs">Asisten AI Siap Membantu</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Gunakan tab <strong>Penilaian Otomatis</strong> untuk mengoreksi jawaban esai siswa dalam hitungan detik dengan AI.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100/50 flex gap-3">
                <AlertCircle className="text-indigo-600 shrink-0" size={18} />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800 text-xs">Efisiensi Administrasi</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Setiap selesai mengajar, tulis beberapa kata kunci di <strong>Jurnal Harian</strong> dan klik <strong>AI Buat Jurnal</strong> untuk draf otomatis yang formal.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <p className="text-xs text-slate-400 font-medium">Beban kerja administratif Anda minggu ini:</p>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${displayProgress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
              <span>Selesai: {gradedSubmissions}/{totalSubmissions} Dinilai ({displayProgress}%)</span>
              <span>{displayProgress >= 80 ? "Sangat Baik" : displayProgress >= 50 ? "Sedang Berjalan" : "Perlu Perhatian"}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Action Circle Buttons for mobile/eye-candy layout */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden" id="quick-action-strip">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/5 rounded-full" />
        <h3 className="text-md font-bold font-display mb-3 flex items-center gap-1.5">Akses Pintasan Cepat</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Buka Absensi", desc: "Isi absensi kelas", tab: "absensi", bg: "bg-white/10 hover:bg-white/20" },
            { label: "Koreksi AI", desc: "Penilaian esai otomatis", tab: "penilaian", bg: "bg-indigo-400/20 hover:bg-indigo-400/30" },
            { label: "Jadwal Mengajar", desc: "Lihat kalender mingguan", tab: "jadwal", bg: "bg-amber-400/20 hover:bg-amber-400/30" },
            { label: "Daftar Nilai", desc: "Edit & Unduh Nilai", tab: "nilai", bg: "bg-indigo-300/20 hover:bg-indigo-300/30" }
          ].map((act) => (
            <motion.button
              key={act.label}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(act.tab)}
              className={`p-3 rounded-2xl ${act.bg} border border-white/10 text-left transition-colors cursor-pointer`}
              id={`quick-access-${act.tab}`}
            >
              <p className="font-bold text-xs">{act.label}</p>
              <p className="text-[10px] text-white/70 mt-0.5">{act.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
