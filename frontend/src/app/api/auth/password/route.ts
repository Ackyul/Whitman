import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { identifier, userId, newPassword } = await request.json();
    const target = String(identifier || userId || '').trim();
    const cleanPass = String(newPassword || '').trim();

    if (!target) {
      return NextResponse.json(
        { success: false, message: 'DNI o ID de usuario es requerido.' },
        { status: 400 }
      );
    }

    if (!cleanPass || cleanPass.length < 4) {
      return NextResponse.json(
        { success: false, message: 'La contraseña debe tener al menos 4 caracteres.' },
        { status: 400 }
      );
    }

    if (!sql) {
      return NextResponse.json(
        { success: false, message: 'Base de datos no configurada.' },
        { status: 503 }
      );
    }

    const rows = await (sql as any).query(`
      UPDATE users
      SET password = $1
      WHERE TRIM(dni) = $2 OR id = $2
      RETURNING id, dni, name, role;
    `, [cleanPass, target]);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: `Usuario con identificador "${target}" no encontrado.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `¡Contraseña actualizada exitosamente para ${rows[0].name}!`,
      user: rows[0],
    });
  } catch (err: any) {
    console.error('Error actualizando contraseña:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Error al actualizar contraseña' },
      { status: 500 }
    );
  }
}

