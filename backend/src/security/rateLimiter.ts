import rateLimit from 'express-rate-limit';

// Limitador estricto para Login y Registro (evita ataques de fuerza bruta a DNIs)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15, // Máximo 15 intentos por IP cada 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de acceso desde esta dirección IP. Por seguridad, espera 15 minutos.',
  },
});

// Limitador para la Garita de Asistencia (permite flujo continuo pero previene bombardeos masivos)
export const attendanceRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // Máximo 60 lecturas por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Límite de lecturas por minuto alcanzado en garita. Espere unos segundos.',
  },
});

// Limitador global de API para protección contra DoS
export const globalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 120, // 120 peticiones por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Límite de solicitudes excedido. Por favor reduce la frecuencia de consultas.',
  },
});

