export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, signToken } from '@/lib/auth';
import { success, error } from '@/lib/api';
import { cookies } from 'next/headers';

function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return error('Email and password required');

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.password) return error('Invalid email or password');
    if (user.banned) return error('Account has been suspended');

    const valid = await verifyPassword(password, user.password);
    if (!valid) return error('Invalid email or password');

    const ip = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    await db.activityLog.create({
      data: {
        type: 'auth',
        message: `${user.name} (${user.email}) logged in`,
        userId: user.id,
        metadata: JSON.stringify({ ip, userAgent, action: 'login' }),
      },
    });

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    });

    const cookieStore = await cookies();
    cookieStore.set('streamx_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return success({
      id: user.id, name: user.name, email: user.email,
      role: user.role, plan: user.plan, avatar: user.avatar,
    });
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Login failed', 500);
  }
}
