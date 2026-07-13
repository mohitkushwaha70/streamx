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
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-accent/10">
          {item.poster ? (
            <img
              src={item.poster}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface to-surface-hover text-muted text-sm font-medium">
              No Poster
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
            <div className="flex items-center gap-3">
              <Link
                href={`/watch/${item.slug}`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition-transform hover:scale-110"
                onClick={(e) => e.stopPropagation()}
              >
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </Link>
              <div className="text-xs text-white/80 font-medium">
                {item.type === 'SERIES' || item.type === 'ANIME'
                  ? `${item.seasons} Season${item.seasons !== 1 ? 's' : ''}`
                  : item.runtime
                  ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m`
                  : ''}
              </div>
            </div>
          </div>

          {item.rating > 0 && (
            <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-lg bg-black/70 backdrop-blur-sm px-2 py-1 text-xs font-bold text-yellow-400">
              <Star className="h-3 w-3 fill-current" />
              {item.rating.toFixed(1)}
            </div>
          )}

          {item.type !== 'MOVIE' && (
            <div className="absolute left-2.5 top-2.5">
              <span className="rounded-md bg-accent/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                {item.type === 'ANIME' ? 'Anime' : 'Series'}
              </span>
            </div>
          )}

          <div className="absolute left-2.5 top-2.5 flex gap-1.5" style={{ top: item.type !== 'MOVIE' ? '2.75rem' : '0.625rem' }}>
            {onToggleBookmark && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleBookmark(item.id);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white/60 transition-colors hover:text-white"
              >
                {bookmarked ? (
                  <BookmarkCheck className="h-3.5 w-3.5 fill-accent text-accent" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </Link>

      <div className="mt-2.5 px-0.5">
        <Link
          href={`/watch/${item.slug}`}
          className="block text-sm font-semibold text-white/90 leading-tight truncate hover:text-white transition-colors"
        >
          {item.title}
        </Link>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
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
