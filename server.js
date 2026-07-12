const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const path = require('path');

try { require('dotenv').config(); } catch(e) {}

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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
const { changeEmitter } = require('./data/sample');

// SSE endpoint for real-time sync
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
app.use((err, req, res, next) => {
  console.error('=== ERROR ===');
  console.error('URL:', req.method, req.originalUrl);
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  console.error('=============');
  res.status(500).send('Server Error: ' + err.message);
});

if (!process.env.TMDB_READ_ACCESS_TOKEN) {
  console.error('!!! CRITICAL: TMDB_READ_ACCESS_TOKEN is not set !!!');
  console.error('Set it in Render Dashboard > Environment tab.');
  console.error('TMDB API calls will fail with 401 Unauthorized.');
} else {
  console.log('TMDB_READ_ACCESS_TOKEN loaded (length:', process.env.TMDB_READ_ACCESS_TOKEN.length, ')');
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`streamX running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} in use, trying ${PORT + 1}`);
    app.listen(PORT + 1, '0.0.0.0', () => {
      console.log(`streamX running on port ${PORT + 1}`);
    });
  }
});
