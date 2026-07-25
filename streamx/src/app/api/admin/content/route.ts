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
  const type = searchParams.get('type') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  const where: Prisma.ContentWhereInput = {};
  if (search) where.title = { contains: search, mode: 'insensitive' };
  if (type) where.type = type.toUpperCase() as 'MOVIE' | 'SERIES' | 'ANIME';

  const [items, total] = await Promise.all([
    db.content.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    db.content.count({ where }),
  ]);

  return success({ items, total, page, pages: Math.ceil(total / limit) });
}
