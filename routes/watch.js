const express = require('express');
const router = express.Router();
const { movies, series } = require('../data/sample');

router.get('/:type/:id', (req, res) => {
  const { type, id } = req.params;
  let item;
  if (type === 'movie') item = movies.find(m => m.id === parseInt(id));
  else item = series.find(s => s.id === parseInt(id));
  if (!item) return res.redirect('/');
  const related = type === 'movie'
    ? movies.filter(m => m.genre === item.genre && m.id !== item.id).slice(0, 6)
    : series.filter(s => s.genre === item.genre && s.id !== item.id).slice(0, 6);
  res.render('player', { item, type, related });
});

module.exports = router;
