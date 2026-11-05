import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dni, method = 'BARCODE_SCAN', customStatus, notes, scanType = 'INGRESO' } = body;

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

    // 0. Asegurar esquema de tabla y columna exit_time en Neon DB
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(150) NOT NULL,
        user_dni VARCHAR(15) NOT NULL,
        level VARCHAR(20) NOT NULL CHECK (level IN ('COLEGIO', 'ACADEMIA', 'PRIMARIA', 'SECUNDARIA')),
        grade_or_class VARCHAR(100) NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        time VARCHAR(20) NOT NULL,
        exit_time VARCHAR(20),
        status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENTE', 'TARDANZA', 'FALTA', 'JUSTIFICADO')),
        method VARCHAR(30) NOT NULL DEFAULT 'QR',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await (sql as any).query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS exit_time VARCHAR(20);`);
    } catch {
      // Ignorar si la columna ya existe
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

    // 2.1 Obtener configuración de horario de asistencia de Neon DB
    let schedule = {
      entryStart: '07:00',
      entryEnd: '08:00',
      entryTolerance: '08:30',
      exitStart: '13:00',
      exitEnd: '15:00',
    };

    try {
      const schedRows = await (sql as any).query(
        `SELECT entry_start as "entryStart", entry_end as "entryEnd", 
                entry_tolerance as "entryTolerance", exit_start as "exitStart", 
                exit_end as "exitEnd"
         FROM attendance_schedule_settings
         WHERE id = 'default'
         LIMIT 1;`
      );
      if (schedRows && schedRows.length > 0) {
        schedule = schedRows[0];
      }
    } catch {
      // Ignorar si la tabla aún se está creando
    }

    const timeHHMM = timeStr.slice(0, 5); // ej. "07:45"
    let isExit = scanType === 'SALIDA';

    // 3. Buscar si ya existe un registro de asistencia para este alumno el día de hoy
    const existingRows = await (sql as any).query(
      `SELECT id, user_id as "userId", user_name as "userName", user_dni as "userDni",
              level, grade_or_class as "gradeOrClass", TO_CHAR(date, 'YYYY-MM-DD') as date,
              time, exit_time as "exitTime", status, method, notes
       FROM attendance
       WHERE (user_id = $1 OR user_dni = $2) AND date = $3::date
       ORDER BY time DESC
       LIMIT 1;`,
      [user.id, user.dni, dateStr]
    );

    const existingRecord = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    // "Solo para que marquen": Determinación inteligente de Entrada vs Salida
    if (scanType === 'AUTO' || !scanType) {
      if (existingRecord && !existingRecord.exitTime) {
        // Ya marcó entrada hoy: si la hora es >= inicio de salida o pasó la tolerancia de entrada, es SALIDA
        if (timeHHMM >= schedule.exitStart || timeHHMM > schedule.entryTolerance) {
          isExit = true;
        } else {
          isExit = false;
        }
      } else if (!existingRecord) {
        // No tiene entrada hoy: si es hora de salida, marca salida directo, si no entrada
        if (timeHHMM >= schedule.exitStart) {
          isExit = true;
        } else {
          isExit = false;
        }
      }
    }

    // CASO A: REGISTRO DE SALIDA
    if (isExit) {
      if (existingRecord) {
        // Actualizar registro existente con hora de salida
        const exitNotes = notes || (existingRecord.notes ? `${existingRecord.notes} • Salida registrada: ${timeStr}` : `Salida registrada en portería a las ${timeStr}`);
        
        await (sql as any).query(
          `UPDATE attendance
           SET exit_time = $1, notes = $2
           WHERE id = $3;`,
          [timeStr, exitNotes, existingRecord.id]
        );

        const updatedRecord = {
          ...existingRecord,
          exitTime: timeStr,
          scanType: 'SALIDA',
          notes: exitNotes,
        };

        return NextResponse.json({
          success: true,
          message: `¡Salida registrada para ${user.name} a las ${timeStr}!`,
          data: updatedRecord,
          user,
        });
      } else {
        // Alumno no marcó entrada matutina, pero marca su salida
        const recordId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const exitNotes = notes || `Salida registrada en garita a las ${timeStr}`;

        await (sql as any).query(
          `INSERT INTO attendance (id, user_id, user_name, user_dni, level, grade_or_class, date, time, exit_time, status, method, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
          [
            recordId,
            user.id,
            user.name,
            user.dni,
            user.level || 'COLEGIO',
            user.gradeOrClass || 'Sin Aula Asignada',
            dateStr,
            timeStr,
            timeStr,
            'PRESENTE',
            method,
            exitNotes,
          ]
        );

        const newExitRecord = {
          id: recordId,
          userId: user.id,
          userName: user.name,
          userDni: user.dni,
          level: user.level,
          gradeOrClass: user.gradeOrClass,
          date: dateStr,
          time: timeStr,
          exitTime: timeStr,
          scanType: 'SALIDA',
          status: 'PRESENTE',
          method,
          notes: exitNotes,
        };

        return NextResponse.json({
          success: true,
          message: `¡Salida registrada para ${user.name} a las ${timeStr}!`,
          data: newExitRecord,
          user,
        });
      }
    }

    // CASO B: REGISTRO DE INGRESO (ENTRADA)
    if (existingRecord) {
      // El alumno ya había registrado ingreso hoy
      return NextResponse.json({
        success: true,
        message: `${user.name} ya registró su ingreso a las ${existingRecord.time} [${existingRecord.status}]`,
        data: {
          ...existingRecord,
          scanType: 'INGRESO',
        },
        user,
        alreadyMarked: true,
      });
    }

    // Determinar tardanza según horario configurado (entryEnd)
    let status = customStatus || 'PRESENTE';
    if (!customStatus) {
      if (timeHHMM <= schedule.entryEnd) {
        status = 'PRESENTE';
      } else {
        status = 'TARDANZA';
      }
    }

    const recordId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const finalNotes =
      notes ||
      (status === 'TARDANZA'
        ? 'Ingreso registrado con tardanza en portería'
        : 'Ingreso puntual registrado con pistola lectora');

    // Insertar nuevo ingreso en tabla attendance
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
      exitTime: undefined,
      scanType: 'INGRESO',
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
