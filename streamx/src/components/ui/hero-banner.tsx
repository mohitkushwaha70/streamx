'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Play, Info, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentItem } from '@/types';

interface HeroBannerProps {
  items: ContentItem[];
}

export function HeroBanner({ items }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((index: number) => {
    if (isTransitioning || index === current) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [current, isTransitioning]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      goTo((current + 1) % items.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [current, items.length, goTo]);

  if (!items.length) return null;

  const featured = items[current];

  return (
    <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden">
      {items.map((item, i) => (
        <div
          key={item.id}
          className={cn(
            'absolute inset-0 transition-opacity duration-1000',
            i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          {item.banner || item.backdrop ? (
            <img
              src={item.banner || item.backdrop}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-surface" />
          )}
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-transparent h-32" />

      <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-28 lg:px-12 max-w-[1440px] mx-auto">
        <div className="max-w-2xl animate-fade-in-up" key={featured.id}>
          <div className="mb-3 flex items-center gap-2">
            {featured.type === 'ANIME' && (
              <span className="rounded bg-accent/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-accent border border-accent/30">
                Anime
              </span>
            )}
            {featured.type === 'SERIES' && (
              <span className="rounded bg-blue-500/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-400 border border-blue-500/30">
                Series
              </span>
            )}
            {featured.rating > 0 && (
              <span className="flex items-center gap-1 rounded bg-yellow-500/10 px-2 py-1 text-xs font-bold text-yellow-400 border border-yellow-500/20">
                <Star className="h-3 w-3 fill-current" />
                {featured.rating.toFixed(1)}
              </span>
            )}
          </div>

          <h1 className="text-4xl font-extrabold text-white md:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
            {featured.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2.5 text-sm text-white/60">
            {featured.releaseDate && (
              <span className="font-medium">{new Date(featured.releaseDate).getFullYear()}</span>
            )}
            {featured.runtime > 0 && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span>{Math.floor(featured.runtime / 60)}h {featured.runtime % 60}m</span>
              </>
            )}
            {featured.seasons > 0 && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span className="font-medium">{featured.seasons} Season{featured.seasons !== 1 ? 's' : ''}</span>
              </>
            )}
            {featured.genre && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span>{featured.genre}</span>
              </>
            )}
          </div>

          <p className="mt-5 line-clamp-3 text-sm leading-relaxed text-white/70 md:text-base max-w-xl">
            {featured.description}
          </p>

          <div className="mt-8 flex items-center gap-4">
            <Link
              href={`/watch/${featured.slug}`}
              className="btn-primary flex items-center gap-2.5 text-base !px-8 !py-3.5 rounded-xl shadow-lg shadow-accent/20"
            >
              <Play className="h-5 w-5 fill-current" />
              Play Now
            </Link>
            <Link
              href={`/watch/${featured.slug}`}
              className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              <Info className="h-5 w-5" />
              More Info
            </Link>
          </div>
        </div>
      </div>

      {items.length > 1 && (
        <>
          <button
            onClick={() => goTo((current - 1 + items.length) % items.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white/70 transition-all hover:bg-black/50 hover:text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => goTo((current + 1) % items.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white/70 transition-all hover:bg-black/50 hover:text-white"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="absolute bottom-8 right-12 z-20 flex items-center gap-2">
            {items.slice(0, 7).map((item, i) => (
              <button
                key={item.id}
                onClick={() => goTo(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-500',
                  i === current ? 'w-10 bg-accent' : 'w-2 bg-white/30 hover:bg-white/50'
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
