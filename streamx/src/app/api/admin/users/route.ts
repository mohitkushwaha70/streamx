export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user || user.role !== 'ADMIN') return unauthorized('Admin only');

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const plan = searchParams.get('plan') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) where.role = role.toUpperCase() as 'USER' | 'ADMIN';
  if (plan) where.plan = plan.toUpperCase() as 'FREE' | 'PREMIUM';

  const [users, total] = await Promise.all([
    db.user.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      select: { id: true, name: true, email: true, role: true, plan: true, banned: true, createdAt: true, lastActiveAt: true },
    }),
    db.user.count({ where }),
  ]);

  return success({ items: users, total, page, pages: Math.ceil(total / limit) });
}
