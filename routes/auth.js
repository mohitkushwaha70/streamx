const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../services/database');
const { logActivity, syncUser } = require('../services/mongo-log');
const { sendOTP } = require('../services/email');

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = db.users.findById(id);
  done(null, user || null);
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    proxy: true
  }, (accessToken, refreshToken, profile, done) => {
    let user = db.users.findByEmail(profile.emails?.[0]?.value || '');
    const isNew = !user;
    if (!user) {
      user = db.users.create({
        name: profile.displayName,
        email: profile.emails?.[0]?.value || '',
        password: '',
        google_id: profile.id,
        role: 'user',
        avatar: profile.displayName.charAt(0).toUpperCase(),
        plan: 'free'
      });
    }
    user._isNew = isNew;
    return done(null, user);
  }));
}

// ===== LOGIN (Email + Password / OTP for Google users) =====
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    req.session.error = 'Please enter your email';
    return res.redirect('/auth/login');
  }

  const user = db.users.findByEmail(email);
  if (!user) {
    req.session.error = 'Invalid email or password';
    return res.redirect('/auth/login');
  }

  if (user.banned) {
    req.session.error = 'Your account has been suspended. Contact support.';
    return res.redirect('/auth/login');
  }

  // Google user (no password) → send OTP automatically
  if (!user.password) {
    const code = db.otp.create(email, 'login');
    await sendOTP(email, code, 'login');
    req.session.loginEmail = email;
    return res.redirect('/auth/login/otp/verify');
  }

  if (!password) {
    req.session.error = 'Please enter your password';
    return res.redirect('/auth/login');
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    req.session.error = 'Invalid email or password';
    return res.redirect('/auth/login');
  }

  db.users.updateLastActive(user.id);
  db.logs.add('user', `User logged in: ${user.name}`, user.name);

  logActivity('login', `${user.name} (${user.email}) logged in`, user.id, {
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    email: user.email,
    role: user.role,
    provider: 'password',
  });

  syncUser(user);

  req.session.user = {
    id: user.id, name: user.name, email: user.email,
    role: user.role, avatar: user.avatar, plan: user.plan
  };
  res.redirect(user.role === 'admin' ? '/admin' : '/');
});

// OTP verify for Google users
router.get('/login/otp/verify', (req, res) => {
  if (req.session.user) return res.redirect('/');
  if (!req.session.loginEmail) return res.redirect('/auth/login');
  res.render('login-otp', { email: req.session.loginEmail });
});

router.post('/login/otp/verify', (req, res) => {
  const { code } = req.body;
  const email = req.session.loginEmail;
  if (!email) return res.redirect('/auth/login');
  if (!code || code.length !== 6) {
    req.session.error = 'Enter the 6-digit OTP';
    return res.redirect('/auth/login/otp/verify');
  }

  const valid = db.otp.verify(email, code, 'login');
  if (!valid) {
    req.session.error = 'Invalid or expired OTP. Try again.';
    return res.redirect('/auth/login/otp/verify');
  }

  const user = db.users.findByEmail(email);
  if (!user) {
    req.session.error = 'Account not found';
    return res.redirect('/auth/login');
  }

  db.users.updateLastActive(user.id);
  db.logs.add('user', `User logged in via OTP: ${user.name}`, user.name);

  logActivity('login', `${user.name} (${user.email}) logged in`, user.id, {
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    email: user.email,
    role: user.role,
    provider: 'otp',
  });

  syncUser(user);

  delete req.session.loginEmail;
  req.session.user = {
    id: user.id, name: user.name, email: user.email,
    role: user.role, avatar: user.avatar, plan: user.plan
  };
  res.redirect(user.role === 'admin' ? '/admin' : '/');
});

// ===== REGISTER (Email + Password + OTP) =====
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register');
});

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    req.session.error = 'Please fill in all fields';
    return res.redirect('/auth/register');
  }
  if (password.length < 6) {
    req.session.error = 'Password must be at least 6 characters';
    return res.redirect('/auth/register');
  }
  if (db.users.findByEmail(email)) {
    req.session.error = 'Email already registered';
    return res.redirect('/auth/register');
  }

  const code = db.otp.create(email, 'register');
  await sendOTP(email, code, 'register');

  req.session.registerData = { name, email, password };
  res.redirect('/auth/register/verify');
});

router.get('/register/verify', (req, res) => {
  if (req.session.user) return res.redirect('/');
  if (!req.session.registerData) return res.redirect('/auth/register');
  res.render('register-otp', { email: req.session.registerData.email });
});

router.post('/register/verify', async (req, res) => {
  const { code } = req.body;
  const data = req.session.registerData;
  if (!data) return res.redirect('/auth/register');
  if (!code || code.length !== 6) {
    req.session.error = 'Enter the 6-digit OTP';
    return res.redirect('/auth/register/verify');
  }

  const valid = db.otp.verify(data.email, code, 'register');
  if (!valid) {
    req.session.error = 'Invalid or expired OTP. Try again.';
    return res.redirect('/auth/register/verify');
  }

  const hash = bcrypt.hashSync(data.password, 10);
  const newUser = db.users.create({
    name: data.name, email: data.email, password: hash,
    role: 'user', avatar: data.name.charAt(0).toUpperCase(), plan: 'free'
  });

  db.logs.add('user', `New user registered: ${data.name} (${data.email})`, 'System');

  logActivity('register', `New user registered: ${data.name} (${data.email})`, newUser.id, {
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    email: data.email,
    role: 'user',
  });

  syncUser(newUser);

  req.session.user = {
    id: newUser.id, name: newUser.name, email: newUser.email,
    role: newUser.role, avatar: newUser.avatar, plan: newUser.plan
  };
  delete req.session.registerData;
  res.redirect('/auth/choose-plan');
});

// ===== CHOOSE PLAN =====
router.get('/choose-plan', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  res.render('choose-plan');
});

router.post('/choose-plan', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { plan } = req.body;
  if (plan === 'free') {
    return res.redirect('/');
  }
  res.redirect('/pricing');
});

// ===== GOOGLE OAUTH =====
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect('/auth/login?error=google_not_configured');
  }
  const callbackURL = (process.env.NEXT_PUBLIC_APP_URL || 'https://streamx-ntpv.onrender.com') + '/auth/google/callback';
  passport.authenticate('google', { scope: ['profile', 'email'], callbackURL })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect('/auth/login?error=google_not_configured');
  }
  const callbackURL = (process.env.NEXT_PUBLIC_APP_URL || 'https://streamx-ntpv.onrender.com') + '/auth/google/callback';
  passport.authenticate('google', { failureRedirect: '/auth/login', callbackURL })(req, res, () => {
    db.users.updateLastActive(req.user.id);

    logActivity('login', `${req.user.name} (${req.user.email}) logged in via Google`, req.user.id, {
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      email: req.user.email,
      role: req.user.role,
      provider: 'google',
    });

    syncUser(req.user);

    req.session.user = {
      id: req.user.id, name: req.user.name, email: req.user.email,
      role: req.user.role, avatar: req.user.avatar, plan: req.user.plan
    };
    res.redirect(req.user._isNew ? '/auth/choose-plan' : '/');
  });
});

// ===== LOGOUT =====
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

module.exports = router;
