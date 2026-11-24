import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sanitizeString } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const courseName = searchParams.get('courseName');
    const gradeName = searchParams.get('gradeName');

    if (!sql) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Asegurar tabla de sesiones en Neon PostgreSQL
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS course_sessions (
        id VARCHAR(64) PRIMARY KEY,
        course_id VARCHAR(64),
        course_name VARCHAR(150) NOT NULL,
        grade_name VARCHAR(100) NOT NULL,
        session_number INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        topic TEXT,
        session_date DATE,
        materials JSONB DEFAULT '[]'::jsonb,
        homework TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    let query = `
      SELECT id, course_id as "courseId", course_name as "courseName",
             grade_name as "gradeName", session_number as "sessionNumber",
             title, topic, TO_CHAR(session_date, 'YYYY-MM-DD') as "date",
             materials, homework, created_at as "createdAt"
      FROM course_sessions
      WHERE 1=1
    `;
    const params: any[] = [];

    if (courseId) {
      params.push(courseId);
      query += ` AND course_id = $${params.length}`;
    }
    if (courseName) {
      params.push(`%${courseName.toLowerCase().trim()}%`);
      query += ` AND LOWER(course_name) LIKE $${params.length}`;
    }
    if (gradeName && gradeName !== 'TODOS') {
      params.push(gradeName);
      query += ` AND grade_name = $${params.length}`;
    }

    query += ` ORDER BY session_number ASC, session_date ASC;`;

    const rows = await (sql as any).query(query, params);
    return NextResponse.json({ success: true, data: rows || [] });
  } catch (err: any) {
    console.error('Error al listar sesiones:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!sql) {
      return NextResponse.json({ success: false, message: 'Base de datos no disponible' }, { status: 500 });
    }

    const body = await request.json();
    const {
      courseId,
      courseName,
      gradeName,
      sessionNumber = 1,
      title,
      topic,
      date,
      materials = [],
      homework,
    } = body;

    const cleanTitle = sanitizeString(title, 200);
    const cleanCourseName = sanitizeString(courseName, 150);
    const cleanGradeName = sanitizeString(gradeName, 100);

    if (!cleanTitle || !cleanCourseName || !cleanGradeName) {
      return NextResponse.json(
        { success: false, message: 'Título, curso y grado/ciclo son obligatorios' },
        { status: 400 }
      );
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sessionDate = date || new Date().toISOString().split('T')[0];

    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS course_sessions (
        id VARCHAR(64) PRIMARY KEY,
        course_id VARCHAR(64),
        course_name VARCHAR(150) NOT NULL,
        grade_name VARCHAR(100) NOT NULL,
        session_number INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        topic TEXT,
        session_date DATE,
        materials JSONB DEFAULT '[]'::jsonb,
        homework TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await (sql as any).query(
      `INSERT INTO course_sessions (id, course_id, course_name, grade_name, session_number, title, topic, session_date, materials, homework)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
      [
        sessionId,
        courseId || null,
        cleanCourseName,
        cleanGradeName,
        sessionNumber,
        cleanTitle,
        topic || '',
        sessionDate,
        JSON.stringify(materials),
        homework || '',
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Sesión #${sessionNumber} registrada correctamente en Neon DB`,
      data: { id: sessionId },
    });
  } catch (err: any) {
    console.error('Error al registrar sesión:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
