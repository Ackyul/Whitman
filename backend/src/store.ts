import fs from 'fs';
import path from 'path';
import { User, AttendanceRecord, GradeRecord, WhitmanStats, HierarchyLevel, AcademicClass, StudentAssignment } from './types.js';
import { sql, isNeonConfigured } from './neon.js';

interface DatabaseSchema {
  users: User[];
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
  academicClasses: AcademicClass[];
  studentAssignments: StudentAssignment[];
}

const DATA_FILE = path.resolve(process.cwd(), 'data.json');

const todayDate = new Date().toISOString().split('T')[0];

const INITIAL_USERS: User[] = [
  {
    id: 'u-admin-1',
    dni: '10000001',
    name: 'Prof. Carlos Whitman León',
    email: 'direccion@whitman.edu.pe',
    role: 'DOCENTE',
    hierarchy: 'DIRECTOR',
    hierarchyTitle: 'Director General',
    level: 'COLEGIO',
    gradeOrClass: 'Dirección General Whitman',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    phone: '+51 987654321',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-doc-1',
    dni: '20000001',
    name: 'Lic. Ricardo Mendoza',
    email: 'rmendoza@whitman.edu.pe',
    role: 'DOCENTE',
    hierarchy: 'COORDINADOR',
    hierarchyTitle: 'Coordinador Académico',
    level: 'ACADEMIA',
    gradeOrClass: 'Coordinación Preuniversitaria & Ciencias',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    phone: '+51 981234567',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-doc-normas',
    dni: '20000004',
    name: 'Prof. Walter Castillo Rivas',
    email: 'normas@whitman.edu.pe',
    role: 'DOCENTE',
    hierarchy: 'JEFE_NORMAS',
    hierarchyTitle: 'Jefe de Normas y Disciplina',
    level: 'COLEGIO',
    gradeOrClass: 'Jefatura de Normas, Portería y Disciplina',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    phone: '+51 984567890',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-doc-2',
    dni: '20000002',
    name: 'Mag. Elena Torres',
    email: 'etorres@whitman.edu.pe',
    role: 'DOCENTE',
    hierarchy: 'PROFESOR',
    hierarchyTitle: 'Profesora de Ciencias (Física / Química)',
    level: 'COLEGIO',
    gradeOrClass: 'Ciencias y Tecnología',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    phone: '+51 982345678',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-alu-1',
    dni: '72345671',
    studentCode: 'WHT-2026-001',
    name: 'Sebastián Alarcón Quispe',
    email: 'salarcon@whitman.edu.pe',
    role: 'ALUMNO',
    level: 'ACADEMIA',
    gradeOrClass: 'Ciclo Semianual UNI',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    phone: '+51 991112233',
    parentDni: '40112233',
    parentName: 'Don Marcos Alarcón (Padre)',
    parentPhone: '+51 991112200',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-alu-2',
    dni: '72345672',
    studentCode: 'WHT-2026-002',
    name: 'Valeria Morales Silva',
    email: 'vmorales@whitman.edu.pe',
    role: 'ALUMNO',
    level: 'ACADEMIA',
    gradeOrClass: 'Ciclo San Marcos - Medicina',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    phone: '+51 992223344',
    parentDni: '40223344',
    parentName: 'Sra. Patricia Silva (Madre)',
    parentPhone: '+51 992223300',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-alu-3',
    dni: '72345673',
    studentCode: 'WHT-2026-003',
    name: 'Mateo Cárdenas Rojas',
    email: 'mcardenas@whitman.edu.pe',
    role: 'ALUMNO',
    level: 'ACADEMIA',
    gradeOrClass: 'Ciclo Repaso Intensivo',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    phone: '+51 993334455',
    parentDni: '40334455',
    parentName: 'Don Roberto Cárdenas (Padre)',
    parentPhone: '+51 993334400',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-alu-5',
    dni: '75432101',
    studentCode: 'WHT-2026-005',
    name: 'Gabriel Farfán Rivas',
    email: 'gfarfan@whitman.edu.pe',
    role: 'ALUMNO',
    level: 'SECUNDARIA',
    gradeOrClass: '5to Secundaria - Alfa',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    phone: '+51 995556677',
    parentDni: '40556677',
    parentName: 'Don Javier Farfán (Padre)',
    parentPhone: '+51 995556600',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-alu-6',
    dni: '75432102',
    studentCode: 'WHT-2026-006',
    name: 'Camila Villavicencio Paz',
    email: 'cvillavicencio@whitman.edu.pe',
    role: 'ALUMNO',
    level: 'SECUNDARIA',
    gradeOrClass: '3ro Secundaria - Beta',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    phone: '+51 996667788',
    parentDni: '40667788',
    parentName: 'Sra. Carmen Paz (Madre)',
    parentPhone: '+51 996667700',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-alu-7',
    dni: '75432103',
    studentCode: 'WHT-2026-007',
    name: 'Rodrigo Huamán Castro',
    email: 'rhuaman@whitman.edu.pe',
    role: 'ALUMNO',
    level: 'SECUNDARIA',
    gradeOrClass: '1ro Secundaria - Alfa',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    phone: '+51 997778899',
    parentDni: '40778899',
    parentName: 'Don Alberto Huamán (Padre)',
    parentPhone: '+51 997778800',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-alu-8',
    dni: '78912301',
    studentCode: 'WHT-2026-008',
    name: 'Joaquín Alarcón Quispe',
    email: 'jalarcon@whitman.edu.pe',
    role: 'ALUMNO',
    level: 'PRIMARIA',
    gradeOrClass: '6to Primaria - Leones',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
    phone: '+51 998889901',
    parentDni: '40112233',
    parentName: 'Don Marcos Alarcón (Padre)',
    parentPhone: '+51 991112200',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-alu-9',
    dni: '78912302',
    studentCode: 'WHT-2026-009',
    name: 'Luciana Vega Romero',
    email: 'lvega@whitman.edu.pe',
    role: 'ALUMNO',
    level: 'PRIMARIA',
    gradeOrClass: '5to Primaria - Alfa',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    phone: '+51 998889902',
    parentDni: '40889900',
    parentName: 'Sra. Rosa Romero (Madre)',
    parentPhone: '+51 998889900',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'u-alu-10',
    dni: '78912303',
    studentCode: 'WHT-2026-010',
    name: 'Thiago Mendoza Paredes',
    email: 'tmendoza@whitman.edu.pe',
    role: 'ALUMNO',
    level: 'PRIMARIA',
    gradeOrClass: '3ro Primaria - Beta',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    phone: '+51 998889903',
    parentDni: '40990011',
    parentName: 'Don Luis Mendoza (Padre)',
    parentPhone: '+51 999900110',
    active: true,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    userId: 'u-alu-1',
    userName: 'Sebastián Alarcón Quispe',
    userDni: '72345671',
    level: 'ACADEMIA',
    gradeOrClass: 'Ciclo Semianual UNI',
    date: todayDate,
    time: '07:42:15',
    status: 'PRESENTE',
    method: 'QR',
    notes: 'Ingreso puntual puerta principal'
  },
  {
    id: 'att-2',
    userId: 'u-alu-2',
    userName: 'Valeria Morales Silva',
    userDni: '72345672',
    level: 'ACADEMIA',
    gradeOrClass: 'Ciclo San Marcos - Medicina',
    date: todayDate,
    time: '07:48:30',
    status: 'PRESENTE',
    method: 'QR',
    notes: 'Ingreso por torniquete'
  },
  {
    id: 'att-3',
    userId: 'u-alu-3',
    userName: 'Mateo Cárdenas Rojas',
    userDni: '72345673',
    level: 'ACADEMIA',
    gradeOrClass: 'Ciclo Repaso Intensivo',
    date: todayDate,
    time: '08:14:02',
    status: 'TARDANZA',
    method: 'DNI_MANUAL',
    notes: 'Retraso de 14 min por congestión vehicular'
  },
  {
    id: 'att-5',
    userId: 'u-alu-5',
    userName: 'Gabriel Farfán Rivas',
    level: 'SECUNDARIA',
    userDni: '75432101',
    gradeOrClass: '5to Secundaria - Alfa',
    date: todayDate,
    time: '07:35:10',
    status: 'PRESENTE',
    method: 'BIOMETRICO',
    notes: 'Ingreso ordenado uniforme completo'
  },
  {
    id: 'att-6',
    userId: 'u-alu-6',
    userName: 'Camila Villavicencio Paz',
    userDni: '75432102',
    level: 'SECUNDARIA',
    gradeOrClass: '3ro Secundaria - Beta',
    date: todayDate,
    time: '07:55:00',
    status: 'PRESENTE',
    method: 'QR',
    notes: 'Ingreso normal'
  },
  {
    id: 'att-8',
    userId: 'u-alu-8',
    userName: 'Joaquín Alarcón Quispe',
    userDni: '78912301',
    level: 'PRIMARIA',
    gradeOrClass: '6to Primaria - Leones',
    date: todayDate,
    time: '07:31:40',
    status: 'PRESENTE',
    method: 'QR',
    notes: 'Ingreso puntual puerta primaria'
  },
  {
    id: 'att-9',
    userId: 'u-alu-9',
    userName: 'Luciana Vega Romero',
    userDni: '78912302',
    level: 'PRIMARIA',
    gradeOrClass: '5to Primaria - Alfa',
    date: todayDate,
    time: '07:44:18',
    status: 'PRESENTE',
    method: 'QR',
    notes: 'Ingreso puntual con carnet'
  }
];

const INITIAL_GRADES: GradeRecord[] = [
  {
    id: 'grd-1',
    userId: 'u-alu-1',
    userName: 'Sebastián Alarcón Quispe',
    userDni: '72345671',
    course: 'Física Preuniversitaria',
    level: 'ACADEMIA',
    gradeOrClass: 'Ciclo Semianual UNI',
    evaluationType: 'SIMULACRO',
    title: 'Simulacro Tipo Examen Admisión UNI #1',
    score: 18.5,
    maxScore: 20,
    period: 'Ciclo 2026',
    teacherName: 'Lic. Ricardo Mendoza',
    date: todayDate,
    feedback: 'Excelente desempeño en Estática y Dinámica. Nivel muy alto.'
  },
  {
    id: 'grd-2',
    userId: 'u-alu-2',
    userName: 'Valeria Morales Silva',
    userDni: '72345672',
    course: 'Biología y Anatomía',
    level: 'ACADEMIA',
    gradeOrClass: 'Ciclo San Marcos - Medicina',
    evaluationType: 'SIMULACRO',
    title: 'Simulacro General UNMSM - Bloque A (Salud)',
    score: 19.2,
    maxScore: 20,
    period: 'Ciclo 2026',
    teacherName: 'Mag. Elena Torres',
    date: todayDate,
    feedback: 'Puntaje de ingreso directo a Medicina. ¡Mantener el rugido!'
  },
  {
    id: 'grd-3',
    userId: 'u-alu-5',
    userName: 'Gabriel Farfán Rivas',
    userDni: '75432101',
    course: 'Matemática Avanzada',
    level: 'COLEGIO',
    gradeOrClass: '5to Secundaria - Alfa',
    evaluationType: 'EXAMEN_PARCIAL',
    title: 'Examen Parcial - I Bimestre',
    score: 16.5,
    maxScore: 20,
    period: 'Bimestre I',
    teacherName: 'Lic. Ricardo Mendoza',
    date: todayDate,
    feedback: 'Buen avance en cálculo de áreas y volúmenes.'
  }
];

const INITIAL_CLASSES: AcademicClass[] = [
  // PRIMARIA
  { id: 'cls-prim-3', code: 'PRIM-3-BETA', name: '3ro Primaria - Beta', level: 'PRIMARIA', grade: '3ro Primaria', section: 'Beta', shift: 'MAÑANA', classroomNumber: 'Aula 101', capacity: 30, tutorTeacherName: 'Prof. Walter Castillo Rivas', active: true },
  { id: 'cls-prim-5', code: 'PRIM-5-ALFA', name: '5to Primaria - Alfa', level: 'PRIMARIA', grade: '5to Primaria', section: 'Alfa', shift: 'MAÑANA', classroomNumber: 'Aula 102', capacity: 32, tutorTeacherName: 'Mag. Elena Torres', active: true },
  { id: 'cls-prim-6', code: 'PRIM-6-LEONES', name: '6to Primaria - Leones', level: 'PRIMARIA', grade: '6to Primaria', section: 'Leones', shift: 'MAÑANA', classroomNumber: 'Aula 103', capacity: 35, tutorTeacherName: 'Prof. Carlos Whitman', active: true },
  
  // SECUNDARIA
  { id: 'cls-sec-1', code: 'SEC-1-ALFA', name: '1ro Secundaria - Alfa', level: 'SECUNDARIA', grade: '1ro Secundaria', section: 'Alfa', shift: 'MAÑANA', classroomNumber: 'Aula 201', capacity: 35, tutorTeacherName: 'Lic. Ricardo Mendoza', active: true },
  { id: 'cls-sec-3', code: 'SEC-3-BETA', name: '3ro Secundaria - Beta', level: 'SECUNDARIA', grade: '3ro Secundaria', section: 'Beta', shift: 'MAÑANA', classroomNumber: 'Aula 202', capacity: 35, tutorTeacherName: 'Mag. Elena Torres', active: true },
  { id: 'cls-sec-5', code: 'SEC-5-ALFA', name: '5to Secundaria - Alfa', level: 'SECUNDARIA', grade: '5to Secundaria', section: 'Alfa', shift: 'MAÑANA', classroomNumber: 'Aula 203', capacity: 35, tutorTeacherName: 'Prof. Carlos Whitman', active: true },

  // ACADEMIA PREUNIVERSITARIA
  { id: 'cls-acad-uni', code: 'ACAD-UNI', name: 'Ciclo Semianual UNI', level: 'ACADEMIA', grade: 'Preuniversitario UNI', section: 'UNI', shift: 'MAÑANA', classroomNumber: 'Aula Magna 1', capacity: 60, tutorTeacherName: 'Lic. Ricardo Mendoza', active: true },
  { id: 'cls-acad-sm', code: 'ACAD-SM-MED', name: 'Ciclo San Marcos - Medicina', level: 'ACADEMIA', grade: 'Preuniversitario San Marcos', section: 'Medicina', shift: 'MAÑANA', classroomNumber: 'Aula Magna 2', capacity: 60, tutorTeacherName: 'Mag. Elena Torres', active: true },
  { id: 'cls-acad-rep', code: 'ACAD-REP-INT', name: 'Ciclo Repaso Intensivo', level: 'ACADEMIA', grade: 'Repaso Intensivo', section: 'Intensivo', shift: 'TARDE', classroomNumber: 'Aula 301', capacity: 50, tutorTeacherName: 'Lic. Ricardo Mendoza', active: true }
];

const INITIAL_ASSIGNMENTS: StudentAssignment[] = [
  { id: 'asgn-1', studentId: 'u-alu-1', studentDni: '72345671', studentName: 'Sebastián Alarcón Quispe', classId: 'cls-acad-uni', classCode: 'ACAD-UNI', className: 'Ciclo Semianual UNI', level: 'ACADEMIA', grade: 'Preuniversitario UNI', section: 'UNI', academicYear: '2026', status: 'ACTIVO', assignedAt: new Date().toISOString() },
  { id: 'asgn-2', studentId: 'u-alu-2', studentDni: '72345672', studentName: 'Valeria Morales Silva', classId: 'cls-acad-sm', classCode: 'ACAD-SM-MED', className: 'Ciclo San Marcos - Medicina', level: 'ACADEMIA', grade: 'Preuniversitario San Marcos', section: 'Medicina', academicYear: '2026', status: 'ACTIVO', assignedAt: new Date().toISOString() },
  { id: 'asgn-3', studentId: 'u-alu-3', studentDni: '72345673', studentName: 'Mateo Cárdenas Rojas', classId: 'cls-acad-rep', classCode: 'ACAD-REP-INT', className: 'Ciclo Repaso Intensivo', level: 'ACADEMIA', grade: 'Repaso Intensivo', section: 'Intensivo', academicYear: '2026', status: 'ACTIVO', assignedAt: new Date().toISOString() },
  { id: 'asgn-5', studentId: 'u-alu-5', studentDni: '75432101', studentName: 'Gabriel Farfán Rivas', classId: 'cls-sec-5', classCode: 'SEC-5-ALFA', className: '5to Secundaria - Alfa', level: 'SECUNDARIA', grade: '5to Secundaria', section: 'Alfa', academicYear: '2026', status: 'ACTIVO', assignedAt: new Date().toISOString() },
  { id: 'asgn-6', studentId: 'u-alu-6', studentDni: '75432102', studentName: 'Camila Villavicencio Paz', classId: 'cls-sec-3', classCode: 'SEC-3-BETA', className: '3ro Secundaria - Beta', level: 'SECUNDARIA', grade: '3ro Secundaria', section: 'Beta', academicYear: '2026', status: 'ACTIVO', assignedAt: new Date().toISOString() },
  { id: 'asgn-7', studentId: 'u-alu-7', studentDni: '75432103', studentName: 'Rodrigo Huamán Castro', classId: 'cls-sec-1', classCode: 'SEC-1-ALFA', className: '1ro Secundaria - Alfa', level: 'SECUNDARIA', grade: '1ro Secundaria', section: 'Alfa', academicYear: '2026', status: 'ACTIVO', assignedAt: new Date().toISOString() },
  { id: 'asgn-8', studentId: 'u-alu-8', studentDni: '78912301', studentName: 'Joaquín Alarcón Quispe', classId: 'cls-prim-6', classCode: 'PRIM-6-LEONES', className: '6to Primaria - Leones', level: 'PRIMARIA', grade: '6to Primaria', section: 'Leones', academicYear: '2026', status: 'ACTIVO', assignedAt: new Date().toISOString() },
  { id: 'asgn-9', studentId: 'u-alu-9', studentDni: '78912302', studentName: 'Luciana Vega Romero', classId: 'cls-prim-5', classCode: 'PRIM-5-ALFA', className: '5to Primaria - Alfa', level: 'PRIMARIA', grade: '5to Primaria', section: 'Alfa', academicYear: '2026', status: 'ACTIVO', assignedAt: new Date().toISOString() },
  { id: 'asgn-10', studentId: 'u-alu-10', studentDni: '78912303', studentName: 'Thiago Mendoza Paredes', classId: 'cls-prim-3', classCode: 'PRIM-3-BETA', className: '3ro Primaria - Beta', level: 'PRIMARIA', grade: '3ro Primaria', section: 'Beta', academicYear: '2026', status: 'ACTIVO', assignedAt: new Date().toISOString() }
];

class Store {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
    this.syncFromNeon();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.academicClasses) parsed.academicClasses = INITIAL_CLASSES;
        if (!parsed.studentAssignments) parsed.studentAssignments = INITIAL_ASSIGNMENTS;
        return parsed;
      }
    } catch (err) {
      console.warn('Error al leer data.json, usando seeds:', err);
    }

    const initial: DatabaseSchema = {
      users: INITIAL_USERS,
      attendance: INITIAL_ATTENDANCE,
      grades: INITIAL_GRADES,
      academicClasses: INITIAL_CLASSES,
      studentAssignments: INITIAL_ASSIGNMENTS
    };
    this.persist(initial);
    return initial;
  }

  private persist(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error al persistir data.json:', err);
    }
  }

  async syncFromNeon() {
    if (!isNeonConfigured || !sql) return;

    try {
      const dbUsers = await (sql as any).query(`SELECT * FROM users ORDER BY created_at ASC;`);
      const dbAttendance = await (sql as any).query(`SELECT * FROM attendance ORDER BY date DESC, time DESC;`);
      const dbGrades = await (sql as any).query(`SELECT * FROM grades ORDER BY date DESC;`);

      if (dbUsers.length > 0) {
        this.data.users = dbUsers.map((u: any) => ({
          id: u.id,
          dni: u.dni,
          studentCode: u.student_code || undefined,
          name: u.name,
          email: u.email,
          role: u.role,
          hierarchy: u.hierarchy || undefined,
          hierarchyTitle: u.hierarchy_title || undefined,
          level: u.level,
          gradeOrClass: u.grade_or_class,
          parentDni: u.parent_dni || undefined,
          parentName: u.parent_name || undefined,
          parentRelationship: u.parent_relationship || undefined,
          motherDni: u.mother_dni || undefined,
          motherName: u.mother_name || undefined,
          motherPhone: u.mother_phone || undefined,
          fatherDni: u.father_dni || undefined,
          fatherName: u.father_name || undefined,
          fatherPhone: u.father_phone || undefined,
          avatar: u.avatar,
          phone: u.phone,
          parentPhone: u.parent_phone,
          active: u.active,
          createdAt: u.created_at,
        }));
      }

      if (dbAttendance.length > 0) {
        this.data.attendance = dbAttendance.map((a: any) => ({
          id: a.id,
          userId: a.user_id,
          userName: a.user_name,
          userDni: a.user_dni,
          level: a.level,
          gradeOrClass: a.grade_or_class,
          date: a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date),
          time: a.time,
          status: a.status,
          method: a.method,
          notes: a.notes,
        }));
      }

      if (dbGrades.length > 0) {
        this.data.grades = dbGrades.map((g: any) => ({
          id: g.id,
          userId: g.user_id,
          userName: g.user_name,
          userDni: g.user_dni,
          course: g.course,
          level: g.level,
          gradeOrClass: g.grade_or_class,
          evaluationType: g.evaluation_type,
          title: g.title,
          score: Number(g.score),
          maxScore: Number(g.max_score),
          period: g.period,
          teacherName: g.teacher_name,
          date: g.date instanceof Date ? g.date.toISOString().split('T')[0] : String(g.date),
          feedback: g.feedback,
        }));
      }

      try {
        const dbClasses = await (sql as any).query(`SELECT * FROM academic_classes ORDER BY level, grade;`);
        if (dbClasses && dbClasses.length > 0) {
          this.data.academicClasses = dbClasses.map((c: any) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            level: c.level,
            grade: c.grade,
            section: c.section,
            shift: c.shift || 'MAÑANA',
            classroomNumber: c.classroom_number || undefined,
            capacity: Number(c.capacity) || 35,
            tutorTeacherName: c.tutor_teacher_name || undefined,
            active: c.active !== false,
          }));
        }

        const dbAssignments = await (sql as any).query(`SELECT * FROM student_assignments ORDER BY assigned_at DESC;`);
        if (dbAssignments && dbAssignments.length > 0) {
          this.data.studentAssignments = dbAssignments.map((asgn: any) => ({
            id: asgn.id,
            studentId: asgn.student_id,
            studentDni: asgn.student_dni,
            studentName: asgn.student_name,
            classId: asgn.class_id,
            classCode: asgn.class_code,
            className: asgn.class_name,
            level: asgn.level,
            grade: asgn.grade,
            section: asgn.section,
            academicYear: asgn.academic_year,
            status: asgn.status,
            assignedAt: asgn.assigned_at,
            notes: asgn.notes,
          }));
        }
      } catch (errClasses) {
        console.warn('Tablas de asignaciones aún pendientes de sync inicial:', errClasses);
      }

      this.persist(this.data);
      console.log(`🦁 [Whitman DB] Sincronizados desde Neon: ${this.data.users.length} usuarios, ${this.data.attendance.length} asistencias, ${(this.data.studentAssignments || []).length} asignaciones.`);
    } catch (err) {
      console.warn('⚠️ No se pudo sincronizar desde Neon al inicio, usando datos locales:', err);
    }
  }

  // --- Users ---
  getUsers(role?: string, level?: string): User[] {
    return this.data.users.filter(u => {
      if (role && u.role !== role) return false;
      if (level && u.level !== level) return false;
      return true;
    });
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByDni(dni: string): User | undefined {
    return this.data.users.find(u => u.dni.trim() === dni.trim());
  }

  getUserByStudentCode(code: string): User | undefined {
    return this.data.users.find(u => u.studentCode?.toLowerCase().trim() === code.toLowerCase().trim());
  }

  getStudentsByFamilyDni(familyDni: string): { students: User[]; relationshipTitle: string; guardianName: string; guardianPhone?: string } | null {
    const clean = familyDni.trim();
    if (!clean) return null;

    const matchedStudents: User[] = [];
    let detectedTitle = 'Apoderado(a)';
    let detectedName = '';
    let detectedPhone = '';

    for (const u of this.data.users) {
      let isMatch = false;
      if (u.motherDni?.trim() === clean) {
        isMatch = true;
        detectedTitle = 'Madre';
        if (u.motherName) detectedName = u.motherName;
        if (u.motherPhone) detectedPhone = u.motherPhone;
      } else if (u.fatherDni?.trim() === clean) {
        isMatch = true;
        detectedTitle = 'Padre';
        if (u.fatherName) detectedName = u.fatherName;
        if (u.fatherPhone) detectedPhone = u.fatherPhone;
      } else if (u.parentDni?.trim() === clean) {
        isMatch = true;
        detectedTitle = u.parentRelationship || 'Apoderado(a)';
        if (u.parentName) detectedName = u.parentName;
        if (u.parentPhone) detectedPhone = u.parentPhone;
      }

      if (isMatch && !matchedStudents.some(s => s.id === u.id)) {
        matchedStudents.push(u);
      }
    }

    if (matchedStudents.length === 0) return null;

    return {
      students: matchedStudents,
      relationshipTitle: detectedTitle,
      guardianName: detectedName || `${detectedTitle} de ${matchedStudents[0].name}`,
      guardianPhone: detectedPhone,
    };
  }

  getStudentsByParentDni(parentDni: string): User[] {
    const family = this.getStudentsByFamilyDni(parentDni);
    return family ? family.students : [];
  }

  addUser(user: User): User {
    if (user.role === 'ALUMNO' && !user.studentCode) {
      const year = new Date().getFullYear();
      const rand = Math.floor(100 + Math.random() * 900);
      user.studentCode = `WHT-${year}-${rand}`;
    }

    this.data.users.push(user);
    this.persist(this.data);

    if (isNeonConfigured && sql) {
      // Asegurar columnas familiares en Neon de forma segura
      (sql as any).query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_dni VARCHAR(15);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_name VARCHAR(150);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_phone VARCHAR(30);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS father_dni VARCHAR(15);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS father_name VARCHAR(150);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS father_phone VARCHAR(30);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_relationship VARCHAR(50);
      `).then(() => {
        return (sql as any).query(
          `INSERT INTO users (
            id, dni, student_code, name, email, role, hierarchy, hierarchy_title, level, grade_or_class,
            parent_dni, parent_name, avatar, phone, parent_phone, active,
            mother_dni, mother_name, mother_phone, father_dni, father_name, father_phone, parent_relationship
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          ON CONFLICT (dni) DO UPDATE SET
            mother_dni = EXCLUDED.mother_dni,
            mother_name = EXCLUDED.mother_name,
            mother_phone = EXCLUDED.mother_phone,
            father_dni = EXCLUDED.father_dni,
            father_name = EXCLUDED.father_name,
            father_phone = EXCLUDED.father_phone,
            parent_dni = EXCLUDED.parent_dni,
            parent_name = EXCLUDED.parent_name,
            parent_relationship = EXCLUDED.parent_relationship;`,
          [
            user.id,
            user.dni,
            user.studentCode || null,
            user.name,
            user.email,
            user.role,
            user.hierarchy || null,
            user.hierarchyTitle || null,
            user.level,
            user.gradeOrClass,
            user.parentDni || null,
            user.parentName || null,
            user.avatar || null,
            user.phone || null,
            user.parentPhone || null,
            user.active,
            user.motherDni || null,
            user.motherName || null,
            user.motherPhone || null,
            user.fatherDni || null,
            user.fatherName || null,
            user.fatherPhone || null,
            user.parentRelationship || null
          ]
        );
      }).catch((e: any) => console.error('Error insertando usuario parametrizado en Neon:', e));
    }

    return user;
  }

  // --- Attendance ---
  getAttendance(date?: string, level?: string, userId?: string): AttendanceRecord[] {
    return this.data.attendance
      .filter(a => {
        if (date && a.date !== date) return false;
        if (level && a.level !== level) return false;
        if (userId && a.userId !== userId) return false;
        return true;
      })
      .sort((a, b) => b.time.localeCompare(a.time));
  }

  recordAttendance(record: AttendanceRecord): AttendanceRecord {
    const existingIndex = this.data.attendance.findIndex(
      a => a.userId === record.userId && a.date === record.date
    );

    if (existingIndex >= 0) {
      this.data.attendance[existingIndex] = record;
    } else {
      this.data.attendance.unshift(record);
    }
    this.persist(this.data);

    if (isNeonConfigured && sql) {
      (sql as any).query(
        `INSERT INTO attendance (id, user_id, user_name, user_dni, level, grade_or_class, date, time, status, method, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes;`,
        [
          record.id,
          record.userId,
          record.userName,
          record.userDni,
          record.level,
          record.gradeOrClass,
          record.date,
          record.time,
          record.status,
          record.method,
          record.notes || null
        ]
      ).catch((e: any) => console.error('Error guardando asistencia parametrizada en Neon:', e));
    }

    return record;
  }

  updateAttendanceStatus(id: string, status: AttendanceRecord['status'], notes?: string): AttendanceRecord | null {
    const item = this.data.attendance.find(a => a.id === id);
    if (!item) return null;
    item.status = status;
    if (notes !== undefined) item.notes = notes;
    this.persist(this.data);

    if (isNeonConfigured && sql) {
      (sql as any).query(
        `UPDATE attendance SET status = $1, notes = $2 WHERE id = $3;`,
        [status, notes || item.notes || null, id]
      ).catch((e: any) => console.error('Error actualizando asistencia en Neon:', e));
    }

    return item;
  }

  // --- Grades ---
  getGrades(userId?: string, level?: string): GradeRecord[] {
    return this.data.grades
      .filter(g => {
        if (userId && g.userId !== userId) return false;
        if (level && g.level !== level) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  addGrade(grade: GradeRecord): GradeRecord {
    this.data.grades.unshift(grade);
    this.persist(this.data);

    if (isNeonConfigured && sql) {
      (sql as any).query(
        `INSERT INTO grades (id, user_id, user_name, user_dni, course, level, grade_or_class, evaluation_type, title, score, max_score, period, teacher_name, feedback, date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO NOTHING;`,
        [
          grade.id,
          grade.userId,
          grade.userName,
          grade.userDni,
          grade.course,
          grade.level,
          grade.gradeOrClass,
          grade.evaluationType,
          grade.title,
          grade.score,
          grade.maxScore,
          grade.period,
          grade.teacherName,
          grade.feedback || null,
          grade.date
        ]
      ).catch((e: any) => console.error('Error guardando calificación en Neon:', e));
    }

    return grade;
  }

  updateGrade(id: string, partial: Partial<GradeRecord>): GradeRecord | null {
    const index = this.data.grades.findIndex(g => g.id === id);
    if (index === -1) return null;
    this.data.grades[index] = { ...this.data.grades[index], ...partial };
    this.persist(this.data);
    return this.data.grades[index];
  }

  // --- Stats ---
  getStats(): WhitmanStats {
    const students = this.data.users.filter(u => u.role === 'ALUMNO');
    const teachers = this.data.users.filter(u => u.role === 'DOCENTE');
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = this.data.attendance.filter(a => a.date === today);

    const present = todayRecords.filter(a => a.status === 'PRESENTE').length;
    const late = todayRecords.filter(a => a.status === 'TARDANZA').length;
    const absent = todayRecords.filter(a => a.status === 'FALTA').length;
    const justified = todayRecords.filter(a => a.status === 'JUSTIFICADO').length;
    const totalMarked = todayRecords.length;

    const attendanceRate = students.length > 0
      ? Math.round(((present + late) / students.length) * 100)
      : 0;

    const totalScore = this.data.grades.reduce((sum, g) => sum + g.score, 0);
    const academicAverage = this.data.grades.length > 0
      ? Math.round((totalScore / this.data.grades.length) * 10) / 10
      : 0;

    return {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      todayAttendance: {
        present,
        late,
        absent,
        justified,
        totalMarked,
        attendanceRate
      },
      academicAverage
    };
  }

  // --- Academic Classes & Assignments ---
  getAcademicClasses(level?: string): AcademicClass[] {
    return (this.data.academicClasses || []).filter(c => !level || c.level === level);
  }

  getStudentAssignments(studentId?: string, academicYear?: string): StudentAssignment[] {
    return (this.data.studentAssignments || []).filter(a => {
      if (studentId && a.studentId !== studentId && a.studentDni !== studentId) return false;
      if (academicYear && a.academicYear !== academicYear) return false;
      return true;
    });
  }

  async assignStudent(studentId: string, classCodeOrId: string, notes?: string): Promise<StudentAssignment> {
    const student = this.getUserById(studentId) || this.getUserByDni(studentId);
    if (!student) {
      throw new Error(`Estudiante con identificador "${studentId}" no encontrado.`);
    }

    const classes = this.getAcademicClasses();
    const targetClass = classes.find(c => c.id === classCodeOrId || c.code === classCodeOrId || c.name === classCodeOrId);
    if (!targetClass) {
      throw new Error(`Clase o aula "${classCodeOrId}" no encontrada en la base de datos.`);
    }

    // Actualizar alumno
    student.level = targetClass.level;
    student.gradeOrClass = targetClass.name;

    if (!this.data.studentAssignments) this.data.studentAssignments = [];

    const existingIndex = this.data.studentAssignments.findIndex(
      a => (a.studentId === student.id || a.studentDni === student.dni) && a.academicYear === '2026'
    );

    const assignment: StudentAssignment = {
      id: existingIndex >= 0 ? this.data.studentAssignments[existingIndex].id : `asgn-${Date.now()}`,
      studentId: student.id,
      studentDni: student.dni,
      studentName: student.name,
      classId: targetClass.id,
      classCode: targetClass.code,
      className: targetClass.name,
      level: targetClass.level,
      grade: targetClass.grade,
      section: targetClass.section,
      academicYear: '2026',
      status: 'ACTIVO',
      assignedAt: new Date().toISOString(),
      notes: notes || `Asignado a ${targetClass.name}`
    };

    if (existingIndex >= 0) {
      this.data.studentAssignments[existingIndex] = assignment;
    } else {
      this.data.studentAssignments.unshift(assignment);
    }

    this.persist(this.data);

    if (isNeonConfigured && sql) {
      try {
        await (sql as any).query(
          `UPDATE users SET level = $1, grade_or_class = $2 WHERE id = $3;`,
          [targetClass.level, targetClass.name, student.id]
        );

        await (sql as any).query(
          `INSERT INTO student_assignments (
            id, student_id, student_dni, student_name, class_id, class_code, class_name, level, grade, section, academic_year, status, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (student_id, academic_year) DO UPDATE SET
            class_id = EXCLUDED.class_id,
            class_code = EXCLUDED.class_code,
            class_name = EXCLUDED.class_name,
            level = EXCLUDED.level,
            grade = EXCLUDED.grade,
            section = EXCLUDED.section,
            notes = EXCLUDED.notes;`,
          [
            assignment.id,
            assignment.studentId,
            assignment.studentDni,
            assignment.studentName,
            assignment.classId,
            assignment.classCode,
            assignment.className,
            assignment.level,
            assignment.grade,
            assignment.section,
            assignment.academicYear,
            assignment.status,
            assignment.notes
          ]
        );
      } catch (err) {
        console.error('Error persistiendo asignación en Neon:', err);
      }
    }

    return assignment;
  }

  async enrollStudent(data: {
    dni: string;
    name: string;
    level: any;
    gradeOrClass: string;
    phone?: string;
    email?: string;
    // Familiares
    motherDni?: string;
    motherName?: string;
    motherPhone?: string;
    fatherDni?: string;
    fatherName?: string;
    fatherPhone?: string;
    parentDni?: string;
    parentName?: string;
    parentPhone?: string;
    parentRelationship?: string;
  }): Promise<{ user: User; assignment: StudentAssignment }> {
    const cleanDni = data.dni.trim();
    const existing = this.getUserByDni(cleanDni);
    if (existing) {
      throw new Error(`Ya existe un usuario registrado con el DNI ${cleanDni}.`);
    }

    const year = new Date().getFullYear();
    const studentCount = this.data.users.filter(u => u.role === 'ALUMNO').length + 1;
    const studentCode = `WHT-${year}-${String(studentCount).padStart(3, '0')}`;

    // Determinar apoderado principal de respaldo
    const effectiveParentDni = data.parentDni?.trim() || data.motherDni?.trim() || data.fatherDni?.trim() || undefined;
    const effectiveParentName = data.parentName?.trim() || data.motherName?.trim() || data.fatherName?.trim() || `Apoderado de ${data.name.trim()}`;
    const effectiveParentPhone = data.parentPhone?.trim() || data.motherPhone?.trim() || data.fatherPhone?.trim() || data.phone || undefined;

    const newUser: User = {
      id: `u-alu-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dni: cleanDni,
      studentCode,
      name: data.name.trim(),
      email: data.email || `${cleanDni}@whitman.edu.pe`,
      role: 'ALUMNO',
      level: data.level,
      gradeOrClass: data.gradeOrClass,
      phone: data.phone || undefined,
      parentDni: effectiveParentDni,
      parentName: effectiveParentName,
      parentPhone: effectiveParentPhone,
      parentRelationship: data.parentRelationship?.trim() || (data.motherDni ? 'Madre' : data.fatherDni ? 'Padre' : 'Apoderado'),
      motherDni: data.motherDni?.trim() || undefined,
      motherName: data.motherName?.trim() || undefined,
      motherPhone: data.motherPhone?.trim() || undefined,
      fatherDni: data.fatherDni?.trim() || undefined,
      fatherName: data.fatherName?.trim() || undefined,
      fatherPhone: data.fatherPhone?.trim() || undefined,
      active: true,
      createdAt: new Date().toISOString()
    };

    this.addUser(newUser);

    const assignment = await this.assignStudent(newUser.id, data.gradeOrClass, `Matrícula regular ${year}`);
    return { user: newUser, assignment };
  }

  async enrollStudentsBulk(studentsList: Array<{
    dni: string;
    name: string;
    level: any;
    gradeOrClass: string;
    phone?: string;
    motherDni?: string;
    motherName?: string;
    fatherDni?: string;
    fatherName?: string;
    parentDni?: string;
    parentName?: string;
    parentPhone?: string;
  }>): Promise<{ enrolledCount: number; errors: Array<{ dni: string; error: string }> }> {
    let enrolledCount = 0;
    const errors: Array<{ dni: string; error: string }> = [];

    for (const item of studentsList) {
      try {
        if (!item.dni || !item.name || !item.level || !item.gradeOrClass) {
          errors.push({ dni: item.dni || 'S/N', error: 'Faltan campos obligatorios' });
          continue;
        }

        const existing = this.getUserByDni(item.dni.trim());
        if (existing) {
          await this.assignStudent(existing.id, item.gradeOrClass, 'Actualización por carga masiva');
          enrolledCount++;
          continue;
        }

        await this.enrollStudent(item);
        enrolledCount++;
      } catch (err: any) {
        errors.push({ dni: item.dni, error: err.message || 'Error desconocido' });
      }
    }

    return { enrolledCount, errors };
  }

  async createStaff(data: {
    dni: string;
    name: string;
    email?: string;
    hierarchy: HierarchyLevel;
    hierarchyTitle: string;
    level: any;
    gradeOrClass: string;
    phone?: string;
  }): Promise<User> {
    const cleanDni = data.dni.trim();
    const existing = this.getUserByDni(cleanDni);
    if (existing) {
      throw new Error(`Ya existe personal registrado con el DNI ${cleanDni}.`);
    }

    const newStaff: User = {
      id: `u-doc-${Date.now()}`,
      dni: cleanDni,
      name: data.name.trim(),
      email: data.email || `${cleanDni}@docentes.whitman.edu.pe`,
      role: 'DOCENTE',
      hierarchy: data.hierarchy,
      hierarchyTitle: data.hierarchyTitle,
      level: data.level,
      gradeOrClass: data.gradeOrClass,
      phone: data.phone || undefined,
      active: true,
      createdAt: new Date().toISOString()
    };

    this.addUser(newStaff);
    return newStaff;
  }
}

export const db = new Store();
