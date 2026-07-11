const express = require('express');
const router = express.Router();
const { movies } = require('../data/sample');

router.get('/', (req, res) => {
  const genre = req.query.genre || '';
  const sort = req.query.sort || 'trending';
  let filtered = genre ? movies.filter(m => m.genre.toLowerCase() === genre.toLowerCase()) : [...movies];
  if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);
  else if (sort === 'year') filtered.sort((a, b) => b.year - a.year);
  else if (sort === 'az') filtered.sort((a, b) => a.title.localeCompare(b.title));
  const genres = [...new Set(movies.map(m => m.genre))];
  res.render('movies', { movies: filtered, genres, currentGenre: genre, currentSort: sort });
});

router.get('/:id', (req, res) => {
  const movie = movies.find(m => m.id === parseInt(req.params.id));
  if (!movie) return res.redirect('/movies');
  const related = movies.filter(m => m.genre === movie.genre && m.id !== movie.id).slice(0, 6);
  res.render('detail', { item: movie, type: 'movie', related });
});

module.exports = router;
