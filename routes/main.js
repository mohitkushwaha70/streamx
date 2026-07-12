const express = require('express');
const router = express.Router();
const { movies, series } = require('../data/sample');
const { fetchMovies, fetchSeries, searchMovies: tmdbSearch, TMDB_IMG } = require('../services/tmdb');

router.get('/', async (req, res) => {
  const tmdbMovies = await fetchMovies().catch(() => null);
  const tmdbSeries = await fetchSeries().catch(() => null);

  const allMovies = tmdbMovies || [];
  const allSeries = tmdbSeries || [];

  const heroMovie = allMovies[Math.floor(Math.random() * Math.min(allMovies.length, 10))];
  const trending = allMovies.slice(0, 10);
  const newReleases = allMovies.filter(m => m.badge === 'new').slice(0, 8);
  const topRated = [...allMovies].sort((a, b) => b.rating - a.rating).slice(0, 10);

  let continueWatching = (req.session.continueWatching || [])
    .sort((a, b) => b.lastWatched - a.lastWatched)
    .slice(0, 8);
  const top10 = [...allMovies].sort((a, b) => b.rating - a.rating).slice(0, 10);
  const trendingSeries = allSeries.slice(0, 8);

  res.render('index', { heroMovie, trending, newReleases, topRated, continueWatching, top10, trendingSeries, movies: allMovies, allSeries, TMDB_IMG });
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
