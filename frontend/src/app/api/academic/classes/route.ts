import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { sanitizeString } from '@/lib/security';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  const grade = searchParams.get('grade');

  if (sql) {
    try {
      // Asegurarse de que la tabla academic_classes exista en Neon DB
      await (sql as any).query(`
        CREATE TABLE IF NOT EXISTS academic_classes (
          id VARCHAR(64) PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(150) NOT NULL,
          level VARCHAR(30) NOT NULL CHECK (level IN ('COLEGIO', 'ACADEMIA', 'PRIMARIA', 'SECUNDARIA')),
          grade VARCHAR(50) NOT NULL,
          section VARCHAR(50) NOT NULL,
          shift VARCHAR(20) DEFAULT 'MAÑANA',
          classroom_number VARCHAR(50),
          capacity INT DEFAULT 35,
          tutor_teacher_name VARCHAR(150),
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      let query = `
        SELECT id, code, name, level, grade, section, shift, 
               COALESCE(classroom_number, '') as "classroomNumber",
               COALESCE(capacity, 35) as capacity,
               COALESCE(tutor_teacher_name, '') as "tutorTeacherName",
               active
        FROM academic_classes
        WHERE active = TRUE AND level != 'ACADEMIA'
      `;
      const params: any[] = [];
      if (level) {
        params.push(level);
        query += ` AND level = $${params.length}`;
      }
      if (grade) {
        params.push(grade);
        query += ` AND grade = $${params.length}`;
      }
      query += ` ORDER BY level, grade, name;`;

      const rows = await (sql as any).query(query, params);
      return NextResponse.json({ success: true, data: rows || [] });
    } catch (e) {
      console.error('Error consultando academic_classes en Neon:', e);
      return NextResponse.json({ success: false, data: [] }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, data: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`classes_${clientIp}`, 40, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Demasiadas solicitudes. Espera un momento.' },
        { status: 429 }
      );
    }

    const {
      name,
      level = 'PRIMARIA',
      grade,
      section,
      shift = 'MAÑANA',
      capacity = 35,
      classroomNumber = '',
      tutorTeacherName = '',
    } = body;

    if (!grade || !section) {
      return NextResponse.json(
        { success: false, message: 'Grado y Sección son obligatorios para crear el aula' },
        { status: 400 }
      );
    }

    const fullName = name?.trim() || `${grade} - ${section}`;
    const cleanCode = `${level.slice(0, 4)}-${grade.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${section.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const id = `cls-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (sql) {
      await (sql as any).query(`
        CREATE TABLE IF NOT EXISTS academic_classes (
          id VARCHAR(64) PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(150) NOT NULL,
          level VARCHAR(30) NOT NULL CHECK (level IN ('COLEGIO', 'ACADEMIA', 'PRIMARIA', 'SECUNDARIA')),
          grade VARCHAR(50) NOT NULL,
          section VARCHAR(50) NOT NULL,
          shift VARCHAR(20) DEFAULT 'MAÑANA',
          classroom_number VARCHAR(50),
          capacity INT DEFAULT 35,
          tutor_teacher_name VARCHAR(150),
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await (sql as any).query(
        `INSERT INTO academic_classes (id, code, name, level, grade, section, shift, classroom_number, capacity, tutor_teacher_name, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           section = EXCLUDED.section,
           shift = EXCLUDED.shift,
           capacity = EXCLUDED.capacity,
           active = TRUE;`,
        [
          id,
          cleanCode,
          fullName,
          level,
          grade,
          section,
          shift,
          classroomNumber,
          Number(capacity) || 35,
          tutorTeacherName,
        ]
      );
    }

    const newClass = {
      id,
      code: cleanCode,
      name: fullName,
      level,
      grade,
      section,
      shift,
      classroomNumber,
      capacity: Number(capacity) || 35,
      tutorTeacherName,
      active: true,
    };

    return NextResponse.json({
      success: true,
      message: `¡Aula "${fullName}" guardada en Neon PostgreSQL!`,
      data: newClass,
    });
  } catch (error: any) {
    console.error('Error al crear aula en Neon:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al crear aula en la base de datos' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID de aula requerido' }, { status: 400 });
    }

    if (sql) {
      await (sql as any).query(`DELETE FROM academic_classes WHERE id = $1;`, [id]);
    }

    return NextResponse.json({ success: true, message: 'Aula eliminada correctamente de Neon DB' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
