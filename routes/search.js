const express = require('express');
const router = express.Router();
const db = require('../services/database');
const { fetchMovies, fetchSeries } = require('../services/tmdb');

router.get('/', async (req, res) => {
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

    // Also search TMDB if query is specific enough
    if (q.length >= 2) {
      try {
        const tmdbResults = await fetchMovies().catch(() => []);
        const tmdbSeries = await fetchSeries().catch(() => []);
        const allTmdb = [...(tmdbResults || []), ...(tmdbSeries || [])];
        const existingIds = new Set(results.map(r => `${r.tmdb_id}-${r.type}`));

        const qLower = q.toLowerCase();
        const tmdbMatches = allTmdb.filter(m =>
          !existingIds.has(`${m.id}-${m.seasons ? 'series' : 'movie'}`) &&
          (m.title?.toLowerCase().includes(qLower) ||
           m.genre?.toLowerCase().includes(qLower) ||
           m.cast?.toLowerCase().includes(qLower))
        ).map(m => ({
          id: null, tmdb_id: m.id,
          title: m.title, type: m.seasons ? 'series' : 'movie',
          genre: m.genre, genres: m.genres || [],
          year: m.year, rating: m.rating,
          poster: m.poster, backdrop: m.backdrop,
          description: m.description
        }));

        results = [...results, ...tmdbMatches];
        total = results.length;
      } catch (e) {}
    }
  }

  // Apply filters
  if (type) results = results.filter(r => r.type === type);
  if (genre) results = results.filter(r => r.genre?.toLowerCase() === genre.toLowerCase() || (r.genres || []).some(g => g.toLowerCase() === genre.toLowerCase()));
  if (year) results = results.filter(r => String(r.year) === String(year));

  // Paginate
  const perPage = 20;
  const start = (page - 1) * perPage;
  const paginated = results.slice(start, start + perPage);
  const pages = Math.ceil(total / perPage);

  res.json({ results: paginated, total, page, pages });
});

module.exports = router;
