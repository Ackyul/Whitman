export type UserRole = 'DOCENTE' | 'ALUMNO' | 'PADRE' | 'ADMIN';
export type EducationLevel = 'COLEGIO' | 'ACADEMIA' | 'PRIMARIA' | 'SECUNDARIA';

export type HierarchyLevel = 'DIRECTOR' | 'COORDINADOR' | 'JEFE_NORMAS' | 'PROFESOR';

export interface User {
  id: string;
  dni: string;
  name: string;
  email: string;
  role: UserRole;
  hierarchy?: HierarchyLevel;
  hierarchyTitle?: string; // Ej: "Director General", "Coordinador Académico", "Jefe de Normas", "Profesor"
  level: EducationLevel;
  gradeOrClass: string;
  studentCode?: string;
  // Datos Familiares (Madre, Padre y/o Apoderado con acceso individual al portal)
  motherDni?: string;         // DNI de la Madre
  motherName?: string;        // Nombre de la Madre
  motherPhone?: string;       // Celular de la Madre
  fatherDni?: string;         // DNI del Padre
  fatherName?: string;        // Nombre del Padre
  fatherPhone?: string;       // Celular del Padre
  parentDni?: string;         // DNI del Apoderado principal o tutor
  parentName?: string;        // Nombre del Apoderado
  parentRelationship?: string;// "Madre", "Padre", "Tutor Legal", "Abuelo", etc.
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
