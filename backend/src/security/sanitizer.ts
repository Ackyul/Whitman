import { z } from 'zod';

// Esquema estricto para DNI peruano (exactamente 8 dígitos numéricos)
export const DniSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, { message: 'El DNI debe tener exactamente 8 dígitos numéricos.' });

// Sanitizador básico contra XSS (elimina tags HTML peligrosos)
export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

// Validación de entrada para registro de alumno
export const RegisterStudentSchema = z.object({
  dni: DniSchema,
  name: z.string().trim().min(3).max(100),
  level: z.enum(['COLEGIO', 'ACADEMIA']),
  gradeOrClass: z.string().trim().min(2).max(100),
  parentDni: DniSchema,
  parentName: z.string().trim().min(3).max(100).optional(),
  parentPhone: z.string().trim().max(30).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().email().optional(),
});

// Validación para registro de notas
export const GradeInputSchema = z.object({
  userId: z.string().min(1),
  course: z.string().min(2).max(100),
  title: z.string().min(2).max(150),
  score: z.number().min(0).max(20),
  maxScore: z.number().default(20),
  evaluationType: z.enum(['SIMULACRO', 'PRACTICA', 'EXAMEN_PARCIAL', 'EXAMEN_FINAL', 'TAREA']),
  period: z.string().default('Ciclo 2026'),
  teacherName: z.string().default('Docente Whitman'),
  feedback: z.string().max(500).optional(),
});

