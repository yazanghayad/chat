import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { APPWRITE_SESSION_COOKIE } from '@/lib/appwrite/constants';

const PUBLIC_PATHS = [
  '/auth/sign-in',
  '/auth/sign-up',
  '/privacy-policy',
  '/terms-of-service',
  '/about'
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow API routes
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Allow Server Actions (POST with Next-Action header)
  if (req.method === 'POST' && req.headers.has('next-action')) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = req.cookies.get(APPWRITE_SESSION_COOKIE)?.value;
  if (!session) {
    return NextResponse.redirect(new URL('/auth/sign-in', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ]
};
