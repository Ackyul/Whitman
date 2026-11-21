import crypto from 'crypto';
import { sql } from '@/lib/db';
import { getClientIp } from '@/lib/rateLimit';
import { UserRole } from '@/types';

/**
 * Sanitiza una cadena eliminando caracteres nulos y caracteres peligrosos para HTML/XSS
 */
export function sanitizeString(val: unknown, maxLength: number = 250): string {
  if (typeof val !== 'string') return '';
  const cleaned = val
    .replace(/\0/g, '') // Elimina null bytes
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Valida formato seguro de DNI o código de carnet
 */
export function isValidDni(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  const clean = val.trim();
  // Alfanumérico entre 4 y 20 caracteres sin símbolos peligrosos
  return /^[a-zA-Z0-9\-_]{4,20}$/.test(clean);
}

/**
 * Comparación en tiempo constante para evitar ataques de temporización (timing attacks)
 */
export function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(String(a || ''));
    const bufB = Buffer.from(String(b || ''));
    if (bufA.length !== bufB.length) {
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return a === b;
  }
}

/**
 * Autentica y autoriza una solicitud HTTP verificando el token de sesión y el rol permitido
 */
export async function authenticateRequest(
  request: Request,
  allowedRoles?: UserRole[]
): Promise<{
  authorized: boolean;
  user?: { id: string; name: string; dni: string; role: UserRole; hierarchy?: string };
  error?: string;
  statusCode?: number;
}> {
  try {
    const sessionToken =
      request.headers.get('x-session-token') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const userIdOrDni = request.headers.get('x-user-id');

    // Si no hay base de datos configurada (modo desarrollo/simulación), permitir
    if (!sql) {
      return { authorized: true };
    }

    if (!sessionToken && !userIdOrDni) {
      return {
        authorized: false,
        error: 'Sesión no proporcionada o no autenticada.',
        statusCode: 401,
      };
    }

    // Asegurar columna de token en tabla users
    await (sql as any).query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS current_session_token VARCHAR(128);
    `);

    // Buscar usuario en base de datos
    let rows: any[] = [];
    if (sessionToken && userIdOrDni) {
      rows = await (sql as any).query(`
        SELECT id, name, dni, role, hierarchy, current_session_token as "currentSessionToken", active
        FROM users
        WHERE (id = $1 OR dni = $1)
          AND active = true
        LIMIT 1;
      `, [userIdOrDni.trim()]);
    } else if (sessionToken) {
      rows = await (sql as any).query(`
        SELECT id, name, dni, role, hierarchy, current_session_token as "currentSessionToken", active
        FROM users
        WHERE current_session_token = $1
          AND active = true
        LIMIT 1;
      `, [sessionToken.trim()]);
    }

    if (!rows || rows.length === 0) {
      return {
        authorized: false,
        error: 'Usuario o sesión no encontrada en la base de datos.',
        statusCode: 401,
      };
    }

    const dbUser = rows[0];

    // Si tiene token registrado en la base de datos, validar que coincida
    if (dbUser.currentSessionToken && sessionToken) {
      if (!constantTimeCompare(dbUser.currentSessionToken, sessionToken)) {
        return {
          authorized: false,
          error: 'Token de sesión expirado o sesión abierta en otro dispositivo.',
          statusCode: 401,
        };
      }
    }

    // Validar rol si se requiere
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(dbUser.role)) {
        return {
          authorized: false,
          error: `Acceso denegado: se requiere uno de los roles [${allowedRoles.join(', ')}].`,
          statusCode: 403,
        };
      }
    }

    return {
      authorized: true,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        dni: dbUser.dni,
        role: dbUser.role,
        hierarchy: dbUser.hierarchy,
      },
    };
  } catch (err: any) {
    console.error('Error al autenticar solicitud:', err);
    return {
      authorized: false,
      error: 'Error interno de validación de seguridad.',
      statusCode: 500,
    };
  }
}

/**
 * Registra una acción administrativa/académica en la tabla de auditoría inmutable
 */
export async function recordAuditLog(params: {
  request?: Request;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any> | string;
}): Promise<void> {
  if (!sql) return;

  try {
    // 1. Asegurar tabla audit_logs
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        user_name VARCHAR(150),
        action VARCHAR(64) NOT NULL,
        entity_type VARCHAR(64) NOT NULL,
        entity_id VARCHAR(64),
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const clientIp = params.request ? getClientIp(params.request) : '127.0.0.1';
    const logId = `aud-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const detailsJson =
      typeof params.details === 'object'
        ? JSON.stringify(params.details)
        : JSON.stringify({ message: params.details || '' });

    await (sql as any).query(`
      INSERT INTO audit_logs (
        id, user_id, user_name, action, entity_type, entity_id, details, ip_address, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, CURRENT_TIMESTAMP);
    `, [
      logId,
      params.userId || null,
      params.userName || 'Sistema',
      params.action,
      params.entityType,
      params.entityId || null,
      detailsJson,
      clientIp,
    ]);
  } catch (err) {
    console.warn('No se pudo registrar log de auditoría:', err);
  }
}
