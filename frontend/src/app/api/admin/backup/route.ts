import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { authenticateRequest, constantTimeCompare, recordAuditLog } from '@/lib/security';
import { getClientIp, checkRateLimit } from '@/lib/rateLimit';

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`backup_${clientIp}`, 10, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Demasiadas solicitudes de respaldo. Espera un momento.' },
        { status: 429 }
      );
    }

    // 1. Autorización: Se permite por token de sesión ADMIN o por clave maestra BACKUP_SECRET_KEY
    const secretKey = process.env.BACKUP_SECRET_KEY || 'whitman-master-backup-2026';
    const providedSecret = request.headers.get('x-backup-secret');

    let authorized = false;
    let actorName = 'Sistema Automatizado';
    let actorId = 'cron-backup';

    if (providedSecret && constantTimeCompare(secretKey, providedSecret)) {
      authorized = true;
    } else {
      const auth = await authenticateRequest(request, ['ADMIN']);
      if (auth.authorized) {
        authorized = true;
        actorName = auth.user?.name || 'Director General';
        actorId = auth.user?.id || 'admin';
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { success: false, message: 'Acceso no autorizado al volcado de seguridad.' },
        { status: 401 }
      );
    }

    if (!sql) {
      return NextResponse.json(
        { success: false, message: 'Base de datos no conectada.' },
        { status: 500 }
      );
    }

    // 2. Extraer todas las tablas críticas de Neon DB
    const [users, grades, attendance, courses, classes, schedules, audits] = await Promise.all([
      (sql as any).query(`SELECT id, dni, name, email, role, hierarchy, hierarchy_title, level, grade_or_class, phone, active, created_at FROM users;`).catch(() => []),
      (sql as any).query(`SELECT * FROM grades;`).catch(() => []),
      (sql as any).query(`SELECT * FROM attendance;`).catch(() => []),
      (sql as any).query(`SELECT * FROM courses;`).catch(() => []),
      (sql as any).query(`SELECT * FROM academic_classes;`).catch(() => []),
      (sql as any).query(`SELECT * FROM attendance_schedules;`).catch(() => []),
      (sql as any).query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500;`).catch(() => []),
    ]);

    const backupData = {
      institution: 'I.E.P. WALT WHITMAN',
      generatedAt: new Date().toISOString(),
      generator: actorName,
      version: '1.0-security',
      counts: {
        users: users.length,
        grades: grades.length,
        attendance: attendance.length,
        courses: courses.length,
        classes: classes.length,
        auditLogs: audits.length,
      },
      data: {
        users,
        grades,
        attendance,
        courses,
        classes,
        schedules,
        audits,
      },
    };

    // Registrar en auditoría la descarga de respaldo
    await recordAuditLog({
      request,
      userId: actorId,
      userName: actorName,
      action: 'DATABASE_BACKUP_GENERATED',
      entityType: 'SYSTEM_BACKUP',
      details: backupData.counts,
    });

    const isDownload = new URL(request.url).searchParams.get('download') === 'true';

    if (isDownload) {
      const jsonStr = JSON.stringify(backupData, null, 2);
      const filename = `whitman_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
      return new NextResponse(jsonStr, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Respaldo generado exitosamente.',
      backup: backupData,
    });
  } catch (err: any) {
    console.error('Error generando respaldo:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Error al generar respaldo de la base de datos' },
      { status: 500 }
    );
  }
}
