export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/api';
import { getUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user || user.role !== 'ADMIN') return unauthorized('Admin only');

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || '';
  const limit = parseInt(searchParams.get('limit') || '100');

  const where = type ? { type } : {};
  const logs = await db.activityLog.findMany({
    where, orderBy: { createdAt: 'desc' }, take: limit,
  });

  return success(logs);
}
