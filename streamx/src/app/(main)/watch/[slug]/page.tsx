'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Play, Bookmark, BookmarkCheck, Clock, CircleCheck, Star,
  ChevronDown, ChevronUp, ArrowLeft,
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
        } catch {}
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
    } catch {}
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
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative h-[55vh] w-full skeleton" />
        <div className="mx-auto max-w-[1440px] px-4 lg:px-12 -mt-28 relative z-10">
          <div className="space-y-5">
            <div className="h-12 w-96 max-w-full rounded-xl skeleton" />
            <div className="flex gap-3">
              <div className="h-6 w-16 rounded skeleton" />
              <div className="h-6 w-12 rounded skeleton" />
              <div className="h-6 w-24 rounded skeleton" />
            </div>
            <div className="h-24 w-full max-w-2xl rounded-xl skeleton" />
            <div className="flex gap-4">
              <div className="h-14 w-40 rounded-xl skeleton" />
              <div className="h-14 w-40 rounded-xl skeleton" />
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
        <Link href="/" className="btn-primary mt-4">Back to Home</Link>
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

  const videoUrl = content.videoUrl || content.huggingFaceUrl;
  const isMovie = content.type === 'MOVIE';
  const canPlay = !!videoUrl;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero backdrop */}
      <div className="relative h-[55vh] w-full overflow-hidden md:h-[65vh]">
        <img
          src={content.banner || content.backdrop || content.poster}
          alt={content.title}
          className="h-full w-full object-cover"
        />
        <div className="gradient-overlay absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />

        <button
          onClick={() => router.back()}
          className="absolute left-4 top-20 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white transition-colors hover:bg-black/60 lg:left-12"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Content info */}
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 lg:px-12 -mt-36">
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Poster */}
          <div className="flex-shrink-0 md:w-72">
            <div className="overflow-hidden rounded-xl border border-white/10 shadow-2xl">
              <img
                src={content.poster || content.backdrop}
                alt={content.title}
                className="w-full object-cover"
              />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-extrabold text-white md:text-5xl leading-tight tracking-tight">
              {content.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/60">
              {year && <span className="font-medium">{year}</span>}
              {content.runtime > 0 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <span>{formatDuration(content.runtime)}</span>
                </>
              )}
              {content.seasons > 0 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <span className="font-medium">{content.seasons} Season{content.seasons !== 1 ? 's' : ''}</span>
                </>
              )}
              {content.rating > 0 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <span className="flex items-center gap-1 text-yellow-400 font-bold">
                    <Star className="h-4 w-4 fill-current" />
                    {formatRating(content.rating)}
                  </span>
                </>
              )}
              {content.language && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <span className="uppercase font-medium tracking-wider">{content.language}</span>
                </>
              )}
            </div>

            {content.genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {content.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/70"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-6 text-sm leading-relaxed text-white/70 md:text-base max-w-3xl">
              {content.description}
            </p>

            {/* Action buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {canPlay && (
                <Link
                  href={`/player/${content.id}`}
                  className="btn-primary flex items-center gap-3 text-base !px-8 !py-3.5 rounded-xl"
                >
                  <Play className="h-5 w-5 fill-current" />
                  {isMovie ? 'Play Movie' : 'Play Now'}
                </Link>
              )}

              {!canPlay && (
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm text-white/50">
                  <Play className="h-5 w-5" />
                  Coming Soon
                </div>
              )}

              {content.trailerUrl && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Trailer
                </button>
              )}

              <button
                onClick={toggleBookmark}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-white/20 bg-white/5 text-white transition-all hover:bg-white/10"
              >
                {bookmarked ? <BookmarkCheck className="h-5 w-5 text-accent" /> : <Bookmark className="h-5 w-5" />}
              </button>

              <button
                onClick={toggleWatchLater}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-white/20 bg-white/5 text-white transition-all hover:bg-white/10"
              >
                {watchLater ? <CircleCheck className="h-5 w-5 text-accent" /> : <Clock className="h-5 w-5" />}
              </button>
            </div>

            {/* Cast */}
            {content.cast.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cast</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(showAllCast ? content.cast : content.cast.slice(0, 8)).map((name) => (
                    <span
                      key={name}
                      className="rounded-lg bg-white/5 border border-white/5 px-3 py-1.5 text-xs text-white/60 font-medium"
                    >
                      {name}
                    </span>
                  ))}
                  {content.cast.length > 8 && (
                    <button
                      onClick={() => setShowAllCast(!showAllCast)}
                      className="flex items-center gap-1 rounded-lg bg-accent/10 border border-accent/20 px-3 py-1.5 text-xs text-accent font-medium transition-colors hover:bg-accent/20"
                    >
                      {showAllCast ? (
                        <>Less <ChevronUp className="h-3 w-3" /></>
                      ) : (
                        <>+{content.cast.length - 8} more <ChevronDown className="h-3 w-3" /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {content.director && (
              <div className="mt-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Director</h3>
                <p className="mt-2 text-sm text-white/60">{content.director}</p>
              </div>
            )}
          </div>
        </div>

        {/* Episodes */}
        {seasons.length > 0 && (
          <div className="mt-14">
            <h2 className="text-2xl font-bold text-white">Episodes</h2>

            <div className="mt-5 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {seasons.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSeason(s)}
                  className={cn(
                    'flex-none rounded-xl px-5 py-2.5 text-sm font-bold transition-all',
                    selectedSeason === s
                      ? 'bg-accent text-white shadow-lg shadow-accent/20'
                      : 'border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  )}
                >
                  Season {s}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {currentEpisodes.map((ep) => (
                <div
                  key={ep.id}
                  className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.05] hover:border-white/10"
                >
                  <div className="flex-none text-center">
                    <span className="text-xl font-black text-white/30">
                      {String(ep.number).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{ep.title}</h4>
                    <p className="mt-1.5 line-clamp-2 text-xs text-white/50 leading-relaxed">{ep.description}</p>
                    <div className="mt-2.5 flex items-center gap-3 text-xs text-white/40">
                      {ep.duration > 0 && <span>{formatDuration(ep.duration)}</span>}
                      {ep.rating > 0 && (
                        <span className="flex items-center gap-0.5 text-yellow-400">
                          <Star className="h-3 w-3 fill-current" />
                          {ep.rating.toFixed(1)}
                        </span>
                      )}
                      {ep.airDate && <span>{new Date(ep.airDate).toLocaleDateString()}</span>}
                    </div>
                  </div>

                  {(ep.videoUrl || ep.huggingFaceUrl) && (
                    <Link
                      href={`/player/${content.id}?episode=${ep.id}`}
                      className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition-transform hover:scale-110"
                    >
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-14 pb-16">
            <ContentRow title="More Like This" items={related} />
          </div>
        )}
      </div>

      {/* Trailer modal */}
      <Modal isOpen={showTrailer} onClose={() => setShowTrailer(false)}>
        <div className="aspect-video w-full">
          <iframe
            src={
              content.trailerUrl?.includes('youtube.com') || content.trailerUrl?.includes('youtu.be')
                ? content.trailerUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')
                : content.trailerUrl
            }
            title={`${content.title} trailer`}
            className="h-full w-full rounded-xl"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </Modal>
    </div>
  );
}
