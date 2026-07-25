export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/api';
import { getUser } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const episodes = await db.episode.findMany({
      where: { contentId: id },
      orderBy: [{ season: 'asc' }, { number: 'asc' }],
    });
    return success(episodes);
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Failed', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'ADMIN') return unauthorized('Admin only');

    const { id } = await params;
    const body = await req.json();
    const { season, number, title, description, poster, videoUrl, duration, rating, airDate } = body;

    if (!title || !number) return error('Title and episode number required');

    const episode = await db.episode.create({
      data: {
        contentId: id, season: season || 1, number, title,
        description: description || '', poster: poster || null,
        videoUrl: videoUrl || null, duration: duration || 0,
        rating: rating || 0, airDate: airDate || null,
      },
    });

    await db.content.update({
      where: { id },
      data: { episodesCount: { increment: 1 } },
    });

    return success(episode, 201);
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Failed', 500);
  }
}
