export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { success, error } from '@/lib/api';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const genre = searchParams.get('genre') || '';
    const language = searchParams.get('language') || '';
    const year = searchParams.get('year') || '';
    const rating = searchParams.get('rating') || '';
    const type = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Prisma.ContentWhereInput = { published: true };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { genre: { contains: q, mode: 'insensitive' } },
        { director: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (genre) where.genres = { has: genre };
    if (language) where.language = language;
    if (type) where.type = type.toUpperCase() as 'MOVIE' | 'SERIES' | 'ANIME';
    if (year) {
      const y = parseInt(year);
      where.releaseDate = { gte: new Date(`${y}-01-01`), lt: new Date(`${y + 1}-01-01`) };
    }
    if (rating) where.rating = { gte: parseFloat(rating) };

    const [items, total] = await Promise.all([
      db.content.findMany({
        where, orderBy: { rating: 'desc' }, skip, take: limit,
      }),
      db.content.count({ where }),
    ]);

    return success({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Search failed', 500);
  }
}
