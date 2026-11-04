import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const DEFAULT_CLASSES = [
  { id: 'c1', code: 'PRIM-1-A', name: '1ro Primaria - Semillas', level: 'PRIMARIA', grade: '1ro Primaria', section: 'A', shift: 'MAÑANA', capacity: 35, active: true },
  { id: 'c2', code: 'PRIM-2-A', name: '2do Primaria - Exploradores', level: 'PRIMARIA', grade: '2do Primaria', section: 'A', shift: 'MAÑANA', capacity: 35, active: true },
  { id: 'c3', code: 'PRIM-3-BETA', name: '3ro Primaria - Beta', level: 'PRIMARIA', grade: '3ro Primaria', section: 'Beta', shift: 'MAÑANA', capacity: 35, active: true },
  { id: 'c4', code: 'PRIM-4-A', name: '4to Primaria - Titanes', level: 'PRIMARIA', grade: '4to Primaria', section: 'A', shift: 'MAÑANA', capacity: 35, active: true },
  { id: 'c5', code: 'PRIM-5-A', name: '5to Primaria - Jaguares', level: 'PRIMARIA', grade: '5to Primaria', section: 'A', shift: 'MAÑANA', capacity: 35, active: true },
  { id: 'c6', code: 'PRIM-6-LEO', name: '6to Primaria - Leones', level: 'PRIMARIA', grade: '6to Primaria', section: 'Leones', shift: 'MAÑANA', capacity: 35, active: true },
  { id: 'c7', code: 'SEC-1-ALF', name: '1ro Secundaria - Alfa', level: 'SECUNDARIA', grade: '1ro Secundaria', section: 'Alfa', shift: 'MAÑANA', capacity: 35, active: true },
  { id: 'c8', code: 'SEC-2-GAM', name: '2do Secundaria - Gamma', level: 'SECUNDARIA', grade: '2do Secundaria', section: 'Gamma', shift: 'MAÑANA', capacity: 35, active: true },
  { id: 'c9', code: 'SEC-3-DEL', name: '3ro Secundaria - Delta', level: 'SECUNDARIA', grade: '3ro Secundaria', section: 'Delta', shift: 'MAÑANA', capacity: 35, active: true },
  { id: 'c10', code: 'SEC-4-SIG', name: '4to Secundaria - Sigma', level: 'SECUNDARIA', grade: '4to Secundaria', section: 'Sigma', shift: 'MAÑANA', capacity: 35, active: true },
  { id: 'c11', code: 'SEC-5-PROM', name: '5to Secundaria - Promoción 2026', level: 'SECUNDARIA', grade: '5to Secundaria', section: 'Alfa', shift: 'MAÑANA', capacity: 35, active: true },
  { id: 'c12', code: 'ACAD-UNI', name: 'Ciclo Semianual UNI', level: 'ACADEMIA', grade: 'Preuniversitario UNI', section: 'UNI-1', shift: 'MAÑANA', capacity: 50, active: true },
  { id: 'c13', code: 'ACAD-SM', name: 'Ciclo Semestral San Marcos', level: 'ACADEMIA', grade: 'Preuniversitario San Marcos', section: 'SM-1', shift: 'TARDE', capacity: 50, active: true },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  const grade = searchParams.get('grade');

  if (sql) {
    try {
      let query = `
        SELECT id, code, name, level, grade, section, shift, 
               COALESCE(classroom_number, '') as "classroomNumber",
               COALESCE(capacity, 35) as capacity,
               COALESCE(tutor_teacher_name, '') as "tutorTeacherName",
               active
        FROM academic_classes
        WHERE active = TRUE
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
      if (rows && rows.length > 0) {
        return NextResponse.json({ success: true, data: rows });
      }
    } catch (e) {
      console.warn('Error consultando academic_classes en Neon, usando fallback:', e);
    }
  }

  let result = DEFAULT_CLASSES;
  if (level) {
    result = result.filter((c) => c.level === level);
  }
  if (grade) {
    result = result.filter((c) => c.grade === grade);
  }

  return NextResponse.json({ success: true, data: result });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
      // Asegurarse de que la tabla academic_classes exista
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
      message: `¡Aula "${fullName}" creada exitosamente!`,
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

    return NextResponse.json({ success: true, message: 'Aula eliminada correctamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
