const express = require('express');
const router = express.Router();
const { movies: sampleMovies } = require('../data/sample');
const { fetchMovies } = require('../services/tmdb');
const { getStreamingInfo, getSourceIcon, getSourceColor } = require('../services/watchmode');

router.get('/', async (req, res) => {
  const tmdbMovies = await fetchMovies().catch(() => null);
  const tmdbIds = new Set((tmdbMovies || []).map(m => m.tmdbId || m.id));
  const localOnly = sampleMovies.filter(m => !tmdbIds.has(m.id));
  const allMovies = [...(tmdbMovies || []), ...localOnly];

  const genre = req.query.genre || '';
  const sort = req.query.sort || 'trending';
  let filtered = genre ? allMovies.filter(m => m.genre.toLowerCase() === genre.toLowerCase()) : [...allMovies];
  if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);
  else if (sort === 'year') filtered.sort((a, b) => b.year - a.year);
  else if (sort === 'az') filtered.sort((a, b) => a.title.localeCompare(b.title));
  const genres = [...new Set(allMovies.map(m => m.genre))];
  res.render('movies', { movies: filtered, genres, currentGenre: genre, currentSort: sort });
});

router.get('/:id', async (req, res) => {
  const tmdbMovies = await fetchMovies().catch(() => null);
  const tmdbIds = new Set((tmdbMovies || []).map(m => m.tmdbId || m.id));
  const localOnly = sampleMovies.filter(m => !tmdbIds.has(m.id));
  const allMovies = [...(tmdbMovies || []), ...localOnly];

  const movie = allMovies.find(m => m.id === parseInt(req.params.id) || m.tmdbId === parseInt(req.params.id));
  if (!movie) return res.redirect('/movies');
  const related = allMovies.filter(m => m.genre === movie.genre && m.id !== movie.id).slice(0, 8);

  const tmdbId = movie.tmdbId || movie.id;
  const streamingInfo = await getStreamingInfo(tmdbId, 'movie').catch(() => ({ grouped: {} }));

  res.render('detail', {
    item: movie, type: 'movie', related,
    streaming: streamingInfo.grouped || {},
    getSourceIcon, getSourceColor
  });
});

module.exports = router;
