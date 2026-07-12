export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { success, unauthorized } from '@/lib/api';
import { getUser } from '@/lib/auth';

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  const history = await db.history.findMany({
    where: { userId: user.userId },
    include: { content: true },
    orderBy: { watchedAt: 'desc' },
    take: 50,
  });

  return success(history.map((h) => ({ ...h.content, progress: h.progress, completed: h.completed })));
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { contentId, progress, completed } = await req.json();

  await db.history.upsert({
    where: { userId_contentId: { userId: user.userId, contentId } },
    update: { progress: progress || 0, completed: completed || false, watchedAt: new Date() },
    create: { userId: user.userId, contentId, progress: progress || 0, completed: completed || false },
  });

  return success({ saved: true });
}
