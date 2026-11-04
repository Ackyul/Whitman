import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL no encontrada en .env');
  process.exit(1);
}

const sql = neon(connectionString);

async function runAssignmentsMigration() {
  console.log('🦁 [WHITMAN NEON] Configurando tablas y asignaciones para DB (Primaria, Secundaria y Academia)...');

  try {
    // 1. Actualizar constraints de 'level' en users, attendance y grades para permitir PRIMARIA y SECUNDARIA
    await (sql as any).query(`
      DO $$
      BEGIN
        -- Constraint users
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_level_check') THEN
          ALTER TABLE users DROP CONSTRAINT users_level_check;
        END IF;
        ALTER TABLE users ADD CONSTRAINT users_level_check 
          CHECK (level IN ('COLEGIO', 'ACADEMIA', 'PRIMARIA', 'SECUNDARIA'));

        -- Constraint attendance
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_level_check') THEN
          ALTER TABLE attendance DROP CONSTRAINT attendance_level_check;
        END IF;
        ALTER TABLE attendance ADD CONSTRAINT attendance_level_check 
          CHECK (level IN ('COLEGIO', 'ACADEMIA', 'PRIMARIA', 'SECUNDARIA'));

        -- Constraint grades
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_level_check') THEN
          ALTER TABLE grades DROP CONSTRAINT grades_level_check;
        END IF;
        ALTER TABLE grades ADD CONSTRAINT grades_level_check 
          CHECK (level IN ('COLEGIO', 'ACADEMIA', 'PRIMARIA', 'SECUNDARIA'));
      END $$;
    `);
    console.log('✓ Constraints de nivel actualizadas para PRIMARIA y SECUNDARIA');

    // 2. Crear tabla academic_classes (Aulas, Grados y Secciones)
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS academic_classes (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        level VARCHAR(30) NOT NULL CHECK (level IN ('COLEGIO', 'ACADEMIA', 'PRIMARIA', 'SECUNDARIA')),
        grade VARCHAR(50) NOT NULL,
        section VARCHAR(50) NOT NULL,
        shift VARCHAR(20) DEFAULT 'MAÑANA',
        classroom_number VARCHAR(50),
        capacity INT DEFAULT 35,
        tutor_teacher_name VARCHAR(150),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla academic_classes creada');

    // 3. Crear tabla student_assignments (Asignaciones de Alumnos a sus Clases y Grados)
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS student_assignments (
        id VARCHAR(64) PRIMARY KEY,
        student_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        student_dni VARCHAR(15) NOT NULL,
        student_name VARCHAR(150) NOT NULL,
        class_id VARCHAR(64) REFERENCES academic_classes(id) ON DELETE RESTRICT,
        class_code VARCHAR(50) NOT NULL,
        class_name VARCHAR(150) NOT NULL,
        level VARCHAR(30) NOT NULL CHECK (level IN ('COLEGIO', 'ACADEMIA', 'PRIMARIA', 'SECUNDARIA')),
        grade VARCHAR(50) NOT NULL,
        section VARCHAR(50) NOT NULL,
        academic_year VARCHAR(10) NOT NULL DEFAULT '2026',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'TRASLADADO', 'RETIRADO', 'EGRESADO')),
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (student_id, academic_year)
      );
    `);
    console.log('✓ Tabla student_assignments creada');

    // 4. Índices
    await (sql as any).query(`CREATE INDEX IF NOT EXISTS idx_assignments_student ON student_assignments(student_id);`);
    await (sql as any).query(`CREATE INDEX IF NOT EXISTS idx_assignments_class ON student_assignments(class_id);`);
    await (sql as any).query(`CREATE INDEX IF NOT EXISTS idx_assignments_level ON student_assignments(level);`);

    // 5. Semillas de Clases Académicas (Primaria, Secundaria, Academia)
    await (sql as any).query(`
      INSERT INTO academic_classes (id, code, name, level, grade, section, shift, classroom_number, tutor_teacher_name)
      VALUES
        -- PRIMARIA
        ('cls-prim-3', 'PRIM-3-BETA', '3ro Primaria - Beta', 'PRIMARIA', '3ro Primaria', 'Beta', 'MAÑANA', 'Aula 101', 'Prof. Walter Castillo Rivas'),
        ('cls-prim-5', 'PRIM-5-ALFA', '5to Primaria - Alfa', 'PRIMARIA', '5to Primaria', 'Alfa', 'MAÑANA', 'Aula 102', 'Mag. Elena Torres'),
        ('cls-prim-6', 'PRIM-6-LEONES', '6to Primaria - Leones', 'PRIMARIA', '6to Primaria', 'Leones', 'MAÑANA', 'Aula 103', 'Prof. Carlos Whitman'),
        
        -- SECUNDARIA
        ('cls-sec-1', 'SEC-1-ALFA', '1ro Secundaria - Alfa', 'SECUNDARIA', '1ro Secundaria', 'Alfa', 'MAÑANA', 'Aula 201', 'Lic. Ricardo Mendoza'),
        ('cls-sec-3', 'SEC-3-BETA', '3ro Secundaria - Beta', 'SECUNDARIA', '3ro Secundaria', 'Beta', 'MAÑANA', 'Aula 202', 'Mag. Elena Torres'),
        ('cls-sec-5', 'SEC-5-ALFA', '5to Secundaria - Alfa', 'SECUNDARIA', '5to Secundaria', 'Alfa', 'MAÑANA', 'Aula 203', 'Prof. Carlos Whitman'),

        -- ACADEMIA PREUNIVERSITARIA
        ('cls-acad-uni', 'ACAD-UNI', 'Ciclo Semianual UNI', 'ACADEMIA', 'Preuniversitario UNI', 'UNI', 'MAÑANA', 'Aula Magna 1', 'Lic. Ricardo Mendoza'),
        ('cls-acad-sm', 'ACAD-SM-MED', 'Ciclo San Marcos - Medicina', 'ACADEMIA', 'Preuniversitario San Marcos', 'Medicina', 'MAÑANA', 'Aula Magna 2', 'Mag. Elena Torres'),
        ('cls-acad-rep', 'ACAD-REP-INT', 'Ciclo Repaso Intensivo', 'ACADEMIA', 'Repaso Intensivo', 'Intensivo', 'TARDE', 'Aula 301', 'Lic. Ricardo Mendoza')
      ON CONFLICT (code) DO UPDATE SET 
        name = EXCLUDED.name,
        level = EXCLUDED.level,
        grade = EXCLUDED.grade,
        section = EXCLUDED.section;
    `);
    console.log('✓ Clases académicas configuradas en Neon');

    // 6. Actualizar o insertar alumnos con sus niveles correspondientes
    await (sql as any).query(`
      INSERT INTO users (id, dni, student_code, name, email, role, level, grade_or_class, phone, parent_dni, parent_name, parent_phone, active)
      VALUES
        -- ACADEMIA
        ('u-alu-1', '72345671', 'WHT-2026-001', 'Sebastián Alarcón Quispe', 'salarcon@whitman.edu.pe', 'ALUMNO', 'ACADEMIA', 'Ciclo Semianual UNI', '+51 991112233', '40112233', 'Don Marcos Alarcón (Padre)', '+51 991112200', true),
        ('u-alu-2', '72345672', 'WHT-2026-002', 'Valeria Morales Silva', 'vmorales@whitman.edu.pe', 'ALUMNO', 'ACADEMIA', 'Ciclo San Marcos - Medicina', '+51 992223344', '40223344', 'Sra. Patricia Silva (Madre)', '+51 992223300', true),
        ('u-alu-3', '72345673', 'WHT-2026-003', 'Mateo Cárdenas Rojas', 'mcardenas@whitman.edu.pe', 'ALUMNO', 'ACADEMIA', 'Ciclo Repaso Intensivo', '+51 993334455', '40334455', 'Don Roberto Cárdenas (Padre)', '+51 993334400', true),

        -- SECUNDARIA
        ('u-alu-5', '75432101', 'WHT-2026-005', 'Gabriel Farfán Rivas', 'gfarfan@whitman.edu.pe', 'ALUMNO', 'SECUNDARIA', '5to Secundaria - Alfa', '+51 995556677', '40556677', 'Don Javier Farfán (Padre)', '+51 995556600', true),
        ('u-alu-6', '75432102', 'WHT-2026-006', 'Camila Villavicencio Paz', 'cvillavicencio@whitman.edu.pe', 'ALUMNO', 'SECUNDARIA', '3ro Secundaria - Beta', '+51 996667788', '40667788', 'Sra. Carmen Paz (Madre)', '+51 996667700', true),
        ('u-alu-7', '75432103', 'WHT-2026-007', 'Rodrigo Huamán Castro', 'rhuaman@whitman.edu.pe', 'ALUMNO', 'SECUNDARIA', '1ro Secundaria - Alfa', '+51 997778899', '40778899', 'Don Alberto Huamán (Padre)', '+51 997778800', true),

        -- PRIMARIA
        ('u-alu-8', '78912301', 'WHT-2026-008', 'Joaquín Alarcón Quispe', 'jalarcon@whitman.edu.pe', 'ALUMNO', 'PRIMARIA', '6to Primaria - Leones', '+51 998889901', '40112233', 'Don Marcos Alarcón (Padre)', '+51 991112200', true),
        ('u-alu-9', '78912302', 'WHT-2026-009', 'Luciana Vega Romero', 'lvega@whitman.edu.pe', 'ALUMNO', 'PRIMARIA', '5to Primaria - Alfa', '+51 998889902', '40889900', 'Sra. Rosa Romero (Madre)', '+51 998889900', true),
        ('u-alu-10', '78912303', 'WHT-2026-010', 'Thiago Mendoza Paredes', 'tmendoza@whitman.edu.pe', 'ALUMNO', 'PRIMARIA', '3ro Primaria - Beta', '+51 998889903', '40990011', 'Don Luis Mendoza (Padre)', '+51 999900110', true)
      ON CONFLICT (dni) DO UPDATE SET 
        level = EXCLUDED.level,
        grade_or_class = EXCLUDED.grade_or_class,
        student_code = EXCLUDED.student_code,
        parent_dni = EXCLUDED.parent_dni,
        parent_name = EXCLUDED.parent_name,
        parent_phone = EXCLUDED.parent_phone;
    `);
    console.log('✓ Alumnos actualizados en tabla users');

    // 7. Insertar Asignaciones Oficiales en student_assignments
    await (sql as any).query(`
      INSERT INTO student_assignments (
        id, student_id, student_dni, student_name, 
        class_id, class_code, class_name, level, grade, section, academic_year, status
      )
      VALUES
        -- Asignaciones Academia
        ('asgn-1', 'u-alu-1', '72345671', 'Sebastián Alarcón Quispe', 'cls-acad-uni', 'ACAD-UNI', 'Ciclo Semianual UNI', 'ACADEMIA', 'Preuniversitario UNI', 'UNI', '2026', 'ACTIVO'),
        ('asgn-2', 'u-alu-2', '72345672', 'Valeria Morales Silva', 'cls-acad-sm', 'ACAD-SM-MED', 'Ciclo San Marcos - Medicina', 'ACADEMIA', 'Preuniversitario San Marcos', 'Medicina', '2026', 'ACTIVO'),
        ('asgn-3', 'u-alu-3', '72345673', 'Mateo Cárdenas Rojas', 'cls-acad-rep', 'ACAD-REP-INT', 'Ciclo Repaso Intensivo', 'ACADEMIA', 'Repaso Intensivo', 'Intensivo', '2026', 'ACTIVO'),

        -- Asignaciones Secundaria
        ('asgn-5', 'u-alu-5', '75432101', 'Gabriel Farfán Rivas', 'cls-sec-5', 'SEC-5-ALFA', '5to Secundaria - Alfa', 'SECUNDARIA', '5to Secundaria', 'Alfa', '2026', 'ACTIVO'),
        ('asgn-6', 'u-alu-6', '75432102', 'Camila Villavicencio Paz', 'cls-sec-3', 'SEC-3-BETA', '3ro Secundaria - Beta', 'SECUNDARIA', '3ro Secundaria', 'Beta', '2026', 'ACTIVO'),
        ('asgn-7', 'u-alu-7', '75432103', 'Rodrigo Huamán Castro', 'cls-sec-1', 'SEC-1-ALFA', '1ro Secundaria - Alfa', 'SECUNDARIA', '1ro Secundaria', 'Alfa', '2026', 'ACTIVO'),

        -- Asignaciones Primaria
        ('asgn-8', 'u-alu-8', '78912301', 'Joaquín Alarcón Quispe', 'cls-prim-6', 'PRIM-6-LEONES', '6to Primaria - Leones', 'PRIMARIA', '6to Primaria', 'Leones', '2026', 'ACTIVO'),
        ('asgn-9', 'u-alu-9', '78912302', 'Luciana Vega Romero', 'cls-prim-5', 'PRIM-5-ALFA', '5to Primaria - Alfa', 'PRIMARIA', '5to Primaria', 'Alfa', '2026', 'ACTIVO'),
        ('asgn-10', 'u-alu-10', '78912303', 'Thiago Mendoza Paredes', 'cls-prim-3', 'PRIM-3-BETA', '3ro Primaria - Beta', 'PRIMARIA', '3ro Primaria', 'Beta', '2026', 'ACTIVO')
      ON CONFLICT (student_id, academic_year) DO UPDATE SET
        class_id = EXCLUDED.class_id,
        class_code = EXCLUDED.class_code,
        class_name = EXCLUDED.class_name,
        level = EXCLUDED.level,
        grade = EXCLUDED.grade,
        section = EXCLUDED.section,
        status = EXCLUDED.status;
    `);
    console.log('✓ Asignaciones de alumnos guardadas exitosamente en student_assignments');

    console.log('🎉 [WHITMAN NEON] Migración de asignaciones completada con éxito.');
  } catch (error) {
    console.error('❌ Error ejecutando migración de asignaciones:', error);
    process.exit(1);
  }
}

runAssignmentsMigration();

