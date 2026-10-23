// Pakai: node --env-file=.env scripts/seed-admin.mjs email username password
import { MongoClient } from "mongodb";
import argon2 from "argon2";

const [email, username, password] = process.argv.slice(2);
if (!email || !username || !password) {
  console.error("Pakai: node --env-file=.env scripts/seed-admin.mjs <email> <username> <password>");
  process.exit(1);
}
const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db();
await db.collection("users").updateOne(
  { email: email.toLowerCase() },
  {
    $set: {
      username: username.toLowerCase(), passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      role: "admin", status: "active", emailVerified: true,
    },
    $setOnInsert: { planId: null, planExpiresAt: null, trialUsed: false, createdAt: new Date() },
  },
  { upsert: true }
);
console.log("Admin siap:", email);
await client.close();
