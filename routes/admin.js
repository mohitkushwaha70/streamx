const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { movies, series, users, payments, activityLogs, reports, getNextMovieId, getNextSeriesId, changeEmitter, addLog } = require('../data/sample');
const { fetchMovies, fetchSeries, fetchTrendingAll, fetchGenreStats, searchMovies, TMDB_IMG } = require('../services/tmdb');

let videoConfig = {};
try {
  videoConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'videos.json'), 'utf8')).videos || {};
} catch (e) {
  console.error('Could not load videos.json:', e.message);
}

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  req.session.error = 'Access denied. Admin only.';
  res.redirect('/auth/login');
}

router.use(isAdmin);

const PREMIUM_MONTHLY = 299;
const PREMIUM_YEARLY = 2999;

async function getTmdbMovies() {
  try { return await fetchMovies() || []; } catch(e) { return []; }
}

async function getTmdbSeries() {
  try { return await fetchSeries() || []; } catch(e) { return []; }
}

async function getAllMovies() {
  const tmdb = await getTmdbMovies();
  const editedIds = new Set(movies.map(m => m.tmdbId));
  const cleanTmdb = tmdb.filter(m => !editedIds.has(m.tmdbId || m.id));
  const allLocal = [...cleanTmdb, ...movies];

  const videoTmdbIds = Object.keys(videoConfig).filter(k => !isNaN(k)).map(Number);

  for (const tmdbId of videoTmdbIds) {
    const cfg = videoConfig[tmdbId];
    const existing = allLocal.find(m => (m.tmdbId || m.id) === tmdbId);
    if (existing) {
      existing.videoUrl = existing.videoUrl || ('/stream/' + decodeURIComponent(Object.values(cfg.sources)[0].match(/\/resolve\/main\/(.+)/)?.[1] || Object.values(cfg.sources)[0].match(/\/resolve\/(.+)/)?.[1] || ''));
      existing.hasVideo = true;
    } else {
      allLocal.push({
        id: tmdbId, tmdbId,
        title: cfg.title || `Movie ${tmdbId}`,
        genre: cfg.genre || 'Unknown',
        year: cfg.year || 2024,
        rating: cfg.rating || 7.0,
        duration: cfg.duration || '2h',
        poster: cfg.poster || `https://picsum.photos/seed/${tmdbId}/400/600`,
        backdrop: cfg.backdrop || '',
        description: cfg.description || '',
        premium: false, badge: 'new',
        videoUrl: '/stream/' + decodeURIComponent(Object.values(cfg.sources)[0].match(/\/resolve\/main\/(.+)/)?.[1] || Object.values(cfg.sources)[0].match(/\/resolve\/(.+)/)?.[1] || ''),
        videoType: 'mp4', hasVideo: true
      });
    }
  }

  return allLocal;
}

async function getAllSeries() {
  const tmdb = await getTmdbSeries();
  const editedIds = new Set(series.map(s => s.tmdbId));
  const cleanTmdb = tmdb.filter(s => !editedIds.has(s.tmdbId || s.id));
  return [...cleanTmdb, ...series];
}

function computeRevenue() {
  const premiumUsers = users.filter(u => u.plan === 'premium' && u.role !== 'admin');
  const monthlyRevenue = premiumUsers.filter(u => {
    const pay = payments.find(p => p.userId === u.id && p.status === 'completed');
    return pay && pay.plan === 'monthly';
  }).length * PREMIUM_MONTHLY;
  const yearlyRevenue = premiumUsers.filter(u => {
    const pay = payments.find(p => p.userId === u.id && p.status === 'completed');
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

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Dashboard
router.get('/', async (req, res) => {
  const [allMovies, allSeries, trendingData] = await Promise.all([
    getAllMovies(),
    getAllSeries(),
    fetchTrendingAll().catch(() => [])
  ]);

  const premiumUsers = users.filter(u => u.plan === 'premium');
  const revenue = computeRevenue();

  const stats = {
    totalMovies: allMovies.length,
    totalSeries: allSeries.length,
    totalAnime: allMovies.filter(m => m.genre === 'Anime').length + allSeries.filter(s => s.genre === 'Anime').length,
    totalUsers: users.length,
    premiumUsers: premiumUsers.length,
    freeUsers: users.filter(u => u.plan === 'free').length,
    totalViews: (allMovies.length * 1200 + allSeries.length * 800).toLocaleString(),
    totalViewsRaw: allMovies.length * 1200 + allSeries.length * 800,
    revenue: formatIndian(revenue.total),
    revenueRaw: revenue.total,
    premiumMovies: allMovies.filter(m => m.premium).length,
    freeMovies: allMovies.filter(m => !m.premium).length,
    avgRating: allMovies.length > 0 ? (allMovies.reduce((sum, m) => sum + m.rating, 0) / allMovies.length).toFixed(1) : '0.0'
  };

  const trendingContent = (trendingData || []).slice(0, 8).map(item => ({
    id: item.id,
    title: item.title || item.name || 'Untitled',
    poster: item.poster_path ? `${TMDB_IMG}/w200${item.poster_path}` : '',
    rating: item.vote_average ? item.vote_average.toFixed(1) : '0.0',
    mediaType: item.media_type || (item.title ? 'movie' : 'tv'),
    year: (item.release_date || item.first_air_date || '').slice(0, 4)
  }));

  res.render('admin/dashboard', {
    stats,
    recentUsers: users.slice(-5).reverse(),
    recentMovies: allMovies.slice(-5).reverse(),
    trendingContent,
    recentActivity: activityLogs.slice(0, 5),
    revenue
  });
});

// Movies - List
router.get('/movies', async (req, res) => {
  const allMovies = await getAllMovies();
  const search = req.query.search || '';
  let filtered = allMovies;
  if (search) {
    filtered = allMovies.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));
  }
  res.render('admin/movies', { movies: filtered, search, totalCount: allMovies.length });
});

// Movies - Add Form
router.get('/movies/add', (req, res) => {
  res.render('admin/movie-form', { movie: null });
});

// Movies - Add
router.post('/movies/add', (req, res) => {
  const { title, genre, year, rating, duration, premium, description, poster, backdrop, videoUrl, videoType, cast, director, language } = req.body;
  let detectedType = videoType || 'mp4';
  if (!videoType || videoType === 'auto') {
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) detectedType = 'youtube';
    else if (videoUrl && (videoUrl.includes('.mp4') || videoUrl.includes('.webm') || videoUrl.includes('.mkv'))) detectedType = 'mp4';
    else detectedType = 'mp4';
  }
  movies.push({
    id: getNextMovieId(), tmdbId: null, title, genre, year: parseInt(year), rating: parseFloat(rating), duration,
    premium: premium === 'on', badge: 'new', description, poster: poster || `https://picsum.photos/seed/${Date.now()}/400/600`,
    backdrop: backdrop || `https://picsum.photos/seed/${Date.now()}bg/1200/600`,
    videoUrl: videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    videoType: detectedType,
    cast: cast || '', director: director || '', language: language || 'English'
  });
  addLog('content', `Movie "${title}" added to catalog`, req.session.user.name);
  changeEmitter.emit('change', { type: 'movie', action: 'add' });
  req.session.success = 'Movie added successfully!';
  res.redirect('/admin/movies');
});

// Movies - Edit Form
router.get('/movies/edit/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  let movie = movies.find(m => m.id === id);
  if (!movie) {
    const tmdb = await getTmdbMovies();
    const tmdbMovie = tmdb.find(m => (m.tmdbId || m.id) === id);
    if (tmdbMovie) {
      movie = { ...tmdbMovie, id: getNextMovieId(), tmdbId: tmdbMovie.tmdbId || tmdbMovie.id };
    }
  }
  if (!movie) return res.redirect('/admin/movies');
  res.render('admin/movie-form', { movie });
});

// Movies - Edit (save as local override)
router.post('/movies/edit/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, genre, year, rating, duration, premium, description, poster, backdrop, videoUrl, videoType, cast, director, language } = req.body;
  let detectedType = videoType || 'mp4';
  if (!videoType || videoType === 'auto') {
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) detectedType = 'youtube';
    else if (videoUrl && (videoUrl.includes('.mp4') || videoUrl.includes('.webm') || videoUrl.includes('.mkv'))) detectedType = 'mp4';
    else detectedType = 'mp4';
  }
  const existing = movies.find(m => m.id === id);
  if (existing) {
    Object.assign(existing, { title, genre, year: parseInt(year), rating: parseFloat(rating), duration, premium: premium === 'on', description, poster, backdrop, videoUrl, videoType: detectedType, cast, director, language });
  } else {
    const tmdb = await getTmdbMovies();
    const tmdbMovie = tmdb.find(m => (m.tmdbId || m.id) === id);
    movies.push({
      id: getNextMovieId(), tmdbId: tmdbMovie ? (tmdbMovie.tmdbId || tmdbMovie.id) : id,
      title, genre, year: parseInt(year), rating: parseFloat(rating), duration,
      premium: premium === 'on', description, poster, backdrop, videoUrl, videoType: detectedType, cast, director, language
    });
  }
  addLog('content', `Movie "${title}" updated`, req.session.user.name);
  changeEmitter.emit('change', { type: 'movie', action: 'edit' });
  req.session.success = 'Movie updated successfully!';
  res.redirect('/admin/movies');
});

// Movies - Delete
router.get('/movies/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = movies.findIndex(m => m.id === id);
  if (idx !== -1) {
    addLog('content', `Movie "${movies[idx].title}" deleted`, req.session.user.name);
    movies.splice(idx, 1);
  }
  changeEmitter.emit('change', { type: 'movie', action: 'delete' });
  req.session.success = 'Movie deleted successfully!';
  res.redirect('/admin/movies');
});

// Series - List
router.get('/series', async (req, res) => {
  const allSeries = await getAllSeries();
  const search = req.query.search || '';
  let filtered = allSeries;
  if (search) {
    filtered = allSeries.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
  }
  res.render('admin/series', { series: filtered, search, totalCount: allSeries.length });
});

// Series - Add Form
router.get('/series/add', (req, res) => {
  res.render('admin/series-form', { show: null });
});

// Series - Add
router.post('/series/add', (req, res) => {
  const { title, genre, year, rating, seasons, episodes, premium, description, poster, backdrop, videoUrl, videoType } = req.body;
  let detectedType = videoType || 'mp4';
  if (!videoType || videoType === 'auto') {
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) detectedType = 'youtube';
    else detectedType = 'mp4';
  }
  series.push({
    id: getNextSeriesId(), tmdbId: null, title, genre, year: parseInt(year), rating: parseFloat(rating),
    seasons: parseInt(seasons), episodes: parseInt(episodes), premium: premium === 'on', badge: 'new',
    description, poster: poster || `https://picsum.photos/seed/${Date.now()}/400/600`,
    backdrop: backdrop || `https://picsum.photos/seed/${Date.now()}bg/1200/600`,
    videoUrl: videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    videoType: detectedType
  });
  addLog('content', `Series "${title}" added to catalog`, req.session.user.name);
  changeEmitter.emit('change', { type: 'series', action: 'add' });
  req.session.success = 'Series added successfully!';
  res.redirect('/admin/series');
});

// Series - Edit Form
router.get('/series/edit/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  let show = series.find(s => s.id === id);
  if (!show) {
    const tmdb = await getTmdbSeries();
    const tmdbShow = tmdb.find(s => (s.tmdbId || s.id) === id);
    if (tmdbShow) {
      show = { ...tmdbShow, id: getNextSeriesId(), tmdbId: tmdbShow.tmdbId || tmdbShow.id };
    }
  }
  if (!show) return res.redirect('/admin/series');
  res.render('admin/series-form', { show });
});

// Series - Edit (save as local override)
router.post('/series/edit/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, genre, year, rating, seasons, episodes, premium, description, poster, backdrop, videoUrl, videoType } = req.body;
  let detectedType = videoType || 'mp4';
  if (!videoType || videoType === 'auto') {
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) detectedType = 'youtube';
    else detectedType = 'mp4';
  }
  const existing = series.find(s => s.id === id);
  if (existing) {
    Object.assign(existing, { title, genre, year: parseInt(year), rating: parseFloat(rating), seasons: parseInt(seasons), episodes: parseInt(episodes), premium: premium === 'on', description, poster, backdrop, videoUrl, videoType: detectedType });
  } else {
    const tmdb = await getTmdbSeries();
    const tmdbShow = tmdb.find(s => (s.tmdbId || s.id) === id);
    series.push({
      id: getNextSeriesId(), tmdbId: tmdbShow ? (tmdbShow.tmdbId || tmdbShow.id) : id,
      title, genre, year: parseInt(year), rating: parseFloat(rating),
      seasons: parseInt(seasons), episodes: parseInt(episodes), premium: premium === 'on',
      description, poster, backdrop, videoUrl, videoType: detectedType
    });
  }
  addLog('content', `Series "${title}" updated`, req.session.user.name);
  changeEmitter.emit('change', { type: 'series', action: 'edit' });
  req.session.success = 'Series updated successfully!';
  res.redirect('/admin/series');
});

// Series - Delete
router.get('/series/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = series.findIndex(s => s.id === id);
  if (idx !== -1) {
    addLog('content', `Series "${series[idx].title}" deleted`, req.session.user.name);
    series.splice(idx, 1);
  }
  changeEmitter.emit('change', { type: 'series', action: 'delete' });
  req.session.success = 'Series deleted successfully!';
  res.redirect('/admin/series');
});

// Users Management
router.get('/users', (req, res) => {
  const search = req.query.search || '';
  const roleFilter = req.query.role || '';
  const planFilter = req.query.plan || '';

  let filtered = users;
  if (search) {
    filtered = filtered.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
  }
  if (roleFilter) {
    filtered = filtered.filter(u => u.role === roleFilter);
  }
  if (planFilter) {
    filtered = filtered.filter(u => u.plan === planFilter);
  }

  const stats = {
    total: users.length,
    premium: users.filter(u => u.plan === 'premium').length,
    free: users.filter(u => u.plan === 'free').length,
    admins: users.filter(u => u.role === 'admin').length,
    avgWatchTime: Math.round(users.reduce((sum, u) => sum + (u.watchTime || 0), 0) / users.length),
    activeToday: users.filter(u => {
      const today = new Date();
      const lastActive = new Date(u.lastActive);
      return lastActive.toDateString() === today.toDateString();
    }).length
  };

  res.render('admin/users', { users: filtered, search, roleFilter, planFilter, stats, totalCount: users.length });
});

router.get('/users/toggle/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (user && user.role !== 'admin') {
    user.plan = user.plan === 'premium' ? 'free' : 'premium';
    addLog('user', `${user.name} plan changed to ${user.plan}`, req.session.user.name);
  }
  changeEmitter.emit('change', { type: 'user', action: 'update' });
  req.session.success = 'User plan updated!';
  res.redirect('/admin/users');
});

router.get('/users/delete/:id', (req, res) => {
  const idx = users.findIndex(u => u.id === parseInt(req.params.id));
  if (idx !== -1 && users[idx].role !== 'admin') {
    const name = users[idx].name;
    users.splice(idx, 1);
    addLog('user', `User "${name}" deleted`, req.session.user.name);
    changeEmitter.emit('change', { type: 'user', action: 'delete' });
    req.session.success = 'User deleted!';
  }
  res.redirect('/admin/users');
});

router.get('/users/ban/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (user && user.role !== 'admin') {
    user.banned = !user.banned;
    addLog('user', `User "${user.name}" ${user.banned ? 'banned' : 'unbanned'}`, req.session.user.name);
    changeEmitter.emit('change', { type: 'user', action: 'update' });
    req.session.success = `User ${user.banned ? 'banned' : 'unbanned'}!`;
  }
  res.redirect('/admin/users');
});

// Settings
router.get('/settings', (req, res) => {
  res.render('admin/settings', { admin: req.session.user });
});

// Anime
router.get('/anime', async (req, res) => {
  const allMovies = await getAllMovies();
  const allSeries = await getAllSeries();
  const anime = [...allMovies.filter(m => m.genre === 'Anime'), ...allSeries.filter(s => s.genre === 'Anime')];
  res.render('admin/anime', { anime });
});

// Payments
router.get('/payments', (req, res) => {
  const premiumUsers = users.filter(u => u.plan === 'premium' && u.role !== 'admin');
  const revenue = computeRevenue();

  const completedPayments = payments.filter(p => p.status === 'completed');
  const failedPayments = payments.filter(p => p.status === 'failed');
  const refundedPayments = payments.filter(p => p.status === 'refunded');

  const monthlyPayments = completedPayments.filter(p => p.plan === 'monthly');
  const yearlyPayments = completedPayments.filter(p => p.plan === 'yearly');

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
      revenue: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      count: monthPayments.length
    });
  }

  const paymentData = {
    totalRevenue: formatIndian(revenue.total),
    thisMonth: formatIndian(revenue.monthly),
    totalTransactions: payments.length,
    completedTransactions: completedPayments.length,
    failedTransactions: failedPayments.length,
    refundedTransactions: refundedPayments.length,
    avgTransaction: completedPayments.length > 0 ? formatIndian(Math.round(revenue.total / completedPayments.length)) : '₹0',
    premiumUsers,
    freeUsers: users.filter(u => u.plan === 'free'),
    revenueByPlan: {
      monthly: formatIndian(revenue.monthly),
      yearly: formatIndian(revenue.yearly),
      free: '₹0'
    },
    methodBreakdown,
    last6Months,
    recentPayments: payments.slice(0, 10)
  };
  res.render('admin/payments', { paymentData, users });
});

// Subscriptions
router.get('/subscriptions', (req, res) => {
  const premiumUsers = users.filter(u => u.plan === 'premium');
  const freeUsers = users.filter(u => u.plan === 'free');
  const totalUsers = users.length;
  const retentionRate = totalUsers > 0 ? Math.round((premiumUsers.length / totalUsers) * 100) : 0;

  const monthlySubs = premiumUsers.filter(u => {
    const pay = payments.find(p => p.userId === u.id && p.plan === 'monthly' && p.status === 'completed');
    return !!pay;
  });
  const yearlySubs = premiumUsers.filter(u => {
    const pay = payments.find(p => p.userId === u.id && p.plan === 'yearly' && p.status === 'completed');
    return !!pay;
  });

  const avgWatchTime = Math.round(premiumUsers.reduce((sum, u) => sum + (u.watchTime || 0), 0) / (premiumUsers.length || 1));
  const avgDevices = (premiumUsers.reduce((sum, u) => sum + (u.devices || 1), 0) / (premiumUsers.length || 1)).toFixed(1);

  const joinedByMonth = {};
  users.forEach(u => {
    const month = new Date(u.joinedAt).toLocaleString('en-US', { month: 'short', year: 'numeric' });
    joinedByMonth[month] = (joinedByMonth[month] || 0) + 1;
  });

  res.render('admin/subscriptions', {
    premiumUsers, freeUsers, retentionRate,
    monthlySubs, yearlySubs,
    totalUsers, avgWatchTime, avgDevices,
    joinedByMonth
  });
});

// Analytics
router.get('/analytics', async (req, res) => {
  const [allMovies, allSeries] = await Promise.all([getAllMovies(), getAllSeries()]);
  const allContent = [...allMovies, ...allSeries];

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
      title: item.title,
      rating: item.rating,
      poster: item.poster || '',
      views: Math.round(item.rating * 25000 + Math.random() * 20000),
      completion: Math.round(70 + item.rating * 2.5),
      genre: item.genre || 'N/A'
    }));

  const premiumCount = users.filter(u => u.plan === 'premium').length;
  const totalCount = users.length || 1;

  const topGenres = genreBreakdown.slice(0, 5);
  const totalViews = allMovies.length * 1200 + allSeries.length * 800;
  const avgRating = allContent.length > 0 ? (allContent.reduce((sum, m) => sum + m.rating, 0) / allContent.length).toFixed(1) : '0.0';

  const monthlyGrowth = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = month.toLocaleString('en-US', { month: 'short' });
    const monthUsers = users.filter(u => new Date(u.joinedAt) <= month).length;
    monthlyGrowth.push({ month: monthName, users: monthUsers });
  }

  res.render('admin/analytics', {
    totalViews,
    activeUsers: users.length,
    avgWatchTime: '25m',
    growthPercent: Math.round(((premiumCount / totalCount) * 100)),
    genreBreakdown,
    ratingDistribution,
    mostWatched,
    totalContent: allContent.length,
    totalMovies: allMovies.length,
    totalSeries: allSeries.length,
    avgRating,
    topGenres,
    monthlyGrowth
  });
});

// Reports
router.get('/reports', (req, res) => {
  const pendingReports = reports.filter(r => r.status === 'pending');
  const resolvedReports = reports.filter(r => r.status === 'resolved');
  res.render('admin/reports', { reports, pendingCount: pendingReports.length, resolvedCount: resolvedReports.length });
});

// Activity Logs
router.get('/logs', (req, res) => {
  const typeFilter = req.query.type || '';
  let filtered = activityLogs;
  if (typeFilter) {
    filtered = activityLogs.filter(l => l.type === typeFilter);
  }
  res.render('admin/logs', { logs: filtered, typeFilter, totalCount: activityLogs.length });
});

// Upload Movies from HF
function reloadVideoConfig() {
  try {
    videoConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'videos.json'), 'utf8')).videos || {};
  } catch (e) {}
}

const TMDB_IMG = 'https://image.tmdb.org/t/p';

router.get('/upload', (req, res) => {
  reloadVideoConfig();
  const uploadedMovies = Object.entries(videoConfig).map(([id, cfg]) => ({
    tmdbId: id,
    title: cfg.title,
    poster: cfg.poster,
    genre: cfg.genre,
    year: cfg.year,
    rating: cfg.rating,
    source: Object.values(cfg.sources)[0] || ''
  }));
  res.render('admin/upload', { uploadedMovies, success: req.session.success, error: req.session.error });
});

router.get('/upload/fetch/:tmdbId', async (req, res) => {
  try {
    const tmdbId = req.params.tmdbId;
    const resp = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=en-US`, {
      headers: { 'Authorization': `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`, 'Accept': 'application/json' }
    });
    if (!resp.ok) {
      const tvResp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?language=en-US`, {
        headers: { 'Authorization': `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`, 'Accept': 'application/json' }
      });
      if (!tvResp.ok) return res.json({ error: 'Not found' });
      const tv = await tvResp.json();
      return res.json({
        title: tv.name, poster: tv.poster_path ? `${TMDB_IMG}/w500${tv.poster_path}` : '',
        backdrop: tv.backdrop_path ? `${TMDB_IMG}/original${tv.backdrop_path}` : '',
        genre: tv.genres?.[0]?.name || '', year: (tv.first_air_date || '').substring(0, 4),
        rating: tv.vote_average || 0, description: tv.overview || '', duration: `${tv.number_of_seasons || 1} Seasons`
      });
    }
    const movie = await resp.json();
    res.json({
      title: movie.title, poster: movie.poster_path ? `${TMDB_IMG}/w500${movie.poster_path}` : '',
      backdrop: movie.backdrop_path ? `${TMDB_IMG}/original${movie.backdrop_path}` : '',
      genre: movie.genres?.[0]?.name || '', year: (movie.release_date || '').substring(0, 4),
      rating: movie.vote_average || 0, description: movie.overview || '',
      duration: movie.runtime ? `${movie.runtime}m` : ''
    });
  } catch (e) {
    res.json({ error: e.message });
  }
});

router.post('/upload', async (req, res) => {
  const { tmdbId, hfUrl, quality } = req.body;
  if (!tmdbId || !hfUrl) {
    req.session.error = 'TMDB ID and HF URL are required!';
    return res.redirect('/admin/upload');
  }
  try {
    const resp = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=en-US`, {
      headers: { 'Authorization': `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`, 'Accept': 'application/json' }
    });
    let details = {};
    if (resp.ok) {
      const movie = await resp.json();
      details = {
        title: movie.title,
        poster: movie.poster_path ? `${TMDB_IMG}/w500${movie.poster_path}` : '',
        backdrop: movie.backdrop_path ? `${TMDB_IMG}/original${movie.backdrop_path}` : '',
        genre: movie.genres?.[0]?.name || '',
        year: (movie.release_date || '').substring(0, 4),
        rating: movie.vote_average || 0,
        description: movie.overview || '',
        duration: movie.runtime ? `${movie.runtime}m` : ''
      };
    } else {
      const tvResp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?language=en-US`, {
        headers: { 'Authorization': `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`, 'Accept': 'application/json' }
      });
      if (tvResp.ok) {
        const tv = await tvResp.json();
        details = {
          title: tv.name, poster: tv.poster_path ? `${TMDB_IMG}/w500${tv.poster_path}` : '',
          backdrop: tv.backdrop_path ? `${TMDB_IMG}/original${tv.backdrop_path}` : '',
          genre: tv.genres?.[0]?.name || '', year: (tv.first_air_date || '').substring(0, 4),
          rating: tv.vote_average || 0, description: tv.overview || '',
          duration: `${tv.number_of_seasons || 1} Seasons`
        };
      } else {
        details = { title: `Movie ${tmdbId}`, poster: '', backdrop: '', genre: '', year: 2024, rating: 0, description: '', duration: '' };
      }
    }

    videoConfig[tmdbId] = {
      ...details,
      sources: { [quality || '1080p']: hfUrl }
    };

    const videosData = { note: 'Auto-generated from admin panel', videos: videoConfig };
    fs.writeFileSync(path.join(__dirname, '..', 'data', 'videos.json'), JSON.stringify(videosData, null, 2));

    addLog('content', `Movie "${details.title}" uploaded from HF`, req.session.user.name);
    changeEmitter.emit('change', { type: 'movie', action: 'upload' });
    req.session.success = `"${details.title}" added successfully!`;
    res.redirect('/admin/upload');
  } catch (e) {
    req.session.error = 'Error: ' + e.message;
    res.redirect('/admin/upload');
  }
});

router.get('/upload/delete/:tmdbId', (req, res) => {
  const tmdbId = req.params.tmdbId;
  if (videoConfig[tmdbId]) {
    const title = videoConfig[tmdbId].title;
    delete videoConfig[tmdbId];
    const videosData = { note: 'Auto-generated from admin panel', videos: videoConfig };
    fs.writeFileSync(path.join(__dirname, '..', 'data', 'videos.json'), JSON.stringify(videosData, null, 2));
    addLog('content', `Movie "${title}" removed`, req.session.user.name);
    req.session.success = `"${title}" removed!`;
  }
  res.redirect('/admin/upload');
});

module.exports = router;
