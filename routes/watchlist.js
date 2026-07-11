const express = require('express');
const router = express.Router();
const { movies, series } = require('../data/sample');

const watchlists = {};
const favorites = {};
const saved = {};

function getList(store, userId) { return store[userId] || []; }
function addItem(store, userId, id) {
  if (!store[userId]) store[userId] = [];
  if (!store[userId].includes(id)) store[userId].push(id);
}
function removeItem(store, userId, id) {
  if (store[userId]) store[userId] = store[userId].filter(i => i !== id);
}

router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const uid = req.session.user.id;
  const wlIds = getList(watchlists, uid);
  const favIds = getList(favorites, uid);
  const savIds = getList(saved, uid);
  const wlItems = wlIds.map(id => movies.find(m => m.id === id) || series.find(s => s.id === id)).filter(Boolean);
  const favItems = favIds.map(id => movies.find(m => m.id === id) || series.find(s => s.id === id)).filter(Boolean);
  const savItems = savIds.map(id => movies.find(m => m.id === id) || series.find(s => s.id === id)).filter(Boolean);
  res.render('watchlist', { watchlist: wlItems, favorites: favItems, savedItems: savItems, tab: 'watchlist' });
});

router.post('/add', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  const uid = req.session.user.id;
  addItem(watchlists, uid, parseInt(id));
  res.redirect(req.get('Referrer') || '/watchlist');
});

router.post('/remove', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  const uid = req.session.user.id;
  removeItem(watchlists, uid, parseInt(id));
  res.redirect(req.get('Referrer') || '/watchlist');
});

router.post('/favorite/add', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  addItem(favorites, req.session.user.id, parseInt(id));
  res.redirect(req.get('Referrer') || '/watchlist');
});

router.post('/favorite/remove', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  removeItem(favorites, req.session.user.id, parseInt(id));
  res.redirect(req.get('Referrer') || '/watchlist');
});

router.post('/saved/add', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  addItem(saved, req.session.user.id, parseInt(id));
  res.redirect(req.get('Referrer') || '/watchlist');
});

router.post('/saved/remove', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  removeItem(saved, req.session.user.id, parseInt(id));
  res.redirect(req.get('Referrer') || '/watchlist');
});

router.post('/continue/remove', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { id } = req.body;
  if (req.session.continueWatching) {
    req.session.continueWatching = req.session.continueWatching.filter(w => w.id !== parseInt(id));
  }
  res.redirect(req.get('Referrer') || '/');
});

module.exports = router;
