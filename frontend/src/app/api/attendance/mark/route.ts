import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dni, method = 'BARCODE_SCAN', customStatus, notes } = body;

    const cleanDni = String(dni || '').trim();
    if (!cleanDni) {
      return NextResponse.json(
        { success: false, message: 'DNI es obligatorio para registrar asistencia' },
        { status: 400 }
      );
    }

    if (!sql) {
      return NextResponse.json(
        { success: false, message: 'Base de datos no configurada' },
        { status: 500 }
      );
    }

    // 1. Buscar estudiante o usuario por DNI o Código en Neon DB
    const userRows = await (sql as any).query(
      `SELECT id, name, dni, email, role, level, grade_or_class as "gradeOrClass", 
              avatar, student_code as "studentCode"
       FROM users 
       WHERE dni = $1 OR student_code = $1
       LIMIT 1;`,
      [cleanDni]
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `No se encontró ningún estudiante con DNI o Carnet ${cleanDni} en la base de Whitman`,
        },
        { status: 404 }
      );
    }

    const user = userRows[0];

    // 2. Determinar hora y fecha (Zona horaria Perú UTC-5)
    const now = new Date();
    // Obtener componentes en hora peruana
    const peruTimeFormatter = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const peruDateFormatter = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const timeStr = peruTimeFormatter.format(now);
    const dateParts = peruDateFormatter.formatToParts(now);
    const yyyy = dateParts.find((p) => p.type === 'year')?.value;
    const mm = dateParts.find((p) => p.type === 'month')?.value;
    const dd = dateParts.find((p) => p.type === 'day')?.value;
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // Determinar tardanza (Límite: 08:05:00)
    let status = customStatus || 'PRESENTE';
    if (!customStatus) {
      const [h, m] = timeStr.split(':').map(Number);
      if (h > 8 || (h === 8 && m > 5)) {
        status = 'TARDANZA';
      } else {
        status = 'PRESENTE';
      }
    }

    const recordId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const finalNotes =
      notes ||
      (status === 'TARDANZA'
        ? 'Ingreso registrado con tardanza en portería'
        : 'Ingreso puntual registrado con pistola lectora');

    // 3. Insertar en tabla attendance
    await (sql as any).query(
      `INSERT INTO attendance (id, user_id, user_name, user_dni, level, grade_or_class, date, time, status, method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
      [
        recordId,
        user.id,
        user.name,
        user.dni,
        user.level || 'COLEGIO',
        user.gradeOrClass || 'Sin Aula Asignada',
        dateStr,
        timeStr,
        status,
        method,
        finalNotes,
      ]
    );

    const record = {
      id: recordId,
      userId: user.id,
      userName: user.name,
      userDni: user.dni,
      level: user.level,
      gradeOrClass: user.gradeOrClass,
      date: dateStr,
      time: timeStr,
      status,
      method,
      notes: finalNotes,
    };

    return NextResponse.json({
      success: true,
      message: `¡Asistencia registrada para ${user.name}! [${status}]`,
      data: record,
      user,
    });
  } catch (error: any) {
    console.error('Error al registrar asistencia en Neon:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error interno al registrar asistencia' },
      { status: 500 }
    );
  }
}

