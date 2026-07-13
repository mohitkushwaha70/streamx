const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'streamx.db');
let db = null;

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  createTables();
  seedAdmin();
  resetAdminPassword();
  save();

  return db;
}

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT DEFAULT '',
    google_id TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('user','admin')),
    avatar TEXT DEFAULT '',
    plan TEXT DEFAULT 'free' CHECK(plan IN ('free','premium')),
    banned INTEGER DEFAULT 0,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    watch_time INTEGER DEFAULT 0,
    devices INTEGER DEFAULT 1
  )`);

  try { db.run("ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0"); } catch(e) {}

  db.run(`CREATE TABLE IF NOT EXISTS content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('movie','series','anime')),
    genre TEXT DEFAULT '',
    genres TEXT DEFAULT '[]',
    year INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    duration TEXT DEFAULT '',
    description TEXT DEFAULT '',
    poster TEXT DEFAULT '',
    backdrop TEXT DEFAULT '',
    video_url TEXT DEFAULT '',
    video_type TEXT DEFAULT 'mp4',
    trailer_key TEXT DEFAULT '',
    cast TEXT DEFAULT '',
    director TEXT DEFAULT '',
    language TEXT DEFAULT 'en',
    popularity REAL DEFAULT 0,
    release_date TEXT DEFAULT '',
    seasons INTEGER DEFAULT 0,
    episodes_count INTEGER DEFAULT 0,
    premium INTEGER DEFAULT 0,
    badge TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tmdb_id, type)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id INTEGER NOT NULL,
    number INTEGER NOT NULL,
    season INTEGER DEFAULT 1,
    title TEXT NOT NULL,
    duration TEXT DEFAULT '',
    description TEXT DEFAULT '',
    poster TEXT DEFAULT '',
    air_date TEXT DEFAULT '',
    rating TEXT DEFAULT '',
    video_url TEXT DEFAULT '',
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content_id INTEGER NOT NULL,
    type TEXT DEFAULT 'watchlist' CHECK(type IN ('watchlist','favorite','saved')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, content_id, type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS continue_watching (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tmdb_id INTEGER NOT NULL,
    type TEXT DEFAULT 'movie',
    title TEXT DEFAULT '',
    poster TEXT DEFAULT '',
    genre TEXT DEFAULT '',
    duration TEXT DEFAULT '',
    progress INTEGER DEFAULT 0,
    last_watched DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tmdb_id, type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS video_configs (
    tmdb_id INTEGER PRIMARY KEY,
    title TEXT DEFAULT '',
    poster TEXT DEFAULT '',
    backdrop TEXT DEFAULT '',
    genre TEXT DEFAULT '',
    year INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    duration TEXT DEFAULT '',
    description TEXT DEFAULT '',
    sources TEXT DEFAULT '{}'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL DEFAULT 0,
    plan TEXT DEFAULT '',
    method TEXT DEFAULT 'UPI',
    status TEXT DEFAULT 'completed',
    transaction_id TEXT DEFAULT '',
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT DEFAULT '',
    message TEXT DEFAULT '',
    admin TEXT DEFAULT 'System',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_content_type ON content(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_content_genre ON content(genre)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_content_year ON content(year)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_content_rating ON content(rating)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_content_title ON content(title)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_episodes_content ON episodes(content_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cw_user ON continue_watching(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)`);
}

function seedAdmin() {
  const existing = db.exec("SELECT id FROM users WHERE email = 'admin@streamx.com'");
  if (existing.length > 0 && existing[0].values.length > 0) return;

  const hash = bcrypt.hashSync('mohit@12100890', 10);
  db.run(
    `INSERT INTO users (name, email, password, role, avatar, plan) VALUES (?, ?, ?, ?, ?, ?)`,
    ['Admin', 'admin@streamx.com', hash, 'admin', 'A', 'premium']
  );
}

function resetAdminPassword() {
  const hash = bcrypt.hashSync('mohit@12100890', 10);
  db.run(`UPDATE users SET password = ? WHERE email = 'admin@streamx.com'`, [hash]);
  save();
}

function save() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function getDb() { return db; }

// ===== USER OPERATIONS =====
const users = {
  findById(id) {
    const r = db.exec("SELECT * FROM users WHERE id = ?", [id]);
    return r.length > 0 && r[0].values.length > 0 ? rowToObj(r[0], r[0].values[0]) : null;
  },
  findByEmail(email) {
    const r = db.exec("SELECT * FROM users WHERE email = ?", [email]);
    return r.length > 0 && r[0].values.length > 0 ? rowToObj(r[0], r[0].values[0]) : null;
  },
  create({ name, email, password = '', google_id = '', role = 'user', avatar = '', plan = 'free' }) {
    db.run(
      `INSERT INTO users (name, email, password, google_id, role, avatar, plan) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, password, google_id, role, avatar || name.charAt(0).toUpperCase(), plan]
    );
    save();
    return this.findByEmail(email);
  },
  updateLastActive(id) {
    db.run("UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?", [id]);
    save();
  },
  count() {
    const r = db.exec("SELECT COUNT(*) as c FROM users");
    return r[0]?.values[0]?.[0] || 0;
  },
  premiumCount() {
    const r = db.exec("SELECT COUNT(*) as c FROM users WHERE plan = 'premium'");
    return r[0]?.values[0]?.[0] || 0;
  },
  all() {
    const r = db.exec("SELECT * FROM users ORDER BY id DESC");
    return r.length > 0 ? r[0].values.map(v => rowToObj(r[0], v)) : [];
  },
  getAll() { return this.all(); },
  update(id, data) {
    const fields = [];
    const vals = [];
    for (const [k, v] of Object.entries(data)) {
      if (k === 'id') continue;
      fields.push(`${k} = ?`);
      vals.push(v);
    }
    if (fields.length === 0) return;
    vals.push(id);
    db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, vals);
    save();
  },
  delete(id) {
    db.run("DELETE FROM users WHERE id = ?", [id]);
    save();
  }
};

// ===== CONTENT OPERATIONS =====
const content = {
  findById(id) {
    const r = db.exec("SELECT * FROM content WHERE id = ?", [id]);
    if (r.length === 0 || r[0].values.length === 0) return null;
    const item = rowToObj(r[0], r[0].values[0]);
    item.genres = tryParse(item.genres);
    return item;
  },
  findByTmdbId(tmdbId, type) {
    const r = db.exec("SELECT * FROM content WHERE tmdb_id = ? AND type = ?", [tmdbId, type]);
    if (r.length === 0 || r[0].values.length === 0) return null;
    const item = rowToObj(r[0], r[0].values[0]);
    item.genres = tryParse(item.genres);
    return item;
  },
  upsert(data) {
    const existing = this.findByTmdbId(data.tmdb_id, data.type);
    if (existing) {
      db.run(
        `UPDATE content SET title=?, genre=?, genres=?, year=?, rating=?, vote_count=?, duration=?,
         description=?, poster=?, backdrop=?, video_url=?, video_type=?, trailer_key=?, cast=?,
         director=?, language=?, popularity=?, release_date=?, seasons=?, episodes_count=?,
         premium=?, badge=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [data.title, data.genre, JSON.stringify(data.genres || []), data.year, data.rating,
         data.vote_count || 0, data.duration, data.description, data.poster, data.backdrop,
         data.video_url, data.video_type, data.trailer_key, data.cast, data.director,
         data.language, data.popularity, data.release_date, data.seasons || 0,
         data.episodes_count || 0, data.premium ? 1 : 0, data.badge, existing.id]
      );
      save();
      return existing.id;
    } else {
      db.run(
        `INSERT INTO content (tmdb_id, title, type, genre, genres, year, rating, vote_count,
         duration, description, poster, backdrop, video_url, video_type, trailer_key, cast,
         director, language, popularity, release_date, seasons, episodes_count, premium, badge)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.tmdb_id, data.title, data.type, data.genre, JSON.stringify(data.genres || []),
         data.year, data.rating, data.vote_count || 0, data.duration, data.description,
         data.poster, data.backdrop, data.video_url, data.video_type, data.trailer_key,
         data.cast, data.director, data.language, data.popularity, data.release_date,
         data.seasons || 0, data.episodes_count || 0, data.premium ? 1 : 0, data.badge]
      );
      save();
      const rid = db.exec("SELECT last_insert_rowid() as id");
      return rid[0].values[0][0];
    }
  },
  search(query, limit = 20) {
    const q = `%${query}%`;
    const r = db.exec(
      `SELECT * FROM content WHERE title LIKE ? OR genre LIKE ? OR [cast] LIKE ? OR description LIKE ?
       ORDER BY rating DESC, popularity DESC LIMIT ?`,
      [q, q, q, q, limit]
    );
    return r.length > 0 ? r[0].values.map(v => { const o = rowToObj(r[0], v); o.genres = tryParse(o.genres); return o; }) : [];
  },
  list(type, { genre, sort, page = 1, limit = 30 } = {}) {
    let where = type ? 'WHERE type = ?' : '';
    let params = type ? [type] : [];
    if (genre) { where += ' AND genre = ?'; params.push(genre); }

    let orderBy = 'ORDER BY popularity DESC';
    if (sort === 'rating') orderBy = 'ORDER BY rating DESC';
    else if (sort === 'year') orderBy = 'ORDER BY year DESC';
    else if (sort === 'az') orderBy = 'ORDER BY title ASC';
    else if (sort === 'new') orderBy = 'ORDER BY created_at DESC';

    const offset = (page - 1) * limit;
    const countR = db.exec(`SELECT COUNT(*) as c FROM content ${where}`, params);
    const total = countR[0]?.values[0]?.[0] || 0;

    const r = db.exec(`SELECT * FROM content ${where} ${orderBy} LIMIT ? OFFSET ?`, [...params, limit, offset]);
    const items = r.length > 0 ? r[0].values.map(v => { const o = rowToObj(r[0], v); o.genres = tryParse(o.genres); return o; }) : [];
    return { items, total, page, pages: Math.ceil(total / limit) };
  },
  genres(type) {
    const r = db.exec("SELECT DISTINCT genre FROM content WHERE genre != '' AND type = ?", [type || '']);
    return r.length > 0 ? r[0].values.map(v => v[0]) : [];
  },
  count(type) {
    const q = type ? "SELECT COUNT(*) as c FROM content WHERE type = ?" : "SELECT COUNT(*) as c FROM content";
    const r = db.exec(q, type ? [type] : []);
    return r[0]?.values[0]?.[0] || 0;
  },
  delete(id) {
    db.run("DELETE FROM content WHERE id = ?", [id]);
    save();
  },
  all() {
    const r = db.exec("SELECT * FROM content ORDER BY id DESC");
    return r.length > 0 ? r[0].values.map(v => { const o = rowToObj(r[0], v); o.genres = tryParse(o.genres); return o; }) : [];
  },
  getAll() { return this.all(); },
  getByType(type) {
    const r = db.exec("SELECT * FROM content WHERE type = ? ORDER BY id DESC", [type]);
    return r.length > 0 ? r[0].values.map(v => { const o = rowToObj(r[0], v); o.genres = tryParse(o.genres); return o; }) : [];
  },
  create(data) {
    db.run(
      `INSERT INTO content (tmdb_id, title, type, genre, genres, year, rating, vote_count,
       duration, description, poster, backdrop, video_url, video_type, trailer_key, cast,
       director, language, popularity, release_date, seasons, episodes_count, premium, badge)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.tmdb_id, data.title, data.type, data.genre || '', JSON.stringify(data.genres || []),
       data.year || 0, data.rating || 0, data.vote_count || 0, data.duration || '',
       data.description || '', data.poster || '', data.backdrop || '',
       data.video_url || '', data.video_type || 'mp4', data.trailer_key || '',
       data.cast || '', data.director || '', data.language || 'en',
       data.popularity || 0, data.release_date || '', data.seasons || 0,
       data.episodes_count || 0, data.premium || 0, data.badge || '']
    );
    save();
    const rid = db.exec("SELECT last_insert_rowid() as id");
    return rid[0].values[0][0];
  },
  update(id, data) {
    const fields = [];
    const vals = [];
    for (const [k, v] of Object.entries(data)) {
      if (k === 'id') continue;
      fields.push(`${k} = ?`);
      vals.push(k === 'genres' ? JSON.stringify(v) : v);
    }
    if (fields.length === 0) return;
    vals.push(id);
    db.run(`UPDATE content SET ${fields.join(', ')} WHERE id = ?`, vals);
    save();
  }
};

// ===== EPISODES =====
const episodes = {
  findByContent(contentId) {
    const r = db.exec("SELECT * FROM episodes WHERE content_id = ? ORDER BY season, number", [contentId]);
    return r.length > 0 ? r[0].values.map(v => rowToObj(r[0], v)) : [];
  },
  find(contentId, season, number) {
    const r = db.exec("SELECT * FROM episodes WHERE content_id = ? AND season = ? AND number = ?", [contentId, season, number]);
    return r.length > 0 && r[0].values.length > 0 ? rowToObj(r[0], r[0].values[0]) : null;
  },
  upsert(contentId, data) {
    const existing = this.find(contentId, data.season, data.number);
    if (existing) {
      db.run(
        `UPDATE episodes SET title=?, duration=?, description=?, poster=?, air_date=?, rating=?, video_url=? WHERE id=?`,
        [data.title, data.duration, data.description, data.poster, data.air_date, data.rating, data.video_url, existing.id]
      );
    } else {
      db.run(
        `INSERT INTO episodes (content_id, number, season, title, duration, description, poster, air_date, rating, video_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [contentId, data.number, data.season || 1, data.title, data.duration, data.description, data.poster, data.air_date, data.rating, data.video_url]
      );
    }
    save();
  }
};

// ===== WATCHLIST =====
const watchlist = {
  get(userId, type = 'watchlist') {
    const r = db.exec(
      `SELECT c.* FROM watchlist w JOIN content c ON w.content_id = c.id
       WHERE w.user_id = ? AND w.type = ? ORDER BY w.created_at DESC`, [userId, type]
    );
    return r.length > 0 ? r[0].values.map(v => { const o = rowToObj(r[0], v); o.genres = tryParse(o.genres); return o; }) : [];
  },
  add(userId, contentId, type = 'watchlist') {
    db.run("INSERT OR IGNORE INTO watchlist (user_id, content_id, type) VALUES (?, ?, ?)", [userId, contentId, type]);
    save();
  },
  remove(userId, contentId, type = 'watchlist') {
    db.run("DELETE FROM watchlist WHERE user_id = ? AND content_id = ? AND type = ?", [userId, contentId, type]);
    save();
  },
  has(userId, contentId, type = 'watchlist') {
    const r = db.exec("SELECT 1 FROM watchlist WHERE user_id = ? AND content_id = ? AND type = ?", [userId, contentId, type]);
    return r.length > 0 && r[0].values.length > 0;
  },
  count(userId, type) {
    const r = db.exec("SELECT COUNT(*) as c FROM watchlist WHERE user_id = ? AND type = ?", [userId, type]);
    return r[0]?.values[0]?.[0] || 0;
  }
};

// ===== CONTINUE WATCHING =====
const continueWatching = {
  get(userId) {
    const r = db.exec(
      `SELECT * FROM continue_watching WHERE user_id = ? ORDER BY last_watched DESC LIMIT 10`, [userId]
    );
    return r.length > 0 ? r[0].values.map(v => rowToObj(r[0], v)) : [];
  },
  upsert(userId, tmdbId, type, title, poster, genre, duration, progress) {
    db.run(
      `INSERT INTO continue_watching (user_id, tmdb_id, type, title, poster, genre, duration, progress, last_watched)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, tmdb_id, type) DO UPDATE SET progress=?, last_watched=CURRENT_TIMESTAMP, title=?, poster=?, genre=?, duration=?`,
      [userId, tmdbId, type, title || '', poster || '', genre || '', duration || '', progress || 0,
       progress || 0, title || '', poster || '', genre || '', duration || '']
    );
    save();
  },
  remove(userId, tmdbId) {
    db.run("DELETE FROM continue_watching WHERE user_id = ? AND tmdb_id = ?", [userId, tmdbId]);
    save();
  }
};

// ===== VIDEO CONFIGS =====
const videoConfigs = {
  get(tmdbId) {
    const r = db.exec("SELECT * FROM video_configs WHERE tmdb_id = ?", [tmdbId]);
    if (r.length === 0 || r[0].values.length === 0) return null;
    const row = rowToObj(r[0], r[0].values[0]);
    row.sources = tryParse(row.sources);
    return row;
  },
  getAll() {
    const r = db.exec("SELECT * FROM video_configs ORDER BY tmdb_id DESC");
    if (r.length === 0) return {};
    const map = {};
    r[0].values.forEach(v => {
      const row = rowToObj(r[0], v);
      row.sources = tryParse(row.sources);
      map[row.tmdb_id] = row;
    });
    return map;
  },
  set(tmdbId, data) {
    db.run(
      `INSERT INTO video_configs (tmdb_id, title, poster, backdrop, genre, year, rating, duration, description, sources)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(tmdb_id) DO UPDATE SET title=?, poster=?, backdrop=?, genre=?, year=?, rating=?, duration=?, description=?, sources=?`,
      [tmdbId, data.title, data.poster, data.backdrop, data.genre, data.year, data.rating, data.duration, data.description, JSON.stringify(data.sources || {}),
       data.title, data.poster, data.backdrop, data.genre, data.year, data.rating, data.duration, data.description, JSON.stringify(data.sources || {})]
    );
    save();
  },
  remove(tmdbId) {
    db.run("DELETE FROM video_configs WHERE tmdb_id = ?", [tmdbId]);
    save();
  }
};

// ===== PAYMENTS =====
const payments = {
  add(userId, amount, plan, method = 'UPI', status = 'completed') {
    const txId = 'TXN' + Date.now().toString(36).toUpperCase();
    db.run(
      "INSERT INTO payments (user_id, amount, plan, method, status, transaction_id) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, amount, plan, method, status, txId]
    );
    save();
  },
  all() {
    const r = db.exec("SELECT p.*, u.name as user_name FROM payments p LEFT JOIN users u ON p.user_id = u.id ORDER BY p.id DESC");
    return r.length > 0 ? r[0].values.map(v => rowToObj(r[0], v)) : [];
  },
  getAll() { return this.all(); },
  total() {
    const r = db.exec("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'");
    return r[0]?.values[0]?.[0] || 0;
  }
};

// ===== ACTIVITY LOGS =====
const logs = {
  add(type, message, admin = 'System') {
    db.run("INSERT INTO activity_logs (type, message, admin) VALUES (?, ?, ?)", [type, message, admin]);
    if (db.exec("SELECT COUNT(*) as c FROM activity_logs")[0].values[0][0] > 200) {
      db.exec("DELETE FROM activity_logs WHERE id NOT IN (SELECT id FROM activity_logs ORDER BY id DESC LIMIT 200)");
    }
    save();
  },
  all(limit = 100) {
    const r = db.exec("SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?", [limit]);
    return r.length > 0 ? r[0].values.map(v => rowToObj(r[0], v)) : [];
  },
  getAll() { return this.all(); },
  get(limit = 100) { return this.all(limit); },
  getByType(type, limit = 100) {
    const r = db.exec("SELECT * FROM activity_logs WHERE type = ? ORDER BY id DESC LIMIT ?", [type, limit]);
    return r.length > 0 ? r[0].values.map(v => rowToObj(r[0], v)) : [];
  }
};

// ===== HELPERS =====
function rowToObj(execResult, values) {
  const obj = {};
  execResult.columns.forEach((col, i) => { obj[col] = values[i]; });
  return obj;
}

function tryParse(json) {
  try { return JSON.parse(json); } catch { return json; }
}

module.exports = {
  init, getDb, save,
  users, content, episodes, watchlist, continueWatching,
  videoConfigs, payments, logs
};
