require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!uri) {
  console.error('No MONGO_URI or MONGODB_URI found in environment. Set one in backend/.env or the environment.');
  process.exit(2);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    console.log('Testing MongoDB connection to:', uri.replace(/:\/\/(.*?):(.*?)@/, '://<user>:<redacted>@'));
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    console.log('Ping succeeded — connected to MongoDB.');
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('Connection failed:', error.message || error);
    try { await client.close(); } catch (e) {}
    process.exit(1);
  }
}

run();