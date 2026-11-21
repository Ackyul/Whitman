import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Firmas de User-Agents y escáneres maliciosos conocidos
const HOSTILE_USER_AGENTS = [
  'sqlmap',
  'nikto',
  'acunetix',
  'masscan',
  'dirbuster',
  'gobuster',
  'wpscan',
  'nmap',
  'zgrab',
  'censys',
  'shodan',
  'hydra',
  'medusa',
  'nessus',
  'openvas',
  'qualys',
  'burpcollaborator',
];

// Rutas de sondeo de vulnerabilidades comunes (WordPress, PHP, .env, backups, etc.)
const BLOCKED_PROBE_PATHS = [
  '/.env',
  '/.git',
  '/wp-admin',
  '/wp-login.php',
  '/xmlrpc.php',
  '/phpmyadmin',
  '/pma',
  '/admin/config.php',
  '/cgi-bin/',
  '/actuator',
  '/eval-stdin.php',
  '/setup.php',
  '/vendor/phpunit',
  '/.aws/',
  '/.ssh/',
  '/server-status',
];

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname.toLowerCase();
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();

  // 1. CAPA: Bloqueo de escáneres automatizados y bots de ataque
  if (HOSTILE_USER_AGENTS.some((bot) => userAgent.includes(bot))) {
    return new NextResponse('Acceso bloqueado por el cortafuegos institucional de Whitman.', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Protection': 'Whitman-Shield-Active',
      },
    });
  }

  // 2. CAPA: Bloqueo inmediato de sondeo de archivos sensibles o CMS ajenos (.env, .git, etc.)
  if (BLOCKED_PROBE_PATHS.some((probe) => path.startsWith(probe) || path.includes(probe))) {
    return new NextResponse('Recurso no disponible o bloqueado por seguridad.', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Protection': 'Whitman-Shield-Active',
      },
    });
  }

  // 3. CAPA: Cabeceras de Seguridad Avanzadas en cada respuesta
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  );
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  return response;
}

// Aplicar a todas las rutas excepto archivos estáticos internos de Next.js
export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas de solicitud excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
