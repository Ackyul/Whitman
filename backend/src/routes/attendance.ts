import { Router } from 'express';
import { db } from '../store.js';
import { AttendanceRecord, AttendanceStatus } from '../types.js';
import { getIO } from '../socket.js';

const router = Router();

// Obtener registros de asistencia
router.get('/', (req, res) => {
  const { date, level } = req.query;
  const attendance = db.getAttendance(date as string, level as string);
  res.json({ success: true, count: attendance.length, data: attendance });
});

// Registrar asistencia en tiempo real (por DNI o QR)
router.post('/mark', (req, res) => {
  const { dni, method = 'QR', customStatus, notes } = req.body;

  if (!dni) {
    return res.status(400).json({ success: false, message: 'DNI es obligatorio para marcar asistencia' });
  }

  const user = db.getUserByDni(dni);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: `No se encontró ningún estudiante o usuario con DNI ${dni} en la base de Whitman`
    });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('es-PE', { hour12: false });

  // Determinar estado según hora si no se especifica
  // Hora límite de ingreso puntual: 08:00:00
  let status: AttendanceStatus = customStatus || 'PRESENTE';
  if (!customStatus) {
    const [hours, minutes] = [now.getHours(), now.getMinutes()];
    if (hours > 8 || (hours === 8 && minutes > 5)) {
      status = 'TARDANZA';
    } else {
      status = 'PRESENTE';
    }
  }

  const record: AttendanceRecord = {
    id: `att-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userDni: user.dni,
    level: user.level,
    gradeOrClass: user.gradeOrClass,
    date: dateStr,
    time: timeStr,
    status,
    method,
    notes: notes || (status === 'TARDANZA' ? 'Ingreso registrado con tardanza' : 'Ingreso registrado en portería')
  };

  const savedRecord = db.recordAttendance(record);
  const updatedStats = db.getStats();

  // Emisión en tiempo real vía WebSockets
  try {
    const io = getIO();
    io.emit('attendance:new', savedRecord);
    io.emit('stats:update', updatedStats);
  } catch (err) {
    console.error('Socket emission error:', err);
  }

  res.status(201).json({
    success: true,
    message: `¡Asistencia registrada para ${user.name}! [${status}]`,
    data: savedRecord,
    user
  });
});

// Modificar estado de asistencia (ej. justificar una falta o corregir tardanza)
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'El estado es requerido' });
  }

  const updated = db.updateAttendanceStatus(id, status, notes);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Registro de asistencia no encontrado' });
  }

  const updatedStats = db.getStats();

  try {
    const io = getIO();
    io.emit('attendance:update', updated);
    io.emit('stats:update', updatedStats);
  } catch (err) {
    console.error('Socket emission error:', err);
  }

  res.json({
    success: true,
    message: 'Asistencia actualizada correctamente',
    data: updated
  });
});

export default router;

