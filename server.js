const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const path = require('path');
const compression = require('compression');

try { require('dotenv').config(); } catch(e) {}

const _realWarn = console.warn;
console.warn = function() {
  if (arguments[0] && String(arguments[0]).includes('MemoryStore')) return;
  _realWarn.apply(console, arguments);
};

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err?.message || err);
});

const db = require('./services/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

if (process.env.NODE_ENV === 'production') {
  app.set('view cache', true);
}

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '30d', etag: true, immutable: true }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'streamx_secret_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.session.success;
  res.locals.error = req.session.error;
  res.locals.navAvatarMap = navAvatarMap;
  res.locals.displayTitle = app.locals.displayTitle;
  delete req.session.success;
  delete req.session.error;
  next();
});

const mainRoutes = require('./routes/main');
const authRoutes = require('./routes/auth');
const moviesRoutes = require('./routes/movies');
const seriesRoutes = require('./routes/series');
const watchRoutes = require('./routes/watch');
const adminRoutes = require('./routes/admin');
const animeRoutes = require('./routes/anime');
const profileRoutes = require('./routes/profile');
const watchlistRoutes = require('./routes/watchlist');
const downloadRoutes = require('./routes/download');
const videoProxyRoutes = require('./routes/video-proxy');
const searchRoutes = require('./routes/search');
const paymentRoutes = require('./routes/payment');
const apiRoutes = require('./routes/api');
const freeRoutes = require('./routes/free');
const { changeEmitter } = require('./data/sample');
const { getSourceIcon, getSourceColor } = require('./services/watchmode');
const { avatars: allAvatars, categories: avatarCategories } = require('./data/avatars');
const { cleanVideoTitle } = require('./services/metadata');

const navAvatarMap = {};
allAvatars.forEach(a => { navAvatarMap[a.id] = a.svg; });

app.locals.getSourceIcon = getSourceIcon;
app.locals.getSourceColor = getSourceColor;

// Clean display titles - never show ".mp4", "?download=true", etc. in UI
app.locals.displayTitle = function(title) {
  if (!title) return 'Untitled';
  var t = String(title);
  // If it looks like a filename/URL fragment, clean it
  if (/\.(mp4|mkv|webm|avi|mov|m3u8|mpd)/i.test(t) || /\?download/i.test(t) || /1080p|720p|480p/i.test(t)) {
    return cleanVideoTitle(t);
  }
  return t;
};

changeEmitter.setMaxListeners(100);

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('\n');

  const onChange = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  changeEmitter.on('change', onChange);

  req.on('close', () => {
    changeEmitter.removeListener('change', onChange);
  });
});

app.use('/', mainRoutes);
app.use('/auth', authRoutes);
app.use('/movies', moviesRoutes);
app.use('/series', seriesRoutes);
app.use('/watch', watchRoutes);
app.use('/anime', animeRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);
app.use('/watchlist', watchlistRoutes);
app.use('/download', downloadRoutes);
app.use('/stream', videoProxyRoutes);
app.use('/api', apiRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/free-movies', freeRoutes);
app.use((err, req, res, next) => {
  console.error('=== ERROR ===');
  console.error('URL:', req.method, req.originalUrl);
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  console.error('=============');
  res.status(500).send('Server Error: ' + err.message);
});

// Content served from database only

async function start() {
  await db.init();
  console.log('Database initialized');

  function listen(port) {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`streamX running on port ${port}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} already in use. Exiting.`);
        process.exit(1);
      } else {
        console.error('Server error:', err.message);
      }
    });
  }

  listen(PORT);

  // Graceful shutdown — flush DB to disk before exit
  function shutdown() {
    console.log('[Server] Shutting down, saving DB...');
    try { db.saveNow(); } catch(e) {}
    process.exit(0);
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('exit', () => { try { db.saveNow(); } catch(e) {} });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

module.exports = app;
