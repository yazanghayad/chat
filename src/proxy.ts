import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── Constants (duplicated from lib/appwrite/constants because Edge Runtime
//    cannot import node-appwrite or use next/headers) ──────────────────────
const APPWRITE_SESSION_COOKIE = 'appwrite_session';
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? '';
const APPWRITE_PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT ?? '';

/**
 * Root domain for subdomain extraction.
 * Production: ROOT_DOMAIN=optitech.software → acme.optitech.software
 * Development: ROOT_DOMAIN=localhost:3000 (or localhost)
 */
const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'localhost:3000';

// ── Public routes ────────────────────────────────────────────────────────
const PUBLIC_PATHS = [
  '/',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/about',
  '/privacy-policy',
  '/terms-of-service',
  '/docs'
];

const API_PUBLIC_PREFIXES = [
  '/api/chat/',
  '/api/webhooks/',
  '/api/health',
  '/api/inngest',
  '/api/cron/',
  '/api/widget/',
  '/api/tenant/subdomain-check'
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;

  // Docs pages (including /docs/[slug])
  if (pathname.startsWith('/docs')) return true;

  // Portal pages served for subdomain rewrites
  if (pathname.startsWith('/portal/')) return true;

  for (const prefix of API_PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }

  // Static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg')
  ) {
    return true;
  }

  return false;
}

// ── Appwrite session validation via REST API (Edge-compatible) ───────────
// Calls GET /v1/account which returns 200 if the session JWT is valid,
// or 401 if expired / invalid.  This runs on the Edge so node-appwrite
// cannot be used; plain fetch is the only option.

async function validateSession(sessionValue: string): Promise<boolean> {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT) return false;

  try {
    // APPWRITE_ENDPOINT already contains /v1, so just append /account
    const res = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      method: 'GET',
      headers: {
        'X-Appwrite-Project': APPWRITE_PROJECT,
        'X-Appwrite-Session': sessionValue,
        'Content-Type': 'application/json'
      }
    });
    return res.ok; // 200 = valid session
  } catch {
    // Network error → fail open so the page itself can show an error
    return true;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────
function redirectToSignIn(request: NextRequest, pathname?: string) {
  const signInUrl = new URL('/auth/sign-in', request.url);
  if (pathname) signInUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(signInUrl);
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.delete(APPWRITE_SESSION_COOKIE);
  return response;
}

/**
 * Extract subdomain from the request hostname.
 * e.g. "acme.optitech.software" → "acme", "optitech.software" → null
 */
function extractSubdomain(request: NextRequest): string | null {
  const hostname =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    '';
  const rootWithoutPort = ROOT_DOMAIN.split(':')[0];
  const hostWithoutPort = hostname.split(':')[0];

  if (
    hostWithoutPort !== rootWithoutPort &&
    hostWithoutPort.endsWith(`.${rootWithoutPort}`)
  ) {
    const sub = hostWithoutPort.replace(`.${rootWithoutPort}`, '');
    return sub === 'www' ? null : sub;
  }
  return null;
}

// ── Proxy (middleware) ───────────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 0. Subdomain routing ──────────────────────────────────────────
  const subdomain = extractSubdomain(request);
  if (subdomain) {
    // Inject subdomain header for downstream use
    const headers = new Headers(request.headers);
    headers.set('x-tenant-subdomain', subdomain);

    // Rewrite root to portal page
    if (pathname === '/' || pathname === '') {
      const url = request.nextUrl.clone();
      url.pathname = `/portal/${subdomain}`;
      return NextResponse.rewrite(url, { request: { headers } });
    }

    // All other paths on subdomain continue with header injected
    return NextResponse.next({ request: { headers } });
  }

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow Server Actions (POST with Next-Action header)
  if (request.method === 'POST' && request.headers.has('next-action')) {
    return NextResponse.next();
  }

  // ── 1. Check for cookie existence ──────────────────────────────────
  const session = request.cookies.get(APPWRITE_SESSION_COOKIE)?.value;

  if (!session) {
    if (pathname.startsWith('/dashboard')) {
      return redirectToSignIn(request, pathname);
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return redirectToSignIn(request);
  }

  // ── 2. Validate session against Appwrite ───────────────────────────
  const valid = await validateSession(session);

  if (!valid) {
    // Session expired or revoked → clear stale cookie and redirect
    if (pathname.startsWith('/api/')) {
      const res = NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
      return clearSessionCookie(res);
    }
    const res = redirectToSignIn(request, pathname);
    return clearSessionCookie(res);
  }

  // ── 3. Authenticated user on auth pages → dashboard ────────────────
  if (pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/dashboard/overview', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
