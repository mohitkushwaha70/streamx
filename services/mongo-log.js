const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb+srv://mohit8287kushwaha_db_user:O8SfUFbflOuqgu2H@cluster0.gp5ibvr.mongodb.net/streamx?retryWrites=true&w=majority&appName=Cluster0';
let client = null;
let _db = null;
let _connected = false;

async function getDb() {
  if (_db) return _db;
  try {
    client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await client.connect();
    _db = client.db('streamx');
    _connected = true;
    console.log('[MongoDB] Connected');
    return _db;
  } catch (err) {
    _connected = false;
    console.error('[MongoDB] Connection failed:', err.message);
    return null;
  }
}

function isConnected() { return _connected; }

async function retryOp(fn, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      await fn();
      return true;
    } catch (err) {
      if (i < retries) {
        _db = null; // force reconnect
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      } else {
        console.error('[MongoDB] retryOp failed after ' + (retries + 1) + ' attempts:', err.message);
        return false;
      }
    }
  }
}

// ===== ACTIVITY LOGS =====
async function logActivity(type, message, userId = null, metadata = {}) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    await db.collection('activity_logs').insertOne({
      type, message, userId, metadata, createdAt: new Date(),
    });
  });
}

// ===== USERS =====
async function syncUser(userData) {
  await retryOp(async () => {
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
  });
}

async function deleteUser(userId) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    await db.collection('users').deleteOne({ sqliteId: userId });
  });
}

// ===== CONTENT =====
async function syncContent(contentData) {
  await retryOp(async () => {
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
  });
}

async function deleteContent(contentId) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    await db.collection('content').deleteOne({ sqliteId: contentId });
    await db.collection('episodes').deleteMany({ contentSqliteId: contentId });
  });
}

// ===== EPISODES =====
async function syncEpisode(episodeData, contentId) {
  await retryOp(async () => {
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
  });
}

// ===== WATCHLIST =====
async function syncWatchlist(userId, contentId, type, action) {
  await retryOp(async () => {
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
  });
}

// ===== CONTINUE WATCHING =====
async function syncContinueWatching(userId, data, action) {
  await retryOp(async () => {
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
  });
}

// ===== PAYMENTS =====
async function syncPayment(paymentData) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    await db.collection('payments').updateOne(
      { userId: paymentData.user_id, transactionId: paymentData.transaction_id },
      {
        $set: {
          userId: paymentData.user_id,
          amount: paymentData.amount,
          plan: paymentData.plan,
          method: paymentData.method || 'UPI',
          status: paymentData.status || 'completed',
          transactionId: paymentData.transaction_id || '',
          payType: paymentData.payType || '',
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  });
}

// ===== FULL SYNC (safety net) =====
async function fullSyncContent(contentArray) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    for (const item of contentArray) {
      await db.collection('content').updateOne(
        { sqliteId: item.id },
        {
          $set: {
            sqliteId: item.id,
            tmdbId: item.tmdb_id,
            title: item.title,
            type: item.type,
            genre: item.genre || '',
            genres: tryParse(item.genres) || [],
            year: item.year || 0,
            rating: item.rating || 0,
            voteCount: item.vote_count || 0,
            duration: item.duration || '',
            description: item.description || '',
            poster: item.poster || '',
            backdrop: item.backdrop || '',
            videoUrl: item.video_url || '',
            videoType: item.video_type || 'mp4',
            trailerKey: item.trailer_key || '',
            cast: item.cast || '',
            director: item.director || '',
            language: item.language || 'en',
            popularity: item.popularity || 0,
            releaseDate: item.release_date || '',
            seasons: item.seasons || 0,
            episodesCount: item.episodes_count || 0,
            premium: !!item.premium,
            badge: item.badge || '',
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }
    console.log('[MongoDB] Full sync: ' + contentArray.length + ' items synced');
  });
}

async function fullSyncUsers(userArray) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    for (const u of userArray) {
      await db.collection('users').updateOne(
        { sqliteId: u.id },
        {
          $set: {
            sqliteId: u.id, name: u.name, email: u.email,
            role: u.role || 'user',
            avatar: u.avatar || '',
            plan: u.plan || 'free',
            planChosen: !!u.plan_chosen,
            banned: !!u.banned,
            lastActiveAt: u.last_active ? new Date(u.last_active) : new Date(),
            joinedAt: u.joined_at ? new Date(u.joined_at) : new Date(),
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }
    console.log('[MongoDB] Full sync: ' + userArray.length + ' users synced');
  });
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
    _connected = false;
  }
}

module.exports = {
  getDb, close, isConnected,
  logActivity, syncUser, deleteUser,
  syncContent, deleteContent, syncEpisode,
  syncWatchlist, syncContinueWatching, syncPayment,
  fullSyncContent, fullSyncUsers,
};
