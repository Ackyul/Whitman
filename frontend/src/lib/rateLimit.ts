// Rate Limiting en memoria para prevención de ataques de fuerza bruta y DDoS
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Limpiar entradas expiradas periódicamente cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((value, key) => {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowSeconds: number = 300 // 5 minutos por defecto
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetInSeconds: windowSeconds,
    };
  }

  if (entry.count >= maxAttempts) {
    const resetInSeconds = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  entry.count += 1;
  const resetInSeconds = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    resetInSeconds,
  };
}

export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
