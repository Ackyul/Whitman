import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL no encontrada en .env');
  process.exit(1);
}

const sql = neon(connectionString);

async function runMigration() {
  console.log('🦁 [WHITMAN NEON] Iniciando creación de tablas e índices...');

  try {
    // 1. Tabla de Usuarios
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        dni VARCHAR(15) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'DOCENTE', 'ALUMNO')),
        level VARCHAR(20) NOT NULL CHECK (level IN ('COLEGIO', 'ACADEMIA')),
        grade_or_class VARCHAR(100) NOT NULL,
        avatar TEXT,
        phone VARCHAR(30),
        parent_phone VARCHAR(30),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla users lista');

    // 2. Tabla de Asistencias
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(150) NOT NULL,
        user_dni VARCHAR(15) NOT NULL,
        level VARCHAR(20) NOT NULL CHECK (level IN ('COLEGIO', 'ACADEMIA')),
        grade_or_class VARCHAR(100) NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        time VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENTE', 'TARDANZA', 'FALTA', 'JUSTIFICADO')),
        method VARCHAR(30) NOT NULL DEFAULT 'QR',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla attendance lista');

    // 3. Tabla de Calificaciones
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS grades (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(150) NOT NULL,
        user_dni VARCHAR(15) NOT NULL,
        course VARCHAR(100) NOT NULL,
        level VARCHAR(20) NOT NULL CHECK (level IN ('COLEGIO', 'ACADEMIA')),
        grade_or_class VARCHAR(100) NOT NULL,
        evaluation_type VARCHAR(30) NOT NULL CHECK (evaluation_type IN ('SIMULACRO', 'PRACTICA', 'EXAMEN_PARCIAL', 'EXAMEN_FINAL', 'TAREA')),
        title VARCHAR(150) NOT NULL,
        score NUMERIC(4, 2) NOT NULL CHECK (score >= 0 AND score <= 20),
        max_score NUMERIC(4, 2) DEFAULT 20.00,
        period VARCHAR(50) NOT NULL,
        teacher_name VARCHAR(150) NOT NULL,
        feedback TEXT,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla grades lista');

    // Índices
    await (sql as any).query(`CREATE INDEX IF NOT EXISTS idx_users_dni ON users(dni);`);
    await (sql as any).query(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);`);
    await (sql as any).query(`CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);`);
    await (sql as any).query(`CREATE INDEX IF NOT EXISTS idx_grades_user ON grades(user_id);`);

    // Semillas
    await (sql as any).query(`
      INSERT INTO users (id, dni, name, email, role, level, grade_or_class, avatar, phone, parent_phone)
      VALUES
      ('u-admin-1', '10000001', 'Prof. Carlos Whitman León', 'direccion@whitman.edu.pe', 'ADMIN', 'COLEGIO', 'Dirección Académica', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', '+51 987654321', NULL),
      ('u-doc-1', '20000001', 'Lic. Ricardo Mendoza (Matemáticas)', 'rmendoza@whitman.edu.pe', 'DOCENTE', 'ACADEMIA', 'Álgebra y Aritmética', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '+51 981234567', NULL),
      ('u-doc-2', '20000002', 'Mag. Elena Torres (Física / Química)', 'etorres@whitman.edu.pe', 'DOCENTE', 'COLEGIO', 'Ciencias y Tecnología', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', '+51 982345678', NULL),
      ('u-alu-1', '72345671', 'Sebastián Alarcón Quispe', 'salarcon@whitman.edu.pe', 'ALUMNO', 'ACADEMIA', 'Ciclo Semianual UNI', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', '+51 991112233', '+51 991112200'),
      ('u-alu-2', '72345672', 'Valeria Morales Silva', 'vmorales@whitman.edu.pe', 'ALUMNO', 'ACADEMIA', 'Ciclo San Marcos - Medicina', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', '+51 992223344', '+51 992223300'),
      ('u-alu-3', '72345673', 'Mateo Cárdenas Rojas', 'mcardenas@whitman.edu.pe', 'ALUMNO', 'ACADEMIA', 'Ciclo Repaso Intensivo', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', '+51 993334455', '+51 993334400'),
      ('u-alu-5', '75432101', 'Gabriel Farfán Rivas', 'gfarfan@whitman.edu.pe', 'ALUMNO', 'COLEGIO', '5to Secundaria - Alfa', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', '+51 995556677', '+51 995556600'),
      ('u-alu-6', '75432102', 'Camila Villavicencio Paz', 'cvillavicencio@whitman.edu.pe', 'ALUMNO', 'COLEGIO', '5to Secundaria - Beta', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', '+51 996667788', '+51 996667700')
      ON CONFLICT (dni) DO NOTHING;
    `);
    console.log('✓ Semillas de usuarios listas');

    await (sql as any).query(`
      INSERT INTO attendance (id, user_id, user_name, user_dni, level, grade_or_class, date, time, status, method, notes)
      VALUES
      ('att-1', 'u-alu-1', 'Sebastián Alarcón Quispe', '72345671', 'ACADEMIA', 'Ciclo Semianual UNI', CURRENT_DATE, '07:42:15', 'PRESENTE', 'QR', 'Ingreso puntual puerta principal'),
      ('att-2', 'u-alu-2', 'Valeria Morales Silva', '72345672', 'ACADEMIA', 'Ciclo San Marcos - Medicina', CURRENT_DATE, '07:48:30', 'PRESENTE', 'QR', 'Ingreso por torniquete'),
      ('att-3', 'u-alu-3', 'Mateo Cárdenas Rojas', '72345673', 'ACADEMIA', 'Ciclo Repaso Intensivo', CURRENT_DATE, '08:14:02', 'TARDANZA', 'DNI_MANUAL', 'Retraso de 14 min por congestión vehicular'),
      ('att-5', 'u-alu-5', 'Gabriel Farfán Rivas', '75432101', 'COLEGIO', '5to Secundaria - Alfa', CURRENT_DATE, '07:35:10', 'PRESENTE', 'BIOMETRICO', 'Ingreso ordenado uniforme completo'),
      ('att-6', 'u-alu-6', 'Camila Villavicencio Paz', '75432102', 'COLEGIO', '5to Secundaria - Beta', CURRENT_DATE, '07:55:00', 'PRESENTE', 'QR', 'Ingreso normal')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✓ Semillas de asistencia listas');

    await (sql as any).query(`
      INSERT INTO grades (id, user_id, user_name, user_dni, course, level, grade_or_class, evaluation_type, title, score, max_score, period, teacher_name, feedback, date)
      VALUES
      ('grd-1', 'u-alu-1', 'Sebastián Alarcón Quispe', '72345671', 'Física Preuniversitaria', 'ACADEMIA', 'Ciclo Semianual UNI', 'SIMULACRO', 'Simulacro Tipo Examen Admisión UNI #1', 18.50, 20.00, 'Ciclo 2026', 'Lic. Ricardo Mendoza', 'Excelente desempeño en Estática y Dinámica.', CURRENT_DATE),
      ('grd-2', 'u-alu-2', 'Valeria Morales Silva', '72345672', 'Biología y Anatomía', 'ACADEMIA', 'Ciclo San Marcos - Medicina', 'SIMULACRO', 'Simulacro General UNMSM - Bloque A (Salud)', 19.20, 20.00, 'Ciclo 2026', 'Mag. Elena Torres', 'Puntaje de ingreso directo a Medicina.', CURRENT_DATE),
      ('grd-3', 'u-alu-5', 'Gabriel Farfán Rivas', '75432101', 'Matemática Avanzada', 'COLEGIO', '5to Secundaria - Alfa', 'EXAMEN_PARCIAL', 'Examen Parcial - I Bimestre', 16.50, 20.00, 'Bimestre I', 'Lic. Ricardo Mendoza', 'Buen avance en áreas y volúmenes.', CURRENT_DATE)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✓ Semillas de calificaciones listas');

    const usersCount = await (sql as any).query('SELECT count(*) FROM users;');
    const attendanceCount = await (sql as any).query('SELECT count(*) FROM attendance;');
    const gradesCount = await (sql as any).query('SELECT count(*) FROM grades;');

    console.log(`=======================================================`);
    console.log(`🦁 [NEON POSTGRESQL CONECTADO CON ÉXITO]`);
    console.log(`   - Usuarios registrados: ${usersCount[0].count}`);
    console.log(`   - Asistencias registradas: ${attendanceCount[0].count}`);
    console.log(`   - Calificaciones registradas: ${gradesCount[0].count}`);
    console.log(`=======================================================`);
  } catch (err) {
    console.error('❌ Error en migración:', err);
  }
}

runMigration();
