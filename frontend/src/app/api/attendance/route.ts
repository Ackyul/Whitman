import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const date = searchParams.get('date');

  if (sql) {
    try {
      // Asegurarse de que la tabla attendance exista con la columna exit_time
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
      } catch (colErr) {
        // Ignorar si ya existe
      }

      let query = `
        SELECT id, user_id as "userId", user_name as "userName", user_dni as "userDni",
               level, grade_or_class as "gradeOrClass", 
               TO_CHAR(date, 'YYYY-MM-DD') as date, 
               time, 
               COALESCE(exit_time, '') as "exitTime",
               status, method, notes
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

