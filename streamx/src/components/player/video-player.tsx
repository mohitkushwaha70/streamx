'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  contentId: string;
  src: string;
  title: string;
  poster?: string;
  episodes?: { id: string; season: number; number: number; title: string; videoUrl?: string }[];
  currentEpisode?: { id: string; season: number; number: number; title: string };
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  onEnded?: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayer({
  contentId,
  src,
  title,
  poster,
  episodes,
  currentEpisode,
  onPrevEpisode,
  onNextEpisode,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [pip, setPip] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const [skipIndicator, setSkipIndicator] = useState<'forward' | 'backward' | null>(null);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (playing) {
      hideTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(time, v.duration || 0));
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const changeVolume = useCallback((val: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(1, val));
    v.volume = clamped;
    v.muted = clamped === 0;
    setVolume(clamped);
    setMuted(clamped === 0);
  }, []);

  const changeSpeed = useCallback((s: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    setShowSpeedMenu(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await container.requestFullscreen();
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (v.requestPictureInPicture) {
        await v.requestPictureInPicture();
      }
    } catch {}
  }, []);

  const showSkipIndicator = useCallback((dir: 'forward' | 'backward') => {
    setSkipIndicator(dir);
    setTimeout(() => setSkipIndicator(null), 800);
  }, []);

  // Video event listeners
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
    };
    const onDurationChange = () => setDuration(v.duration);
    const onWaiting = () => setBuffering(true);
    const onCanPlay = () => setBuffering(false);
    const onEnded = () => {
      setPlaying(false);
      onEnded?.();
    };
    const onVolumeChange = () => {
      setVolume(v.volume);
      setMuted(v.muted);
    };
    const onRateChange = () => setSpeed(v.playbackRate);
    const onEnterPictureInPicture = () => setPip(true);
    const onLeavePictureInPicture = () => setPip(false);

    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('durationchange', onDurationChange);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('ended', onEnded);
    v.addEventListener('volumechange', onVolumeChange);
    v.addEventListener('ratechange', onRateChange);
    v.addEventListener('enterpictureinpicture', onEnterPictureInPicture);
    v.addEventListener('leavepictureinpicture', onLeavePictureInPicture);

    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('durationchange', onDurationChange);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('volumechange', onVolumeChange);
      v.removeEventListener('ratechange', onRateChange);
      v.removeEventListener('enterpictureinpicture', onEnterPictureInPicture);
      v.removeEventListener('leavepictureinpicture', onLeavePictureInPicture);
    };
  }, [onEnded]);

  // Auto-hide controls
  useEffect(() => {
    if (playing) {
      hideTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    } else {
      setShowControls(true);
    }
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [playing]);

  // Resume from saved position
  useEffect(() => {
    if (!src) return;
    const key = `playback_${contentId}`;
    const saved = localStorage.getItem(key);
    if (saved && videoRef.current) {
      const pos = parseFloat(saved);
      if (pos > 5) {
        videoRef.current.currentTime = pos;
      }
    }
  }, [contentId, src]);

  // Save playback position every 10s
  useEffect(() => {
    const key = `playback_${contentId}`;
    saveIntervalRef.current = setInterval(() => {
      const v = videoRef.current;
      if (v && v.currentTime > 0 && !v.paused) {
        localStorage.setItem(key, String(v.currentTime));
        fetch('/api/user/playback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentId, position: v.currentTime }),
        }).catch(() => {});
      }
    }, 10000);
    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [contentId]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(v.currentTime - 10);
          showSkipIndicator('backward');
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(v.currentTime + 10);
          showSkipIndicator('forward');
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(v.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(v.volume - 0.1);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePiP();
          break;
        case '<':
          e.preventDefault();
          {
            const idx = SPEEDS.indexOf(speed);
            if (idx > 0) changeSpeed(SPEEDS[idx - 1]);
          }
          break;
        case '>':
          e.preventDefault();
          {
            const idx = SPEEDS.indexOf(speed);
            if (idx < SPEEDS.length - 1) changeSpeed(SPEEDS[idx + 1]);
          }
          break;
      }
      resetHideTimer();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, seek, changeVolume, toggleMute, toggleFullscreen, togglePiP, speed, changeSpeed, resetHideTimer, showSkipIndicator]);

  // Progress bar interactions
  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverProgress(pct);
    setHoverTime(pct * duration);
  };

  const handleProgressSeekStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setSeeking(true);
    handleProgressHover(e);
  };

  const handleProgressSeekMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (seeking) handleProgressHover(e);
  };

  const handleProgressSeekEnd = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!seeking) return;
    const bar = progressRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(pct * duration);
    setSeeking(false);
    setHoverProgress(null);
  };

  // Volume slider
  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = volumeRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    changeVolume(pct);
  };

  // Double-click fullscreen
  const lastClickRef = useRef<number>(0);
  const handleDoubleClick = () => {
    toggleFullscreen();
  };

  const handleClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) {
      handleDoubleClick();
      lastClickRef.current = 0;
      return;
    }
    lastClickRef.current = now;
    togglePlay();
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const hasEpisodes = episodes && episodes.length > 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black select-none overflow-hidden group"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => {
        if (playing) setShowControls(false);
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        onClick={handleClick}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFullscreen();
        }}
        className="w-full h-full object-contain"
      />

      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 border-4 border-white/20 border-t-[#e50914] rounded-full animate-spin" />
        </div>
      )}

      {skipIndicator && (
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 transition-opacity duration-300',
            skipIndicator === 'forward' ? 'right-16' : 'left-16',
            'text-white/70 text-sm font-medium'
          )}
        >
          {skipIndicator === 'forward' ? (
            <>
              <SkipForward className="w-10 h-10" />
              <span>10s</span>
            </>
          ) : (
            <>
              <SkipBack className="w-10 h-10" />
              <span>10s</span>
            </>
          )}
        </div>
      )}

      {!playing && !buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
            <Play className="w-10 h-10 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-300 pointer-events-none',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-5 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h2 className="text-white font-semibold text-lg leading-tight">{title}</h2>
              {currentEpisode && (
                <p className="text-white/60 text-sm mt-0.5">
                  S{currentEpisode.season} E{currentEpisode.number} — {currentEpisode.title}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto" />

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 z-10">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative h-6 flex items-center cursor-pointer group/progress mb-2"
            onMouseDown={handleProgressSeekStart}
            onMouseMove={handleProgressSeekMove}
            onMouseUp={handleProgressSeekEnd}
            onMouseLeave={() => {
              if (!seeking) setHoverProgress(null);
            }}
          >
            <div className="w-full h-1 group-hover/progress:h-1.5 bg-white/20 rounded-full relative transition-all overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#e50914] rounded-full"
                style={{ width: `${progress}%` }}
              />
              {hoverProgress !== null && (
                <div
                  className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
                  style={{ width: `${hoverProgress * 100}%` }}
                />
              )}
            </div>
            {hoverProgress !== null && (
              <div
                className="absolute -top-9 px-2 py-1 rounded bg-black/90 text-white text-xs font-medium -translate-x-1/2 pointer-events-none whitespace-nowrap"
                style={{ left: `${hoverProgress * 100}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
            <div
              className={cn(
                'absolute w-3 h-3 bg-[#e50914] rounded-full -translate-x-1/2 top-1/2 -translate-y-1/2 shadow-md transition-opacity',
                seeking || showControls ? 'opacity-100' : 'opacity-0'
              )}
              style={{ left: `${progress}%` }}
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="p-1 hover:text-[#e50914] transition-colors text-white">
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-white" />}
              </button>

              {hasEpisodes && (
                <button
                  onClick={onPrevEpisode}
                  disabled={!onPrevEpisode}
                  className="p-1 hover:text-[#e50914] transition-colors text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
              )}

              {hasEpisodes && (
                <button
                  onClick={onNextEpisode}
                  disabled={!onNextEpisode}
                  className="p-1 hover:text-[#e50914] transition-colors text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={() => seek(currentTime - 10)}
                className="p-1 text-white/80 hover:text-white transition-colors hidden sm:block"
              >
                <SkipBack className="w-4 h-4" />
                <span className="sr-only">-10s</span>
              </button>

              <button
                onClick={() => seek(currentTime + 10)}
                className="p-1 text-white/80 hover:text-white transition-colors hidden sm:block"
              >
                <SkipForward className="w-4 h-4" />
                <span className="sr-only">+10s</span>
              </button>

              <div
                className="relative flex items-center"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button onClick={toggleMute} className="p-1 text-white hover:text-[#e50914] transition-colors">
                  {muted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                {showVolumeSlider && (
                  <div className="ml-1">
                    <div
                      ref={volumeRef}
                      className="w-20 h-1 bg-white/20 rounded-full cursor-pointer relative"
                      onClick={handleVolumeChange}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-[#e50914] rounded-full"
                        style={{ width: `${(muted ? 0 : volume) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <span className="text-white/80 text-sm font-mono">
                {formatTime(currentTime)} <span className="text-white/40">/</span> {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasEpisodes && currentEpisode && (
                <button
                  onClick={() => {
                    const eps = episodes || [];
                    const idx = eps.findIndex((e) => e.id === currentEpisode.id);
                    const next = eps[idx + 1];
                    if (next) {
                      onNextEpisode?.();
                    }
                  }}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <Subtitles className="w-4.5 h-4.5 text-white/50 cursor-pointer hover:text-white transition-colors hidden sm:block" />

              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center gap-1 px-2 py-1 text-white/80 hover:text-white text-sm font-medium transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">{speed}x</span>
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 glass rounded-lg py-1 min-w-[120px]">
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={cn(
                          'w-full px-4 py-2 text-sm text-left transition-colors',
                          s === speed ? 'text-[#e50914] bg-white/5' : 'text-white hover:bg-white/10'
                        )}
                      >
                        {s}x {s === 1 && '(Normal)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={togglePiP} className="p-1 text-white/80 hover:text-white transition-colors hidden sm:block">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <rect x="11" y="9" width="9" height="7" rx="1" fill="currentColor" opacity="0.3" />
                </svg>
              </button>

              <button onClick={toggleFullscreen} className="p-1 text-white/80 hover:text-white transition-colors">
                {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
