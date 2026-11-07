import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { isValidDni, constantTimeCompare } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`pwd_change_${clientIp}`, 5, 300); // Máx 5 cambios cada 5 min por IP
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Demasiados intentos. Por seguridad, espera ${rateCheck.resetInSeconds} segundos para reintentar.`,
        },
        { status: 429 }
      );
    }

    const { identifier, userId, newPassword, currentPassword } = await request.json();
    const target = String(identifier || userId || '').trim();
    const cleanPass = String(newPassword || '').trim();

    if (!target) {
      return NextResponse.json(
        { success: false, message: 'DNI o ID de usuario es requerido.' },
        { status: 400 }
      );
    }

    if (!isValidDni(target)) {
      return NextResponse.json(
        { success: false, message: 'Formato de identificador inválido.' },
        { status: 400 }
      );
    }

    if (!cleanPass || cleanPass.length < 4) {
      return NextResponse.json(
        { success: false, message: 'La contraseña debe tener al menos 4 caracteres.' },
        { status: 400 }
      );
    }

    if (cleanPass.length > 100) {
      return NextResponse.json(
        { success: false, message: 'La contraseña excede la longitud máxima permitida.' },
        { status: 400 }
      );
    }

    if (!sql) {
      return NextResponse.json(
        { success: false, message: 'Base de datos no configurada.' },
        { status: 503 }
      );
    }

    // Si el usuario ya tiene contraseña configurada y se envía currentPassword, verificarla
    if (currentPassword) {
      const existingUser = await (sql as any).query(`
        SELECT id, password, dni FROM users WHERE TRIM(dni) = $1 OR id = $1 LIMIT 1;
      `, [target]);

      if (existingUser && existingUser.length > 0) {
        const currentStored = existingUser[0].password || existingUser[0].dni;
        if (!constantTimeCompare(String(currentPassword).trim(), String(currentStored).trim())) {
          return NextResponse.json(
            { success: false, message: 'La contraseña actual ingresada es incorrecta.' },
            { status: 401 }
          );
        }
      }
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

