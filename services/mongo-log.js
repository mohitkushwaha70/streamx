const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb+srv://mohit8287kushwaha_db_user:O8SfUFbflOuqgu2H@cluster0.gp5ibvr.mongodb.net/streamx?retryWrites=true&w=majority&appName=Cluster0';
let client = null;
let _db = null;

async function getDb() {
  if (_db) return _db;
  try {
    client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await client.connect();
    _db = client.db('streamx');
    console.log('[MongoDB] Connected');
    return _db;
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err.message);
    return null;
  }
}

// ===== ACTIVITY LOGS =====
async function logActivity(type, message, userId = null, metadata = {}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.collection('activity_logs').insertOne({
      type, message, userId, metadata, createdAt: new Date(),
    });
  } catch (err) {
    console.error('[MongoDB] activity_logs insert failed:', err.message);
  }
}

// ===== USERS =====
async function syncUser(userData) {
  try {
    const db = await getDb();
    if (!db) return;
    const { id, name, email, role, avatar, plan, plan_chosen, last_active, joined_at, banned } = userData;
    await db.collection('users').updateOne(
      { sqliteId: id },
      {
        $set: {
          sqliteId: id, name, email,
          role: role || 'user',
          avatar: avatar || '',
          plan: plan || 'free',
          planChosen: !!plan_chosen,
          banned: !!banned,
          lastActiveAt: last_active ? new Date(last_active) : new Date(),
          joinedAt: joined_at ? new Date(joined_at) : new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error('[MongoDB] users sync failed:', err.message);
  }
}

async function deleteUser(userId) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.collection('users').deleteOne({ sqliteId: userId });
  } catch (err) {
    console.error('[MongoDB] users delete failed:', err.message);
  }
}

// ===== CONTENT =====
async function syncContent(contentData) {
  try {
    const db = await getDb();
    if (!db) return;
    const d = contentData;
    await db.collection('content').updateOne(
      { sqliteId: d.id },
      {
        $set: {
          sqliteId: d.id,
          tmdbId: d.tmdb_id,
          title: d.title,
          type: d.type,
          genre: d.genre || '',
          genres: tryParse(d.genres) || [],
          year: d.year || 0,
          rating: d.rating || 0,
          voteCount: d.vote_count || 0,
          duration: d.duration || '',
          description: d.description || '',
          poster: d.poster || '',
          backdrop: d.backdrop || '',
          videoUrl: d.video_url || '',
          videoType: d.video_type || 'mp4',
          trailerKey: d.trailer_key || '',
          cast: d.cast || '',
          director: d.director || '',
          language: d.language || 'en',
          popularity: d.popularity || 0,
          releaseDate: d.release_date || '',
          seasons: d.seasons || 0,
          episodesCount: d.episodes_count || 0,
          premium: !!d.premium,
          badge: d.badge || '',
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error('[MongoDB] content sync failed:', err.message);
  }
}

async function deleteContent(contentId) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.collection('content').deleteOne({ sqliteId: contentId });
    await db.collection('episodes').deleteMany({ contentSqliteId: contentId });
  } catch (err) {
    console.error('[MongoDB] content delete failed:', err.message);
  }
}

// ===== EPISODES =====
async function syncEpisode(episodeData, contentId) {
  try {
    const db = await getDb();
    if (!db) return;
    const e = episodeData;
    await db.collection('episodes').updateOne(
      { sqliteId: e.id },
      {
        $set: {
          sqliteId: e.id,
          contentSqliteId: contentId,
          number: e.number,
          season: e.season || 1,
          title: e.title,
          duration: e.duration || '',
          description: e.description || '',
          poster: e.poster || '',
          airDate: e.air_date || '',
          rating: e.rating || '',
          videoUrl: e.video_url || '',
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error('[MongoDB] episodes sync failed:', err.message);
  }
}

// ===== WATCHLIST =====
async function syncWatchlist(userId, contentId, type, action) {
  try {
    const db = await getDb();
    if (!db) return;
    if (action === 'add') {
      await db.collection('watchlist').updateOne(
        { userId, contentId, type },
        {
          $set: { userId, contentId, type },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    } else {
      await db.collection('watchlist').deleteOne({ userId, contentId, type });
    }
  } catch (err) {
    console.error('[MongoDB] watchlist sync failed:', err.message);
  }
}

// ===== CONTINUE WATCHING =====
async function syncContinueWatching(userId, data, action) {
  try {
    const db = await getDb();
    if (!db) return;
    if (action === 'upsert') {
      await db.collection('continue_watching').updateOne(
        { userId, tmdbId: data.tmdb_id, type: data.type },
        {
          $set: {
            userId, tmdbId: data.tmdb_id, type: data.type,
            title: data.title || '', poster: data.poster || '',
            genre: data.genre || '', duration: data.duration || '',
            progress: data.progress || 0,
            lastWatched: new Date(),
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    } else if (action === 'remove') {
      await db.collection('continue_watching').deleteOne({ userId, tmdbId: data.tmdb_id });
    } else if (action === 'removeAll') {
      await db.collection('continue_watching').deleteMany({ userId });
    }
  } catch (err) {
    console.error('[MongoDB] continue_watching sync failed:', err.message);
  }
}

// ===== PAYMENTS =====
async function syncPayment(paymentData) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.collection('payments').insertOne({
      userId: paymentData.user_id,
      amount: paymentData.amount,
      plan: paymentData.plan,
      method: paymentData.method || 'UPI',
      status: paymentData.status || 'completed',
      transactionId: paymentData.transaction_id || '',
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('[MongoDB] payments sync failed:', err.message);
  }
}

// ===== HELPERS =====
function tryParse(json) {
  try { return JSON.parse(json); } catch { return json; }
}

async function close() {
  if (client) {
    await client.close();
    client = null;
    _db = null;
  }
}

module.exports = {
  getDb, close,
  logActivity, syncUser, deleteUser,
  syncContent, deleteContent, syncEpisode,
  syncWatchlist, syncContinueWatching, syncPayment,
};
