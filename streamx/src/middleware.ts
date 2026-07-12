import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/content', '/api/search', '/api/collections'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith('/api/content'));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('streamx_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  if (pathname.startsWith('/player/')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  if (pathname === '/profile') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  const res = NextResponse.next();

  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
