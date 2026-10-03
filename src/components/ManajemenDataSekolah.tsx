import React, { useState, useEffect } from 'react';
import { 
  Student, AppUser, SubjectMaster, ClassMaster, SchoolMasterProfile 
} from '../types';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, isFirestoreQuotaExceeded } from '../lib/firebaseClient';
import { 
  Database, GraduationCap, Layers, BookOpen, School, 
  Users, CheckCircle2, ChevronRight, HardDrive, ArrowUpRight
} from 'lucide-react';
import TabSiswa from './manajemen-data/TabSiswa';
import TabKelas from './manajemen-data/TabKelas';
import TabPelajaran from './manajemen-data/TabPelajaran';
import TabSemuaData from './manajemen-data/TabSemuaData';

interface Props {
  students: Student[];
  classList: string[];
  onAddStudent: (student: Partial<Student>) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onBatchDeleteStudents?: (studentIds: string[]) => void;
  onBatchTransferClass: (studentIds: string[], targetClass: string) => void;
  onImportStudents: (imported: Student[]) => void;
  onAddClass: (className: string) => void;
  onRenameClass: (oldName: string, newName: string) => void;
  onDeleteClass: (classNameToDelete: string) => void;
  subjects: SubjectMaster[];
  onAddSubject: (subject: SubjectMaster) => void;
  onEditSubject: (subject: SubjectMaster) => void;
  onDeleteSubject: (subjectId: string) => void;
  schoolProfile: SchoolMasterProfile;
  onUpdateSchoolProfile: (profile: SchoolMasterProfile) => void;
  onRestoreMasterData: (data: any) => void;
  classMetadata: Record<string, Partial<ClassMaster>>;
  onUpdateClassMeta: (className: string, meta: Partial<ClassMaster>) => void;
  onSwitchToUserManagement?: () => void;
  onSyncStudentsFromAdmin?: (targetClasses?: string[]) => Promise<void>;
  onSaveStudentsToMaster?: (studentsList: Student[]) => Promise<void>;
  isSyncingStudents?: boolean;
  syncStudentsMsg?: string | null;
}

export default function ManajemenDataSekolah({
  students,
  classList,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onBatchDeleteStudents,
  onBatchTransferClass,
  onImportStudents,
  onAddClass,
  onRenameClass,
  onDeleteClass,
  subjects,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  schoolProfile,
  onUpdateSchoolProfile,
  onRestoreMasterData,
  classMetadata,
  onUpdateClassMeta,
  onSwitchToUserManagement,
  onSyncStudentsFromAdmin,
  onSaveStudentsToMaster,
  isSyncingStudents,
  syncStudentsMsg
}: Props) {
  const [activeTab, setActiveTab] = useState<'siswa' | 'kelas' | 'pelajaran' | 'semua'>('siswa');
  const [users, setUsers] = useState<AppUser[]>([]);

  // Fetch real-time users from Firestore for student account linking & teacher assignments
  useEffect(() => {
    if (isFirestoreQuotaExceeded()) return;
    try {
      const q = query(collection(db, 'users'));
      const unsub = onSnapshot(q, snapshot => {
        const list: AppUser[] = [];
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          list.push({
            uid: docSnap.id,
            username: d.username || docSnap.id,
            email: d.email || '',
            name: d.name || 'Pengguna',
            photoURL: d.photoURL || '',
            role: d.role || 'guru',
            status: d.status || 'approved',
            nip: d.nip || '',
            nisn: d.nisn || '',
            phone: d.phone || '',
            institution: d.institution || '',
            kelas: d.kelas || '',
            subject: d.subject || '',
            teachingClasses: Array.isArray(d.teachingClasses) ? d.teachingClasses : [],
            homeroomClass: d.homeroomClass || '',
            gender: d.gender || '',
            attendanceNumber: d.attendanceNumber || ''
          });
        });
        setUsers(list);
      }, err => {
        console.warn('Users listener fallback in ManajemenDataSekolah:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Failed to listen to users:', e);
    }
  }, []);

  const teachers = users.filter(u => u.role === 'guru');
  const studentUsers = users.filter(u => u.role === 'siswa');

  const maleCount = students.filter(s => s.gender !== 'P').length;
  const femaleCount = students.filter(s => s.gender === 'P').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title & Stats Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/60 text-indigo-700 text-xs font-black mb-1">
              <Database size={13} />
              <span>Pusat Manajemen Data Sekolah • Administrator</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Manajemen Data Master Sekolah
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Pusat kendali master data peserta didik (siswa), rombongan belajar (kelas), kurikulum mata pelajaran, dan profil lembaga {schoolProfile.schoolName}.
            </p>
          </div>

          {onSwitchToUserManagement && (
            <button
              onClick={onSwitchToUserManagement}
              className="self-start lg:self-center px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Users size={15} className="text-indigo-600" />
              <span>Buka Manajemen Akun & Pengguna</span>
              <ArrowUpRight size={14} className="text-slate-400" />
            </button>
          )}
        </div>

        {/* 4 Summary Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div 
            onClick={() => setActiveTab('siswa')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'siswa' 
                ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-500/20' 
                : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Data Siswa</span>
              <div className="w-7 h-7 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center">
                <GraduationCap size={15} />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800">{students.length} Siswa</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
              L: {maleCount} • P: {femaleCount}
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('kelas')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'kelas' 
                ? 'bg-sky-50/50 border-sky-200 ring-2 ring-sky-500/20' 
                : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Data Kelas</span>
              <div className="w-7 h-7 rounded-xl bg-sky-100/70 text-sky-700 flex items-center justify-center">
                <Layers size={15} />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800">{classList.length} Rombel</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
              Rata-rata ~{classList.length > 0 ? Math.round(students.length / classList.length) : 0} siswa/kelas
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('pelajaran')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'pelajaran' 
                ? 'bg-purple-50/50 border-purple-200 ring-2 ring-purple-500/20' 
                : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Data Pelajaran</span>
              <div className="w-7 h-7 rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center">
                <BookOpen size={15} />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800">{subjects.length} Mapel</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
              Kurikulum Merdeka (E & F)
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('semua')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'semua' 
                ? 'bg-emerald-50/50 border-emerald-200 ring-2 ring-emerald-500/20' 
                : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Master Lembaga</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                <School size={15} />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 truncate">{schoolProfile.academicYear}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
              Sem. {schoolProfile.semester} • {teachers.length} Guru
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Pill Navigation */}
      <div className="bg-slate-200/60 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('siswa')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'siswa'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <GraduationCap size={15} />
          <span>Data Siswa (Peserta Didik)</span>
          <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-black">
            {students.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('kelas')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'kelas'
              ? 'bg-white text-sky-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers size={15} />
          <span>Data Kelas (Rombel)</span>
          <span className="px-1.5 py-0.2 bg-sky-100 text-sky-700 rounded-md text-[10px] font-black">
            {classList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pelajaran')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'pelajaran'
              ? 'bg-white text-purple-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen size={15} />
          <span>Data Pelajaran (Kurikulum)</span>
          <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded-md text-[10px] font-black">
            {subjects.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('semua')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'semua'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <School size={15} />
          <span>Data Master & Semuanya</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'siswa' && (
        <TabSiswa
          students={students}
          classList={classList}
          userAccounts={studentUsers}
          onAddStudent={onAddStudent}
          onEditStudent={onEditStudent}
          onDeleteStudent={onDeleteStudent}
          onBatchDeleteStudents={onBatchDeleteStudents}
          onBatchTransferClass={onBatchTransferClass}
          onImportStudents={onImportStudents}
          onSyncStudentsFromAdmin={onSyncStudentsFromAdmin}
          onSaveStudentsToMaster={onSaveStudentsToMaster}
          isSyncingStudents={isSyncingStudents}
          syncStudentsMsg={syncStudentsMsg}
        />
      )}

      {activeTab === 'kelas' && (
        <TabKelas
          classList={classList}
          students={students}
          teachers={teachers}
          onAddClass={onAddClass}
          onRenameClass={onRenameClass}
          onDeleteClass={onDeleteClass}
          classMetadata={classMetadata}
          onUpdateClassMeta={onUpdateClassMeta}
        />
      )}

      {activeTab === 'pelajaran' && (
        <TabPelajaran
          subjects={subjects}
          teachers={teachers}
          onAddSubject={onAddSubject}
          onEditSubject={onEditSubject}
          onDeleteSubject={onDeleteSubject}
        />
      )}

      {activeTab === 'semua' && (
        <TabSemuaData
          teachers={teachers}
          schoolProfile={schoolProfile}
          onUpdateSchoolProfile={onUpdateSchoolProfile}
          students={students}
          classList={classList}
          subjects={subjects}
          onRestoreMasterData={onRestoreMasterData}
        />
      )}
    </div>
  );
}
