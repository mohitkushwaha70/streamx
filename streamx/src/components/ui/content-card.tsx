'use client';

import Link from 'next/link';
import { Play, Star, Bookmark, BookmarkCheck, Clock, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentItem } from '@/types';

interface ContentCardProps {
  item: ContentItem;
  bookmarked?: boolean;
  watchLater?: boolean;
  onToggleBookmark?: (id: string) => void;
  onToggleWatchLater?: (id: string) => void;
}

export function ContentCard({
  item,
  bookmarked = false,
  watchLater = false,
  onToggleBookmark,
  onToggleWatchLater,
}: ContentCardProps) {
  const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : '';

  return (
    <div className="group relative">
      <Link href={`/watch/${item.slug}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface">
          {item.poster ? (
            <img
              src={item.poster}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-hover text-muted text-sm">
              No Image
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white">
                <Play className="h-4 w-4 fill-current" />
              </div>
              <span className="text-xs font-medium text-white/90">
                {item.type === 'SERIES' || item.type === 'ANIME'
                  ? `${item.seasons} Season${item.seasons !== 1 ? 's' : ''}`
                  : item.runtime
                  ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m`
                  : ''}
              </span>
            </div>
          </div>

          {item.rating > 0 && (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-yellow-400">
              <Star className="h-3 w-3 fill-current" />
              {item.rating.toFixed(1)}
            </div>
          )}

          <div className="absolute left-2 top-2 flex gap-1">
            {onToggleBookmark && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleBookmark(item.id);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/70 transition-colors hover:text-white"
                aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                {bookmarked ? (
                  <BookmarkCheck className="h-3.5 w-3.5 fill-accent text-accent" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            {onToggleWatchLater && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleWatchLater(item.id);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/70 transition-colors hover:text-white"
                aria-label={watchLater ? 'Remove from watch later' : 'Add to watch later'}
              >
                {watchLater ? (
                  <CircleCheck className="h-3.5 w-3.5 fill-accent text-accent" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </Link>

      <div className="mt-2 px-0.5">
        <Link
          href={`/watch/${item.slug}`}
          className="block text-sm font-medium text-white/90 leading-tight truncate hover:text-white transition-colors"
        >
          {item.title}
        </Link>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          {year && <span>{year}</span>}
          {item.genre && (
            <>
              <span className="h-0.5 w-0.5 rounded-full bg-muted" />
              <span className="truncate">{item.genre}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
