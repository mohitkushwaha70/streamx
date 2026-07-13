import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { success, unauthorized } from '@/lib/api';
import { getUser } from '@/lib/auth';

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  const positions = await db.playbackPosition.findMany({
    where: { userId: user.userId },
  });

  return success(positions);
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { contentId, position, duration } = await req.json();

  const existing = await db.playbackPosition.findFirst({
    where: { userId: user.userId, contentId },
  });

  if (existing) {
    await db.playbackPosition.update({
      where: { id: existing.id },
      data: { position: position || 0, duration: duration || 0 },
    });
  } else {
    await db.playbackPosition.create({
      data: { userId: user.userId, contentId, position: position || 0, duration: duration || 0 },
    });
  }

  return success({ saved: true });
}
