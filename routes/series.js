const express = require('express');
const router = express.Router();
const db = require('../services/database');

router.get('/', (req, res) => {
  const genre = req.query.genre || '';
  const result = db.content.list('series', { genre, limit: 50 });
  const series = result.items;
  const genres = db.content.genres('series');
  res.render('series-list', { series, genres, currentGenre: genre });
});

router.get('/:id', (req, res) => {
  const item = db.content.findById(parseInt(req.params.id));
  if (!item || (item.type !== 'series' && item.type !== 'anime')) return res.redirect('/series');
  const episodes = db.episodes.findByContent(item.id);
  const related = db.content.list('series', { genre: item.genre, limit: 8 }).items.filter(s => s.id !== item.id);
  res.render('detail', { item: { ...item, episodes }, type: 'series', related, streaming: {} });
});

module.exports = router;
