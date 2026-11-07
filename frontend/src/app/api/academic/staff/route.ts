import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { isValidDni, sanitizeString } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`staff_create_${clientIp}`, 30, 60);
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
      email,
      hierarchy = 'PROFESOR',
      hierarchyTitle = 'Profesor(a)',
      level = 'SECUNDARIA',
      gradeOrClass = 'Todas las aulas',
      phone,
      password,
    } = body;

    const cleanDni = String(dni || '').trim();
    const cleanName = sanitizeString(name, 150);

    if (!cleanDni || !cleanName) {
      return NextResponse.json(
        { success: false, message: 'DNI y Nombre son obligatorios para el personal.' },
        { status: 400 }
      );
    }

    if (!isValidDni(cleanDni)) {
      return NextResponse.json(
        { success: false, message: 'Formato de DNI inválido.' },
        { status: 400 }
      );
    }

    const staffPassword = String(password || cleanDni).trim();
    const role = hierarchy === 'DIRECTOR' ? 'ADMIN' : 'DOCENTE';
    const userId = `u-staff-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const staffEmail = email?.trim() || `${cleanDni}@docentes.whitman.edu.pe`;

    if (sql) {
      await (sql as any).query(`
        INSERT INTO users (
          id, dni, name, email, role, hierarchy, hierarchy_title,
          level, grade_or_class, phone, password, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        ON CONFLICT (dni) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          hierarchy = EXCLUDED.hierarchy,
          hierarchy_title = EXCLUDED.hierarchy_title,
          level = EXCLUDED.level,
          grade_or_class = EXCLUDED.grade_or_class,
          phone = EXCLUDED.phone,
          password = COALESCE(EXCLUDED.password, users.password),
          active = true;
      `, [
        userId,
        cleanDni,
        cleanName,
        staffEmail,
        role,
        hierarchy,
        hierarchyTitle,
        level,
        gradeOrClass,
        phone || null,
        staffPassword,
      ]);
    }

    const newStaff = {
      id: userId,
      dni: cleanDni,
      name: cleanName,
      email: staffEmail,
      role,
      hierarchy,
      hierarchyTitle,
      level,
      gradeOrClass,
      phone: phone || null,
      active: true,
      hasPassword: true,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: `¡Personal ${cleanName} (${hierarchyTitle}) registrado correctamente en Neon DB!`,
      data: { user: newStaff },
    });
  } catch (err: any) {
    console.error('Error en POST /api/academic/staff:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Error al registrar personal' },
      { status: 500 }
    );
  }
}

