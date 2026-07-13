const express = require('express');
const router = express.Router();
const db = require('../services/database');

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  req.session.error = 'Access denied. Admin only.';
  res.redirect('/auth/login');
}

router.use(isAdmin);

const PREMIUM_MONTHLY = 299;
const PREMIUM_YEARLY = 2999;

function computeRevenue() {
  const allUsers = db.users.getAll();
  const allPayments = db.payments.getAll();
  const premiumUsers = allUsers.filter(u => u.plan === 'premium' && u.role !== 'admin');
  const monthlyRevenue = premiumUsers.filter(u => {
    const pay = allPayments.find(p => p.user_id === u.id && p.status === 'completed');
    return pay && pay.plan === 'monthly';
  }).length * PREMIUM_MONTHLY;
  const yearlyRevenue = premiumUsers.filter(u => {
    const pay = allPayments.find(p => p.user_id === u.id && p.status === 'completed');
    return pay && pay.plan === 'yearly';
  }).length * PREMIUM_YEARLY;
  return { monthly: monthlyRevenue, yearly: yearlyRevenue, total: monthlyRevenue + yearlyRevenue };
}

function formatIndian(num) {
  if (num >= 10000000) return '₹' + (num / 10000000).toFixed(1) + 'Cr';
  if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + 'L';
  if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + 'K';
  return '₹' + num;
}

router.get('/', (req, res) => {
  const allMovies = db.content.getByType('movie');
  const allSeries = db.content.getByType('series');
  const allAnime = db.content.getByType('anime');
  const allUsers = db.users.getAll();
  const premiumUsers = allUsers.filter(u => u.plan === 'premium');
  const revenue = computeRevenue();

  const stats = {
    totalMovies: allMovies.length,
    totalSeries: allSeries.length,
    totalAnime: allAnime.length,
    totalUsers: allUsers.length,
    premiumUsers: premiumUsers.length,
    freeUsers: allUsers.filter(u => u.plan === 'free').length,
    totalViews: (allMovies.length * 1200 + allSeries.length * 800).toLocaleString(),
    totalViewsRaw: allMovies.length * 1200 + allSeries.length * 800,
    revenue: formatIndian(revenue.total),
    revenueRaw: revenue.total,
    premiumMovies: allMovies.filter(m => m.premium).length,
    freeMovies: allMovies.filter(m => !m.premium).length,
    avgRating: allMovies.length > 0 ? (allMovies.reduce((sum, m) => sum + m.rating, 0) / allMovies.length).toFixed(1) : '0.0'
  };

  const recentActivity = db.logs.get(5);

  res.render('admin/dashboard', {
    stats,
    recentUsers: allUsers.slice(-5).reverse(),
    recentMovies: allMovies.slice(-5).reverse(),
    trendingContent: [],
    recentActivity,
    revenue
  });
});

router.get('/movies', (req, res) => {
  const search = req.query.search || '';
  let allMovies = db.content.getByType('movie');
  if (search) {
    allMovies = allMovies.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));
  }
  res.render('admin/movies', { movies: allMovies, search, totalCount: allMovies.length });
});

router.get('/movies/add', (req, res) => {
  res.render('admin/movie-form', { movie: null });
});

router.post('/movies/add', (req, res) => {
  const { title, genre, year, rating, duration, premium, description, poster, backdrop, videoUrl, videoType, cast, director, language } = req.body;
  let detectedType = videoType || 'mp4';
  if (!videoType || videoType === 'auto') {
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) detectedType = 'youtube';
    else detectedType = 'mp4';
  }
  db.content.create({
    tmdb_id: null, title, type: 'movie', genre,
    genres: genre ? [genre] : [],
    year: parseInt(year), rating: parseFloat(rating),
    duration, description,
    poster: poster || `https://picsum.photos/seed/${Date.now()}/400/600`,
    backdrop: backdrop || `https://picsum.photos/seed/${Date.now()}bg/1200/600`,
    video_url: videoUrl || '', video_type: detectedType,
    cast: cast || '', director: director || '', language: language || 'en',
    premium: premium === 'on' ? 1 : 0, badge: 'new'
  });
  db.logs.add('content', `Movie "${title}" added to catalog`, req.session.user.name);
  req.session.success = 'Movie added successfully!';
  res.redirect('/admin/movies');
});

router.get('/movies/edit/:id', (req, res) => {
  const id = parseInt(req.params.id);
  let movie = db.content.findById(id);
  if (!movie) return res.redirect('/admin/movies');
  res.render('admin/movie-form', { movie });
});

router.post('/movies/edit/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { title, genre, year, rating, duration, premium, description, poster, backdrop, videoUrl, videoType, cast, director, language } = req.body;
  let detectedType = videoType || 'mp4';
  if (!videoType || videoType === 'auto') {
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) detectedType = 'youtube';
    else detectedType = 'mp4';
  }
  const existing = db.content.findById(id);
  if (existing) {
    db.content.update(existing.id, {
      title, genre, genres: genre ? [genre] : [],
      year: parseInt(year), rating: parseFloat(rating),
      duration, premium: premium === 'on' ? 1 : 0,
      description, poster, backdrop,
      video_url: videoUrl, video_type: detectedType,
      cast, director, language
    });
  }
  db.logs.add('content', `Movie "${title}" updated`, req.session.user.name);
  req.session.success = 'Movie updated successfully!';
  res.redirect('/admin/movies');
});

router.get('/movies/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const movie = db.content.findById(id);
  if (movie) {
    db.content.delete(movie.id);
    db.logs.add('content', `Movie "${movie.title}" deleted`, req.session.user.name);
  }
  req.session.success = 'Movie deleted successfully!';
  res.redirect('/admin/movies');
});

router.get('/series', (req, res) => {
  const search = req.query.search || '';
  let allSeries = db.content.getByType('series');
  if (search) {
    allSeries = allSeries.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
  }
  res.render('admin/series', { series: allSeries, search, totalCount: allSeries.length });
});

router.get('/series/add', (req, res) => {
  res.render('admin/series-form', { show: null });
});

router.post('/series/add', (req, res) => {
  const { title, genre, year, rating, seasons, episodes, premium, description, poster, backdrop, videoUrl, videoType } = req.body;
  let detectedType = videoType || 'mp4';
  if (!videoType || videoType === 'auto') {
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) detectedType = 'youtube';
    else detectedType = 'mp4';
  }
  db.content.create({
    tmdb_id: null, title, type: 'series', genre,
    genres: genre ? [genre] : [],
    year: parseInt(year), rating: parseFloat(rating),
    seasons: parseInt(seasons), episodes_count: parseInt(episodes),
    description,
    poster: poster || `https://picsum.photos/seed/${Date.now()}/400/600`,
    backdrop: backdrop || `https://picsum.photos/seed/${Date.now()}bg/1200/600`,
    video_url: videoUrl || '', video_type: detectedType,
    premium: premium === 'on' ? 1 : 0, badge: 'new'
  });
  db.logs.add('content', `Series "${title}" added to catalog`, req.session.user.name);
  req.session.success = 'Series added successfully!';
  res.redirect('/admin/series');
});

router.get('/series/edit/:id', (req, res) => {
  const id = parseInt(req.params.id);
  let show = db.content.findById(id);
  if (!show) return res.redirect('/admin/series');
  res.render('admin/series-form', { show });
});

router.post('/series/edit/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { title, genre, year, rating, seasons, episodes, premium, description, poster, backdrop, videoUrl, videoType } = req.body;
  let detectedType = videoType || 'mp4';
  if (!videoType || videoType === 'auto') {
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) detectedType = 'youtube';
    else detectedType = 'mp4';
  }
  const existing = db.content.findById(id);
  if (existing) {
    db.content.update(existing.id, {
      title, genre, genres: genre ? [genre] : [],
      year: parseInt(year), rating: parseFloat(rating),
      seasons: parseInt(seasons), episodes_count: parseInt(episodes),
      premium: premium === 'on' ? 1 : 0,
      description, poster, backdrop,
      video_url: videoUrl, video_type: detectedType
    });
  }
  db.logs.add('content', `Series "${title}" updated`, req.session.user.name);
  req.session.success = 'Series updated successfully!';
  res.redirect('/admin/series');
});

router.get('/series/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const show = db.content.findById(id);
  if (show) {
    db.content.delete(show.id);
    db.logs.add('content', `Series "${show.title}" deleted`, req.session.user.name);
  }
  req.session.success = 'Series deleted successfully!';
  res.redirect('/admin/series');
});

router.get('/users', (req, res) => {
  const search = req.query.search || '';
  const roleFilter = req.query.role || '';
  const planFilter = req.query.plan || '';

  let filtered = db.users.getAll();
  if (search) {
    filtered = filtered.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
  }
  if (roleFilter) filtered = filtered.filter(u => u.role === roleFilter);
  if (planFilter) filtered = filtered.filter(u => u.plan === planFilter);

  const allUsers = db.users.getAll();
  const stats = {
    total: allUsers.length,
    premium: allUsers.filter(u => u.plan === 'premium').length,
    free: allUsers.filter(u => u.plan === 'free').length,
    admins: allUsers.filter(u => u.role === 'admin').length,
    avgWatchTime: Math.round(allUsers.reduce((sum, u) => sum + (u.watch_time || 0), 0) / (allUsers.length || 1)),
    activeToday: allUsers.filter(u => u.last_active && new Date(u.last_active).toDateString() === new Date().toDateString()).length
  };

  res.render('admin/users', { users: filtered, search, roleFilter, planFilter, stats, totalCount: allUsers.length });
});

router.get('/users/toggle/:id', (req, res) => {
  const user = db.users.findById(parseInt(req.params.id));
  if (user && user.role !== 'admin') {
    const newPlan = user.plan === 'premium' ? 'free' : 'premium';
    db.users.update(user.id, { plan: newPlan });
    db.logs.add('user', `${user.name} plan changed to ${newPlan}`, req.session.user.name);
  }
  req.session.success = 'User plan updated!';
  res.redirect('/admin/users');
});

router.get('/users/delete/:id', (req, res) => {
  const user = db.users.findById(parseInt(req.params.id));
  if (user && user.role !== 'admin') {
    db.users.delete(user.id);
    db.logs.add('user', `User "${user.name}" deleted`, req.session.user.name);
  }
  req.session.success = 'User deleted!';
  res.redirect('/admin/users');
});

router.get('/users/ban/:id', (req, res) => {
  const user = db.users.findById(parseInt(req.params.id));
  if (user && user.role !== 'admin') {
    const banned = user.banned ? 0 : 1;
    db.users.update(user.id, { banned });
    db.logs.add('user', `User "${user.name}" ${banned ? 'banned' : 'unbanned'}`, req.session.user.name);
    req.session.success = `User ${banned ? 'banned' : 'unbanned'}!`;
  }
  res.redirect('/admin/users');
});

router.get('/settings', (req, res) => {
  res.render('admin/settings', { admin: req.session.user });
});

router.get('/anime', (req, res) => {
  const anime = db.content.getByType('anime');
  res.render('admin/anime', { anime });
});

router.get('/payments', (req, res) => {
  const allUsers = db.users.getAll();
  const allPayments = db.payments.getAll();
  const premiumUsers = allUsers.filter(u => u.plan === 'premium' && u.role !== 'admin');
  const revenue = computeRevenue();

  const completedPayments = allPayments.filter(p => p.status === 'completed');
  const failedPayments = allPayments.filter(p => p.status === 'failed');
  const refundedPayments = allPayments.filter(p => p.status === 'refunded');

  const methodBreakdown = {};
  completedPayments.forEach(p => {
    methodBreakdown[p.method] = (methodBreakdown[p.method] || 0) + 1;
  });

  const last6Months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = month.toLocaleString('en-US', { month: 'short' });
    const monthPayments = completedPayments.filter(p => {
      const pDate = new Date(p.date);
      return pDate.getMonth() === month.getMonth() && pDate.getFullYear() === month.getFullYear();
    });
    last6Months.push({
      month: monthName,
      revenue: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      count: monthPayments.length
    });
  }

  const paymentData = {
    totalRevenue: formatIndian(revenue.total),
    thisMonth: formatIndian(revenue.monthly),
    totalTransactions: allPayments.length,
    completedTransactions: completedPayments.length,
    failedTransactions: failedPayments.length,
    refundedTransactions: refundedPayments.length,
    avgTransaction: completedPayments.length > 0 ? formatIndian(Math.round(revenue.total / completedPayments.length)) : '₹0',
    premiumUsers,
    freeUsers: allUsers.filter(u => u.plan === 'free'),
    revenueByPlan: { monthly: formatIndian(revenue.monthly), yearly: formatIndian(revenue.yearly), free: '₹0' },
    methodBreakdown,
    last6Months,
    recentPayments: allPayments.slice(0, 10)
  };
  res.render('admin/payments', { paymentData, users: allUsers });
});

router.get('/subscriptions', (req, res) => {
  const allUsers = db.users.getAll();
  const allPayments = db.payments.getAll();
  const premiumUsers = allUsers.filter(u => u.plan === 'premium');
  const freeUsers = allUsers.filter(u => u.plan === 'free');
  const totalUsers = allUsers.length;
  const retentionRate = totalUsers > 0 ? Math.round((premiumUsers.length / totalUsers) * 100) : 0;

  const monthlySubs = premiumUsers.filter(u => allPayments.find(p => p.user_id === u.id && p.plan === 'monthly' && p.status === 'completed'));
  const yearlySubs = premiumUsers.filter(u => allPayments.find(p => p.user_id === u.id && p.plan === 'yearly' && p.status === 'completed'));

  const avgWatchTime = Math.round(premiumUsers.reduce((sum, u) => sum + (u.watch_time || 0), 0) / (premiumUsers.length || 1));

  res.render('admin/subscriptions', {
    premiumUsers, freeUsers, retentionRate,
    monthlySubs, yearlySubs,
    totalUsers, avgWatchTime, avgDevices: '1.0',
    joinedByMonth: {}
  });
});

router.get('/analytics', (req, res) => {
  const allContent = db.content.getAll();
  const allMovies = allContent.filter(c => c.type === 'movie');
  const allSeries = allContent.filter(c => c.type === 'series');
  const allUsers = db.users.getAll();

  const genreCounts = {};
  allContent.forEach(item => {
    const g = item.genre || 'Other';
    genreCounts[g] = (genreCounts[g] || 0) + 1;
  });
  const totalContent = allContent.length || 1;
  const genreBreakdown = Object.entries(genreCounts)
    .map(([genre, count]) => ({ genre, count, percent: Math.round((count / totalContent) * 100) }))
    .sort((a, b) => b.count - a.count);

  const ratingDistribution = { '9+': 0, '8-9': 0, '7-8': 0, '6-7': 0, '5-6': 0, '<5': 0 };
  allContent.forEach(item => {
    const r = item.rating;
    if (r >= 9) ratingDistribution['9+']++;
    else if (r >= 8) ratingDistribution['8-9']++;
    else if (r >= 7) ratingDistribution['7-8']++;
    else if (r >= 6) ratingDistribution['6-7']++;
    else if (r >= 5) ratingDistribution['5-6']++;
    else ratingDistribution['<5']++;
  });

  const mostWatched = [...allContent]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 8)
    .map(item => ({
      title: item.title, rating: item.rating,
      poster: item.poster || '',
      views: Math.round(item.rating * 25000 + Math.random() * 20000),
      completion: Math.round(70 + item.rating * 2.5),
      genre: item.genre || 'N/A'
    }));

  const premiumCount = allUsers.filter(u => u.plan === 'premium').length;
  const totalCount = allUsers.length || 1;
  const totalViews = allMovies.length * 1200 + allSeries.length * 800;
  const avgRating = allContent.length > 0 ? (allContent.reduce((sum, m) => sum + m.rating, 0) / allContent.length).toFixed(1) : '0.0';

  res.render('admin/analytics', {
    totalViews, activeUsers: allUsers.length, avgWatchTime: '25m',
    growthPercent: Math.round((premiumCount / totalCount) * 100),
    genreBreakdown, ratingDistribution, mostWatched,
    totalContent: allContent.length, totalMovies: allMovies.length, totalSeries: allSeries.length,
    avgRating, topGenres: genreBreakdown.slice(0, 5), monthlyGrowth: []
  });
});

router.get('/reports', (req, res) => {
  res.render('admin/reports', { reports: [], pendingCount: 0, resolvedCount: 0 });
});

router.get('/logs', (req, res) => {
  const typeFilter = req.query.type || '';
  const filtered = typeFilter ? db.logs.getByType(typeFilter) : db.logs.getAll();
  res.render('admin/logs', { logs: filtered, typeFilter, totalCount: filtered.length });
});

router.get('/upload', (req, res) => {
  const allContent = db.content.getAll();
  res.render('admin/upload', { uploadedMovies: allContent, success: req.session.success, error: req.session.error });
});

router.post('/upload', (req, res) => {
  const { title, genre, year, rating, videoUrl, videoType, poster, backdrop, description, duration, type: contentType } = req.body;
  if (!title || !videoUrl) {
    req.session.error = 'Title and Video URL are required!';
    return res.redirect('/admin/upload');
  }
  let detectedType = videoType || 'mp4';
  if (!videoType || videoType === 'auto') {
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) detectedType = 'youtube';
    else detectedType = 'mp4';
  }
  db.content.create({
    tmdb_id: null, title, type: contentType || 'movie', genre: genre || '',
    genres: genre ? [genre] : [],
    year: parseInt(year) || 2024, rating: parseFloat(rating) || 0,
    duration: duration || '',
    description: description || '',
    poster: poster || `https://picsum.photos/seed/${Date.now()}/400/600`,
    backdrop: backdrop || `https://picsum.photos/seed/${Date.now()}bg/1200/600`,
    video_url: videoUrl, video_type: detectedType,
    premium: 0, badge: 'new'
  });
  db.logs.add('content', `Content "${title}" uploaded`, req.session.user.name);
  req.session.success = `"${title}" added successfully!`;
  res.redirect('/admin/upload');
});

router.get('/upload/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const item = db.content.findById(id);
  if (item) {
    db.content.delete(item.id);
    db.logs.add('content', `Content "${item.title}" removed`, req.session.user.name);
    req.session.success = `"${item.title}" removed!`;
  }
  res.redirect('/admin/upload');
});

module.exports = router;
