'use client';

import Link from 'next/link';
import { Play, Info, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentItem } from '@/types';

interface HeroBannerProps {
  items: ContentItem[];
}

export function HeroBanner({ items }: HeroBannerProps) {
  if (!items.length) return null;

  const featured = items[0];

  return (
    <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
      <div className="absolute inset-0">
        {featured.banner || featured.backdrop ? (
          <img
            src={featured.banner || featured.backdrop}
            alt={featured.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-surface" />
        )}
        <div className="gradient-overlay absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-24 lg:px-8">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2">
            {featured.type !== 'MOVIE' && (
              <span className="rounded border border-accent/50 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                {featured.type === 'ANIME' ? 'Anime' : 'Series'}
              </span>
            )}
            {featured.rating > 0 && (
              <span className="flex items-center gap-1 text-sm text-yellow-400">
                <Star className="h-4 w-4 fill-current" />
                {featured.rating.toFixed(1)}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-white md:text-5xl lg:text-6xl leading-tight">
            {featured.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            {featured.releaseDate && (
              <span>{new Date(featured.releaseDate).getFullYear()}</span>
            )}
            {featured.runtime > 0 && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-muted" />
                <span>{Math.floor(featured.runtime / 60)}h {featured.runtime % 60}m</span>
              </>
            )}
            {featured.seasons > 0 && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-muted" />
                <span>{featured.seasons} Season{featured.seasons !== 1 ? 's' : ''}</span>
              </>
            )}
            {featured.genre && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-muted" />
                <span>{featured.genre}</span>
              </>
            )}
          </div>

          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/80 md:text-base">
            {featured.description}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Link
              href={`/watch/${featured.slug}`}
              className="btn-primary flex items-center gap-2 text-base"
            >
              <Play className="h-5 w-5 fill-current" />
              Play Now
            </Link>
            <Link
              href={`/watch/${featured.slug}`}
              className="flex items-center gap-2 rounded-md border border-border bg-surface/80 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-surface-hover"
            >
              <Info className="h-5 w-5" />
              More Info
            </Link>
          </div>
        </div>
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-6 right-4 z-10 flex items-center gap-2 lg:right-8">
          {items.slice(0, 5).map((item, i) => (
            <div
              key={item.id}
              className={cn(
                'h-1 rounded-full transition-all',
                i === 0 ? 'w-8 bg-accent' : 'w-2 bg-muted/50'
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
