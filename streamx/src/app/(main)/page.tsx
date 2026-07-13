export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { HeroBanner } from '@/components/ui/hero-banner';
import { ContentRow } from '@/components/ui/content-row';
import { SkeletonHero, SkeletonRow } from '@/components/ui/skeleton';
import type { ContentItem } from '@/types';
import { Prisma } from '@prisma/client';

async function getDbContent(where?: Prisma.ContentWhereInput, orderBy?: Prisma.ContentOrderByWithRelationInput, take?: number) {
  try {
    return await db.content.findMany({
      where: { published: true, ...where },
      orderBy: orderBy || { createdAt: 'desc' },
      take: take || 30,
    });
  } catch {
    return [];
  }
}

function toContentItem(item: Record<string, unknown>): ContentItem {
  return {
    id: String(item.id || ''),
    title: String(item.title || ''),
    slug: String(item.slug || ''),
    type: (item.type as ContentItem['type']) || 'MOVIE',
    description: String(item.description || ''),
    poster: String(item.poster || ''),
    banner: String(item.banner || ''),
    backdrop: String(item.backdrop || ''),
    trailerUrl: (item.trailerUrl as string) || undefined,
    videoUrl: (item.videoUrl as string) || undefined,
    genre: String(item.genre || ''),
    genres: Array.isArray(item.genres) ? (item.genres as string[]) : [],
    language: String(item.language || 'en'),
    country: String(item.country || ''),
    runtime: Number(item.runtime) || 0,
    rating: Number(item.rating) || 0,
    releaseDate: item.releaseDate ? new Date(item.releaseDate as string).toISOString() : undefined,
    cast: Array.isArray(item.cast) ? (item.cast as string[]) : [],
    director: String(item.director || ''),
    seasons: Number(item.seasons) || 0,
    episodesCount: Number(item.episodesCount) || 0,
    featured: Boolean(item.featured),
    trending: Boolean(item.trending),
    published: Boolean(item.published ?? true),
    viewCount: Number(item.viewCount) || 0,
    createdAt: item.createdAt ? new Date(item.createdAt as string).toISOString() : new Date().toISOString(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt as string).toISOString() : new Date().toISOString(),
  };
}

async function HeroSection() {
  const featured = await getDbContent({ featured: true }, { createdAt: 'desc' }, 5);
  const latest = featured.length > 0 ? featured : await getDbContent({}, { createdAt: 'desc' }, 5);
  return <HeroBanner items={latest.map((i) => toContentItem(i as unknown as Record<string, unknown>))} />;
}

async function TrendingSection() {
  const items = await getDbContent({ trending: true }, { viewCount: 'desc' }, 20);
  const content = items.map((i) => toContentItem(i as unknown as Record<string, unknown>));
  return <ContentRow title="Trending Now" items={content} seeAllHref="/movies?sort=views" />;
}

async function LatestSection() {
  const items = await getDbContent({}, { createdAt: 'desc' }, 20);
  const content = items.map((i) => toContentItem(i as unknown as Record<string, unknown>));
  return <ContentRow title="New Releases" items={content} />;
}

async function TopRatedSection() {
  const items = await getDbContent({}, { rating: 'desc' }, 20);
  const content = items.map((i) => toContentItem(i as unknown as Record<string, unknown>));
  return <ContentRow title="Top Rated" items={content} seeAllHref="/movies?sort=rating" />;
}

async function MoviesSection() {
  const items = await getDbContent({ type: 'MOVIE' }, { createdAt: 'desc' }, 20);
  const content = items.map((i) => toContentItem(i as unknown as Record<string, unknown>));
  return <ContentRow title="Movies" items={content} seeAllHref="/movies" />;
}

async function SeriesSection() {
  const items = await getDbContent({ type: 'SERIES' }, { createdAt: 'desc' }, 20);
  const content = items.map((i) => toContentItem(i as unknown as Record<string, unknown>));
  return <ContentRow title="TV Shows" items={content} seeAllHref="/series" />;
}

async function AnimeSection() {
  const items = await getDbContent({ type: 'ANIME' }, { createdAt: 'desc' }, 20);
  const content = items.map((i) => toContentItem(i as unknown as Record<string, unknown>));
  return <ContentRow title="Anime" items={content} seeAllHref="/anime" />;
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<SkeletonHero />}>
        <HeroSection />
      </Suspense>

      <div className="relative z-10 -mt-20 space-y-10 pb-16">
        <Suspense fallback={<SkeletonRow />}>
          <TrendingSection />
        </Suspense>
        <Suspense fallback={<SkeletonRow />}>
          <LatestSection />
        </Suspense>
        <Suspense fallback={<SkeletonRow />}>
          <TopRatedSection />
        </Suspense>
        <Suspense fallback={<SkeletonRow />}>
          <MoviesSection />
        </Suspense>
        <Suspense fallback={<SkeletonRow />}>
          <SeriesSection />
        </Suspense>
        <Suspense fallback={<SkeletonRow />}>
          <AnimeSection />
        </Suspense>
      </div>
    </div>
  );
}
