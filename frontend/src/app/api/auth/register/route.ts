import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { isValidDni, sanitizeString } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`register_${clientIp}`, 30, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Demasiadas solicitudes. Espera un momento.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      dni,
      name,
      role = 'ALUMNO',
      level = 'SECUNDARIA',
      gradeOrClass = 'Todas las aulas',
      phone,
      email,
      password,
      parentDni,
      parentName,
      parentPhone,
    } = body;

    const cleanDni = String(dni || '').trim();
    const cleanName = sanitizeString(name, 150);
    const targetRole = ['DOCENTE', 'PADRE', 'ALUMNO'].includes(role) ? role : 'ALUMNO';

    if (!cleanDni || !cleanName) {
      return NextResponse.json(
        { success: false, message: 'El DNI y Nombre son obligatorios.' },
        { status: 400 }
      );
    }

    if (!isValidDni(cleanDni)) {
      return NextResponse.json(
        { success: false, message: 'Formato de DNI inválido.' },
        { status: 400 }
      );
    }

    const userPassword = String(password || cleanDni).trim();
    const year = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    const studentCode = targetRole === 'ALUMNO' ? `WHT-${year}-${rand}` : undefined;
    const userId = `u-${targetRole.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const domain = targetRole === 'DOCENTE' ? 'docentes' : targetRole === 'PADRE' ? 'apoderados' : 'alumnos';
    const userEmail = email?.trim() || `${cleanDni}@${domain}.whitman.edu.pe`;

    const newUser = {
      id: userId,
      dni: cleanDni,
      studentCode: studentCode || null,
      name: cleanName,
      email: userEmail,
      role: targetRole,
      level: level || 'SECUNDARIA',
      gradeOrClass: gradeOrClass || 'Todas las aulas',
      phone: phone || null,
      parentDni: parentDni?.trim() || null,
      parentName: parentName?.trim() || null,
      parentPhone: parentPhone?.trim() || null,
      active: true,
      createdAt: new Date().toISOString(),
    };

    if (sql) {
      await (sql as any).query(`
        INSERT INTO users (
          id, dni, student_code, name, email, role, level, grade_or_class,
          phone, parent_dni, parent_name, parent_phone, password, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
        ON CONFLICT (dni, role) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          level = EXCLUDED.level,
          grade_or_class = EXCLUDED.grade_or_class,
          phone = EXCLUDED.phone,
          parent_dni = EXCLUDED.parent_dni,
          parent_name = EXCLUDED.parent_name,
          parent_phone = EXCLUDED.parent_phone,
          password = COALESCE(EXCLUDED.password, users.password),
          active = true;
      `, [
        newUser.id,
        newUser.dni,
        newUser.studentCode,
        newUser.name,
        newUser.email,
        newUser.role,
        newUser.level,
        newUser.gradeOrClass,
        newUser.phone,
        newUser.parentDni,
        newUser.parentName,
        newUser.parentPhone,
        userPassword,
      ]);
    }

    return NextResponse.json({
      success: true,
      message: `¡Registro exitoso como ${targetRole}!`,
      user: newUser,
    });
  } catch (err: any) {
    console.error('Error en POST /api/auth/register:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Error al procesar el registro' },
      { status: 500 }
    );
  }
}
