export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';
import { success, error } from '@/lib/api';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) return error('Name, email and password required');
    if (password.length < 6) return error('Password must be at least 6 characters');

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return error('Email already registered');

    const hashed = await hashPassword(password);
    const user = await db.user.create({
      data: { name, email, password: hashed },
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

    return success({ id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan });
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Registration failed', 500);
  }
}
