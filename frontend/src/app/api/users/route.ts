import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  if (sql) {
    try {
      const rows = await (sql as any).query(`
        SELECT id, dni, student_code as "studentCode", name, email, role, level, grade_or_class as "gradeOrClass",
               mother_dni as "motherDni", mother_name as "motherName", mother_phone as "motherPhone",
               father_dni as "fatherDni", father_name as "fatherName", father_phone as "fatherPhone",
               parent_dni as "parentDni", parent_name as "parentName", parent_phone as "parentPhone",
               active, created_at as "createdAt"
        FROM users
        ORDER BY created_at DESC;
      `);
      return NextResponse.json({ success: true, data: rows || [] });
    } catch (err) {
      console.error('Error consultando usuarios en Neon:', err);
    }
  }

  return NextResponse.json({ success: true, data: [] });
}
