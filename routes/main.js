const express = require('express');
const router = express.Router();
const { movies, series } = require('../data/sample');
const { fetchMovies, fetchSeries, searchMovies: tmdbSearch, TMDB_IMG } = require('../services/tmdb');
const videoConfig = require('../services/video-config');
const db = require('../services/database');

async function syncTmdbToDb(tmdbItems, type) {
  if (!tmdbItems) return;
  for (const m of tmdbItems) {
    try {
      db.content.upsert({
        tmdb_id: m.id,
        title: m.title || 'Untitled',
        type: m.seasons ? 'series' : type,
        genre: m.genre || '',
        genres: m.genres || [],
        year: m.year || 0,
        rating: m.rating || 0,
        vote_count: m.voteCount || 0,
        duration: m.duration || '',
        description: m.description || '',
        poster: m.poster || '',
        backdrop: m.backdrop || '',
        video_url: m.videoUrl || '',
        video_type: m.videoType || 'mp4',
        trailer_key: m.trailerKey || '',
        cast: m.cast || '',
        director: m.director || '',
        language: m.language || 'en',
        popularity: m.popularity || 0,
        release_date: m.releaseDate || '',
        seasons: m.seasons || 0,
        episodes_count: m.episodes || 0,
        premium: m.premium ? 1 : 0,
        badge: m.badge || ''
      });
    } catch (e) {}
  }
}

router.get('/', async (req, res) => {
  const videoConfigData = videoConfig.get();
  const tmdbMovies = await fetchMovies().catch(() => null);
  const tmdbSeries = await fetchSeries().catch(() => null);

  // Sync to database in background
  syncTmdbToDb(tmdbMovies, 'movie');
  syncTmdbToDb(tmdbSeries, 'series');

  let allMovies = tmdbMovies || [];
  let allSeries = tmdbSeries || [];

  const videoTmdbIds = Object.keys(videoConfigData).filter(k => !isNaN(k)).map(Number);
  for (const tmdbId of videoTmdbIds) {
    const cfg = videoConfigData[tmdbId];
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

  let continueWatching = [];
  if (req.session.user) {
    continueWatching = db.continueWatching.get(req.session.user.id).slice(0, 8);
  }
  const top10 = topRated;
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
    // Search database first
    const dbResults = db.content.search(q, 20);
    results = dbResults.map(r => ({
      id: r.id, tmdb_id: r.tmdb_id,
      title: r.title,
      genre: r.genre,
      year: r.year,
      rating: r.rating,
      poster: r.poster,
      backdrop: r.backdrop,
      type: r.type,
      description: r.description
    }));

    // Also search TMDB
    if (results.length < 5) {
      try {
        const tmdbResults = await tmdbSearch(q).catch(() => []);
        const existingIds = new Set(results.map(r => r.tmdb_id));
        const tmdbMapped = tmdbResults
          .filter(r => !existingIds.has(r.id))
          .map(r => ({
            id: null, tmdb_id: r.id,
            title: r.title || r.name,
            genre: '',
            year: (r.release_date || r.first_air_date || '').slice(0, 4),
            rating: r.vote_average ? parseFloat(r.vote_average.toFixed(1)) : 0,
            poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '',
            backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/original${r.backdrop_path}` : '',
            type: r.media_type || 'movie',
            description: r.overview || ''
          }));
        results = [...results, ...tmdbMapped];
      } catch (e) {}
    }
  }
  res.render('search', { query: q, results });
});

module.exports = router;
