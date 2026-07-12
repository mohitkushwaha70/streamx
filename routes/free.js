const express = require('express');
const router = express.Router();
const { fetchPopularMovies, getMovieDetails, searchMovies } = require('../services/archivedotorg');
const { searchFullMovies, searchByGenre, getFallbackMovies } = require('../services/youtube');

router.get('/', async (req, res) => {
  const tab = req.query.tab || 'archive';
  const search = req.query.search || '';
  const genre = req.query.genre || '';
  const page = parseInt(req.query.page) || 1;

  let movies = [];
  let title = 'Free Movies';

  if (tab === 'youtube') {
    title = 'Free Movies on YouTube';
    if (search) {
      movies = await searchFullMovies(search + ' full movie', 30);
    } else if (genre) {
      movies = await searchByGenre(genre, 30);
    } else {
      movies = await searchFullMovies('full movie english', 30);
    }
    if (movies.length === 0) movies = getFallbackMovies();
  } else {
    title = 'Public Domain Movies';
    if (search) {
      movies = await searchMovies(search, 30);
    } else {
      movies = await fetchPopularMovies(30);
    }
  }

  const genres = ['Action', 'Comedy', 'Horror', 'Sci-Fi', 'Drama', 'Thriller', 'Documentary', 'Classic', 'Animation'];

  res.render('free-movies', {
    movies, title, tab, search, genre, genres,
    page: 'free-movies'
  });
});

router.get('/watch/:id', async (req, res) => {
  const tab = req.query.source || 'archive';

  if (tab === 'youtube') {
    const videoId = req.params.id;
    res.render('free-player', {
      item: {
        id: videoId,
        title: req.query.title || 'YouTube Movie',
        description: req.query.desc || '',
        videoUrl: `https://www.youtube.com/embed/${videoId}`,
        videoType: 'youtube',
        poster: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        backdrop: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      },
      type: 'movie'
    });
  } else {
    const movie = await getMovieDetails(req.params.id);
    if (!movie) return res.redirect('/free-movies');
    res.render('free-player', { item: movie, type: 'movie' });
  }
});

module.exports = router;
