const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
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

app.use('/', mainRoutes);
app.use('/auth', authRoutes);
app.use('/movies', moviesRoutes);
app.use('/series', seriesRoutes);
app.use('/watch', watchRoutes);
app.use('/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).send('Server Error');
});

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
