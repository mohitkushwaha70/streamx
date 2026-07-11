const express = require('express');
const router = express.Router();
const { movies, series, users, getNextMovieId, getNextSeriesId } = require('../data/sample');

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  req.session.error = 'Access denied. Admin only.';
  res.redirect('/auth/login');
}

router.use(isAdmin);

router.get('/', (req, res) => {
  const stats = {
    totalMovies: movies.length,
    totalSeries: series.length,
    totalUsers: users.length,
    premiumUsers: users.filter(u => u.plan === 'premium').length,
    totalViews: '1.2M',
    revenue: '₹48,50,000'
  };
  res.render('admin/dashboard', { stats, recentUsers: users.slice(-5).reverse(), movies: movies.slice(-5).reverse() });
});

router.get('/movies', (req, res) => {
  res.render('admin/movies', { movies });
});

router.get('/movies/add', (req, res) => {
  res.render('admin/movie-form', { movie: null });
});

router.post('/movies/add', (req, res) => {
  const { title, genre, year, rating, duration, premium, description, poster, backdrop, videoUrl, cast, director, language } = req.body;
  movies.push({
    id: getNextMovieId(), title, genre, year: parseInt(year), rating: parseFloat(rating), duration,
    premium: premium === 'on', badge: 'new', description, poster: poster || `https://picsum.photos/seed/${Date.now()}/400/600`,
    backdrop: backdrop || `https://picsum.photos/seed/${Date.now()}bg/1200/600`,
    videoUrl: videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    cast: cast || '', director: director || '', language: language || 'English'
  });
  req.session.success = 'Movie added successfully!';
  res.redirect('/admin/movies');
});

router.get('/movies/edit/:id', (req, res) => {
  const movie = movies.find(m => m.id === parseInt(req.params.id));
  if (!movie) return res.redirect('/admin/movies');
  res.render('admin/movie-form', { movie });
});

router.post('/movies/edit/:id', (req, res) => {
  const idx = movies.findIndex(m => m.id === parseInt(req.params.id));
  if (idx === -1) return res.redirect('/admin/movies');
  const { title, genre, year, rating, duration, premium, description, poster, backdrop, videoUrl, cast, director, language } = req.body;
  movies[idx] = { ...movies[idx], title, genre, year: parseInt(year), rating: parseFloat(rating), duration, premium: premium === 'on', description, poster, backdrop, videoUrl, cast, director, language };
  req.session.success = 'Movie updated successfully!';
  res.redirect('/admin/movies');
});

router.get('/movies/delete/:id', (req, res) => {
  const idx = movies.findIndex(m => m.id === parseInt(req.params.id));
  if (idx !== -1) movies.splice(idx, 1);
  req.session.success = 'Movie deleted successfully!';
  res.redirect('/admin/movies');
});

router.get('/series', (req, res) => {
  res.render('admin/series', { series });
});

router.get('/series/add', (req, res) => {
  res.render('admin/series-form', { show: null });
});

router.post('/series/add', (req, res) => {
  const { title, genre, year, rating, seasons, episodes, premium, description, poster, backdrop, videoUrl } = req.body;
  series.push({
    id: getNextSeriesId(), title, genre, year: parseInt(year), rating: parseFloat(rating),
    seasons: parseInt(seasons), episodes: parseInt(episodes), premium: premium === 'on', badge: 'new',
    description, poster: poster || `https://picsum.photos/seed/${Date.now()}/400/600`,
    backdrop: backdrop || `https://picsum.photos/seed/${Date.now()}bg/1200/600`,
    videoUrl: videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  });
  req.session.success = 'Series added successfully!';
  res.redirect('/admin/series');
});

router.get('/series/edit/:id', (req, res) => {
  const show = series.find(s => s.id === parseInt(req.params.id));
  if (!show) return res.redirect('/admin/series');
  res.render('admin/series-form', { show });
});

router.post('/series/edit/:id', (req, res) => {
  const idx = series.findIndex(s => s.id === parseInt(req.params.id));
  if (idx === -1) return res.redirect('/admin/series');
  const { title, genre, year, rating, seasons, episodes, premium, description, poster, backdrop, videoUrl } = req.body;
  series[idx] = { ...series[idx], title, genre, year: parseInt(year), rating: parseFloat(rating), seasons: parseInt(seasons), episodes: parseInt(episodes), premium: premium === 'on', description, poster, backdrop, videoUrl };
  req.session.success = 'Series updated successfully!';
  res.redirect('/admin/series');
});

router.get('/series/delete/:id', (req, res) => {
  const idx = series.findIndex(s => s.id === parseInt(req.params.id));
  if (idx !== -1) series.splice(idx, 1);
  req.session.success = 'Series deleted successfully!';
  res.redirect('/admin/series');
});

router.get('/users', (req, res) => {
  res.render('admin/users', { users });
});

router.get('/users/toggle/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (user) user.plan = user.plan === 'premium' ? 'free' : 'premium';
  req.session.success = 'User plan updated!';
  res.redirect('/admin/users');
});

module.exports = router;
