export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { HeroBanner } from '@/components/ui/hero-banner';
import { ContentRow } from '@/components/ui/content-row';
import { SkeletonHero, SkeletonRow } from '@/components/ui/skeleton';
import {
  fetchTrendingMovies,
  fetchTrendingSeries,
  fetchPopularMovies,
  fetchTopRatedMovies,
  fetchAnime,
} from '@/services/tmdb';
import type { ContentItem } from '@/types';

function fillDefaults(item: Record<string, unknown>): ContentItem {
  return {
    id: String(item.id || item.tmdbId || ''),
    tmdbId: (item.tmdbId as number) || undefined,
    title: String(item.title || ''),
    slug: String(item.slug || ''),
    type: (item.type as ContentItem['type']) || 'MOVIE',
    description: String(item.description || ''),
    poster: String(item.poster || ''),
    banner: String(item.banner || ''),
    backdrop: String(item.backdrop || ''),
    trailerUrl: (item.trailerUrl as string) || undefined,
    videoUrl: (item.videoUrl as string) || undefined,
    huggingFaceUrl: undefined,
    genre: String(item.genre || ''),
    genres: (item.genres as string[]) || [],
    language: String(item.language || 'en'),
    country: String(item.country || ''),
    runtime: Number(item.runtime) || 0,
    rating: Number(item.rating) || 0,
    releaseDate: item.releaseDate
      ? item.releaseDate instanceof Date
        ? item.releaseDate.toISOString()
        : String(item.releaseDate)
      : undefined,
    cast: (item.cast as string[]) || [],
    director: String(item.director || ''),
    seasons: Number(item.seasons) || 0,
    episodesCount: Number(item.episodesCount) || 0,
    featured: Boolean(item.featured),
    trending: Boolean(item.trending),
    published: Boolean(item.published ?? true),
    viewCount: Number(item.viewCount) || 0,
    createdAt: item.createdAt
      ? item.createdAt instanceof Date
        ? item.createdAt.toISOString()
        : String(item.createdAt)
      : new Date().toISOString(),
    updatedAt: item.updatedAt
      ? item.updatedAt instanceof Date
        ? item.updatedAt.toISOString()
        : String(item.updatedAt)
      : new Date().toISOString(),
  };
}

function normalizeDbItems(items: Record<string, unknown>[]): ContentItem[] {
  return items.map(fillDefaults);
}

function normalizeTmdbItems(items: Record<string, unknown>[]): ContentItem[] {
  return items.map((item) => fillDefaults({ ...item, id: item.tmdbId, published: true }));
}

async function getDbContent(): Promise<ContentItem[]> {
  try {
    const items = await db.content.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return normalizeDbItems(items as unknown as Record<string, unknown>[]);
  } catch {
    return [];
  }
}

function mergeWithDb(tmdbItems: ContentItem[], dbItems: ContentItem[]): ContentItem[] {
  const dbSlugs = new Set(dbItems.map((d) => d.slug));
  return [...dbItems, ...tmdbItems.filter((t) => !dbSlugs.has(t.slug))];
}

async function HeroSection() {
  const dbItems = await getDbContent();
  const featured = dbItems.filter((i) => i.featured);
  const heroItems = featured.length > 0 ? featured : dbItems.slice(0, 5);
  return <HeroBanner items={heroItems.slice(0, 5)} />;
}

async function TrendingSection() {
  const [dbItems, tmdbMovies, tmdbSeries] = await Promise.all([
    db.content.findMany({ where: { published: true, trending: true }, take: 20 }),
    fetchTrendingMovies().catch(() => []),
    fetchTrendingSeries().catch(() => []),
  ]);

  const dbTyped = normalizeDbItems(dbItems as unknown as Record<string, unknown>[]);
  const merged = mergeWithDb(
    normalizeTmdbItems([...tmdbMovies, ...tmdbSeries].sort(() => Math.random() - 0.5)),
    dbTyped
  );
  return <ContentRow title="Trending Now" items={merged.slice(0, 20)} seeAllHref="/movies?sort=views" />;
}

async function LatestSection() {
  const dbItems = await getDbContent();
  return (
    <ContentRow
      title="Latest Releases"
      items={dbItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20)}
    />
  );
}

async function TopRatedSection() {
  const [dbItems, tmdbData] = await Promise.all([
    db.content.findMany({ where: { published: true }, orderBy: { rating: 'desc' }, take: 20 }),
    fetchTopRatedMovies().catch(() => ({ results: [] as Record<string, unknown>[], total: 0 })),
  ]);

  const dbTyped = normalizeDbItems(dbItems as unknown as Record<string, unknown>[]);
  const merged = mergeWithDb(normalizeTmdbItems(tmdbData.results), dbTyped);
  return <ContentRow title="Top Rated" items={merged.slice(0, 20)} seeAllHref="/movies?sort=rating" />;
}

async function MoviesSection() {
  const [dbItems, tmdbData] = await Promise.all([
    db.content.findMany({ where: { published: true, type: 'MOVIE' }, take: 20 }),
    fetchPopularMovies().catch(() => ({ results: [] as Record<string, unknown>[] })),
  ]);

  const dbTyped = normalizeDbItems(dbItems as unknown as Record<string, unknown>[]);
  const merged = mergeWithDb(normalizeTmdbItems(tmdbData.results), dbTyped);
  return <ContentRow title="Movies" items={merged.slice(0, 20)} seeAllHref="/movies" />;
}

async function SeriesSection() {
  const [dbItems, tmdbData] = await Promise.all([
    db.content.findMany({ where: { published: true, type: 'SERIES' }, take: 20 }),
    fetchTrendingSeries().catch(() => []),
  ]);

  const dbTyped = normalizeDbItems(dbItems as unknown as Record<string, unknown>[]);
  const merged = mergeWithDb(normalizeTmdbItems(tmdbData), dbTyped);
  return <ContentRow title="TV Shows" items={merged.slice(0, 20)} seeAllHref="/series" />;
}

async function AnimeSection() {
  const [dbItems, tmdbData] = await Promise.all([
    db.content.findMany({ where: { published: true, type: 'ANIME' }, take: 20 }),
    fetchAnime().catch(() => ({ results: [] as Record<string, unknown>[] })),
  ]);

  const dbTyped = normalizeDbItems(dbItems as unknown as Record<string, unknown>[]);
  const merged = mergeWithDb(normalizeTmdbItems(tmdbData.results), dbTyped);
  return <ContentRow title="Anime" items={merged.slice(0, 20)} seeAllHref="/anime" />;
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<SkeletonHero />}>
        <HeroSection />
      </Suspense>

      <div className="relative z-10 -mt-16 space-y-8 pb-12">
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
