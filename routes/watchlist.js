const express = require('express');
const router = express.Router();
const db = require('../services/database');

router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const uid = req.session.user.id;
  const watchlistItems = db.watchlist.get(uid, 'watchlist');
  const favoriteItems = db.watchlist.get(uid, 'favorite');
  const savedItems = db.watchlist.get(uid, 'saved');
  res.render('watchlist', { watchlist: watchlistItems, favorites: favoriteItems, savedItems, tab: 'watchlist' });
});

router.post('/add', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  db.watchlist.add(req.session.user.id, parseInt(id), 'watchlist');
  res.redirect(req.get('Referrer') || '/watchlist');
});

router.post('/remove', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  db.watchlist.remove(req.session.user.id, parseInt(id), 'watchlist');
  res.redirect(req.get('Referrer') || '/watchlist');
});

router.post('/favorite/add', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  db.watchlist.add(req.session.user.id, parseInt(id), 'favorite');
  res.redirect(req.get('Referrer') || '/watchlist');
});

router.post('/favorite/remove', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  db.watchlist.remove(req.session.user.id, parseInt(id), 'favorite');
  res.redirect(req.get('Referrer') || '/watchlist');
});

router.post('/saved/add', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  db.watchlist.add(req.session.user.id, parseInt(id), 'saved');
  res.redirect(req.get('Referrer') || '/watchlist');
});

router.post('/saved/remove', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  db.watchlist.remove(req.session.user.id, parseInt(id), 'saved');
  res.redirect(req.get('Referrer') || '/watchlist');
});

router.post('/continue/remove', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  db.continueWatching.remove(req.session.user.id, parseInt(id));
  res.redirect(req.get('Referrer') || '/');
});

module.exports = router;
