const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { movies, series } = require('../data/sample');
const { fetchMovies, fetchSeries, searchMovies: tmdbSearch, TMDB_IMG } = require('../services/tmdb');

let videoConfig = {};
function reloadVideoConfig() {
  try { videoConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'videos.json'), 'utf8')).videos || {}; } catch (e) {}
}
reloadVideoConfig();

router.get('/', async (req, res) => {
  reloadVideoConfig();
  const tmdbMovies = await fetchMovies().catch(() => null);
  const tmdbSeries = await fetchSeries().catch(() => null);

  let allMovies = tmdbMovies || [];
  let allSeries = tmdbSeries || [];

  const videoTmdbIds = Object.keys(videoConfig).filter(k => !isNaN(k)).map(Number);
  for (const tmdbId of videoTmdbIds) {
    const cfg = videoConfig[tmdbId];
    const existing = allMovies.find(m => (m.tmdbId || m.id) === tmdbId);
    if (!existing) {
      allMovies.push({
        id: tmdbId, tmdbId,
        title: cfg.title || `Movie ${tmdbId}`,
        genre: cfg.genre || 'Unknown',
        year: cfg.year || 2024,
        rating: cfg.rating || 7.0,
        duration: cfg.duration || '2h',
        poster: cfg.poster || `https://picsum.photos/seed/${tmdbId}/400/600`,
        backdrop: cfg.backdrop || '',
        description: cfg.description || '',
        premium: false, badge: 'new',
        videoUrl: '/stream/' + decodeURIComponent(Object.values(cfg.sources)[0].match(/\/resolve\/main\/(.+)/)?.[1] || Object.values(cfg.sources)[0].match(/\/resolve\/(.+)/)?.[1] || ''),
        videoType: 'mp4'
      });
    }
  }

  const heroMovies = allMovies.length > 0
    ? allMovies.slice(0, 5).map(m => ({
        ...m,
        backdrop: m.backdrop || (m.poster ? m.poster.replace('w500', 'original') : ''),
      }))
    : [{ id: '', title: 'streamX', genre: '', year: 2026, rating: 0, duration: '', description: 'Your favorite streaming platform.', poster: '', backdrop: '', premium: false }];
  const trending = allMovies.slice(0, 10);
  const newReleases = allMovies.filter(m => m.badge === 'new').slice(0, 8);
  const topRated = [...allMovies].sort((a, b) => b.rating - a.rating).slice(0, 10);

  let continueWatching = (req.session.continueWatching || [])
    .sort((a, b) => b.lastWatched - a.lastWatched)
    .slice(0, 8);
  const top10 = [...allMovies].sort((a, b) => b.rating - a.rating).slice(0, 10);
  const trendingSeries = allSeries.slice(0, 8);

  res.render('index', { heroMovies, heroMovie: heroMovies[0], trending, newReleases, topRated, continueWatching, top10, trendingSeries, movies: allMovies, allSeries, TMDB_IMG });
});

router.get('/pricing', (req, res) => {
  res.render('pricing');
});

router.get('/search', async (req, res) => {
  const q = req.query.q || '';
  let results = [];
  if (q) {
    const { searchMovies: tmdbSearch } = require('../services/tmdb');
    const tmdbResults = await tmdbSearch(q).catch(() => []);
    results = tmdbResults.map(r => ({
      id: r.id,
      title: r.title || r.name,
      genre: r.genre_ids?.[0] ? '' : '',
      year: (r.release_date || r.first_air_date || '').slice(0, 4),
      rating: r.vote_average ? parseFloat(r.vote_average.toFixed(1)) : 0,
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '',
      backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/original${r.backdrop_path}` : '',
      type: r.media_type || 'movie',
      description: r.overview || ''
    }));
    if (results.length === 0) {
      results = [];
    }
  }
  res.render('search', { query: q, results });
});

module.exports = router;
