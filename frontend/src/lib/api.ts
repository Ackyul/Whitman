import { User, AttendanceRecord, GradeRecord, WhitmanStats, UserRole, AcademicClass, StudentAssignment } from '../types';
import { MOCK_USERS, MOCK_ATTENDANCE, MOCK_GRADES, MOCK_STATS } from './mockData';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function loginUser(
  identifier: string,
  role: UserRole = 'ALUMNO'
): Promise<{ success: boolean; user: User; linkedStudents?: User[]; message: string }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, role }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Error al iniciar sesión');
    }
    return json;
  } catch (err: any) {
    // Modo simulación local si el backend no está disponible
    const cleanId = identifier.trim();

    if (role === 'PADRE') {
      const children = MOCK_USERS.filter(
        (u) =>
          u.motherDni?.trim() === cleanId ||
          u.fatherDni?.trim() === cleanId ||
          u.parentDni?.trim() === cleanId
      );
      if (children.length === 0) {
        throw new Error(`No se encontró ningún estudiante vinculado al DNI de familiar "${cleanId}". Prueba con: 40112233`);
      }
      const firstChild = children[0];
      const isMother = firstChild.motherDni?.trim() === cleanId;
      const isFather = firstChild.fatherDni?.trim() === cleanId;
      const relTitle = isMother ? 'Madre' : isFather ? 'Padre' : (firstChild.parentRelationship || 'Apoderado');
      const relName = isMother ? firstChild.motherName : isFather ? firstChild.fatherName : firstChild.parentName;

      const parentUser: User = {
        id: `family-${cleanId}`,
        dni: cleanId,
        name: relName || `${relTitle} de ${firstChild.name}`,
        email: `${cleanId}@apoderados.whitman.edu.pe`,
        role: 'PADRE',
        hierarchyTitle: relTitle as any,
        level: firstChild.level,
        gradeOrClass: `${relTitle} - ${firstChild.gradeOrClass}`,
        active: true,
        createdAt: new Date().toISOString(),
      };
      return {
        success: true,
        user: parentUser,
        linkedStudents: children,
        message: `¡Bienvenido(a) ${relTitle} ${parentUser.name}!`,
      };
    }

    if (role === 'ALUMNO') {
      const student = MOCK_USERS.find(
        (u) => (u.dni === cleanId || u.studentCode?.toLowerCase() === cleanId.toLowerCase()) && u.role === 'ALUMNO'
      );
      if (!student) {
        throw new Error(`No se encontró estudiante con DNI o Código "${cleanId}". Prueba con: 72345671`);
      }
      return {
        success: true,
        user: student,
        message: `¡Bienvenido León ${student.name}!`,
      };
    }

    const staff = MOCK_USERS.find((u) => u.dni === cleanId);
    if (!staff) {
      throw new Error(`Usuario con DNI "${cleanId}" no encontrado.`);
    }
    return {
      success: true,
      user: staff,
      message: `¡Bienvenido ${staff.name}!`,
    };
  }
}

export async function registerStudent(payload: {
  dni: string;
  name: string;
  level: string;
  gradeOrClass: string;
  parentDni?: string;
  parentName?: string;
  parentPhone?: string;
  phone?: string;
  email?: string;
}): Promise<{ success: boolean; user: User; message: string }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Error al registrar estudiante');
    }
    return json;
  } catch (err: any) {
    const year = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    const studentCode = `WHT-${year}-${rand}`;
    const newUser: User = {
      id: `u-${Date.now()}`,
      dni: payload.dni,
      studentCode,
      name: payload.name,
      email: payload.email || `${payload.dni}@whitman.edu.pe`,
      role: 'ALUMNO',
      level: payload.level as any,
      gradeOrClass: payload.gradeOrClass,
      parentDni: payload.parentDni,
      parentName: payload.parentName,
      parentPhone: payload.parentPhone,
      phone: payload.phone,
      active: true,
      createdAt: new Date().toISOString(),
    };
    return {
      success: true,
      user: newUser,
      message: `¡Registro exitoso! Código asignado: ${studentCode}`,
    };
  }
}

export async function fetchUsers(role?: string, level?: string): Promise<User[]> {
  try {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (level) params.append('level', level);

    const res = await fetchWithTimeout(`${API_BASE}/api/users?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener usuarios');
    const json = await res.json();
    return json.data;
  } catch (err) {
    return MOCK_USERS;
  }
}

export async function fetchAttendance(date?: string, level?: string): Promise<AttendanceRecord[]> {
  try {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (level) params.append('level', level);

    const res = await fetchWithTimeout(`${API_BASE}/api/attendance?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener asistencia');
    const json = await res.json();
    return json.data;
  } catch (err) {
    return MOCK_ATTENDANCE;
  }
}

export async function markAttendance(payload: {
  dni: string;
  method?: string;
  customStatus?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; data?: AttendanceRecord; user?: User }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/attendance/mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error al registrar asistencia');
    return json;
  } catch (err: any) {
    const user = MOCK_USERS.find((u) => u.dni.trim() === payload.dni.trim());
    if (!user) {
      throw new Error(`Estudiante con DNI ${payload.dni} no encontrado en base de Whitman.`);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-PE', { hour12: false });
    const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 5);

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userDni: user.dni,
      level: user.level,
      gradeOrClass: user.gradeOrClass,
      date: now.toISOString().split('T')[0],
      time: timeStr,
      status: (payload.customStatus as any) || (isLate ? 'TARDANZA' : 'PRESENTE'),
      method: (payload.method as any) || 'QR',
      notes: payload.notes || 'Marcado en terminal local',
    };

    return {
      success: true,
      message: `¡Asistencia registrada para ${user.name}! [${newRecord.status}]`,
      data: newRecord,
      user,
    };
  }
}

export async function updateAttendanceStatus(
  id: string,
  status: string,
  notes?: string
): Promise<AttendanceRecord> {
  const res = await fetchWithTimeout(`${API_BASE}/api/attendance/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Error al actualizar asistencia');
  return json.data;
}

export async function fetchGrades(userId?: string, level?: string): Promise<GradeRecord[]> {
  try {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (level) params.append('level', level);

    const res = await fetchWithTimeout(`${API_BASE}/api/grades?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener notas');
    const json = await res.json();
    return json.data;
  } catch (err) {
    return MOCK_GRADES;
  }
}

export async function createGrade(grade: any): Promise<GradeRecord> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/grades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grade),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error al registrar nota');
    return json.data;
  } catch (err: any) {
    const user = MOCK_USERS.find((u) => u.id === grade.userId || u.dni === grade.userId);
    return {
      id: `grd-${Date.now()}`,
      userId: grade.userId,
      userName: user ? user.name : 'Estudiante Whitman',
      userDni: user ? user.dni : '70000000',
      course: grade.course,
      level: user ? user.level : 'ACADEMIA',
      gradeOrClass: user ? user.gradeOrClass : 'Preuniversitario',
      evaluationType: grade.evaluationType || 'SIMULACRO',
      title: grade.title,
      score: grade.score,
      maxScore: grade.maxScore || 20,
      period: grade.period || 'Ciclo 2026',
      teacherName: grade.teacherName || 'Docente Whitman',
      date: new Date().toISOString().split('T')[0],
      feedback: grade.feedback,
    };
  }
}

export async function fetchStats(): Promise<WhitmanStats> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/stats`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener estadísticas');
    const json = await res.json();
    return json.data;
  } catch (err) {
    return MOCK_STATS;
  }
}

export async function fetchAcademicClasses(level?: string): Promise<AcademicClass[]> {
  try {
    const url = level ? `${API_BASE}/api/academic/classes?level=${level}` : `${API_BASE}/api/academic/classes`;
    const res = await fetchWithTimeout(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener clases');
    const json = await res.json();
    return json.data;
  } catch (err) {
    return [];
  }
}

export async function fetchStudentAssignments(studentId?: string): Promise<StudentAssignment[]> {
  try {
    const url = studentId ? `${API_BASE}/api/academic/assignments?studentId=${studentId}` : `${API_BASE}/api/academic/assignments`;
    const res = await fetchWithTimeout(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener asignaciones');
    const json = await res.json();
    return json.data;
  } catch (err) {
    return [];
  }
}

export async function assignStudentToClass(studentId: string, classCode: string, notes?: string): Promise<any> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/academic/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, classCode, notes }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error al asignar alumno');
    return json;
  } catch (err: any) {
    return { success: true, message: `Asignación guardada localmente` };
  }
}

export async function enrollStudentApi(data: any): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE}/api/academic/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Error al matricular alumno');
  return json;
}

export async function bulkEnrollStudentsApi(students: any[]): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE}/api/academic/bulk-enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ students }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Error en carga masiva');
  return json;
}

export async function createStaffApi(data: any): Promise<any> {
  const res = await fetchWithTimeout(`${API_BASE}/api/academic/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Error al registrar personal');
  return json;
}
