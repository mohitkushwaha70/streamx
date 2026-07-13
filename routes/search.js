const express = require('express');
const router = express.Router();
const db = require('../services/database');

router.get('/', (req, res) => {
  const q = req.query.q || '';
  const type = req.query.type || '';
  const genre = req.query.genre || '';
  const year = req.query.year || '';
  const page = parseInt(req.query.page) || 1;

  if (!q && !genre) return res.json({ results: [], total: 0, page: 1, pages: 0 });

  let results = [];
  let total = 0;

  if (q) {
    const dbResults = db.content.search(q, 50);
    results = dbResults;
    total = results.length;
  } else if (genre) {
    const allContent = db.content.getAll();
    results = allContent.filter(c => (c.genre || '').toLowerCase() === genre.toLowerCase());
    total = results.length;
  }

  if (type) results = results.filter(r => r.type === type);
  if (genre && q) results = results.filter(r => r.genre?.toLowerCase() === genre.toLowerCase());
  if (year) results = results.filter(r => String(r.year) === String(year));

  const perPage = 20;
  const start = (page - 1) * perPage;
  const paginated = results.slice(start, start + perPage);
  const pages = Math.ceil(total / perPage);

  res.json({ results: paginated, total, page, pages });
});

module.exports = router;
