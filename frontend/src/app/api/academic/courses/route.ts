import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');
    const level = searchParams.get('level');

    if (!sql) {
      return NextResponse.json({ success: true, data: [] });
    }

    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS courses (
        id VARCHAR(64) PRIMARY KEY,
        grade_name VARCHAR(100) NOT NULL,
        course_name VARCHAR(100) NOT NULL,
        level VARCHAR(30) NOT NULL,
        teacher_name VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    let query = `
      SELECT id, grade_name as "gradeName", course_name as "courseName",
             level, teacher_name as "teacherName", created_at as "createdAt"
      FROM courses
      WHERE 1=1
    `;
    const params: any[] = [];

    if (grade && grade !== 'TODOS') {
      params.push(grade);
      query += ` AND grade_name = $${params.length}`;
    }
    if (level && level !== 'TODOS') {
      params.push(level);
      query += ` AND level = $${params.length}`;
    }

    query += ` ORDER BY grade_name ASC, course_name ASC;`;

    const rows = await (sql as any).query(query, params);
    return NextResponse.json({ success: true, data: rows || [] });
  } catch (err: any) {
    console.error('Error al listar cursos:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gradeName, courseName, level = 'PRIMARIA', teacherName } = body;

    const cleanGrade = String(gradeName || '').trim();
    const cleanCourse = String(courseName || '').trim();

    if (!cleanGrade || !cleanCourse) {
      return NextResponse.json(
        { success: false, message: 'Grado y Nombre del curso son obligatorios.' },
        { status: 400 }
      );
    }

    if (!sql) {
      return NextResponse.json({ success: false, message: 'Base de datos no disponible' }, { status: 503 });
    }

    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS courses (
        id VARCHAR(64) PRIMARY KEY,
        grade_name VARCHAR(100) NOT NULL,
        course_name VARCHAR(100) NOT NULL,
        level VARCHAR(30) NOT NULL,
        teacher_name VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Verificar si ya existe este curso para este grado
    const existing = await (sql as any).query(`
      SELECT id FROM courses WHERE LOWER(TRIM(grade_name)) = LOWER($1) AND LOWER(TRIM(course_name)) = LOWER($2);
    `, [cleanGrade, cleanCourse]);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, message: `El curso "${cleanCourse}" ya está registrado para el grado ${cleanGrade}.` },
        { status: 400 }
      );
    }

    const courseId = `crs-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await (sql as any).query(`
      INSERT INTO courses (id, grade_name, course_name, level, teacher_name)
      VALUES ($1, $2, $3, $4, $5);
    `, [courseId, cleanGrade, cleanCourse, level, teacherName || null]);

    const newCourse = {
      id: courseId,
      gradeName: cleanGrade,
      courseName: cleanCourse,
      level,
      teacherName: teacherName || null,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: `¡Curso "${cleanCourse}" agregado exitosamente al grado ${cleanGrade}!`,
      data: newCourse,
    });
  } catch (err: any) {
    console.error('Error al crear curso:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID del curso requerido' }, { status: 400 });
    }

    if (sql) {
      await (sql as any).query(`DELETE FROM courses WHERE id = $1;`, [id]);
    }

    return NextResponse.json({ success: true, message: 'Curso eliminado del grado' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

