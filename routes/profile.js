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

router.post('/', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { name, avatar } = req.body;
  const updates = {};
  if (name && name.trim()) updates.name = name.trim();
  if (avatar && avatar.trim()) updates.avatar = avatar.trim().charAt(0).toUpperCase();
  if (Object.keys(updates).length > 0) {
    db.users.update(req.session.user.id, updates);
    if (updates.name) req.session.user.name = updates.name;
    if (updates.avatar) req.session.user.avatar = updates.avatar;
    req.session.success = 'Profile updated!';
  }
  res.redirect('/profile');
});

module.exports = router;
