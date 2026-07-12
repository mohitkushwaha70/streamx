export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/api';
import { getUser } from '@/lib/auth';

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  const items = await db.watchLater.findMany({
    where: { userId: user.userId },
    include: { content: true },
    orderBy: { createdAt: 'desc' },
  });

  return success(items.map((i) => i.content));
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { contentId } = await req.json();
  if (!contentId) return error('contentId required');

  const existing = await db.watchLater.findUnique({
    where: { userId_contentId: { userId: user.userId, contentId } },
  });

  if (existing) {
    await db.watchLater.delete({ where: { id: existing.id } });
    return success({ added: false });
  }

  await db.watchLater.create({ data: { userId: user.userId, contentId } });
  return success({ added: true });
}
