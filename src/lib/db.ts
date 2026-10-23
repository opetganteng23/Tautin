import { MongoClient, Db } from "mongodb";
import { env } from "./env";

const g = globalThis as unknown as { _mongo?: Promise<MongoClient>; _indexed?: boolean };

export async function getDb(): Promise<Db> {
  if (!g._mongo) g._mongo = new MongoClient(env("MONGODB_URI")).connect();
  const db = (await g._mongo).db();
  if (!g._indexed) {
    g._indexed = true;
    await ensureIndexes(db);
  }
  return db;
}

async function ensureIndexes(db: Db) {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("rateLimits").createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
}
