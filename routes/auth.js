const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { users, getNextUserId } = require('../data/sample');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login');
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) {
    req.session.error = 'Invalid email or password';
    return res.redirect('/auth/login');
  }
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, plan: user.plan };
  res.redirect(user.role === 'admin' ? '/admin' : '/');
});

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register');
});

router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (users.find(u => u.email === email)) {
    req.session.error = 'Email already registered';
    return res.redirect('/auth/register');
  }
  const hash = bcrypt.hashSync(password, 10);
  const newUser = { id: getNextUserId(), name, email, password: hash, role: 'user', avatar: name.charAt(0).toUpperCase(), plan: 'free' };
  users.push(newUser);
  req.session.user = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, avatar: newUser.avatar, plan: newUser.plan };
  res.redirect('/');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
