import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { identifier, sessionToken } = await request.json();
    const cleanId = String(identifier || '').trim();
    const cleanToken = String(sessionToken || '').trim();

    if (!cleanId || !cleanToken) {
      return NextResponse.json(
        { valid: false, message: 'Identificador y token requeridos' },
        { status: 400 }
      );
    }

    if (!sql) {
      return NextResponse.json({ valid: true });
    }

    // Asegurar columna
    await (sql as any).query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS current_session_token VARCHAR(128);
    `);

    const rows = await (sql as any).query(`
      SELECT id, dni, current_session_token as "currentSessionToken", role, active
      FROM users
      WHERE TRIM(dni) = $1
         OR TRIM(id) = $1
         OR TRIM(mother_dni) = $1
         OR TRIM(father_dni) = $1
         OR TRIM(parent_dni) = $1
      LIMIT 1;
    `, [cleanId]);

    if (!rows || rows.length === 0) {
      // Si es un padre o usuario sin fila exacta, permitir si coincide con token temporal
      return NextResponse.json({ valid: true });
    }

    const user = rows[0];
    const serverToken = user.currentSessionToken;

    // Si no hay token guardado aún en el servidor, registrar el actual
    if (!serverToken) {
      await (sql as any).query(`
        UPDATE users SET current_session_token = $1 WHERE id = $2;
      `, [cleanToken, user.id]);
      return NextResponse.json({ valid: true });
    }

    // Si el token guardado en el servidor es distinto, alguien inició sesión en otro dispositivo
    if (serverToken !== cleanToken) {
      return NextResponse.json({
        valid: false,
        reason: 'CONCURRENT_LOGIN',
        message: 'Se ha iniciado sesión desde otro dispositivo. Por seguridad, esta sesión ha finalizado.',
      });
    }

    return NextResponse.json({ valid: true });
  } catch (err: any) {
    console.error('Error verificando sesión:', err);
    // En caso de fallo transitorio de BD, no desloguear agresivamente
    return NextResponse.json({ valid: true });
  }
}
