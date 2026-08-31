import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  UserCheck, 
  Search, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Smile,
  FileCheck,
  Download
} from "lucide-react";
import { Student, Attendance, AttendanceStatus } from "../types";
import { CLASSES } from "../data/presets";
import { utils, writeFile } from "xlsx";
import * as jspdfModule from "jspdf";
const jsPDF = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF || (jspdfModule as any).default || jspdfModule;
import autoTable from "jspdf-autotable";
import ExportPreviewModal from "./ExportPreviewModal";

interface AbsensiProps {
  students: Student[];
  attendanceList: Attendance[];
  onSaveAttendance: (newAttendance: Attendance[]) => void;
  classList?: string[];
}

export default function Absensi({
  students,
  attendanceList,
  onSaveAttendance,
  classList
}: AbsensiProps) {
  const availableClasses = classList && classList.length > 0 ? classList : CLASSES;
  const [selectedClass, setSelectedClass] = useState<string>(availableClasses[0] || "X-MIPA-1");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Export State
  const [exportMode, setExportMode] = useState<"monthly" | "all">("monthly");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Ensure selectedClass remains valid if classList changes
  const activeSelectedClass = availableClasses.includes(selectedClass) 
    ? selectedClass 
    : availableClasses[0] || "X-MIPA-1";

  // Temporary local state for editing attendance before clicking save
  const [localAttendance, setLocalAttendance] = useState<Record<string, AttendanceStatus>>({});

  // Memoized students for the selected class
  const classStudents = useMemo(() => {
    return students.filter(s => s.className === activeSelectedClass);
  }, [students, activeSelectedClass]);

  // Sync existing database/state attendance into our local editor when Class/Date changes
  const activeAttendance = useMemo(() => {
    const records = attendanceList.filter(
      a => a.className === activeSelectedClass && a.date === selectedDate
    );
    
    const recordMap: Record<string, AttendanceStatus> = {};
    records.forEach(r => {
      recordMap[r.studentId] = r.status;
    });

    // For any student who doesn't have a record, default to 'Hadir'
    classStudents.forEach(student => {
      if (!recordMap[student.id]) {
        recordMap[student.id] = (localAttendance[student.id] || "Hadir");
      }
    });

    return recordMap;
  }, [attendanceList, selectedClass, selectedDate, classStudents]);

  // Update local attendance record state
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setLocalAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // Mark all as Present helper
  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach(s => {
      updated[s.id] = "Hadir";
    });
    setLocalAttendance(updated);
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.includes(searchQuery)
    );
  }, [classStudents, searchQuery]);

  // Save changes to Parent / LocalStorage
  const [isSaved, setIsSaved] = useState(false);
  const handleSave = () => {
    const attendancePayload: Attendance[] = classStudents.map(student => {
      const status = localAttendance[student.id] || activeAttendance[student.id] || "Hadir";
      return {
        id: `${student.id}-${selectedDate}`,
        studentId: student.id,
        date: selectedDate,
        status,
        className: activeSelectedClass
      };
    });

    onSaveAttendance(attendancePayload);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Compute stats for current class & date selection
  const stats = useMemo(() => {
    let hadir = 0, sakit = 0, izin = 0, alpa = 0;
    classStudents.forEach(s => {
      const status = localAttendance[s.id] || activeAttendance[s.id] || "Hadir";
      if (status === "Hadir") hadir++;
      else if (status === "Sakit") sakit++;
      else if (status === "Izin") izin++;
      else if (status === "Alpa") alpa++;
    });

    const total = classStudents.length || 1;
    const rate = Math.round((hadir / total) * 100);
    return { hadir, sakit, izin, alpa, rate };
  }, [classStudents, localAttendance, activeAttendance]);

  // Export Logic
  const getExportData = () => {
    const filteredAttendance = attendanceList.filter(a => {
      if (activeSelectedClass && a.className !== activeSelectedClass) return false;
      if (exportMode === "monthly") {
        return a.date.startsWith(selectedMonth);
      }
      return true;
    });

    return classStudents.map(student => {
      const studentAttendance = filteredAttendance.filter(a => a.studentId === student.id);
      
      const record: any = {
        NIS: student.nis,
        Nama: student.name,
      };
      
      let hadir = 0, sakit = 0, izin = 0, alpa = 0;
      studentAttendance.forEach(a => {
        if (a.status === "Hadir") hadir++;
        else if (a.status === "Sakit") sakit++;
        else if (a.status === "Izin") izin++;
        else if (a.status === "Alpa") alpa++;
      });
      
      record.Hadir = hadir;
      record.Sakit = sakit;
      record.Izin = izin;
      record.Alpa = alpa;
      record.Total = hadir + sakit + izin + alpa;
      
      return record;
    });
  };

  const handleExport = (type: "xlsx" | "pdf") => {
    const data = getExportData();
    if (type === "xlsx") {
      const worksheet = utils.json_to_sheet(data);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Rekap Absensi");
      writeFile(workbook, `Rekap_Absensi_${activeSelectedClass}_${exportMode === "monthly" ? selectedMonth : "Keseluruhan"}.xlsx`);
    } else {
      const doc = new jsPDF();
      doc.text(`Rekap Absensi - ${activeSelectedClass} (${exportMode === "monthly" ? selectedMonth : "Keseluruhan"})`, 14, 15);
      const tableFn = typeof autoTable === 'function' ? autoTable : (autoTable as any).default;
      if (typeof tableFn === 'function') {
        tableFn(doc, {
          head: [["NIS", "Nama", "Hadir", "Sakit", "Izin", "Alpa", "Total"]],
          body: data.map(d => [d.NIS, d.Nama, d.Hadir, d.Sakit, d.Izin, d.Alpa, d.Total]),
          startY: 20
        });
      } else if (typeof (doc as any).autoTable === 'function') {
        (doc as any).autoTable({
          head: [["NIS", "Nama", "Hadir", "Sakit", "Izin", "Alpa", "Total"]],
          body: data.map(d => [d.NIS, d.Nama, d.Hadir, d.Sakit, d.Izin, d.Alpa, d.Total]),
          startY: 20
        });
      }
      doc.save(`Rekap_Absensi_${activeSelectedClass}_${exportMode === "monthly" ? selectedMonth : "Keseluruhan"}.pdf`);
    }
    setIsPreviewOpen(false);
  };

  const initiateExport = () => {
    setPreviewData(getExportData());
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-6" id="absensi-container">
      <ExportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleExport}
        data={previewData}
        title={`Rekap Absensi - ${activeSelectedClass}`}
        columns={["NIS", "Nama", "Hadir", "Sakit", "Izin", "Alpa", "Total"]}
      />

      {/* Configuration Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between" id="absensi-config-bar">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Class Selectors */}
          <div className="flex bg-slate-100 p-1 rounded-2xl flex-wrap gap-1">
            {availableClasses.map((cls) => (
              <button
                key={cls}
                onClick={() => {
                  setSelectedClass(cls);
                  setLocalAttendance({});
                  setSearchQuery("");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSelectedClass === cls 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
                id={`btn-select-class-${cls}`}
              >
                {cls}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs font-semibold text-slate-700">
            <CalendarIcon size={14} className="text-indigo-500 mr-2" />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setLocalAttendance({});
              }}
              className="bg-transparent focus:outline-none text-slate-700 cursor-pointer"
              id="absensi-date-picker"
            />
          </div>
        </div>

        {/* Shortcuts */}
        <div className="flex gap-2 w-full md:w-auto justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleMarkAllPresent}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-2xl text-xs font-bold transition-colors hover:bg-indigo-100"
            id="btn-mark-all-present"
          >
            Tandai Hadir Semua
          </motion.button>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="absensi-analytics">
        {/* Attendance Percentage Chart Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 md:col-span-1 flex flex-col justify-between items-center text-center">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Persentase Kehadiran</span>
          
          {/* Custom SVG Circular Progress */}
          <div className="relative w-28 h-28 my-3 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="56" cy="56" r="48" 
                className="stroke-slate-100 fill-none" 
                strokeWidth="8"
              />
              <motion.circle 
                cx="56" cy="56" r="48" 
                className="stroke-indigo-600 fill-none" 
                strokeWidth="8"
                strokeDasharray="301.6"
                initial={{ strokeDashoffset: 301.6 }}
                animate={{ strokeDashoffset: 301.6 - (301.6 * stats.rate) / 100 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-slate-800 font-display">{stats.rate}%</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Hadir</span>
            </div>
          </div>

          <p className="text-slate-500 text-xs font-medium">Target ideal sekolah: 95%</p>
        </div>

        {/* Detailed Stats Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 md:col-span-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">Daftar Ringkasan Hari Ini</h3>
            <p className="text-slate-400 text-xs font-medium mt-0.5">Statistik absensi kelas {selectedClass}</p>
          </div>

          <div className="grid grid-cols-4 gap-3 my-4">
            {[
              { label: "Hadir", count: stats.hadir, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
              { label: "Sakit", count: stats.sakit, color: "bg-amber-50 text-amber-700 border-amber-100" },
              { label: "Izin", count: stats.izin, color: "bg-blue-50 text-blue-700 border-blue-100" },
              { label: "Alpa", count: stats.alpa, color: "bg-rose-50 text-rose-700 border-rose-100" }
            ].map((st) => (
              <div key={st.label} className={`p-4 rounded-2xl border ${st.color} text-center`}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{st.label}</p>
                <p className="text-2xl font-black font-display mt-1">{st.count}</p>
                <p className="text-[10px] opacity-75 mt-0.5">Siswa</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
            <CheckCircle size={14} className="text-emerald-500 shrink-0" />
            <span>Pastikan semua status absensi sudah sesuai sebelum mengklik tombol Simpan di bawah.</span>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100" id="absensi-export-section">
        <h3 className="text-sm font-bold text-slate-800 font-display mb-4">Ekspor Rekap Kehadiran</h3>
        <div className="flex flex-wrap items-center gap-4">
          <select 
            value={exportMode} 
            onChange={(e) => setExportMode(e.target.value as "monthly" | "all")}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="monthly">Per Bulan</option>
            <option value="all">Keseluruhan</option>
          </select>
          {exportMode === "monthly" && (
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-700"
            />
          )}
          <button
            onClick={initiateExport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 transition-colors"
          >
            <Download size={14} /> Preview & Export
          </button>
        </div>
      </div>

      {/* Student List Grid */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden" id="absensi-student-list-section">
        {/* Table Header / Search */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="text-md font-bold text-slate-800 font-display flex items-center gap-2">
            <UserCheck size={18} className="text-indigo-600" /> Siswa Kelas {selectedClass} ({classStudents.length} siswa)
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:outline-none focus:border-indigo-400 transition-all text-slate-700"
              id="student-search-input"
            />
          </div>
        </div>

        {/* Student Rows */}
        <div className="divide-y divide-slate-100">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Siswa tidak ditemukan atau data kosong.
            </div>
          ) : (
            filteredStudents.map((student, idx) => {
              const status = localAttendance[student.id] || activeAttendance[student.id] || "Hadir";
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                  key={student.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                  id={`student-attendance-row-${student.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center font-display">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-800">{student.name}</h4>
                      <p className="text-slate-400 text-[11px] font-semibold">NIS: {student.nis} • {student.className}</p>
                    </div>
                  </div>

                  {/* Toggle Status Controls */}
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl self-end sm:self-auto">
                    {[
                      { status: "Hadir", label: "Hadir", color: "bg-emerald-500 text-white shadow-sm", activeColor: "text-emerald-600 font-bold" },
                      { status: "Sakit", label: "Sakit", color: "bg-amber-500 text-white shadow-sm", activeColor: "text-amber-600 font-bold" },
                      { status: "Izin", label: "Izin", color: "bg-blue-500 text-white shadow-sm", activeColor: "text-blue-600 font-bold" },
                      { status: "Alpa", label: "Alpa", color: "bg-rose-500 text-white shadow-sm", activeColor: "text-rose-600 font-bold" }
                    ].map((btn) => {
                      const isActive = status === btn.status;
                      return (
                        <button
                          key={btn.status}
                          onClick={() => handleStatusChange(student.id, btn.status as AttendanceStatus)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                            isActive 
                              ? btn.color 
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                          id={`btn-status-${student.id}-${btn.status}`}
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Save Footer Bar */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between" id="absensi-save-footer">
          <div className="text-xs text-slate-500 font-semibold">
            {Object.keys(localAttendance).length > 0 ? (
              <span className="text-indigo-600">Terdeteksi {Object.keys(localAttendance).length} perubahan absensi belum disimpan.</span>
            ) : (
              <span>Absensi untuk tanggal terpilih siap disimpan.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {isSaved && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-emerald-600 font-bold flex items-center gap-1"
                  id="absensi-save-success-msg"
                >
                  <FileCheck size={14} /> Berhasil disimpan!
                </motion.span>
              )}
            </AnimatePresence>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-xs md:text-sm rounded-2xl shadow-md transition-colors cursor-pointer"
              id="btn-save-attendance"
            >
              Simpan Absensi
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
