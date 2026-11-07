import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { isValidDni, sanitizeString } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`enroll_${clientIp}`, 40, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Demasiadas solicitudes. Espera un momento.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      dni,
      name,
      level = 'PRIMARIA',
      gradeOrClass = '6to Primaria - Leones',
      phone,
      email,
      password,
      motherDni,
      motherName,
      motherPhone,
      fatherDni,
      fatherName,
      fatherPhone,
      parentDni,
      parentName,
      parentPhone,
      parentRelationship,
    } = body;

    const cleanDni = String(dni || '').trim();
    const cleanName = sanitizeString(name, 150);
    const studentPassword = String(password || cleanDni).trim();
    const hasFamily = (motherDni && String(motherDni).trim()) || (fatherDni && String(fatherDni).trim()) || (parentDni && String(parentDni).trim());

    if (!cleanDni || !cleanName || !hasFamily) {
      return NextResponse.json(
        {
          success: false,
          message: 'DNI, Nombre del alumno y al menos un DNI familiar (Madre, Padre o Apoderado) son obligatorios.',
        },
        { status: 400 }
      );
    }

    if (!isValidDni(cleanDni)) {
      return NextResponse.json(
        { success: false, message: 'Formato de DNI de alumno inválido.' },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    const studentCode = `WHT-${year}-${rand}`;
    const userId = `u-alu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const effectiveParentDni = parentDni?.trim() || motherDni?.trim() || fatherDni?.trim() || undefined;
    const effectiveParentName = parentName?.trim() || motherName?.trim() || fatherName?.trim() || `Apoderado de ${cleanName}`;
    const effectiveParentPhone = parentPhone?.trim() || motherPhone?.trim() || fatherPhone?.trim() || phone || undefined;
    const effectiveRelationship = parentRelationship?.trim() || (motherDni ? 'Madre' : fatherDni ? 'Padre' : 'Apoderado');

    const newUser = {
      id: userId,
      dni: cleanDni,
      studentCode,
      name: cleanName,
      email: email || `${cleanDni}@whitman.edu.pe`,
      role: 'ALUMNO',
      level,
      gradeOrClass,
      phone: phone || null,
      motherDni: motherDni?.trim() || null,
      motherName: motherName?.trim() || null,
      motherPhone: motherPhone?.trim() || null,
      fatherDni: fatherDni?.trim() || null,
      fatherName: fatherName?.trim() || null,
      fatherPhone: fatherPhone?.trim() || null,
      parentDni: effectiveParentDni || null,
      parentName: effectiveParentName || null,
      parentPhone: effectiveParentPhone || null,
      parentRelationship: effectiveRelationship || null,
      active: true,
      createdAt: new Date().toISOString(),
    };

    if (sql) {
      try {
        await (sql as any).query(`
          INSERT INTO users (
            id, dni, student_code, name, email, role, level, grade_or_class,
            mother_dni, mother_name, mother_phone,
            father_dni, father_name, father_phone,
            parent_dni, parent_name, parent_phone, parent_relationship,
            active, password
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (dni) DO UPDATE SET
            name = EXCLUDED.name,
            level = EXCLUDED.level,
            grade_or_class = EXCLUDED.grade_or_class,
            mother_dni = EXCLUDED.mother_dni,
            mother_name = EXCLUDED.mother_name,
            mother_phone = EXCLUDED.mother_phone,
            father_dni = EXCLUDED.father_dni,
            father_name = EXCLUDED.father_name,
            father_phone = EXCLUDED.father_phone,
            parent_dni = EXCLUDED.parent_dni,
            parent_name = EXCLUDED.parent_name,
            parent_phone = EXCLUDED.parent_phone,
            parent_relationship = EXCLUDED.parent_relationship,
            password = COALESCE(EXCLUDED.password, users.password);
        `, [
          newUser.id,
          newUser.dni,
          newUser.studentCode,
          newUser.name,
          newUser.email,
          newUser.role,
          newUser.level,
          newUser.gradeOrClass,
          newUser.motherDni,
          newUser.motherName,
          newUser.motherPhone,
          newUser.fatherDni,
          newUser.fatherName,
          newUser.fatherPhone,
          newUser.parentDni,
          newUser.parentName,
          newUser.parentPhone,
          newUser.parentRelationship,
          newUser.active,
          studentPassword,
        ]);
      } catch (dbErr) {
        console.error('Error insertando en Neon DB desde Next.js:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `¡Alumno ${newUser.name} matriculado exitosamente con código ${newUser.studentCode}!`,
      data: { user: newUser },
    });
  } catch (err: any) {
    console.error('Error en POST /api/academic/enroll:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Error al procesar la matrícula' },
      { status: 500 }
    );
  }
}

