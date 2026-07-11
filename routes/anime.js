const express = require('express');
const router = express.Router();
const { movies, series } = require('../data/sample');

router.get('/', (req, res) => {
  const animeMovies = movies.filter(m => m.genre === 'Anime');
  const animeSeries = series.filter(s => s.genre === 'Anime');
  const allAnime = [...animeMovies, ...animeSeries];
  res.render('anime', { animeMovies, animeSeries, allAnime });
});

module.exports = router;
