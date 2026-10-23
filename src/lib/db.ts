import { MongoClient, Db } from "mongodb";
import { env } from "./env";
import { ensureDefaults } from "./seed";

const g = globalThis as unknown as { _mongo?: Promise<MongoClient>; _indexed?: boolean };
const YEAR = 365 * 24 * 3600;

export async function getDb(): Promise<Db> {
  if (!g._mongo) g._mongo = new MongoClient(env("MONGODB_URI")).connect();
  const db = (await g._mongo).db();
  if (!g._indexed) {
    g._indexed = true;
    await ensureIndexes(db);
    await ensureDefaults(db);
  }
  return db;
}

async function ensureIndexes(db: Db) {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("rateLimits").createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection("profiles").createIndex({ userId: 1 }, { unique: true });
  await db.collection("links").createIndex({ userId: 1, order: 1 });
  await db.collection("orders").createIndex({ midtransOrderId: 1 }, { unique: true });
  await db.collection("orders").createIndex({ userId: 1, createdAt: -1 });
  await db.collection("blocklist").createIndex({ domain: 1 }, { unique: true });
  // Data mentah analitik disimpan 12 bulan (UU PDP: IP hanya berupa hash).
  await db.collection("clickEvents").createIndex({ timestamp: 1 }, { expireAfterSeconds: YEAR });
  await db.collection("clickEvents").createIndex({ profileId: 1, timestamp: -1 });
  await db.collection("pageViews").createIndex({ timestamp: 1 }, { expireAfterSeconds: YEAR });
  await db.collection("pageViews").createIndex({ profileId: 1, timestamp: -1 });
  await db.collection("analyticsDaily").createIndex({ profileId: 1, date: 1 }, { unique: true });
}
