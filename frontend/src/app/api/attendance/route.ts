import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const date = searchParams.get('date');

  if (sql) {
    try {
      let query = `
        SELECT id, user_id as "userId", user_name as "userName", user_dni as "userDni",
               level, grade_or_class as "gradeOrClass", date, time, status, method, notes
        FROM attendance
        WHERE 1=1
      `;
      const params: any[] = [];
      if (userId) {
        params.push(userId);
        query += ` AND user_id = $${params.length}`;
      }
      if (date) {
        params.push(date);
        query += ` AND date = $${params.length}`;
      }
      query += ` ORDER BY date DESC, time DESC;`;

      const rows = await (sql as any).query(query, params);
      return NextResponse.json({ success: true, data: rows || [] });
    } catch (err) {
      console.error('Error consultando asistencia en Neon:', err);
    }
  }

  return NextResponse.json({ success: true, data: [] });
}
