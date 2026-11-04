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

async function runUpdate() {
  console.log('🦁 [WHITMAN NEON] Añadiendo columnas para login de alumnos y papás...');

  try {
    await (sql as any).query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS student_code VARCHAR(30);`);
    await (sql as any).query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_dni VARCHAR(15);`);
    await (sql as any).query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_name VARCHAR(150);`);
    await (sql as any).query(`CREATE INDEX IF NOT EXISTS idx_users_parent_dni ON users(parent_dni);`);
    await (sql as any).query(`CREATE INDEX IF NOT EXISTS idx_users_student_code ON users(student_code);`);

    // Actualizar alumnos con códigos y DNIs de apoderados de prueba
    await (sql as any).query(`
      UPDATE users SET 
        student_code = 'WHT-2026-001',
        parent_dni = '40112233',
        parent_name = 'Don Marcos Alarcón (Padre)'
      WHERE dni = '72345671';
    `);

    await (sql as any).query(`
      UPDATE users SET 
        student_code = 'WHT-2026-002',
        parent_dni = '40223344',
        parent_name = 'Sra. Patricia Silva (Madre)'
      WHERE dni = '72345672';
    `);

    await (sql as any).query(`
      UPDATE users SET 
        student_code = 'WHT-2026-003',
        parent_dni = '40334455',
        parent_name = 'Don Roberto Cárdenas (Padre)'
      WHERE dni = '72345673';
    `);

    await (sql as any).query(`
      UPDATE users SET 
        student_code = 'WHT-2026-005',
        parent_dni = '40556677',
        parent_name = 'Don Javier Farfán (Padre)'
      WHERE dni = '75432101';
    `);

    await (sql as any).query(`
      UPDATE users SET 
        student_code = 'WHT-2026-006',
        parent_dni = '40667788',
        parent_name = 'Sra. Carmen Paz (Madre)'
      WHERE dni = '75432102';
    `);

    console.log('✅ [WHITMAN NEON] Columnas actualizadas y códigos de alumno asignados con éxito.');
  } catch (err) {
    console.error('❌ Error en actualización de esquema:', err);
  }
}

runUpdate();

