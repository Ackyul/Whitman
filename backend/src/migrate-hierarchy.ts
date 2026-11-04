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

async function updateHierarchy() {
  console.log('🦁 [WHITMAN NEON] Configurando jerarquía de profesores...');

  try {
    await (sql as any).query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS hierarchy VARCHAR(30);`);
    await (sql as any).query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS hierarchy_title VARCHAR(100);`);

    // 1. Director General
    await (sql as any).query(`
      UPDATE users SET 
        role = 'DOCENTE',
        hierarchy = 'DIRECTOR',
        hierarchy_title = 'Director General',
        grade_or_class = 'Dirección General Whitman'
      WHERE dni = '10000001';
    `);

    // 2. Coordinador Académico
    await (sql as any).query(`
      UPDATE users SET 
        role = 'DOCENTE',
        hierarchy = 'COORDINADOR',
        hierarchy_title = 'Coordinador Académico',
        grade_or_class = 'Coordinación Preuniversitaria & Ciencias'
      WHERE dni = '20000001';
    `);

    // 3. Jefe de Normas y Disciplina
    await (sql as any).query(`
      INSERT INTO users (id, dni, name, email, role, hierarchy, hierarchy_title, level, grade_or_class, avatar, phone, active)
      VALUES (
        'u-doc-normas',
        '20000004',
        'Prof. Walter Castillo Rivas',
        'normas@whitman.edu.pe',
        'DOCENTE',
        'JEFE_NORMAS',
        'Jefe de Normas y Disciplina',
        'COLEGIO',
        'Jefatura de Normas, Portería y Disciplina',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        '+51 984567890',
        true
      )
      ON CONFLICT (dni) DO UPDATE SET 
        role = 'DOCENTE',
        hierarchy = 'JEFE_NORMAS',
        hierarchy_title = 'Jefe de Normas y Disciplina';
    `);

    // 4. Profesores
    await (sql as any).query(`
      UPDATE users SET 
        role = 'DOCENTE',
        hierarchy = 'PROFESOR',
        hierarchy_title = 'Profesora de Ciencias'
      WHERE dni = '20000002';
    `);

    console.log('✅ [WHITMAN NEON] Jerarquías docentes configuradas exitosamente en Neon.');
  } catch (err) {
    console.error('❌ Error configurando jerarquías en Neon:', err);
  }
}

updateHierarchy();

