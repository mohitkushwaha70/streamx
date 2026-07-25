export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { ContentCard } from '@/components/ui/content-card';
import type { ContentItem } from '@/types';
import { Prisma } from '@prisma/client';

const GENRES = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance',
  'Thriller', 'Documentary', 'Animation', 'Fantasy', 'Crime', 'Adventure',
];

const SORT_OPTIONS = [
  { label: 'Latest', value: 'latest' },
  { label: 'Rating', value: 'rating' },
  { label: 'Title A-Z', value: 'title' },
  { label: 'Most Viewed', value: 'views' },
];

interface PageProps {
  searchParams: Promise<{ genre?: string; sort?: string; page?: string }>;
}

async function getSeries(params: { genre?: string; sort?: string; page?: string }) {
  const page = parseInt(params.page || '1');
  const limit = 24;
  const skip = (page - 1) * limit;

  const where: Prisma.ContentWhereInput = { published: true, type: 'SERIES' };
  if (params.genre) where.genres = { has: params.genre };

  let orderBy: Prisma.ContentOrderByWithRelationInput = { createdAt: 'desc' };
  if (params.sort === 'rating') orderBy = { rating: 'desc' };
  else if (params.sort === 'title') orderBy = { title: 'asc' };
  else if (params.sort === 'views') orderBy = { viewCount: 'desc' };

  const [items, total] = await Promise.all([
    db.content.findMany({ where, orderBy, skip, take: limit }),
    db.content.count({ where }),
  ]);

  return { items: items as unknown as ContentItem[], total, page, pages: Math.ceil(total / limit) };
}

async function SeriesGrid({ genre, sort, page }: { genre?: string; sort?: string; page?: string }) {
  const data = await getSeries({ genre, sort, page });

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-medium text-white">No TV shows found</p>
        <p className="mt-2 text-sm text-muted">Try adjusting your filters or check back later.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {data.items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>

      {data.pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: Math.min(data.pages, 10) }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/series?genre=${genre || ''}&sort=${sort || ''}&page=${p}`}
              className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                p === data.page
                  ? 'bg-accent text-white'
                  : 'border border-border bg-surface text-muted hover:border-white/20 hover:text-white'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </>
  );
}

export default async function SeriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const genre = params.genre || '';
  const sort = params.sort || 'latest';

  return (
    <div className="min-h-screen pt-20">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white md:text-3xl">TV Shows</h1>
          <p className="mt-1 text-sm text-muted">Explore our TV show collection</p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-1.5">
            <a
              href="/series?sort=latest"
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                !genre ? 'bg-accent text-white' : 'border border-border bg-surface text-muted hover:text-white'
              }`}
            >
              All
            </a>
            {GENRES.map((g) => (
              <a
                key={g}
                href={`/series?genre=${encodeURIComponent(g)}&sort=${sort}`}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  genre === g
                    ? 'bg-accent text-white'
                    : 'border border-border bg-surface text-muted hover:text-white'
                }`}
              >
                {g}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Sort:</span>
            <a
              href={`/series?genre=${genre}&sort=latest`}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                sort === 'latest' ? 'bg-accent text-white' : 'text-muted hover:text-white'
              }`}
            >
              Latest
            </a>
            <a
              href={`/series?genre=${genre}&sort=rating`}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                sort === 'rating' ? 'bg-accent text-white' : 'text-muted hover:text-white'
              }`}
            >
              Rating
            </a>
            <a
              href={`/series?genre=${genre}&sort=title`}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                sort === 'title' ? 'bg-accent text-white' : 'text-muted hover:text-white'
              }`}
            >
              A-Z
            </a>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[2/3] rounded-lg skeleton" />
                  <div className="mt-2 space-y-1.5">
                    <div className="h-4 w-3/4 rounded skeleton" />
                    <div className="h-3 w-1/2 rounded skeleton" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <SeriesGrid genre={genre} sort={sort} page={params.page} />
        </Suspense>
      </div>
    </div>
  );
}
