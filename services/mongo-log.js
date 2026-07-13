const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb+srv://mohit8287kushwaha_db_user:O8SfUFbflOuqgu2H@cluster0.gp5ibvr.mongodb.net/streamx?retryWrites=true&w=majority&appName=Cluster0';
let client = null;
let collection = null;

async function getCollection() {
  if (collection) return collection;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db('streamx');
    collection = db.collection('activity_logs');
    return collection;
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err.message);
    return null;
  }
}

async function logActivity(type, message, userId = null, metadata = {}) {
  try {
    const col = await getCollection();
    if (!col) return;
    await col.insertOne({
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

async function close() {
  if (client) {
    await client.close();
    client = null;
    collection = null;
  }
}

module.exports = { logActivity, close, getCollection };
