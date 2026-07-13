const express = require('express');
const router = express.Router();
const db = require('../services/database');

router.get('/', (req, res) => {
  const allContent = db.content.getAll();

  const allMovies = allContent.filter(c => c.type === 'movie');
  const allSeries = allContent.filter(c => c.type === 'series' || c.type === 'anime');

  const heroMovies = allMovies.length > 0
    ? allMovies.slice(0, 5).map(m => ({
        ...m,
        backdrop: m.backdrop || (m.poster ? m.poster : ''),
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

  res.render('index', { heroMovies, heroMovie: heroMovies[0], trending, newReleases, topRated, continueWatching, top10, trendingSeries, movies: allMovies, allSeries });
});

router.get('/pricing', (req, res) => {
  res.render('pricing');
});

router.get('/search', (req, res) => {
  const q = req.query.q || '';
  let results = [];
  if (q) {
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
  }
  res.render('search', { query: q, results });
});

module.exports = router;
