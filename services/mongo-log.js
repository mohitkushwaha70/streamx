const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URL || '';
if (!MONGO_URI) {
  console.error('[MongoDB] WARNING: MONGODB_URI env var is not set! MongoDB will not connect.');
}
let client = null;
let _db = null;
let _connected = false;
let _connecting = null;

async function getDb() {
  if (_db) return _db;
  // Prevent concurrent connections
  if (_connecting) { await _connecting; return _db; }
  _connecting = (async () => {
    try {
      client = new MongoClient(MONGO_URI, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 30000,
      });
      await client.connect();
      _db = client.db('streamx');
      _connected = true;
      console.log('[MongoDB] Connected');
    } catch (err) {
      _connected = false;
      console.error('[MongoDB] Connection failed:', err.message);
      _db = null;
    }
    _connecting = null;
    return _db;
  })();
  return _connecting;
}

function isConnected() { return _connected; }

async function retryOp(fn, retries = 5) {
  for (let i = 0; i <= retries; i++) {
    try {
      await fn();
      return true;
    } catch (err) {
      if (i < retries) {
        // Close old client before reconnecting to prevent connection leak
        if (client) {
          try { await client.close(); } catch(e) {}
          client = null;
        }
        _db = null;
        const delay = Math.min(2000 * Math.pow(2, i), 15000);
        await new Promise(r => setTimeout(r, delay));
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
    const { id, name, email, password, role, avatar, plan, plan_chosen, last_active, joined_at, banned } = userData;
    await db.collection('users').updateOne(
      { sqliteId: id },
      {
        $set: {
          sqliteId: id, name, email, password: password || '',
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
        $unset: { deleted: '', deletedAt: '' },
      },
      { upsert: true }
    );
  });
}

async function deleteContent(contentId) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    // Soft delete: mark as deleted instead of removing (prevents restore on Render restart)
    await db.collection('content').updateOne(
      { sqliteId: contentId },
      { $set: { deleted: true, deletedAt: new Date() } }
    );
    await db.collection('episodes').updateMany(
      { contentSqliteId: contentId },
      { $set: { deleted: true, deletedAt: new Date() } }
    );
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

// ===== COMMENTS =====
async function syncComment(commentData) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    await db.collection('comments').updateOne(
      { sqliteId: commentData.id },
      {
        $set: {
          sqliteId: commentData.id,
          contentId: commentData.content_id,
          userId: commentData.user_id,
          userName: commentData.user_name || '',
          text: commentData.text || '',
          likes: commentData.likes || 0,
          createdAt: commentData.created_at ? new Date(commentData.created_at) : new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  });
}

async function deleteComment(commentId) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    await db.collection('comments').deleteOne({ sqliteId: commentId });
  });
}

// ===== USER LIKES =====
async function syncUserLike(likeData) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    await db.collection('user_likes').updateOne(
      { userId: likeData.user_id, contentId: likeData.content_id },
      {
        $set: {
          userId: likeData.user_id,
          contentId: likeData.content_id,
          type: likeData.type || 'like',
          createdAt: likeData.created_at ? new Date(likeData.created_at) : new Date(),
        },
      },
      { upsert: true }
    );
  });
}

async function deleteUserLike(userId, contentId) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    await db.collection('user_likes').deleteOne({ userId, contentId });
  });
}

// ===== FULL EPISODES SYNC =====
async function fullSyncEpisodes(episodesArray) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    for (const ep of episodesArray) {
      await db.collection('episodes').updateOne(
        { contentSqliteId: ep.content_id, number: ep.number, season: ep.season },
        {
          $set: {
            contentSqliteId: ep.content_id,
            number: ep.number || 1,
            season: ep.season || 1,
            title: ep.title || '',
            description: ep.description || '',
            duration: ep.duration || '',
            videoUrl: ep.video_url || '',
            airDate: ep.air_date || '',
            rating: ep.rating || '',
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }
    console.log('[MongoDB] Full sync: ' + episodesArray.length + ' episodes synced');
  });
}

// ===== FULL WATCHLIST SYNC =====
async function fullSyncWatchlist(watchlistArray) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    for (const w of watchlistArray) {
      await db.collection('watchlist').updateOne(
        { userId: w.user_id, contentId: w.content_id, type: w.type },
        {
          $set: {
            userId: w.user_id,
            contentId: w.content_id,
            type: w.type,
            createdAt: w.created_at ? new Date(w.created_at) : new Date(),
          },
        },
        { upsert: true }
      );
    }
    console.log('[MongoDB] Full sync: ' + watchlistArray.length + ' watchlist items synced');
  });
}

// ===== FULL CONTINUE WATCHING SYNC =====
async function fullSyncContinueWatching(cwArray) {
  await retryOp(async () => {
    const db = await getDb();
    if (!db) return;
    for (const cw of cwArray) {
      await db.collection('continue_watching').updateOne(
        { userId: cw.user_id, tmdbId: cw.tmdb_id },
        {
          $set: {
            userId: cw.user_id,
            tmdbId: cw.tmdb_id,
            type: cw.type || 'movie',
            progress: cw.progress || 0,
            currentTime: cw.current_time || 0,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }
    console.log('[MongoDB] Full sync: ' + cwArray.length + ' continue watching synced');
  });
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
  syncComment, deleteComment,
  syncUserLike, deleteUserLike,
  fullSyncContent, fullSyncUsers,
  fullSyncEpisodes, fullSyncWatchlist, fullSyncContinueWatching,
};
