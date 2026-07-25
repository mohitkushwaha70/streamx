'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import VideoPlayer from '@/components/player/video-player';
import type { ContentItem, Episode } from '@/types';
import { ChevronRight } from 'lucide-react';

export default function PlayerPage() {
  const params = useParams();
  const id = params.id as string;

  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState(1);

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch(`/api/content/${id}`);
        if (!res.ok) throw new Error('Content not found');
        const json = await res.json();
        if (json.success) {
          setContent(json.data);
        } else {
          setError(json.error || 'Failed to load content');
        }
      } catch {
        setError('Failed to load content');
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [id]);

  const isSeries = content?.type === 'SERIES' || content?.type === 'ANIME';
  const episodes = content?.episodes || [];
  const seasons = [...new Set(episodes.map((e) => e.season))].sort((a, b) => a - b);
  const seasonEpisodes = episodes
    .filter((e) => e.season === selectedSeason)
    .sort((a, b) => a.number - b.number);

  const currentEpisode = isSeries && seasonEpisodes.length > 0
    ? seasonEpisodes[currentEpisodeIndex] || seasonEpisodes[0]
    : undefined;

  const handlePrevEpisode = useCallback(() => {
    if (currentEpisodeIndex > 0) {
      setCurrentEpisodeIndex((i) => i - 1);
    } else if (selectedSeason > 1) {
      const prevSeason = selectedSeason - 1;
      const prevSeasonEps = episodes
        .filter((e) => e.season === prevSeason)
        .sort((a, b) => a.number - b.number);
      setSelectedSeason(prevSeason);
      setCurrentEpisodeIndex(Math.max(0, prevSeasonEps.length - 1));
    }
  }, [currentEpisodeIndex, selectedSeason, episodes]);

  const handleNextEpisode = useCallback(() => {
    if (currentEpisodeIndex < seasonEpisodes.length - 1) {
      setCurrentEpisodeIndex((i) => i + 1);
    } else {
      const nextSeason = selectedSeason + 1;
      if (seasons.includes(nextSeason)) {
        setSelectedSeason(nextSeason);
        setCurrentEpisodeIndex(0);
      }
    }
  }, [currentEpisodeIndex, seasonEpisodes.length, selectedSeason, seasons]);

  const handleEnded = useCallback(() => {
    if (isSeries && currentEpisode) {
      handleNextEpisode();
    }
  }, [isSeries, currentEpisode, handleNextEpisode]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-14 h-14 border-4 border-white/20 border-t-[#e50914] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white/70 text-lg">{error || 'Content not found'}</p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-[#e50914] text-white rounded-md hover:bg-[#b20710] transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const videoSrc = currentEpisode?.videoUrl || content.videoUrl || content.huggingFaceUrl || '';

  return (
    <div className="fixed inset-0 bg-black">
      <VideoPlayer
        contentId={content.id}
        src={videoSrc}
        title={content.title}
        poster={content.poster || undefined}
        episodes={isSeries ? seasonEpisodes.map((e) => ({ id: e.id, season: e.season, number: e.number, title: e.title, videoUrl: e.videoUrl || undefined })) : undefined}
        currentEpisode={currentEpisode ? { id: currentEpisode.id, season: currentEpisode.season, number: currentEpisode.number, title: currentEpisode.title } : undefined}
        onPrevEpisode={handlePrevEpisode}
        onNextEpisode={handleNextEpisode}
        onEnded={handleEnded}
      />

      {/* Season/Episode overlay */}
      {isSeries && seasons.length > 0 && (
        <div className="absolute top-20 right-4 z-50">
          <details className="group">
            <summary className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white text-sm cursor-pointer hover:bg-white/20 transition-colors list-none">
              Season {selectedSeason}
              <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" />
            </summary>
            <div className="mt-2 glass rounded-lg p-2 max-h-64 overflow-y-auto min-w-[200px]">
              {seasons.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSelectedSeason(s);
                    setCurrentEpisodeIndex(0);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    s === selectedSeason ? 'bg-[#e50914] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Season {s}
                </button>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
