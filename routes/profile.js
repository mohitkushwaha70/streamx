const express = require('express');
const router = express.Router();
const { watchlists, favorites, saved } = require('./watchlist');

router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const userId = req.session.user.id;
  const userWatchlist = (watchlists[userId] || []).slice(0, 6);
  const userFavorites = (favorites[userId] || []).slice(0, 6);
  const userSaved = (saved[userId] || []).slice(0, 6);
  const continueWatching = (req.session.continueWatching || []).slice(0, 6);
  res.render('profile', { userWatchlist, userFavorites, userSaved, continueWatching });
});

module.exports = router;
