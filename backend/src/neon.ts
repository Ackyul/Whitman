import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

// Cargar .env de backend o de la raíz
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
dotenv.config();

const connectionString = process.env.DATABASE_URL;

export const isNeonConfigured = Boolean(connectionString && connectionString.startsWith('postgres'));

export const sql = isNeonConfigured ? neon(connectionString!) : null;

export async function initNeonDb(): Promise<boolean> {
  if (!isNeonConfigured || !sql) {
    console.log('ℹ️ [Whitman DB] DATABASE_URL no configurada. Operando en almacenamiento local.');
    return false;
  }

  try {
    console.log('🦁 [Whitman DB] Verificando conexión a Neon PostgreSQL...');
    const result: any = await (sql as any).query('SELECT count(*) FROM users;');
    console.log(`✅ [Whitman DB] Conectado exitosamente a Neon PostgreSQL (${result[0].count} usuarios en nube).`);
    return true;
  } catch (error) {
    console.error('❌ [Whitman DB] Error de conexión con Neon:', error);
    return false;
  }
}
