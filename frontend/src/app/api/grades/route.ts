import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { sanitizeString } from '@/lib/security';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const dni = searchParams.get('dni');
  const level = searchParams.get('level');
  const course = searchParams.get('course');

  if (sql) {
    try {
      await (sql as any).query(`
        CREATE TABLE IF NOT EXISTS grades (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          user_name VARCHAR(150) NOT NULL,
          user_dni VARCHAR(15) NOT NULL,
          course VARCHAR(100) NOT NULL,
          level VARCHAR(20) NOT NULL,
          grade_or_class VARCHAR(100) NOT NULL,
          evaluation_type VARCHAR(30) NOT NULL,
          title VARCHAR(150) NOT NULL,
          score NUMERIC(4, 2) NOT NULL,
          max_score NUMERIC(4, 2) DEFAULT 20.00,
          period VARCHAR(50) NOT NULL,
          teacher_name VARCHAR(150) NOT NULL,
          feedback TEXT,
          date DATE NOT NULL DEFAULT CURRENT_DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      let query = `
        SELECT id, user_id as "userId", user_name as "userName", user_dni as "userDni",
               course, level, grade_or_class as "gradeOrClass",
               evaluation_type as "evaluationType", title,
               CAST(score AS FLOAT) as score,
               CAST(max_score AS FLOAT) as "maxScore",
               period, teacher_name as "teacherName", feedback,
               TO_CHAR(date, 'YYYY-MM-DD') as date
        FROM grades
        WHERE 1=1
      `;
      const params: any[] = [];

      if (userId) {
        params.push(userId);
        query += ` AND user_id = $${params.length}`;
      }
      if (dni) {
        params.push(dni);
        query += ` AND user_dni = $${params.length}`;
      }
      if (level && level !== 'TODOS') {
        params.push(level);
        query += ` AND level = $${params.length}`;
      }
      if (course) {
        params.push(course);
        query += ` AND course = $${params.length}`;
      }

      query += ` ORDER BY date DESC, created_at DESC;`;

      const rows = await (sql as any).query(query, params);
      return NextResponse.json({ success: true, data: rows || [] });
    } catch (err: any) {
      console.error('Error al consultar notas en Neon:', err);
      return NextResponse.json({ success: false, data: [] }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, data: [] });
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`grades_${clientIp}`, 60, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Demasiadas solicitudes. Espera un momento.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      userId,
      course,
      title,
      score,
      maxScore = 20,
      evaluationType = 'PRACTICA',
      period = 'Bimestre I',
      teacherName = 'Docente Whitman',
      feedback = '',
    } = body;

    const cleanCourse = sanitizeString(course, 100);
    const cleanTitle = sanitizeString(title, 150);
    const cleanPeriod = sanitizeString(period, 50);
    const cleanTeacher = sanitizeString(teacherName, 150);
    const cleanFeedback = sanitizeString(feedback, 1000);

    if (!userId || !cleanCourse || !cleanTitle || score === undefined || score === null) {
      return NextResponse.json(
        { success: false, message: 'Alumno, curso, título y nota son obligatorios.' },
        { status: 400 }
      );
    }

    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 20) {
      return NextResponse.json(
        { success: false, message: 'La nota debe ser un número entre 0 y 20.' },
        { status: 400 }
      );
    }

    if (!sql) {
      return NextResponse.json(
        { success: false, message: 'Base de datos no configurada' },
        { status: 500 }
      );
    }

    // 1. Asegurar tabla en Neon
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS grades (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(150) NOT NULL,
        user_dni VARCHAR(15) NOT NULL,
        course VARCHAR(100) NOT NULL,
        level VARCHAR(20) NOT NULL,
        grade_or_class VARCHAR(100) NOT NULL,
        evaluation_type VARCHAR(30) NOT NULL,
        title VARCHAR(150) NOT NULL,
        score NUMERIC(4, 2) NOT NULL,
        max_score NUMERIC(4, 2) DEFAULT 20.00,
        period VARCHAR(50) NOT NULL,
        teacher_name VARCHAR(150) NOT NULL,
        feedback TEXT,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Buscar datos del estudiante en Neon
    const userRows = await (sql as any).query(
      `SELECT id, name, dni, level, grade_or_class as "gradeOrClass"
       FROM users
       WHERE id = $1 OR dni = $1
       LIMIT 1;`,
      [userId]
    );

    let student: any;
    if (!userRows || userRows.length === 0) {
      if (body.userName && body.userDni) {
        student = {
          id: userId,
          name: body.userName,
          dni: body.userDni,
          level: body.level || body.userLevel || 'COLEGIO',
          gradeOrClass: body.gradeOrClass || body.userGrade || 'Sin Aula',
        };
      } else {
        return NextResponse.json(
          { success: false, message: 'Estudiante no encontrado en la base de datos.' },
          { status: 404 }
        );
      }
    } else {
      student = userRows[0];
    }

    const gradeId = `grd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 3. Insertar nota en Neon
    await (sql as any).query(
      `INSERT INTO grades (
        id, user_id, user_name, user_dni, course, level, grade_or_class,
        evaluation_type, title, score, max_score, period, teacher_name, feedback, date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_DATE);`,
      [
        gradeId,
        student.id,
        student.name,
        student.dni,
        cleanCourse,
        student.level || 'COLEGIO',
        student.gradeOrClass || 'Sin Aula',
        evaluationType,
        cleanTitle,
        numScore,
        maxScore,
        cleanPeriod,
        cleanTeacher,
        cleanFeedback || '',
      ]
    );

    const record = {
      id: gradeId,
      userId: student.id,
      userName: student.name,
      userDni: student.dni,
      course,
      level: student.level,
      gradeOrClass: student.gradeOrClass,
      evaluationType,
      title,
      score: numScore,
      maxScore,
      period,
      teacherName,
      feedback,
      date: new Date().toISOString().split('T')[0],
    };

    return NextResponse.json({
      success: true,
      message: `¡Nota de ${numScore} registrada correctamente para ${student.name}!`,
      data: record,
    });
  } catch (err: any) {
    console.error('Error al registrar nota en Neon:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Error interno al registrar nota' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID de calificación requerido' }, { status: 400 });
    }

    if (sql) {
      await (sql as any).query(`DELETE FROM grades WHERE id = $1;`, [id]);
    }

    return NextResponse.json({ success: true, message: 'Calificación eliminada correctamente de Neon' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
