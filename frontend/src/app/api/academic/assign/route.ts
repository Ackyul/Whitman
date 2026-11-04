import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, studentId, gradeOrClass, grade, level, redistributeAll = false } = body;

    if (!sql) {
      return NextResponse.json({ success: false, message: 'Base de datos no configurada' }, { status: 500 });
    }

    // 1. ACCIÓN: MOVER ALUMNO INDIVIDUAL A OTRA CLASE O DEJAR EN 'SIN ASIGNAR'
    if (action === 'move') {
      if (!studentId || !gradeOrClass) {
        return NextResponse.json(
          { success: false, message: 'ID del alumno y nueva aula son obligatorios' },
          { status: 400 }
        );
      }

      await (sql as any).query(
        `UPDATE users SET grade_or_class = $1 WHERE id = $2;`,
        [gradeOrClass, studentId]
      );

      return NextResponse.json({
        success: true,
        message: `Alumno movido a "${gradeOrClass}" correctamente`,
      });
    }

    // 2. ACCIÓN: MEZCLA / BALANCEO AUTOMÁTICO DE ALUMNOS EN AULAS POR GRADO
    if (action === 'auto_balance') {
      if (!grade) {
        return NextResponse.json(
          { success: false, message: 'Debes especificar el grado para balancear las aulas' },
          { status: 400 }
        );
      }

      // A. Buscar aulas disponibles para este grado
      const classRows = await (sql as any).query(
        `SELECT id, code, name, grade, section, capacity
         FROM academic_classes
         WHERE active = TRUE AND grade = $1
         ORDER BY section, name;`,
        [grade]
      );

      if (!classRows || classRows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: `No hay aulas creadas para "${grade}". Primero crea al menos 2 aulas (ej: Sección A y Sección B) en la pestaña de Clases.`,
          },
          { status: 400 }
        );
      }

      // B. Buscar los alumnos del grado
      let studentQuery = `
        SELECT id, name, dni, grade_or_class
        FROM users
        WHERE role = 'ALUMNO'
      `;
      const queryParams: any[] = [];

      if (level) {
        queryParams.push(level);
        studentQuery += ` AND level = $${queryParams.length}`;
      }

      // Si no es redistribución completa, tomar solo a los 'Sin Asignar' o sin aula fija
      if (!redistributeAll) {
        queryParams.push(`%${grade}%`);
        studentQuery += ` AND (grade_or_class LIKE $${queryParams.length} AND (grade_or_class LIKE '%Sin Asignar%' OR grade_or_class = '${grade}'))`;
      } else {
        queryParams.push(`%${grade}%`);
        studentQuery += ` AND grade_or_class LIKE $${queryParams.length}`;
      }

      studentQuery += ` ORDER BY name ASC;`;

      const studentRows = await (sql as any).query(studentQuery, queryParams);

      if (!studentRows || studentRows.length === 0) {
        return NextResponse.json({
          success: false,
          message: redistributeAll
            ? `No se encontraron alumnos registrados en ${grade}.`
            : `Todos los alumnos de ${grade} ya tienen un aula asignada. Si deseas volver a barajarlos equitativamente, activa la opción "Redistribuir todos".`,
        });
      }

      // C. Mezcla equitativa Round-Robin
      // Mezclamos aleatoriamente la lista de alumnos para una distribución justa
      const shuffledStudents = [...studentRows].sort(() => Math.random() - 0.5);

      const distributionCounts: Record<string, number> = {};
      classRows.forEach((c: any) => {
        distributionCounts[c.name] = 0;
      });

      for (let i = 0; i < shuffledStudents.length; i++) {
        const targetClass = classRows[i % classRows.length];
        distributionCounts[targetClass.name] = (distributionCounts[targetClass.name] || 0) + 1;

        await (sql as any).query(
          `UPDATE users SET grade_or_class = $1 WHERE id = $2;`,
          [targetClass.name, shuffledStudents[i].id]
        );
      }

      const summaryList = Object.entries(distributionCounts)
        .map(([cName, count]) => `${cName}: ${count} alumnos`)
        .join(' • ');

      return NextResponse.json({
        success: true,
        message: `🎉 ¡Mezcla completada! Se distribuyeron ${shuffledStudents.length} alumnos equitativamente entre ${classRows.length} aulas: ${summaryList}`,
        enrolledCount: shuffledStudents.length,
        distribution: distributionCounts,
      });
    }

    return NextResponse.json({ success: false, message: 'Acción no reconocida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error en asignación / balanceo:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error interno al procesar asignaciones' },
      { status: 500 }
    );
  }
}
