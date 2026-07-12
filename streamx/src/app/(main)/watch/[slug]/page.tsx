'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Play, Bookmark, BookmarkCheck, Clock, ClockCheck, Star,
  ChevronDown, ChevronUp, ExternalLink, ArrowLeft,
} from 'lucide-react';
import { cn, formatDuration, formatRating } from '@/lib/utils';
import { ContentRow } from '@/components/ui/content-row';
import { Modal } from '@/components/ui/modal';
import type { ContentItem, Episode } from '@/types';

interface ContentDetail extends ContentItem {
  episodes: Episode[];
}

export default function WatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [watchLater, setWatchLater] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [showAllCast, setShowAllCast] = useState(false);
  const [related, setRelated] = useState<ContentItem[]>([]);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  const fetchContent = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/content/${slug}`);
      if (!res.ok) throw new Error('Content not found');
      const data = await res.json();
      if (data.success) {
        setContent(data.data);

        const [bmRes, wlRes] = await Promise.allSettled([
          fetch('/api/user/bookmarks'),
          fetch('/api/user/watchlater'),
        ]);

        if (bmRes.status === 'fulfilled' && bmRes.value.ok) {
          const bmData = await bmRes.value.json();
          if (bmData.success) {
            setBookmarked(bmData.data.some((c: ContentItem) => c.id === data.data.id));
          }
        }
        if (wlRes.status === 'fulfilled' && wlRes.value.ok) {
          const wlData = await wlRes.value.json();
          if (wlData.success) {
            setWatchLater(wlData.data.some((c: ContentItem) => c.id === data.data.id));
          }
        }

        try {
          const relRes = await fetch(`/api/content?type=${data.data.type}&limit=12`);
          if (relRes.ok) {
            const relData = await relRes.json();
            if (relData.success) {
              setRelated(
                relData.data.items.filter((i: ContentItem) => i.id !== data.data.id).slice(0, 12)
              );
            }
          }
        } catch {
          // silent
        }
      } else {
        setError(data.error || 'Content not found');
      }
    } catch {
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const toggleBookmark = async () => {
    if (!content) return;
    try {
      const res = await fetch('/api/user/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: content.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(data.data.bookmarked);
      }
    } catch {
      // silent
    }
  };

  const toggleWatchLater = async () => {
    if (!content) return;
    try {
      const res = await fetch('/api/user/watchlater', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: content.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setWatchLater(data.data.added);
      }
    } catch {
      // silent
    }
  };

  const handlePlay = async () => {
    if (!content) return;
    try {
      await fetch('/api/user/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: content.id, progress: 0 }),
      });
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative h-[50vh] w-full skeleton" />
        <div className="mx-auto max-w-[1440px] px-4 lg:px-8 -mt-24 relative z-10">
          <div className="space-y-4">
            <div className="h-10 w-96 max-w-full rounded skeleton" />
            <div className="flex gap-3">
              <div className="h-5 w-16 rounded skeleton" />
              <div className="h-5 w-12 rounded skeleton" />
              <div className="h-5 w-20 rounded skeleton" />
            </div>
            <div className="h-20 w-full max-w-2xl rounded skeleton" />
            <div className="flex gap-3">
              <div className="h-12 w-36 rounded-md skeleton" />
              <div className="h-12 w-36 rounded-md skeleton" />
              <div className="h-12 w-12 rounded-md skeleton" />
              <div className="h-12 w-12 rounded-md skeleton" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center">
        <p className="text-lg font-medium text-white">{error || 'Content not found'}</p>
        <Link href="/" className="btn-primary mt-4">
          Back to Home
        </Link>
      </div>
    );
  }

  const year = content.releaseDate ? new Date(content.releaseDate).getFullYear() : '';
  const episodesBySeason = content.episodes?.reduce(
    (acc, ep) => {
      (acc[ep.season] = acc[ep.season] || []).push(ep);
      return acc;
    },
    {} as Record<number, Episode[]>
  ) || {};
  const seasons = Object.keys(episodesBySeason).map(Number).sort((a, b) => a - b);
  const currentEpisodes = episodesBySeason[selectedSeason] || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[50vh] w-full overflow-hidden md:h-[60vh]">
        <img
          src={content.banner || content.backdrop}
          alt={content.title}
          className="h-full w-full object-cover"
        />
        <div className="gradient-overlay absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />

        <button
          onClick={() => router.back()}
          className="absolute left-4 top-20 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface/80 text-white backdrop-blur-sm transition-colors hover:bg-surface-hover lg:left-8"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 lg:px-8 -mt-32">
        <div className="flex flex-col gap-8 md:flex-row">
          <div className="flex-shrink-0 md:w-64">
            <div className="overflow-hidden rounded-lg border border-border shadow-2xl">
              <img
                src={content.poster || content.backdrop}
                alt={content.title}
                className="w-full object-cover"
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white md:text-4xl leading-tight">
              {content.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
              {year && <span>{year}</span>}
              {content.runtime > 0 && (
                <>
                  <span className="h-0.5 w-0.5 rounded-full bg-muted" />
                  <span>{formatDuration(content.runtime)}</span>
                </>
              )}
              {content.seasons > 0 && (
                <>
                  <span className="h-0.5 w-0.5 rounded-full bg-muted" />
                  <span>{content.seasons} Season{content.seasons !== 1 ? 's' : ''}</span>
                </>
              )}
              {content.rating > 0 && (
                <>
                  <span className="h-0.5 w-0.5 rounded-full bg-muted" />
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Star className="h-4 w-4 fill-current" />
                    {formatRating(content.rating)}
                  </span>
                </>
              )}
              {content.language && (
                <>
                  <span className="h-0.5 w-0.5 rounded-full bg-muted" />
                  <span className="uppercase">{content.language}</span>
                </>
              )}
            </div>

            {content.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {content.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-border bg-surface/50 px-3 py-1 text-xs font-medium text-muted"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-5 text-sm leading-relaxed text-white/80 md:text-base">
              {content.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {(content.videoUrl || content.huggingFaceUrl) && (
                <a
                  href={content.videoUrl || content.huggingFaceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handlePlay}
                  className="btn-primary flex items-center gap-2 text-base"
                >
                  <Play className="h-5 w-5 fill-current" />
                  Play Now
                </a>
              )}

              {content.trailerUrl && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface/80 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-surface-hover"
                >
                  <ExternalLink className="h-4 w-4" />
                  Trailer
                </button>
              )}

              <button
                onClick={toggleBookmark}
                className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface/80 text-white transition-colors hover:bg-surface-hover"
                aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                {bookmarked ? (
                  <BookmarkCheck className="h-5 w-5 text-accent" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={toggleWatchLater}
                className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface/80 text-white transition-colors hover:bg-surface-hover"
                aria-label={watchLater ? 'Remove from watch later' : 'Add to watch later'}
              >
                {watchLater ? (
                  <ClockCheck className="h-5 w-5 text-accent" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
              </button>
            </div>

            {content.cast.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white">Cast</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(showAllCast ? content.cast : content.cast.slice(0, 6)).map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-surface-hover px-3 py-1 text-xs text-muted"
                    >
                      {name}
                    </span>
                  ))}
                  {content.cast.length > 6 && (
                    <button
                      onClick={() => setShowAllCast(!showAllCast)}
                      className="flex items-center gap-1 rounded-full bg-surface-hover px-3 py-1 text-xs text-accent transition-colors hover:text-white"
                    >
                      {showAllCast ? (
                        <>Less <ChevronUp className="h-3 w-3" /></>
                      ) : (
                        <>+{content.cast.length - 6} more <ChevronDown className="h-3 w-3" /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {content.director && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-white">Director</h3>
                <p className="mt-1 text-sm text-muted">{content.director}</p>
              </div>
            )}
          </div>
        </div>

        {seasons.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white">Episodes</h2>

            <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {seasons.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSeason(s)}
                  className={cn(
                    'flex-none rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    selectedSeason === s
                      ? 'bg-accent text-white'
                      : 'border border-border bg-surface text-muted hover:text-white'
                  )}
                >
                  Season {s}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {currentEpisodes.map((ep) => (
                <div
                  key={ep.id}
                  className="flex gap-4 rounded-lg border border-border bg-surface/50 p-3 transition-colors hover:bg-surface-hover"
                >
                  <div className="flex-none text-center">
                    <span className="text-lg font-bold text-muted">
                      {String(ep.number).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{ep.title}</h4>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{ep.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                      {ep.duration > 0 && <span>{formatDuration(ep.duration)}</span>}
                      {ep.rating > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {ep.rating.toFixed(1)}
                        </span>
                      )}
                      {ep.airDate && <span>{new Date(ep.airDate).toLocaleDateString()}</span>}
                    </div>
                  </div>

                  {(ep.videoUrl || ep.huggingFaceUrl) && (
                    <a
                      href={ep.videoUrl || ep.huggingFaceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover"
                    >
                      <Play className="h-4 w-4 fill-current" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div className="mt-12 pb-12">
            <ContentRow title="More Like This" items={related} />
          </div>
        )}
      </div>

      <Modal isOpen={showTrailer} onClose={() => setShowTrailer(false)}>
        <div className="aspect-video w-full">
          <iframe
            src={
              content.trailerUrl?.includes('youtube.com') || content.trailerUrl?.includes('youtu.be')
                ? content.trailerUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')
                : content.trailerUrl
            }
            title={`${content.title} trailer`}
            className="h-full w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </Modal>
    </div>
  );
}
