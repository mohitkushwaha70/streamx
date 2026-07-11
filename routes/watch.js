const express = require('express');
const router = express.Router();
const { movies, series } = require('../data/sample');

router.get('/:type/:id', (req, res) => {
  if (!req.session.user) {
    req.session.error = 'Please sign in to watch content';
    return res.redirect('/auth/login');
  }
  const { type, id } = req.params;
  const itemId = parseInt(id);
  let item;
  if (type === 'movie') item = movies.find(m => m.id === itemId);
  else item = series.find(s => s.id === itemId);
  if (!item) return res.redirect('/');

  if (!req.session.continueWatching) req.session.continueWatching = [];
  const existing = req.session.continueWatching.find(w => w.id === itemId && w.type === type);
  if (existing) {
    existing.progress = Math.min(existing.progress + Math.floor(Math.random() * 15) + 5, 95);
    existing.lastWatched = Date.now();
  } else {
    req.session.continueWatching.push({
      id: itemId,
      type: type,
      title: item.title,
      poster: item.poster,
      genre: item.genre,
      duration: item.duration || (item.seasons ? item.seasons + ' Seasons' : ''),
      progress: Math.floor(Math.random() * 30) + 10,
      lastWatched: Date.now()
    });
  }
  if (req.session.continueWatching.length > 10) {
    req.session.continueWatching = req.session.continueWatching.slice(-10);
  }

  const related = type === 'movie'
    ? movies.filter(m => m.genre === item.genre && m.id !== itemId).slice(0, 6)
    : series.filter(s => s.genre === item.genre && s.id !== itemId).slice(0, 6);
  res.render('player', { item, type, related });
});

module.exports = router;
