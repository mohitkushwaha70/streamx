const express = require('express');
const router = express.Router();
const { series } = require('../data/sample');

router.get('/', (req, res) => {
  const genre = req.query.genre || '';
  let filtered = genre ? series.filter(s => s.genre.toLowerCase() === genre.toLowerCase()) : [...series];
  const genres = [...new Set(series.map(s => s.genre))];
  res.render('series-list', { series: filtered, genres, currentGenre: genre });
});

router.get('/:id', (req, res) => {
  const show = series.find(s => s.id === parseInt(req.params.id));
  if (!show) return res.redirect('/series');
  const episodes = Array.from({ length: show.episodes }, (_, i) => ({
    number: i + 1,
    title: `Episode ${i + 1}`,
    duration: `${Math.floor(Math.random() * 20) + 35}m`,
    description: `Episode ${i + 1} of ${show.title} continues the gripping storyline.`
  }));
  const related = series.filter(s => s.genre === show.genre && s.id !== show.id).slice(0, 4);
  res.render('detail', { item: { ...show, episodes }, type: 'series', related });
});

module.exports = router;
