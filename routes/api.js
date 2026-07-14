const express = require('express');
const router = express.Router();
const db = require('../services/database');

router.get('/content', (req, res) => {
  const type = req.query.type || '';
  const limit = parseInt(req.query.limit) || 10;
  const exclude = parseInt(req.query.exclude) || 0;
  const sort = req.query.sort || 'recent';

  let opts = { limit, sort: sort === 'rating' ? 'rating' : sort === 'recent' ? 'new' : undefined };
  if (type) opts.genre = undefined;

  const result = db.content.list(type || null, opts);
  let items = result.items;
  if (exclude) items = items.filter(i => i.id !== exclude);

  res.json({ items, total: result.total });
});

router.get('/content/all', (req, res) => {
  const items = db.content.getAll();
  res.json({ items });
});

router.get('/continue-watching', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ items: [] });
  }
  const items = db.continueWatching.get(req.session.user.id);
  res.json({ items });
});

router.post('/continue-watching', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ ok: false });
  }
  const { contentId, type, progress, currentTime } = req.body;
  if (!contentId) return res.json({ ok: false });

  const item = db.content.findById(contentId);
  if (!item) return res.json({ ok: false });

  db.continueWatching.upsert(
    req.session.user.id,
    item.tmdb_id || item.id,
    type || item.type,
    item.title,
    item.poster,
    item.genre,
    item.duration || '',
    progress || 0
  );
  res.json({ ok: true });
});

module.exports = router;
