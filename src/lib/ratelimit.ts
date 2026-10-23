import { getDb } from "./db";

/** Fixed-window limiter di MongoDB. true = boleh lanjut. */
export async function rateLimit(key: string, max: number, windowSec: number) {
  const db = await getDb();
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const r = await db.collection<{ _id: string; n: number; expireAt: Date }>("rateLimits").findOneAndUpdate(
    { _id: `${key}:${bucket}` },
    { $inc: { n: 1 }, $setOnInsert: { expireAt: new Date((bucket + 1) * windowSec * 1000) } },
    { upsert: true, returnDocument: "after" }
  );
  return (r?.n ?? 1) <= max;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
