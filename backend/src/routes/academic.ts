import { Router } from 'express';
import { db } from '../store.js';

const router = Router();

// Obtener todas las clases / aulas / grados disponibles
router.get('/classes', (req, res) => {
  const { level } = req.query;
  const classes = db.getAcademicClasses(level as string);
  res.json({ success: true, count: classes.length, data: classes });
});

// Obtener asignaciones de alumnos (con filtro opcional de alumno o año escolar)
router.get('/assignments', (req, res) => {
  const { studentId, academicYear } = req.query;
  const assignments = db.getStudentAssignments(studentId as string, academicYear as string);
  res.json({ success: true, count: assignments.length, data: assignments });
});

// Asignar o reasignar un alumno a una clase / grado / aula
router.post('/assign', async (req, res) => {
  const { studentId, classCode, notes } = req.body;

  if (!studentId || !classCode) {
    return res.status(400).json({
      success: false,
      message: 'studentId (o DNI del alumno) y classCode (código o nombre del aula) son requeridos.',
    });
  }

  try {
    const assignment = await db.assignStudent(studentId, classCode, notes);
    res.status(200).json({
      success: true,
      message: `¡Alumno ${assignment.studentName} asignado exitosamente a ${assignment.className}!`,
      data: assignment,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error al procesar la asignación del alumno.',
    });
  }
});

// Matricular alumno individual con vinculación de apoderado y asignación
router.post('/enroll', async (req, res) => {
  const { dni, name, level, gradeOrClass, phone, parentDni, parentName, parentPhone, email } = req.body;

  if (!dni || !name || !level || !gradeOrClass || !parentDni) {
    return res.status(400).json({
      success: false,
      message: 'DNI, Nombre, Nivel, Grado/Aula y DNI del Apoderado son requeridos para la matrícula.',
    });
  }

  try {
    const result = await db.enrollStudent({
      dni,
      name,
      level,
      gradeOrClass,
      phone,
      parentDni,
      parentName,
      parentPhone,
      email
    });
    res.status(201).json({
      success: true,
      message: `¡Alumno ${result.user.name} matriculado exitosamente con código ${result.user.studentCode}!`,
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Error al matricular alumno.',
    });
  }
});

// Carga masiva de alumnos desde archivo Excel / CSV
router.post('/bulk-enroll', async (req, res) => {
  const { students } = req.body;

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Se requiere una lista de alumnos válida (array no vacío).',
    });
  }

  try {
    const result = await db.enrollStudentsBulk(students);
    res.status(200).json({
      success: true,
      message: `Procesados: ${result.enrolledCount} alumnos matriculados exitosamente.`,
      enrolledCount: result.enrolledCount,
      errors: result.errors,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error procesando matrícula masiva.',
    });
  }
});

// Crear nuevo docente o directivo
router.post('/staff', async (req, res) => {
  const { dni, name, email, hierarchy, hierarchyTitle, level, gradeOrClass, phone } = req.body;

  if (!dni || !name || !hierarchy || !hierarchyTitle) {
    return res.status(400).json({
      success: false,
      message: 'DNI, Nombre, Jerarquía y Cargo son requeridos.',
    });
  }

  try {
    const staff = await db.createStaff({
      dni,
      name,
      email,
      hierarchy,
      hierarchyTitle,
      level: level || 'COLEGIO',
      gradeOrClass: gradeOrClass || 'Docencia General',
      phone
    });
    res.status(201).json({
      success: true,
      message: `¡${staff.hierarchyTitle} ${staff.name} registrado(a) exitosamente!`,
      data: staff,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Error al registrar personal docente.',
    });
  }
});

export default router;

