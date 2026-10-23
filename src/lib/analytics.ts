import { createHash } from "crypto";
import type { ObjectId } from "mongodb";
import { getDb } from "./db";
import { clientIp } from "./ratelimit";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|headless/i;

export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

export function describeRequest(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  const ip = clientIp(req);
  return {
    // IP tidak pernah disimpan mentah (UU PDP): hanya hash bergaram.
    ipHash: createHash("sha256").update(ip + (process.env.JWT_SECRET || "")).digest("hex").slice(0, 32),
    device: /ipad|tablet/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop",
    isBot: !ua || BOT.test(ua),
    country: req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "unknown",
    referrer: hostOf(req.headers.get("referer")),
  };
}

function hostOf(ref: string | null) {
  if (!ref) return "direct";
  try { return new URL(ref).hostname; } catch { return "direct"; }
}

export async function recordEvent(kind: "click" | "view", profileId: ObjectId, req: Request, linkId?: ObjectId) {
  const info = describeRequest(req);
  if (info.isBot) return false;
  const db = await getDb();
  const now = new Date();
  if (kind === "click") await db.collection("clickEvents").insertOne({ linkId, profileId, timestamp: now, ...info });
  else await db.collection("pageViews").insertOne({ profileId, timestamp: now, ...info });
  await db.collection("analyticsDaily").updateOne(
    { profileId, date: dayKey(now) },
    { $inc: { [kind === "click" ? "clicks" : "views"]: 1 } },
    { upsert: true }
  );
  return true;
}
