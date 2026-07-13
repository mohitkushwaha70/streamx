import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { success, unauthorized } from '@/lib/api';
import { getUser } from '@/lib/auth';

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  const history = await db.history.findMany({
    where: { userId: user.userId },
    orderBy: { watchedAt: 'desc' },
    take: 50,
  });

  const contentIds = history.map((h) => h.contentId);
  const contentItems = contentIds.length > 0
    ? await db.content.findMany({ where: { id: { in: contentIds } } })
    : [];

  const contentMap = new Map(contentItems.map((c) => [c.id, c]));

  return success(
    history.map((h) => {
      const content = contentMap.get(h.contentId);
      return {
        ...content,
        progress: h.progress,
        completed: h.completed,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { contentId, progress, completed } = await req.json();

  const existing = await db.history.findFirst({
    where: { userId: user.userId, contentId },
  });

  if (existing) {
    await db.history.update({
      where: { id: existing.id },
      data: { progress: progress || 0, completed: completed || false, watchedAt: new Date() },
    });
  } else {
    await db.history.create({
      data: { userId: user.userId, contentId, progress: progress || 0, completed: completed || false },
    });
  }

  return success({ saved: true });
}
