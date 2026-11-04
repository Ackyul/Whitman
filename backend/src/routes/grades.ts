import { Router } from 'express';
import { db } from '../store.js';
import { GradeRecord, EvaluationType } from '../types.js';
import { getIO } from '../socket.js';

const router = Router();

// Obtener notas
router.get('/', (req, res) => {
  const { userId, level } = req.query;
  const grades = db.getGrades(userId as string, level as string);
  res.json({ success: true, count: grades.length, data: grades });
});

// Registrar una nueva nota
router.post('/', (req, res) => {
  const {
    userId,
    course,
    evaluationType = 'PRACTICA',
    title,
    score,
    maxScore = 20,
    period = 'Bimestre I',
    teacherName = 'Docente Whitman',
    feedback
  } = req.body;

  if (!userId || !course || !title || score === undefined) {
    return res.status(400).json({
      success: false,
      message: 'userId, course, title y score son obligatorios'
    });
  }

  const user = db.getUserById(userId) || db.getUserByDni(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }

  const newGrade: GradeRecord = {
    id: `grd-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userDni: user.dni,
    course,
    level: user.level,
    gradeOrClass: user.gradeOrClass,
    evaluationType: evaluationType as EvaluationType,
    title,
    score: Number(score),
    maxScore: Number(maxScore),
    period,
    teacherName,
    date: new Date().toISOString().split('T')[0],
    feedback
  };

  const savedGrade = db.addGrade(newGrade);
  const updatedStats = db.getStats();

  // Emisión en tiempo real vía WebSockets
  try {
    const io = getIO();
    io.emit('grade:new', savedGrade);
    io.emit('stats:update', updatedStats);
  } catch (err) {
    console.error('Socket emission error:', err);
  }

  res.status(201).json({
    success: true,
    message: `Nota guardada exitosamente para ${user.name}`,
    data: savedGrade
  });
});

// Actualizar una nota
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const updated = db.updateGrade(id, req.body);

  if (!updated) {
    return res.status(404).json({ success: false, message: 'Registro de calificación no encontrado' });
  }

  const updatedStats = db.getStats();

  try {
    const io = getIO();
    io.emit('grade:update', updated);
    io.emit('stats:update', updatedStats);
  } catch (err) {
    console.error('Socket emission error:', err);
  }

  res.json({
    success: true,
    message: 'Calificación actualizada con éxito',
    data: updated
  });
});

export default router;

