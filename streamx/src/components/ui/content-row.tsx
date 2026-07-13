'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ContentCard } from '@/components/ui/content-card';
import type { ContentItem } from '@/types';

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  bookmarks?: Set<string>;
  watchLater?: Set<string>;
  progressMap?: Map<string, number>;
  onToggleBookmark?: (id: string) => void;
  onToggleWatchLater?: (id: string) => void;
  seeAllHref?: string;
}

export function ContentRow({
  title,
  items,
  bookmarks,
  watchLater,
  progressMap,
  onToggleBookmark,
  onToggleWatchLater,
  seeAllHref,
}: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  if (!items.length) return null;

  return (
    <section className="relative">
      <div className="mb-4 flex items-center justify-between px-4 lg:px-12">
        <h2 className="text-xl font-bold text-white md:text-2xl tracking-tight">{title}</h2>
        <div className="flex items-center gap-3">
          {seeAllHref && (
            <a
              href={seeAllHref}
              className="text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              View All
            </a>
          )}
          <div className="hidden items-center gap-1.5 md:flex">
            <button
              onClick={() => scroll('left')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition-all hover:border-white/20 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition-all hover:border-white/20 hover:text-white hover:bg-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative group/row">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-4 lg:px-12"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex-none w-[150px] sm:w-[170px] md:w-[190px] lg:w-[210px]"
              style={{ scrollSnapAlign: 'start' }}
            >
              <ContentCard
                item={item}
                bookmarked={bookmarks?.has(item.id)}
                watchLater={watchLater?.has(item.id)}
                progress={progressMap?.get(item.id)}
                onToggleBookmark={onToggleBookmark}
                onToggleWatchLater={onToggleWatchLater}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-4 w-14 bg-gradient-to-r from-background/95 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center z-10"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 border border-white/10 text-white shadow-xl">
            <ChevronLeft className="h-6 w-6" />
          </div>
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-4 w-14 bg-gradient-to-l from-background/95 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center z-10"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 border border-white/10 text-white shadow-xl">
            <ChevronRight className="h-6 w-6" />
          </div>
        </button>
      </div>
    </section>
  );
}
