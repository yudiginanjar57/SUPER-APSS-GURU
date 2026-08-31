import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  FileSpreadsheet, 
  Download, 
  Edit, 
  Award, 
  TrendingUp, 
  Percent, 
  TrendingDown, 
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { Student, Assignment, StudentGrade } from "../types";
import { CLASSES } from "../data/presets";
import { utils, writeFile } from "xlsx";
import ExportPreviewModal from "./ExportPreviewModal";

interface DaftarNilaiProps {
  students: Student[];
  assignments: Assignment[];
  grades: StudentGrade[];
  onUpdateGradeCell: (studentId: string, assignmentId: string | "exam" | "midterm" | "character", value: number) => void;
  classList?: string[];
}

export default function DaftarNilai({
  students,
  assignments,
  grades,
  onUpdateGradeCell,
  classList
}: DaftarNilaiProps) {
  const availableClasses = classList && classList.length > 0 ? classList : CLASSES;
  const [selectedClass, setSelectedClass] = useState<string>(availableClasses[0] || "X-MIPA-1");
  const [searchQuery, setSearchQuery] = useState("");

  const activeSelectedClass = availableClasses.includes(selectedClass) 
    ? selectedClass 
    : availableClasses[0] || "X-MIPA-1";

  // Grid Cell Editing States
  const [editingCell, setEditingCell] = useState<{
    studentId: string;
    type: string; // assignmentId or "exam" | "midterm" | "character"
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Weight configuration
  const [assignmentWeight, setAssignmentWeight] = useState(40);
  const [midtermWeight, setMidtermWeight] = useState(20);
  const [examWeight, setExamWeight] = useState(30);
  const [characterWeight, setCharacterWeight] = useState(10);
  const totalWeight = assignmentWeight + midtermWeight + examWeight + characterWeight;

  // Export State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [exportMode, setExportMode] = useState<string>("all");

  // Filter assignments for chosen class
  const classAssignments = useMemo(() => {
    return assignments.filter(a => a.className === activeSelectedClass);
  }, [assignments, activeSelectedClass]);

  // Filter students for chosen class
  const classStudents = useMemo(() => {
    return students.filter(s => s.className === activeSelectedClass && 
      (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery))
    );
  }, [students, activeSelectedClass, searchQuery]);

  // Calculate stats for current class grades
  const stats = useMemo(() => {
    const classGrades = grades.filter(g => g.className === activeSelectedClass);
    if (classGrades.length === 0) {
      return { average: 0, highest: 0, lowest: 0, passingCount: 0, passRate: 0 };
    }

    let totalScoreSum = 0;
    let highest = 0;
    let lowest = 100;
    let passingCount = 0;

    classGrades.forEach(g => {
      // Calculate final weighted score
      const scores = Object.values(g.assignmentScores);
      const assignmentAvg = scores.length > 0 
        ? scores.reduce((sum, val) => sum + val, 0) / scores.length 
        : 0;
      
      const finalScore = Math.round(
        (assignmentAvg * (assignmentWeight / 100)) + 
        ((g.midtermScore || 0) * (midtermWeight / 100)) +
        (g.examScore * (examWeight / 100)) +
        ((g.characterScore || 0) * (characterWeight / 100))
      );

      totalScoreSum += finalScore;
      if (finalScore > highest) highest = finalScore;
      if (finalScore < lowest) lowest = finalScore;
      if (finalScore >= 75) passingCount++;
    });

    const average = Math.round(totalScoreSum / classGrades.length);
    const passRate = Math.round((passingCount / classGrades.length) * 100);

    return { 
      average, 
      highest, 
      lowest: lowest === 100 && classGrades.length === 0 ? 0 : lowest, 
      passingCount, 
      passRate 
    };
  }, [grades, activeSelectedClass, assignmentWeight, midtermWeight, examWeight, characterWeight]);

  // Handle cell edit trigger
  const triggerEdit = (studentId: string, type: string, currentValue: number) => {
    setEditingCell({ studentId, type });
    setEditValue(currentValue.toString());
  };

  // Handle saving cell edit
  const saveCellEdit = () => {
    if (!editingCell) return;
    const valueNum = Math.min(100, Math.max(0, parseFloat(editValue) || 0));
    onUpdateGradeCell(editingCell.studentId, editingCell.type as any, valueNum);
    setEditingCell(null);
  };

  // Export Logic
  const getExportData = () => {
    return classStudents.map(student => {
      let gradeObj = grades.find(g => g.studentId === student.id);
      if (!gradeObj) {
        gradeObj = {
          studentId: student.id,
          studentName: student.name,
          className: selectedClass,
          assignmentScores: {},
          examScore: 0,
          midtermScore: 0,
          characterScore: 0
        };
      }

      const record: any = {
        NIS: student.nis,
        Nama: student.name,
      };

      if (exportMode === "all") {
        const assignmentScoresList = classAssignments.map(a => gradeObj!.assignmentScores[a.id] || 0);
        const assignmentAvg = assignmentScoresList.length > 0 
          ? assignmentScoresList.reduce((sum, v) => sum + v, 0) / assignmentScoresList.length 
          : 0;
        
        const finalGrade = Math.round(
          (assignmentAvg * (assignmentWeight / 100)) + 
          ((gradeObj.midtermScore || 0) * (midtermWeight / 100)) +
          (gradeObj.examScore * (examWeight / 100)) +
          ((gradeObj.characterScore || 0) * (characterWeight / 100))
        );

        classAssignments.forEach(a => {
          record[a.title] = gradeObj!.assignmentScores[a.id] || 0;
        });

        record["Nilai PTS"] = gradeObj.midtermScore || 0;
        record["Nilai Ujian (PAS)"] = gradeObj.examScore;
        record["Nilai Sikap"] = gradeObj.characterScore || 0;
        record["Nilai Akhir"] = finalGrade;
        record["Status"] = finalGrade >= 75 ? "Lulus" : "Remedial";
      } else if (exportMode.startsWith("assignment_")) {
        const assignmentId = exportMode.replace("assignment_", "");
        const assignment = classAssignments.find(a => a.id === assignmentId);
        if (assignment) {
          record[assignment.title] = gradeObj.assignmentScores[assignment.id] || 0;
        }
      } else if (exportMode === "pts") {
        record["Nilai PTS"] = gradeObj.midtermScore || 0;
      } else if (exportMode === "pas") {
        record["Nilai Ujian (PAS)"] = gradeObj.examScore;
      } else if (exportMode === "sikap") {
        record["Nilai Sikap"] = gradeObj.characterScore || 0;
      }
      
      return record;
    });
  };

  const exportColumns = useMemo(() => {
    const cols = ["NIS", "Nama"];
    if (exportMode === "all") {
      classAssignments.forEach(a => cols.push(a.title));
      cols.push("Nilai PTS", "Nilai Ujian (PAS)", "Nilai Sikap", "Nilai Akhir", "Status");
    } else if (exportMode.startsWith("assignment_")) {
      const assignmentId = exportMode.replace("assignment_", "");
      const assignment = classAssignments.find(a => a.id === assignmentId);
      if (assignment) cols.push(assignment.title);
    } else if (exportMode === "pts") {
      cols.push("Nilai PTS");
    } else if (exportMode === "pas") {
      cols.push("Nilai Ujian (PAS)");
    } else if (exportMode === "sikap") {
      cols.push("Nilai Sikap");
    }
    return cols;
  }, [exportMode, classAssignments]);

  const handleExport = (type: "xlsx" | "pdf") => {
    const data = getExportData();
    if (type === "xlsx") {
      const worksheet = utils.json_to_sheet(data);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Daftar Nilai");
      writeFile(workbook, `Daftar_Nilai_${activeSelectedClass}.xlsx`);
    } else {
      // PDF export logic here, similar to Absensi
    }
    setIsPreviewOpen(false);
  };

  const initiateExport = () => {
    setPreviewData(getExportData());
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-6" id="daftar-nilai-section">
      <ExportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleExport}
        data={previewData}
        title={`Daftar Nilai - ${activeSelectedClass}`}
        columns={exportColumns}
      />

      {/* Configuration & Filter Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between" id="nilai-header-bar">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Class Selectors */}
          <div className="flex bg-slate-100 p-1 rounded-2xl flex-wrap gap-1">
            {availableClasses.map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeSelectedClass === cls 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
                id={`nilai-btn-select-class-${cls}`}
              >
                {cls}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <input
            type="text"
            placeholder="Cari siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-indigo-400 text-slate-700"
            id="nilai-search-input"
          />
          {/* Weight Configuration */}
          <div className="flex items-center gap-3 bg-indigo-50/50 px-4 py-1.5 rounded-xl border border-indigo-100 overflow-x-auto">
             <div className="flex items-center gap-1.5">
               <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">Tugas</span>
               <input 
                 type="number" min="0" max="100"
                 value={assignmentWeight}
                 onChange={(e) => setAssignmentWeight(Number(e.target.value))}
                 className="w-12 px-1.5 py-0.5 rounded-md text-xs font-bold text-center border border-indigo-200 focus:outline-none focus:border-indigo-500"
               />
             </div>
             <div className="flex items-center gap-1.5">
               <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">PTS</span>
               <input 
                 type="number" min="0" max="100"
                 value={midtermWeight}
                 onChange={(e) => setMidtermWeight(Number(e.target.value))}
                 className="w-12 px-1.5 py-0.5 rounded-md text-xs font-bold text-center border border-indigo-200 focus:outline-none focus:border-indigo-500"
               />
             </div>
             <div className="flex items-center gap-1.5">
               <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">PAS</span>
               <input 
                 type="number" min="0" max="100"
                 value={examWeight}
                 onChange={(e) => setExamWeight(Number(e.target.value))}
                 className="w-12 px-1.5 py-0.5 rounded-md text-xs font-bold text-center border border-indigo-200 focus:outline-none focus:border-indigo-500"
               />
             </div>
             <div className="flex items-center gap-1.5">
               <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">Sikap</span>
               <input 
                 type="number" min="0" max="100"
                 value={characterWeight}
                 onChange={(e) => setCharacterWeight(Number(e.target.value))}
                 className="w-12 px-1.5 py-0.5 rounded-md text-xs font-bold text-center border border-indigo-200 focus:outline-none focus:border-indigo-500"
               />
             </div>
             <div className={`ml-2 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide ${totalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
               Total: {totalWeight}%
             </div>
          </div>
        </div>

        {/* Download CSV button */}
        <div className="flex gap-2 w-full md:w-auto justify-end items-center">
          <select 
            value={exportMode} 
            onChange={(e) => setExportMode(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
          >
            <option value="all">Semua Nilai (Lengkap)</option>
            {classAssignments.map(a => (
              <option key={a.id} value={`assignment_${a.id}`}>Tugas: {a.title}</option>
            ))}
            <option value="pts">Nilai PTS</option>
            <option value="pas">Nilai Ujian (PAS)</option>
            <option value="sikap">Nilai Sikap</option>
          </select>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={initiateExport}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
            id="btn-export-grades-csv"
          >
            <Download size={14} /> Ekspor Nilai (Preview)
          </motion.button>
        </div>
      </div>


      {/* Class Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="nilai-stats-row">
        {[
          { label: "Rata-rata Kelas", value: stats.average, desc: "Beban KKM: 75", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100", icon: TrendingUp },
          { label: "Kelulusan Kelas", value: `${stats.passRate}%`, desc: `${stats.passingCount} siswa lulus`, color: "text-violet-600", bg: "bg-violet-50 border-violet-100", icon: Percent },
          { label: "Nilai Tertinggi", value: stats.highest, desc: "Prestasi puncak", color: "text-amber-600", bg: "bg-amber-50 border-amber-100", icon: Award },
          { label: "Nilai Terendah", value: stats.lowest, desc: "Perlu bimbingan", color: "text-rose-600", bg: "bg-rose-50 border-rose-100", icon: TrendingDown }
        ].map((st, idx) => (
          <motion.div
            key={st.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-4 rounded-2xl border ${st.bg} flex justify-between items-center`}
            id={`nilai-stat-card-${idx}`}
          >
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">{st.label}</span>
              <span className={`text-2xl font-black font-display ${st.color}`}>{st.value}</span>
              <span className="text-[10px] text-slate-500 font-semibold block">{st.desc}</span>
            </div>
            <div className={`p-2.5 rounded-xl bg-white/80 shadow-xs ${st.color}`}>
              <st.icon size={18} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Grade Book Spreadsheet Layout */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden" id="grade-spreadsheet-card">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-indigo-600" size={18} />
            <h3 className="text-sm font-bold text-slate-800 font-display">Buku Nilai Utama Kelas {selectedClass}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold bg-white px-2 py-1 border border-slate-100 rounded-md">
            <Clock size={10} /> Double-Click sel untuk edit langsung
          </div>
        </div>

        {/* Spreadsheet Responsive Wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600" id="gradebook-table">
            <thead className="bg-slate-50 text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 min-w-[50px]">No</th>
                <th className="py-3 px-4 min-w-[160px]">Nama Siswa</th>
                <th className="py-3 px-4 min-w-[90px]">NIS</th>
                {classAssignments.map(a => (
                  <th key={a.id} className="py-3 px-4 min-w-[110px] text-center" title={a.title}>
                    {a.title.length > 15 ? a.title.slice(0, 15) + "..." : a.title}
                  </th>
                ))}
                <th className="py-3 px-4 min-w-[100px] text-center">PTS</th>
                <th className="py-3 px-4 min-w-[100px] text-center">PAS (Ujian)</th>
                <th className="py-3 px-4 min-w-[100px] text-center">Sikap</th>
                <th className="py-3 px-4 min-w-[120px] text-center font-bold text-slate-800 bg-slate-100/40">Nilai Akhir (Wgt)</th>
                <th className="py-3 px-4 min-w-[90px] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((student, sIdx) => {
                // Get student's grade object or build dummy if missing
                let gradeObj = grades.find(g => g.studentId === student.id);
                if (!gradeObj) {
                  gradeObj = {
                    studentId: student.id,
                    studentName: student.name,
                    className: selectedClass,
                    assignmentScores: {},
                    examScore: 0,
                    midtermScore: 0,
                    characterScore: 0
                  };
                }

                // Compute weighted final grade
                const assignmentScoresList = classAssignments.map(a => gradeObj!.assignmentScores[a.id] || 0);
                const assignmentAvg = assignmentScoresList.length > 0 
                  ? assignmentScoresList.reduce((sum, v) => sum + v, 0) / assignmentScoresList.length 
                  : 0;
                
                const finalGrade = Math.round(
                  (assignmentAvg * (assignmentWeight / 100)) + 
                  ((gradeObj.midtermScore || 0) * (midtermWeight / 100)) +
                  (gradeObj.examScore * (examWeight / 100)) +
                  ((gradeObj.characterScore || 0) * (characterWeight / 100))
                );
                const isPass = finalGrade >= 75;

                return (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors" id={`gradebook-row-${student.id}`}>
                    <td className="py-3 px-4 font-semibold text-slate-400">{sIdx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{student.name}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{student.nis}</td>
                    
                    {/* Assignment cells */}
                    {classAssignments.map(a => {
                      const assignmentScore = gradeObj!.assignmentScores[a.id] || 0;
                      const isEditing = editingCell?.studentId === student.id && editingCell?.type === a.id;
                      
                      return (
                        <td 
                          key={a.id} 
                          className="py-3 px-4 text-center cursor-pointer relative group/cell"
                          onDoubleClick={() => triggerEdit(student.id, a.id, assignmentScore)}
                        >
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveCellEdit}
                              onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                              className="w-14 bg-slate-100 border border-indigo-400 rounded-lg px-1.5 py-0.5 font-bold text-slate-800 focus:outline-none text-center"
                              autoFocus
                              id={`cell-input-${student.id}-${a.id}`}
                            />
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-semibold text-slate-700">{assignmentScore}</span>
                              <Edit size={10} className="text-slate-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Midterm (PTS) cell */}
                    <td 
                      className="py-3 px-4 text-center cursor-pointer relative group/cell"
                      onDoubleClick={() => triggerEdit(student.id, "midterm", gradeObj!.midtermScore || 0)}
                    >
                      {editingCell?.studentId === student.id && editingCell?.type === "midterm" ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveCellEdit}
                          onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                          className="w-14 bg-slate-100 border border-indigo-400 rounded-lg px-1.5 py-0.5 font-bold text-slate-800 focus:outline-none text-center"
                          autoFocus
                          id={`cell-input-${student.id}-midterm`}
                        />
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-semibold text-slate-700">{gradeObj!.midtermScore || 0}</span>
                          <Edit size={10} className="text-slate-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </td>

                    {/* Exam cell */}
                    <td 
                      className="py-3 px-4 text-center cursor-pointer relative group/cell"
                      onDoubleClick={() => triggerEdit(student.id, "exam", gradeObj!.examScore)}
                    >
                      {editingCell?.studentId === student.id && editingCell?.type === "exam" ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveCellEdit}
                          onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                          className="w-14 bg-slate-100 border border-indigo-400 rounded-lg px-1.5 py-0.5 font-bold text-slate-800 focus:outline-none text-center"
                          autoFocus
                          id={`cell-input-${student.id}-exam`}
                        />
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-semibold text-slate-700">{gradeObj!.examScore}</span>
                          <Edit size={10} className="text-slate-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </td>

                    {/* Character (Sikap) cell */}
                    <td 
                      className="py-3 px-4 text-center cursor-pointer relative group/cell"
                      onDoubleClick={() => triggerEdit(student.id, "character", gradeObj!.characterScore || 0)}
                    >
                      {editingCell?.studentId === student.id && editingCell?.type === "character" ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveCellEdit}
                          onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                          className="w-14 bg-slate-100 border border-indigo-400 rounded-lg px-1.5 py-0.5 font-bold text-slate-800 focus:outline-none text-center"
                          autoFocus
                          id={`cell-input-${student.id}-character`}
                        />
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-semibold text-slate-700">{gradeObj!.characterScore || 0}</span>
                          <Edit size={10} className="text-slate-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </td>

                    {/* Final grade display */}
                    <td className="py-3 px-4 text-center font-black text-sm text-slate-800 bg-slate-100/10">
                      {finalGrade}
                    </td>

                    {/* Status badge */}
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${
                        isPass 
                          ? "bg-emerald-100 text-emerald-800" 
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        {isPass ? "Lulus" : "Remedial"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty records notice */}
        {classStudents.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            Tidak ada data siswa terpilih.
          </div>
        )}

        {/* Spreadsheet footer informational */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center gap-2 text-xs text-slate-500">
          <AlertCircle size={14} className="text-indigo-600" />
          <span>Rumus kelulusan: Rata-rata Tugas (Bobot 60%) + Nilai Ujian Akhir (Bobot 40%) ≥ 75. Perubahan data di spreadsheet langsung disimpan ke database memori lokal.</span>
        </div>
      </div>
    </div>
  );
}
