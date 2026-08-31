export interface Student {
  id: string;
  name: string;
  nis: string;
  className: string;
}

export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';

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
  category?: 'Tugas' | 'Ulangan Harian' | 'Proyek' | 'Kuis' | 'Lainnya';
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
    score: number;
    analysis: string;
    feedback: string;
    suggestions: string;
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


