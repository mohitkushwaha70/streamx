'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/ui/content-card';
import type { ContentItem } from '@/types';

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  bookmarks?: Set<string>;
  watchLater?: Set<string>;
  onToggleBookmark?: (id: string) => void;
  onToggleWatchLater?: (id: string) => void;
  seeAllHref?: string;
}

export function ContentRow({
  title,
  items,
  bookmarks,
  watchLater,
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
      <div className="mb-3 flex items-center justify-between px-4 lg:px-8">
        <h2 className="text-lg font-semibold text-white md:text-xl">{title}</h2>
        <div className="flex items-center gap-2">
          {seeAllHref && (
            <a
              href={seeAllHref}
              className="text-sm text-muted transition-colors hover:text-white"
            >
              See All
            </a>
          )}
          <div className="hidden items-center gap-1 md:flex">
            <button
              onClick={() => scroll('left')}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface/80 text-muted transition-all hover:border-white/20 hover:text-white"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface/80 text-muted transition-all hover:border-white/20 hover:text-white"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative group/row">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-4 lg:px-8"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex-none w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]"
              style={{ scrollSnapAlign: 'start' }}
            >
              <ContentCard
                item={item}
                bookmarked={bookmarks?.has(item.id)}
                watchLater={watchLater?.has(item.id)}
                onToggleBookmark={onToggleBookmark}
                onToggleWatchLater={onToggleWatchLater}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-background/90 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center z-10"
          aria-label="Scroll left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 border border-border text-white">
            <ChevronLeft className="h-5 w-5" />
          </div>
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-background/90 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center z-10"
          aria-label="Scroll right"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 border border-border text-white">
            <ChevronRight className="h-5 w-5" />
          </div>
        </button>
      </div>
    </section>
  );
}
