const express = require('express');
const router = express.Router();
const { movies, series } = require('../data/sample');

router.get('/', (req, res) => {
  const heroMovie = movies[Math.floor(Math.random() * movies.length)];
  const trending = movies.slice(0, 8);
  const newReleases = movies.filter(m => m.badge === 'new');
  const topRated = [...movies].sort((a, b) => b.rating - a.rating).slice(0, 8);
  let continueWatching = (req.session.continueWatching || [])
    .sort((a, b) => b.lastWatched - a.lastWatched)
    .slice(0, 8);

  if (req.session.user && continueWatching.length === 0) {
    const sampleCW = movies.slice(0, 6).map((m, i) => ({
      id: m.id, type: 'movie', title: m.title, poster: m.poster,
      genre: m.genre, duration: m.duration || '',
      progress: [15, 32, 48, 71, 23, 56][i] || 20,
      lastWatched: Date.now() - i * 3600000
    }));
    continueWatching = sampleCW;
  }
  const top10 = [...movies].sort((a, b) => b.rating - a.rating).slice(0, 10);
  const trendingSeries = series.slice(0, 6);

  res.render('index', { heroMovie, trending, newReleases, topRated, continueWatching, top10, trendingSeries, movies, allSeries: series });
});

router.get('/pricing', (req, res) => {
  res.render('pricing');
});

router.get('/search', (req, res) => {
  const q = req.query.q || '';
  const results = q ? [...movies, ...series].filter(item =>
    item.title.toLowerCase().includes(q.toLowerCase()) ||
    item.genre.toLowerCase().includes(q.toLowerCase())
  ) : [];
  res.render('search', { query: q, results });
});

module.exports = router;
