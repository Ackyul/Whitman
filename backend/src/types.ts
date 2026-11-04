export type UserRole = 'DOCENTE' | 'ALUMNO' | 'PADRE' | 'ADMIN';
export type EducationLevel = 'COLEGIO' | 'ACADEMIA' | 'PRIMARIA' | 'SECUNDARIA';

export type HierarchyLevel = 'DIRECTOR' | 'COORDINADOR' | 'JEFE_NORMAS' | 'PROFESOR';

export interface User {
  id: string;
  dni: string;
  name: string;
  email: string;
  role: UserRole;
  hierarchy?: HierarchyLevel; // Nivel jerárquico docente
  hierarchyTitle?: string;    // Ej: "Director General", "Jefe de Normas", "Coordinador"
  level: EducationLevel;
  gradeOrClass: string;
  studentCode?: string;       // Ej: "WHT-2026-001"
  parentDni?: string;         // DNI del papá / apoderado
  parentName?: string;        // Nombre del papá
  avatar?: string;
  phone?: string;
  parentPhone?: string;
  active: boolean;
  createdAt: string;
}

export type AttendanceStatus = 'PRESENTE' | 'TARDANZA' | 'FALTA' | 'JUSTIFICADO';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userDni: string;
  level: EducationLevel;
  gradeOrClass: string;
  date: string;
  time: string;
  status: AttendanceStatus;
  method: 'QR' | 'DNI_MANUAL' | 'BIOMETRICO' | 'DOCENTE';
  notes?: string;
}

export type EvaluationType = 'SIMULACRO' | 'PRACTICA' | 'EXAMEN_PARCIAL' | 'EXAMEN_FINAL' | 'TAREA';

export interface GradeRecord {
  id: string;
  userId: string;
  userName: string;
  userDni: string;
  course: string;
  level: EducationLevel;
  gradeOrClass: string;
  evaluationType: EvaluationType;
  title: string;
  score: number;
  maxScore: number;
  period: string;
  teacherName: string;
  date: string;
  feedback?: string;
}

export interface WhitmanStats {
  totalStudents: number;
  totalTeachers: number;
  todayAttendance: {
    present: number;
    late: number;
    absent: number;
    justified: number;
    totalMarked: number;
    attendanceRate: number;
  };
  academicAverage: number;
}

export interface AcademicClass {
  id: string;
  code: string;
  name: string;
  level: EducationLevel;
  grade: string;
  section: string;
  shift: 'MAÑANA' | 'TARDE';
  classroomNumber?: string;
  capacity?: number;
  tutorTeacherId?: string;
  tutorTeacherName?: string;
  active: boolean;
}

export interface StudentAssignment {
  id: string;
  studentId: string;
  studentDni: string;
  studentName: string;
  classId: string;
  classCode: string;
  className: string;
  level: EducationLevel;
  grade: string;
  section: string;
  academicYear: string;
  status: 'ACTIVO' | 'TRASLADADO' | 'RETIRADO' | 'EGRESADO';
  assignedAt: string;
  notes?: string;
}
