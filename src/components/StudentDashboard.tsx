import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Calendar, 
  Clock, 
  CheckSquare, 
  BookOpen, 
  TrendingUp, 
  Award,
  ChevronRight,
  Smile,
  AlertCircle,
  MonitorPlay,
  CheckCircle2,
  FileText,
  UserCheck,
  Settings,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { ScheduleItem, Assignment, Submission, StudentGrade, LearningMaterial } from "../types";
import { AppUser } from "../lib/firebase";

interface StudentDashboardProps {
  user: AppUser;
  schedule: ScheduleItem[];
  assignments: Assignment[];
  submissions: Submission[];
  grades?: StudentGrade[];
  materials?: LearningMaterial[];
  classList?: string[];
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  onOpenSettings?: () => void;
}

export default function StudentDashboard({
  user,
  schedule,
  assignments,
  submissions,
  grades = [],
  materials = [],
  classList = [],
  activeTab = "dashboard",
  setActiveTab,
  onNavigate,
  onOpenSettings
}: StudentDashboardProps) {
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

  const formatDateIndo = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  // Student class matching
  const studentClass = user.kelas || "";

  // Schedule filtering: filter by student class if set, otherwise show all active schedule
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const currentDayName = days[new Date().getDay()] as any;
  
  const relevantSchedule = studentClass
    ? schedule.filter(s => s.className.toLowerCase().trim() === studentClass.toLowerCase().trim())
    : schedule;

  const todaySchedule = relevantSchedule.filter(s => s.day === currentDayName);

  // Helper to determine if a schedule is currently active
  const isScheduleActive = (startTime: string, endTime: string) => {
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);
      
      const startTotal = startHour * 60 + startMin;
      const endTotal = endHour * 60 + endMin;
      
      return currentMinutes >= startTotal && currentMinutes <= endTotal;
    } catch {
      return false;
    }
  };

  // Assignments & Tasks for student
  const studentAssignments = studentClass
    ? assignments.filter(a => a.className.toLowerCase().trim() === studentClass.toLowerCase().trim())
    : assignments;

  // Matching user's submissions
  const mySubmissions = submissions.filter(s => 
    s.studentId === user.uid || 
    s.studentName.toLowerCase().trim() === user.name.toLowerCase().trim()
  );

  const completedAssignmentIds = new Set(
    mySubmissions.filter(s => s.status === 'Selesai' || s.score !== null).map(s => s.assignmentId)
  );

  const submittedAssignmentIds = new Set(
    mySubmissions.map(s => s.assignmentId)
  );

  // Upcoming / active tasks
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingTasks = studentAssignments.map(assignment => {
    const submission = mySubmissions.find(s => s.assignmentId === assignment.id);
    const isSubmitted = !!submission;
    const isGraded = submission && (submission.score !== null && submission.score !== undefined);
    const isOverdue = assignment.dueDate < todayStr && !isSubmitted;

    return {
      ...assignment,
      submission,
      isSubmitted,
      isGraded,
      isOverdue
    };
  }).sort((a, b) => {
    // Sort: unsubmitted first, then by nearest dueDate
    if (a.isSubmitted !== b.isSubmitted) return a.isSubmitted ? 1 : -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const pendingTasksCount = upcomingTasks.filter(t => !t.isSubmitted).length;
  const completedTasksCount = upcomingTasks.filter(t => t.isSubmitted).length;
  const totalTasksCount = studentAssignments.length;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 100;

  // Calculate average score for completed tasks
  const gradedScores = mySubmissions
    .map(s => s.score)
    .filter((score): score is number => score !== null && score !== undefined);
  const avgScore = gradedScores.length > 0 
    ? Math.round(gradedScores.reduce((acc, curr) => acc + curr, 0) / gradedScores.length) 
    : 0;

  return (
    <div className="space-y-6" id="student-dashboard-root">
      {/* Dynamic Welcome Hero Section with Indonesian Educational Vibe */}
      <div 
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-800 text-white p-6 md:p-8 shadow-xl"
        id="student-welcome-banner"
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 -mb-16 w-48 h-48 rounded-full bg-purple-500/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold border border-white/20 text-indigo-100 shadow-xs">
              <Sparkles size={13} className="text-amber-300" />
              <span>Portal Belajar Mandiri • {studentClass ? `Kelas ${studentClass}` : "Semua Kelas"}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display">
              Selamat Datang, {user.name}! 📚
            </h1>
            <p className="text-indigo-100/90 text-xs md:text-sm max-w-xl leading-relaxed">
              Semangat belajar hari ini. Akses materi presentasi, modul digital, cek jadwal pelajaran aktif, dan pantau tenggat waktu tugas Anda secara teratur.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-black/25 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-mono font-bold text-sm shadow-xs">
                <Clock size={20} className="text-amber-300" />
              </div>
              <div>
                <div className="text-[11px] text-indigo-200 font-semibold">{formatDateIndo(currentTime)}</div>
                <div className="text-lg font-mono font-black tracking-widest text-white">{formatTime(currentTime)}</div>
              </div>
            </div>

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="px-4 py-3 bg-white/15 hover:bg-white/25 border border-white/20 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                id="student-open-settings-hero-btn"
                title="Buka Pengaturan Akun & Profil"
              >
                <Settings size={15} />
                <span>Pengaturan Akun</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Synchronized Stats Counter Grid for Students */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="student-stats-grid">
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 transition-all"
          id="stat-student-schedule"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
            <Calendar size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">Jadwal Hari Ini</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-800">{todaySchedule.length}</span>
              <span className="text-[10px] text-slate-400 font-semibold">Mata Pelajaran</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 transition-all"
          id="stat-student-pending-tasks"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold shrink-0">
            <BookOpen size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">Tugas Menunggu</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-amber-600">{pendingTasksCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold">Perlu Dikerjakan</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 transition-all"
          id="stat-student-completed-tasks"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0">
            <CheckSquare size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">Tugas Selesai</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-emerald-600">{completedTasksCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold">dari {totalTasksCount} Total</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 transition-all"
          id="stat-student-avg-score"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold shrink-0">
            <Award size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">Rata-Rata Nilai</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-purple-700">{avgScore > 0 ? avgScore : "-"}</span>
              <span className="text-[10px] text-slate-400 font-semibold">{gradedScores.length} Penilaian</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid: Schedule & Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="student-main-bento-grid">
        {/* Today's Schedule Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-full"
          id="student-schedule-card"
        >
          <div className="flex justify-between items-center mb-5">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-slate-800 font-display flex items-center gap-1.5">
                <Clock className="text-indigo-600" size={18} /> Jadwal Pelajaran Hari Ini
              </h2>
              <p className="text-slate-400 text-xs font-medium">
                Hari aktif pembelajaran untuk {currentDayName} {studentClass ? `(${studentClass})` : ""}
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              {currentDayName}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px]">
            {todaySchedule.length === 0 ? (
              <div className="text-center py-14 px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <Smile className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="font-bold text-sm text-slate-600">Tidak ada jadwal pelajaran hari ini</p>
                <p className="text-xs text-slate-400 mt-0.5">Selamat beristirahat atau gunakan waktu luang untuk belajar mandiri di Ruang Belajar!</p>
              </div>
            ) : (
              todaySchedule.map((item, index) => {
                const active = isScheduleActive(item.startTime, item.endTime);
                return (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className={`group flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border ${active ? "border-emerald-500 shadow-md shadow-emerald-50/50 bg-emerald-50/30" : "border-slate-100"} hover:bg-slate-50 hover:border-indigo-100 transition-all`}
                    id={`student-schedule-item-${item.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-11 w-11 rounded-xl flex flex-col items-center justify-center font-bold text-xs ${active ? "bg-emerald-500 text-white" : "bg-indigo-100/70 text-indigo-700"}`}>
                        <span>{item.startTime}</span>
                        <span className="text-[9px] opacity-80">{item.endTime}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 transition-colors">
                          {item.subject}
                        </h4>
                        <div className="text-slate-400 text-xs font-semibold flex items-center gap-2 mt-0.5">
                          <span className="bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-700 text-[10px] font-bold">{item.className}</span>
                          <span>•</span>
                          <span className="text-slate-600">{item.room || "Ruang Kelas"}</span>
                          {item.agenda && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 truncate max-w-[150px]">{item.agenda}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {active ? (
                        <span className="flex items-center gap-1 text-[10px] bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-full animate-pulse shadow-xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span> Sedang Berlangsung
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-200/70 text-slate-600 font-bold px-2.5 py-1 rounded-full">
                          Akan Datang
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Full Week Schedule Preview Button */}
          {relevantSchedule.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Total {relevantSchedule.length} sesi pelajaran terdaftar untuk kelas Anda</span>
              <span className="font-semibold text-indigo-600">Senin - Jumat</span>
            </div>
          )}
        </motion.div>

        {/* Progress & Quick Study Tips Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between"
          id="student-progress-card"
        >
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 font-display flex items-center gap-1.5">
              <TrendingUp className="text-indigo-600" size={18} /> Progres & Aktivitas Belajar
            </h2>

            <div className="space-y-3 text-sm">
              <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100/60 flex gap-3">
                <MonitorPlay className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-xs">Ruang Belajar Interaktif</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Buka tab <strong>Ruang Belajar</strong> untuk mengakses slide presentasi PPT, modul digital PDF, dan video materi dari guru.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100/60 flex gap-3">
                <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-xs">Ketepatan Pengumpulan</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pastikan mengumpulkan tugas sebelum tanggal jatuh tempo agar mendapat evaluasi dan umpan balik terbaik.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Tingkat Penyelesaian Tugas:</span>
              <span className="font-extrabold text-indigo-700">{completionRate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${completionRate}%` }} 
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
              <span>{completedTasksCount} dari {totalTasksCount} Selesai</span>
              <span className="text-emerald-600 font-bold">
                {completionRate === 100 ? "Luar Biasa! 🎉" : `${pendingTasksCount} Tugas Tersisa`}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Upcoming Tasks Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
        id="student-upcoming-tasks-card"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
              <BookOpen className="text-amber-500" size={18} /> Daftar Tugas & Evaluasi Yang Akan Datang
            </h2>
            <p className="text-slate-400 text-xs font-medium">
              Pantau tugas, ulangan harian, proyek, dan status penilaian Anda
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-lg border border-amber-200">
              {pendingTasksCount} Belum Selesai
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200">
              {completedTasksCount} Selesai
            </span>
          </div>
        </div>

        {upcomingTasks.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={32} />
            <p className="font-bold text-sm text-slate-700">Belum ada tugas aktif untuk kelas Anda</p>
            <p className="text-xs text-slate-400 mt-0.5">Semua tugas saat ini telah terselesaikan atau belum ada tugas baru dari guru.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingTasks.map((task) => {
              const isDone = task.isSubmitted;
              const hasScore = task.submission && task.submission.score !== null && task.submission.score !== undefined;

              return (
                <div 
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isDone 
                      ? "bg-slate-50/60 border-slate-200/80" 
                      : task.isOverdue 
                      ? "bg-rose-50/40 border-rose-200" 
                      : "bg-white border-amber-200/80 shadow-xs hover:border-indigo-200"
                  }`}
                  id={`student-task-item-${task.id}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        task.category === 'Ulangan Harian' ? 'bg-rose-100 text-rose-700' :
                        task.category === 'Proyek' ? 'bg-purple-100 text-purple-700' :
                        task.category === 'Kuis' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {task.category || 'Tugas'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {task.className}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-800 line-clamp-2 leading-snug">
                      {task.title}
                    </h4>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Clock size={13} className={task.isOverdue ? "text-rose-500" : "text-slate-400"} />
                      <span>Tenggat: <strong className={task.isOverdue ? "text-rose-600 font-bold" : "text-slate-700 font-semibold"}>{task.dueDate}</strong></span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {hasScore ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold">Nilai Anda:</span>
                        <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {task.submission.score} / {task.maxScore}
                        </span>
                      </div>
                    ) : isDone ? (
                      <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md">
                        <CheckCircle2 size={12} /> Terkirim • Menunggu Koreksi
                      </span>
                    ) : task.isOverdue ? (
                      <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md">
                        <AlertCircle size={12} /> Terlewat
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md">
                        <Clock size={12} /> Belum Dikerjakan
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 font-semibold">
                      Maks: {task.maxScore}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Quick Action Navigation Strip for Students */}
      <div 
        className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-6 text-white shadow-md relative overflow-hidden" 
        id="student-quick-action-strip"
      >
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/5 rounded-full" />
        <h3 className="text-sm font-extrabold font-display mb-3 flex items-center gap-1.5">
          Pintasan Ruang Belajar Siswa
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (onNavigate) {
                onNavigate("ruangbelajar");
              } else if (setActiveTab) {
                setActiveTab("ruangbelajar");
              }
            }}
            className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-colors cursor-pointer flex items-center justify-between"
            id="student-quick-btn-ruangbelajar"
          >
            <div>
              <p className="font-bold text-xs">Materi & Modul Digital</p>
              <p className="text-[10px] text-indigo-200 mt-0.5">Akses file presentasi PPT & video pembelajaran</p>
            </div>
            <ArrowRight size={16} className="text-white/80" />
          </motion.button>

          {onOpenSettings && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenSettings}
              className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-colors cursor-pointer flex items-center justify-between"
              id="student-quick-btn-settings"
            >
              <div>
                <p className="font-bold text-xs">Profil & Keamanan Akun</p>
                <p className="text-[10px] text-indigo-200 mt-0.5">Ubah profil, kata sandi, & ajukan reset password</p>
              </div>
              <Settings size={16} className="text-white/80" />
            </motion.button>
          )}

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 font-bold text-xs">
              AI
            </div>
            <div>
              <p className="font-bold text-xs">Evaluasi Cerdas Terpadu</p>
              <p className="text-[10px] text-indigo-200 mt-0.5">Nilai dan feedback otomatis langsung dari guru</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
