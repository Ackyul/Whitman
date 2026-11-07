import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const DEFAULT_SCHEDULE = {
  entryStart: '07:00',
  entryEnd: '08:00',
  entryTolerance: '08:30',
  exitStart: '13:00',
  exitEnd: '15:00',
};

async function ensureTable() {
  if (!sql) return;
  await (sql as any).query(`
    CREATE TABLE IF NOT EXISTS attendance_schedule_settings (
      id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
      entry_start VARCHAR(10) NOT NULL DEFAULT '07:00',
      entry_end VARCHAR(10) NOT NULL DEFAULT '08:00',
      entry_tolerance VARCHAR(10) NOT NULL DEFAULT '08:30',
      exit_start VARCHAR(10) NOT NULL DEFAULT '13:00',
      exit_end VARCHAR(10) NOT NULL DEFAULT '15:00',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function GET() {
  try {
    if (!sql) {
      return NextResponse.json({ success: true, data: DEFAULT_SCHEDULE });
    }

    await ensureTable();

    const rows = await (sql as any).query(
      `SELECT entry_start as "entryStart", entry_end as "entryEnd", 
              entry_tolerance as "entryTolerance", exit_start as "exitStart", 
              exit_end as "exitEnd"
       FROM attendance_schedule_settings
       WHERE id = 'default'
       LIMIT 1;`
    );

    if (rows && rows.length > 0) {
      return NextResponse.json({ success: true, data: rows[0] });
    }

    // Si no existe, insertar defaults
    await (sql as any).query(
      `INSERT INTO attendance_schedule_settings (id, entry_start, entry_end, entry_tolerance, exit_start, exit_end)
       VALUES ('default', $1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING;`,
      [
        DEFAULT_SCHEDULE.entryStart,
        DEFAULT_SCHEDULE.entryEnd,
        DEFAULT_SCHEDULE.entryTolerance,
        DEFAULT_SCHEDULE.exitStart,
        DEFAULT_SCHEDULE.exitEnd,
      ]
    );

    return NextResponse.json({ success: true, data: DEFAULT_SCHEDULE });
  } catch (error: any) {
    console.error('Error fetching attendance schedule:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al obtener horario', data: DEFAULT_SCHEDULE },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`schedule_${clientIp}`, 20, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Demasiadas solicitudes. Espera un momento.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      entryStart = '07:00',
      entryEnd = '08:00',
      entryTolerance = '08:30',
      exitStart = '13:00',
      exitEnd = '15:00',
    } = body;

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (
      !timeRegex.test(entryStart) ||
      !timeRegex.test(entryEnd) ||
      !timeRegex.test(entryTolerance) ||
      !timeRegex.test(exitStart) ||
      !timeRegex.test(exitEnd)
    ) {
      return NextResponse.json(
        { success: false, message: 'Formato de hora inválido. Usa formato HH:MM (ej: 08:00).' },
        { status: 400 }
      );
    }

    if (!sql) {
      return NextResponse.json(
        { success: false, message: 'Base de datos no configurada' },
        { status: 500 }
      );
    }

    await ensureTable();

    await (sql as any).query(
      `INSERT INTO attendance_schedule_settings (id, entry_start, entry_end, entry_tolerance, exit_start, exit_end, updated_at)
       VALUES ('default', $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE
       SET entry_start = EXCLUDED.entry_start,
           entry_end = EXCLUDED.entry_end,
           entry_tolerance = EXCLUDED.entry_tolerance,
           exit_start = EXCLUDED.exit_start,
           exit_end = EXCLUDED.exit_end,
           updated_at = CURRENT_TIMESTAMP;`,
      [entryStart, entryEnd, entryTolerance, exitStart, exitEnd]
    );

    return NextResponse.json({
      success: true,
      message: 'Horarios de asistencia guardados correctamente en Neon DB',
      data: { entryStart, entryEnd, entryTolerance, exitStart, exitEnd },
    });
  } catch (error: any) {
    console.error('Error saving attendance schedule:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al guardar horario' },
      { status: 500 }
    );
  }
}

