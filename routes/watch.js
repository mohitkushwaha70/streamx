const express = require('express');
const router = express.Router();
const { movies: sampleMovies, series: sampleSeries } = require('../data/sample');
const { fetchMovies, fetchSeries } = require('../services/tmdb');
const { getStreamingInfo, getSourceIcon, getSourceColor } = require('../services/watchmode');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

function headers() {
  return {
    'Authorization': `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
    'Accept': 'application/json'
  };
}

async function fetchSeasonEpisodes(tmdbId, seasonNumber) {
  try {
    const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}/season/${seasonNumber}?language=en-US`, { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.episodes || []).map(ep => ({
      number: ep.episode_number,
      season: ep.season_number,
      title: ep.name || `Episode ${ep.episode_number}`,
      duration: ep.runtime ? `${ep.runtime}m` : '',
      description: ep.overview || '',
      poster: ep.still_path ? `${TMDB_IMG}/w300${ep.still_path}` : '',
      airDate: ep.air_date || '',
      rating: ep.vote_average ? ep.vote_average.toFixed(1) : ''
    }));
  } catch { return []; }
}

router.get('/:type/:id', async (req, res) => {
  if (!req.session.user) {
    req.session.error = 'Please sign in to watch content';
    return res.redirect('/auth/login');
  }
  const { type, id } = req.params;
  const itemId = parseInt(id);
  const ep = parseInt(req.query.ep) || 1;
  const season = parseInt(req.query.season) || 1;

  const tmdbMovies = await fetchMovies().catch(() => null);
  const tmdbSeries = await fetchSeries().catch(() => null);

  const tmdbMovieIds = new Set((tmdbMovies || []).map(m => m.tmdbId || m.id));
  const localOnlyMovies = sampleMovies.filter(m => !tmdbMovieIds.has(m.id));
  const allMovies = [...(tmdbMovies || []), ...localOnlyMovies];

  const tmdbSeriesIds = new Set((tmdbSeries || []).map(s => s.tmdbId || s.id));
  const localOnlySeries = sampleSeries.filter(s => !tmdbSeriesIds.has(s.id));
  const allSeries = [...(tmdbSeries || []), ...localOnlySeries];

  let item;
  if (type === 'movie') item = allMovies.find(m => m.id === itemId || m.tmdbId === itemId);
  else item = allSeries.find(s => s.id === itemId || s.tmdbId === itemId);
  if (!item) return res.redirect('/');

  if (!req.session.continueWatching) req.session.continueWatching = [];
  const existing = req.session.continueWatching.find(w => w.id === itemId && w.type === type);
  if (existing) {
    existing.progress = Math.min(existing.progress + Math.floor(Math.random() * 15) + 5, 95);
    existing.lastWatched = Date.now();
  } else {
    req.session.continueWatching.push({
      id: itemId, type: type, title: item.title, poster: item.poster,
      genre: item.genre, duration: item.duration || (item.seasons ? item.seasons + ' Seasons' : ''),
      progress: Math.floor(Math.random() * 30) + 10, lastWatched: Date.now()
    });
  }
  if (req.session.continueWatching.length > 10) {
    req.session.continueWatching = req.session.continueWatching.slice(-10);
  }

  let episodes = [];
  let currentEpisode = null;
  if (type === 'series') {
    const tmdbId = item.tmdbId || item.id;
    episodes = item.episodeList || [];
    if (episodes.length === 0) {
      episodes = await fetchSeasonEpisodes(tmdbId, season);
    }
    currentEpisode = episodes.find(e => e.number === ep) || episodes[0] || null;
  }

  const related = type === 'movie'
    ? allMovies.filter(m => m.genre === item.genre && m.id !== itemId).slice(0, 8)
    : allSeries.filter(s => s.genre === item.genre && s.id !== itemId).slice(0, 8);

  const trending = [...allMovies, ...allSeries].sort((a, b) => b.rating - a.rating).slice(0, 8);
  const shareUrl = `${req.protocol}://${req.get('host')}/watch/${type}/${itemId}`;

  const tmdbId = item.tmdbId || item.id;
  const streamingInfo = await getStreamingInfo(tmdbId, type).catch(() => ({ grouped: {} }));

  function toProxyUrl(url) {
    if (!url) return url;
    const match = url.match(/\/resolve\/main\/(.+)/);
    if (match) return `/stream/${match[1]}`;
    return url;
  }
  if (item.videoUrl && item.videoUrl.includes('huggingface.co')) {
    item.videoUrl = toProxyUrl(item.videoUrl);
  }
  if (item.videoStorageUrl && item.videoStorageUrl.includes('huggingface.co')) {
    item.videoUrl = toProxyUrl(item.videoStorageUrl);
    item.videoType = 'mp4';
  }
  episodes.forEach(ep => {
    if (ep.videoUrl && ep.videoUrl.includes('huggingface.co')) {
      ep.videoUrl = toProxyUrl(ep.videoUrl);
    }
  });

  res.render('player', {
    item, type, related, episodes, currentEpisode, ep, trending,
    totalSeasons: item.seasons || 1, currentSeason: season, shareUrl,
    streaming: streamingInfo.grouped || {},
    getSourceIcon, getSourceColor
  });
});

module.exports = router;
