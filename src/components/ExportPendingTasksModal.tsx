import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  Search, 
  Users, 
  Clock, 
  BookOpen, 
  Copy, 
  Check, 
  HelpCircle
} from "lucide-react";
import { Student, Assignment, StudentGrade, Submission } from "../types";
import { CLASSES } from "../data/presets";
import { utils, writeFile } from "xlsx";
import * as jspdfModule from "jspdf";
import autoTable from "jspdf-autotable";
import { getStoredTteConfig, renderTteImageHtml, embedTteInJsPdf } from "../lib/tteUtils";
import { getStoredKopConfig, renderKopHeaderHtml } from "../lib/kopUtils";

export interface ExportPendingTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  assignments: Assignment[];
  submissions?: Submission[];
  grades: StudentGrade[];
  initialClass?: string;
  classList?: string[];
  preselectedAssignmentId?: string;
  teacherName?: string;
  nip?: string;
  subject?: string;
  institution?: string;
  headmasterName?: string;
  headmasterNip?: string;
  headmasterRank?: string;
  documentCity?: string;
  schoolNpsn?: string;
  academicYear?: string;
}

export interface PendingItemRow {
  studentId: string;
  nis: string;
  nisn?: string;
  studentName: string;
  className: string;
  parentPhone?: string;
  studentPhone?: string;
  category: "Tugas" | "Ulangan Harian" | "PTS" | "PAS" | "Lainnya";
  title: string;
  dueDate: string;
  submissionStatus: "Belum Mengumpulkan" | "Sudah Mengumpulkan" | "Tidak Perlu Unggah";
  gradeStatus: "Belum Ada Nilai" | "Nilai 0 (Perlu Remedial/Susulan)" | "Menunggu Penilaian Guru";
  score: number | null;
  assignmentId?: string;
}

export interface StudentPendingSummary {
  studentId: string;
  nis: string;
  studentName: string;
  className: string;
  parentPhone?: string;
  pendingCount: number;
  pendingItems: string[];
}

export default function ExportPendingTasksModal({
  isOpen,
  onClose,
  students,
  assignments,
  submissions = [],
  grades,
  initialClass,
  classList,
  preselectedAssignmentId,
  teacherName = "YUDI GINANJAR, S.Pd",
  nip = "199605242024211008",
  subject = "EKONOMI",
  institution = "PEMERINTAH DAERAH PROVINSI JAWA BARAT\nDINAS PENDIDIKAN\nSMAN 1 KOTA TASIKMALAYA",
  headmasterName = "Dr. Hj. Yanti Suryanti, M.Pd.",
  headmasterNip = "197005121995122001",
  documentCity = "Tasikmalaya",
  schoolNpsn = "20224510",
  academicYear = "2025/2026 (Genap)"
}: ExportPendingTasksModalProps) {
  const availableClasses = classList && classList.length > 0 ? classList : CLASSES;

  // Filter States
  const [selectedClass, setSelectedClass] = useState<string>(initialClass || availableClasses[0] || "all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "tugas_only" | "ulangan_only" | "pts_only" | "pas_only" | "specific">(
    preselectedAssignmentId ? "specific" : "all"
  );
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(preselectedAssignmentId || "");
  const [statusFilter, setStatusFilter] = useState<"all" | "not_submitted" | "need_grading">("all");
  const [treatZeroAsPending, setTreatZeroAsPending] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"rincian" | "rekap">("rincian");
  const [copiedWhatsapp, setCopiedWhatsapp] = useState<boolean>(false);

  // Synchronize when preselected assignment changes
  React.useEffect(() => {
    if (preselectedAssignmentId) {
      setScopeFilter("specific");
      setSelectedAssignmentId(preselectedAssignmentId);
    }
  }, [preselectedAssignmentId]);

  // Synchronize initialClass when modal opens
  React.useEffect(() => {
    if (initialClass && isOpen) {
      setSelectedClass(initialClass);
    }
  }, [initialClass, isOpen]);

  // Compute pending items list based on current filters
  const { detailedRows, studentSummaries, totalTargetStudents } = useMemo(() => {
    // 1. Filter students by class
    const targetStudents = selectedClass === "all" 
      ? students 
      : students.filter(s => s.className === selectedClass);

    // 2. Filter assignments by class and scope
    let relevantAssignments = assignments;
    if (selectedClass !== "all") {
      relevantAssignments = relevantAssignments.filter(a => a.className === selectedClass);
    }

    if (scopeFilter === "specific" && selectedAssignmentId) {
      relevantAssignments = relevantAssignments.filter(a => a.id === selectedAssignmentId);
    } else if (scopeFilter === "tugas_only") {
      relevantAssignments = relevantAssignments.filter(a => {
        const cat = (a.category || "").toLowerCase();
        const title = a.title.toLowerCase();
        return !cat.includes("ulangan") && !cat.includes("kuis") && !title.includes("ulangan") && !title.includes("kuis");
      });
    } else if (scopeFilter === "ulangan_only") {
      relevantAssignments = relevantAssignments.filter(a => {
        const cat = (a.category || "").toLowerCase();
        const title = a.title.toLowerCase();
        return cat.includes("ulangan") || cat.includes("kuis") || title.includes("ulangan") || title.includes("kuis");
      });
    }

    const rows: PendingItemRow[] = [];

    targetStudents.forEach(student => {
      const gradeObj = grades.find(g => g.studentId === student.id);
      
      // A. Check assignments
      if (scopeFilter !== "pts_only" && scopeFilter !== "pas_only") {
        // Only check assignments matching this student's class
        const studentAssignments = relevantAssignments.filter(a => a.className === student.className);

        studentAssignments.forEach(a => {
          const sub = submissions.find(s => s.assignmentId === a.id && s.studentId === student.id);
          const scoreFromGrade = gradeObj?.assignmentScores?.[a.id];
          const resolvedScore = sub?.score !== null && sub?.score !== undefined 
            ? sub.score 
            : (scoreFromGrade !== undefined && scoreFromGrade !== null ? scoreFromGrade : null);

          const isSubmitted = (sub && sub.status !== "Belum Dikumpulkan") || (resolvedScore !== null);
          const isGraded = resolvedScore !== null && (!treatZeroAsPending ? true : resolvedScore > 0);

          let isPending = false;
          let gradeStatus: PendingItemRow["gradeStatus"] = "Belum Ada Nilai";
          let submissionStatus: PendingItemRow["submissionStatus"] = isSubmitted ? "Sudah Mengumpulkan" : "Belum Mengumpulkan";

          if (!isGraded) {
            if (!isSubmitted) {
              isPending = true;
              gradeStatus = "Belum Ada Nilai";
            } else if (resolvedScore === null || resolvedScore === undefined) {
              isPending = true;
              gradeStatus = "Menunggu Penilaian Guru";
            } else if (treatZeroAsPending && resolvedScore === 0) {
              isPending = true;
              gradeStatus = "Nilai 0 (Perlu Remedial/Susulan)";
            }
          }

          // Apply statusFilter
          if (isPending) {
            if (statusFilter === "not_submitted" && isSubmitted) isPending = false;
            if (statusFilter === "need_grading" && (!isSubmitted || resolvedScore !== null)) isPending = false;
          }

          if (isPending) {
            const isQuizOrExam = (a.category || "").toLowerCase().includes("ulangan") || 
                                 (a.category || "").toLowerCase().includes("kuis") || 
                                 a.title.toLowerCase().includes("ulangan");
            
            rows.push({
              studentId: student.id,
              nis: student.nis,
              nisn: student.nisn,
              studentName: student.name,
              className: student.className,
              parentPhone: student.parentPhone,
              studentPhone: student.studentPhone,
              category: isQuizOrExam ? "Ulangan Harian" : "Tugas",
              title: a.title,
              dueDate: a.dueDate || "-",
              submissionStatus,
              gradeStatus,
              score: resolvedScore,
              assignmentId: a.id
            });
          }
        });
      }

      // B. Check PTS (Sumatif Tengah Semester) if applicable
      if (scopeFilter === "all" || scopeFilter === "ulangan_only" || scopeFilter === "pts_only") {
        const ptsScore = gradeObj?.midtermScore;
        const isPtsMissing = ptsScore === undefined || ptsScore === null || (treatZeroAsPending && ptsScore === 0);

        if (isPtsMissing && statusFilter !== "need_grading") {
          rows.push({
            studentId: student.id,
            nis: student.nis,
            nisn: student.nisn,
            studentName: student.name,
            className: student.className,
            parentPhone: student.parentPhone,
            studentPhone: student.studentPhone,
            category: "PTS",
            title: "Penilaian Tengah Semester (PTS / STS)",
            dueDate: "Tengah Semester",
            submissionStatus: "Tidak Perlu Unggah",
            gradeStatus: ptsScore === 0 ? "Nilai 0 (Perlu Remedial/Susulan)" : "Belum Ada Nilai",
            score: ptsScore ?? null
          });
        }
      }

      // C. Check PAS (Sumatif Akhir Semester) if applicable
      if (scopeFilter === "all" || scopeFilter === "ulangan_only" || scopeFilter === "pas_only") {
        const pasScore = gradeObj?.examScore;
        const isPasMissing = pasScore === undefined || pasScore === null || (treatZeroAsPending && pasScore === 0);

        if (isPasMissing && statusFilter !== "need_grading") {
          rows.push({
            studentId: student.id,
            nis: student.nis,
            nisn: student.nisn,
            studentName: student.name,
            className: student.className,
            parentPhone: student.parentPhone,
            studentPhone: student.studentPhone,
            category: "PAS",
            title: "Penilaian Akhir Semester (PAS / SAS)",
            dueDate: "Akhir Semester",
            submissionStatus: "Tidak Perlu Unggah",
            gradeStatus: pasScore === 0 ? "Nilai 0 (Perlu Remedial/Susulan)" : "Belum Ada Nilai",
            score: pasScore ?? null
          });
        }
      }
    });

    // 3. Aggregate Student Summaries
    const summaryMap = new Map<string, StudentPendingSummary>();
    rows.forEach(r => {
      if (!summaryMap.has(r.studentId)) {
        summaryMap.set(r.studentId, {
          studentId: r.studentId,
          nis: r.nis,
          studentName: r.studentName,
          className: r.className,
          parentPhone: r.parentPhone || r.studentPhone,
          pendingCount: 0,
          pendingItems: []
        });
      }
      const item = summaryMap.get(r.studentId)!;
      item.pendingCount += 1;
      item.pendingItems.push(`${r.category}: ${r.title} (${r.gradeStatus})`);
    });

    const summaries = Array.from(summaryMap.values()).sort((a, b) => b.pendingCount - a.pendingCount || a.studentName.localeCompare(b.studentName));

    // Sort rows
    rows.sort((a, b) => a.className.localeCompare(b.className) || a.studentName.localeCompare(b.studentName));

    return {
      detailedRows: rows,
      studentSummaries: summaries,
      totalTargetStudents: targetStudents.length
    };
  }, [students, assignments, submissions, grades, selectedClass, scopeFilter, selectedAssignmentId, statusFilter, treatZeroAsPending]);

  // Filtered by Search Query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return detailedRows;
    const q = searchQuery.toLowerCase();
    return detailedRows.filter(r => 
      r.studentName.toLowerCase().includes(q) || 
      r.nis.includes(q) || 
      r.title.toLowerCase().includes(q) ||
      r.className.toLowerCase().includes(q)
    );
  }, [detailedRows, searchQuery]);

  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return studentSummaries;
    const q = searchQuery.toLowerCase();
    return studentSummaries.filter(s => 
      s.studentName.toLowerCase().includes(q) || 
      s.nis.includes(q) || 
      s.className.toLowerCase().includes(q)
    );
  }, [studentSummaries, searchQuery]);

  if (!isOpen) return null;

  // EXPORT EXCEL HANDLER (.xlsx)
  const handleExportExcel = () => {
    const classLabel = selectedClass === "all" ? "Semua_Kelas" : selectedClass;
    const dateStr = new Date().toISOString().slice(0, 10);

    // Sheet 1: Rincian Detail
    const sheetData1 = detailedRows.map((r, idx) => ({
      "No": idx + 1,
      "Kelas": r.className,
      "NIS": r.nis,
      "NISN": r.nisn || "-",
      "Nama Peserta Didik": r.studentName,
      "Kategori": r.category,
      "Judul Tugas / Ulangan": r.title,
      "Tenggat Waktu": r.dueDate,
      "Status Pengumpulan": r.submissionStatus,
      "Status Nilai": r.gradeStatus,
      "Nilai Saat Ini": r.score !== null ? r.score : "-"
    }));

    // Sheet 2: Rekapitulasi Per Siswa
    const sheetData2 = studentSummaries.map((s, idx) => ({
      "No": idx + 1,
      "Kelas": s.className,
      "NIS": s.nis,
      "Nama Peserta Didik": s.studentName,
      "Jumlah Tagihan Belum Tuntas": s.pendingCount,
      "Rincian Tugas & Ulangan Belum Selesai": s.pendingItems.join("; ")
    }));

    const workbook = utils.book_new();

    const ws1 = utils.json_to_sheet(sheetData1);
    utils.book_append_sheet(workbook, ws1, "Rincian Tagihan Siswa");

    const ws2 = utils.json_to_sheet(sheetData2);
    utils.book_append_sheet(workbook, ws2, "Rekapitulasi Per Siswa");

    writeFile(workbook, `Data_Belum_Ulangan_Tugas_${classLabel}_${dateStr}.xlsx`);
  };

  // EXPORT PDF HANDLER (.pdf)
  const handleExportPdf = () => {
    try {
      const jsPDFConstructor = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF || (jspdfModule as any).default || jspdfModule;
      const doc = new jsPDFConstructor({ orientation: "landscape", unit: "mm", format: "a4" });
      const tableFn = typeof autoTable === 'function' ? autoTable : (autoTable as any).default;

      const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const classLabel = selectedClass === "all" ? "SEMUA KELAS" : `KELAS ${selectedClass}`;

      // Document Header
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`REKAPITULASI SISWA BELUM MENYELESAIKAN ULANGAN / TUGAS`, 14, 15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Tingkat/Rombel: ${classLabel} | Mata Pelajaran: ${subject || "Umum"} | Tahun Ajaran: ${academicYear}`, 14, 21);
      doc.text(`Guru Pengampu: ${teacherName} (NIP. ${nip || "-"}) | Tanggal Cetak: ${dateStr}`, 14, 26);

      if (activeTab === "rincian") {
        const head = [["No", "Kelas", "NIS", "Nama Peserta Didik", "Kategori", "Nama Tugas / Ulangan", "Pengumpulan", "Status Nilai"]];
        const body = detailedRows.map((r, idx) => [
          idx + 1,
          r.className,
          r.nis,
          r.studentName,
          r.category,
          r.title,
          r.submissionStatus,
          r.gradeStatus
        ]);

        if (typeof tableFn === 'function') {
          tableFn(doc, {
            head: head,
            body: body,
            startY: 32,
            styles: { fontSize: 8, cellPadding: 2, halign: 'left' },
            headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
              0: { cellWidth: 10, halign: 'center' },
              1: { cellWidth: 20, halign: 'center' },
              2: { cellWidth: 22, halign: 'center' },
              3: { cellWidth: 50 },
              4: { cellWidth: 26, halign: 'center' },
              5: { cellWidth: 65 },
              6: { cellWidth: 35, halign: 'center' },
              7: { cellWidth: 40, halign: 'center' }
            },
            theme: 'grid'
          });
        }
      } else {
        // Tab Rekap Per Siswa (Tanpa Kontak Ortu)
        const head = [["No", "Kelas", "NIS", "Nama Peserta Didik", "Jml Belum Tuntas", "Rincian Tagihan Tugas & Ulangan"]];
        const body = studentSummaries.map((s, idx) => [
          idx + 1,
          s.className,
          s.nis,
          s.studentName,
          `${s.pendingCount} Item`,
          s.pendingItems.join("\n")
        ]);

        if (typeof tableFn === 'function') {
          tableFn(doc, {
            head: head,
            body: body,
            startY: 32,
            styles: { fontSize: 8, cellPadding: 2, halign: 'left' },
            headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
              0: { cellWidth: 10, halign: 'center' },
              1: { cellWidth: 22, halign: 'center' },
              2: { cellWidth: 26, halign: 'center' },
              3: { cellWidth: 62 },
              4: { cellWidth: 28, halign: 'center' },
              5: { cellWidth: 130 }
            },
            theme: 'grid'
          });
        }
      }

      if (includeSignatures) {
        let lastY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 140;
        if (lastY > 165) {
          doc.addPage();
          lastY = 20;
        }

        const tteConfig = getStoredTteConfig();

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        doc.text("Mengetahui,", 30, lastY);
        doc.text("Kepala Sekolah", 30, lastY + 5);
        if (tteConfig.usePrincipalTte && tteConfig.principalTteImage) {
          embedTteInJsPdf(doc, tteConfig.principalTteImage, 30, lastY + 7, 30, 14);
        }
        doc.setFont("helvetica", "bold");
        doc.text(headmasterName || "( ................................................. )", 30, lastY + 24);
        doc.setFont("helvetica", "normal");
        doc.text(`NIP. ${headmasterNip || "-"}`, 30, lastY + 29);

        doc.text(`${documentCity}, ${dateStr}`, 200, lastY);
        doc.text("Guru Mata Pelajaran", 200, lastY + 5);
        if (tteConfig.useTeacherTte && tteConfig.teacherTteImage) {
          embedTteInJsPdf(doc, tteConfig.teacherTteImage, 200, lastY + 7, 30, 14);
        }
        doc.setFont("helvetica", "bold");
        doc.text(teacherName || "( ................................................. )", 200, lastY + 24);
        doc.setFont("helvetica", "normal");
        doc.text(`NIP. ${nip || "-"}`, 200, lastY + 29);
      }

      const classLabelClean = selectedClass === "all" ? "Semua_Kelas" : selectedClass;
      doc.save(`Rekap_Belum_Ulangan_Tugas_${classLabelClean}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    }
  };

  // PRINT PREVIEW HANDLER (Mendukung mode Rekapitulasi Per Siswa atau Rincian Tagihan)
  const handlePrint = (mode: "rekap" | "rincian" = activeTab) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Pastikan izin pop-up peramban Anda aktif.");
      return;
    }

    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const classLabel = selectedClass === "all" ? "SEMUA KELAS" : `KELAS ${selectedClass}`;
    const tteConfig = getStoredTteConfig();
    const headmasterTteSnippet = tteConfig.usePrincipalTte ? renderTteImageHtml(tteConfig.principalTteImage, "TTE Kepala Sekolah", 48, 120) : "";
    const teacherTteSnippet = tteConfig.useTeacherTte ? renderTteImageHtml(tteConfig.teacherTteImage, "TTE Guru", 48, 120) : "";

    const docTitle = mode === "rekap"
      ? "REKAPITULASI SISWA BELUM MENYELESAIKAN ULANGAN / TUGAS"
      : "RINCIAN DAFTAR SISWA BELUM MENYELESAIKAN ULANGAN / TUGAS";

    const tableContentHtml = mode === "rekap" ? `
      <table>
        <thead>
          <tr>
            <th style="width: 30px;">No</th>
            <th style="width: 70px;">Kelas</th>
            <th style="width: 80px;">NIS</th>
            <th style="width: 200px;">Nama Peserta Didik</th>
            <th style="width: 90px;">Jml Tagihan</th>
            <th>Rincian Tugas & Ulangan Belum Tuntas</th>
          </tr>
        </thead>
        <tbody>
          ${studentSummaries.map((s, i) => `
            <tr>
              <td class="text-center">${i + 1}</td>
              <td class="text-center"><strong>${s.className}</strong></td>
              <td class="text-center">${s.nis}</td>
              <td><strong>${s.studentName}</strong></td>
              <td class="text-center"><span class="badge-danger">${s.pendingCount} Item</span></td>
              <td>
                <ul style="margin: 0; padding-left: 16px; font-size: 10.5px;">
                  ${s.pendingItems.map(item => `<li style="margin-bottom: 2px;">${item}</li>`).join("")}
                </ul>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : `
      <table>
        <thead>
          <tr>
            <th style="width: 25px;">No</th>
            <th style="width: 65px;">Kelas</th>
            <th style="width: 70px;">NIS</th>
            <th>Nama Peserta Didik</th>
            <th style="width: 75px;">Kategori</th>
            <th>Nama Tugas / Ulangan</th>
            <th style="width: 110px;">Pengumpulan</th>
            <th style="width: 120px;">Status Penilaian</th>
          </tr>
        </thead>
        <tbody>
          ${detailedRows.map((r, i) => `
            <tr>
              <td class="text-center">${i + 1}</td>
              <td class="text-center"><strong>${r.className}</strong></td>
              <td class="text-center">${r.nis}</td>
              <td><strong>${r.studentName}</strong></td>
              <td class="text-center"><span class="badge-warning">${r.category}</span></td>
              <td>${r.title}</td>
              <td class="text-center">${r.submissionStatus}</td>
              <td class="text-center"><span class="${r.gradeStatus.includes('0') ? 'badge-danger' : 'badge-warning'}">${r.gradeStatus}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${docTitle} - ${classLabel}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #0f172a; line-height: 1.4; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 15px; }
          .meta-box { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 15px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 10px; text-align: center; }
          .text-center { text-align: center; }
          .badge-warning { background: #fef3c7; color: #92400e; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 9px; }
          .badge-danger { background: #fee2e2; color: #991b1b; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 9px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; text-align: center; page-break-inside: avoid; }
          .sig-box { margin-top: 55px; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${renderKopHeaderHtml({
          documentTitle: docTitle,
          subtitle: `Rombongan Belajar: <strong>${classLabel}</strong> • Mata Pelajaran: <strong>${subject}</strong> • Tahun Ajaran: ${academicYear}`,
          customConfig: {
            institution,
            schoolNpsn,
            academicYear,
            subject
          }
        })}

        <div class="meta-box">
          <div>
            <strong>Guru Pengampu:</strong> ${teacherName} (${nip || '-'})<br/>
            <strong>Mata Pelajaran:</strong> ${subject}
          </div>
          <div style="text-align: right;">
            <strong>Format Cetak:</strong> ${mode === "rekap" ? "Rekapitulasi Per Siswa" : "Rincian Tagihan"}<br/>
            <strong>Total Siswa Belum Tuntas:</strong> ${studentSummaries.length} Siswa (${detailedRows.length} Tagihan)<br/>
            <strong>Tanggal Rekap:</strong> ${dateStr}
          </div>
        </div>

        ${tableContentHtml}

        ${includeSignatures ? `
        <div class="signatures">
          <div>
            <p>Mengetahui,</p>
            <p>Kepala Sekolah</p>
            ${headmasterTteSnippet ? headmasterTteSnippet : '<div class="sig-box"></div>'}
            <p><strong>${headmasterName || "( ................................................. )"}</strong></p>
            <p>NIP. ${headmasterNip || "-"}</p>
          </div>
          <div>
            <p>${documentCity}, ${dateStr}</p>
            <p>Guru Mata Pelajaran</p>
            ${teacherTteSnippet ? teacherTteSnippet : '<div class="sig-box"></div>'}
            <p><strong>${teacherName || "( ................................................. )"}</strong></p>
            <p>NIP. ${nip || "-"}</p>
          </div>
        </div>
        ` : ''}
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 450);
  };

  // COPY WHATSAPP REMINDER TEXT
  const handleCopyWhatsapp = () => {
    const classLabel = selectedClass === "all" ? "Semua Kelas" : selectedClass;
    let text = `📢 *PENGINGAT TAGIHAN TUGAS & ULANGAN*\n`;
    text += `*Mata Pelajaran:* ${subject}\n`;
    text += `*Kelas:* ${classLabel}\n`;
    text += `*Guru Pengampu:* ${teacherName}\n`;
    text += `-------------------------------------------\n`;
    text += `Berikut daftar peserta didik yang *BELUM MENGIKUTI ULANGAN / BELUM MENGUMPULKAN TUGAS / BELUM MENDAPAT NILAI*:\n\n`;

    studentSummaries.forEach((s, i) => {
      text += `${i + 1}. *${s.studentName}* (${s.className} - NIS: ${s.nis})\n`;
      s.pendingItems.forEach(item => {
        text += `   • ${item}\n`;
      });
      text += `\n`;
    });

    text += `Mohon segera menyelesaikan atau menghubungi guru mata pelajaran untuk mengikuti susulan / pengumpulan tugas. Terima kasih. 🙏`;

    navigator.clipboard.writeText(text);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto" id="export-pending-tasks-modal">
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        >
          {/* Top Header */}
          <div className="p-5 md:px-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/70 via-white to-orange-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-800 font-display flex items-center gap-2">
                  Ekspor Siswa Belum Ulangan / Belum Ada Nilai Tugas
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Saring dan ekspor daftar peserta didik yang belum mengikuti ulangan, belum menyerahkan tugas, atau belum dinilai ke format Excel (.XLSX) dan PDF resmi.
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              id="btn-close-pending-export-modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Filter Bar Controls */}
          <div className="p-4 md:px-6 bg-slate-50/70 border-b border-slate-200/60 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Class Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Users size={11} className="text-indigo-600" /> Pilih Kelas
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
                  id="pending-filter-class"
                >
                  <option value="all">Semua Kelas ({availableClasses.length} Kelas)</option>
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Scope / Category Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Filter size={11} className="text-indigo-600" /> Kategori Tagihan
                </label>
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
                  id="pending-filter-scope"
                >
                  <option value="all">Semua Tagihan (Tugas, UH, PTS & PAS)</option>
                  <option value="tugas_only">Hanya Tugas & Proyek Harian</option>
                  <option value="ulangan_only">Hanya Ulangan (UH, PTS & PAS)</option>
                  <option value="pts_only">Hanya Penilaian Tengah Semester (PTS)</option>
                  <option value="pas_only">Hanya Penilaian Akhir Semester (PAS)</option>
                  <option value="specific">Pilih Tugas / Ulangan Spesifik...</option>
                </select>
              </div>

              {/* Specific Assignment Dropdown (if scope is specific) */}
              {scopeFilter === "specific" ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <BookOpen size={11} className="text-indigo-600" /> Nama Tugas / Ulangan
                  </label>
                  <select
                    value={selectedAssignmentId}
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
                    id="pending-filter-assignment"
                  >
                    <option value="">-- Pilih Tugas / Ulangan --</option>
                    {(selectedClass === "all" ? assignments : assignments.filter(a => a.className === selectedClass)).map(a => (
                      <option key={a.id} value={a.id}>
                        [{a.className}] {a.title} ({a.category || "Tugas"})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <Clock size={11} className="text-indigo-600" /> Status Pengumpulan
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
                    id="pending-filter-status"
                  >
                    <option value="all">Semua yang Belum Tuntas</option>
                    <option value="not_submitted">Belum Mengumpulkan / Belum Ikut</option>
                    <option value="need_grading">Sudah Kirim (Belum Dinilai)</option>
                  </select>
                </div>
              )}

              {/* Search Box */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Search size={11} className="text-indigo-600" /> Cari Siswa
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nama siswa, NIS, atau tugas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs"
                    id="pending-search-input"
                  />
                  <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Treat Zero As Pending & TTD Checkbox */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/50">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={treatZeroAsPending}
                    onChange={(e) => setTreatZeroAsPending(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    id="pending-treat-zero-checkbox"
                  />
                  <span>Anggap nilai 0 sebagai belum ulangan / perlu remedial</span>
                </label>

                {/* Toggle Opsi TTD */}
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeSignatures}
                    onChange={(e) => setIncludeSignatures(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    id="pending-include-signatures-checkbox"
                  />
                  <span className="font-bold text-slate-800">Sertakan TTD Pengesahan</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${includeSignatures ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                    {includeSignatures ? "Ada TTD" : "Tanpa TTD"}
                  </span>
                </label>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center bg-slate-200/70 p-0.5 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setActiveTab("rincian")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTab === "rincian" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                  id="tab-btn-rincian"
                >
                  Rincian Per Tagihan ({filteredRows.length})
                </button>
                <button
                  onClick={() => setActiveTab("rekap")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTab === "rekap" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                  id="tab-btn-rekap"
                >
                  Rekapitulasi Per Siswa ({filteredSummaries.length})
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="px-6 py-2.5 bg-amber-50/40 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Siswa Belum Tuntas:</span>
                <span className="font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md font-mono">
                  {studentSummaries.length} Siswa
                </span>
                {totalTargetStudents > 0 && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    (dari {totalTargetStudents} total siswa)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Total Item Tagihan:</span>
                <span className="font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md font-mono">
                  {detailedRows.length} Tagihan
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Siswa Bebas Tagihan:</span>
                <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-mono">
                  {Math.max(0, totalTargetStudents - studentSummaries.length)} Siswa
                </span>
              </div>
            </div>

            {/* Quick Print & Whatsapp Actions */}
            <div className="flex items-center gap-2">
              {studentSummaries.length > 0 && (
                <button
                  onClick={() => handlePrint("rekap")}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-xl font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                  id="btn-quick-print-rekap"
                  title="Cetak Lembar Rekapitulasi Per Siswa"
                >
                  <Printer size={12} className="text-indigo-600" />
                  <span>Cetak Rekap Siswa</span>
                </button>
              )}

              {studentSummaries.length > 0 && (
                <button
                  onClick={handleCopyWhatsapp}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                  id="btn-copy-wa-reminder"
                  title="Salin daftar tagihan ke format teks pesan WhatsApp untuk grup kelas / wali murid"
                >
                  {copiedWhatsapp ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedWhatsapp ? "Format WA Disalin!" : "Salin Format WhatsApp"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Table Preview Content */}
          <div className="flex-1 overflow-auto p-4 md:p-6" id="pending-table-container">
            {detailedRows.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={36} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-800 font-display">Semua Nilai & Tugas Telah Tuntas!</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Tidak ditemukan peserta didik dengan status ulangan belum dikerjakan atau tugas belum dinilai pada filter yang Anda tentukan.
                  </p>
                </div>
              </div>
            ) : activeTab === "rincian" ? (
              /* TAB 1: Rincian Per Tagihan */
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-600 font-bold text-[11px] uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-center w-12 border-b border-slate-200">No</th>
                      <th className="p-3 text-center w-24 border-b border-slate-200">Kelas</th>
                      <th className="p-3 text-center w-24 border-b border-slate-200">NIS</th>
                      <th className="p-3 border-b border-slate-200 min-w-[180px]">Nama Peserta Didik</th>
                      <th className="p-3 text-center border-b border-slate-200 w-28">Kategori</th>
                      <th className="p-3 border-b border-slate-200 min-w-[220px]">Nama Tugas / Ulangan</th>
                      <th className="p-3 text-center border-b border-slate-200 w-36">Pengumpulan</th>
                      <th className="p-3 text-center border-b border-slate-200 w-44">Status Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRows.map((row, idx) => (
                      <tr key={`${row.studentId}-${row.title}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{row.className}</span>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500 text-[11px]">{row.nis}</td>
                        <td className="p-3 font-bold text-slate-800">{row.studentName}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.category.includes("Ulangan") || row.category === "PTS" || row.category === "PAS"
                              ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                          }`}>
                            {row.category}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <span>{row.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">Tenggat: {row.dueDate}</span>
                        </td>
                        <td className="p-3 text-center">
                          {row.submissionStatus === "Belum Mengumpulkan" ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200/70 px-2 py-0.5 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                              <AlertCircle size={10} /> Belum Kumpul
                            </span>
                          ) : row.submissionStatus === "Sudah Mengumpulkan" ? (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200/70 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                              Sudah Kumpul
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {row.gradeStatus === "Belum Ada Nilai" ? (
                            <span className="bg-rose-100/70 text-rose-800 border border-rose-300/80 px-2 py-0.5 rounded-lg text-[10px] font-black inline-block shadow-2xs">
                              Nilai Kosong
                            </span>
                          ) : row.gradeStatus.includes("0") ? (
                            <span className="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-lg text-[10px] font-black inline-block">
                              Nilai 0 (Susulan)
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-bold inline-block">
                              Perlu Dinilai
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* TAB 2: Rekapitulasi Per Siswa */
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/90 text-slate-600 font-bold text-[11px] uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-center w-12 border-b border-slate-200">No</th>
                      <th className="p-3 text-center w-24 border-b border-slate-200">Kelas</th>
                      <th className="p-3 text-center w-24 border-b border-slate-200">NIS</th>
                      <th className="p-3 border-b border-slate-200 min-w-[200px]">Nama Peserta Didik</th>
                      <th className="p-3 text-center border-b border-slate-200 w-32">Jml Tagihan</th>
                      <th className="p-3 border-b border-slate-200 min-w-[320px]">Rincian Tugas & Ulangan Belum Tuntas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredSummaries.map((s, idx) => (
                      <tr key={s.studentId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{s.className}</span>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500 text-[11px]">{s.nis}</td>
                        <td className="p-3 font-bold text-slate-800">{s.studentName}</td>
                        <td className="p-3 text-center">
                          <span className="bg-rose-100 text-rose-800 font-black px-2.5 py-0.5 rounded-full text-xs font-mono shadow-2xs">
                            {s.pendingCount} Item
                          </span>
                        </td>
                        <td className="p-3">
                          <ul className="space-y-1 text-[11px] text-slate-600">
                            {s.pendingItems.map((it, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-amber-500 mt-0.5">•</span>
                                <span>{it}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="p-4 md:px-6 border-t border-slate-200/80 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 font-medium">
              <span>Menampilkan <strong>{activeTab === "rincian" ? filteredRows.length : filteredSummaries.length}</strong> data hasil penyaringan.</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Opsi Cepat TTD */}
              <button
                type="button"
                onClick={() => setIncludeSignatures(!includeSignatures)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                  includeSignatures 
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100" 
                    : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                }`}
                id="btn-toggle-ttd-footer"
                title="Klik untuk mengubah apakah tanda tangan dan TTE disertakan atau tidak pada cetak & PDF"
              >
                <span>{includeSignatures ? "✓ Opsi: Ada TTD" : "✕ Opsi: Tanpa TTD"}</span>
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                id="btn-cancel-pending-export"
              >
                Tutup
              </button>

              {/* Excel Export Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleExportExcel}
                disabled={detailedRows.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 cursor-pointer transition-all"
                id="btn-export-excel-pending"
                title="Unduh data dalam format file Excel (.xlsx)"
              >
                <FileSpreadsheet size={15} />
                <span>Unduh Excel</span>
              </motion.button>

              {/* PDF Export Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleExportPdf}
                disabled={detailedRows.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 cursor-pointer transition-all"
                id="btn-export-pdf-pending"
                title="Unduh dokumen resmi dalam format PDF (.pdf)"
              >
                <FileText size={15} />
                <span>Unduh PDF ({activeTab === "rekap" ? "Rekap Siswa" : "Rincian"})</span>
              </motion.button>

              {/* Opsi Cetak 1: Cetak Rincian Tagihan */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePrint("rincian")}
                disabled={detailedRows.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-all"
                id="btn-print-rincian"
                title="Cetak lembar rincian semua tagihan tugas/ulangan per baris"
              >
                <Printer size={15} className="text-slate-600" />
                <span>Cetak Rincian</span>
              </motion.button>

              {/* Opsi Cetak 2: Cetak Rekapitulasi Per Siswa */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handlePrint("rekap")}
                disabled={studentSummaries.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-md shadow-indigo-200 cursor-pointer transition-all"
                id="btn-print-rekap-siswa"
                title="Cetak lembar rekapitulasi ringkasan per siswa beserta rincian tugas/ulangan belum tuntas"
              >
                <Printer size={15} />
                <span>Cetak Rekap Per Siswa</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
