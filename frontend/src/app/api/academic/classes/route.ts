import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const DEFAULT_CLASSES = [
  { id: 'c1', code: 'PRIM-1', name: '1ro Primaria - Semillas', level: 'PRIMARIA', grade: '1ro Primaria', section: 'A', shift: 'MAÑANA', active: true },
  { id: 'c2', code: 'PRIM-2', name: '2do Primaria - Exploradores', level: 'PRIMARIA', grade: '2do Primaria', section: 'A', shift: 'MAÑANA', active: true },
  { id: 'c3', code: 'PRIM-3', name: '3ro Primaria - Beta', level: 'PRIMARIA', grade: '3ro Primaria', section: 'Beta', shift: 'MAÑANA', active: true },
  { id: 'c4', code: 'PRIM-4', name: '4to Primaria - Titanes', level: 'PRIMARIA', grade: '4to Primaria', section: 'A', shift: 'MAÑANA', active: true },
  { id: 'c5', code: 'PRIM-5', name: '5to Primaria - Jaguares', level: 'PRIMARIA', grade: '5to Primaria', section: 'A', shift: 'MAÑANA', active: true },
  { id: 'c6', code: 'PRIM-6', name: '6to Primaria - Leones', level: 'PRIMARIA', grade: '6to Primaria', section: 'Leones', shift: 'MAÑANA', active: true },
  { id: 'c7', code: 'SEC-1', name: '1ro Secundaria - Alfa', level: 'SECUNDARIA', grade: '1ro Secundaria', section: 'Alfa', shift: 'MAÑANA', active: true },
  { id: 'c8', code: 'SEC-2', name: '2do Secundaria - Gamma', level: 'SECUNDARIA', grade: '2do Secundaria', section: 'Gamma', shift: 'MAÑANA', active: true },
  { id: 'c9', code: 'SEC-3', name: '3ro Secundaria - Delta', level: 'SECUNDARIA', grade: '3ro Secundaria', section: 'Delta', shift: 'MAÑANA', active: true },
  { id: 'c10', code: 'SEC-4', name: '4to Secundaria - Sigma', level: 'SECUNDARIA', grade: '4to Secundaria', section: 'Sigma', shift: 'MAÑANA', active: true },
  { id: 'c11', code: 'SEC-5', name: '5to Secundaria - Promoción 2026', level: 'SECUNDARIA', grade: '5to Secundaria', section: 'Alfa', shift: 'MAÑANA', active: true },
  { id: 'c12', code: 'ACAD-UNI', name: 'Ciclo Semianual UNI', level: 'ACADEMIA', grade: 'Semianual UNI', section: 'UNI-1', shift: 'MAÑANA', active: true },
  { id: 'c13', code: 'ACAD-SM', name: 'Ciclo Semestral San Marcos', level: 'ACADEMIA', grade: 'Semestral SM', section: 'SM-1', shift: 'TARDE', active: true },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');

  if (sql) {
    try {
      const rows = await (sql as any).query(`
        SELECT id, code, name, level, grade, section, shift, active
        FROM academic_classes
        WHERE active = TRUE
        ORDER BY level, name;
      `);
      if (rows && rows.length > 0) {
        let filtered = rows;
        if (level) {
          filtered = rows.filter((r: any) => r.level === level);
        }
        return NextResponse.json({ success: true, data: filtered });
      }
    } catch (e) {
      console.warn('Usando clases por defecto:', e);
    }
  }

  let result = DEFAULT_CLASSES;
  if (level) {
    result = DEFAULT_CLASSES.filter((c) => c.level === level);
  }

  return NextResponse.json({ success: true, data: result });
}
