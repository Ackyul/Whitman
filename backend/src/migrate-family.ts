import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.log('ℹ️ DATABASE_URL no configurada en local, omitiendo migración de base de datos remota.');
  process.exit(0);
}

const sql = neon(connectionString);

async function runFamilyMigration() {
  console.log('🦁 [WHITMAN NEON] Migrando columnas familiares (Madre, Padre, Apoderado)...');

  try {
    const commands = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_dni VARCHAR(15);',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_name VARCHAR(150);',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS mother_phone VARCHAR(30);',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS father_dni VARCHAR(15);',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS father_name VARCHAR(150);',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS father_phone VARCHAR(30);',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_relationship VARCHAR(50);',
      'CREATE INDEX IF NOT EXISTS idx_users_mother_dni ON users(mother_dni);',
      'CREATE INDEX IF NOT EXISTS idx_users_father_dni ON users(father_dni);',
      'CREATE INDEX IF NOT EXISTS idx_users_parent_dni ON users(parent_dni);'
    ];

    for (const cmd of commands) {
      await (sql as any).query(cmd);
    }

    console.log('✅ Columnas e índices familiares creados exitosamente en Neon PostgreSQL.');
  } catch (err) {
    console.error('❌ Error durante la migración familiar:', err);
  }
}

runFamilyMigration();
