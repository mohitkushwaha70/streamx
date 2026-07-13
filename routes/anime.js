const express = require('express');
const router = express.Router();
const db = require('../services/database');

router.get('/', (req, res) => {
  const allContent = db.content.getAll();
  const animeMovies = allContent.filter(c => c.type === 'anime' || (c.type === 'movie' && ['animation', 'anime'].includes((c.genre || '').toLowerCase())));
  const animeSeries = allContent.filter(c => c.type === 'anime' || (c.type === 'series' && ['animation', 'anime'].includes((c.genre || '').toLowerCase())));
  const allAnime = [...animeMovies, ...animeSeries];
  res.render('anime', { animeMovies, animeSeries, allAnime });
});

module.exports = router;
