export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') || '';
    const genre = searchParams.get('genre') || '';
    const sort = searchParams.get('sort') || 'latest';
    const featured = searchParams.get('featured') === 'true';
    const trending = searchParams.get('trending') === 'true';
    const skip = (page - 1) * limit;

    const where: Prisma.ContentWhereInput = { published: true };
    if (type) where.type = type.toUpperCase() as 'MOVIE' | 'SERIES' | 'ANIME';
    if (genre) where.genres = { has: genre };
    if (featured) where.featured = true;
    if (trending) where.trending = true;

    let orderBy: Prisma.ContentOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'rating') orderBy = { rating: 'desc' };
    else if (sort === 'title') orderBy = { title: 'asc' };
    else if (sort === 'views') orderBy = { viewCount: 'desc' };

    const [items, total] = await Promise.all([
      db.content.findMany({ where, orderBy, skip, take: limit }),
      db.content.count({ where }),
    ]);

    return success({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Failed to fetch', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'ADMIN') return unauthorized('Admin only');

    const body = await req.json();
    const { title, type, description, poster, banner, trailerUrl, videoUrl,
      genre, genres, language, country, runtime, rating, releaseDate,
      cast, director, seasons, episodesCount, featured, trending, published } = body;

    if (!title || !type) return error('Title and type are required');

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

    const existing = await db.content.findUnique({ where: { slug } });
    if (existing) return error('Slug already exists');

    const content = await db.content.create({
      data: {
        title, slug, type: type.toUpperCase(),
        description: description || '', poster: poster || '', banner: banner || '',
        backdrop: banner || poster || '', trailerUrl: trailerUrl || null,
        videoUrl: videoUrl || null, genre: genre || '', genres: genres || [],
        language: language || 'en', country: country || '',
        runtime: runtime || 0, rating: rating || 0,
        releaseDate: releaseDate || null,
        cast: cast || [], director: director || '',
        seasons: seasons || 0, episodesCount: episodesCount || 0,
        featured: featured || false, trending: trending || false,
        published: published !== false,
      },
    });

    await db.activityLog.create({
      data: { type: 'content', message: `Content "${title}" created`, userId: user.userId },
    });

    return success(content, 201);
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Failed to create', 500);
  }
}
