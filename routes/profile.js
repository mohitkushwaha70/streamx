const express = require('express');
const router = express.Router();
const db = require('../services/database');

router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const userId = req.session.user.id;
  const userWatchlist = db.watchlist.get(userId, 'watchlist').slice(0, 6);
  const userFavorites = db.watchlist.get(userId, 'favorite').slice(0, 6);
  const userSaved = db.watchlist.get(userId, 'saved').slice(0, 6);
  const continueWatching = db.continueWatching.get(userId).slice(0, 6);
  res.render('profile', { userWatchlist, userFavorites, userSaved, continueWatching });
});

module.exports = router;
