import { Router } from 'express';
import { db } from '../store.js';

const router = Router();

// Obtener todos los usuarios con filtros opcionales de rol y nivel
router.get('/', (req, res) => {
  const { role, level } = req.query;
  const users = db.getUsers(role as string, level as string);
  res.json({ success: true, count: users.length, data: users });
});

// Obtener un usuario por ID o DNI
router.get('/:identifier', (req, res) => {
  const { identifier } = req.params;
  let user = db.getUserById(identifier);
  if (!user) {
    user = db.getUserByDni(identifier);
  }

  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }

  res.json({ success: true, data: user });
});

// Crear nuevo usuario (alumno o docente)
router.post('/', (req, res) => {
  const { dni, name, email, role, level, gradeOrClass, phone, parentPhone, avatar } = req.body;

  if (!dni || !name || !role || !level) {
    return res.status(400).json({ success: false, message: 'DNI, Nombre, Rol y Nivel son requeridos' });
  }

  const existing = db.getUserByDni(dni);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese DNI' });
  }

  const newUser = db.addUser({
    id: `u-${Date.now()}`,
    dni: dni.trim(),
    name: name.trim(),
    email: email || `${dni}@whitman.edu.pe`,
    role,
    level,
    gradeOrClass: gradeOrClass || 'General',
    avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    phone,
    parentPhone,
    active: true,
    createdAt: new Date().toISOString()
  });

  res.status(201).json({ success: true, message: 'Usuario creado con éxito', data: newUser });
});

export default router;

