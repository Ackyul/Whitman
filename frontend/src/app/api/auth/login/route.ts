import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { identifier, role = 'ALUMNO' } = await request.json();
    const cleanId = String(identifier || '').trim();

    if (!cleanId) {
      return NextResponse.json(
        { success: false, message: 'Por favor ingresa tu número de DNI o código.' },
        { status: 400 }
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

      return NextResponse.json({
        success: true,
        message: `¡Bienvenido(a) ${relTitle} ${parentUser.name}!`,
        user: parentUser,
        linkedStudents: rows,
      });
    }

    // 2. Caso: ALUMNO
    if (role === 'ALUMNO') {
      const rows = await (sql as any).query(`
        SELECT id, dni, student_code as "studentCode", name, email, role, level, grade_or_class as "gradeOrClass",
               active, created_at as "createdAt"
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
      return NextResponse.json({
        success: true,
        message: `¡Bienvenido León ${student.name}!`,
        user: student,
      });
    }

    // 3. Caso: DOCENTE
    const staffRows = await (sql as any).query(`
      SELECT id, dni, name, email, role, hierarchy, hierarchy_title as "hierarchyTitle", level, grade_or_class as "gradeOrClass", active
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
    return NextResponse.json({
      success: true,
      message: `¡Bienvenido ${staff.name}!`,
      user: staff,
    });
  } catch (err: any) {
    console.error('Error en login route:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Error en servidor' },
      { status: 500 }
    );
  }
}

