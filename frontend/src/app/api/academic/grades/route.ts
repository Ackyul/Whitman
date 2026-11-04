import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const DEFAULT_GRADES = [
  { id: 'grd-prim-1', name: '1ro Primaria', level: 'PRIMARIA' },
  { id: 'grd-prim-2', name: '2do Primaria', level: 'PRIMARIA' },
  { id: 'grd-prim-3', name: '3ro Primaria', level: 'PRIMARIA' },
  { id: 'grd-prim-4', name: '4to Primaria', level: 'PRIMARIA' },
  { id: 'grd-prim-5', name: '5to Primaria', level: 'PRIMARIA' },
  { id: 'grd-prim-6', name: '6to Primaria', level: 'PRIMARIA' },
  { id: 'grd-sec-1', name: '1ro Secundaria', level: 'SECUNDARIA' },
  { id: 'grd-sec-2', name: '2do Secundaria', level: 'SECUNDARIA' },
  { id: 'grd-sec-3', name: '3ro Secundaria', level: 'SECUNDARIA' },
  { id: 'grd-sec-4', name: '4to Secundaria', level: 'SECUNDARIA' },
  { id: 'grd-sec-5', name: '5to Secundaria', level: 'SECUNDARIA' },
];

export async function GET() {
  if (sql) {
    try {
      await (sql as any).query(`
        CREATE TABLE IF NOT EXISTS academic_grades (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          level VARCHAR(30) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      let rows = await (sql as any).query(`
        SELECT id, name, level FROM academic_grades ORDER BY level, name;
      `);

      if (!rows || rows.length === 0) {
        for (const g of DEFAULT_GRADES) {
          await (sql as any).query(
            `INSERT INTO academic_grades (id, name, level) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING;`,
            [g.id, g.name, g.level]
          );
        }
        rows = await (sql as any).query(`
          SELECT id, name, level FROM academic_grades ORDER BY level, name;
        `);
      }

      return NextResponse.json({ success: true, data: rows || [] });
    } catch (err: any) {
      console.error('Error en academic_grades:', err);
    }
  }

  return NextResponse.json({ success: true, data: [] });
}

export async function POST(request: Request) {
  try {
    const { name, level = 'PRIMARIA' } = await request.json();
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return NextResponse.json({ success: false, message: 'El nombre del grado es obligatorio' }, { status: 400 });
    }

    const id = `grd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (sql) {
      await (sql as any).query(`
        CREATE TABLE IF NOT EXISTS academic_grades (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          level VARCHAR(30) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await (sql as any).query(
        `INSERT INTO academic_grades (id, name, level) VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET level = EXCLUDED.level;`,
        [id, cleanName, level]
      );
    }

    return NextResponse.json({
      success: true,
      message: `¡Grado "${cleanName}" creado correctamente!`,
      data: { id, name: cleanName, level },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');

    if (!id && !name) {
      return NextResponse.json({ success: false, message: 'ID o nombre de grado requerido' }, { status: 400 });
    }

    if (sql) {
      // Verificar si hay alumnos asignados a este grado
      const targetName = name || (await (sql as any).query(`SELECT name FROM academic_grades WHERE id = $1;`, [id]))?.[0]?.name;
      if (targetName) {
        const studentCheck = await (sql as any).query(
          `SELECT COUNT(*) as count FROM users WHERE role = 'ALUMNO' AND grade_or_class LIKE $1;`,
          [`%${targetName}%`]
        );
        const count = Number(studentCheck?.[0]?.count || 0);
        if (count > 0) {
          return NextResponse.json(
            {
              success: false,
              message: `No se puede eliminar "${targetName}" porque tiene ${count} alumno(s) matriculado(s). Primero mueve o elimina a los alumnos.`,
            },
            { status: 400 }
          );
        }

        // Eliminar también aulas asociadas al grado
        await (sql as any).query(`DELETE FROM academic_classes WHERE grade = $1;`, [targetName]);
      }

      if (id) {
        await (sql as any).query(`DELETE FROM academic_grades WHERE id = $1;`, [id]);
      } else if (name) {
        await (sql as any).query(`DELETE FROM academic_grades WHERE name = $1;`, [name]);
      }
    }

    return NextResponse.json({ success: true, message: `Grado eliminado correctamente` });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

