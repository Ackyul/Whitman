import { Router } from 'express';
import { db } from '../store.js';
import { User, UserRole, EducationLevel, HierarchyLevel } from '../types.js';
import { getIO } from '../socket.js';

const router = Router();

// Iniciar sesión (Alumnos, Papás y Profesores con niveles jerárquicos)
router.post('/login', (req, res) => {
  const { identifier, role = 'ALUMNO' } = req.body;

  if (!identifier) {
    return res.status(400).json({
      success: false,
      message: 'Por favor ingresa tu número de DNI o código.',
    });
  }

  const cleanId = String(identifier).trim();

  // 1. Caso: PADRE / APODERADO
  if (role === 'PADRE') {
    const children = db.getStudentsByParentDni(cleanId);

    if (children.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No se encontró ningún estudiante vinculado al DNI de apoderado ${cleanId}.`,
        suggestion: 'Prueba con el DNI de prueba de papá: 40112233 o 40223344.',
      });
    }

    const firstChild = children[0];
    const parentUser: User = {
      id: `parent-${cleanId}`,
      dni: cleanId,
      name: firstChild.parentName || `Apoderado de ${firstChild.name}`,
      email: `${cleanId}@apoderados.whitman.edu.pe`,
      role: 'PADRE',
      level: firstChild.level,
      gradeOrClass: `Apoderado - ${firstChild.gradeOrClass}`,
      phone: firstChild.parentPhone,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      active: true,
      createdAt: new Date().toISOString(),
    };

    const childAttendance = db.getAttendance(undefined, undefined, firstChild.id);

    return res.json({
      success: true,
      message: `¡Bienvenido(a) ${parentUser.name}!`,
      user: parentUser,
      linkedStudents: children,
      attendance: childAttendance,
    });
  }

  // 2. Caso: ALUMNO
  if (role === 'ALUMNO') {
    let student = db.getUserByDni(cleanId);
    if (!student) {
      student = db.getUserByStudentCode(cleanId);
    }

    if (!student || student.role !== 'ALUMNO') {
      return res.status(404).json({
        success: false,
        message: `No se encontró ningún estudiante con el DNI o Código "${cleanId}".`,
        suggestion: 'Prueba con DNI de alumno: 72345671 o código WHT-2026-001.',
      });
    }

    const studentAttendance = db.getAttendance(undefined, undefined, student.id);

    return res.json({
      success: true,
      message: `¡Bienvenido León ${student.name}!`,
      user: student,
      attendance: studentAttendance,
    });
  }

  // 3. Caso: PROFESOR (Incluye Director, Coordinador, Jefe de Normas y Docentes)
  let staff = db.getUserByDni(cleanId);
  if (!staff) {
    staff = db.getUserById(cleanId);
  }

  if (!staff || (staff.role !== 'DOCENTE' && staff.role !== 'ADMIN')) {
    return res.status(404).json({
      success: false,
      message: `No se encontró personal docente con el DNI ${cleanId}.`,
      suggestion: 'Pruebas: Director (10000001), Coordinador (20000001), Jefe de Normas (20000004), Profesora (20000002).',
    });
  }

  const cargo = staff.hierarchyTitle || 'Profesor Whitman';

  return res.json({
    success: true,
    message: `¡Bienvenido ${staff.name} [${cargo}]!`,
    user: staff,
  });
});

// Registrar nuevo alumno
router.post('/register', (req, res) => {
  const {
    dni,
    name,
    level = 'ACADEMIA',
    gradeOrClass,
    parentDni,
    parentName,
    parentPhone,
    phone,
    email,
  } = req.body;

  if (!dni || !name || !gradeOrClass) {
    return res.status(400).json({
      success: false,
      message: 'DNI, Nombre del estudiante y Aula/Ciclo son obligatorios.',
    });
  }

  const existing = db.getUserByDni(dni);
  if (existing) {
    return res.status(409).json({
      success: false,
      message: `Ya existe un alumno registrado con el DNI ${dni}.`,
    });
  }

  const year = new Date().getFullYear();
  const randCode = Math.floor(100 + Math.random() * 900);
  const studentCode = `WHT-${year}-${randCode}`;

  const newUser: User = {
    id: `u-alu-${Date.now()}`,
    dni: dni.trim(),
    studentCode,
    name: name.trim(),
    email: email || `${dni}@whitman.edu.pe`,
    role: 'ALUMNO',
    level: level as EducationLevel,
    gradeOrClass: gradeOrClass.trim(),
    parentDni: parentDni ? parentDni.trim() : undefined,
    parentName: parentName ? parentName.trim() : undefined,
    parentPhone: parentPhone ? parentPhone.trim() : undefined,
    phone: phone ? phone.trim() : undefined,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    active: true,
    createdAt: new Date().toISOString(),
  };

  const savedUser = db.addUser(newUser);

  try {
    const io = getIO();
    io.emit('user:new', savedUser);
  } catch (err) {
    console.error('Socket emit error:', err);
  }

  res.status(201).json({
    success: true,
    message: `¡Registro exitoso! Código de alumno asignado: ${studentCode}`,
    user: savedUser,
  });
});

export default router;
