import React, { useState, useMemo, useRef } from 'react';
import { Student, AppUser } from '../../types';
import * as XLSX from 'xlsx';
import { 
  GraduationCap, Plus, Search, Filter, Download, Upload, 
  Trash2, Edit, CheckCircle2, AlertCircle, ArrowRightLeft, Users, RefreshCw,
  FileSpreadsheet, FileUp, Check, X, FileText
} from 'lucide-react';

interface Props {
  students: Student[];
  classList: string[];
  userAccounts: AppUser[];
  onAddStudent: (student: Partial<Student>) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onBatchDeleteStudents?: (studentIds: string[]) => void;
  onBatchTransferClass: (studentIds: string[], targetClass: string) => void;
  onImportStudents: (imported: Student[]) => void;
  onSyncStudentsFromAdmin?: (targetClasses?: string[]) => Promise<void>;
  onSaveStudentsToMaster?: (studentsList: Student[]) => Promise<void>;
  isSyncingStudents?: boolean;
  syncStudentsMsg?: string | null;
}

export default function TabSiswa({
  students,
  classList,
  userAccounts,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onBatchDeleteStudents,
  onBatchTransferClass,
  onImportStudents,
  onSyncStudentsFromAdmin,
  onSaveStudentsToMaster,
  isSyncingStudents = false,
  syncStudentsMsg = null
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [targetTransferClass, setTargetTransferClass] = useState(classList[0] || 'X-1');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'excel' | 'paste'>('excel');
  const [parsedPreviewStudents, setParsedPreviewStudents] = useState<Student[]>([]);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [csvRawText, setCsvRawText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    nis: '',
    nisn: '',
    className: classList[0] || 'X-1',
    gender: 'L',
    attendanceNumber: '',
    parentName: '',
    parentPhone: '',
    studentPhone: '',
    address: ''
  });

  // Analyze imported preview students against existing master data
  const previewAnalysis = useMemo(() => {
    let newCount = 0;
    let enrichCount = 0;
    const items = parsedPreviewStudents.map(imp => {
      const impNameNorm = (imp.name || "").trim().toLowerCase();
      const impClassNorm = (imp.className || "").trim().toLowerCase();
      const impNis = (imp.nis || "").trim();
      const impNisn = (imp.nisn || "").trim();

      const existing = students.find(ex => {
        const exNis = (ex.nis || "").trim();
        const exNisn = (ex.nisn || "").trim();
        const exNameNorm = (ex.name || "").trim().toLowerCase();
        const exClassNorm = (ex.className || "").trim().toLowerCase();

        if (impNisn && exNisn && impNisn === exNisn) return true;
        if (impNis && exNis && impNis === exNis) return true;
        if (impNameNorm && exNameNorm && impNameNorm === exNameNorm && (!impClassNorm || !exClassNorm || impClassNorm === exClassNorm)) return true;
        if (impNameNorm && exNameNorm && impNameNorm === exNameNorm && impNameNorm.length >= 4) return true;
        return false;
      });

      if (existing) {
        enrichCount++;
        const missingCompleted: string[] = [];
        if (!existing.nis && imp.nis) missingCompleted.push("NIS");
        if (!existing.nisn && imp.nisn) missingCompleted.push("NISN");
        if (!existing.gender && imp.gender) missingCompleted.push("Gender");
        if (!existing.attendanceNumber && imp.attendanceNumber) missingCompleted.push("No Absen");
        if (!existing.studentPhone && imp.studentPhone) missingCompleted.push("HP Siswa");
        if (!existing.parentName && imp.parentName) missingCompleted.push("Nama Ortu");
        if (!existing.parentPhone && imp.parentPhone) missingCompleted.push("HP Ortu");
        if (!existing.address && imp.address) missingCompleted.push("Alamat");

        return {
          ...imp,
          status: 'enrich' as const,
          matchedName: existing.name,
          missingCompleted
        };
      } else {
        newCount++;
        return {
          ...imp,
          status: 'new' as const,
          matchedName: '',
          missingCompleted: []
        };
      }
    });

    return {
      items,
      newCount,
      enrichCount
    };
  }, [parsedPreviewStudents, students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.nis && s.nis.includes(searchQuery)) ||
        (s.nisn && s.nisn.includes(searchQuery));
      const matchClass = selectedClass === 'all' || s.className === selectedClass;
      const matchGender = selectedGender === 'all' || s.gender === selectedGender;
      return matchSearch && matchClass && matchGender;
    });
  }, [students, searchQuery, selectedClass, selectedGender]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;
    onAddStudent(formData);
    setFormData({
      name: '',
      nis: '',
      nisn: '',
      className: classList[0] || 'X-1',
      gender: 'L',
      attendanceNumber: '',
      parentName: '',
      parentPhone: '',
      studentPhone: '',
      address: ''
    });
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editingStudent.name.trim()) return;
    onEditStudent(editingStudent);
    setEditingStudent(null);
  };

  const handleExecuteTransfer = () => {
    if (selectedStudentIds.length === 0) return;
    onBatchTransferClass(selectedStudentIds, targetTransferClass);
    setSelectedStudentIds([]);
    setIsTransferModalOpen(false);
  };

  const handleDownloadXlsxTemplate = () => {
    const templateData = [
      {
        "No": 1,
        "Nama Lengkap": "Ahmad Fauzi Pratama",
        "NIS": "20251001",
        "NISN": "0078912341",
        "Kelas": classList[0] || "X-1",
        "Jenis Kelamin (L/P)": "L",
        "No Absen": 1,
        "Telepon Siswa": "081234567801",
        "Nama Orang Tua": "Bapak Fauzi",
        "Telepon Orang Tua": "081298765401",
        "Alamat": "Jl. Pendidikan No. 12, RT 01/RW 02"
      },
      {
        "No": 2,
        "Nama Lengkap": "Annisa Rahmawati",
        "NIS": "20251002",
        "NISN": "0078912342",
        "Kelas": classList[0] || "X-1",
        "Jenis Kelamin (L/P)": "P",
        "No Absen": 2,
        "Telepon Siswa": "081234567802",
        "Nama Orang Tua": "Ibu Rahmawati",
        "Telepon Orang Tua": "081298765402",
        "Alamat": "Jl. Mawar Indah Blok B3"
      },
      {
        "No": 3,
        "Nama Lengkap": "Budi Santoso",
        "NIS": "20251003",
        "NISN": "0078912343",
        "Kelas": classList[1] || classList[0] || "X-2",
        "Jenis Kelamin (L/P)": "L",
        "No Absen": 3,
        "Telepon Siswa": "081234567803",
        "Nama Orang Tua": "Bapak Santoso",
        "Telepon Orang Tua": "081298765403",
        "Alamat": "Jl. Kartini No. 45"
      },
      {
        "No": 4,
        "Nama Lengkap": "Citra Dewi Anggraini",
        "NIS": "20251004",
        "NISN": "0078912344",
        "Kelas": classList[1] || classList[0] || "X-2",
        "Jenis Kelamin (L/P)": "P",
        "No Absen": 4,
        "Telepon Siswa": "081234567804",
        "Nama Orang Tua": "Ibu Anggraini",
        "Telepon Orang Tua": "081298765404",
        "Alamat": "Jl. Kenanga Asri No. 8"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [
      { wch: 6 },  // No
      { wch: 28 }, // Nama Lengkap
      { wch: 14 }, // NIS
      { wch: 16 }, // NISN
      { wch: 12 }, // Kelas
      { wch: 20 }, // Jenis Kelamin (L/P)
      { wch: 10 }, // No Absen
      { wch: 16 }, // Telepon Siswa
      { wch: 22 }, // Nama Orang Tua
      { wch: 18 }, // Telepon Orang Tua
      { wch: 32 }  // Alamat
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Siswa");
    XLSX.writeFile(workbook, "Template_Pendaftaran_Siswa_Master.xlsx");
  };

  const handleExportXLSX = () => {
    const dataRows = filteredStudents.map((s, idx) => ({
      "No": idx + 1,
      "ID Siswa": s.id,
      "Nama Lengkap": s.name,
      "NIS": s.nis || "",
      "NISN": s.nisn || "",
      "Kelas": s.className,
      "Jenis Kelamin": s.gender === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)',
      "No Absen": s.attendanceNumber || "",
      "Telepon Siswa": s.studentPhone || "",
      "Nama Orang Tua": s.parentName || "",
      "Telepon Orang Tua": s.parentPhone || "",
      "Alamat": s.address || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 28 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 10 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 32 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa Master");
    XLSX.writeFile(workbook, `Data_Siswa_${selectedClass}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

        if (!rawRows || rawRows.length === 0) {
          setImportError("Berkas Excel kosong atau tidak memuat data baris siswa.");
          setParsedPreviewStudents([]);
          return;
        }

        const defaultClass = selectedClass !== 'all' ? selectedClass : (classList[0] || "X-1");
        const parsed: Student[] = [];

        rawRows.forEach((row, idx) => {
          let name = "";
          let nis = "";
          let nisn = "";
          let studentClass = defaultClass;
          let gender: 'L' | 'P' = 'L';
          let attendanceNumber = "";
          let studentPhone = "";
          let parentName = "";
          let parentPhone = "";
          let address = "";

          Object.keys(row).forEach((key) => {
            const cleanKey = key.trim().toLowerCase();
            const val = String(row[key] ?? "").trim();

            if (cleanKey.includes("nama") && (cleanKey.includes("lengkap") || cleanKey.includes("siswa") || cleanKey === "nama" || cleanKey === "name")) {
              name = val;
            } else if (cleanKey === "nis" || cleanKey.includes("nomor induk") || cleanKey === "no induk") {
              nis = val;
            } else if (cleanKey.includes("nisn")) {
              nisn = val;
            } else if (cleanKey.includes("kelas") || cleanKey.includes("rombel") || cleanKey === "class") {
              if (val) studentClass = val;
            } else if (cleanKey.includes("gender") || cleanKey.includes("kelamin") || cleanKey === "jk" || cleanKey === "l/p") {
              if (val.toUpperCase().startsWith("P") || val.toLowerCase().includes("perempuan")) {
                gender = "P";
              } else {
                gender = "L";
              }
            } else if (cleanKey.includes("absen")) {
              attendanceNumber = val;
            } else if ((cleanKey.includes("telepon") || cleanKey.includes("hp")) && cleanKey.includes("siswa")) {
              studentPhone = val;
            } else if (cleanKey.includes("ortu") || cleanKey.includes("orang tua") || cleanKey.includes("wali") || cleanKey.includes("ayah") || cleanKey.includes("ibu")) {
              if (cleanKey.includes("hp") || cleanKey.includes("telepon") || cleanKey.includes("kontak")) {
                parentPhone = val;
              } else {
                parentName = val;
              }
            } else if (cleanKey.includes("alamat") || cleanKey.includes("address")) {
              address = val;
            }
          });

          if (name) {
            parsed.push({
              id: `s-imp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
              name,
              nis: nis || `${Math.floor(1000000 + Math.random() * 9000000)}`,
              nisn,
              className: studentClass,
              gender,
              attendanceNumber,
              studentPhone,
              parentName,
              parentPhone,
              address
            });
          }
        });

        if (parsed.length === 0) {
          setImportError("Tidak dapat menemukan kolom nama yang valid. Pastikan ada kolom 'Nama Lengkap' atau 'Nama'.");
          setParsedPreviewStudents([]);
          return;
        }

        setParsedPreviewStudents(parsed);
      } catch (err: any) {
        console.error("Error reading excel file:", err);
        setImportError("Gagal memproses berkas Excel. Pastikan format berkas valid (.xlsx / .xls).");
        setParsedPreviewStudents([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleCommitImportExcel = () => {
    if (parsedPreviewStudents.length === 0) return;
    onImportStudents(parsedPreviewStudents);
    setParsedPreviewStudents([]);
    setImportFileName('');
    setIsImportModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['No', 'ID', 'Nama Lengkap', 'NIS', 'NISN', 'Kelas', 'Jenis Kelamin', 'No Absen', 'Telepon Siswa', 'Nama Orang Tua', 'Telepon Ortu'];
    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      `"${s.id}"`,
      `"${s.name}"`,
      `"${s.nis || ''}"`,
      `"${s.nisn || ''}"`,
      `"${s.className}"`,
      `"${s.gender || 'L'}"`,
      `"${s.attendanceNumber || ''}"`,
      `"${s.studentPhone || ''}"`,
      `"${s.parentName || ''}"`,
      `"${s.parentPhone || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `data_siswa_sekolah_${selectedClass}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleParseCSV = () => {
    if (!csvRawText.trim()) return;
    const lines = csvRawText.trim().split('\n');
    const parsed: Student[] = [];
    lines.forEach((line, idx) => {
      if (idx === 0 && line.toLowerCase().includes('nama')) return; // Skip header
      const cols = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
      if (cols.length >= 2 && cols[0]) {
        const name = cols[0];
        const nis = cols[1] || `${Math.floor(1000000 + Math.random() * 9000000)}`;
        const nisn = cols[2] || '';
        const className = cols[3] || classList[0] || 'X-1';
        const gender = (cols[4] && cols[4].toUpperCase().startsWith('P')) ? 'P' : 'L';
        parsed.push({
          id: `s-imp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          nis,
          nisn,
          className,
          gender
        });
      }
    });

    if (parsed.length > 0) {
      onImportStudents(parsed);
      setIsImportModalOpen(false);
      setCsvRawText('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action and Filter Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIS, atau NISN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 w-56 sm:w-64"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">Semua Rombel ({classList.length})</option>
              {classList.map(c => (
                <option key={c} value={c}>Kelas {c}</option>
              ))}
            </select>

            <select
              value={selectedGender}
              onChange={e => setSelectedGender(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">Semua Gender</option>
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedStudentIds.length > 0 && (
            <>
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <ArrowRightLeft size={14} />
                <span>Mutasi ({selectedStudentIds.length})</span>
              </button>

              <button
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title={`Hapus ${selectedStudentIds.length} data siswa terpilih`}
              >
                <Trash2 size={14} />
                <span>Hapus Terpilih ({selectedStudentIds.length})</span>
              </button>
            </>
          )}

          {/* Tarik Data Siswa dari Admin Button */}
          {onSyncStudentsFromAdmin && (
            <button
              onClick={() => onSyncStudentsFromAdmin(selectedClass !== 'all' ? [selectedClass] : undefined)}
              disabled={isSyncingStudents}
              title="Tarik dan sinkronkan data siswa resmi dari database Master Administrator"
              className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-sky-200 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <RefreshCw size={14} className={isSyncingStudents ? "animate-spin text-sky-600" : "text-sky-600"} />
              <span>{isSyncingStudents ? "Menyinkronkan..." : "Tarik Siswa Admin"}</span>
            </button>
          )}

          {/* Simpan ke Master Admin Button */}
          {onSaveStudentsToMaster && (
            <button
              onClick={() => onSaveStudentsToMaster(students)}
              title="Simpan seluruh data siswa saat ini ke Database Master Administrator"
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
            >
              <CheckCircle2 size={14} className="text-indigo-600" />
              <span>Simpan ke Master</span>
            </button>
          )}

          {/* Template XLSX button */}
          <button
            onClick={handleDownloadXlsxTemplate}
            title="Unduh berkas template Excel (.xlsx) untuk pendaftaran siswa baru"
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-emerald-200 transition-all cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Template XLSX</span>
          </button>

          <button
            onClick={() => {
              setImportMode('excel');
              setIsImportModalOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-indigo-200 transition-all cursor-pointer"
          >
            <Upload size={14} />
            <span>Impor Excel</span>
          </button>

          <button
            onClick={handleExportXLSX}
            title="Ekspor seluruh data siswa yang terfilter ke berkas Excel (.xlsx)"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Ekspor XLSX</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {syncStudentsMsg && (
        <div className="p-3.5 bg-sky-50 border border-sky-200 text-sky-900 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 size={16} className="text-sky-600 shrink-0" />
          <span>{syncStudentsMsg}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan <strong>{filteredStudents.length}</strong> dari {students.length} siswa</span>
          {selectedStudentIds.length > 0 && (
            <span className="text-amber-600 font-bold">{selectedStudentIds.length} siswa dipilih</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.length > 0 && selectedStudentIds.length === filteredStudents.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5">Identitas Siswa</th>
                <th className="px-4 py-3.5">NIS / NISN</th>
                <th className="px-4 py-3.5">Rombel</th>
                <th className="px-4 py-3.5">Gender</th>
                <th className="px-4 py-3.5">Status Akun</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                    Tidak ada data siswa yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(s => {
                  const isChecked = selectedStudentIds.includes(s.id);
                  const linkedUser = userAccounts.find(u => 
                    (s.nisn && u.nisn === s.nisn) || 
                    (s.nis && u.username === s.nis) ||
                    u.name.toLowerCase() === s.name.toLowerCase()
                  );

                  return (
                    <tr key={s.id} className={`hover:bg-slate-50/70 transition-colors ${isChecked ? 'bg-indigo-50/30' : ''}`}>
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(s.id)}
                          className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 ${
                            s.gender === 'P' ? 'bg-rose-500' : 'bg-indigo-600'
                          }`}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{s.name}</p>
                            {s.attendanceNumber && (
                              <span className="text-[10px] text-slate-400 font-semibold">Absen #{s.attendanceNumber}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                        <div>{s.nis || '-'}</div>
                        {s.nisn && <div className="text-[10px] text-slate-400">NISN: {s.nisn}</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg text-[10px] font-bold border border-sky-100">
                          {s.className}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          s.gender === 'P' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {s.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {linkedUser ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold border border-emerald-100 flex items-center gap-1 w-fit">
                            <CheckCircle2 size={10} /> Terkoneksi (@{linkedUser.username})
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Belum Ada Akun</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingStudent(s)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Data Siswa"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus data siswa "${s.name}"?`)) {
                                onDeleteStudent(s.id);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Siswa"
                          >
                            <Trash2 size={14} />
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

      {/* MODAL 1: ADD STUDENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" />
                Tambah Data Siswa Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Template XLSX Quick Banner */}
            <div className="mb-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-start gap-2 text-emerald-800">
                <FileSpreadsheet size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900">Ingin Input Siswa Banyak Sekaligus?</p>
                  <p className="text-[11px] text-emerald-700 leading-snug">
                    Unduh format Excel (.xlsx), isi data, lalu unggah seketika via menu Impor.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadXlsxTemplate}
                  title="Unduh berkas Excel"
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-[10.5px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <Download size={12} />
                  <span>Unduh Template XLSX</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setImportMode('excel');
                    setIsImportModalOpen(true);
                  }}
                  title="Buka form impor file Excel"
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-[10.5px] flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Upload size={12} />
                  <span>Impor Excel</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Muhammad Farhan"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">NIS (Nomor Induk Siswa)</label>
                  <input
                    type="text"
                    value={formData.nis || ''}
                    onChange={e => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="Contoh: 1024501"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">NISN</label>
                  <input
                    type="text"
                    value={formData.nisn || ''}
                    onChange={e => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="Contoh: 0071234567"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Rombel / Kelas *</label>
                  <select
                    value={formData.className || classList[0]}
                    onChange={e => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                  >
                    {classList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.gender || 'L'}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">No Absen</label>
                  <input
                    type="number"
                    value={formData.attendanceNumber || ''}
                    onChange={e => setFormData({ ...formData, attendanceNumber: e.target.value })}
                    placeholder="1"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={formData.parentName || ''}
                    onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                    placeholder="Nama ayah/ibu"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">No. HP Orang Tua</label>
                  <input
                    type="text"
                    value={formData.parentPhone || ''}
                    onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                    placeholder="0812xxxx"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-xs transition-all cursor-pointer"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT STUDENT */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
              <Edit size={18} className="text-indigo-600" />
              Edit Data Siswa
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">NIS</label>
                  <input
                    type="text"
                    value={editingStudent.nis || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, nis: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">NISN</label>
                  <input
                    type="text"
                    value={editingStudent.nisn || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, nisn: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Rombel / Kelas</label>
                  <select
                    value={editingStudent.className}
                    onChange={e => setEditingStudent({ ...editingStudent, className: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                  >
                    {classList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Gender</label>
                  <select
                    value={editingStudent.gender || 'L'}
                    onChange={e => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">No Absen</label>
                  <input
                    type="text"
                    value={editingStudent.attendanceNumber || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, attendanceNumber: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Alamat</label>
                <input
                  type="text"
                  value={editingStudent.address || ''}
                  onChange={e => setEditingStudent({ ...editingStudent, address: e.target.value })}
                  placeholder="Alamat tempat tinggal"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-xs transition-all cursor-pointer"
                >
                  Perbarui Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BATCH MUTASI KELAS */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <ArrowRightLeft size={18} className="text-amber-500" />
              Mutasi Rombel Massal
            </h3>
            <p className="text-xs text-slate-600">
              Pindahkan sebanyak <strong>{selectedStudentIds.length} siswa</strong> yang dipilih ke kelas baru:
            </p>
            <div>
              <label className="font-bold text-slate-600 block mb-1 text-xs">Pilih Rombel Tujuan:</label>
              <select
                value={targetTransferClass}
                onChange={e => setTargetTransferClass(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none text-xs"
              >
                {classList.map(c => (
                  <option key={c} value={c}>Kelas {c}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteTransfer}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs shadow-xs"
              >
                Pindahkan Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: IMPORT EXCEL / CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-emerald-600" />
                Impor Data Siswa Baru
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedPreviewStudents([]);
                  setImportFileName('');
                  setImportError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setImportMode('excel')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  importMode === 'excel'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet size={14} />
                <span>Berkas Excel (.xlsx / .xls)</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('paste')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  importMode === 'paste'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <FileText size={14} />
                <span>Tempel Teks (CSV)</span>
              </button>
            </div>

            {importMode === 'excel' ? (
              <div className="space-y-4">
                {/* Download Template Callout */}
                <div className="p-4 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <FileSpreadsheet size={16} className="text-emerald-600" />
                      Template Resmi Excel (.xlsx)
                    </p>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Format kolom telah disesuaikan: No, Nama Lengkap, NIS, NISN, Kelas, Gender (L/P), dsb.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadXlsxTemplate}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0 self-start sm:self-center"
                  >
                    <Download size={13} />
                    <span>Unduh Template .XLSX</span>
                  </button>
                </div>

                {/* File Dropzone */}
                {parsedPreviewStudents.length === 0 ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelFileUpload}
                      className="hidden"
                      id="excel-file-input"
                    />
                    <label
                      htmlFor="excel-file-input"
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                    >
                      <div className="p-3 bg-white group-hover:bg-emerald-100/60 text-slate-400 group-hover:text-emerald-600 rounded-2xl shadow-xs transition-all mb-2">
                        <FileUp size={24} />
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        Klik untuk memilih berkas Excel atau CSV
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Mendukung ekstensi <strong className="text-emerald-700 font-mono">.xlsx</strong>, <strong className="text-emerald-700 font-mono">.xls</strong>, dan <strong className="text-indigo-700 font-mono">.csv</strong>
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Header info & Change file button */}
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0">
                          <Check size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-emerald-950">
                            {parsedPreviewStudents.length} Data Siswa Terbaca
                          </p>
                          <p className="text-[10.5px] text-emerald-800">
                            Berkas: <span className="font-mono font-bold text-emerald-900">{importFileName}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setParsedPreviewStudents([]);
                          setImportFileName('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="px-3 py-1.5 text-[11px] text-slate-700 bg-white hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl font-bold transition-all self-end sm:self-center cursor-pointer shadow-2xs"
                      >
                        Ganti Berkas
                      </button>
                    </div>

                    {/* Smart Merge Strategy Explanation Notice */}
                    <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <CheckCircle2 size={14} className="text-amber-600 shrink-0" />
                        <span>Kebijakan Penggabungan Data Cerdas</span>
                      </div>
                      <p className="leading-relaxed text-amber-800 text-[10.5px]">
                        Jika siswa sudah terdaftar (berdasarkan NISN, NIS, atau Nama), data <strong>tidak akan diganti seluruhnya</strong>, melainkan <strong>hanya melengkapi kolom data yang masih kosong</strong>. Data siswa yang sudah ada tetap aman.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-lg font-bold text-[10px]">
                          ✨ {previewAnalysis.newCount} Siswa Baru
                        </span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-lg font-bold text-[10px]">
                          🔄 {previewAnalysis.enrichCount} Melengkapi Data Terdaftar
                        </span>
                      </div>
                    </div>

                    {/* Table Preview (first 8 records) with status column */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 bg-slate-50 z-10">
                          <tr>
                            <th className="px-3 py-2">No</th>
                            <th className="px-3 py-2">Nama Lengkap</th>
                            <th className="px-3 py-2">NIS / NISN</th>
                            <th className="px-3 py-2">Kelas</th>
                            <th className="px-3 py-2">Status Impor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewAnalysis.items.slice(0, 8).map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="px-3 py-1.5 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="px-3 py-1.5 font-bold text-slate-800">{s.name}</td>
                              <td className="px-3 py-1.5 font-mono text-slate-600">
                                {s.nis || '-'}{s.nisn ? ` / ${s.nisn}` : ''}
                              </td>
                              <td className="px-3 py-1.5 text-slate-700">{s.className}</td>
                              <td className="px-3 py-1.5">
                                {s.status === 'enrich' ? (
                                  <span 
                                    title={s.missingCompleted.length > 0 ? `Akan melengkapi: ${s.missingCompleted.join(', ')}` : 'Siswa sudah terdaftar'}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold"
                                  >
                                    <span>Lengkapi</span>
                                    {s.missingCompleted.length > 0 && (
                                      <span className="text-[9px] text-amber-600">({s.missingCompleted.length} data)</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">
                                    <span>Baru</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {previewAnalysis.items.length > 8 && (
                        <div className="p-2 bg-slate-50 text-center text-[10.5px] text-slate-500 border-t border-slate-100 font-medium">
                          ... dan {previewAnalysis.items.length - 8} data siswa lainnya
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {importError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tempel teks data siswa dipisahkan koma dengan urutan:<br />
                  <code className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[10px] text-indigo-700 block mt-1">
                    Nama, NIS, NISN, Kelas, Gender(L/P)
                  </code>
                </p>
                <textarea
                  rows={6}
                  value={csvRawText}
                  onChange={e => setCsvRawText(e.target.value)}
                  placeholder="Ahmad Fauzi, 1024501, 0071234567, X-1, L&#10;Citra Lestari, 1024502, 0071234568, X-1, P"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedPreviewStudents([]);
                  setImportFileName('');
                  setImportError(null);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              {importMode === 'excel' ? (
                <button
                  type="button"
                  disabled={parsedPreviewStudents.length === 0}
                  onClick={handleCommitImportExcel}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-xl font-black text-xs shadow-xs transition-all cursor-pointer"
                >
                  Simpan {parsedPreviewStudents.length > 0 ? `(${parsedPreviewStudents.length}) ` : ''}Siswa
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleParseCSV}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-xs transition-all cursor-pointer"
                >
                  Proses & Simpan CSV
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BATCH DELETE CONFIRMATION MODAL */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-100 space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100/80 rounded-2xl">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Hapus {selectedStudentIds.length} Data Siswa Terpilih?</h3>
                <p className="text-xs text-slate-500 font-medium">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 text-xs text-rose-800 space-y-2">
              <p className="font-semibold">
                Anda akan menghapus secara permanen <strong>{selectedStudentIds.length} data siswa</strong> dari sistem database.
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {students.filter(s => selectedStudentIds.includes(s.id)).map((s, idx) => (
                  <div key={s.id} className="flex items-center justify-between text-[11px] bg-white/80 px-2.5 py-1 rounded-lg border border-rose-100">
                    <span className="font-bold text-slate-800 truncate mr-2">{idx + 1}. {s.name}</span>
                    <span className="text-slate-500 font-mono text-[10px] shrink-0">Kelas {s.className}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onBatchDeleteStudents) {
                    onBatchDeleteStudents(selectedStudentIds);
                  } else {
                    selectedStudentIds.forEach(id => onDeleteStudent(id));
                  }
                  setSelectedStudentIds([]);
                  setIsBatchDeleteModalOpen(false);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Ya, Hapus {selectedStudentIds.length} Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
