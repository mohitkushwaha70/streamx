const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb+srv://mohit8287kushwaha_db_user:O8SfUFbflOuqgu2H@cluster0.gp5ibvr.mongodb.net/streamx?retryWrites=true&w=majority&appName=Cluster0';
let client = null;
let _db = null;

async function getDb() {
  if (_db) return _db;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    _db = client.db('streamx');
    return _db;
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err.message);
    return null;
  }
}

async function logActivity(type, message, userId = null, metadata = {}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.collection('activity_logs').insertOne({
      type,
      message,
      userId,
      metadata,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('[MongoDB] Log failed:', err.message);
  }
}

async function syncUser(userData) {
  try {
    const db = await getDb();
    if (!db) return;
    const { id, name, email, role, avatar, plan, last_active, joined_at } = userData;
    await db.collection('users').updateOne(
      { sqliteId: id },
      {
        $set: {
          sqliteId: id,
          name,
          email,
          role,
          avatar: avatar || '',
          plan: plan || 'free',
          lastActiveAt: last_active ? new Date(last_active) : new Date(),
          joinedAt: joined_at ? new Date(joined_at) : new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error('[MongoDB] User sync failed:', err.message);
  }
}

async function close() {
  if (client) {
    await client.close();
    client = null;
    _db = null;
  }
}

module.exports = { logActivity, syncUser, close, getDb };
