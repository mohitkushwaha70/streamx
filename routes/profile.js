const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../services/database');
const { avatars, categories } = require('../data/avatars');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, uploadDir); },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'avatar-' + req.session.user.id + '-' + Date.now() + ext);
  }
});

const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    if (allowedTypes.indexOf(file.mimetype) !== -1) cb(null, true);
    else cb(new Error('Unsupported format. Use JPG, PNG, or WEBP.'));
  }
});

function getAvatarMap() {
  const map = {};
  avatars.forEach(function(a) { map[a.id] = a.svg; });
  return map;
}

router.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const userId = req.session.user.id;
  const userWatchlist = db.watchlist.get(userId, 'watchlist').slice(0, 6);
  const userFavorites = db.watchlist.get(userId, 'favorite').slice(0, 6);
  const userSaved = db.watchlist.get(userId, 'saved').slice(0, 6);
  const continueWatching = db.continueWatching.get(userId).slice(0, 6);
  const avatarMap = getAvatarMap();
  res.render('profile', {
    userWatchlist, userFavorites, userSaved, continueWatching,
    avatars, categories, avatarMap
  });
});

router.post('/', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { name, avatar } = req.body;
  const updates = {};
  if (name && name.trim()) updates.name = name.trim();
  if (avatar && avatar.trim() && avatar.trim().length > 1) updates.avatar = avatar.trim();
  if (Object.keys(updates).length > 0) {
    db.users.update(req.session.user.id, updates);
    if (updates.name) req.session.user.name = updates.name;
    if (updates.avatar) req.session.user.avatar = updates.avatar;
    req.session.success = 'Profile updated!';
  }
  res.redirect('/profile');
});

router.post('/avatar', (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, error: 'Login required' });

  upload.single('avatar')(req, res, function(err) {
    if (err) {
      var msg = 'Upload failed.';
      if (err.code === 'LIMIT_FILE_SIZE') msg = 'Image too large. Maximum 5MB.';
      if (err.message) msg = err.message;
      return res.status(400).json({ success: false, error: msg });
    }
    if (!req.file) return res.status(400).json({ success: false, error: 'No image provided.' });

    var avatarUrl = '/uploads/avatars/' + req.file.filename;
    var userId = req.session.user.id;

    db.users.update(userId, { avatar: avatarUrl });
    req.session.user.avatar = avatarUrl;

    res.json({ success: true, avatar: avatarUrl });
  });
});

router.post('/avatar/select', (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, error: 'Login required' });
  const { avatarId } = req.body;
  if (!avatarId) return res.status(400).json({ success: false, error: 'No avatar selected.' });

  const found = avatars.find(function(a) { return a.id === avatarId; });
  if (!found) return res.status(400).json({ success: false, error: 'Invalid avatar.' });

  db.users.update(req.session.user.id, { avatar: avatarId });
  req.session.user.avatar = avatarId;

  res.json({ success: true, avatar: avatarId, svg: found.svg });
});

module.exports = router;