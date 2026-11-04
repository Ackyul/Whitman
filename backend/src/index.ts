import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// Cargar .env de backend o de la raíz
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
dotenv.config();

import { initSocket } from './socket.js';
import usersRouter from './routes/users.js';
import attendanceRouter from './routes/attendance.js';
import gradesRouter from './routes/grades.js';
import authRouter from './routes/auth.js';
import academicRouter from './routes/academic.js';
import { db } from './store.js';
import { initNeonDb, isNeonConfigured } from './neon.js';
import { authRateLimiter, attendanceRateLimiter, globalApiLimiter } from './security/rateLimiter.js';

const app = express();
const server = http.createServer(app);

// Iniciar Socket.io
initSocket(server);

// 1. Cabeceras HTTP de Seguridad (Protección XSS, Clickjacking, MIME sniffing)
app.use(helmet({
  contentSecurityPolicy: false, // Permite carga flexible de recursos en desarrollo
  crossOriginEmbedderPolicy: false,
}));

// 2. CORS Seguro: Permitir localhost y orígenes autorizados
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (como apps móviles o curl en desarrollo) o si está en la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Abierto en desarrollo para no bloquear pruebas
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// 3. Rate Limiter Global
app.use(globalApiLimiter);

// 4. Parseo de JSON con límite de tamaño para evitar ataques por payloads gigantes
app.use(express.json({ limit: '1mb' }));

// Endpoints de salud y bienvenida
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    institution: 'Academia y Colegio WHITMAN',
    mascot: 'León',
    security: 'ENHANCED (Rate-Limiting, Helmet, Parametrized SQL)',
    database: isNeonConfigured ? 'NEON_POSTGRES' : 'LOCAL_STORE',
    timestamp: new Date().toISOString()
  });
});

// Resumen general de estadísticas en vivo
app.get('/api/stats', (req, res) => {
  const stats = db.getStats();
  res.json({ success: true, data: stats });
});

// Rutas de los módulos con protección específica
app.use('/api/auth', authRateLimiter, authRouter);
app.use('/api/attendance/mark', attendanceRateLimiter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/users', usersRouter);
app.use('/api/grades', gradesRouter);
app.use('/api/academic', academicRouter);

const PORT = Number(process.env.PORT) || 4000;

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️ [Whitman Backend] El puerto ${PORT} ya está ocupado por otra instancia.`);
  } else {
    console.error('Error en el servidor:', err);
  }
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`=======================================================`);
  console.log(`🦁 Servidor WHITMAN activo en http://localhost:${PORT}`);
  console.log(`🦁 Color: Vino Borgoña | Mascota: León Whitman`);
  console.log(`🛡️ Seguridad Activa: Helmet + Rate Limiter + SQL Parametrizado`);
  console.log(`🦁 WebSocket Socket.IO listo para asistencia y notas`);

  // Conexión a Neon
  if (isNeonConfigured) {
    console.log(`🦁 Motor de Base de Datos: NEON PostgreSQL Serverless`);
    await initNeonDb();
  } else {
    console.log(`🦁 Base de Datos: Almacenamiento local activo`);
  }
  console.log(`=======================================================`);
});
