const express = require('express');
const router = express.Router();
const { movies: sampleMovies, series: sampleSeries } = require('../data/sample');
const { fetchMovies, fetchSeries } = require('../services/tmdb');

router.get('/', async (req, res) => {
  const tmdbMovies = await fetchMovies().catch(() => null);
  const tmdbSeries = await fetchSeries().catch(() => null);

  const tmdbMovieIds = new Set((tmdbMovies || []).map(m => m.tmdbId || m.id));
  const localOnlyMovies = sampleMovies.filter(m => !tmdbMovieIds.has(m.id));
  const allMovies = [...(tmdbMovies || []), ...localOnlyMovies];

  const tmdbSeriesIds = new Set((tmdbSeries || []).map(s => s.tmdbId || s.id));
  const localOnlySeries = sampleSeries.filter(s => !tmdbSeriesIds.has(s.id));
  const allSeries = [...(tmdbSeries || []), ...localOnlySeries];

  const animeMovies = allMovies.filter(m => {
    const g = (m.genre || '').toLowerCase();
    const gs = (m.genres || []).map(x => x.toLowerCase());
    return g === 'animation' || g === 'anime' || gs.includes('animation') || gs.includes('anime');
  });
  const animeSeries = allSeries.filter(s => {
    const g = (s.genre || '').toLowerCase();
    const gs = (s.genres || []).map(x => x.toLowerCase());
    return g === 'animation' || g === 'anime' || gs.includes('animation') || gs.includes('anime');
  });
  const allAnime = [...animeMovies, ...animeSeries];
  res.render('anime', { animeMovies, animeSeries, allAnime });
});

module.exports = router;
