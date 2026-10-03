import type { AppUser } from './lib/firebase';
export type { AppUser };

export interface Student {
  id: string;
  name: string;
  nis: string;
  className: string;
  photo?: string;
  photoRotation?: number;
  gender?: 'L' | 'P' | string;
  placeOfBirth?: string;
  dateOfBirth?: string;
  religion?: string;
  address?: string;
  parentName?: string;
  parentPhone?: string;
  studentPhone?: string;
  nisn?: string;
  attendanceNumber?: number | string;
  status?: 'Aktif' | 'Mutasi' | 'Lulus' | 'Nonaktif';
  email?: string;
  linkedUserId?: string;
}

export interface SubjectMaster {
  id: string;
  code: string;
  name: string;
  category: string;
  fase: string;
  hoursPerWeek: number;
  kkm: number;
  assignedTeachers?: string[];
  description?: string;
}

export interface ClassMaster {
  id: string;
  name: string;
  gradeLevel: string;
  fase: string;
  major?: string;
  homeroomTeacherId?: string;
  homeroomTeacherName?: string;
  room?: string;
  capacity?: number;
  academicYear?: string;
}

export interface SchoolMasterProfile {
  schoolName: string;
  npsn: string;
  nss?: string;
  educationLevel: string;
  accreditation: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  headmasterName: string;
  headmasterNip: string;
  headmasterRank: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  reportDate?: string;
}

export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Tidak Mengajar';

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  className: string;
}

export interface ScheduleItem {
  id: string;
  subject: string;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  startTime: string;
  endTime: string;
  className: string;
  room: string;
  agenda?: string; // Agenda / Materi Pokok Pembelajaran yang Diampu
}

export interface Assignment {
  id: string;
  title: string;
  className: string;
  category?: 'Tugas' | 'Ulangan' | 'Ulangan Harian' | 'Proyek' | 'Kuis' | 'Lainnya';
  dueDate: string;
  maxScore: number;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedDate: string;
  studentAnswer: string;
  score: number | null;
  status: 'Belum Dikumpulkan' | 'Perlu Dinilai' | 'Selesai';
  aiAnalysis?: {
    score?: number;
    totalScore?: number;
    grade?: string;
    status?: string;
    summaryPerType?: Array<{ type: string; score: number; maxScore: number; correctCount: string }>;
    items?: Array<{ no: number; type: string; studentAnswer: string; answerKey: string; status: string; score: number; maxScore: number; note: string }>;
    analysis?: string;
    feedback?: string;
    suggestions?: string;
    [key: string]: any;
  };
}

export interface StudentGrade {
  studentId: string;
  studentName: string;
  className: string;
  assignmentScores: Record<string, number>; // assignmentId -> score
  midtermScore?: number; // Nilai Penilaian Tengah Semester (PTS)
  examScore: number; // Nilai Ujian Akhir (PAS)
  characterScore?: number; // Nilai Sikap / Karakter
}

export interface HomeroomNote {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  category: 'Kedisiplinan' | 'Akademik' | 'Prestasi' | 'Konseling' | 'Kesehatan';
  note: string;
  actionTaken: string;
}

export interface HomeVisitReport {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  parentName: string;
  address: string;
  reason: string;
  result: string;
  photos: string[]; // base64 images
  teacherName?: string;
  nip?: string;
  category?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  className: string;
  topic: string;
  notes: string;
  summary: string;
  reflection: string;
  nextSteps: string;
  isAISuggested: boolean;

  // New fields for daily teacher journal
  teacherName?: string;
  nip?: string;
  subject?: string;
  month?: string;
  weekNum?: string;
  photos?: string[];          // base64 strings
  photoTimestamps?: string[];  // timestamps like "06:53"
  documentTitle?: string;     // title at the top of documentation column
  institution?: string;       // footer text like "SMA Negeri 2 Tasikmalaya"
  descriptionText?: string;   // direct description list like in the image
}

export type MaterialType = 'presentation' | 'video' | 'document' | 'link';

export interface LearningMaterialNote {
  id: string;
  timestamp?: string; // e.g. "03:15" or "Slide 4"
  content: string;
  createdAt: string;
}

export interface LearningMaterial {
  id: string;
  title: string;
  description?: string;
  subject: string;
  className: string; // Multi-class string, e.g. "XII-C2, XII-C3" or "Semua Kelas"
  targetClasses?: string[]; // Array of target classes e.g. ["XII-C2", "XII-C3"]
  type: MaterialType;
  driveUrl: string; // Link asli Google Drive / YouTube / Web
  embedUrl: string; // Link embed iframe hasil konversi otomatis
  thumbnailUrl?: string;
  topic?: string;
  bab?: string; // Contoh: "BAB 1: Konsep Dasar Ilmu Ekonomi"
  subBab?: string; // Contoh: "1.1 Kelangkaan & Kebutuhan Manusia"
  createdAt: string;
  fileSize?: string;
  notes?: LearningMaterialNote[];
  tags?: string[];
}

export interface EvaluationQuestion {
  id: string;
  type: 'pg' | 'pg_kompleks' | 'benar_salah' | 'isian' | 'essay' | 'menjodohkan';
  question: string;
  options?: string[];
  matchingPairs?: { left: string; right: string }[];
  shuffledRightsForSession?: string[];
  correctAnswer: any; // string, string[], or Record<string, string> for menjodohkan
  explanation?: string;
  points: number;
}

export interface QuestionBankItem extends EvaluationQuestion {
  subject: string;
  className: string;
  bab: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationExam {
  id: string;
  title: string;
  description: string;
  subject: string;
  className: string;
  targetClasses?: string[];
  durationMinutes: number;
  token?: string;
  bab?: string;
  questions: EvaluationQuestion[];
  createdAt: string;
  status: 'aktif' | 'draft' | 'selesai';
  isSecureMode?: boolean;
  isShuffleQuestions?: boolean;
  isShuffleOptions?: boolean;
  examPackage?: string;
}

export interface ViolationLog {
  timestamp: string;
  type: 'exit_fullscreen' | 'tab_switch' | 'split_screen' | 'copy_attempt' | 'window_resize';
  description: string;
}

export interface SavedModule {
  id: string;
  title: string;
  subject: string;
  className: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationSubmission {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  className: string;
  answers: Record<string, any>;
  flaggedQuestionIds?: string[];
  score: number;
  totalMaxScore: number;
  percentageScore: number;
  startedAt: string;
  submittedAt: string;
  durationSecondsUsed: number;
  violations: ViolationLog[];
  status: 'selesai' | 'diskualifikasi';
}
