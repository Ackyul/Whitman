import crypto from 'crypto';

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
      // Comparar dummy para mantener el mismo tiempo
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return a === b;
  }
}
