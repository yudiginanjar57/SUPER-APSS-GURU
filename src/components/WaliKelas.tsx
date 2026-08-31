import { useState, useMemo, ChangeEvent } from "react";
import { motion } from "motion/react";
import { 
  Users, 
  AlertTriangle, 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  ShieldCheck, 
  Calendar, 
  Award, 
  ChevronRight, 
  Trash2, 
  CheckCircle2, 
  TrendingUp,
  Building2,
  HeartHandshake,
  Home,
  Camera,
  Image as ImageIcon,
  MapPin,
  X,
  FileSpreadsheet,
  Eye,
  Filter
} from "lucide-react";
import { Student, Attendance, Assignment, StudentGrade, HomeroomNote, HomeVisitReport } from "../types";
import { compressImage } from "../lib/imageUtils";

interface WaliKelasProps {
  homeroomClass: string;
  setHomeroomClass: (cls: string) => void;
  classList: string[];
  students: Student[];
  attendanceList: Attendance[];
  assignments: Assignment[];
  grades: StudentGrade[];
  teacherName: string;
  nip: string;
  institution: string;
  notes: HomeroomNote[];
  onAddNote: (note: Omit<HomeroomNote, "id">) => void;
  onDeleteNote: (id: string) => void;
  homeVisits: HomeVisitReport[];
  onAddHomeVisit: (visit: Omit<HomeVisitReport, "id">) => void;
  onDeleteHomeVisit: (id: string) => void;
  onOpenSettings: () => void;
}

export default function WaliKelas({
  homeroomClass,
  setHomeroomClass,
  classList,
  students,
  attendanceList,
  assignments,
  grades,
  teacherName,
  nip,
  institution,
  notes,
  onAddNote,
  onDeleteNote,
  homeVisits,
  onAddHomeVisit,
  onDeleteHomeVisit,
  onOpenSettings
}: WaliKelasProps) {
  const [activeSubTab, setActiveSubTab] = useState<"siswa" | "rekap-kehadiran" | "home-visit" | "rapor" | "pembinaan" | "perhatian">("siswa");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Month filter for Attendance Recap
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Form states for new homeroom note
  const [isOpenAddNoteModal, setIsOpenAddNoteModal] = useState(false);
  const [noteStudentId, setNoteStudentId] = useState("");
  const [noteCategory, setNoteCategory] = useState<HomeroomNote["category"]>("Kedisiplinan");
  const [noteContent, setNoteContent] = useState("");
  const [noteAction, setNoteAction] = useState("");
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split("T")[0]);

  // Form states for Home Visit Report
  const [isOpenHomeVisitModal, setIsOpenHomeVisitModal] = useState(false);
  const [hvStudentId, setHvStudentId] = useState("");
  const [hvDate, setHvDate] = useState(new Date().toISOString().split("T")[0]);
  const [hvParentName, setHvParentName] = useState("");
  const [hvAddress, setHvAddress] = useState("");
  const [hvReason, setHvReason] = useState("");
  const [hvResult, setHvResult] = useState("");
  const [hvPhotos, setHvPhotos] = useState<string[]>([]);

  // Preview Image Lightbox Modal State
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Filter students for homeroom class
  const classStudents = useMemo(() => {
    return students.filter(s => s.className === homeroomClass);
  }, [students, homeroomClass]);

  // Attendance for homeroom class filtered by month if selected
  const classAttendance = useMemo(() => {
    return attendanceList.filter(a => {
      if (a.className !== homeroomClass) return false;
      if (selectedMonth !== "all") {
        const dateObj = new Date(a.date);
        const monthStr = (dateObj.getMonth() + 1).toString().padStart(2, "0");
        return monthStr === selectedMonth;
      }
      return true;
    });
  }, [attendanceList, homeroomClass, selectedMonth]);

  // Student Attendance Summary
  const studentAttendanceSummary = useMemo(() => {
    const map: Record<string, { hadir: number; sakit: number; izin: number; alpa: number; total: number; logs: Attendance[] }> = {};
    classStudents.forEach(s => {
      map[s.id] = { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0, logs: [] };
    });

    classAttendance.forEach(a => {
      if (map[a.studentId]) {
        map[a.studentId].total += 1;
        map[a.studentId].logs.push(a);
        if (a.status === "Hadir") map[a.studentId].hadir += 1;
        else if (a.status === "Sakit") map[a.studentId].sakit += 1;
        else if (a.status === "Izin") map[a.studentId].izin += 1;
        else if (a.status === "Alpa") map[a.studentId].alpa += 1;
      }
    });

    return map;
  }, [classStudents, classAttendance]);

  // Student Academic Scores Summary
  const studentAcademicSummary = useMemo(() => {
    const map: Record<string, { avgAssignment: number; examScore: number; finalAvg: number }> = {};

    classStudents.forEach(s => {
      const studentGradeObj = grades.find(g => g.studentId === s.id);
      let assignmentAvg = 0;
      let examScore = 0;

      if (studentGradeObj) {
        examScore = studentGradeObj.examScore || 0;
        const scores = Object.values(studentGradeObj.assignmentScores || {});
        if (scores.length > 0) {
          const sum = scores.reduce((a, b) => a + b, 0);
          assignmentAvg = Math.round(sum / scores.length);
        }
      }

      const finalAvg = Math.round((assignmentAvg * 0.6) + (examScore * 0.4));
      map[s.id] = {
        avgAssignment: assignmentAvg,
        examScore,
        finalAvg: finalAvg || (assignmentAvg || examScore)
      };
    });

    return map;
  }, [classStudents, assignments, grades, homeroomClass]);

  // Class Overview Stats
  const classStats = useMemo(() => {
    const totalSiswa = classStudents.length;
    let totalHadir = 0;
    let totalRecords = 0;

    (Object.values(studentAttendanceSummary) as Array<{ hadir: number; sakit: number; izin: number; alpa: number; total: number }>).forEach(s => {
      totalHadir += s.hadir;
      totalRecords += s.total;
    });

    const attendanceRate = totalRecords > 0 ? Math.round((totalHadir / totalRecords) * 100) : 100;

    const academicScores = (Object.values(studentAcademicSummary) as Array<{ avgAssignment: number; examScore: number; finalAvg: number }>).map(s => s.finalAvg).filter(s => s > 0);
    const avgClassScore = academicScores.length > 0 
      ? Math.round(academicScores.reduce((a, b) => a + b, 0) / academicScores.length)
      : 0;

    // Students needing special attention (Alpa > 1 or score < 75 or has notes)
    const alertStudents = classStudents.filter(s => {
      const att = studentAttendanceSummary[s.id];
      const acad = studentAcademicSummary[s.id];
      const hasNote = notes.some(n => n.studentId === s.id);
      return (att && att.alpa >= 2) || (acad && acad.finalAvg < 75 && acad.finalAvg > 0) || hasNote;
    });

    return {
      totalSiswa,
      attendanceRate,
      avgClassScore,
      alertCount: alertStudents.length,
      alertStudents
    };
  }, [classStudents, studentAttendanceSummary, studentAcademicSummary, notes]);

  // Handle Photo Upload for Home Visit with Auto-compression
  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files) as File[]) {
      try {
        const compressed = await compressImage(file);
        setHvPhotos(prev => [...prev, compressed]);
      } catch (err) {
        console.warn("Gagal mengompres foto kunjungan rumah:", err);
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setHvPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Home Visit Submission
  const handleSaveHomeVisit = () => {
    if (!hvStudentId || !hvParentName.trim() || !hvReason.trim() || !hvResult.trim()) {
      alert("Silakan lengkapi data siswa, orang tua, alasan, dan hasil kunjungan rumah.");
      return;
    }

    const st = classStudents.find(s => s.id === hvStudentId);
    if (!st) return;

    onAddHomeVisit({
      studentId: st.id,
      studentName: st.name,
      className: homeroomClass,
      date: hvDate,
      parentName: hvParentName.trim(),
      address: hvAddress.trim() || "Alamat Tempat Tinggal Siswa",
      reason: hvReason.trim(),
      result: hvResult.trim(),
      photos: hvPhotos,
      teacherName,
      nip
    });

    setIsOpenHomeVisitModal(false);
    setHvStudentId("");
    setHvParentName("");
    setHvAddress("");
    setHvReason("");
    setHvResult("");
    setHvPhotos([]);
  };

  // Handle Note Submission
  const handleSaveNote = () => {
    if (!noteStudentId || !noteContent.trim()) {
      alert("Silakan pilih siswa dan isi catatan pembinaan.");
      return;
    }

    const st = classStudents.find(s => s.id === noteStudentId);
    if (!st) return;

    onAddNote({
      studentId: st.id,
      studentName: st.name,
      className: homeroomClass,
      date: noteDate,
      category: noteCategory,
      note: noteContent.trim(),
      actionTaken: noteAction.trim() || "Bimbingan Wali Kelas"
    });

    setIsOpenAddNoteModal(false);
    setNoteContent("");
    setNoteAction("");
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.nis.includes(searchQuery)
    );
  }, [classStudents, searchQuery]);

  // Selected Student for Report Detail
  const reportStudent = useMemo(() => {
    if (!selectedStudentId) return classStudents[0] || null;
    return classStudents.find(s => s.id === selectedStudentId) || classStudents[0] || null;
  }, [classStudents, selectedStudentId]);

  // Filtered Home Visits for current homeroom class
  const classHomeVisits = useMemo(() => {
    return homeVisits.filter(hv => hv.className === homeroomClass);
  }, [homeVisits, homeroomClass]);

  // PRINT REKAP KEHADIRAN (Attendance Summary Printable)
  const handlePrintAttendanceRecap = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan pop-up di peramban Anda.");
      return;
    }

    const monthLabel = selectedMonth === "all" ? "Keseluruhan Semester" : `Bulan ${selectedMonth}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rekapitulasi Presensi Siswa Kelas ${homeroomClass}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #0f172a; line-height: 1.4; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 18px; }
          .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
          .header h3 { margin: 4px 0 0 0; font-size: 15px; color: #1e293b; }
          .header p { margin: 2px 0 0 0; font-size: 11px; color: #475569; }
          .meta-box { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 15px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 10px; }
          .text-center { text-align: center; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; text-align: center; }
          .sig-box { margin-top: 55px; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${institution.replace('\n', '<br>')}</h2>
          <h3>REKAPITULASI PRESENSI KEHADIRAN SISWA</h3>
          <p>Periode: ${monthLabel} • Tahun Ajaran 2025/2026</p>
        </div>

        <div class="meta-box">
          <div><strong>Kelas:</strong> ${homeroomClass}</div>
          <div><strong>Wali Kelas:</strong> ${teacherName} (NIP. ${nip || '-'})</div>
          <div><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="5%" class="text-center">No</th>
              <th width="30%">Nama Siswa</th>
              <th width="15%">NIS</th>
              <th width="10%" class="text-center">Hadir</th>
              <th width="10%" class="text-center">Sakit</th>
              <th width="10%" class="text-center">Izin</th>
              <th width="10%" class="text-center">Alpa</th>
              <th width="10%" class="text-center">Persentase</th>
            </tr>
          </thead>
          <tbody>
            ${classStudents.map((s, idx) => {
              const att = studentAttendanceSummary[s.id] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
              const rate = att.total > 0 ? Math.round((att.hadir / att.total) * 100) : 100;
              return `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.nis}</td>
                  <td class="text-center">${att.hadir}</td>
                  <td class="text-center">${att.sakit}</td>
                  <td class="text-center">${att.izin}</td>
                  <td class="text-center" style="color: ${att.alpa > 0 ? '#e11d48' : '#000'}; font-weight: ${att.alpa > 0 ? 'bold' : 'normal'};">${att.alpa}</td>
                  <td class="text-center" style="font-weight: bold; color: ${rate < 80 ? '#e11d48' : '#0f172a'};">${rate}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <p>Mengetahui,<br>Kepala Sekolah</p>
            <div class="sig-box">( ................................................. )<br><span style="font-weight: normal; font-size: 10px;">NIP. -</span></div>
          </div>
          <div>
            <p>Tasikmalaya, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>Wali Kelas ${homeroomClass}</p>
            <div class="sig-box">${teacherName}<br><span style="font-weight: normal; font-size: 10px;">NIP. ${nip || '-'}</span></div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // PRINT HOME VISIT REPORT
  const handlePrintHomeVisit = (visit: HomeVisitReport) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan pop-up di peramban Anda.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Kunjungan Rumah (Home Visit) - ${visit.studentName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #0f172a; line-height: 1.5; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; }
          .header h3 { margin: 4px 0 0 0; font-size: 15px; color: #1e293b; }
          .header p { margin: 2px 0 0 0; font-size: 11px; color: #475569; }
          .title-tag { text-align: center; font-size: 14px; font-weight: bold; background: #f1f5f9; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; font-size: 12px; }
          .item { background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .full-item { grid-column: span 2; background: #f8fafc; padding: 10px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .section-title { font-size: 13px; font-weight: bold; border-bottom: 2px solid #4f46e5; padding-bottom: 3px; margin-top: 18px; margin-bottom: 8px; color: #4f46e5; text-transform: uppercase; }
          .content-text { font-size: 12px; background: #fff; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 15px; white-space: pre-line; }
          .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
          .photo-card { border: 1px solid #cbd5e1; padding: 4px; border-radius: 6px; background: #f8fafc; text-align: center; }
          .photo-card img { width: 100%; height: 160px; object-fit: cover; border-radius: 4px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; font-size: 11px; text-align: center; }
          .sig-box { margin-top: 50px; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${institution.replace('\n', '<br>')}</h2>
          <p>Alamat Instansi & Sekolah Terdaftar • Layanan Bimbingan & Kewalikelasan</p>
        </div>

        <div class="title-tag">LAPORAN KUNJUNGAN RUMAH (HOME VISIT)</div>

        <div class="grid">
          <div class="item"><strong>Nama Siswa:</strong> ${visit.studentName}</div>
          <div class="item"><strong>Kelas:</strong> ${visit.className}</div>
          <div class="item"><strong>Hari / Tanggal:</strong> ${visit.date}</div>
          <div class="item"><strong>Nama Orang Tua / Wali:</strong> ${visit.parentName}</div>
          <div class="full-item"><strong>Alamat Kunjungan:</strong> ${visit.address}</div>
        </div>

        <div class="section-title">I. Alasan & Tujuan Kunjungan Rumah</div>
        <div class="content-text">${visit.reason}</div>

        <div class="section-title">II. Hasil Diskusi & Kesepakatan Bersama</div>
        <div class="content-text">${visit.result}</div>

        ${visit.photos && visit.photos.length > 0 ? `
          <div class="section-title">III. DOKUMENTASI FOTO KUNJUNGAN RUMAH</div>
          <div class="photo-grid">
            ${visit.photos.map((p, i) => `
              <div class="photo-card">
                <img src="${p}" alt="Dokumentasi ${i+1}" />
                <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b;">Dokumentasi Foto #${i+1}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="signatures">
          <div>
            <p>Orang Tua / Wali Siswa</p>
            <div class="sig-box">${visit.parentName}</div>
          </div>
          <div>
            <p>Guru BK / Pengembang</p>
            <div class="sig-box">( ........................................ )</div>
          </div>
          <div>
            <p>Tasikmalaya, ${visit.date}<br>Wali Kelas ${visit.className}</p>
            <div class="sig-box">${teacherName}<br><span style="font-weight: normal; font-size: 10px;">NIP. ${nip || '-'}</span></div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Print Individual Rapor
  const handlePrintReport = (student: Student) => {
    const att = studentAttendanceSummary[student.id] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
    const acad = studentAcademicSummary[student.id] || { avgAssignment: 0, examScore: 0, finalAvg: 0 };
    const stNotes = notes.filter(n => n.studentId === student.id);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan pop-up di peramban Anda.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapor Ringkas - ${student.name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
          .header h3 { margin: 5px 0 0 0; font-size: 16px; color: #334155; }
          .header p { margin: 2px 0 0 0; font-size: 12px; color: #64748b; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 13px; }
          .meta-item { background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .section-title { font-size: 14px; font-weight: bold; border-bottom: 2px solid #4f46e5; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; color: #4f46e5; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; }
          .text-center { text-align: center; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; font-size: 12px; text-align: center; }
          .sig-box { margin-top: 60px; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${institution.replace('\n', '<br>')}</h2>
          <h3>RAPOR RINGKAS & PERKEMBANGAN SISWA</h3>
          <p>Tahun Ajaran 2025/2026 • Semester Genap</p>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><strong>Nama Siswa:</strong> ${student.name}</div>
          <div class="meta-item"><strong>NIS / NISN:</strong> ${student.nis}</div>
          <div class="meta-item"><strong>Kelas:</strong> ${student.className}</div>
          <div class="meta-item"><strong>Wali Kelas:</strong> ${teacherName} (NIP. ${nip || '-'})</div>
        </div>

        <div class="section-title">I. REKAPITULASI KEHADIRAN SISWA</div>
        <table>
          <thead>
            <tr>
              <th class="text-center">Hadir (H)</th>
              <th class="text-center">Sakit (S)</th>
              <th class="text-center">Izin (I)</th>
              <th class="text-center">Alpa (A)</th>
              <th class="text-center">Persentase Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-center">${att.hadir} Hari</td>
              <td class="text-center">${att.sakit} Hari</td>
              <td class="text-center">${att.izin} Hari</td>
              <td class="text-center" style="color: ${att.alpa > 0 ? '#e11d48' : '#000'}; font-weight: ${att.alpa > 0 ? 'bold' : 'normal'};">${att.alpa} Hari</td>
              <td class="text-center" style="font-weight: bold;">${att.total > 0 ? Math.round((att.hadir / att.total)*100) : 100}%</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">II. RINGKASAN CAPAIAN AKADEMIK</div>
        <table>
          <thead>
            <tr>
              <th>Komponen Akademik</th>
              <th class="text-center">Nilai Rata-Rata</th>
              <th class="text-center">Kategori / Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Rata-Rata Tugas & Penugasan Harian</td>
              <td class="text-center font-bold">${acad.avgAssignment}</td>
              <td class="text-center">${acad.avgAssignment >= 75 ? 'Tuntas KKM' : 'Perlu Perbaikan'}</td>
            </tr>
            <tr>
              <td>Nilai Ujian / Evaluasi Akhir</td>
              <td class="text-center font-bold">${acad.examScore}</td>
              <td class="text-center">${acad.examScore >= 75 ? 'Tuntas KKM' : 'Perlu Perbaikan'}</td>
            </tr>
            <tr style="background: #f8fafc; font-weight: bold;">
              <td>NILAI RATA-RATA AKHIR KELAS</td>
              <td class="text-center" style="font-size: 14px; color: #4f46e5;">${acad.finalAvg}</td>
              <td class="text-center">${acad.finalAvg >= 85 ? 'SANGAT BAIK' : acad.finalAvg >= 75 ? 'BAIK' : 'CUKUP / PEMBINAAN'}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">III. CATATAN & PEMBINAAN WALI KELAS</div>
        ${stNotes.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th width="12%">Tanggal</th>
                <th width="15%">Kategori</th>
                <th>Catatan Wali Kelas</th>
                <th>Tindak Lanjut / Solusi</th>
              </tr>
            </thead>
            <tbody>
              ${stNotes.map(n => `
                <tr>
                  <td>${n.date}</td>
                  <td><strong>${n.category}</strong></td>
                  <td>${n.note}</td>
                  <td>${n.actionTaken}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="font-style: italic; color: #64748b; font-size: 12px;">Siswa berperilaku baik dan tidak memiliki catatan pembinaan khusus.</p>'}

        <div class="signatures">
          <div>
            <p>Orang Tua / Wali Murid</p>
            <div class="sig-box">( ................................................. )</div>
          </div>
          <div>
            <p>Tasikmalaya, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>Wali Kelas ${student.className}</p>
            <div class="sig-box">${teacherName}<br><span style="font-weight: normal; font-size: 11px;">NIP. ${nip || '-'}</span></div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BANNER FOR WALI KELAS */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-indigo-200 border border-white/10 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" /> Ruang Layanan Wali Kelas
              </span>
              <span className="text-xs text-indigo-300">•</span>
              <span className="text-xs font-semibold text-indigo-200">{institution.split('\n').pop()}</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display text-white">
              Kelas Binaan: <span className="text-amber-300 underline decoration-amber-400/50 underline-offset-4">{homeroomClass}</span>
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/90 font-medium leading-relaxed">
              Layanan lengkap wali kelas: rekap kehadiran presensi, laporan Home Visit dengan dokumentasi foto, rapor ringkas, dan catatan pembinaan siswa.
            </p>
          </div>

          {/* Homeroom Class Switcher */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2 w-full md:w-auto shrink-0">
            <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wide flex items-center gap-1">
              <Building2 size={13} /> Pilih Kelas Wali:
            </label>
            <div className="flex items-center gap-2">
              <select
                value={homeroomClass}
                onChange={(e) => setHomeroomClass(e.target.value)}
                className="bg-indigo-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer flex-1"
              >
                {classList.map(cls => (
                  <option key={cls} value={cls}>Kelas {cls}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm"
                title="Atur Pengaturan Wali Kelas & Profil"
              >
                Atur
              </button>
            </div>
          </div>
        </div>

        {/* QUICK STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Total Siswa</p>
            <p className="text-2xl font-black text-white mt-1">{classStats.totalSiswa} <span className="text-xs font-normal text-indigo-200">Siswa</span></p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Kehadiran Rata-Rata</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{classStats.attendanceRate}%</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Laporan Home Visit</p>
            <p className="text-2xl font-black text-cyan-300 mt-1">{classHomeVisits.length} <span className="text-xs font-normal text-indigo-200">Kali</span></p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Nilai Rata-Rata Kelas</p>
            <p className="text-2xl font-black text-amber-300 mt-1">{classStats.avgClassScore || "-"}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5 col-span-2 sm:col-span-1">
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Perhatian Khusus</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{classStats.alertCount} <span className="text-xs font-normal text-indigo-200">Siswa</span></p>
          </div>
        </div>
      </div>

      {/* SUB-TAB NAVIGATION */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto gap-1" id="walikelas-subtabs">
        <button
          onClick={() => setActiveSubTab("siswa")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "siswa"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={15} /> Siswa ({classStudents.length})
        </button>

        <button
          onClick={() => setActiveSubTab("rekap-kehadiran")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "rekap-kehadiran"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet size={15} /> Rekap Kehadiran
        </button>

        <button
          onClick={() => setActiveSubTab("home-visit")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "home-visit"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Home size={15} /> Home Visit ({classHomeVisits.length})
        </button>

        <button
          onClick={() => setActiveSubTab("rapor")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "rapor"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText size={15} /> Rapor Ringkas
        </button>

        <button
          onClick={() => setActiveSubTab("pembinaan")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "pembinaan"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <HeartHandshake size={15} /> Pembinaan ({notes.filter(n => n.className === homeroomClass).length})
        </button>

        <button
          onClick={() => setActiveSubTab("perhatian")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "perhatian"
              ? "bg-rose-600 text-white shadow-sm"
              : "text-slate-500 hover:text-rose-600"
          }`}
        >
          <AlertTriangle size={15} /> Perhatian Khusus ({classStats.alertCount})
        </button>
      </div>

      {/* SUB-TAB 1: DAFTAR SISWA BINAAN */}
      {activeSubTab === "siswa" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau NIS siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsOpenAddNoteModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer w-full sm:w-auto"
              >
                <Plus size={15} /> Catatan Pembinaan Siswa
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3.5 px-4">No</th>
                    <th className="py-3.5 px-4">Nama Siswa</th>
                    <th className="py-3.5 px-4">NIS</th>
                    <th className="py-3.5 px-4 text-center">Kehadiran (H/S/I/A)</th>
                    <th className="py-3.5 px-4 text-center">Persentase</th>
                    <th className="py-3.5 px-4 text-center">Rata-Rata Nilai</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 font-semibold">
                        Tidak ada siswa terdaftar di kelas {homeroomClass}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, index) => {
                      const att = studentAttendanceSummary[s.id] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
                      const acad = studentAcademicSummary[s.id] || { avgAssignment: 0, examScore: 0, finalAvg: 0 };
                      const rate = att.total > 0 ? Math.round((att.hadir / att.total) * 100) : 100;
                      const hasAlert = att.alpa >= 2 || (acad.finalAvg > 0 && acad.finalAvg < 75);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-400">{index + 1}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{s.name}</span>
                              {hasAlert && (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-md text-[9px] font-bold">
                                  Perhatian
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">{s.nis}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-semibold text-emerald-600">{att.hadir}H</span> /{" "}
                            <span className="text-amber-600">{att.sakit}S</span> /{" "}
                            <span className="text-blue-600">{att.izin}I</span> /{" "}
                            <span className={`font-bold ${att.alpa > 0 ? "text-rose-600" : "text-slate-400"}`}>{att.alpa}A</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold ${
                              rate >= 90 ? "bg-emerald-50 text-emerald-700" :
                              rate >= 75 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                            }`}>
                              {rate}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-extrabold text-indigo-600 text-sm">{acad.finalAvg || "-"}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentId(s.id);
                                  setActiveSubTab("rapor");
                                }}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                Rapor <ChevronRight size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintReport(s)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Cetak Rapor Ringkas"
                              >
                                <Printer size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REKAP KEHADIRAN PRESENSI LENGKAP */}
      {activeSubTab === "rekap-kehadiran" && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-indigo-600" /> Rekap Presensi & Kehadiran Siswa
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Rekapitualisasi kehadiran siswa kelas {homeroomClass} berdasarkan pencatatan digital
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 shrink-0">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">Semua Bulan / Semester</option>
                  <option value="01">Januari</option>
                  <option value="02">Februari</option>
                  <option value="03">Maret</option>
                  <option value="04">April</option>
                  <option value="05">Mei</option>
                  <option value="06">Juni</option>
                  <option value="07">Juli</option>
                  <option value="08">Agustus</option>
                  <option value="09">September</option>
                  <option value="10">Oktober</option>
                  <option value="11">November</option>
                  <option value="12">Desember</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handlePrintAttendanceRecap}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              >
                <Printer size={15} /> Cetak Rekap (.PDF)
              </button>
            </div>
          </div>

          {/* Attendance Recap Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3.5 px-4">No</th>
                    <th className="py-3.5 px-4">Nama Siswa</th>
                    <th className="py-3.5 px-4">NIS</th>
                    <th className="py-3.5 px-4 text-center">Hadir (H)</th>
                    <th className="py-3.5 px-4 text-center">Sakit (S)</th>
                    <th className="py-3.5 px-4 text-center">Izin (I)</th>
                    <th className="py-3.5 px-4 text-center">Alpa (A)</th>
                    <th className="py-3.5 px-4 text-center">Total Pertemuan</th>
                    <th className="py-3.5 px-4 text-center">Persentase</th>
                    <th className="py-3.5 px-4 text-center">Status Kelayakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 font-semibold">
                        Tidak ada siswa terdaftar di kelas {homeroomClass}
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((s, idx) => {
                      const att = studentAttendanceSummary[s.id] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0, logs: [] };
                      const rate = att.total > 0 ? Math.round((att.hadir / att.total) * 100) : 100;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">{s.name}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">{s.nis}</td>
                          <td className="py-3.5 px-4 text-center text-emerald-700 font-extrabold">{att.hadir}</td>
                          <td className="py-3.5 px-4 text-center text-amber-700 font-extrabold">{att.sakit}</td>
                          <td className="py-3.5 px-4 text-center text-blue-700 font-extrabold">{att.izin}</td>
                          <td className={`py-3.5 px-4 text-center font-extrabold ${att.alpa > 0 ? "text-rose-600" : "text-slate-400"}`}>
                            {att.alpa}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-500 font-semibold">{att.total} Hari</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold ${
                              rate >= 90 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                              rate >= 80 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}>
                              {rate}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {rate >= 90 ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                Sangat Baik
                              </span>
                            ) : rate >= 80 ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                Baik / Normal
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                                Perlu Perhatian
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LAPORAN HOME VISIT + DOKUMENTASI FOTO */}
      {activeSubTab === "home-visit" && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Home size={16} className="text-indigo-600" /> Laporan Kunjungan Rumah (Home Visit)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Pencatatan resmi kunjungan wali kelas ke rumah siswa beserta dokumentasi foto & kesepakatan orang tua
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpenHomeVisitModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Plus size={15} /> Buat Laporan Home Visit
            </button>
          </div>

          {/* Home Visit Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classHomeVisits.length === 0 ? (
              <div className="col-span-2 bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-3">
                <Home size={36} className="mx-auto text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-800">Belum Ada Laporan Home Visit</h4>
                <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto">
                  Klik tombol "Buat Laporan Home Visit" di atas untuk mencatat agenda kunjungan rumah ke siswa kelas {homeroomClass}.
                </p>
              </div>
            ) : (
              classHomeVisits.map(visit => (
                <div key={visit.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-slate-100 gap-2">
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800">{visit.studentName}</h4>
                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <Calendar size={12} className="text-indigo-500" /> {visit.date}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteHomeVisit(visit.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Hapus Laporan Home Visit"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Parent & Address */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Users size={13} className="text-indigo-600 shrink-0" />
                        <span>Orang Tua: <strong className="text-slate-800">{visit.parentName}</strong></span>
                      </div>
                      <div className="flex items-start gap-1.5 text-slate-500 text-[11px]">
                        <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" />
                        <span>{visit.address}</span>
                      </div>
                    </div>

                    {/* Reason & Result */}
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Alasan Kunjungan</span>
                        <p className="text-slate-700 font-medium leading-relaxed">{visit.reason}</p>
                      </div>

                      <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-0.5">Hasil & Kesepakatan</span>
                        <p className="text-emerald-950 font-medium leading-relaxed">{visit.result}</p>
                      </div>
                    </div>

                    {/* Photo Documentation Thumbnails */}
                    {visit.photos && visit.photos.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Camera size={12} className="text-indigo-600" /> Dokumentasi Foto ({visit.photos.length})
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {visit.photos.map((p, pIdx) => (
                            <img
                              key={pIdx}
                              src={p}
                              alt="Dokumentasi Home Visit"
                              onClick={() => setLightboxImg(p)}
                              className="w-16 h-16 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Print Button */}
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handlePrintHomeVisit(visit)}
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={13} /> Cetak Laporan Home Visit (.PDF)
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: RAPOR RINGKAS */}
      {activeSubTab === "rapor" && reportStudent && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Pilih Siswa Rapor:</label>
                <select
                  value={reportStudent.id}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="mt-1 block w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {classStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (NIS: {s.nis})</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => handlePrintReport(reportStudent)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Printer size={16} /> Cetak Rapor Ringkas (.PDF)
              </button>
            </div>

            <div className="bg-slate-50/70 p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6 max-w-4xl mx-auto">
              <div className="text-center pb-4 border-b-2 border-indigo-600">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">{institution.split('\n').join(' - ')}</h3>
                <h2 className="text-lg font-black text-indigo-900 mt-1">RAPOR RINGKAS & PERKEMBANGAN SISWA</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Tahun Ajaran 2025/2026 • Semester Genap</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-semibold block text-[10px]">NAMA LENGKAP SISWA</span>
                  <span className="font-extrabold text-slate-800 text-sm">{reportStudent.name}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-semibold block text-[10px]">NIS / NISN</span>
                  <span className="font-mono font-extrabold text-slate-800 text-sm">{reportStudent.nis}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-semibold block text-[10px]">KELAS BINAAN</span>
                  <span className="font-extrabold text-slate-800 text-sm">{reportStudent.className}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-semibold block text-[10px]">WALI KELAS</span>
                  <span className="font-extrabold text-indigo-600 text-sm">{teacherName} (NIP. {nip || "-"})</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-600" /> Rekapitulasi Kehadiran
                </h4>
                {(() => {
                  const att = studentAttendanceSummary[reportStudent.id] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
                  const rate = att.total > 0 ? Math.round((att.hadir / att.total) * 100) : 100;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                      <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                        <span className="text-[10px] text-emerald-700 font-bold block">HADIR</span>
                        <span className="text-base font-black text-emerald-800">{att.hadir} Hari</span>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                        <span className="text-[10px] text-amber-700 font-bold block">SAKIT</span>
                        <span className="text-base font-black text-amber-800">{att.sakit} Hari</span>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl">
                        <span className="text-[10px] text-blue-700 font-bold block">IZIN</span>
                        <span className="text-base font-black text-blue-800">{att.izin} Hari</span>
                      </div>
                      <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                        <span className="text-[10px] text-rose-700 font-bold block">ALPA</span>
                        <span className="text-base font-black text-rose-800">{att.alpa} Hari</span>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-indigo-700 font-bold block">PERSENTASE</span>
                        <span className="text-base font-black text-indigo-900">{rate}%</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Award size={14} className="text-indigo-600" /> Capaian Nilai Akademik
                </h4>
                {(() => {
                  const acad = studentAcademicSummary[reportStudent.id] || { avgAssignment: 0, examScore: 0, finalAvg: 0 };
                  return (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">Rata-Rata Tugas & Harian</span>
                        <span className="font-extrabold text-slate-800">{acad.avgAssignment}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">Nilai Evaluasi / Ujian Akhir</span>
                        <span className="font-extrabold text-slate-800">{acad.examScore}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 font-bold">
                        <span className="text-indigo-900 text-sm">NILAI AKHIR RATA-RATA</span>
                        <span className="text-lg font-black text-indigo-600 px-3 py-1 bg-indigo-50 rounded-xl">{acad.finalAvg}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <HeartHandshake size={14} className="text-indigo-600" /> Catatan Pembinaan Wali Kelas
                </h4>
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  {notes.filter(n => n.studentId === reportStudent.id).length > 0 ? (
                    notes.filter(n => n.studentId === reportStudent.id).map(n => (
                      <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-indigo-700 text-[11px]">{n.category} ({n.date})</span>
                        </div>
                        <p className="text-slate-700 font-medium">{n.note}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Tindak Lanjut: {n.actionTaken}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 font-medium italic">Belum ada catatan khusus. Siswa berperilaku baik dan tuntas secara umum.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: CATATAN PEMBINAAN */}
      {activeSubTab === "pembinaan" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Catatan Pembinaan Wali Kelas ({notes.filter(n => n.className === homeroomClass).length})</h3>
              <p className="text-[11px] text-slate-500 font-medium">Rekam jejak bimbingan kedisiplinan dan perkembangan siswa</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpenAddNoteModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={15} /> Tambah Catatan Pembinaan
            </button>
          </div>

          <div className="space-y-3">
            {notes.filter(n => n.className === homeroomClass).length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                <h4 className="text-xs font-bold text-slate-700">Belum Ada Catatan Pembinaan</h4>
                <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto">
                  Siswa kelas {homeroomClass} saat ini berada dalam kondisi aman. Klik tombol di atas untuk menambah catatan khusus.
                </p>
              </div>
            ) : (
              notes.filter(n => n.className === homeroomClass).map(note => (
                <div key={note.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-800">{note.studentName}</span>
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold">
                        {note.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-semibold">{note.date}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{note.note}</p>
                  
                  {note.actionTaken && (
                    <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600 font-semibold border border-slate-100 flex items-start gap-1.5">
                      <TrendingUp size={13} className="text-indigo-600 shrink-0 mt-0.5" />
                      <span><strong>Tindak Lanjut / Solusi:</strong> {note.actionTaken}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 6: PERHATIAN KHUSUS */}
      {activeSubTab === "perhatian" && (
        <div className="space-y-4">
          <div className="bg-rose-50/80 p-4 rounded-3xl border border-rose-100 flex items-center gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-sm">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-rose-900">Perhatian Khusus Siswa Kelas Bimbingan</h3>
              <p className="text-[11px] text-rose-700 font-medium">Siswa dengan persentase Alpa tinggi, atau Nilai Rata-rata &lt; 75 KKM</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classStats.alertStudents.length === 0 ? (
              <div className="col-span-2 bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
                <h4 className="text-xs font-bold text-slate-800">Semua Siswa Terpantau Aman!</h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  Tidak ada siswa dengan masalah kehadiran serius atau penurunan nilai drastis di kelas {homeroomClass}.
                </p>
              </div>
            ) : (
              classStats.alertStudents.map(student => {
                const att = studentAttendanceSummary[student.id] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
                const acad = studentAcademicSummary[student.id] || { avgAssignment: 0, examScore: 0, finalAvg: 0 };
                const stNotes = notes.filter(n => n.studentId === student.id);

                return (
                  <div key={student.id} className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800">{student.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">NIS: {student.nis}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-bold">
                        Perlu Pendampingan
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold block">JUMLAH ALPA</span>
                        <span className={`font-black text-sm ${att.alpa >= 2 ? "text-rose-600" : "text-slate-700"}`}>
                          {att.alpa} Hari
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold block">RATA-RATA NILAI</span>
                        <span className={`font-black text-sm ${acad.finalAvg < 75 ? "text-rose-600" : "text-emerald-600"}`}>
                          {acad.finalAvg}
                        </span>
                      </div>
                    </div>

                    {stNotes.length > 0 && (
                      <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100 text-[11px] space-y-1">
                        <span className="text-amber-800 font-bold block text-[10px]">Catatan Terakhir:</span>
                        <p className="text-slate-700 font-medium">{stNotes[stNotes.length - 1].note}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setHvStudentId(student.id);
                          setIsOpenHomeVisitModal(true);
                        }}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        + Home Visit
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintReport(student)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Cetak Rapor
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: BUAT LAPORAN HOME VISIT + DOKUMENTASI FOTO */}
      {isOpenHomeVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Home size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Laporan Home Visit (Kunjungan Rumah)</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Dokumentasikan bimbingan dan koordinasi bersama orang tua</p>
                </div>
              </div>
              <button onClick={() => setIsOpenHomeVisitModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pilih Siswa</label>
                <select
                  value={hvStudentId}
                  onChange={(e) => setHvStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Pilih Siswa Kelas {homeroomClass} --</option>
                  {classStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (NIS: {s.nis})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tanggal Kunjungan</label>
                  <input
                    type="date"
                    value={hvDate}
                    onChange={(e) => setHvDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={hvParentName}
                    onChange={(e) => setHvParentName(e.target.value)}
                    placeholder="Contoh: Bpk. Hendra Fauzi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Alamat Rumah Siswa</label>
                <input
                  type="text"
                  value={hvAddress}
                  onChange={(e) => setHvAddress(e.target.value)}
                  placeholder="Contoh: Jl. Mawar No. 14, Rt 02/05, Tasikmalaya"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Alasan / Permasalahan Kunjungan</label>
                <textarea
                  rows={2}
                  value={hvReason}
                  onChange={(e) => setHvReason(e.target.value)}
                  placeholder="Contoh: Siswa sering Alpa berturut-turut dan penurunan motivasi belajar..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Hasil Diskusi & Kesepakatan Bersama</label>
                <textarea
                  rows={3}
                  value={hvResult}
                  onChange={(e) => setHvResult(e.target.value)}
                  placeholder="Contoh: Orang tua menyetujui pendampingan ketat di rumah, membatasi gawai, dan siap melaporkan jam belajar..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Upload Foto Dokumentasi */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dokumentasi Foto Kunjungan</label>
                <label className="flex items-center justify-center gap-2 w-full p-3 bg-slate-50 hover:bg-indigo-50/50 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl text-slate-600 font-bold cursor-pointer transition-all">
                  <Camera size={16} className="text-indigo-600" /> Upload Foto Dokumentasi (.jpg, .png)
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {hvPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {hvPhotos.map((photo, pIdx) => (
                      <div key={pIdx} className="relative group rounded-xl overflow-hidden border border-slate-200">
                        <img src={photo} alt="Upload" className="w-full h-16 object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(pIdx)}
                          className="absolute top-1 right-1 bg-rose-600 text-white p-0.5 rounded-full hover:bg-rose-700 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpenHomeVisitModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveHomeVisit}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Simpan Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH CATATAN PEMBINAAN */}
      {isOpenAddNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800">Catatan Pembinaan Wali Kelas</h3>
              <button onClick={() => setIsOpenAddNoteModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pilih Siswa</label>
                <select
                  value={noteStudentId}
                  onChange={(e) => setNoteStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Pilih Siswa Kelas {homeroomClass} --</option>
                  {classStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (NIS: {s.nis})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kategori Pembinaan</label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as HomeroomNote["category"])}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Kedisiplinan">Kedisiplinan / Keterlambatan</option>
                  <option value="Akademik">Akademik / Tugas</option>
                  <option value="Prestasi">Prestasi / Penghargaan</option>
                  <option value="Konseling">Konseling Bimbingan</option>
                  <option value="Kesehatan">Kesehatan / Absensi</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tanggal</label>
                <input
                  type="date"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Isi Catatan Pembinaan</label>
                <textarea
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Contoh: Siswa sering terlambat masuk jam pertama dan alpa 2 kali..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tindak Lanjut / Solusi</label>
                <input
                  type="text"
                  value={noteAction}
                  onChange={(e) => setNoteAction(e.target.value)}
                  placeholder="Contoh: Pemanggilan orang tua & bimbingan konseling..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpenAddNoteModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX PREVIEW MODAL */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => setLightboxImg(null)}>
          <div className="relative max-w-3xl max-h-[90vh] p-2 bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-3 -right-3 bg-rose-600 text-white p-1.5 rounded-full shadow-lg hover:bg-rose-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <img src={lightboxImg} alt="Dokumentasi Zoom" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
