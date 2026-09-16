import { MongoClient, type Db, type MongoClientOptions } from "mongodb";

const options: MongoClientOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 8000,
  retryWrites: true,
};

// Cached on `globalThis` so `next dev` hot reloads reuse one connection pool
// instead of opening a new one on every file change.
const cache = globalThis as typeof globalThis & {
  _portfolioMongo?: Promise<MongoClient>;
};

export function getClient(): Promise<MongoClient> {
  if (!cache._portfolioMongo) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and add your connection string.");
    }
    // A failed connection must not be cached, or every later request inherits
    // the same rejected promise and the server never recovers.
    cache._portfolioMongo = new MongoClient(uri, options).connect().catch(error => {
      cache._portfolioMongo = undefined;
      throw error;
    });
  }
  return cache._portfolioMongo;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || "ankita_portfolio");
}
