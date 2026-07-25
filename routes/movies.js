const express = require('express');
const router = express.Router();
const db = require('../services/database');

router.get('/', (req, res) => {
  const genre = req.query.genre || '';
  const sort = req.query.sort || 'trending';
  const result = db.content.list('movie', { genre, sort, limit: 50 });
  const movies = result.items;
  const genres = db.content.genres('movie');
  res.render('movies', { movies, genres, currentGenre: genre, currentSort: sort });
});

router.get('/:id', (req, res) => {
  const item = db.content.findById(parseInt(req.params.id));
  if (!item || (item.type !== 'movie' && item.type !== 'anime')) return res.redirect('/movies');
  const related = db.content.list('movie', { genre: item.genre, limit: 8 }).items.filter(m => m.id !== item.id);
  const userStatus = {};
  if (req.session.user) {
    userStatus.inWatchlist = db.watchlist.has(req.session.user.id, item.id, 'watchlist');
    userStatus.inFavorite = db.watchlist.has(req.session.user.id, item.id, 'favorite');
    userStatus.inSaved = db.watchlist.has(req.session.user.id, item.id, 'saved');
  }
  res.render('detail', { item, type: item.type, related, streaming: {}, userStatus });
});

module.exports = router;
