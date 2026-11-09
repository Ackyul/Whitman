import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { checkRateLimit, resetRateLimit, getClientIp } from '@/lib/rateLimit';
import { isValidDni, constantTimeCompare } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const { identifier, password, role = 'ALUMNO' } = await request.json();
    const cleanId = String(identifier || '').trim();

    if (!cleanId) {
      return NextResponse.json(
        { success: false, message: 'Por favor ingresa tu número de DNI o código.' },
        { status: 400 }
      );
    }

    if (!isValidDni(cleanId)) {
      return NextResponse.json(
        { success: false, message: 'El formato de DNI o código no es válido.' },
        { status: 400 }
      );
    }

    // 0. Protección contra fuerza bruta y ataques automatizados
    const clientIp = getClientIp(request);
    const rateLimitKey = `auth_${clientIp}_${cleanId}`;
    const rateCheck = checkRateLimit(rateLimitKey, 7, 300); // Máximo 7 intentos cada 5 minutos

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Demasiados intentos fallidos. Por seguridad institucional, tu acceso está temporalmente pausado. Intenta de nuevo en ${rateCheck.resetInSeconds} segundos.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.resetInSeconds) },
        }
      );
    }

    if (!sql) {
      return NextResponse.json(
        { success: false, message: 'Base de datos no configurada.' },
        { status: 503 }
      );
    }

    // 1. Caso: PADRE / MADRE / APODERADO
    if (role === 'PADRE') {
      const rows = await (sql as any).query(`
        SELECT id, dni, student_code as "studentCode", name, email, role, level, grade_or_class as "gradeOrClass",
               mother_dni as "motherDni", mother_name as "motherName", mother_phone as "motherPhone",
               father_dni as "fatherDni", father_name as "fatherName", father_phone as "fatherPhone",
               parent_dni as "parentDni", parent_name as "parentName", parent_phone as "parentPhone",
               parent_relationship as "parentRelationship"
        FROM users
        WHERE TRIM(mother_dni) = $1
           OR TRIM(father_dni) = $1
           OR TRIM(parent_dni) = $1
        ORDER BY name ASC;
      `, [cleanId]);

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: `No se encontró ningún estudiante vinculado al DNI de familiar "${cleanId}".`,
            suggestion: 'Verifica que el alumno haya sido matriculado con este DNI en la sección B de matrícula.',
          },
          { status: 404 }
        );
      }

      const firstChild = rows[0];
      const isMother = firstChild.motherDni?.trim() === cleanId;
      const isFather = firstChild.fatherDni?.trim() === cleanId;
      const relTitle = isMother ? 'Madre' : isFather ? 'Padre' : (firstChild.parentRelationship || 'Apoderado');
      const guardianName = isMother ? firstChild.motherName : isFather ? firstChild.fatherName : firstChild.parentName;

      const parentUser = {
        id: `family-${cleanId}`,
        dni: cleanId,
        name: guardianName || `${relTitle} de ${firstChild.name}`,
        email: `${cleanId}@apoderados.whitman.edu.pe`,
        role: 'PADRE',
        hierarchyTitle: relTitle,
        level: firstChild.level,
        gradeOrClass: `${relTitle} - ${firstChild.gradeOrClass}`,
        active: true,
        createdAt: new Date().toISOString(),
      };

      const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      try {
        await (sql as any).query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_session_token VARCHAR(128);`);
        await (sql as any).query(`
          UPDATE users SET current_session_token = $1
          WHERE TRIM(mother_dni) = $2 OR TRIM(father_dni) = $2 OR TRIM(parent_dni) = $2;
        `, [sessionToken, cleanId]);
      } catch (tokErr) {
        console.warn('Error guardando sessionToken para padre:', tokErr);
      }

      resetRateLimit(rateLimitKey);
      return NextResponse.json({
        success: true,
        message: `¡Bienvenido(a) ${relTitle} ${parentUser.name}!`,
        user: parentUser,
        linkedStudents: rows,
        sessionToken,
      });
    }

    // 2. Caso: ALUMNO
    if (role === 'ALUMNO') {
      const cleanPass = String(password || '').trim();
      if (!cleanPass) {
        return NextResponse.json(
          { success: false, message: 'Por favor ingresa tu contraseña de estudiante.' },
          { status: 400 }
        );
      }

      const rows = await (sql as any).query(`
        SELECT id, dni, student_code as "studentCode", name, email, role, level, grade_or_class as "gradeOrClass",
               password, active, created_at as "createdAt"
        FROM users
        WHERE (TRIM(dni) = $1 OR LOWER(TRIM(student_code)) = LOWER($1))
          AND role = 'ALUMNO'
        LIMIT 1;
      `, [cleanId]);

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: `No se encontró ningún estudiante con el DNI o Código "${cleanId}".`,
          },
          { status: 404 }
        );
      }

      const student = rows[0];
      const expectedPass = String(student.password || student.dni || '').trim();
      if (!constantTimeCompare(cleanPass, expectedPass)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Contraseña incorrecta. (Si es tu primera vez, tu contraseña inicial es tu número de DNI).',
          },
          { status: 401 }
        );
      }

      const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      try {
        await (sql as any).query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_session_token VARCHAR(128);`);
        await (sql as any).query(`UPDATE users SET current_session_token = $1 WHERE id = $2;`, [sessionToken, student.id]);
      } catch (tokErr) {
        console.warn('Error guardando sessionToken para alumno:', tokErr);
      }

      resetRateLimit(rateLimitKey);
      delete student.password;
      return NextResponse.json({
        success: true,
        message: `¡Bienvenido León ${student.name}!`,
        user: student,
        sessionToken,
      });
    }

    // 3. Caso: DOCENTE
    const cleanStaffPass = String(password || '').trim();
    if (!cleanStaffPass) {
      return NextResponse.json(
        { success: false, message: 'Por favor ingresa tu contraseña de docente.' },
        { status: 400 }
      );
    }

    const staffRows = await (sql as any).query(`
      SELECT id, dni, name, email, role, hierarchy, hierarchy_title as "hierarchyTitle", level, grade_or_class as "gradeOrClass", password, active
      FROM users
      WHERE TRIM(dni) = $1 AND (role = 'DOCENTE' OR role = 'ADMIN')
      LIMIT 1;
    `, [cleanId]);

    if (!staffRows || staffRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `No se encontró personal docente con el DNI "${cleanId}".`,
        },
        { status: 404 }
      );
    }

    const staff = staffRows[0];
    const expectedStaffPass = String(staff.password || staff.dni || '').trim();
    if (!constantTimeCompare(cleanStaffPass, expectedStaffPass)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Contraseña incorrecta. (Si es tu primera vez, tu contraseña inicial es tu DNI).',
        },
        { status: 401 }
      );
    }

    const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    try {
      await (sql as any).query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_session_token VARCHAR(128);`);
      await (sql as any).query(`UPDATE users SET current_session_token = $1 WHERE id = $2;`, [sessionToken, staff.id]);
    } catch (tokErr) {
      console.warn('Error guardando sessionToken para staff:', tokErr);
    }

    resetRateLimit(rateLimitKey);
    delete staff.password;
    return NextResponse.json({
      success: true,
      message: `¡Bienvenido ${staff.name}!`,
      user: staff,
      sessionToken,
    });
  } catch (err: any) {
    console.error('Error en login route:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Error en servidor' },
      { status: 500 }
    );
  }
}

